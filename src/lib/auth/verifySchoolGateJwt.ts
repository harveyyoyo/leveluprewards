import { jwtVerify } from 'jose';
import { SCHOOL_GATE_JWT_ISS } from '@/lib/auth/schoolGateCookie';

export type VerifiedSchoolGate = {
  schoolId: string;
  uid: string;
  scopes: Set<string>;
};

export async function verifySchoolGateJwt(
  token: string,
  secret: Uint8Array,
): Promise<VerifiedSchoolGate | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: SCHOOL_GATE_JWT_ISS,
      algorithms: ['HS256'],
    });
    if (Number(payload.v) !== 1) return null;
    const schoolId = typeof payload.sch === 'string' ? payload.sch.trim().toLowerCase() : '';
    const uid = typeof payload.uid === 'string' ? payload.uid : '';
    const raw = payload.scp;
    if (!schoolId || !uid) return null;
    const scopes = new Set<string>();
    if (Array.isArray(raw)) {
      for (const x of raw) {
        if (typeof x === 'string' && x) scopes.add(x);
      }
    }
    return { schoolId, uid, scopes };
  } catch {
    return null;
  }
}
