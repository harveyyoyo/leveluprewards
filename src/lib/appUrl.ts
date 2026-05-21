/** Resolve an in-app path to an absolute URL for iframes and external opens. */
export function resolveAppAbsoluteUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (typeof window === 'undefined') return normalized;
  return `${window.location.origin}${normalized}`;
}
