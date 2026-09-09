import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { guardAiRoute } from '@/lib/apiAuth';
import { normalizeStudentTheme } from '@/lib/themeContrast';
import { LEVELUP_BRAND_PRIMARY_HEX } from '@/lib/appBranding';
import {
    geminiModelAttemptOrder,
    isLlmProviderFailure,
    userFacingLlmError,
    type LlmProvider,
} from '@/lib/server/llmProviderErrors';
import { assertStudentThemeGenerationAllowedForSchool } from '@/lib/server/studentThemeGate';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const defaultOpenAI = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

type ThemeResponse = {
    background: string;
    text: string;
    primary: string;
    cardBackground: string;
    accent: string;
    emoji: string;
    fontFamily: string;
    backgroundStyle?: string | null;
};

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const SAFE_BACKGROUND = /^(?:(?:repeating-)?linear-gradient|radial-gradient)\([#0-9a-zA-Z.,%\s-]+\)$/;

function asString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function requireHex(value: unknown, fallback: string): string {
    const candidate = asString(value);
    return HEX_COLOR.test(candidate) ? candidate : fallback;
}

/** Gemini/OpenAI often wrap JSON in markdown fences or a `{ "theme": { ... } }` envelope. */
function unwrapThemeCandidate(parsed: unknown): unknown {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return parsed;
    const o = parsed as Record<string, unknown>;
    for (const key of ['theme', 'data', 'result', 'palette'] as const) {
        const nested = o[key];
        if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
            const n = nested as Record<string, unknown>;
            if (typeof n.background === 'string' || typeof n.primary === 'string') {
                return nested;
            }
        }
    }
    return parsed;
}

function parseThemeAiJson(responseText: string): unknown {
    let t = responseText.trim();
    if (!t) throw new SyntaxError('Empty AI response');
    t = t.replace(/^```(?:json)?\s*\r?\n?/i, '').replace(/\r?\n?```\s*$/i, '').trim();

    const tryParse = (s: string) => unwrapThemeCandidate(JSON.parse(s) as unknown);

    try {
        return tryParse(t);
    } catch {
        const start = t.indexOf('{');
        const end = t.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return tryParse(t.slice(start, end + 1));
        }
        throw new SyntaxError('Could not parse theme JSON');
    }
}

function sanitizeTheme(raw: unknown): ThemeResponse | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const data = raw as Record<string, unknown>;
    const backgroundStyle = asString(data.backgroundStyle);
    const fontFamily = asString(data.fontFamily).replace(/[^\w\s-]/g, '').slice(0, 80);
    const emoji = asString(data.emoji);

    return {
        background: requireHex(data.background, '#020617'),
        text: requireHex(data.text, '#ffffff'),
        primary: requireHex(data.primary, LEVELUP_BRAND_PRIMARY_HEX),
        cardBackground: requireHex(data.cardBackground, '#111827'),
        accent: requireHex(data.accent, '#22c55e'),
        emoji: emoji ? Array.from(emoji)[0] : '⭐',
        fontFamily: fontFamily || 'Inter',
        backgroundStyle: backgroundStyle && SAFE_BACKGROUND.test(backgroundStyle) ? backgroundStyle : null,
    };
}

async function generateThemeWithOpenAi(
    prompt: string,
    systemInstruction: string,
    model: string,
): Promise<string> {
    const effectiveKey = process.env.OPENAI_API_KEY;
    if (!effectiveKey) {
        throw new Error('OpenAI API key configuration error (Server)');
    }

    const response = await defaultOpenAI.chat.completions.create({
        model: model as 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: `Generate a theme for this prompt: "${prompt}"` },
        ],
    });
    return response.choices[0].message.content || '';
}

async function generateThemeWithGemini(
    prompt: string,
    systemInstruction: string,
    selectedModel: string,
): Promise<string> {
    const effectiveKey = process.env.GEMINI_API_KEY;
    if (!effectiveKey) {
        throw new Error('API key configuration error');
    }

    const userMessage = `Generate a theme for this prompt: "${prompt}"`;
    let lastError: unknown;

    for (const modelName of geminiModelAttemptOrder(selectedModel)) {
        try {
            const activeModel = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: {
                    responseMimeType: 'application/json',
                },
                systemInstruction,
            });
            const result = await activeModel.generateContent(userMessage);
            const text = result.response.text();
            if (modelName !== selectedModel) {
                console.warn(
                    `generate-theme: used ${modelName} after ${selectedModel} failed`,
                );
            }
            return text;
        } catch (e) {
            lastError = e;
            if (!isLlmProviderFailure(e)) throw e;
            console.warn(
                `generate-theme: Gemini model ${modelName} failed:`,
                e instanceof Error ? e.message.slice(0, 160) : e,
            );
        }
    }

    throw lastError ?? new Error('Gemini theme generation failed');
}

