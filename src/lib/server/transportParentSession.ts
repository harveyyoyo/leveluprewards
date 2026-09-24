import { SignJWT, jwtVerify } from 'jose';
import { getAuthGateSecret } from '@/lib/auth/schoolGateCookie';

export const TRANSPORT_PARENT_COOKIE_NAME = 'edu_transport_parent';
export const TRANSPORT_PARENT_JWT_ISS = 'levelup:transport-parent';

export type VerifiedTransportParentSession = {
  schoolId: string;
  accessId: string;
};

export async function signTransportParentSession(
  payload: VerifiedTransportParentSession,
): Promise<string | null> {
  const secret = getAuthGateSecret();
  if (!secret) return null;
  return new SignJWT({
    v: 1,
    sch: payload.schoolId.trim().toLowerCase(),
    aid: payload.accessId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(TRANSPORT_PARENT_JWT_ISS)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyTransportParentSession(
  token: string,
): Promise<VerifiedTransportParentSession | null> {
  const secret = getAuthGateSecret();
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: TRANSPORT_PARENT_JWT_ISS,
      algorithms: ['HS256'],
    });
    if (Number(payload.v) !== 1) return null;
    const schoolId = typeof payload.sch === 'string' ? payload.sch.trim().toLowerCase() : '';
    const accessId = typeof payload.aid === 'string' ? payload.aid.trim() : '';
    if (!schoolId || !accessId) return null;
    return { schoolId, accessId };
  } catch {
    return null;
  }
}
