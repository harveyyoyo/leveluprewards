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
  canonicalPortalRedirectUrl,
  canonicalPortalHost,
  isLocalDevHost,
  isPortalHostname,
  portalHostRedirectPath,
  requestBrowserOrigin,
} from '@/lib/portalRouting';
import {
  canonicalOfficeRedirectUrl,
  isOfficeChromeRequest,
  isOfficeHostname,
  OFFICE_CHROME_REQUEST_HEADER,
  officeHostInternalRewritePath,
  officeHostRedirectPath,
} from '@/lib/officeRouting';
import { officePublicHref } from '@/lib/officePublicUrl';

function officeChromeRequestHeaders(request: NextRequest): Headers {
  const forwardedHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const headers = new Headers(request.headers);
  if (isOfficeChromeRequest(request.nextUrl.pathname, forwardedHost)) {
    headers.set(OFFICE_CHROME_REQUEST_HEADER, 'hidden');
  }
  return headers;
}

function applySecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.firebaseio.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' blob: data: https://*.googleapis.com https://*.googleusercontent.com https://firebasestorage.googleapis.com",
    "connect-src 'self' http://127.0.0.1:* http://localhost:* https://*.cloudfunctions.net https://*.googleapis.com https://*.firebaseio.com https://firebaseinstallations.googleapis.com https://identitytoolkit.googleapis.com wss://*.firebaseio.com",
    "media-src 'self' blob:",
    "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com",
    "object-src 'none'",
    "base-uri 'self'",
  ].join('; ');
  response.headers.set('Content-Security-Policy', csp);
}

function clearAuthCookies(response: NextResponse) {
  const base = {
    maxAge: 0,
    ...authCookieFlags(),
  };
  response.cookies.set({ name: FIREBASE_SESSION_COOKIE_NAME, value: '', ...base });
  response.cookies.set({ name: SCHOOL_GATE_COOKIE_NAME, value: '', ...base });
}

function portalLoginRedirect(
  request: NextRequest,
  schoolId: string,
  nextPath: string,
): NextResponse {
  const forwarded = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const portalHost = canonicalPortalHost();
  const useCanonicalPortal = portalHost && !isLocalDevHost(forwarded);
  const loginBase = useCanonicalPortal
    ? new URL(
        `${portalHost.includes('localhost') ? 'http:' : request.nextUrl.protocol}//${portalHost}/login`,
      )
    : new URL('/login', requestBrowserOrigin(request));

  loginBase.searchParams.set('school', schoolId.toLowerCase());
  loginBase.searchParams.set('next', nextPath);

  const redirect = NextResponse.redirect(loginBase);
  applySecurityHeaders(redirect);
  clearAuthCookies(redirect);
  return redirect;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const forwardedHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host');

  const canonicalPortalUrl = canonicalPortalRedirectUrl(
    pathname,
    search,
    forwardedHost,
    request.nextUrl.protocol,
  );
  if (canonicalPortalUrl) {
    const redirect = NextResponse.redirect(canonicalPortalUrl);
    applySecurityHeaders(redirect);
    return redirect;
  }

  const canonicalOfficeUrl = canonicalOfficeRedirectUrl(
    pathname,
    search,
    forwardedHost,
    request.nextUrl.protocol,
  );
  if (canonicalOfficeUrl) {
    const redirect = NextResponse.redirect(canonicalOfficeUrl);
    applySecurityHeaders(redirect);
    return redirect;
  }

  if (isOfficeHostname(forwardedHost)) {
    const officePath = officeHostRedirectPath(pathname);
    if (officePath && officePath !== pathname) {
      const url = request.nextUrl.clone();
      url.pathname = officePath;
      const redirect = NextResponse.redirect(url);
      applySecurityHeaders(redirect);
      return redirect;
    }
  }

  if (isPortalHostname(forwardedHost)) {
    const portalPath = portalHostRedirectPath(pathname);
    if (portalPath && portalPath !== pathname) {
      const url = request.nextUrl.clone();
      url.pathname = portalPath;
      const redirect = NextResponse.redirect(url);
      applySecurityHeaders(redirect);
      return redirect;
    }
  }

  const internalRewrite = isOfficeHostname(forwardedHost)
    ? officeHostInternalRewritePath(pathname)
    : null;
  const sessionPathname = internalRewrite ?? pathname;

  const gated = parseSchoolScopedSessionPath(sessionPathname);
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

  if (internalRewrite && internalRewrite !== pathname) {
    const url = request.nextUrl.clone();
    url.pathname = internalRewrite;
    const response = NextResponse.rewrite(url, {
      request: { headers: officeChromeRequestHeaders(request) },
    });
    applySecurityHeaders(response);
    return response;
  }

  const response = NextResponse.next({
    request: { headers: officeChromeRequestHeaders(request) },
  });
  applySecurityHeaders(response);
  return response;
}

export const config = {
  matcher: [
    '/((?!_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
