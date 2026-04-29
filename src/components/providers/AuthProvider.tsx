'use client';

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
} from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
import { doc, getDocFromServer, onSnapshot } from 'firebase/firestore';
import { schoolPublicDocRef } from '@/lib/schoolPublic';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';
export type LoginState = 'loggedOut' | 'school' | 'developer' | 'student' | 'teacher' | 'admin' | 'secretary' | 'prizeClerk';

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
    userName: string | null;
    userId: string | null;
    teacherDocId: string | null;
    schoolId: string | null;
    syncStatus: SyncStatus;
    login: (
        type: LoginState,
        credentials: { schoolId?: string; passcode?: string; username?: string; teacherName?: string; teacherDocId?: string; staffRole?: 'secretary' | 'prizeClerk'; }
    ) => Promise<boolean>;
    logout: (options?: LogoutOptions) => void;
    setUserName: (name: string | null) => void;
    isKioskLocked: boolean;
    setIsKioskLocked: (locked: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [isMounted, setIsMounted] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [loginState, setLoginState] = useState<LoginState>('loggedOut');
    const [schoolId, setSchoolId] = useState<string | null>(null);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('syncing');
    const [isKioskLocked, setIsKioskLocked] = useState(false);

    const [isAdmin, setIsAdmin] = useState(false);
    const [isTeacher, setIsTeacher] = useState(false);
    const [isSecretary, setIsSecretary] = useState(false);
    const [isPrizeClerk, setIsPrizeClerk] = useState(false);
    const [userName, setUserName] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [teacherDocId, setTeacherDocId] = useState<string | null>(null);

    const { isUserLoading, functions, firestore, auth } = useFirebase();
    const router = useRouter();

    const logout = useCallback((options?: LogoutOptions) => {
        setIsAdmin(false);
        setIsTeacher(false);
        setIsSecretary(false);
        setIsPrizeClerk(false);
        setIsKioskLocked(false);
        setUserName(null);
        setTeacherDocId(null);
        localStorage.removeItem('userName');
        localStorage.removeItem('teacherDocId');

        if (loginState === 'admin' || loginState === 'teacher' || loginState === 'secretary' || loginState === 'prizeClerk') {
            localStorage.setItem('loginState', 'student');
            setLoginState('student');
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

    // Privileged sessions (admin, teacher): auto-logout after 5 min idle. Hiding the tab does not reset the clock.
    useEffect(() => {
        if (loginState !== 'admin' && loginState !== 'teacher' && loginState !== 'secretary' && loginState !== 'prizeClerk') return;

        const IDLE_MS = 5 * 60 * 1000;
        let timer: ReturnType<typeof setTimeout> | null = null;
        let sessionEndAt = 0;

        const arm = () => {
            sessionEndAt = Date.now() + IDLE_MS;
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                logout();
            }, IDLE_MS);
        };

        const checkExpired = () => {
            if (Date.now() >= sessionEndAt) {
                logout();
            }
        };

        const onActivity = () => {
            if (document.visibilityState === 'visible') {
                arm();
            }
        };

        const onVisibility = () => {
            if (document.visibilityState === 'visible') {
                checkExpired();
            }
        };

        const events: string[] = [
            'mousemove',
            'mousedown',
            'keydown',
            'touchstart',
            'scroll',
            'wheel',
            'pointerdown',
        ];

        for (const ev of events) {
            window.addEventListener(ev as any, onActivity, { passive: true } as any);
        }
        document.addEventListener('visibilitychange', onVisibility);
        arm();

        return () => {
            if (timer) clearTimeout(timer);
            for (const ev of events) {
                window.removeEventListener(ev as any, onActivity as any);
            }
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [loginState, logout]);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted || isUserLoading || !firestore || !auth) {
            return;
        }

        const restore = async () => {
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

                // Legacy "school" state means admin under the new system
                if (savedState === 'admin' || savedState === 'school') {
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
                } else if (savedState === 'prizeClerk') {
                    setLoginState('prizeClerk');
                    if (auth.currentUser) {
                        try {
                            const ref = doc(firestore, 'schools', savedSchoolId, 'roles_prizeClerk', auth.currentUser.uid);
                            const roleDoc = await getDocFromServer(ref);
                            if (roleDoc.exists() && roleDoc.data().role === 'prizeClerk') {
                                setIsPrizeClerk(true);
                                setIsAdmin(false);
                                setIsTeacher(false);
                                setIsSecretary(false);
                            } else {
                                setIsPrizeClerk(false);
                                setIsSecretary(false);
                                setLoginState('student');
                                localStorage.setItem('loginState', 'student');
                            }
                        } catch {
                            setIsPrizeClerk(false);
                            setIsSecretary(false);
                            setLoginState('student');
                            localStorage.setItem('loginState', 'student');
                        }
                    } else {
                        setIsPrizeClerk(false);
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
                }
            } else if (savedState === 'developer') {
                localStorage.removeItem('loginState');
                localStorage.removeItem('userName');
                setLoginState('loggedOut');
                setIsAdmin(false);
                setIsSecretary(false);
                setIsPrizeClerk(false);
            } else if (savedState) {
                setLoginState(savedState);
                setIsAdmin(false);
                setIsTeacher(false);
                setIsSecretary(false);
                setIsPrizeClerk(false);
            }

            setIsInitialized(true);
        };

        restore();
    }, [isMounted, isUserLoading, firestore, auth]);

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
        const metadataRef =
            loginState === 'student'
                ? schoolPublicDocRef(firestore, sid)
                : doc(firestore, 'schools', sid);
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
            credentials: { schoolId?: string; passcode?: string; username?: string; teacherName?: string; teacherDocId?: string; staffRole?: 'secretary' | 'prizeClerk'; }
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
                            for (let i = 0; i < 40; i++) {
                                await new Promise((r) => setTimeout(r, 250));
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
                        setUserName('Developer');
                        setUserId(uid);
                        return true;
                    }
                } catch (e) {
                    console.error("Developer login error", e);
                }
            } else if (type === 'student' && credentials.schoolId) {
                // Student/Public access just needs a valid school ID. No real auth.
                const lowerSchoolId = credentials.schoolId.trim().toLowerCase();
                setSchoolId(lowerSchoolId);
                setLoginState('student');
                setIsAdmin(false);
                setIsTeacher(false);
                setIsSecretary(false);
                setIsPrizeClerk(false);
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
                    await verify({ schoolId: lowerSchoolId, passcode: credentials.passcode });

                    // 2. Poll the server to confirm the admin role is readable
                    const adminRoleRef = doc(firestore, 'schools', lowerSchoolId, 'roles_admin', auth.currentUser.uid);
                    let roleConfirmed = false;
                    for (let i = 0; i < 15; i++) { // Poll for up to 7.5 seconds
                        try {
                            // Force a server read to bypass cache and check for rule consistency
                            const adminDoc = await getDocFromServer(adminRoleRef);
                            if (adminDoc.exists() && adminDoc.data().role === 'admin') {
                                roleConfirmed = true;
                                break;
                            }
                        } catch (e) {
                            // Ignore permission errors during polling, as they are expected while rules propagate
                        }
                        await new Promise(resolve => setTimeout(resolve, 500)); // Wait before retrying
                    }

                    if (!roleConfirmed) {
                        throw new Error("Could not confirm admin role after login. Your permissions might be out of sync. Please try again.");
                    }

                    // 3. Only now set the client state
                    setSchoolId(lowerSchoolId);
                    setLoginState('admin'); // normalize to admin
                    setIsAdmin(true);
                    setIsTeacher(false);
                    setIsSecretary(false);
                    setIsPrizeClerk(false);
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

                    // Poll the server to confirm the teacher role is readable
                    const teacherRoleRef = doc(firestore, 'schools', lowerSchoolId, 'roles_teacher', auth.currentUser.uid);
                    let roleConfirmed = false;
                    for (let i = 0; i < 15; i++) {
                        try {
                            const roleDoc = await getDocFromServer(teacherRoleRef);
                            if (roleDoc.exists() && roleDoc.data().role === 'teacher') {
                                roleConfirmed = true;
                                break;
                            }
                        } catch (e) { }
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }

                    if (!roleConfirmed) {
                        throw new Error("Could not confirm teacher role after login.");
                    }

                    setSchoolId(lowerSchoolId);
                    setLoginState('teacher');
                    setIsAdmin(false);
                    setIsTeacher(true);
                    setIsSecretary(false);
                    setIsPrizeClerk(false);
                    const name = credentials.teacherName || credentials.username || 'Teacher';
                    setUserName(name);
                    setUserId(auth.currentUser.uid);
                    if (credentials.teacherDocId) {
                        setTeacherDocId(credentials.teacherDocId);
                        localStorage.setItem('teacherDocId', credentials.teacherDocId);
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
                (type === 'secretary' || type === 'prizeClerk') &&
                credentials.schoolId &&
                credentials.username &&
                auth.currentUser
            ) {
                const lowerSchoolId = credentials.schoolId.trim().toLowerCase();
                const role = type === 'secretary' ? 'secretary' : 'prizeClerk';
                const roleCollection = type === 'secretary' ? 'roles_secretary' : 'roles_prizeClerk';
                const expectedRole = type === 'secretary' ? 'secretary' : 'prizeClerk';
                try {
                    const verify = httpsCallable(functions, 'verifyStaffAccountPasscode');
                    const res = await verify({
                        schoolId: lowerSchoolId,
                        username: credentials.username,
                        passcode: credentials.passcode,
                        role,
                    });
                    const serverDisplay =
                        typeof (res.data as { displayName?: string })?.displayName === 'string'
                            ? (res.data as { displayName: string }).displayName.trim()
                            : '';

                    const roleRef = doc(firestore, 'schools', lowerSchoolId, roleCollection, auth.currentUser.uid);
                    let roleConfirmed = false;
                    for (let i = 0; i < 15; i++) {
                        try {
                            const roleDoc = await getDocFromServer(roleRef);
                            if (roleDoc.exists() && roleDoc.data().role === expectedRole) {
                                roleConfirmed = true;
                                break;
                            }
                        } catch (e) { /* ignore */ }
                        await new Promise((resolve) => setTimeout(resolve, 500));
                    }

                    if (!roleConfirmed) {
                        throw new Error('Could not confirm desk staff role after login.');
                    }

                    setSchoolId(lowerSchoolId);
                    setLoginState(type);
                    setIsAdmin(false);
                    setIsTeacher(false);
                    setIsSecretary(type === 'secretary');
                    setIsPrizeClerk(type === 'prizeClerk');
                    const displayName =
                        serverDisplay ||
                        (credentials.teacherName && credentials.teacherName.trim()) ||
                        credentials.username ||
                        (type === 'secretary' ? 'Secretary' : 'Prize desk');
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
        [functions, firestore, auth]
    );

    const value = useMemo(
        () => ({
            isInitialized,
            isUserLoading,
            loginState,
            isAdmin,
            isTeacher,
            isSecretary,
            isPrizeClerk,
            userName,
            userId,
            teacherDocId,
            schoolId,
            syncStatus,
            isKioskLocked,
            setIsKioskLocked,
            login,
            logout,
            setUserName
        }),
        [isInitialized, isUserLoading, loginState, isAdmin, isTeacher, isSecretary, isPrizeClerk, userName, userId, teacherDocId, schoolId, syncStatus, isKioskLocked, setIsKioskLocked, login, logout, setUserName]
    );

    if (!isMounted) {
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
