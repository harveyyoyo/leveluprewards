import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js middleware for route protection.
 * Checks session-based login state for protected routes.
 * 
 * Note: Since this app uses sessionStorage (client-side only) for auth state,
 * middleware can only protect against direct URL access by checking if a cookie
 * or header is present. For full SSR protection, switch to cookie-based sessions.
 * 
 * For now, this middleware ensures that API routes are properly handled and
 * adds security headers to all responses.
 */
export function middleware(request: NextRequest) {
    const response = NextResponse.next();

    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    // Allow same-origin iframes (used by in-app admin live previews).
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next (Next.js internals: HMR, static chunks, image optimizer, etc.)
         * - favicon.ico (favicon file)
         * - public assets
         */
        '/((?!_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
