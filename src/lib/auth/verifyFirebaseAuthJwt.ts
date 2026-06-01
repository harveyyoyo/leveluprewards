import { createRemoteJWKSet, jwtVerify } from 'jose';
import { firebaseConfig } from '@/firebase/config';

const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

/**
 * Verifies a Firebase ID token or session cookie JWT (Edge-safe).
 * @see https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
 */
export async function verifyFirebaseAuthJwt(
  token: string,
): Promise<{ sub: string; email?: string } | null> {
  const projectId = firebaseConfig.projectId;
  if (!projectId) return null;
  const issuer = `https://securetoken.google.com/${projectId}`;
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer,
      audience: projectId,
    });
    const sub = typeof payload.sub === 'string' ? payload.sub : null;
    if (!sub) return null;
    const email =
      typeof payload.email === 'string'
        ? payload.email.trim().toLowerCase()
        : undefined;
    return { sub, email };
  } catch {
    return null;
  }
}