export async function POST(req: NextRequest) {
    // Tracked outside the try block so the catch can attribute errors to whichever
    // provider actually made the failing call (Gemini may fall back to OpenAI mid-request).
    let usedProvider: LlmProvider = 'gemini';
    try {
        // Staff use this to set a school's default theme; kiosk students use it to theme
        // their own portal/ID card. Kiosk sessions are anonymous, so this only requires
        // sign-in — access is gated on the school's `enableStudentThemes` setting instead.
        const guarded = await guardAiRoute(req, { requireSchoolStaff: false, maxRequests: 12 });
        if (!guarded.ok) return guarded.response;
        const { prompt, model = 'gpt-4o-mini', schoolId: rawSchoolId } = guarded.value.body;

        if (typeof prompt !== 'string' || !prompt.trim()) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }
        if (typeof rawSchoolId !== 'string' || !rawSchoolId.trim()) {
            return NextResponse.json({ error: 'schoolId is required.' }, { status: 400 });
        }
        const gateResponse = await assertStudentThemeGenerationAllowedForSchool(rawSchoolId);
        if (gateResponse) return gateResponse;
        const selectedModel = typeof model === 'string' ? model : 'gpt-4o-mini';

        const systemInstruction = `You are an expert UI/UX designer with a bold, creative vision. Your task is to generate a distinctive, memorable theme (color palette + typography + background) for a student web portal based on the user's prompt.

DESIGN PHILOSOPHY:
- Be creative and adventurous: avoid generic "safe" choices. Surprise the user with unexpected but cohesive combinations. Clarity always wins over novelty, though — see the legibility rules below.
- Fonts: Choose Google Fonts that have strong personality and match the theme's vibe, but stay legible at small ID-card sizes and for numerals (points balance, class number, barcode digits). Favor distinctive display, slab, rounded, or thematic fonts that are still easy to scan (e.g. "Bangers", "Lobster", "Righteous", "Orbitron", "Permanent Marker", "Bungee", "Archivo Black", "Abril Fatface", "Playfair Display", "Oswald", "Anton", "Rubik Mono One", "Fugaz One", "Luckiest Guy", "Staatliches", "Bebas Neue", "Alfa Slab One"). Avoid fonts that sacrifice legibility for style — no dripping/horror scripts, ultra-thin neon-tube styles, or anything with broken/disconnected letterforms. Avoid bland system-like fonts unless the prompt explicitly asks for minimalism.
- Background: Prefer a patterned or multi-color background when it fits the prompt. Use CSS that can be set as the \`background\` property: linear-gradient, radial-gradient, or repeating patterns (e.g. repeating-linear-gradient, subtle stripes/dots). If a solid color fits better, use \`background\` only and leave \`backgroundStyle\` null. If you use a pattern or gradient, keep it low-detail enough that a color sampled from any point still contrasts with the text color.
- Clarity is the top priority: text, primary, and accent colors must be clearly readable against the background/card in every part of the theme — treat this like designing for accessibility (WCAG AAA, 7:1 contrast) even though the exact math will be double-checked and corrected server-side. Prefer palettes that are unambiguously readable over ones that are merely "technically passing."

You MUST reply with a JSON object.

Required schema:
{
  "background": "A hex color: the main page background (used as fallback or base for gradients)",
  "text": "A hex color for main text (high contrast on background)",
  "primary": "A hex color for primary buttons and accents (high contrast)",
  "cardBackground": "A hex color for content cards",
  "accent": "A hex color for secondary accents (high contrast)",
  "emoji": "A single emoji that represents the theme (e.g. 🚀, 🌊, 🎨, 🐉)",
  "fontFamily": "Exact name of a Google Font with strong character (see examples above)",
  "backgroundStyle": "Optional. When set: a full CSS background value for a gradient or pattern, e.g. linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%) or radial-gradient(ellipse at top, #1a1a2e 0%, #16213e 50%, #0f3460 100%) or repeating-linear-gradient(45deg, #0f0f23 0px, #1a1a3e 4px). Omit or set to null for a solid background (then only background is used). Output as a JSON string; escape any double-quotes inside the CSS with a backslash."
}`;

        let responseText = '';

        if (selectedModel.startsWith('gpt')) {
            usedProvider = 'openai';
            responseText = await generateThemeWithOpenAi(prompt, systemInstruction, selectedModel);
        } else {
            usedProvider = 'gemini';
            try {
                responseText = await generateThemeWithGemini(prompt, systemInstruction, selectedModel);
            } catch (geminiError) {
                if (process.env.OPENAI_API_KEY && isLlmProviderFailure(geminiError)) {
                    console.warn(
                        'generate-theme: all Gemini models failed; falling back to gpt-4o-mini.',
                    );
                    usedProvider = 'openai';
                    responseText = await generateThemeWithOpenAi(
                        prompt,
                        systemInstruction,
                        'gpt-4o-mini',
                    );
                } else if (!process.env.GEMINI_API_KEY) {
                    console.error('GEMINI_API_KEY is missing from environment variables (Server)');
                    return NextResponse.json({ error: 'API key configuration error' }, { status: 500 });
                } else {
                    throw geminiError;
                }
            }
        }



        try {
            const theme = sanitizeTheme(parseThemeAiJson(responseText));
            if (!theme) {
                throw new Error('AI response was not an object');
            }
            // Student themes are untrusted input — clamp to WCAG contrast rules before returning.
            const normalized = normalizeStudentTheme(theme as any) ?? theme;
            return NextResponse.json(normalized);
        } catch (parseError) {
            const preview =
                responseText.length > 500 ? `${responseText.slice(0, 500)}…` : responseText;
            console.error('Failed to parse AI theme response as JSON:', preview, parseError);
            return NextResponse.json({ error: 'Invalid response format from AI' }, { status: 500 });
        }

    } catch (error) {
        console.error('Error in /api/generate-theme:', error);
        return NextResponse.json(
            { error: userFacingLlmError(error, undefined, usedProvider) },
            { status: 500 },
        );
    }
}
