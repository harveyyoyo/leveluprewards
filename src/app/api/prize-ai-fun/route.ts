export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { guardAiRoute } from '@/lib/apiAuth';
import { assertPrizeAiSurpriseAllowedForSchool } from '@/lib/server/prizeAiSurpriseGate';
import type { PrizeAiFunReward } from '@/lib/types';
import { lettersForAcrosticName } from '@/lib/prizeAiFunAcrostic';
import { clampStudentAgeYearsForAiRequest, prizeAiFunAudiencePromptBlock } from '@/lib/studentAiFunAge';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const defaultOpenAI = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

const MODES: PrizeAiFunReward[] = ['random', 'joke', 'riddle', 'fortune', 'acrostic'];

type AiFunKind = 'joke' | 'riddle' | 'fortune' | 'acrostic';

function resolveKind(mode: PrizeAiFunReward): AiFunKind {
  if (mode === 'random') {
    const roll = Math.floor(Math.random() * 4);
    return (['joke', 'riddle', 'fortune', 'acrostic'] as const)[roll];
  }
  if (mode === 'picker') return 'joke';
  return mode;
}

function extractJson(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed);
  const inner = fence ? fence[1].trim() : trimmed;
  try {
    const parsed = JSON.parse(inner);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function sanitizeText(s: unknown, maxLen: number): string {
  if (typeof s !== 'string') return '';
  return s.replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

function clampAvoidTexts(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of raw) {
    if (typeof x !== 'string') continue;
    const t = sanitizeText(x, 280);
    if (t.length < 6) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= 20) break;
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const guarded = await guardAiRoute(req, {
      requireSchoolStaff: false,
      maxRequests: 10,
      maxBodyBytes: 12_288,
    });
    if (!guarded.ok) return guarded.response;

    const {
      schoolId: rawSchoolId,
      mode: rawMode,
      model = 'gpt-4o-mini',
      avoidTexts: rawAvoid,
      ageYears: rawAgeYears,
      firstName: rawFirstName,
    } = guarded.value.body;

    if (typeof rawSchoolId !== 'string' || !rawSchoolId.trim()) {
      return NextResponse.json({ error: 'schoolId is required.' }, { status: 400 });
    }
    const schoolId = rawSchoolId.trim();

    const planDenied = await assertPrizeAiSurpriseAllowedForSchool(schoolId);
    if (planDenied) return planDenied;

    if (typeof rawMode !== 'string' || !MODES.includes(rawMode as PrizeAiFunReward)) {
      return NextResponse.json(
        { error: 'mode must be random, joke, riddle, fortune, or acrostic.' },
        { status: 400 },
      );
    }
    const mode = rawMode as PrizeAiFunReward;
    const selectedModel = typeof model === 'string' ? model : 'gpt-4o-mini';
    const kind = resolveKind(mode);
    const ageYears = clampStudentAgeYearsForAiRequest(rawAgeYears);
    const audienceBlock = prizeAiFunAudiencePromptBlock(ageYears);

    const acrosticLetters =
      kind === 'acrostic'
        ? lettersForAcrosticName(typeof rawFirstName === 'string' ? rawFirstName : '')
        : '';
    if (kind === 'acrostic' && acrosticLetters.length < 1) {
      return NextResponse.json({ error: 'firstName is required for acrostic mode.' }, { status: 400 });
    }
    const acrosticNameBlock =
      kind === 'acrostic'
        ? `\n\nName acrostic letters (use EXACTLY these letters in this order, one line each): ${[...acrosticLetters].join(' ')}`
        : '';
    const avoidLines = clampAvoidTexts(rawAvoid);
    const avoidBlock =
      avoidLines.length > 0
        ? `\n\nHard rule: Your "text" (and for riddles, the "answer" too) must be clearly different from ALL of the following lines this student has already seen recently. Do not repeat them, do not swap only a couple of words, and do not deliver the same punchline with different wording:\n${avoidLines.map((line, i) => `${i + 1}. ${line}`).join('\n')}`
        : '';

    const systemInstruction = `You write short, wholesome content for a public school rewards kiosk (AI Fun: joke, riddle, fortune-teller line, or name acrostic).

${audienceBlock}

Non-negotiable safety (all ages — never relax these):
- English only.
- Strictly safe for children and classrooms: no violence, weapons, injury, death, fear, horror, romance, dating, politics, religion or religious debates, insults, stereotypes, scary themes, crude humor, bathroom humor, brands, or references to alcohol, drugs, smoking, vaping, or gambling.
- Nothing embarrassing toward the student, staff, family, or any group; nothing that could exclude or shame classmates.
- Jokes and riddles must be gentle and inclusive.
- No personal data, real names of public figures used as punchlines, or instructions to contact anyone online.
- Output MUST be a single JSON object only (no markdown fences, no commentary).

Schema:
{
  "kind": "${kind}",
  "text": "string",
  "answer": "string or omit"
}

Kind-specific:
- joke: "text" is one clean punchline-friendly joke (one or two sentences max). Omit "answer".
- riddle: "text" is the riddle only; "answer" is the solution (few words).
- fortune: "text" is one short fortune-teller style line (inspiring or gently humorous). Omit "answer".
- acrostic: "text" is a name poem — one line per letter listed below. Format each line exactly as "L — short positive trait" (letter, em dash, 1–4 wholesome words). Traits must be unique across the whole school: do not reuse compliment words from the avoid list, even for a different name. No romance, no appearance/body comments, no comparisons to other students. For X use a positive word starting with X or "eXtra …" / "eXcellent …". Omit "answer".

School context id (opaque): ${schoolId}${acrosticNameBlock}${avoidBlock}`;

    const kindLabel =
      kind === 'fortune' ? 'fortune teller line' : kind === 'acrostic' ? 'name acrostic' : kind;
    const userPrompt =
      kind === 'acrostic'
        ? `Generate one fresh name acrostic now using the exact letters provided. Every trait must be different from the avoid list and from common repeats like "kind", "awesome", "smart" unless you have not used them recently.`
        : `Generate one fresh ${kindLabel} now. Make it original — avoid clichéd riddles like "what has keys but can't open locks".`;

    let responseText = '';

    if (selectedModel.startsWith('gpt')) {
      const effectiveKey = process.env.OPENAI_API_KEY;
      if (!effectiveKey) {
        return NextResponse.json({ error: 'OpenAI API key is not configured on the server.' }, { status: 503 });
      }

      const response = await defaultOpenAI.chat.completions.create({
        model: selectedModel as any,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userPrompt },
        ],
      });
      responseText = response.choices[0].message.content || '';
    } else {
      const effectiveKey = process.env.GEMINI_API_KEY;
      if (!effectiveKey) {
        return NextResponse.json({ error: 'Gemini API key is not configured on the server.' }, { status: 503 });
      }

      const activeModel = genAI.getGenerativeModel({
        model: selectedModel,
        generationConfig: {
          responseMimeType: 'application/json',
        },
        systemInstruction,
      });

      const result = await activeModel.generateContent(userPrompt);
      responseText = result.response.text();
    }

    const parsed = extractJson(responseText);
    if (!parsed) {
      console.error('prize-ai-fun parse failure:', responseText.slice(0, 500));
      return NextResponse.json({ error: 'Invalid response format from AI.' }, { status: 500 });
    }

    const text = sanitizeText(parsed.text, 900);
    const answer = parsed.answer !== undefined ? sanitizeText(parsed.answer, 280) : undefined;

    if (!text) {
      return NextResponse.json({ error: 'AI returned empty content.' }, { status: 500 });
    }

    if (kind === 'riddle' && !answer) {
      return NextResponse.json({
        kind,
        text,
        answer: 'Think about it!',
      });
    }

    return NextResponse.json(
      kind === 'riddle' ? { kind, text, answer: answer || 'Think about it!' } : { kind, text },
    );
  } catch (error) {
    console.error('Error in /api/prize-ai-fun:', error);
    return NextResponse.json({ error: 'Failed to generate surprise.' }, { status: 500 });
  }
}
