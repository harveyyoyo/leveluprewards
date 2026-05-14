import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyFirebaseAuthJwt } from '@/lib/auth/verifyFirebaseAuthJwt';
import {
  FIREBASE_SESSION_COOKIE_NAME,
  shouldEnforceFirebaseSessionEdge,
} from '@/lib/auth/firebaseSessionCookie';
import { parseSchoolScopedSessionPath } from '@/lib/auth/schoolScopedSessionPath';

function applySecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const gated = parseSchoolScopedSessionPath(pathname);
  const enforce = shouldEnforceFirebaseSessionEdge();

  if (enforce && gated && !pathname.startsWith('/api/')) {
    const raw = request.cookies.get(FIREBASE_SESSION_COOKIE_NAME)?.value;
    let ok = false;
    if (raw) {
      const verified = await verifyFirebaseAuthJwt(raw);
      ok = !!verified;
    }
    if (!ok) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('school', gated.schoolId.toLowerCase());
      url.searchParams.set('next', `${pathname}${search || ''}`);
      const redirect = NextResponse.redirect(url);
      applySecurityHeaders(redirect);
      redirect.cookies.set({
        name: FIREBASE_SESSION_COOKIE_NAME,
        value: '',
        maxAge: 0,
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
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
