import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth } from '@/lib/server/firebaseAdminAuth';
import {
  FIREBASE_SESSION_COOKIE_NAME,
  shouldEnforceFirebaseSessionEdge,
  shouldMintFirebaseSessionCookie,
} from '@/lib/auth/firebaseSessionCookie';
import { SCHOOL_GATE_COOKIE_NAME } from '@/lib/auth/schoolGateCookie';
import { authCookieFlags } from '@/lib/auth/authCookieOptions';
import { clientIp, sameOrigin, rateLimit, jsonError } from '@/lib/server/apiSecurity';

const MAX_ATTEMPTS = 20;
const MAX_BODY_BYTES = 32 * 1024;

/** POST: exchange Firebase ID token for HttpOnly session cookie (verified server-side). */
export async function POST(req: NextRequest) {
  try {
    if (!sameOrigin(req)) {
      return jsonError(403, 'Forbidden');
    }

    if (!shouldMintFirebaseSessionCookie()) {
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

    let sessionCookie = '';
    let expiresInMs = 0;
    try {
      const auth = await getFirebaseAdminAuth();
      await auth.verifyIdToken(idToken, true);

      expiresInMs = 1000 * 60 * 60 * 24 * 5; // 5 days (under Firebase 14d cap)
      sessionCookie = await auth.createSessionCookie(idToken, { expiresIn: expiresInMs });
    } catch (e) {
      console.error('[api/auth/session] cookie mint failed:', e);
      if (!shouldEnforceFirebaseSessionEdge()) {
        return NextResponse.json({
          ok: true,
          skipped: true,
          reason: 'session-cookie-unavailable',
        });
      }
      return jsonError(503, 'Could not create session. Check Firebase Admin credentials in this environment.');
    }

    const maxAgeSec = Math.floor(expiresInMs / 1000);

    const res = NextResponse.json({ ok: true });
    res.cookies.set({
      name: FIREBASE_SESSION_COOKIE_NAME,
      value: sessionCookie,
      maxAge: maxAgeSec,
      ...authCookieFlags(),
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
    ...authCookieFlags(),
  });
  res.cookies.set({
    name: SCHOOL_GATE_COOKIE_NAME,
    value: '',
    maxAge: 0,
    ...authCookieFlags(),
  });
  return res;
}
