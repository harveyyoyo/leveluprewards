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
import { authCookieFlags } from '@/lib/auth/authCookieOptions';
import {
  canonicalPortalHost,
  isLocalDevHost,
  requestBrowserOrigin,
} from '@/lib/portalRouting';
import { isOfficeHostname } from '@/lib/officeRouting';
import { SCHOOL_LOGIN_OFFICE_INTENT_PARAM } from '@/lib/auth/schoolLoginRedirect';
import { officePublicHref } from '@/lib/officePublicUrl';
import { applySecurityHeaders } from './securityHeaders';

export function clearAuthCookies(response: NextResponse) {
  const base = {
    maxAge: 0,
    ...authCookieFlags(),
  };
  response.cookies.set({ name: FIREBASE_SESSION_COOKIE_NAME, value: '', ...base });
  response.cookies.set({ name: SCHOOL_GATE_COOKIE_NAME, value: '', ...base });
}

export function portalLoginRedirect(
  request: NextRequest,
  schoolId: string,
  nextPath: string,
): NextResponse {
  const forwarded =
    request.headers.get('x-fh-requested-host') ??
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host');
  const portalHost = canonicalPortalHost();
  const useCanonicalPortal = portalHost && !isLocalDevHost(forwarded);
  const loginBase = useCanonicalPortal
    ? new URL(
        `${portalHost.includes('localhost') ? 'http:' : request.nextUrl.protocol}//${portalHost}/login`,
      )
    : new URL('/login', requestBrowserOrigin(request));

  loginBase.searchParams.set('school', schoolId.toLowerCase());
  loginBase.searchParams.set('next', nextPath);
  loginBase.searchParams.set(SCHOOL_LOGIN_OFFICE_INTENT_PARAM, '1');

  const redirect = NextResponse.redirect(loginBase);
  applySecurityHeaders(redirect);
  clearAuthCookies(redirect);
  return redirect;
}

export async function checkAuthGuard(
  request: NextRequest,
  sessionPathname: string,
  forwardedHost: string | null,
): Promise<NextResponse | null> {
  const gated = parseSchoolScopedSessionPath(sessionPathname);
  const enforce = shouldEnforceFirebaseSessionEdge();
  const { pathname, search } = request.nextUrl;

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
        schoolPathAllowedByGate(sessionPathname, gated.schoolId, gate.scopes)
      );
    }

    if (!allowed) {
      if (isOfficeHostname(forwardedHost)) {
        const nextOffice = officePublicHref(gated.schoolId);
        return portalLoginRedirect(request, gated.schoolId, nextOffice);
      }

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

  return null;
}
