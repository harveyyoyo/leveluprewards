import { NextResponse } from 'next/server';

export function applySecurityHeaders(response: NextResponse) {
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
    "frame-src 'self' https://leveluprewards.app https://*.leveluprewards.app https://*.firebaseapp.com https://accounts.google.com",
    "object-src 'none'",
    "base-uri 'self'",
  ].join('; ');
  response.headers.set('Content-Security-Policy', csp);
}
