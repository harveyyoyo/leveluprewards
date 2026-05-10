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
import { doc, getDocFromServer, onSnapshot, type DocumentReference } from 'firebase/firestore';
import { schoolPublicDocRef } from '@/lib/schoolPublic';
import { getReadableErrorMessage } from '@/lib/errorMessage';
import { isPublicSampleSchoolId } from '@/lib/sample-schools';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';
export type LoginState = 'loggedOut' | 'school' | 'developer' | 'student' | 'teacher' | 'admin' | 'secretary' | 'prizeClerk' | 'reports';

/** Optional navigation after ending an admin or teacher session (default: school portal). */
export type LogoutOptions = {
    staffNavigateTo?: 'portal' | 'teacher';
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
    userName: string | null;
    userId: string | null;
    teacherDocId: string | null;
    schoolId: string | null;
    syncStatus: SyncStatus;
    login: (
        type: LoginState,
        credentials: { schoolId?: string; passcode?: string; username?: string; teacherName?: string; teacherDocId?: string; staffRole?: 'secretary' | 'prizeClerk' | 'reports'; }
    ) => Promise<boolean>;
    startDeveloperSupportSession: (schoolId: string) => Promise<boolean>;
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
    const [studentKioskSessionEstablished, setStudentKioskSessionEstablished] = useState(() => {
        if (typeof window === 'undefined') return true;
        return localStorage.getItem('loginState') !== 'student';
    });
    const [studentKioskSessionError, setStudentKioskSessionError] = useState<string | null>(null);

    const [isAdmin, setIsAdmin] = useState(false);
    const [isTeacher, setIsTeacher] = useState(false);
    const [isSecretary, setIsSecretary] = useState(false);
    const [isPrizeClerk, setIsPrizeClerk] = useState(false);
    const [isReports, setIsReports] = useState(false);
    const [userName, setUserName] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [teacherDocId, setTeacherDocId] = useState<string | null>(null);

    const { isUserLoading, functions, firestore, auth } = useFirebase();
    const router = useRouter();

    const getEntryCodeFromUrl = useCallback(() => {
        if (typeof window === 'undefined') return '';
        const params = new URLSearchParams(window.location.search);
        return (params.get('kioskEntry') || params.get('entry') || '').trim();
    }, []);

    const establishStudentKioskSession = useCallback(async (sid: string) => {
        try {
            const enter = httpsCallable(functions, 'enterSchoolKioskSession');
            await enter({ schoolId: sid });
            return;
        } catch (err) {
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
        setIsKioskLocked(false);
        setUserName(null);
        setTeacherDocId(null);
        localStorage.removeItem('userName');
        localStorage.removeItem('teacherDocId');

        if (
            loginState === 'admin' ||
            loginState === 'developer' ||
            loginState === 'teacher' ||
            loginState === 'secretary' ||
            loginState === 'prizeClerk' ||
            loginState === 'reports'
        ) {
            // When leaving a privileged staff session, return to the school chooser (Portal),
            // not directly into student kiosk mode.
            localStorage.setItem('loginState', 'school');
            setLoginState('school');
            if (schoolId) {
                const dest = options?.staffNavigateTo === 'teacher' ? 'teacher' : 'portal';
                router.push(`/${schoolId}/${dest}`);
            } else {
                router.push('/portal');
            }
        } else {
            localStorage.removeItem('loginState');
            localStorage.removeItem('schoolId');
            setLoginState('loggedOut');
            setSchoolId(null);
            router.push('/');
        }
    }, [loginState, router, schoolId]);

    // Auto-logout logic moved to AppContextBridge in AppProvider.tsx to allow for configurable timeouts from SettingsProvider.

    useLayoutEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted || isUserLoading || !firestore || !auth) {
            return;
        }

        const restore = async () => {
            try {
            const savedState = localStorage.getItem('loginState') as LoginState | null;
            const savedSchoolId = localStorage.getItem('schoolId');
            const savedName = localStorage.getItem('userName');
            const savedTeacherDocId = localStorage.getItem('teacherDocId');

            if (savedState && savedSchoolId) {
                setSchoolId(savedSchoolId);
                setUserName(savedName);
                if (savedTeacherDocId) setTeacherDocId(savedTeacherDocId);
                if (auth.currentUser) {
                    setUserId(auth.currentUser.uid);
                }

                if (savedState === 'developer') {
                    setLoginState('developer');
                    setIsAdmin(true);
                    setIsTeacher(false);
                    setIsSecretary(false);
                    setIsPrizeClerk(false);
                    setIsReports(false);
                    setUserName(savedName || 'Developer support');
                    if (auth.currentUser) {
                        setUserId(auth.currentUser.uid);
                    }
                } else if (savedState === 'school') {
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
                            const adminDoc = await getDocFromServer(adminRoleRef);
                            if (adminDoc.exists() && adminDoc.data().role === 'admin') {
                                setIsAdmin(true);
                                setIsTeacher(false);
                                setIsSecretary(false);
                                setIsPrizeClerk(false);
                            } else {
                                setIsAdmin(false);
                                setIsTeacher(false);
                                setIsSecretary(false);
                                setIsPrizeClerk(false);
                                setLoginState('student');
                                localStorage.setItem('loginState', 'student');
                            }
                        } catch {
                            setIsAdmin(false);
                            setIsTeacher(false);
                            setIsSecretary(false);
                            setIsPrizeClerk(false);
                            setLoginState('student');
                            localStorage.setItem('loginState', 'student');
                        }
                    } else {
                        setIsAdmin(false);
                        setIsTeacher(false);
                        setIsSecretary(false);
                        setIsPrizeClerk(false);
                        setLoginState('student');
                        localStorage.setItem('loginState', 'student');
                    }
                } else if (savedState === 'teacher') {
                    setLoginState('teacher');
                    if (auth.currentUser) {
                        try {
                            const teacherRoleRef = doc(firestore, 'schools', savedSchoolId, 'roles_teacher', auth.currentUser.uid);
                            const roleDoc = await getDocFromServer(teacherRoleRef);
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
                                setIsTeacher(false);
                                setIsAdmin(false);
                                setIsSecretary(false);
                                setIsPrizeClerk(false);
                                setLoginState('student');
                                localStorage.setItem('loginState', 'student');
                            }
                        } catch {
                            setIsTeacher(false);
                            setIsAdmin(false);
                            setIsSecretary(false);
                            setIsPrizeClerk(false);
                            setLoginState('student');
                            localStorage.setItem('loginState', 'student');
                        }
                    } else {
                        setIsTeacher(false);
                        setIsAdmin(false);
                        setIsSecretary(false);
                        setIsPrizeClerk(false);
                        setLoginState('student');
                        localStorage.setItem('loginState', 'student');
                    }
                } else if (savedState === 'secretary') {
                    setLoginState('secretary');
                    if (auth.currentUser) {
                        try {
                            const ref = doc(firestore, 'schools', savedSchoolId, 'roles_secretary', auth.currentUser.uid);
                            const roleDoc = await getDocFromServer(ref);
                            if (roleDoc.exists() && roleDoc.data().role === 'secretary') {
                                setIsSecretary(true);
                                setIsAdmin(false);
                                setIsTeacher(false);
                                setIsPrizeClerk(false);
                            } else {
                                setIsSecretary(false);
                                setIsPrizeClerk(false);
                                setLoginState('student');
                                localStorage.setItem('loginState', 'student');
                            }
                        } catch {
                            setIsSecretary(false);
                            setIsPrizeClerk(false);
                            setLoginState('student');
                            localStorage.setItem('loginState', 'student');
                        }
                    } else {
                        setIsSecretary(false);
                        setIsPrizeClerk(false);
                        setLoginState('student');
                        localStorage.setItem('loginState', 'student');
                    }
                } else if (savedState === 'prizeClerk' || savedState === 'reports') {
                    setLoginState(savedState);
                    if (auth.currentUser) {
                        try {
                            const roleCollection = savedState === 'prizeClerk' ? 'roles_prizeClerk' : 'roles_reports';
                            const ref = doc(firestore, 'schools', savedSchoolId, roleCollection, auth.currentUser.uid);
                            const roleDoc = await getDocFromServer(ref);
                            if (roleDoc.exists() && roleDoc.data().role === savedState) {
                                setIsPrizeClerk(savedState === 'prizeClerk');
                                setIsReports(savedState === 'reports');
                                setIsAdmin(false);
                                setIsTeacher(false);
                                setIsSecretary(false);
                            } else {
                                setIsPrizeClerk(false);
                                setIsReports(false);
                                setIsSecretary(false);
                                setLoginState('student');
                                localStorage.setItem('loginState', 'student');
                            }
                        } catch {
                            setIsPrizeClerk(false);
                            setIsReports(false);
                            setIsSecretary(false);
                            setLoginState('student');
                            localStorage.setItem('loginState', 'student');
                        }
                    } else {
                        setIsPrizeClerk(false);
                        setIsReports(false);
                        setIsSecretary(false);
                        setLoginState('student');
                        localStorage.setItem('loginState', 'student');
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
                localStorage.removeItem('loginState');
                localStorage.removeItem('userName');
                setLoginState('loggedOut');
                setIsAdmin(false);
                setIsSecretary(false);
                setIsPrizeClerk(false);
                setIsReports(false);
            } else if (savedState) {
                // `loginState` can persist without `schoolId` (cleared storage, migration). Recover from the
                // current path so kiosk routes like /{school}/student are not stuck with student + null schoolId.
                let recoveredSchoolId = savedSchoolId || null;
                if (!recoveredSchoolId && typeof window !== 'undefined') {
                    const m = window.location.pathname.match(
                        /^\/([^/]+)\/(?:student|student-home|teacher|admin|admin-signin|portal|prize|secretary|prize-clerk|reports)(?:\/|$)/i,
                    );
                    const seg = m?.[1]?.trim().toLowerCase();
                    if (seg && !['login', 'developer', 's'].includes(seg)) {
                        recoveredSchoolId = seg;
                        localStorage.setItem('schoolId', recoveredSchoolId);
                    }
                }
                const needsSchool = ['student', 'school', 'teacher', 'admin', 'secretary', 'prizeClerk', 'reports'].includes(
                    savedState,
                );
                if (needsSchool && !recoveredSchoolId) {
                    localStorage.removeItem('loginState');
                    localStorage.removeItem('schoolId');
                    localStorage.removeItem('userName');
                    localStorage.removeItem('teacherDocId');
                    setLoginState('loggedOut');
                    setSchoolId(null);
                    setUserName(null);
                    setTeacherDocId(null);
                    setIsAdmin(false);
                    setIsTeacher(false);
                    setIsSecretary(false);
                    setIsPrizeClerk(false);
                    setIsReports(false);
                } else {
                    if (recoveredSchoolId) {
                        setSchoolId(recoveredSchoolId);
                    }
                    setLoginState(savedState);
                    setIsAdmin(false);
                    setIsTeacher(false);
                    setIsSecretary(false);
                    setIsPrizeClerk(false);
                    setIsReports(false);
                }
            }
            } catch (e) {
                console.error('Auth session restore failed:', e);
            } finally {
                setIsInitialized(true);
            }
        };

        void restore();
    }, [isMounted, isUserLoading, firestore, auth]);

    // Student kiosk: `login()` already calls `enterSchoolKioskSession`, but session restore from localStorage
    // (refresh, new tab, or fallback from expired staff role) skipped it — then badge lookup fails with
    // "School entry required." Re-establish whenever we have a signed-in student context and surface errors in UI.
    useEffect(() => {
        if (loginState !== 'student') {
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
                console.warn('enterSchoolKioskSession (student session):', err);
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
    }, [isInitialized, loginState, schoolId, functions, auth.currentUser, establishStudentKioskSession]);

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
        const isStaff = loginState === 'admin' || loginState === 'developer' || loginState === 'teacher' || loginState === 'secretary' || loginState === 'prizeClerk' || loginState === 'reports';
        const metadataRef = isStaff
            ? doc(firestore, 'schools', sid)
            : schoolPublicDocRef(firestore, sid);
        const unsubscribe = onSnapshot(
            metadataRef,
            { includeMetadataChanges: true },
            (snapshot) => {
                const isFromCache = snapshot.metadata.fromCache;
                if (isFromCache) {
                    setSyncStatus('syncing');
                } else {
                    setSyncStatus('synced');
                }
            },
            (err) => {
                console.error("Sync status listener failed:", err);
                setSyncStatus('error');
            }
        );

        return () => unsubscribe();
    }, [firestore, schoolId, loginState]);

    const login = useCallback(
        async (
            type: LoginState,
            credentials: { schoolId?: string; passcode?: string; username?: string; teacherName?: string; teacherDocId?: string; staffRole?: 'secretary' | 'prizeClerk' | 'reports'; }
        ): Promise<boolean> => {
            if (type === 'developer') {
                try {
                    const res = await fetch('/api/auth/dev-login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ passcode: credentials.passcode }),
                    });
                    const data = await res.json();
                    if (data.success) {
                        // Listing `schools` in Firestore requires `isDeveloper()` (UID in appConfig/global.developerUids).
                        // addDeveloperMe merges the current Firebase user's UID into that allow-list (needs DEV_PASSCODE on Functions).
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
                            return false;
                        }
                        try {
                            const addDeveloperMe = httpsCallable(functions, 'addDeveloperMe');
                            await addDeveloperMe({ passcode: credentials.passcode });
                        } catch (e) {
                            console.error('addDeveloperMe failed:', e);
                            return false;
                        }
                        setLoginState('developer');
                        setIsAdmin(true);
                        setIsTeacher(false);
                        setIsSecretary(false);
                        setIsPrizeClerk(false);
                        setIsReports(false);
                        setUserName('Developer');
                        setUserId(uid);
                        return true;
                    }
                } catch (e) {
                    console.error("Developer login error", e);
                }
            } else if (type === 'school' && credentials.schoolId) {
                const lowerSchoolId = credentials.schoolId.trim().toLowerCase();
                if (!auth.currentUser) {
                    console.error('School access login: no Firebase signed-in user (anonymous auth should run first).');
                    return false;
                }
                try {
                    const verifyAccess = httpsCallable(functions, 'verifySchoolAccessPasscode');
                    await verifyAccess({ schoolId: lowerSchoolId, passcode: credentials.passcode?.trim() || '' });
                } catch (e) {
                    console.error('School access login failed', e);
                    return false;
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
                return true;
            } else if (type === 'student' && credentials.schoolId) {
                // Student/Public access can optionally require the school's access passcode
                // (for the initial "school sign-in" screen).
                const lowerSchoolId = credentials.schoolId.trim().toLowerCase();
                if (!auth.currentUser) {
                    console.error('Student login: no Firebase signed-in user (anonymous auth should run first).');
                    return false;
                }
                try {
                    if (credentials.passcode && credentials.passcode.trim()) {
                        const verifyAccess = httpsCallable(functions, 'verifySchoolAccessPasscode');
                        await verifyAccess({ schoolId: lowerSchoolId, passcode: credentials.passcode.trim() });
                    }
                    await establishStudentKioskSession(lowerSchoolId);
                } catch (e) {
                    console.error('Student login: could not create kiosk session', e);
                    return false;
                }
                setSchoolId(lowerSchoolId);
                setLoginState('student');
                setIsAdmin(false);
                setIsTeacher(false);
                setIsSecretary(false);
                setIsPrizeClerk(false);
                setIsReports(false);
                setUserName(null);
                localStorage.setItem('loginState', 'student');
                localStorage.setItem('schoolId', lowerSchoolId);
                localStorage.removeItem('userName');
                return true;
            } else if ((type === 'school' || type === 'admin') && credentials.schoolId && auth.currentUser) {
                const lowerSchoolId = credentials.schoolId.trim().toLowerCase();
                try {
                    // 1. Call the function to set the role on the backend
                    const verify = httpsCallable(functions, 'verifySchoolPasscode');
                    await verify({
                        schoolId: lowerSchoolId,
                        passcode: credentials.passcode ?? '',
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
                    return true;
                } catch (e) {
                    console.error("Admin login error", e);
                    return false;
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
                    return true;
                } catch (e) {
                    console.error("Teacher login error", e);
                    return false;
                }
            } else if (
                (type === 'secretary' || type === 'prizeClerk' || type === 'reports') &&
                credentials.schoolId &&
                credentials.username &&
                auth.currentUser
            ) {
                const lowerSchoolId = credentials.schoolId.trim().toLowerCase();
                const role = type;
                const roleCollection = type === 'secretary' ? 'roles_secretary' : type === 'prizeClerk' ? 'roles_prizeClerk' : 'roles_reports';
                const expectedRole = type;
                try {
                    const verify = httpsCallable(functions, 'verifyStaffAccountPasscode');
                    const res = await verify({
                        schoolId: lowerSchoolId,
                        username: credentials.username,
                        passcode: credentials.passcode,
                        role,
                    });
                    const serverData = res.data as { displayName?: string; roles?: string[] };
                    const serverDisplay =
                        typeof serverData?.displayName === 'string'
                            ? serverData.displayName.trim()
                            : '';
                    const grantedRoles = Array.isArray(serverData?.roles) ? serverData.roles : [type];
                    const hasSecretary = grantedRoles.includes('secretary');
                    const hasPrizeClerk = grantedRoles.includes('prizeClerk');
                    const hasReports = grantedRoles.includes('reports');

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
                    const displayName =
                        serverDisplay ||
                        (credentials.teacherName && credentials.teacherName.trim()) ||
                        credentials.username ||
                        (type === 'secretary' ? 'Secretary' : type === 'prizeClerk' ? 'Prize desk' : 'Reports');
                    setUserName(displayName);
                    setUserId(auth.currentUser.uid);
                    setTeacherDocId(null);
                    localStorage.removeItem('teacherDocId');
                    localStorage.setItem('loginState', type);
                    localStorage.setItem('schoolId', lowerSchoolId);
                    localStorage.setItem('userName', displayName);
                    return true;
                } catch (e) {
                    console.error('Staff desk login error', e);
                    return false;
                }
            }
            return false;
        },
        [functions, firestore, auth, establishStudentKioskSession]
    );

    const startDeveloperSupportSession = useCallback(async (rawSchoolId: string): Promise<boolean> => {
        const lowerSchoolId = rawSchoolId.trim().toLowerCase();
        if (!lowerSchoolId || !auth.currentUser) return false;

        try {
            const startSupportSession = httpsCallable(functions, 'startDeveloperSupportSession');
            await startSupportSession({ schoolId: lowerSchoolId });
            setSchoolId(lowerSchoolId);
            setLoginState('developer');
            setIsAdmin(true);
            setIsTeacher(false);
            setIsSecretary(false);
            setIsPrizeClerk(false);
            setIsReports(false);
            setUserName('Developer support');
            setUserId(auth.currentUser.uid);
            setTeacherDocId(null);
            localStorage.setItem('loginState', 'developer');
            localStorage.setItem('schoolId', lowerSchoolId);
            localStorage.setItem('userName', 'Developer support');
            localStorage.removeItem('teacherDocId');
            return true;
        } catch (e) {
            console.error('Developer support session failed', e);
            return false;
        }
    }, [auth.currentUser, functions]);

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
                        Loading levelUp EDU...
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
