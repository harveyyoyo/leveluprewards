export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { guardDeveloperRoute } from '@/lib/apiAuth';
import type { SchoolHealthAlert } from '@/lib/developer/schoolHealthRules';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

function extractJson(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed);
  const inner = fence ? fence[1].trim() : trimmed;
  try {
    const parsed = JSON.parse(inner);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function sanitizeLine(s: unknown, max = 400): string {
  if (typeof s !== 'string') return '';
  return s.replace(/\s+/g, ' ').trim().slice(0, max);
}

export async function POST(req: NextRequest) {
  try {
    const guarded = await guardDeveloperRoute(req, { maxRequests: 5, maxBodyBytes: 64 * 1024 });
    if (!guarded.ok) return guarded.response;

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is not configured. Rule-based alerts still work without AI.' },
        { status: 503 },
      );
    }

    const { alerts: rawAlerts, fleetSnapshot: rawFleet } = guarded.value.body;
    if (!Array.isArray(rawAlerts) || rawAlerts.length === 0) {
      return NextResponse.json({ error: 'alerts array is required.' }, { status: 400 });
    }

    const alerts = rawAlerts as SchoolHealthAlert[];
    const fleetSnapshot = Array.isArray(rawFleet) ? rawFleet : [];

    const systemInstruction = `You are a product operations coach for "School Arcade Rewards", a school points, kiosk, library, attendance, and prize-desk platform.

You receive rule-based health alerts and a compact fleet snapshot. Your job:
1. Explain patterns across schools (what is going wrong or inefficient).
2. Prioritize which schools need developer outreach first (ignore demo/sample schools if marked isDemoSchool).
3. Give concrete, actionable recommendations for the developer (training topics, config checks, feature toggles).

Output ONLY valid JSON:
{
  "executiveSummary": "2-4 sentences",
  "topPriorities": [
    { "schoolId": "string", "issue": "string", "action": "string" }
  ],
  "fleetPatterns": ["bullet", "bullet"],
  "coachingTips": ["bullet for developer playbook"]
}
Max 5 topPriorities. Be direct and specific. Do not invent metrics not in the input.`;

    const userPayload = JSON.stringify({
      alerts: alerts.slice(0, 30),
      fleet: fleetSnapshot.slice(0, 40),
      alertCounts: {
        critical: alerts.filter((a) => a.severity === 'critical').length,
        warning: alerts.filter((a) => a.severity === 'warning').length,
        info: alerts.filter((a) => a.severity === 'info').length,
      },
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0.35,
      messages: [
        { role: 'system', content: systemInstruction },
        {
          role: 'user',
          content: `Analyze this developer health report and return coaching JSON:\n${userPayload}`,
        },
      ],
    });

    const parsed = extractJson(response.choices[0]?.message?.content || '');
    if (!parsed) {
      return NextResponse.json({ error: 'AI returned an invalid format.' }, { status: 500 });
    }

    const topPriorities = Array.isArray(parsed.topPriorities)
      ? parsed.topPriorities
          .slice(0, 5)
          .map((row) => {
            const r = row as Record<string, unknown>;
            return {
              schoolId: sanitizeLine(r.schoolId, 64),
              issue: sanitizeLine(r.issue, 200),
              action: sanitizeLine(r.action, 280),
            };
          })
          .filter((r) => r.schoolId && r.issue)
      : [];

    const fleetPatterns = Array.isArray(parsed.fleetPatterns)
      ? parsed.fleetPatterns.map((x) => sanitizeLine(x, 300)).filter(Boolean).slice(0, 6)
      : [];

    const coachingTips = Array.isArray(parsed.coachingTips)
      ? parsed.coachingTips.map((x) => sanitizeLine(x, 300)).filter(Boolean).slice(0, 6)
      : [];

    return NextResponse.json({
      executiveSummary: sanitizeLine(parsed.executiveSummary, 800),
      topPriorities,
      fleetPatterns,
      coachingTips,
      model: 'gpt-4o-mini',
    });
  } catch (error) {
    console.error('[school-health-coach]', error);
    return NextResponse.json({ error: 'Failed to generate AI coaching report.' }, { status: 500 });
  }
}
