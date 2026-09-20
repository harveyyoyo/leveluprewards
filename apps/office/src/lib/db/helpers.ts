import type { Student } from '../types';
import type { DocumentData } from 'firebase/firestore';

// -------------------------------------------------------------------------
// Helper: remove undefined values from an object before writing to Firestore.
// The return type is `DocumentData` (i.e. `{ [field: string]: any }`) because
// that's what `setDoc` / `updateDoc` / `transaction.update` expect — using a
// stricter `Record<string, unknown>` here breaks those call sites.
// -------------------------------------------------------------------------
/** Best-effort "last changed" time for roster sorting (legacy rows may only have createdAt). */
export function studentLastChangedAt(student: Pick<Student, 'updatedAt' | 'createdAt'>): number {
  return student.updatedAt ?? student.createdAt ?? 0;
}

export const removeUndefined = <T extends Record<string, unknown>>(obj: T): DocumentData => {
  const newObj: DocumentData = {};
  Object.keys(obj).forEach(key => {
    const value = (obj as Record<string, unknown>)[key];
    if (value !== undefined) {
      newObj[key] = value;
    }
  });
  return newObj;
};

/**
 * Recursively strips `undefined` (Firestore rejects undefined at any depth).
 * Preserves `null`, primitives, `Date`, and non-plain objects (e.g. FieldValue).
 * Arrays: omits `undefined` entries and cleans nested structures.
 */
export function removeUndefinedDeep(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (value instanceof Date) {
    return value;
  }
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (const item of value) {
      if (item === undefined) continue;
      const cleaned = removeUndefinedDeep(item);
      if (cleaned !== undefined) {
        out.push(cleaned);
      }
    }
    return out;
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== null && proto !== Object.prototype) {
    return value;
  }
  const out: DocumentData = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const cleaned = removeUndefinedDeep(v);
    if (cleaned !== undefined) {
      out[k] = cleaned;
    }
  }
  return out;
}
