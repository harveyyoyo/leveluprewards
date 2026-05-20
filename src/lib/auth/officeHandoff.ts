import { SignJWT, jwtVerify } from 'jose';
import { getAuthGateSecret } from '@/lib/auth/schoolGateCookie';

export const OFFICE_HANDOFF_JWT_ISS = 'levelup:office-handoff';

export type OfficeHandoffClaims = {
  uid: string;
  schoolId: string;
  loginState: 'admin' | 'office';
  userName: string;
};

export async function signOfficeHandoffMeta(claims: OfficeHandoffClaims): Promise<string | null> {
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
    if (!uid || !schoolId || !loginState) return null;
    return { uid, schoolId, loginState, userName };
  } catch {
    return null;
  }
}
