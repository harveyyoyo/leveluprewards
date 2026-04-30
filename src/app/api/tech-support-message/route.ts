export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { guardAiRoute } from '@/lib/apiAuth';
import { deliverTechSupportWhatsApp, isTechSupportWhatsAppConfigured } from '@/lib/techSupportWhatsApp';

const MAX_MESSAGE = 2000;

export async function POST(req: NextRequest) {
  try {
    const guarded = await guardAiRoute(req, {
      requireSchoolStaff: true,
      maxRequests: 8,
      maxBodyBytes: 12 * 1024,
      windowMs: 60_000,
    });
    if (!guarded.ok) return guarded.response;

    const { body, schoolId } = guarded.value;
    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required.' }, { status: 400 });
    }

    const raw = body.message;
    if (typeof raw !== 'string' || !raw.trim()) {
      return NextResponse.json({ error: 'message is required.' }, { status: 400 });
    }
    const message = raw.replace(/\u0000/g, '').trim().slice(0, MAX_MESSAGE);

    const pathname = typeof body.pathname === 'string' ? body.pathname : undefined;
    const loginState = typeof body.loginState === 'string' ? body.loginState : undefined;
    const userLabel = typeof body.userLabel === 'string' ? body.userLabel.trim().slice(0, 120) : undefined;

    if (!isTechSupportWhatsAppConfigured()) {
      return NextResponse.json(
        {
          error:
            'Tech support messaging is not configured on this server. Contact your administrator.',
          configured: false,
        },
        { status: 503 }
      );
    }

    const result = await deliverTechSupportWhatsApp({
      message,
      schoolId,
      loginState,
      pathname,
      userLabel,
      userId: guarded.value.uid,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 503 });
    }

    return NextResponse.json({ ok: true, provider: result.provider });
  } catch (e) {
    console.error('tech-support-message:', e);
    return NextResponse.json({ error: 'Could not send the message.' }, { status: 500 });
  }
}
