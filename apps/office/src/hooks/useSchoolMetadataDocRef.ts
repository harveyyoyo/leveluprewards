import { doc } from 'firebase/firestore';
import { useFirebase, useMemoFirebase } from '@/firebase';
import { useOfficeAuth } from '@/components/providers/OfficeAuthProvider';
import { schoolPublicDocRef } from '@/lib/schoolPublic';

/**
 * Main `schools/{id}` for staff; `schoolPublic/{id}` for students (portal-safe fields only).
 */
export function useSchoolMetadataDocRef() {
  const { firestore } = useFirebase();
  const { schoolId, loginState } = useOfficeAuth();
  const isStaff =
    loginState === 'admin' ||
    loginState === 'developer' ||
    loginState === 'office';
  return useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    const sid = schoolId.trim().toLowerCase();
    if (isStaff) return doc(firestore, 'schools', sid);
    return schoolPublicDocRef(firestore, sid);
  }, [firestore, schoolId, isStaff]);
}
