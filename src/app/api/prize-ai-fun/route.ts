export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { guardAiRoute } from '@/lib/apiAuth';
import { assertPrizeAiSurpriseAllowedForSchool } from '@/lib/server/prizeAiSurpriseGate';
import type { PrizeAiFunReward } from '@/lib/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const defaultOpenAI = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

const MODES: PrizeAiFunReward[] = ['random', 'joke', 'riddle', 'fortune'];

function resolveKind(mode: PrizeAiFunReward): 'joke' | 'riddle' | 'fortune' {
  if (mode === 'random') {
    const roll = Math.floor(Math.random() * 3);
    return ['joke', 'riddle', 'fortune'][roll] as 'joke' | 'riddle' | 'fortune';
  }
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

export async function POST(req: NextRequest) {
  try {
    const guarded = await guardAiRoute(req, {
      requireSchoolStaff: false,
      maxRequests: 10,
      maxBodyBytes: 4096,
    });
    if (!guarded.ok) return guarded.response;

    const { schoolId: rawSchoolId, mode: rawMode, model = 'gemini-2.5-flash' } = guarded.value.body;

    if (typeof rawSchoolId !== 'string' || !rawSchoolId.trim()) {
      return NextResponse.json({ error: 'schoolId is required.' }, { status: 400 });
    }
    const schoolId = rawSchoolId.trim();

    const planDenied = await assertPrizeAiSurpriseAllowedForSchool(schoolId);
    if (planDenied) return planDenied;

    if (typeof rawMode !== 'string' || !MODES.includes(rawMode as PrizeAiFunReward)) {
      return NextResponse.json({ error: 'mode must be random, joke, riddle, or fortune.' }, { status: 400 });
    }
    const mode = rawMode as PrizeAiFunReward;
    const selectedModel = typeof model === 'string' ? model : 'gemini-2.5-flash';
    const kind = resolveKind(mode);

    const systemInstruction = `You write short, wholesome content for elementary and middle school students.
Rules:
- Language must be English. Keep everything strictly PG / school-appropriate: no violence, romance, politics, insults, scary themes, or crude humor.
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
- fortune: "text" is one short fortune-cookie style line (inspiring or gently humorous). Omit "answer".

School context id (opaque): ${schoolId}`;

    const userPrompt = `Generate one fresh ${kind} now. Make it original — avoid clichéd riddles like "what has keys but can't open locks".`;

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
