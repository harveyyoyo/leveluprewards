'use client';

import { useAppContext } from '@/components/AppProvider';
import { useFirebase } from '@/firebase';
import { canReadSchoolRoster } from '@/lib/hallOfFameAccess';

/** Gate class/student list reads so leftover custom tokens do not hit Firestore rules. */
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
  } = useAppContext();

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
