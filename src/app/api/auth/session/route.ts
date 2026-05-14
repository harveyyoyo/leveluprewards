import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth } from '@/lib/server/firebaseAdminAuth';
import { FIREBASE_SESSION_COOKIE_NAME } from '@/lib/auth/firebaseSessionCookie';

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 20;
const MAX_BODY_BYTES = 32 * 1024;
const buckets = new Map<string, { count: number; windowStart: number }>();

function jsonError(status: number, message: string) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]?.trim() || 'unknown';
  return req.headers.get('x-real-ip')?.trim() || req.ip || 'unknown';
}

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const forwardedHost = req.headers.get('x-forwarded-host');
  const host = forwardedHost || req.headers.get('host');
  if (!host) return false;

  const hosts = host.split(',').map((h) => h.trim()).filter(Boolean);
  const matches = (value: string) => {
    try {
      return hosts.includes(new URL(value).host);
    } catch {
      return false;
    }
  };

  if (origin) return matches(origin);
  if (referer) return matches(referer);
  return false;
}

function rateLimit(key: string, max: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count += 1;
  return true;
}

function sessionCookieFlags() {
  const secure = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true as const,
    secure,
    sameSite: 'lax' as const,
    path: '/',
  };
}

/** POST: exchange Firebase ID token for HttpOnly session cookie (verified server-side). */
export async function POST(req: NextRequest) {
  try {
    if (!sameOrigin(req)) {
      return jsonError(403, 'Forbidden');
    }
    if (!rateLimit(`session:post:${clientIp(req)}`, MAX_ATTEMPTS)) {
      return jsonError(429, 'Too many requests');
    }

    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return jsonError(413, 'Body too large');
    }

    const body = await req.json();
    const idToken = typeof body?.idToken === 'string' ? body.idToken : '';
    if (!idToken) {
      return jsonError(400, 'idToken required');
    }

    const auth = await getFirebaseAdminAuth();
    await auth.verifyIdToken(idToken, true);

    const expiresInMs = 1000 * 60 * 60 * 24 * 5; // 5 days (under Firebase 14d cap)
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn: expiresInMs });
    const maxAgeSec = Math.floor(expiresInMs / 1000);

    const res = NextResponse.json({ ok: true });
    res.cookies.set({
      name: FIREBASE_SESSION_COOKIE_NAME,
      value: sessionCookie,
      maxAge: maxAgeSec,
      ...sessionCookieFlags(),
    });
    return res;
  } catch (e) {
    console.error('[api/auth/session] POST failed:', e);
    return jsonError(503, 'Could not create session. Check Firebase Admin credentials in this environment.');
  }
}

/** DELETE: clear session cookie (full sign-out or switching accounts). */
export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) {
    return jsonError(403, 'Forbidden');
  }
  if (!rateLimit(`session:del:${clientIp(req)}`, MAX_ATTEMPTS)) {
    return jsonError(429, 'Too many requests');
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: FIREBASE_SESSION_COOKIE_NAME,
    value: '',
    maxAge: 0,
    ...sessionCookieFlags(),
  });
  return res;
}
