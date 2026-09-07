import { firebaseConfig } from '@/firebase/config';
import { isLoopbackHostname } from '@/lib/google/resolveFirebaseAuthDomain';

/** Firebase Google sign-in redirect URIs that must exist on the Web OAuth client in Google Cloud. */
export function getFirebaseGoogleOAuthRedirectUris(page?: {
  protocol: string;
  host: string;
  hostname: string;
}): string[] {
  const projectId = firebaseConfig.projectId;
  const authDomain = (firebaseConfig.authDomain || '').trim();
  const uris = new Set<string>();
  if (projectId) {
    uris.add(`https://${projectId}.firebaseapp.com/__/auth/handler`);
  }
  if (authDomain && !authDomain.includes('localhost') && !authDomain.includes('127.0.0.1')) {
    uris.add(`https://${authDomain.replace(/^https?:\/\//, '')}/__/auth/handler`);
  }
  const loc =
    page ??
    (typeof window !== 'undefined'
      ? {
          protocol: window.location.protocol,
          host: window.location.host,
          hostname: window.location.hostname,
        }
      : null);
  if (loc && isLoopbackHostname(loc.hostname)) {
    uris.add(`${loc.protocol}//${loc.host}/__/auth/handler`);
  }
  return [...uris];
}

export function isGoogleOAuthRedirectMismatchError(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  const code = String(e?.code ?? '');
  const msg = String(e?.message ?? '').toLowerCase();
  return (
    code === 'auth/unauthorized-domain' ||
    msg.includes('redirect_uri_mismatch') ||
    msg.includes('redirect uri mismatch')
  );
}

export function googleOAuthRedirectMismatchHint(): string {
  const uris = getFirebaseGoogleOAuthRedirectUris().join(' and ');
  return (
    `Google OAuth is not configured for this app. In Google Cloud Console (Firebase project ${firebaseConfig.projectId}), open APIs & Services → Credentials → the Web OAuth client used by Firebase, and add these Authorized redirect URIs: ${uris}. ` +
    'In Firebase Console → Authentication → Settings → Authorized domains, add localhost and 127.0.0.1.'
  );
}
