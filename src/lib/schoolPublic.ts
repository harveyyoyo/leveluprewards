import type { Firestore } from 'firebase/firestore';
import { doc } from 'firebase/firestore';

/** Client-visible school metadata (no passcodes or other secrets). */
export const SCHOOL_PUBLIC_COLLECTION = 'schoolPublic';

export function schoolPublicDocRef(db: Firestore, schoolId: string) {
  return doc(db, SCHOOL_PUBLIC_COLLECTION, schoolId.trim().toLowerCase());
}

const PUBLIC_FIELD_KEYS = ['name', 'logoUrl', 'plan', 'featureOverrides', 'appSettings'] as const;

/**
 * Build the `schoolPublic` document from the main `schools/{id}` fields.
 * Never copies passcode or other sensitive keys.
 */
export function mainSchoolDocToPublicPayload(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {
    active: true,
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
  };
  for (const key of PUBLIC_FIELD_KEYS) {
    if (key in data) out[key] = data[key];
  }
  return out;
}

/** Partial merge for `schoolPublic` after a targeted `updateDoc` on `schools`. */
export function schoolPublicPatchFromSchoolUpdates(
  updates: Record<string, unknown>,
): Record<string, unknown> | null {
  const patch: Record<string, unknown> = { updatedAt: Date.now(), active: true };
  let any = false;
  for (const key of PUBLIC_FIELD_KEYS) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      patch[key] = updates[key];
      any = true;
    }
  }
  return any ? patch : null;
}
