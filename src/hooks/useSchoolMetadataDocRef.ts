import { doc } from 'firebase/firestore';
import { useFirebase, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/components/providers/AuthProvider';
import { schoolPublicDocRef } from '@/lib/schoolPublic';

/**
 * Main `schools/{id}` for staff; `schoolPublic/{id}` for students (portal-safe fields only).
 */
export function useSchoolMetadataDocRef() {
  const { firestore } = useFirebase();
  const { schoolId, loginState } = useAuth();
  return useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    const sid = schoolId.trim().toLowerCase();
    if (loginState === 'student') return schoolPublicDocRef(firestore, sid);
    return doc(firestore, 'schools', sid);
  }, [firestore, schoolId, loginState]);
}
