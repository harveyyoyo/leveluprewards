import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';
import { officeAuditSnapshot, writeOfficeAuditEntry } from '@/lib/office/officeAuditLog';
import { isOfficeFeatureEnabled } from '@/lib/office/officeTerminology';
import type { OfficeSettings } from '@/lib/office/types';

export const OFFICE_SETTINGS_DOC_ID = 'config';

export function officeSettingsDocRef(firestore: Firestore, schoolId: string) {
  return doc(firestore, 'schools', schoolId.trim().toLowerCase(), 'officeSettings', OFFICE_SETTINGS_DOC_ID);
}

export type OfficeSettingsPatch = Partial<
  Pick<
    OfficeSettings,
    'defaultActiveTerm' | 'statementSchoolName' | 'configuredTerms' | 'useMarksTerminology' | 'features'
  >
>;

export async function saveOfficeSettings(
  firestore: Firestore,
  schoolId: string,
  patch: OfficeSettingsPatch,
  updatedBy?: string | null,
): Promise<void> {
  const ref = officeSettingsDocRef(firestore, schoolId);
  const beforeSnap = await getDoc(ref);
  const before = beforeSnap.exists() ? (beforeSnap.data() as OfficeSettings) : null;
  const next: OfficeSettings = {
    ...(before ?? { updatedAt: 0 }),
    ...patch,
    updatedAt: Date.now(),
    updatedBy: updatedBy?.trim() || null,
  };
  await setDoc(ref, next, { merge: true });
  if (isOfficeFeatureEnabled(before, 'auditLog')) {
    void writeOfficeAuditEntry(firestore, schoolId, {
      entityType: 'officeSettings',
      entityId: OFFICE_SETTINGS_DOC_ID,
      action: before ? 'update' : 'create',
      summary: 'Office school settings saved',
      before: before ? officeAuditSnapshot(before as unknown as Record<string, unknown>) : null,
      after: officeAuditSnapshot(next as unknown as Record<string, unknown>),
      changedBy: updatedBy,
    });
  }
}
