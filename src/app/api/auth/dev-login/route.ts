import { NextRequest, NextResponse } from 'next/server';

// Simple per-IP sliding-window brute-force limiter.
interface Bucket { count: number; windowStart: number; }
const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 8;

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]?.trim() || 'unknown';
  return req.headers.get('x-real-ip')?.trim() || req.ip || 'unknown';
}

function checkLimit(ip: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    buckets.set(ip, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (bucket.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((WINDOW_MS - (now - bucket.windowStart)) / 1000)),
    };
  }
  bucket.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limit = checkLimit(ip);
  if (!limit.allowed) {
    const res = NextResponse.json(
      { success: false, error: 'Too many attempts. Please try again shortly.' },
      { status: 429 }
    );
    res.headers.set('Retry-After', String(limit.retryAfterSec));
    return res;
  }

  try {
    const { passcode } = await req.json();

    if (!passcode || typeof passcode !== 'string') {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    if (!process.env.DEV_PASSCODE) {
      // Fail closed when the secret isn't configured instead of accidentally
      // matching against an empty string.
      return NextResponse.json({ success: false }, { status: 503 });
    }

    const isValid = passcode === process.env.DEV_PASSCODE;

    return NextResponse.json({ success: isValid });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
