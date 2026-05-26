'use client';

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useLayoutEffect,
    useCallback,
    useMemo,
    useRef,
} from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, getDocFromServer, onSnapshot, type DocumentReference, type DocumentData, type DocumentSnapshot } from 'firebase/firestore';
import { schoolPublicDocRef } from '@/lib/schoolPublic';
import { getReadableErrorMessage } from '@/lib/errorMessage';
import { loginErr, loginOk, messageFromVerifySchoolAccessError, type LoginResult } from '@/lib/loginResult';
import { isPublicSampleSchoolId } from '@/lib/sampleSchools';
import { APP_NAME } from '@/lib/appBranding';
import {
    syncFirebaseSessionCookie,
    syncSchoolGateCookie,
    clearFirebaseSessionCookieSync,
    clearSchoolGateCookie,
} from '@/lib/auth/syncFirebaseSessionCookie';
import { sanitizeInternalNextPath } from '@/lib/auth/internalNextRedirect';
import { canBypassSchoolAdminPasscode } from '@/lib/adminGoogleAccess';
import { isAllowedDeveloperGoogleUser } from '@/lib/developerAccess';
import { isStudentKioskRoute } from '@/lib/studentKioskRoute';
import { verifyStaffDeskLogin } from '@/lib/staffDeskLogin';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';
export type LoginState =
    | 'loggedOut'
    | 'school'
    | 'developer'
    | 'student'
    | 'teacher'
    | 'admin'
    | 'secretary'
    | 'prizeClerk'
    | 'reports'
    | 'librarian'
    | 'office'
    | 'houseCoordinator';

const ROLE_DOC_RESTORE_TIMEOUT_MS = 8_000;

/** Prefer server read on restore; offline or transient errors fall back to persistent local cache. */
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
        console.warn('AuthProvider: role doc server read timed out; using cache.');
        return readCached();
    } catch {
        return readCached();
    }
}

/** Optional navigation after ending a scoped session (default: staff -> portal, student -> kiosk). */
export type LogoutOptions = {
    staffNavigateTo?: 'portal' | 'teacher' | 'student';
    studentNavigateTo?: 'portal' | 'student';
};

interface AuthContextType {
    isInitialized: boolean;
    isUserLoading: boolean;
    loginState: LoginState;
    isAdmin: boolean;
    isTeacher: boolean;
    isSecretary: boolean;
    isPrizeClerk: boolean;
    isReports: boolean;
    isLibrarian: boolean;
    isOffice: boolean;
    isHouseCoordinator: boolean;
    userName: string | null;
    userId: string | null;
    teacherDocId: string | null;
    schoolId: string | null;
    syncStatus: SyncStatus;
    login: (
        type: LoginState,
        credentials: { schoolId?: string; passcode?: string; username?: string; teacherName?: string; teacherDocId?: string; staffRole?: 'secretary' | 'prizeClerk' | 'reports' | 'librarian' | 'office' | 'houseCoordinator'; }
    ) => Promise<LoginResult>;
    startDeveloperSupportSession: (schoolId: string) => Promise<boolean>;
    /** Clears school chooser session only (keeps Firebase / Google sign-in). Used by `/login?changeSchool=1`. */
    clearSchoolChooserSession: () => void;
    logout: (options?: LogoutOptions) => void;
    setUserName: (name: string | null) => void;
    isKioskLocked: boolean;
    setIsKioskLocked: (locked: boolean) => void;
    /** Student kiosk: Cloud Function has registered this browser for badge lookup. Always true when not in student mode. */
    studentKioskSessionEstablished: boolean;
    /** Student kiosk: last error from `enterSchoolKioskSession` (null when none or not applicable). */
    studentKioskSessionError: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const DEVELOPER_SUPPORT_SESSION_KEY = 'developerSupportSession';
const SESSION_SYNC_FAILED_EVENT = 'levelup:session-sync-failed';
const CALLABLE_TIMEOUT_MS = 25_000;

function withCallableTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error(message)), CALLABLE_TIMEOUT_MS);
        promise.then(
            (value) => {
                window.clearTimeout(timer);
                resolve(value);
            },
            (error) => {
                window.clearTimeout(timer);
                reject(error);
            },
        );
    });
}

function reportSessionSyncFailure(phase: 'firebase-session' | 'school-gate') {
    console.error(`Auth session sync failed during ${phase}.`);
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
        new CustomEvent(SESSION_SYNC_FAILED_EVENT, {
            detail: { phase },
        }),
    );
}

