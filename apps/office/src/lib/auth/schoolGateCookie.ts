/**
 * HttpOnly cookie: signed HS256 JWT with school-scoped access flags (verified in middleware).
 */
export const SCHOOL_GATE_COOKIE_NAME = 'edu_school_gate';

export const SCHOOL_GATE_JWT_ISS = 'levelup:school-gate';

/** HS256 secret for school gate JWT; when unset or too short, gate layer is skipped. */
export function getAuthGateSecret(): Uint8Array | null {
  const s = process.env.AUTH_GATE_SIGNING_SECRET?.trim();
  if (!s || s.length < 32) return null;
  return new TextEncoder().encode(s);
}
