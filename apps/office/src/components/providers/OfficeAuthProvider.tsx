'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, getDoc, getDocFromServer, type DocumentReference, type DocumentData, type DocumentSnapshot } from 'firebase/firestore';
import { getReadableErrorMessage } from '@/lib/errorMessage';
import { loginErr, loginOk, type LoginResult } from '@/lib/loginResult';
import { isPublicSampleSchoolId } from '@/lib/sampleSchools';
import {
  syncFirebaseSessionCookie,
  syncSchoolGateCookie,
  clearFirebaseSessionCookieSync,
  clearSchoolGateCookie,
} from '@/lib/auth/syncFirebaseSessionCookie';
import { verifyAdminPasscodeLogin } from '@/lib/adminPasscodeLogin';
import { verifyStaffDeskLogin } from '@/lib/staffDeskLogin';
import { schoolPortalHref } from '@/lib/officePublicUrl';

export type OfficeLoginState = 'loggedOut' | 'developer' | 'admin' | 'office';

/** Alias for shared auth helpers copied from the rewards app. */
export type LoginState = OfficeLoginState;

const ROLE_DOC_RESTORE_TIMEOUT_MS = 8_000;

async function getRoleDocForSessionRestore(
  roleRef: DocumentReference<DocumentData>,
): Promise<DocumentSnapshot<DocumentData>> {
  const readCached = () => getDoc(roleRef);
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return readCached();
  }
  try {
    const fromServer = getDocFromServer(roleRef);
    const timedOut = new Promise<null>((resolve) => {
      window.setTimeout(() => resolve(null), ROLE_DOC_RESTORE_TIMEOUT_MS);
    });
    const winner = await Promise.race([fromServer.then((d) => d as DocumentSnapshot<DocumentData> | null), timedOut]);
    if (winner) return winner;
    return readCached();
  } catch {
    return readCached();
  }
}

export type OfficeLogoutOptions = {
  reason?: 'idle-timeout';
};

interface OfficeAuthContextType {
  isInitialized: boolean;
  loginState: OfficeLoginState;
  isAdmin: boolean;
  isOffice: boolean;
  userName: string | null;
  userId: string | null;
  schoolId: string | null;
  login: (
    type: 'admin' | 'office',
    credentials: { schoolId: string; passcode?: string; username?: string },
  ) => Promise<LoginResult>;
  logout: (options?: OfficeLogoutOptions) => void;
}

const OfficeAuthContext = createContext<OfficeAuthContextType | null>(null);

