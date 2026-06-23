import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { guardAiRoute } from '@/lib/apiAuth';
import {
  geminiModelAttemptOrder,
  isLlmProviderFailure,
  userFacingLlmError,
} from '@/lib/server/llmProviderErrors';
import {
  DEFAULT_HOUSES_REALM_THEME,
  HOUSES_REALM_THEMES,
  HOUSES_REALM_THEME_IDS,
  type HousesRealmThemeId,
} from '@/lib/houses/housesRealmThemes';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const defaultOpenAI = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

const MIN_HOUSES = 3;
const MAX_HOUSES = 8;

type HouseSeedOut = {
  name: string;
  value: string;
  color: string;
  emoji: string;
  motto: string;
};

type AiSetupResponse = {
  realmTheme: HousesRealmThemeId;
  themeReason: string;
  houseCount: number;
  houses: HouseSeedOut[];
};

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
/** Spread of distinct, readable hex fills used when the model returns a bad/duplicate color. */
const FALLBACK_PALETTE = [
  '#DC2626',
  '#2563EB',
  '#16A34A',
  '#7C3AED',
  '#CA8A04',
  '#0EA5E9',
  '#DB2777',
  '#0F766E',
];

/** Keyword → realm theme, used only when the model omits or invents a theme id. */
const THEME_KEYWORDS: Array<[RegExp, HousesRealmThemeId]> = [
  [/space|cosmic|galaxy|star|nebula|astro|planet/i, 'cosmic'],
  [/royal|king|queen|castle|crown|medieval|knight|virtue|crest|heraldr/i, 'royal'],
  [/sport|team|athlet|arena|stadium|league|rivalr|game day|champion/i, 'arena'],
  [/element|fire|water|earth|air|stem|science|lab|chemistry/i, 'elements'],
  [/torah|yeshiva|jewish|hebrew|middot|mitzv|scroll|parchment|kodesh/i, 'scroll'],
  [/ocean|sea|wave|marine|tide|reef|nautical|aqua/i, 'ocean'],
  [/sunset|dusk|sunrise|desert|warm|ember|coral|dawn/i, 'sunset'],
  [/forest|tree|wood|jungle|nature|meadow|leaf|pine|garden/i, 'forest'],
];

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function resolveRealmTheme(rawTheme: unknown, prompt: string): HousesRealmThemeId {
  const candidate = asString(rawTheme).toLowerCase();
  if ((HOUSES_REALM_THEME_IDS as readonly string[]).includes(candidate)) {
    return candidate as HousesRealmThemeId;
  }
  const haystack = `${candidate} ${prompt}`;
  for (const [re, id] of THEME_KEYWORDS) {
    if (re.test(haystack)) return id;
  }
  return DEFAULT_HOUSES_REALM_THEME;
}

function sanitizeHouses(raw: unknown, desiredCount: number): HouseSeedOut[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: HouseSeedOut[] = [];

  for (const entry of raw) {
    if (out.length >= desiredCount) break;
    if (!entry || typeof entry !== 'object') continue;
    const data = entry as Record<string, unknown>;

    const name = asString(data.name).slice(0, 24);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const rawColor = asString(data.color);
    const color = HEX_COLOR.test(rawColor) ? rawColor : FALLBACK_PALETTE[out.length % FALLBACK_PALETTE.length];
    const emojiRaw = asString(data.emoji);
    const emoji = emojiRaw ? Array.from(emojiRaw)[0] : '⭐';

    out.push({
      name,
      value: asString(data.value).slice(0, 24),
      color,
      emoji,
      motto: asString(data.motto).slice(0, 80),
    });
  }

  return out;
}

function unwrapCandidate(parsed: unknown): unknown {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return parsed;
  const o = parsed as Record<string, unknown>;
  for (const key of ['result', 'data', 'setup'] as const) {
    const nested = o[key];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      const n = nested as Record<string, unknown>;
      if (Array.isArray(n.houses)) return nested;
    }
  }
  return parsed;
}

function parseAiJson(responseText: string): unknown {
  let t = responseText.trim();
  if (!t) throw new SyntaxError('Empty AI response');
  t = t.replace(/^```(?:json)?\s*\r?\n?/i, '').replace(/\r?\n?```\s*$/i, '').trim();

  const tryParse = (s: string) => unwrapCandidate(JSON.parse(s) as unknown);
  try {
    return tryParse(t);
  } catch {
    const start = t.indexOf('{');
    const end = t.lastIndexOf('}');
    if (start >= 0 && end > start) return tryParse(t.slice(start, end + 1));
    throw new SyntaxError('Could not parse house setup JSON');
  }
}

