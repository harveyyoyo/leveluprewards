import { firebaseConfig } from '@/firebase/config';

/** Firebase Google sign-in redirect URIs that must exist on the Web OAuth client in Google Cloud. */
export function getFirebaseGoogleOAuthRedirectUris(): string[] {
  const projectId = firebaseConfig.projectId;
  const authDomain = (firebaseConfig.authDomain || '').trim();
  const uris = new Set<string>();
  if (projectId) {
    uris.add(`https://${projectId}.firebaseapp.com/__/auth/handler`);
  }
  if (authDomain && !authDomain.includes('localhost') && !authDomain.includes('127.0.0.1')) {
    uris.add(`https://${authDomain.replace(/^https?:\/\//, '')}/__/auth/handler`);
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
    'In Firebase Console → Authentication → Settings → Authorized domains, add localhost and 127.0.0.1. ' +
    'Do not set NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN to localhost in .env.local — leave it unset so auth uses leveluprewards.app.'
  );
}
