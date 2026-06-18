import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  canonicalPortalRedirectUrl,
  isPortalHostname,
  portalHostRedirectPath,
} from '@/lib/portalRouting';
import {
  canonicalOfficeRedirectUrl,
  isOfficeChromeRequest,
  OFFICE_CHROME_REQUEST_HEADER,
} from '@/lib/officeRouting';
import {
  canonicalSssRedirectUrl,
  isSssChromeRequest,
  isSssHostname,
  SSS_CHROME_REQUEST_HEADER,
  sssHostInternalRewritePath,
  sssHostRedirectPath,
} from '@/lib/sss/sssRouting';
import { applySecurityHeaders } from '@/lib/middleware/securityHeaders';
import { checkAuthGuard } from '@/lib/middleware/authGuard';
import { invalidSchoolPathRedirect } from '@/lib/middleware/invalidSchoolPath';

function portalChromeRequestHeaders(request: NextRequest): Headers {
  const forwardedHost =
    request.headers.get('x-fh-requested-host') ??
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host');
  const headers = new Headers(request.headers);
  if (isOfficeChromeRequest(request.nextUrl.pathname, forwardedHost)) {
    headers.set(OFFICE_CHROME_REQUEST_HEADER, 'hidden');
  }
  if (isSssChromeRequest(request.nextUrl.pathname, forwardedHost)) {
    headers.set(SSS_CHROME_REQUEST_HEADER, 'hidden');
  }
  return headers;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (invalidSchoolPathRedirect(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    if (!url.searchParams.has('changeSchool')) {
      url.searchParams.set('changeSchool', '1');
    }
    const redirect = NextResponse.redirect(url);
    applySecurityHeaders(redirect);
    return redirect;
  }

  const forwardedHost =
    request.headers.get('x-fh-requested-host') ??
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host');

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

  const canonicalSssUrl = canonicalSssRedirectUrl(pathname, search, forwardedHost, request.nextUrl.protocol);
  if (canonicalSssUrl) {
    const redirect = NextResponse.redirect(canonicalSssUrl);
    applySecurityHeaders(redirect);
    return redirect;
  }

  if (isSssHostname(forwardedHost)) {
    const sssPath = sssHostRedirectPath(pathname);
    if (sssPath && sssPath !== pathname) {
      const url = request.nextUrl.clone();
      url.pathname = sssPath;
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

  const internalRewrite = isSssHostname(forwardedHost) ? sssHostInternalRewritePath(pathname) : null;
  const sessionPathname = internalRewrite ?? pathname;

  const authRedirect = await checkAuthGuard(request, sessionPathname, forwardedHost);
  if (authRedirect) {
    return authRedirect;
  }

  if (internalRewrite && internalRewrite !== pathname) {
    const url = request.nextUrl.clone();
    url.pathname = internalRewrite;
    const response = NextResponse.rewrite(url, {
      request: { headers: portalChromeRequestHeaders(request) },
    });
    applySecurityHeaders(response);
    return response;
  }

  const response = NextResponse.next({
    request: { headers: portalChromeRequestHeaders(request) },
  });
  applySecurityHeaders(response);
  return response;
}

export const config = {
  matcher: [
    '/((?!_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
