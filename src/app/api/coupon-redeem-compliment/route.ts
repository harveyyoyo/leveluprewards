export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { guardAiRoute } from '@/lib/apiAuth';
import { assertCouponRedeemComplimentsAllowedForSchool } from '@/lib/server/couponRedeemComplimentGate';
import { clampStudentAgeYearsForAiRequest, prizeAiFunAudiencePromptBlock } from '@/lib/studentAiFunAge';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const defaultOpenAI = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

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

function sanitizeCompliment(s: unknown): string {
  if (typeof s !== 'string') return '';
  return s.replace(/\s+/g, ' ').trim().slice(0, 180);
}

export async function POST(req: NextRequest) {
  try {
    const guarded = await guardAiRoute(req, {
      requireSchoolStaff: false,
      maxRequests: 20,
      maxBodyBytes: 4096,
    });
    if (!guarded.ok) return guarded.response;

    const {
      schoolId: rawSchoolId,
      category: rawCategory,
      points: rawPoints,
      firstName: rawFirstName,
      ageYears: rawAgeYears,
      model = 'gpt-4o-mini',
    } = guarded.value.body;

    if (typeof rawSchoolId !== 'string' || !rawSchoolId.trim()) {
      return NextResponse.json({ error: 'schoolId is required.' }, { status: 400 });
    }
    const schoolId = rawSchoolId.trim();
    const category =
      typeof rawCategory === 'string' && rawCategory.trim() ? rawCategory.trim().slice(0, 80) : 'Coupon';
    const points =
      typeof rawPoints === 'number' && Number.isFinite(rawPoints) && rawPoints > 0
        ? Math.min(9999, Math.floor(rawPoints))
        : undefined;
    const firstName =
      typeof rawFirstName === 'string' && rawFirstName.trim()
        ? rawFirstName.trim().slice(0, 40)
        : undefined;
    const ageYears = clampStudentAgeYearsForAiRequest(rawAgeYears);
    const audienceBlock = prizeAiFunAudiencePromptBlock(ageYears);

    const planDenied = await assertCouponRedeemComplimentsAllowedForSchool(schoolId);
    if (planDenied) return planDenied;

    const selectedModel = typeof model === 'string' ? model : 'gpt-4o-mini';

    const systemInstruction = `You write one short, warm compliment for a student right after they redeem a reward coupon at a school kiosk.

${audienceBlock}

Context:
- Coupon category (the behavior or skill being rewarded): "${category}"
${points != null ? `- Points earned on this coupon: ${points}` : ''}
${firstName ? `- Optional first name (use at most once, naturally): ${firstName}` : ''}

Rules:
- English only.
- Exactly ONE sentence, 8–18 words preferred.
- Celebrate the student for earning this specific type of coupon — tie the praise to the category meaning (e.g. good behavior, academics, helping others).
- Tone: encouraging, sincere, age-appropriate. Examples of style (do not copy verbatim): "You earned this — keep up the good behavior!", "Great effort in class today!"
- No sarcasm, no backhanded praise, no romance, politics, religion, violence, insults, appearance/body comments, or comparisons to other students.
- Do not mention trash, throwing away paper, or coupon disposal.
- Output MUST be a single JSON object only: { "compliment": "string" }`;

    const userPrompt = `Write one fresh compliment now for redeeming a "${category}" coupon.`;

    let responseText = '';

    if (selectedModel.startsWith('gpt')) {
      const effectiveKey = process.env.OPENAI_API_KEY;
      if (!effectiveKey) {
        return NextResponse.json({ error: 'OpenAI API key is not configured on the server.' }, { status: 503 });
      }

      const response = await defaultOpenAI.chat.completions.create({
        model: selectedModel as 'gpt-4o-mini',
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
    const compliment = sanitizeCompliment(parsed?.compliment);
    if (!compliment) {
      console.error('coupon-redeem-compliment parse failure:', responseText.slice(0, 500));
      return NextResponse.json({ error: 'Invalid response format from AI.' }, { status: 500 });
    }

    return NextResponse.json({ compliment });
  } catch (error) {
    console.error('Error in /api/coupon-redeem-compliment:', error);
    return NextResponse.json({ error: 'Failed to generate compliment.' }, { status: 500 });
  }
}
