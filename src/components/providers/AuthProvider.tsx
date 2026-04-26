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

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';
export type LoginState = 'loggedOut' | 'school' | 'developer' | 'student' | 'teacher' | 'admin';

interface AuthContextType {
    isInitialized: boolean;
    isUserLoading: boolean;
    loginState: LoginState;
    isAdmin: boolean;
    isTeacher: boolean;
    userName: string | null;
    userId: string | null;
    teacherDocId: string | null;
    schoolId: string | null;
    syncStatus: SyncStatus;
    login: (
        type: LoginState,
        credentials: { schoolId?: string; passcode?: string; username?: string; teacherName?: string; teacherDocId?: string; }
    ) => Promise<boolean>;
    logout: () => void;
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
    const [userName, setUserName] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [teacherDocId, setTeacherDocId] = useState<string | null>(null);

    const { isUserLoading, functions, firestore, auth } = useFirebase();
    const router = useRouter();

    const logout = useCallback(() => {
        setIsAdmin(false);
        setIsTeacher(false);
        setIsKioskLocked(false);
        setUserName(null);
        setTeacherDocId(null);
        localStorage.removeItem('userName');
        localStorage.removeItem('teacherDocId');

        if (loginState === 'admin' || loginState === 'teacher') {
            localStorage.setItem('loginState', 'student');
            setLoginState('student');
            router.push('/portal');
        } else {
            localStorage.removeItem('loginState');
            localStorage.removeItem('schoolId');
            setLoginState('loggedOut');
            setSchoolId(null);
            router.push('/');
        }
    }, [loginState, router]);

    // Auto-logout idle timeout for privileged sessions (admin/teacher).
    useEffect(() => {
        if (loginState !== 'admin' && loginState !== 'teacher') return;

        const IDLE_MS = 5 * 60 * 1000;
        let timer: ReturnType<typeof setTimeout> | null = null;

        const arm = () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                logout();
            }, IDLE_MS);
        };

        const onActivity = () => arm();

        const events: string[] = [
            'mousemove',
            'mousedown',
            'keydown',
            'touchstart',
            'scroll',
            'wheel',
            'pointerdown',
            'visibilitychange',
        ];

        for (const ev of events) window.addEventListener(ev as any, onActivity, { passive: true } as any);
        arm();

        return () => {
            if (timer) clearTimeout(timer);
            for (const ev of events) window.removeEventListener(ev as any, onActivity as any);
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
                            } else {
                                setIsAdmin(false);
                                setIsTeacher(false);
                                setLoginState('student');
                                localStorage.setItem('loginState', 'student');
                            }
                        } catch {
                            setIsAdmin(false);
                            setIsTeacher(false);
                            setLoginState('student');
                            localStorage.setItem('loginState', 'student');
                        }
                    } else {
                        setIsAdmin(false);
                        setIsTeacher(false);
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
                            } else {
                                setIsTeacher(false);
                                setIsAdmin(false);
                                setLoginState('student');
                                localStorage.setItem('loginState', 'student');
                            }
                        } catch {
                            setIsTeacher(false);
                            setIsAdmin(false);
                            setLoginState('student');
                            localStorage.setItem('loginState', 'student');
                        }
                    } else {
                        setIsTeacher(false);
                        setIsAdmin(false);
                        setLoginState('student');
                        localStorage.setItem('loginState', 'student');
                    }
                } else {
                    setLoginState(savedState);
                    setIsAdmin(false);
                    setIsTeacher(false);
                }
            } else if (savedState) {
                setLoginState(savedState);
                if (savedState === 'developer') setIsAdmin(true);
                else setIsAdmin(false);
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

        const metadataRef = doc(firestore, 'schools', schoolId);
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
            credentials: { schoolId?: string; passcode?: string; username?: string; teacherName?: string; teacherDocId?: string; }
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
                        try {
                            const addDeveloperMe = httpsCallable(functions, 'addDeveloperMe');
                            await addDeveloperMe({ passcode: credentials.passcode });
                        } catch (e) {
                            console.warn('addDeveloperMe failed (may affect saving attendance):', e);
                        }
                        setLoginState('developer');
                        setIsAdmin(true);
                        setUserName('Developer');
                        setUserId('developer');
                        localStorage.setItem('loginState', 'developer');
                        localStorage.setItem('userName', 'Developer');
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
        [isInitialized, isUserLoading, loginState, isAdmin, isTeacher, userName, userId, teacherDocId, schoolId, syncStatus, isKioskLocked, setIsKioskLocked, login, logout, setUserName]
    );

    if (!isMounted) {
        return null;
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
