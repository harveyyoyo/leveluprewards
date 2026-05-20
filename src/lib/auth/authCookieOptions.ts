/**
 * HttpOnly auth cookies shared across portal / office subdomains in production.
 */

function normalizeHost(raw: string | undefined): string {
  const host = (raw || '').trim().toLowerCase();
  if (!host) return '';
  return host.split(':')[0] || '';
}

/** Parent domain for cross-subdomain cookies (e.g. `.leveluprewards.app`). */
export function authCookieDomain(): string | undefined {
  const explicit = process.env.AUTH_COOKIE_DOMAIN?.trim();
  if (explicit) return explicit || undefined;

  if (process.env.NODE_ENV !== 'production') return undefined;

  const hosts = [
    process.env.OFFICE_CANONICAL_HOST,
    process.env.NEXT_PUBLIC_OFFICE_CANONICAL_HOST,
    process.env.PORTAL_CANONICAL_HOST,
    process.env.NEXT_PUBLIC_PORTAL_CANONICAL_HOST,
  ]
    .map((h) => normalizeHost(h))
    .filter(Boolean);

  for (const host of hosts) {
    if (host.endsWith('leveluprewards.app')) return '.leveluprewards.app';
  }

  return undefined;
}

export function authCookieFlags() {
  const secure = process.env.NODE_ENV === 'production';
  const domain = authCookieDomain();
  return {
    httpOnly: true as const,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    ...(domain ? { domain } : {}),
  };
}