export function OfficeAuthProvider({ children }: { children: React.ReactNode }) {
  const { auth, firestore, functions } = useFirebase();
  const router = useRouter();
  const [isInitialized, setIsInitialized] = useState(false);
  const [loginState, setLoginState] = useState<OfficeLoginState>('loggedOut');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOffice, setIsOffice] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  const clearLocalSession = useCallback(() => {
    localStorage.removeItem('loginState');
    localStorage.removeItem('schoolId');
    localStorage.removeItem('userName');
    setLoginState('loggedOut');
    setSchoolId(null);
    setUserName(null);
    setUserId(null);
    setIsAdmin(false);
    setIsOffice(false);
  }, []);

  const logout = useCallback(
    (options?: OfficeLogoutOptions) => {
      void clearFirebaseSessionCookieSync();
      void clearSchoolGateCookie();
      clearLocalSession();
      if (options?.reason === 'idle-timeout') {
        sessionStorage.setItem('office-logout-reason', 'idle-timeout');
      }
      router.replace('/office-bootstrap');
    },
    [clearLocalSession, router],
  );

  useEffect(() => {
    if (!auth || !firestore) return;

    const restore = async () => {
      const savedState = localStorage.getItem('loginState') as OfficeLoginState | null;
      const savedSchoolId = localStorage.getItem('schoolId')?.trim().toLowerCase() || null;
      const savedName = localStorage.getItem('userName');

      if (!auth.currentUser) {
        setIsInitialized(true);
        return;
      }

      if (savedState === 'developer') {
        setLoginState('developer');
        setIsAdmin(true);
        setIsOffice(false);
        setUserName(savedName || 'Developer');
        setUserId(auth.currentUser.uid);
        if (savedSchoolId) setSchoolId(savedSchoolId);
      } else if (savedState === 'admin' && savedSchoolId) {
        try {
          const adminRef = doc(firestore, 'schools', savedSchoolId, 'roles_admin', auth.currentUser.uid);
          const adminDoc = await getRoleDocForSessionRestore(adminRef);
          if (adminDoc.exists() && adminDoc.data().role === 'admin') {
            setLoginState('admin');
            setSchoolId(savedSchoolId);
            setIsAdmin(true);
            setIsOffice(false);
            setUserName(savedName || 'Admin');
            setUserId(auth.currentUser.uid);
          } else {
            clearLocalSession();
          }
        } catch {
          clearLocalSession();
        }
      } else if (savedState === 'office' && savedSchoolId) {
        try {
          const officeRef = doc(firestore, 'schools', savedSchoolId, 'roles_office', auth.currentUser.uid);
          const officeDoc = await getRoleDocForSessionRestore(officeRef);
          if (officeDoc.exists() && officeDoc.data().role === 'office') {
            setLoginState('office');
            setSchoolId(savedSchoolId);
            setIsAdmin(false);
            setIsOffice(true);
            setUserName(savedName || 'Office staff');
            setUserId(auth.currentUser.uid);
          } else {
            clearLocalSession();
          }
        } catch {
          clearLocalSession();
        }
      }

      setIsInitialized(true);
    };

    const unsub = auth.onAuthStateChanged(() => {
      void restore();
    });
    void restore();

    return () => unsub();
  }, [auth, firestore, clearLocalSession]);

  const login = useCallback(
    async (
      type: 'admin' | 'office',
      credentials: { schoolId: string; passcode?: string; username?: string },
    ): Promise<LoginResult> => {
      if (!auth?.currentUser || !firestore || !functions) {
        return loginErr('No Firebase session yet. Refresh the page and try again.');
      }

      const lowerSchoolId = credentials.schoolId.trim().toLowerCase();

      if (type === 'admin') {
        try {
          const result = await verifyAdminPasscodeLogin(auth, functions, {
            schoolId: lowerSchoolId,
            passcode: credentials.passcode || '',
          });
          if (!result.ok) return loginErr(result.message);

          const adminRef = doc(firestore, 'schools', lowerSchoolId, 'roles_admin', auth.currentUser.uid);
          const adminDoc = await getDoc(adminRef);
          if (!adminDoc.exists()) {
            return loginErr('Admin role not found for this account.');
          }

          await syncSchoolGateCookie(auth, lowerSchoolId);
          setSchoolId(lowerSchoolId);
          setLoginState('admin');
          setIsAdmin(true);
          setIsOffice(false);
          setUserName('Admin');
          setUserId(auth.currentUser.uid);
          localStorage.setItem('loginState', 'admin');
          localStorage.setItem('schoolId', lowerSchoolId);
          localStorage.setItem('userName', 'Admin');
          return loginOk();
        } catch (e) {
          return loginErr(getReadableErrorMessage(e, 'Admin sign-in failed.'));
        }
      }

      if (type === 'office') {
        const username = credentials.username?.trim();
        if (!username) return loginErr('Enter your office username.');

        try {
          const serverData = await verifyStaffDeskLogin(auth, functions, {
            schoolId: lowerSchoolId,
            username,
            passcode: credentials.passcode || '',
            role: 'office',
          });

          const officeRef = doc(firestore, 'schools', lowerSchoolId, 'roles_office', auth.currentUser.uid);
          const roleDoc = await getDoc(officeRef);
          if (!roleDoc.exists() && !isPublicSampleSchoolId(lowerSchoolId)) {
            return loginErr('Office role not found for this account.');
          }

          await syncSchoolGateCookie(auth, lowerSchoolId);
          const displayName =
            (typeof serverData?.displayName === 'string' && serverData.displayName.trim()) || username;

          setSchoolId(lowerSchoolId);
          setLoginState('office');
          setIsAdmin(false);
          setIsOffice(true);
          setUserName(displayName);
          setUserId(auth.currentUser.uid);
          localStorage.setItem('loginState', 'office');
          localStorage.setItem('schoolId', lowerSchoolId);
          localStorage.setItem('userName', displayName);
          return loginOk();
        } catch (e) {
          return loginErr(getReadableErrorMessage(e, 'Office sign-in failed.'));
        }
      }

      return loginErr('Unsupported sign-in type.');
    },
    [auth, firestore, functions],
  );

  const value = useMemo(
    () => ({
      isInitialized,
      loginState,
      isAdmin,
      isOffice,
      userName,
      userId,
      schoolId,
      login,
      logout,
    }),
    [isInitialized, loginState, isAdmin, isOffice, userName, userId, schoolId, login, logout],
  );

  return <OfficeAuthContext.Provider value={value}>{children}</OfficeAuthContext.Provider>;
}

export function useOfficeAuth() {
  const ctx = useContext(OfficeAuthContext);
  if (!ctx) throw new Error('useOfficeAuth must be used within OfficeAuthProvider');
  return ctx;
}

/** Compatibility shim for copied office components that still call useAppContext. */
export function useAppContext() {
  const auth = useOfficeAuth();
  return {
    ...auth,
    isInitialized: auth.isInitialized,
    isUserLoading: !auth.isInitialized,
    isTeacher: false,
    isSecretary: false,
    isPrizeClerk: false,
    isReports: false,
    isLibrarian: false,
    isHouseCoordinator: false,
    teacherDocId: null,
    syncStatus: 'synced' as const,
    login: auth.login as OfficeAuthContextType['login'] & ((type: string, creds: unknown) => Promise<LoginResult>),
    startDeveloperSupportSession: async () => false,
    clearSchoolChooserSession: () => {},
    setUserName: () => {},
    isKioskLocked: false,
    setIsKioskLocked: () => {},
  };
}
