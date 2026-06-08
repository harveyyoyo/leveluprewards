'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAppContext } from '@/components/AppProvider';
import { useFirebase } from '@/firebase';
import { canBypassSchoolAdminPasscode, loginSchoolAdmin } from '@/lib/adminGoogleAccess';
import { refreshGoogleIdToken } from '@/lib/google/googleAuthSession';

type UseAdminGooglePasscodeBypassOptions = {
  schoolId: string | null | undefined;
  /** When false, skips auto-login (e.g. while a passcode dialog is open). Default true. */
  autoLogin?: boolean;
  onSuccess?: () => void;
  onError?: (message: string) => void;
};

/**
 * Google sign-in can open school admin without a passcode when the server confirms allowlist access.
 * Auto-login only runs for accounts that can bypass (allowlisted developer Google accounts).
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
      // ID token can briefly omit Google identities right after popup/redirect link.
      await refreshGoogleIdToken(user);
      let result = await loginSchoolAdmin(login, user, sid, '');
      if (!result.ok) {
        await refreshGoogleIdToken(user);
        result = await loginSchoolAdmin(login, user, sid, '');
      }
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
    void loginAsAdminViaGoogle().then((ok) => {
      attemptedRef.current = true;
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
