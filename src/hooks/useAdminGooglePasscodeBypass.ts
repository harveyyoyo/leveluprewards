'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAppContext } from '@/components/AppProvider';
import { useFirebase } from '@/firebase';
import { canBypassSchoolAdminPasscode, loginSchoolAdmin } from '@/lib/adminGoogleAccess';

type UseAdminGooglePasscodeBypassOptions = {
  schoolId: string | null | undefined;
  /** When false, skips auto-login (e.g. while a passcode dialog is open). Default true. */
  autoLogin?: boolean;
  onSuccess?: () => void;
  onError?: (message: string) => void;
};

/**
 * Google sign-in can open school admin without a passcode when the server confirms access.
 * Auto-login only runs for accounts that can bypass (signed in with Google).
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
  const [googleAutoLoginExhausted, setGoogleAutoLoginExhausted] = useState(false);
  const attemptedRef = useRef(false);

  const canBypassAdminPasscode = canBypassSchoolAdminPasscode(user);

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
  }, [canBypassAdminPasscode, login, onError, onSuccess, schoolId, user]);

  useEffect(() => {
    if (!autoLogin || attemptedRef.current) return;
    if (!isInitialized || isUserLoading || isAdmin || !schoolId || !canBypassAdminPasscode) return;
    attemptedRef.current = true;
    void loginAsAdminViaGoogle().then((ok) => {
      if (!ok) setGoogleAutoLoginExhausted(true);
    });
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
    googleAutoLoginExhausted,
    loginAsAdminViaGoogle,
  };
}
