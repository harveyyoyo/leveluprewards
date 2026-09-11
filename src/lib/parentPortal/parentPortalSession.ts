import { SignJWT, jwtVerify } from 'jose';
import { getAuthGateSecret } from '@/lib/auth/schoolGateCookie';

export const PARENT_PORTAL_COOKIE_NAME = 'edu_parent_portal';
export const PARENT_PORTAL_JWT_ISS = 'levelup:parent-portal';

export type VerifiedParentPortalSession = {
  schoolId: string;
  studentId: string;
  email: string;
};

export async function signParentPortalSession(
  payload: VerifiedParentPortalSession,
): Promise<string | null> {
  const secret = getAuthGateSecret();
  if (!secret) return null;
  return new SignJWT({
    v: 2,
    sch: payload.schoolId.trim().toLowerCase(),
    sid: payload.studentId,
    email: payload.email.trim().toLowerCase(),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(PARENT_PORTAL_JWT_ISS)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyParentPortalSession(
  token: string,
): Promise<VerifiedParentPortalSession | null> {
  const secret = getAuthGateSecret();
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: PARENT_PORTAL_JWT_ISS,
      algorithms: ['HS256'],
    });
    // Reject older sessions that did not prove email ownership.
    if (Number(payload.v) !== 2) return null;
    const schoolId = typeof payload.sch === 'string' ? payload.sch.trim().toLowerCase() : '';
    const studentId = typeof payload.sid === 'string' ? payload.sid.trim() : '';
    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
    if (!schoolId || !studentId || !email) return null;
    return { schoolId, studentId, email };
  } catch {
    return null;
  }
}