async function waitForReadableRole(
    roleRef: DocumentReference,
    expectedRole: string,
    options: { quick?: boolean } = {},
) {
    const attempts = options.quick ? 50 : 24;
    const fastDelay = options.quick ? 80 : 150;
    const slowDelay = options.quick ? 80 : 350;

    for (let i = 0; i < attempts; i++) {
        try {
            const roleDoc = await getDocFromServer(roleRef);
            const data = roleDoc.exists() ? roleDoc.data() : null;
            if (data?.role === expectedRole) {
                return data;
            }
        } catch {
            // Permission errors are expected for a moment while the role grant propagates.
        }
        await wait(i < 10 ? fastDelay : slowDelay);
    }

    return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [isMounted, setIsMounted] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [loginState, setLoginState] = useState<LoginState>('loggedOut');
    const [schoolId, setSchoolId] = useState<string | null>(null);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('syncing');
    const [isKioskLocked, setIsKioskLocked] = useState(false);
    const [studentKioskSessionEstablished, setStudentKioskSessionEstablished] = useState(true);
    const [studentKioskSessionError, setStudentKioskSessionError] = useState<string | null>(null);

    const [isAdmin, setIsAdmin] = useState(false);
    const [isTeacher, setIsTeacher] = useState(false);
    const [isSecretary, setIsSecretary] = useState(false);
    const [isPrizeClerk, setIsPrizeClerk] = useState(false);
    const [isReports, setIsReports] = useState(false);
    const [isLibrarian, setIsLibrarian] = useState(false);
    const [isOffice, setIsOffice] = useState(false);
    const [isHouseCoordinator, setIsHouseCoordinator] = useState(false);
    const [userName, setUserName] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [teacherDocId, setTeacherDocId] = useState<string | null>(null);

    const { isUserLoading, functions, firestore, auth } = useFirebase();
    const router = useRouter();

    const returnToSchoolSession = useCallback((sid: string) => {
        setSchoolId(sid);
        setLoginState('school');
        setIsAdmin(false);
        setIsTeacher(false);
        setIsSecretary(false);
        setIsPrizeClerk(false);
        setIsReports(false);
        setIsLibrarian(false);
        setIsOffice(false);
        setIsHouseCoordinator(false);
        setUserName(null);
        setTeacherDocId(null);
        localStorage.setItem('loginState', 'school');
        localStorage.setItem('schoolId', sid);
        localStorage.removeItem('userName');
        localStorage.removeItem('teacherDocId');
    }, []);

    const getEntryCodeFromUrl = useCallback(() => {
        if (typeof window === 'undefined') return '';
        const params = new URLSearchParams(window.location.search);
        return (params.get('kioskEntry') || params.get('entry') || '').trim();
    }, []);

    const establishStudentKioskSession = useCallback(async (sid: string) => {
        // Without a network path, Cloud Functions cannot register this device for badge lookup.
        // Still allow the student session so the kiosk UI works offline (lookups will fail until online).
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            return;
        }
        try {
            const enter = httpsCallable(functions, 'enterSchoolKioskSession');
            await enter({ schoolId: sid });
            return;
        } catch (err) {
            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                return;
            }
            const code = getEntryCodeFromUrl();
            if (!code) throw err;
            const verify = httpsCallable(functions, 'verifySchoolEntryCode');
            await verify({ schoolId: sid, code });
        }
    }, [functions, getEntryCodeFromUrl]);

    const logout = useCallback((options?: LogoutOptions) => {
        setIsAdmin(false);
        setIsTeacher(false);
        setIsSecretary(false);
        setIsPrizeClerk(false);
        setIsReports(false);
        setIsLibrarian(false);
        setIsOffice(false);
        setIsHouseCoordinator(false);
        setIsKioskLocked(false);
        setUserName(null);
        setTeacherDocId(null);
        localStorage.removeItem('userName');
        localStorage.removeItem('teacherDocId');

        if (loginState === 'developer') {
            const supportSessionActive =
                typeof window !== 'undefined' &&
                localStorage.getItem(DEVELOPER_SUPPORT_SESSION_KEY) === 'true' &&
                !!schoolId;

            setSchoolId(null);
            localStorage.removeItem('schoolId');
            localStorage.removeItem('userName');
            localStorage.removeItem('teacherDocId');
            localStorage.removeItem(DEVELOPER_SUPPORT_SESSION_KEY);

            if (supportSessionActive) {
                setLoginState('developer');
                setIsAdmin(true);
                setUserName('Developer');
                router.push('/developer');
                return;
            }

            localStorage.removeItem('loginState');
            setLoginState('loggedOut');
            setIsAdmin(false);
            clearFirebaseSessionCookieSync();
            router.push('/');
        } else if (
            loginState === 'admin' ||
            loginState === 'teacher' ||
            loginState === 'secretary' ||
            loginState === 'prizeClerk' ||
            loginState === 'reports' ||
            loginState === 'librarian' ||
            loginState === 'office' ||
            loginState === 'houseCoordinator'
        ) {
            // When leaving a privileged staff session, return to the school chooser (Portal),
            // not directly into student kiosk mode.
            localStorage.setItem('loginState', 'school');
            localStorage.removeItem(DEVELOPER_SUPPORT_SESSION_KEY);
            setLoginState('school');
            if (schoolId) {
                const dest =
                    options?.staffNavigateTo === 'teacher'
                        ? 'teacher'
                        : options?.staffNavigateTo === 'student'
                          ? 'student'
                          : 'portal';
                router.push(`/${schoolId}/${dest}`);
            } else {
                router.push('/login');
            }
        } else if (loginState === 'student' && schoolId) {
            returnToSchoolSession(schoolId);
            const dest = options?.studentNavigateTo === 'portal' ? 'portal' : 'student';
            router.push(`/${schoolId}/${dest}`);
        } else {
            clearFirebaseSessionCookieSync();
            localStorage.removeItem('loginState');
            localStorage.removeItem('schoolId');
            localStorage.removeItem(DEVELOPER_SUPPORT_SESSION_KEY);
            setLoginState('loggedOut');
            setSchoolId(null);
            router.push('/');
        }
    }, [loginState, returnToSchoolSession, router, schoolId]);

    const clearSchoolChooserSession = useCallback(() => {
        setIsAdmin(false);
        setIsTeacher(false);
        setIsSecretary(false);
        setIsPrizeClerk(false);
        setIsReports(false);
        setIsLibrarian(false);
        setIsOffice(false);
        setIsHouseCoordinator(false);
        setIsKioskLocked(false);
        setUserName(null);
        setUserId(auth.currentUser?.uid ?? null);
        setTeacherDocId(null);
        setSchoolId(null);
        setLoginState('loggedOut');
        localStorage.removeItem('loginState');
        localStorage.removeItem('schoolId');
        localStorage.removeItem('userName');
        localStorage.removeItem('teacherDocId');
        localStorage.removeItem(DEVELOPER_SUPPORT_SESSION_KEY);
        void clearSchoolGateCookie();
    }, [auth]);

    // Auto-logout logic moved to AppContextBridge in AppProvider.tsx to allow for configurable timeouts from SettingsProvider.

    useLayoutEffect(() => {
        setIsMounted(true);
    }, []);

    /** If client JS is slow or hydration stalls, do not block the shell forever. */
    useEffect(() => {
        const id = window.setTimeout(() => {
            setIsMounted((prev) => {
                if (!prev) {
                    console.warn('AuthProvider: mount failsafe fired; rendering app shell.');
                }
                return true;
            });
        }, 2_500);
        return () => window.clearTimeout(id);
    }, []);

    /** Covers slow Firebase bootstrap when restore effect cannot schedule its own failsafe yet. */
    useEffect(() => {
        if (!isMounted) return;
        const id = window.setTimeout(() => {
            setIsInitialized((prev) => {
                if (!prev) {
                    console.warn(
                        'AuthProvider: global init failsafe fired; unblocking portal and school routes.',
                    );
                }
                return true;
            });
        }, 20_000);
        return () => window.clearTimeout(id);
    }, [isMounted]);

    useEffect(() => {
        if (!isMounted || isUserLoading || !firestore || !auth) {
            return;
        }

        const bootTimeout = window.setTimeout(() => {
            console.warn(
                'AuthProvider: session restore exceeded failsafe time; allowing UI so login and navigation are not blocked.',
            );
            setIsInitialized(true);
        }, 18_000);

        const restore = async () => {
            try {
            const savedState = localStorage.getItem('loginState') as LoginState | null;
            const savedSchoolId = localStorage.getItem('schoolId');
            const savedName = localStorage.getItem('userName');
            const savedTeacherDocId = localStorage.getItem('teacherDocId');
            const savedDeveloperSupportSession = localStorage.getItem(DEVELOPER_SUPPORT_SESSION_KEY) === 'true';

            if (savedState && savedSchoolId) {
                setSchoolId(savedSchoolId);
                setUserName(savedName);
                if (savedTeacherDocId) setTeacherDocId(savedTeacherDocId);
                if (auth.currentUser) {
                    setUserId(auth.currentUser.uid);
                }

                if (savedState === 'developer') {
                    setLoginState('developer');
                    setIsTeacher(false);
                    setIsSecretary(false);
                    setIsPrizeClerk(false);
                    setIsReports(false);
                    setIsOffice(false);
                    setUserName(savedName || (savedDeveloperSupportSession ? 'Developer support' : 'Developer'));
                    if (auth.currentUser) {
                        setUserId(auth.currentUser.uid);
                        if (savedDeveloperSupportSession) {
                            try {
                                const adminRoleRef = doc(
                                    firestore,
                                    'schools',
                                    savedSchoolId,
                                    'roles_admin',
                                    auth.currentUser.uid,
                                );
                                const adminDoc = await getRoleDocForSessionRestore(adminRoleRef);
                                setIsAdmin(adminDoc.exists() && adminDoc.data().role === 'admin');
                            } catch {
                                setIsAdmin(false);
                            }
                        } else {
                            setIsAdmin(true);
                        }
                    } else {
                        setIsAdmin(!savedDeveloperSupportSession);
                    }
                } else if (savedState === 'school' || savedState === 'student') {
                    if (savedState === 'student') {
                        localStorage.setItem('loginState', 'school');
                    }
                    setLoginState('school');
                    setIsAdmin(false);
                    setIsTeacher(false);
                    setIsSecretary(false);
                    setIsPrizeClerk(false);
                    setIsReports(false);
                    setUserName(null);
                    setTeacherDocId(null);
                } else if (savedState === 'admin') {
                    setLoginState('admin');
                    if (auth.currentUser) {
                        try {
                            const adminRoleRef = doc(firestore, 'schools', savedSchoolId, 'roles_admin', auth.currentUser.uid);
                            const adminDoc = await getRoleDocForSessionRestore(adminRoleRef);
                            if (adminDoc.exists() && adminDoc.data().role === 'admin') {
                                setIsAdmin(true);
                                setIsTeacher(false);
                                setIsSecretary(false);
                                setIsPrizeClerk(false);
                            } else {
                                returnToSchoolSession(savedSchoolId);
                            }
                        } catch {
                            returnToSchoolSession(savedSchoolId);
                        }
                    } else {
                        returnToSchoolSession(savedSchoolId);
                    }
                } else if (savedState === 'teacher') {
                    setLoginState('teacher');
                    if (auth.currentUser) {
                        try {
                            const teacherRoleRef = doc(firestore, 'schools', savedSchoolId, 'roles_teacher', auth.currentUser.uid);
                            const roleDoc = await getRoleDocForSessionRestore(teacherRoleRef);
                            if (roleDoc.exists() && roleDoc.data().role === 'teacher') {
                                setIsTeacher(true);
                                setIsAdmin(false);
                                setIsSecretary(false);
                                setIsPrizeClerk(false);
                                const idFromDb = roleDoc.data().teacherId;
                                if (idFromDb) {
                                    setTeacherDocId(idFromDb);
                                    localStorage.setItem('teacherDocId', idFromDb);
                                }
                            } else {
                                returnToSchoolSession(savedSchoolId);
                            }
                        } catch {
                            returnToSchoolSession(savedSchoolId);
                        }
                    } else {
                        returnToSchoolSession(savedSchoolId);
                    }
                } else if (savedState === 'secretary') {
                    setLoginState('secretary');
                    if (auth.currentUser) {
                        try {
                            const ref = doc(firestore, 'schools', savedSchoolId, 'roles_secretary', auth.currentUser.uid);
                            const roleDoc = await getRoleDocForSessionRestore(ref);
                            if (roleDoc.exists() && roleDoc.data().role === 'secretary') {
                                setIsSecretary(true);
                                setIsAdmin(false);
                                setIsTeacher(false);
                                setIsPrizeClerk(false);
                            } else {
                                returnToSchoolSession(savedSchoolId);
                            }
                        } catch {
                            returnToSchoolSession(savedSchoolId);
                        }
                    } else {
                        returnToSchoolSession(savedSchoolId);
                    }
                } else if (
                    savedState === 'prizeClerk' ||
                    savedState === 'reports' ||
                    savedState === 'librarian' ||
                    savedState === 'office' ||
                    savedState === 'houseCoordinator'
                ) {
                    setLoginState(savedState);
                    if (auth.currentUser) {
                        try {
                            const roleCollection =
                                savedState === 'prizeClerk'
                                    ? 'roles_prizeClerk'
                                    : savedState === 'librarian'
                                      ? 'roles_librarian'
                                    : savedState === 'office'
                                      ? 'roles_office'
                                      : savedState === 'houseCoordinator'
                                        ? 'roles_houseCoordinator'
                                        : 'roles_reports';
                            const ref = doc(firestore, 'schools', savedSchoolId, roleCollection, auth.currentUser.uid);
                            const roleDoc = await getRoleDocForSessionRestore(ref);
                            if (roleDoc.exists() && roleDoc.data().role === savedState) {
                                setIsPrizeClerk(savedState === 'prizeClerk');
                                setIsReports(savedState === 'reports');
                                setIsLibrarian(savedState === 'librarian');
                                setIsOffice(savedState === 'office');
                                setIsHouseCoordinator(savedState === 'houseCoordinator');
                                setIsAdmin(false);
                                setIsTeacher(false);
                                setIsSecretary(false);
                            } else {
                                returnToSchoolSession(savedSchoolId);
                            }
                        } catch {
                            returnToSchoolSession(savedSchoolId);
                        }
                    } else {
                        returnToSchoolSession(savedSchoolId);
                    }
                } else {
                    setLoginState(savedState);
                    setIsAdmin(false);
                    setIsTeacher(false);
                    setIsSecretary(false);
                    setIsPrizeClerk(false);
                    setIsReports(false);
                }
            } else if (savedState === 'developer') {
                setLoginState('developer');
                setIsAdmin(true);
                setIsTeacher(false);
                setIsSecretary(false);
                setIsPrizeClerk(false);
                setIsReports(false);
                setUserName(savedName || 'Developer');
                if (auth.currentUser) {
                    setUserId(auth.currentUser.uid);
                }
            } else if (savedState) {
                const needsSchool = [
                    'student',
                    'school',
                    'teacher',
                    'admin',
                    'secretary',
                    'prizeClerk',
                    'reports',
                    'librarian',
                    'office',
                    'houseCoordinator',
                ].includes(savedState);
                if (needsSchool) {
                    localStorage.removeItem('loginState');
                    localStorage.removeItem('schoolId');
                    localStorage.removeItem('userName');
                    localStorage.removeItem('teacherDocId');
                    localStorage.removeItem(DEVELOPER_SUPPORT_SESSION_KEY);
                    setLoginState('loggedOut');
                    setSchoolId(null);
                    setUserName(null);
                    setTeacherDocId(null);
                    setIsAdmin(false);
                    setIsTeacher(false);
                    setIsSecretary(false);
                    setIsPrizeClerk(false);
                    setIsReports(false);
                    setIsLibrarian(false);
                    setIsOffice(false);
                    setIsHouseCoordinator(false);
                } else {
                    setLoginState(savedState);
                    setIsAdmin(false);
                    setIsTeacher(false);
                    setIsSecretary(false);
                    setIsPrizeClerk(false);
                    setIsReports(false);
                    setIsLibrarian(false);
                    setIsOffice(false);
                    setIsHouseCoordinator(false);
                }
            }
            } catch (e) {
                console.error('Auth session restore failed:', e);
            } finally {
                window.clearTimeout(bootTimeout);
                // Always unblock UI: effect cleanup can race with in-flight restore; skipping this left `isInitialized` false forever.
                setIsInitialized(true);
            }
        };

        void restore();
        return () => {
            window.clearTimeout(bootTimeout);
        };
    }, [isMounted, isUserLoading, firestore, auth, returnToSchoolSession]);

    /**
     * Mint HttpOnly Firebase session cookie whenever the app has an active (non-logged-out) session.
     * Edge middleware can then reject anonymous HTML navigations to school routes without this cookie.
     * After middleware redirects to `/login?...&next=`, sync here then hard-navigate to `next`.
     */
    useEffect(() => {
        if (
            !isInitialized ||
            isUserLoading ||
            loginState === 'loggedOut' ||
            loginState === 'developer' ||
            !auth?.currentUser
        ) {
            return;
        }
        let cancelled = false;
        void (async () => {
            const okFb = await syncFirebaseSessionCookie(auth);
            if (cancelled) return;
            if (!okFb) {
                reportSessionSyncFailure('firebase-session');
                return;
            }
            const sid = schoolId?.trim();
            if (sid) {
                const okSchoolGate = await syncSchoolGateCookie(auth, sid);
                if (cancelled) return;
                if (!okSchoolGate) {
                    reportSessionSyncFailure('school-gate');
                    return;
                }
            }
            if (cancelled) return;
            if (typeof window === 'undefined') return;
            if (window.location.pathname !== '/login') return;
            const params = new URLSearchParams(window.location.search);
            const next = params.get('next');
            if (!next) return;
            const schoolParam = (params.get('school') || schoolId || '').trim().toLowerCase();
            if (!schoolParam) return;
            const target = sanitizeInternalNextPath(next, schoolParam);
            if (!target) return;
            window.location.assign(target);
        })();
        return () => {
            cancelled = true;
        };
    }, [isInitialized, isUserLoading, loginState, auth, schoolId]);

    // Kiosk device token: `login('student')` registers the browser on the student route only.
    // School account stays `loginState === 'school'`; re-run on refresh while on /{school}/student.
    useEffect(() => {
        const onKioskRoute =
            typeof window !== 'undefined' &&
            isStudentKioskRoute(window.location.pathname, schoolId);

        if (loginState !== 'school' || !onKioskRoute) {
            setStudentKioskSessionEstablished(true);
            setStudentKioskSessionError(null);
            return;
        }
        setStudentKioskSessionEstablished(false);
        setStudentKioskSessionError(null);
        if (!isInitialized || !schoolId || !functions || !auth.currentUser) {
            return;
        }
        let cancelled = false;
        const sid = schoolId.trim().toLowerCase();
        void establishStudentKioskSession(sid)
            .then(() => {
                if (!cancelled) {
                    setStudentKioskSessionEstablished(true);
                    setStudentKioskSessionError(null);
                }
            })
            .catch((err) => {
                console.warn('enterSchoolKioskSession (kiosk route):', err);
                if (!cancelled) {
                    setStudentKioskSessionEstablished(false);
                    setStudentKioskSessionError(
                        getReadableErrorMessage(err, 'Could not prepare this device for student check-in.'),
                    );
                }
            });
        return () => {
            cancelled = true;
        };
    }, [isInitialized, loginState, schoolId, functions, auth?.currentUser, establishStudentKioskSession]);

    useEffect(() => {
        // This effect is not necessary anymore as the Cloud Function will handle role provisioning on login.
    }, []);

    useEffect(() => {
        if (!firestore || !schoolId) {
            if (loginState === 'school') {
                setSyncStatus('offline');
            } else {
                setSyncStatus('synced'); // Not in a school context, so consider it synced.
            }
            return;
        }

        const sid = schoolId.trim().toLowerCase();
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
        const metadataRef = isStaff
            ? doc(firestore, 'schools', sid)
            : schoolPublicDocRef(firestore, sid);
        const applySnapshot = (snapshot: { metadata: { fromCache: boolean } }) => {
            // Firestore marks cache reads as `fromCache` while reconnecting *and* when the browser is offline.
            // Only show "syncing" when we are online but still waiting for a fresh server read.
            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                setSyncStatus('offline');
                return;
            }
            const isFromCache = snapshot.metadata.fromCache;
            if (isFromCache) {
                setSyncStatus('syncing');
            } else {
                setSyncStatus('synced');
            }
        };

        const unsubscribe = onSnapshot(
            metadataRef,
            { includeMetadataChanges: true },
            applySnapshot,
            (err) => {
                console.error("Sync status listener failed:", err);
                setSyncStatus('error');
            }
        );

        const onBrowserOffline = () => setSyncStatus('offline');
        const onBrowserOnline = () => setSyncStatus('syncing');

        if (typeof window !== 'undefined') {
            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                setSyncStatus('offline');
            }
            window.addEventListener('offline', onBrowserOffline);
            window.addEventListener('online', onBrowserOnline);
        }

        return () => {
            unsubscribe();
            if (typeof window !== 'undefined') {
                window.removeEventListener('offline', onBrowserOffline);
                window.removeEventListener('online', onBrowserOnline);
            }
        };
    }, [firestore, schoolId, loginState]);

    const login = useCallback(
        async (
            type: LoginState,
            credentials: { schoolId?: string; passcode?: string; username?: string; teacherName?: string; teacherDocId?: string; staffRole?: 'secretary' | 'prizeClerk' | 'reports' | 'librarian' | 'office' | 'houseCoordinator'; }
        ): Promise<LoginResult> => {
            if (type === 'developer') {
                try {
                    let devPasscodeOk = false;
                    if (process.env.NODE_ENV === 'development' && credentials.passcode?.trim()) {
                        try {
                            const res = await fetch('/api/auth/dev-developer', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'same-origin',
                                body: JSON.stringify({ passcode: credentials.passcode.trim() }),
                            });
                            devPasscodeOk = res.ok;
                        } catch (e) {
                            console.error('Dev developer passcode check failed:', e);
                        }
                        if (!devPasscodeOk) {
                            return loginErr('Invalid developer passcode.');
                        }
                    } else if (!isAllowedDeveloperGoogleUser(auth.currentUser)) {
                        return loginErr(
                            'Sign in with an allowed Google account to access developer tools.',
                        );
                    }

                    // Listing `schools` in Firestore requires `isDeveloper()` (UID in appConfig/global.developerUids).
                    // addDeveloperMe merges the current Firebase user's UID into that allow-list.
                    let uid = auth.currentUser?.uid ?? null;
                    if (!uid) {
                        for (let i = 0; i < 50; i++) {
                            await new Promise((r) => setTimeout(r, 80));
                            uid = auth.currentUser?.uid ?? null;
                            if (uid) break;
                        }
                    }
                    if (!uid) {
                        console.error('Developer login: no Firebase signed-in user (anonymous auth should run first).');
                        return loginErr(
                            'No Firebase session yet. Refresh the page and try again.',
                        );
                    }
                    try {
                        const addDeveloperMe = httpsCallable(functions, 'addDeveloperMe');
                        await addDeveloperMe({});
                    } catch (e) {
                        console.error('addDeveloperMe failed:', e);
                        return loginErr(
                            getReadableErrorMessage(e, 'Could not finish developer sign-in. Check your connection and try again.'),
                        );
                    }
                    setLoginState('developer');
                    setIsAdmin(true);
                    setIsTeacher(false);
                    setIsSecretary(false);
                    setIsPrizeClerk(false);
                    setIsReports(false);
                    setUserName('Developer');
                    setUserId(uid);
                    localStorage.setItem('loginState', 'developer');
                    localStorage.setItem('userName', 'Developer');
                    localStorage.removeItem('schoolId');
                    localStorage.removeItem(DEVELOPER_SUPPORT_SESSION_KEY);
                    return loginOk();
                } catch (e) {
                    console.error("Developer login error", e);
                    return loginErr(getReadableErrorMessage(e, 'Developer sign-in failed. Check your connection and try again.'));
                }
            } else if (type === 'school' && credentials.schoolId) {
                const lowerSchoolId = credentials.schoolId.trim().toLowerCase();
                if (!auth.currentUser) {
                    console.error('School access login: no Firebase signed-in user (anonymous auth should run first).');
                    return loginErr(
                        'No Firebase session yet. Refresh the page and try again.',
                    );
                }
                try {
                    const verifyAccess = httpsCallable(functions, 'verifySchoolAccessPasscode');
                    await withCallableTimeout(
                        verifyAccess({
                            schoolId: lowerSchoolId,
                            passcode: credentials.passcode?.trim() || '',
                        }),
                        'School sign-in timed out. Check your connection and try again.',
                    );
                } catch (e) {
                    console.error('School access login failed', e);
                    const timedOut =
                        e instanceof Error &&
                        e.message === 'School sign-in timed out. Check your connection and try again.';
                    return loginErr(
                        timedOut
                            ? e.message
                            : messageFromVerifySchoolAccessError(e, 'Invalid School ID or passcode.'),
                    );
                }
                setSchoolId(lowerSchoolId);
                setLoginState('school');
                setIsAdmin(false);
                setIsTeacher(false);
                setIsSecretary(false);
                setIsPrizeClerk(false);
                setIsReports(false);
                setUserName(null);
                setTeacherDocId(null);
                localStorage.setItem('loginState', 'school');
                localStorage.setItem('schoolId', lowerSchoolId);
                localStorage.removeItem('userName');
                localStorage.removeItem('teacherDocId');
                return loginOk();
            } else if (type === 'student' && credentials.schoolId) {
                // Student/Public access can optionally require the school's access passcode
                // (for the initial "school sign-in" screen).
                const lowerSchoolId = credentials.schoolId.trim().toLowerCase();
                if (!auth.currentUser) {
                    console.error('Student login: no Firebase signed-in user (anonymous auth should run first).');
                    return loginErr(
                        'No Firebase session yet. Refresh the page and try again.',
                    );
                }
                try {
                    if (credentials.passcode && credentials.passcode.trim()) {
                        try {
                            const verifyAccess = httpsCallable(functions, 'verifySchoolAccessPasscode');
                            await verifyAccess({ schoolId: lowerSchoolId, passcode: credentials.passcode.trim() });
                        } catch (e) {
                            return loginErr(
                                messageFromVerifySchoolAccessError(e, 'Invalid school access passcode.'),
                            );
                        }
                    }
                    await establishStudentKioskSession(lowerSchoolId);
                } catch (e) {
                    console.error('Student login: could not create kiosk session', e);
                    return loginErr(
                        getReadableErrorMessage(e, 'Could not open student check-in. Check your connection and try again.'),
                    );
                }
                setSchoolId(lowerSchoolId);
                returnToSchoolSession(lowerSchoolId);
                return loginOk();
            } else if ((type === 'school' || type === 'admin') && credentials.schoolId && auth.currentUser) {
                const lowerSchoolId = credentials.schoolId.trim().toLowerCase();
                const passcodeTrimmed = (credentials.passcode ?? '').trim();
                const googleAdminBypass =
                    type === 'admin' && canBypassSchoolAdminPasscode(auth.currentUser) && passcodeTrimmed.length === 0;
                if (type === 'admin' && passcodeTrimmed.length === 0 && !googleAdminBypass) {
                    return loginErr('Enter the admin passcode to continue.');
                }
                try {
                    // 1. Call the function to set the role on the backend
                    const verify = httpsCallable(functions, 'verifySchoolPasscode');
                    await verify({
                        schoolId: lowerSchoolId,
                        passcode: passcodeTrimmed,
                    });

                    // 2. Poll the server to confirm the admin role is readable
                    const adminRoleRef = doc(firestore, 'schools', lowerSchoolId, 'roles_admin', auth.currentUser.uid);
                    const roleData = await waitForReadableRole(adminRoleRef, 'admin', {
                        quick: isPublicSampleSchoolId(lowerSchoolId),
                    });

                    if (!roleData) {
                        throw new Error("Could not confirm admin role after login. Your permissions might be out of sync. Please try again.");
                    }

                    // 3. Only now set the client state
                    setSchoolId(lowerSchoolId);
                    setLoginState('admin'); // normalize to admin
                    setIsAdmin(true);
                    setIsTeacher(false);
                    setIsSecretary(false);
                    setIsPrizeClerk(false);
                    setIsReports(false);
                    setUserName('Admin');
                    setUserId(auth.currentUser.uid);
                    localStorage.setItem('loginState', 'admin');
                    localStorage.setItem('schoolId', lowerSchoolId);
                    localStorage.setItem('userName', 'Admin');
                    return loginOk();
                } catch (e) {
                    console.error("Admin login error", e);
                    return loginErr(
                        getReadableErrorMessage(e, 'Invalid admin passcode or could not verify. Check your connection and try again.'),
                    );
                }
            } else if (type === 'teacher' && credentials.schoolId && auth.currentUser) {
                const lowerSchoolId = credentials.schoolId.trim().toLowerCase();
                try {
                    const verify = httpsCallable(functions, 'verifyTeacherPasscode');
                    await verify({
                        schoolId: lowerSchoolId,
                        username: credentials.username,
                        passcode: credentials.passcode
                    });

                    const teacherRoleRef = doc(firestore, 'schools', lowerSchoolId, 'roles_teacher', auth.currentUser.uid);
                    const roleData = await waitForReadableRole(teacherRoleRef, 'teacher', {
                        quick: isPublicSampleSchoolId(lowerSchoolId),
                    });

                    if (!roleData) {
                        throw new Error("Could not confirm teacher role after login.");
                    }

                    setSchoolId(lowerSchoolId);
                    setLoginState('teacher');
                    setIsAdmin(false);
                    setIsTeacher(true);
                    setIsSecretary(false);
                    setIsPrizeClerk(false);
                    setIsReports(false);
                    const name = credentials.teacherName || credentials.username || 'Teacher';
                    setUserName(name);
                    setUserId(auth.currentUser.uid);
                    
                    const finalTeacherDocId =
                        typeof roleData.teacherId === 'string' ? roleData.teacherId : credentials.teacherDocId;
                    if (finalTeacherDocId) {
                        setTeacherDocId(finalTeacherDocId);
                        localStorage.setItem('teacherDocId', finalTeacherDocId);
                    }
                    
                    localStorage.setItem('loginState', 'teacher');
                    localStorage.setItem('schoolId', lowerSchoolId);
                    localStorage.setItem('userName', name);
                    return loginOk();
                } catch (e) {
                    console.error("Teacher login error", e);
                    return loginErr(
                        getReadableErrorMessage(e, 'Invalid teacher credentials or could not verify. Check your connection and try again.'),
                    );
                }
            } else if (
                (
                    type === 'secretary' ||
                    type === 'prizeClerk' ||
                    type === 'reports' ||
                    type === 'librarian' ||
                    type === 'office' ||
                    type === 'houseCoordinator'
                ) &&
                credentials.schoolId &&
                credentials.username &&
                auth.currentUser
            ) {
                const lowerSchoolId = credentials.schoolId.trim().toLowerCase();
                const role = type;
                const roleCollection =
                    type === 'secretary'
                        ? 'roles_secretary'
                        : type === 'prizeClerk'
                          ? 'roles_prizeClerk'
                          : type === 'librarian'
                            ? 'roles_librarian'
                          : type === 'office'
                            ? 'roles_office'
                            : type === 'houseCoordinator'
                              ? 'roles_houseCoordinator'
                              : 'roles_reports';
                const expectedRole = type;
                try {
                    const serverData = await verifyStaffDeskLogin(auth, functions, {
                        schoolId: lowerSchoolId,
                        username: credentials.username,
                        passcode: credentials.passcode || '',
                        role,
                    });
                    const serverDisplay =
                        typeof serverData?.displayName === 'string'
                            ? serverData.displayName.trim()
                            : '';
                    const grantedRoles = Array.isArray(serverData?.roles) ? serverData.roles : [type];
                    const hasSecretary = grantedRoles.includes('secretary');
                    const hasPrizeClerk = grantedRoles.includes('prizeClerk');
                    const hasReports = grantedRoles.includes('reports');
                    const hasLibrarian = grantedRoles.includes('librarian');
                    const hasOffice = grantedRoles.includes('office');
                    const hasHouseCoordinator = grantedRoles.includes('houseCoordinator');

                    const roleRef = doc(firestore, 'schools', lowerSchoolId, roleCollection, auth.currentUser.uid);
                    const roleData = await waitForReadableRole(roleRef, expectedRole, {
                        quick: isPublicSampleSchoolId(lowerSchoolId),
                    });

                    if (!roleData) {
                        throw new Error('Could not confirm desk staff role after login.');
                    }

                    setSchoolId(lowerSchoolId);
                    setLoginState(type);
                    setIsAdmin(false);
                    setIsTeacher(false);
                    setIsSecretary(hasSecretary);
                    setIsPrizeClerk(hasPrizeClerk);
                    setIsReports(hasReports);
                    setIsLibrarian(hasLibrarian);
                    setIsOffice(hasOffice);
                    setIsHouseCoordinator(hasHouseCoordinator);
                    const displayName =
                        serverDisplay ||
                        (credentials.teacherName && credentials.teacherName.trim()) ||
                        credentials.username ||
                        (type === 'secretary'
                            ? 'Secretary'
                            : type === 'prizeClerk'
                              ? 'Prize desk'
                              : type === 'librarian'
                                ? 'Librarian'
                                : type === 'office'
                                  ? 'Office staff'
                                  : type === 'houseCoordinator'
                                    ? 'House coordinator'
                                    : 'Reports');
                    setUserName(displayName);
                    setUserId(auth.currentUser.uid);
                    setTeacherDocId(null);
                    localStorage.removeItem('teacherDocId');
                    localStorage.setItem('loginState', type);
                    localStorage.setItem('schoolId', lowerSchoolId);
                    localStorage.setItem('userName', displayName);
                    return loginOk();
                } catch (e) {
                    console.error('Staff desk login error', e);
                    return loginErr(
                        getReadableErrorMessage(
                            e,
                            'Invalid desk account or passcode, or could not verify. Check your connection and try again.',
                        ),
                    );
                }
            }
            return loginErr('Could not complete sign-in. Please try again.');
        },
        [functions, firestore, auth, establishStudentKioskSession, returnToSchoolSession]
    );

    const startDeveloperSupportSession = useCallback(async (rawSchoolId: string): Promise<boolean> => {
        const lowerSchoolId = rawSchoolId.trim().toLowerCase();
        if (!lowerSchoolId || !auth.currentUser) return false;

        try {
            const startSupportSession = httpsCallable(functions, 'startDeveloperSupportSession');
            await startSupportSession({ schoolId: lowerSchoolId });
            const adminRoleRef = doc(firestore, 'schools', lowerSchoolId, 'roles_admin', auth.currentUser.uid);
            const roleData = await waitForReadableRole(adminRoleRef, 'admin', {
                quick: isPublicSampleSchoolId(lowerSchoolId),
            });
            if (!roleData) {
                throw new Error('Could not confirm school admin role for support session.');
            }
            setSchoolId(lowerSchoolId);
            setLoginState('developer');
            setIsAdmin(true);
            setIsTeacher(false);
            setIsSecretary(false);
            setIsPrizeClerk(false);
            setIsReports(false);
            setIsOffice(false);
            setUserName('Developer support');
            setUserId(auth.currentUser.uid);
            setTeacherDocId(null);
            localStorage.setItem('loginState', 'developer');
            localStorage.setItem('schoolId', lowerSchoolId);
            localStorage.setItem('userName', 'Developer support');
            localStorage.setItem(DEVELOPER_SUPPORT_SESSION_KEY, 'true');
            localStorage.removeItem('teacherDocId');
            return true;
        } catch (e) {
            console.error('Developer support session failed', e);
            return false;
        }
    }, [auth.currentUser, firestore, functions]);

    const value = useMemo(
        () => ({
            isInitialized,
            isUserLoading,
            loginState,
            isAdmin,
            isTeacher,
            isSecretary,
            isPrizeClerk,
            isReports,
            isLibrarian,
            isOffice,
            isHouseCoordinator,
            userName,
            userId,
            teacherDocId,
            schoolId,
            syncStatus,
            isKioskLocked,
            setIsKioskLocked,
            studentKioskSessionEstablished,
            studentKioskSessionError,
            login,
            startDeveloperSupportSession,
            clearSchoolChooserSession,
            logout,
            setUserName
        }),
        [
            isInitialized,
            isUserLoading,
            loginState,
            isAdmin,
            isTeacher,
            isSecretary,
            isPrizeClerk,
            isReports,
            isLibrarian,
            isOffice,
            isHouseCoordinator,
            userName,
            userId,
            teacherDocId,
            schoolId,
            syncStatus,
            isKioskLocked,
            setIsKioskLocked,
            studentKioskSessionEstablished,
            studentKioskSessionError,
            login,
            startDeveloperSupportSession,
            clearSchoolChooserSession,
            logout,
            setUserName,
        ]
    );

    const allowRenderBeforeMount =
        typeof window !== 'undefined' &&
        (() => {
            try {
                return new URLSearchParams(window.location.search).has('print');
            } catch {
                return false;
            }
        })();

    if (!isMounted && !allowRenderBeforeMount) {
        return (
            <AuthContext.Provider value={value}>
                <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6 text-center">
                    <div className="animate-pulse text-primary font-bold text-xl uppercase tracking-tighter">
                        Loading {APP_NAME}…
                    </div>
                </div>
            </AuthContext.Provider>
        );
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
