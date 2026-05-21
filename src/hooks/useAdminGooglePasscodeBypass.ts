'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAppContext } from '@/components/AppProvider';
import { useFirebase } from '@/firebase';
import { isAllowedAdminGoogleUser, loginSchoolAdmin } from '@/lib/adminGoogleAccess';

type UseAdminGooglePasscodeBypassOptions = {
  schoolId: string | null | undefined;
  /** When false, skips auto-login (e.g. while a passcode dialog is open). Default true. */
  autoLogin?: boolean;
  onSuccess?: () => void;
  onError?: (message: string) => void;
};

/**
 * Auto-provisions school admin for allowlisted Google accounts (no admin passcode).
 */
export function useAdminGooglePasscodeBypass({
  schoolId,
  autoLogin = true,
  onSuccess,
  onError,
}: UseAdminGooglePasscodeBypassOptions) {
  const { login, isAdmin, isInitialized } = useAppContext();
  const { user, isUserLoading } = useFirebase();
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false);
  const attemptedRef = useRef(false);

  const canBypassAdminPasscode = isAllowedAdminGoogleUser(user);

  const loginAsAdminViaGoogle = useCallback(async (): Promise<boolean> => {
    const sid = schoolId?.trim().toLowerCase();
    if (!sid || !canBypassAdminPasscode) return false;
    setIsAutoLoggingIn(true);
    try {
      const result = await loginSchoolAdmin(login, user, sid, '');
      if (!result.ok) {
        onError?.(result.message);
        return false;
      }
      onSuccess?.();
      return true;
    } finally {
      setIsAutoLoggingIn(false);
    }
  }, [canBypassAdminPasscode, login, onError, onSuccess, schoolId]);

  useEffect(() => {
    if (!autoLogin || attemptedRef.current) return;
    if (!isInitialized || isUserLoading || isAdmin || !schoolId || !canBypassAdminPasscode) return;
    attemptedRef.current = true;
    void loginAsAdminViaGoogle();
  }, [
    autoLogin,
    canBypassAdminPasscode,
    isAdmin,
    isInitialized,
    isUserLoading,
    loginAsAdminViaGoogle,
    schoolId,
  ]);

  return {
    canBypassAdminPasscode,
    isAutoLoggingIn,
    loginAsAdminViaGoogle,
  };
}
