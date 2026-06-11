import { addDoc, collection, type Firestore } from 'firebase/firestore';
import type { OfficeAuditAction, OfficeAuditEntityType } from '@/lib/office/types';

export type WriteOfficeAuditParams = {
  entityType: OfficeAuditEntityType;
  entityId: string;
  action: OfficeAuditAction;
  summary: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  changedBy?: string | null;
  changedAt?: number;
};

/** Append-only audit row under `schools/{schoolId}/officeAuditLog`. Never throws. */
export async function writeOfficeAuditEntry(
  firestore: Firestore,
  schoolId: string,
  params: WriteOfficeAuditParams,
): Promise<string | null> {
  const sid = schoolId.trim().toLowerCase();
  if (!sid) return null;
  try {
    const ref = await addDoc(collection(firestore, 'schools', sid, 'officeAuditLog'), {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      summary: params.summary.trim() || `${params.action} ${params.entityType}`,
      before: params.before ?? null,
      after: params.after ?? null,
      changedBy: params.changedBy?.trim() || null,
      changedAt: params.changedAt ?? Date.now(),
    });
    return ref.id;
  } catch {
    return null;
  }
}

/** Shallow snapshot for audit diffs — strips undefined keys. */
export function officeAuditSnapshot<T extends Record<string, unknown>>(value: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    if (val !== undefined) out[key] = val;
  }
  return out;
}
