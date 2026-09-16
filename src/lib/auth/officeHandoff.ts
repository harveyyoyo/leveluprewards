import { randomUUID } from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { getAuthGateSecret } from '@/lib/auth/schoolGateCookie';

export const OFFICE_HANDOFF_JWT_ISS = 'levelup:office-handoff';

export type OfficeHandoffClaims = {
  uid: string;
  schoolId: string;
  loginState: 'admin' | 'office';
  userName: string;
  /** Unique id for this handoff - lets the verifier enforce single use. */
  jti: string;
};

export async function signOfficeHandoffMeta(
  claims: Omit<OfficeHandoffClaims, 'jti'>,
): Promise<string | null> {
  const secret = getAuthGateSecret();
  if (!secret) return null;

  return new SignJWT({
    uid: claims.uid,
    schoolId: claims.schoolId.trim().toLowerCase(),
    loginState: claims.loginState,
    userName: claims.userName,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(OFFICE_HANDOFF_JWT_ISS)
    .setIssuedAt()
    .setJti(randomUUID())
    .setExpirationTime('2m')
    .sign(secret);
}

export async function verifyOfficeHandoffMeta(token: string): Promise<OfficeHandoffClaims | null> {
  const secret = getAuthGateSecret();
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(token, secret, { issuer: OFFICE_HANDOFF_JWT_ISS });
    const uid = typeof payload.uid === 'string' ? payload.uid : '';
    const schoolId = typeof payload.schoolId === 'string' ? payload.schoolId : '';
    const loginState = payload.loginState === 'admin' ? 'admin' : payload.loginState === 'office' ? 'office' : '';
    const userName = typeof payload.userName === 'string' ? payload.userName : '';
    const jti = typeof payload.jti === 'string' ? payload.jti : '';
    if (!uid || !schoolId || !loginState || !jti) return null;
    return { uid, schoolId, loginState, userName, jti };
  } catch {
    return null;
  }
}
