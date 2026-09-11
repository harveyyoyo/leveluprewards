'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { useFirebase } from '@/firebase';
import { canReadSchoolRoster } from '@/lib/hallOfFameAccess';

/** Gate private school-doc / roster reads so leftover custom tokens do not hit Firestore rules. */
export function useCanReadSchoolRoster() {
  const { auth } = useFirebase();
  const {
    loginState,
    isAdmin,
    isTeacher,
    isPrizeClerk,
    isSecretary,
    isReports,
    isLibrarian,
    isHouseCoordinator,
    isOffice,
  } = useAuth();

  return canReadSchoolRoster({
    loginState,
    isAdmin,
    isTeacher,
    isPrizeClerk,
    isSecretary,
    isReports,
    isLibrarian,
    isHouseCoordinator,
    isOffice,
    email: auth?.currentUser?.email,
  });
}

export const useCanReadPrivateSchoolDocument = useCanReadSchoolRoster;
