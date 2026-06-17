import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  isOfficeChromeRequest,
  isOfficeHostname,
  OFFICE_CHROME_REQUEST_HEADER,
  officeHostInternalRewritePath,
  officeHostRedirectPath,
} from '@/lib/officeRouting';
import { applySecurityHeaders } from '@/lib/middleware/securityHeaders';
import { checkAuthGuard } from '@/lib/middleware/authGuard';

/** Skip legacy `/{school}/office` → `/{school}` cleanup on internal rewrites (avoids redirect loop). */
const OFFICE_INTERNAL_REWRITE_HEADER = 'x-lvlup-office-internal';

function officeChromeRequestHeaders(request: NextRequest): Headers {
  const headers = new Headers(request.headers);
  const forwardedHost =
    request.headers.get('x-fh-requested-host') ??
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host');
  if (isOfficeChromeRequest(request.nextUrl.pathname, forwardedHost)) {
    headers.set(OFFICE_CHROME_REQUEST_HEADER, 'hidden');
  }
  return headers;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const forwardedHost =
    request.headers.get('x-fh-requested-host') ??
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host');

  const onOfficeHost = isOfficeHostname(forwardedHost);
  const skipLegacyOfficeCleanup = request.headers.get(OFFICE_INTERNAL_REWRITE_HEADER) === '1';

  if (pathname === '/' || pathname === '') {
    const url = request.nextUrl.clone();
    url.pathname = '/office-bootstrap';
    const redirect = NextResponse.redirect(url);
    applySecurityHeaders(redirect);
    return redirect;
  }

  const officePath =
    onOfficeHost && !skipLegacyOfficeCleanup ? officeHostRedirectPath(pathname) : null;
  if (officePath && officePath !== pathname) {
    const url = request.nextUrl.clone();
    url.pathname = officePath;
    const redirect = NextResponse.redirect(url);
    applySecurityHeaders(redirect);
    return redirect;
  }

  const internalRewrite = onOfficeHost ? officeHostInternalRewritePath(pathname) : null;
  const sessionPathname = internalRewrite ?? pathname;

  const authRedirect = await checkAuthGuard(request, sessionPathname, forwardedHost);
  if (authRedirect) {
    return authRedirect;
  }

  if (internalRewrite && internalRewrite !== pathname) {
    const url = request.nextUrl.clone();
    url.pathname = internalRewrite;
    const rewriteHeaders = officeChromeRequestHeaders(request);
    rewriteHeaders.set(OFFICE_INTERNAL_REWRITE_HEADER, '1');
    const response = NextResponse.rewrite(url, {
      request: { headers: rewriteHeaders },
    });
    applySecurityHeaders(response);
    return response;
  }

  // Standalone office dev (localhost:3001): clean /{school} bookmarks → /{school}/office (one hop, no loop).
  if (!onOfficeHost) {
    const devOfficePath = officeHostInternalRewritePath(pathname);
    if (devOfficePath && devOfficePath !== pathname) {
      const url = request.nextUrl.clone();
      url.pathname = devOfficePath;
      const redirect = NextResponse.redirect(url);
      applySecurityHeaders(redirect);
      return redirect;
    }
  }

  const response = NextResponse.next({
    request: { headers: officeChromeRequestHeaders(request) },
  });
  applySecurityHeaders(response);
  return response;
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
