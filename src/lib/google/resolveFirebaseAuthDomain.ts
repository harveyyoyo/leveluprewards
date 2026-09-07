export type PageHost = {
  hostname: string;
  host: string;
};

export function isLoopbackHostname(hostname: string): boolean {
  const h = hostname.trim().toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
}

export function stripAuthDomainHost(raw: string): string {
  return (raw || '').trim().replace(/^https?:\/\//i, '').split('/')[0] || '';
}

function currentPageHost(): PageHost | null {
  if (typeof window === 'undefined') return null;
  return { hostname: window.location.hostname, host: window.location.host };
}

/**
 * Firebase's helper URL is always `https://{authDomain}/__/auth/handler`.
 * Do not point authDomain at localhost/127.0.0.1 — that becomes
 * https://127.0.0.1:3000/__/auth/handler, which this HTTP dev server cannot serve.
 */
export function resolveFirebaseAuthDomain(configuredAuthDomain: string): string {
  return stripAuthDomainHost(configuredAuthDomain);
}

/** True when a full-page Google redirect would leave this origin for the Auth helper host. */
export function isGoogleAuthCrossOrigin(
  configuredAuthDomain: string,
  page?: PageHost | null,
): boolean {
  const loc = page === undefined ? currentPageHost() : page;
  if (!loc) return false;
  const authHost = resolveFirebaseAuthDomain(configuredAuthDomain);
  if (!authHost) return false;
  const authHostname = authHost.includes(']:')
    ? authHost.slice(0, authHost.lastIndexOf(':'))
    : authHost.split(':')[0];
  return authHost !== loc.host && authHostname !== loc.hostname;
}
