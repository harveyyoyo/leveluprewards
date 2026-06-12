import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  isOfficeChromeRequest,
  OFFICE_CHROME_REQUEST_HEADER,
  officeHostInternalRewritePath,
  officeHostRedirectPath,
} from '@/lib/officeRouting';
import { applySecurityHeaders } from '@/lib/middleware/securityHeaders';
import { checkAuthGuard } from '@/lib/middleware/authGuard';

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

  const officePath = officeHostRedirectPath(pathname);
  if (officePath && officePath !== pathname) {
    const url = request.nextUrl.clone();
    url.pathname = officePath;
    const redirect = NextResponse.redirect(url);
    applySecurityHeaders(redirect);
    return redirect;
  }

  const internalRewrite = officeHostInternalRewritePath(pathname);
  const sessionPathname = internalRewrite ?? pathname;

  const authRedirect = await checkAuthGuard(request, sessionPathname, forwardedHost);
  if (authRedirect) {
    return authRedirect;
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
  matcher: ['/((?!_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
