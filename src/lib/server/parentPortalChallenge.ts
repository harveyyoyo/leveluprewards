import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { getAuthGateSecret } from '@/lib/auth/schoolGateCookie';

const CODE_LIFETIME_MS = 10 * 60_000;
const RESEND_DELAY_MS = 60_000;
const REQUEST_WINDOW_MS = 60 * 60_000;
const MAX_REQUESTS = 5;
const MAX_ATTEMPTS = 5;

function challengeRef(db: Firestore, schoolId: string, studentId: string) {
  return db.collection('schools').doc(schoolId).collection('secrets').doc(`parentLogin_${studentId}`);
}

function codeDigest(challengeId: string, code: string): Buffer {
  const secret = getAuthGateSecret();
  if (!secret) throw new Error('Parent portal sessions are not configured on this server.');
  return createHmac('sha256', secret).update(`${challengeId}:${code}`).digest();
}

/** Queue the code and persist its verifier atomically. Never return the code to the browser. */
export async function requestParentPortalCode(db: Firestore, schoolId: string, studentId: string, email: string) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const challengeId = randomUUID();
  const digest = codeDigest(challengeId, code).toString('hex');
  const now = Date.now();
  const ref = challengeRef(db, schoolId, studentId);
  const mailRef = db.collection('mail').doc();
  return db.runTransaction(async (tx) => {
    const previous = (await tx.get(ref)).data();
    const inWindow = previous && now - Number(previous.windowStartedAt) < REQUEST_WINDOW_MS;
    const requests = inWindow ? Number(previous.requests || 0) : 0;
    if (previous && now - Number(previous.requestedAt) < RESEND_DELAY_MS) {
      return { error: 'Please wait a minute before requesting another code.' };
    }
    if (requests >= MAX_REQUESTS) return { error: 'Too many code requests. Please try again in an hour.' };
    tx.set(ref, {
      challengeId, digest, email, attempts: 0, expiresAt: now + CODE_LIFETIME_MS,
      requestedAt: now, windowStartedAt: inWindow ? previous.windowStartedAt : now, requests: requests + 1,
    });
    tx.set(mailRef, {
      to: email,
      message: {
        subject: 'Your levelUp EDU parent sign-in code',
        text: `Your sign-in code is ${code}. It expires in 10 minutes and can only be used once. If you did not request this code, you can ignore this email.`,
      },
      schoolId, studentId, createdAt: new Date(now),
    });
    return { challengeId };
  });
}

/** Attempts and consumption are transactional, so a code cannot be replayed concurrently. */
export async function consumeParentPortalCode(
  db: Firestore, schoolId: string, studentId: string, email: string, challengeId: string, code: string,
): Promise<boolean> {
  const expected = codeDigest(challengeId, code);
  const ref = challengeRef(db, schoolId, studentId);
  return db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data();
    if (!data || data.challengeId !== challengeId || data.email !== email || data.consumed === true ||
        Number(data.expiresAt) <= Date.now() || Number(data.attempts) >= MAX_ATTEMPTS) return false;
    const stored = Buffer.from(String(data.digest || ''), 'hex');
    const matches = stored.length === expected.length && timingSafeEqual(stored, expected);
    tx.update(ref, { attempts: Number(data.attempts || 0) + 1, ...(matches ? { consumed: true, digest: '' } : {}) });
    return matches;
  });
}
