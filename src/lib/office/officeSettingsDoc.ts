import { doc, setDoc, type Firestore } from 'firebase/firestore';
import type { OfficeSettings } from '@/lib/office/types';

export const OFFICE_SETTINGS_DOC_ID = 'config';

export function officeSettingsDocRef(firestore: Firestore, schoolId: string) {
  return doc(firestore, 'schools', schoolId.trim().toLowerCase(), 'officeSettings', OFFICE_SETTINGS_DOC_ID);
}

export async function saveOfficeSettings(
  firestore: Firestore,
  schoolId: string,
  patch: Partial<Pick<OfficeSettings, 'defaultActiveTerm' | 'statementSchoolName' | 'configuredTerms'>>,
  updatedBy?: string | null,
): Promise<void> {
  const ref = officeSettingsDocRef(firestore, schoolId);
  await setDoc(
    ref,
    {
      ...patch,
      updatedAt: Date.now(),
      updatedBy: updatedBy?.trim() || null,
    },
    { merge: true },
  );
}
