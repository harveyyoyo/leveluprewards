import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { clientIp, jsonError, rateLimit, sameOrigin } from '@/lib/server/apiSecurity';

const MAX_ATTEMPTS = 12;
const MAX_BODY_BYTES = 512;

function passcodesMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Local dev only: verify developer passcode (no Google) for tunnel / remote testing. */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return jsonError(404, 'Not found');
  }

  if (!sameOrigin(req)) {
    return jsonError(403, 'Forbidden');
  }

  if (!rateLimit(`dev-developer:${clientIp(req)}`, MAX_ATTEMPTS)) {
    return jsonError(429, 'Too many requests');
  }

  const expected = (process.env.DEV_DEVELOPER_PASSCODE ?? '').trim();
  if (!expected) {
    return jsonError(
      503,
      'DEV_DEVELOPER_PASSCODE is not set. Add it to .env.local for passcode-only developer login.',
    );
  }

  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return jsonError(413, 'Body too large');
  }

  let body: { passcode?: string };
  try {
    body = (await req.json()) as { passcode?: string };
  } catch {
    return jsonError(400, 'Invalid JSON');
  }

  const provided = typeof body.passcode === 'string' ? body.passcode.trim() : '';
  if (!provided || !passcodesMatch(provided, expected)) {
    return jsonError(401, 'Invalid passcode');
  }

  return NextResponse.json({ ok: true });
}
