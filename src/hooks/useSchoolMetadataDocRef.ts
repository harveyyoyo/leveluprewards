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
  const isStaff =
    loginState === 'admin' ||
    loginState === 'developer' ||
    loginState === 'teacher' ||
    loginState === 'secretary' ||
    loginState === 'prizeClerk' ||
    loginState === 'reports' ||
    loginState === 'librarian' ||
    loginState === 'office' ||
    loginState === 'houseCoordinator';
  return useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    const sid = schoolId.trim().toLowerCase();
    if (isStaff) return doc(firestore, 'schools', sid);
    return schoolPublicDocRef(firestore, sid);
  }, [firestore, schoolId, isStaff]);
}
