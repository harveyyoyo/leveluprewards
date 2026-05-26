'use client';

import { OfficeSettingsView } from '@/components/office/OfficeSettingsView';
import { useAppContext } from '@/components/AppProvider';
import { useDoc, useFirestore } from '@/firebase';
import { useSchoolMetadataDocRef } from '@/hooks/useSchoolMetadataDocRef';

export default function OfficeSettingsPage() {
  const { schoolId } = useAppContext();
  const firestore = useFirestore();
  const schoolDocRef = useSchoolMetadataDocRef();
  const { data: schoolMeta } = useDoc<{ name?: string }>(schoolDocRef);

  if (!schoolId || !firestore) return null;

  return (
    <OfficeSettingsView schoolId={schoolId} schoolName={schoolMeta?.name} />
  );
}