function buildSystemInstruction(desiredCountText: string, includeJewishOrthodox: boolean): string {
  const themeList = HOUSES_REALM_THEMES.filter(
    (t) => includeJewishOrthodox || t.id !== 'scroll',
  )
    .map((t) => `- "${t.id}": ${t.label} — ${t.description}${t.pairs ? ` (good for ${t.pairs})` : ''}`)
    .join('\n');

  return `You design a school's "house system" (Harry-Potter-style teams). From the user's word or phrase you choose a matching visual theme for the houses screen AND invent a set of houses that fit it.

Pick exactly one realm theme id from this list (match the mood of the prompt):
${themeList}

Then create ${desiredCountText} distinct houses that fit the prompt. Each house needs:
- a short, evocative one- or two-word name
- a one-word core "value" it stands for (e.g. Courage, Kindness, Curiosity)
- a vivid hex color that is distinct from the other houses and readable as a label
- a single emoji that represents it
- a short motto (a few words, no more than ~8 words)

Make the names, values, colors, and emojis clearly themed around the prompt and distinct from each other. Keep everything school-appropriate.

You MUST reply with ONLY a JSON object in this exact schema:
{
  "realmTheme": "one of the theme ids above",
  "themeReason": "one short sentence on why this theme fits",
  "houseCount": number,
  "houses": [
    { "name": "string", "value": "string", "color": "#RRGGBB", "emoji": "🔥", "motto": "string" }
  ]
}`;
}

async function generateWithOpenAi(prompt: string, systemInstruction: string, model: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) throw new Error('OpenAI API key configuration error (Server)');
  const response = await defaultOpenAI.chat.completions.create({
    model: model as 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: `Design houses for this prompt: "${prompt}"` },
    ],
  });
  return response.choices[0].message.content || '';
}

async function generateWithGemini(prompt: string, systemInstruction: string, selectedModel: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) throw new Error('API key configuration error');
  const userMessage = `Design houses for this prompt: "${prompt}"`;
  let lastError: unknown;

  for (const modelName of geminiModelAttemptOrder(selectedModel)) {
    try {
      const activeModel = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' },
        systemInstruction,
      });
      const result = await activeModel.generateContent(userMessage);
      if (modelName !== selectedModel) {
        console.warn(`houses/ai-setup: used ${modelName} after ${selectedModel} failed`);
      }
      return result.response.text();
    } catch (e) {
      lastError = e;
      if (!isLlmProviderFailure(e)) throw e;
      console.warn(
        `houses/ai-setup: Gemini model ${modelName} failed:`,
        e instanceof Error ? e.message.slice(0, 160) : e,
      );
    }
  }
  throw lastError ?? new Error('Gemini house setup generation failed');
}

export async function POST(req: NextRequest) {
  try {
    const guarded = await guardAiRoute(req, { requireSchoolStaff: true, maxRequests: 12 });
    if (!guarded.ok) return guarded.response;
    const { prompt, count, model = 'gpt-4o-mini', includeJewishOrthodox } = guarded.value.body as {
      prompt?: unknown;
      count?: unknown;
      model?: unknown;
      includeJewishOrthodox?: unknown;
    };

    if (typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }
    const cleanPrompt = prompt.trim().slice(0, 200);
    const selectedModel = typeof model === 'string' ? model : 'gpt-4o-mini';

    const requestedCount =
      typeof count === 'number' && Number.isFinite(count)
        ? Math.min(MAX_HOUSES, Math.max(MIN_HOUSES, Math.round(count)))
        : null;
    const desiredCountText = requestedCount
      ? `exactly ${requestedCount}`
      : `a sensible number (between ${MIN_HOUSES} and ${MAX_HOUSES})`;

    const systemInstruction = buildSystemInstruction(desiredCountText, includeJewishOrthodox === true);

    let responseText = '';
    if (selectedModel.startsWith('gpt')) {
      responseText = await generateWithOpenAi(cleanPrompt, systemInstruction, selectedModel);
    } else {
      try {
        responseText = await generateWithGemini(cleanPrompt, systemInstruction, selectedModel);
      } catch (geminiError) {
        if (process.env.OPENAI_API_KEY && isLlmProviderFailure(geminiError)) {
          console.warn('houses/ai-setup: all Gemini models failed; falling back to gpt-4o-mini.');
          responseText = await generateWithOpenAi(cleanPrompt, systemInstruction, 'gpt-4o-mini');
        } else if (!process.env.GEMINI_API_KEY) {
          return NextResponse.json({ error: 'API key configuration error' }, { status: 500 });
        } else {
          throw geminiError;
        }
      }
    }

    try {
      const parsed = parseAiJson(responseText) as Record<string, unknown>;
      const aiCount =
        typeof parsed?.houseCount === 'number' && Number.isFinite(parsed.houseCount)
          ? Math.round(parsed.houseCount)
          : null;
      const desiredCount = Math.min(
        MAX_HOUSES,
        Math.max(MIN_HOUSES, requestedCount ?? aiCount ?? MAX_HOUSES),
      );

      const houses = sanitizeHouses(parsed?.houses, desiredCount);
      if (houses.length < MIN_HOUSES) {
        throw new Error('AI returned too few usable houses');
      }

      const response: AiSetupResponse = {
        realmTheme: resolveRealmTheme(parsed?.realmTheme, cleanPrompt),
        themeReason: asString(parsed?.themeReason).slice(0, 160),
        houseCount: houses.length,
        houses,
      };
      return NextResponse.json(response);
    } catch (parseError) {
      const preview = responseText.length > 500 ? `${responseText.slice(0, 500)}…` : responseText;
      console.error('Failed to parse AI house setup response:', preview, parseError);
      return NextResponse.json({ error: 'Invalid response format from AI' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in /api/houses/ai-setup:', error);
    return NextResponse.json({ error: userFacingLlmError(error) }, { status: 500 });
  }
}

export type { AiSetupResponse, HouseSeedOut };
