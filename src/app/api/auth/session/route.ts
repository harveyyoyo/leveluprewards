import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth } from '@/lib/server/firebaseAdminAuth';
import {
  FIREBASE_SESSION_COOKIE_NAME,
  shouldEnforceFirebaseSessionEdge,
} from '@/lib/auth/firebaseSessionCookie';
import { SCHOOL_GATE_COOKIE_NAME } from '@/lib/auth/schoolGateCookie';
import { clientIp, sameOrigin, rateLimit, jsonError } from '@/lib/server/apiSecurity';

const MAX_ATTEMPTS = 20;
const MAX_BODY_BYTES = 32 * 1024;

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

    if (!shouldEnforceFirebaseSessionEdge()) {
      return NextResponse.json({ ok: true, skipped: true });
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
  res.cookies.set({
    name: SCHOOL_GATE_COOKIE_NAME,
    value: '',
    maxAge: 0,
    ...sessionCookieFlags(),
  });
  return res;
}
