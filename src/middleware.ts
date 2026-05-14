import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyFirebaseAuthJwt } from '@/lib/auth/verifyFirebaseAuthJwt';
import {
  FIREBASE_SESSION_COOKIE_NAME,
  shouldEnforceFirebaseSessionEdge,
} from '@/lib/auth/firebaseSessionCookie';
import { parseSchoolScopedSessionPath } from '@/lib/auth/schoolScopedSessionPath';
import {
  getAuthGateSecret,
  SCHOOL_GATE_COOKIE_NAME,
} from '@/lib/auth/schoolGateCookie';
import { verifySchoolGateJwt } from '@/lib/auth/verifySchoolGateJwt';
import { schoolPathAllowedByGate } from '@/lib/auth/schoolGatePathPolicy';

function applySecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
}

function clearAuthCookies(response: NextResponse) {
  const base = {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  };
  response.cookies.set({ name: FIREBASE_SESSION_COOKIE_NAME, value: '', ...base });
  response.cookies.set({ name: SCHOOL_GATE_COOKIE_NAME, value: '', ...base });
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const gated = parseSchoolScopedSessionPath(pathname);
  const enforce = shouldEnforceFirebaseSessionEdge();

  if (enforce && gated && !pathname.startsWith('/api/')) {
    const fbRaw = request.cookies.get(FIREBASE_SESSION_COOKIE_NAME)?.value;
    let fbUid: string | null = null;
    if (fbRaw) {
      const verified = await verifyFirebaseAuthJwt(fbRaw);
      fbUid = verified?.sub ?? null;
    }

    const gateSecret = getAuthGateSecret();
    let allowed = !!fbUid;

    if (allowed && gateSecret) {
      const gateRaw = request.cookies.get(SCHOOL_GATE_COOKIE_NAME)?.value;
      const gate = gateRaw ? await verifySchoolGateJwt(gateRaw, gateSecret) : null;
      const school = gated.schoolId.trim().toLowerCase();
      allowed = !!(
        gate &&
        gate.uid === fbUid &&
        gate.schoolId === school &&
        schoolPathAllowedByGate(pathname, gated.schoolId, gate.scopes)
      );
    }

    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('school', gated.schoolId.toLowerCase());
      url.searchParams.set('next', `${pathname}${search || ''}`);
      const redirect = NextResponse.redirect(url);
      applySecurityHeaders(redirect);
      clearAuthCookies(redirect);
      return redirect;
    }
  }

  const response = NextResponse.next();
  applySecurityHeaders(response);
  return response;
}

export const config = {
  matcher: [
    '/((?!_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
