'use client';

import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import type { Student, Class, Coupon, Teacher, Prize, Category, CategoryRubricLevel, HistoryItem, Achievement, Badge, AttendanceSettings, AttendanceLogEntry, RecordClassSignInResult, HomeworkAssignment, HomeworkSubmission } from '@/lib/types';
import type { CouponPrintPageSize } from '@/lib/couponPrint';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { reportFirestorePermissionError } from '@/firebase/error-emitter';
import { collection, doc, runTransaction } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { AuthProvider, useAuth } from './providers/AuthProvider';
import type { LogoutOptions } from './providers/AuthProvider';
import { PrintProvider, usePrint } from './providers/PrintProvider';
import { BackupProvider, useBackup } from './providers/BackupProvider';
import { SettingsProvider, useSettings } from './providers/SettingsProvider';
import { addPendingCouponRedemption, listPendingCouponRedemptions, updatePendingCouponRedemptions } from '@/lib/pendingSync';
import {
  addPendingTeacherAward,
  listPendingTeacherAwards,
  updatePendingTeacherAwards,
} from '@/lib/pendingTeacherAwards';
import { couponIsKnownAndValidOffline, saveCouponSnapshot } from '@/lib/couponCache';
import type { LoginResult } from '@/lib/loginResult';
import { AI_FUN_UNIFIED_PRIZE_ID } from '@/lib/aiJokePrize';

const getDb = () => import('@/lib/db');

// Re-export types from AuthProvider for backward compatibility
export type { SyncStatus, LoginState, LogoutOptions } from './providers/AuthProvider';

interface AppContextType {
  // ... existing types

  // Auth
  isInitialized: boolean;
  isUserLoading: boolean;
  loginState: 'loggedOut' | 'school' | 'developer' | 'student' | 'teacher' | 'admin' | 'secretary' | 'prizeClerk' | 'reports' | 'librarian';
  isAdmin: boolean;
  isTeacher: boolean;
  isSecretary: boolean;
  isPrizeClerk: boolean;
  isReports: boolean;
  isLibrarian: boolean;
  userName: string | null;
  userId: string | null;
  teacherDocId: string | null;
  schoolId: string | null;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  login: (type: 'school' | 'developer' | 'student' | 'teacher' | 'admin' | 'secretary' | 'prizeClerk' | 'reports' | 'librarian', credentials: { schoolId?: string; passcode?: string; username?: string; teacherName?: string; teacherDocId?: string; staffRole?: 'secretary' | 'prizeClerk' | 'reports' | 'librarian'; }) => Promise<LoginResult>;
  startDeveloperSupportSession: (schoolId: string) => Promise<boolean>;
  logout: (options?: LogoutOptions) => void;
  setUserName: (name: string | null) => void;
  isKioskLocked: boolean;
  setIsKioskLocked: (locked: boolean) => void;
  // Print
  setCouponsToPrint: (coupons: Coupon[], options?: { couponsPerPage?: CouponPrintPageSize }) => void;
  setStudentsToPrint: (data: { students: Student[], classes: Class[], printerType?: 'dtc4500e' }) => void;
  printPrizeTickets: (tickets: any[]) => void;
  // CRUD
  addStudent: (student: Omit<Student, 'id' | 'points' | 'lifetimePoints'>) => Promise<void>;
  updateStudent: (student: Student) => Promise<void>;
  deleteStudent: (studentId: string) => Promise<void>;
  addClass: (newClass: Omit<Class, 'id'>) => Promise<void>;
  updateClass: (updatedClass: Class) => Promise<void>;
  deleteClass: (classId: string, students: Student[]) => Promise<void>;
  addTeacher: (newTeacher: Omit<Teacher, 'id'>) => Promise<void>;
  updateTeacher: (teacher: Teacher, options?: { clearTeacherBudget?: boolean }) => Promise<void>;
  deleteTeacher: (teacherId: string) => Promise<void>;
  addCategory: (category: { name: string; points: number; color?: string; teacherId?: string; rubricLevels?: CategoryRubricLevel[] }) => Promise<Category | undefined>;
  updateCategory: (category: Category) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  addCoupons: (coupons: Coupon[]) => Promise<void>;
  redeemCoupon: (studentId: string, couponCode: string) => Promise<{ success: boolean; message: string; value?: number; bonusTotal?: number }>;
  deleteCoupon: (couponId: string) => Promise<void>;
  deleteCoupons: (couponIds: string[]) => Promise<void>;
  awardPoints: (studentId: string, points: number, description: string) => Promise<{ success: boolean; message: string; bonusTotal?: number; queued?: boolean }>;
  awardPointsToMultipleStudents: (studentIds: string[], points: number, description: string) => Promise<{ success: boolean; message: string; count: number; queued?: boolean }>;
  deductPointsFromMultipleStudents: (studentIds: string[], points: number, reason: string) => Promise<{ success: boolean; message: string; count: number; }>;
  redeemPrize: (studentId: string, prize: Prize, quantity: number, pointsOverride?: number, options?: { markFulfilled?: boolean }) => Promise<{ success: boolean; activityId?: string; redeemedAt?: number; totalCost?: number; message?: string }>;
  addPrize: (prize: Omit<Prize, 'id'>) => Promise<string>;
  updatePrize: (prize: Prize) => Promise<void>;
  deletePrize: (prizeId: string) => Promise<void>;
  uploadStudents: (csvContent: string, currentStudents: Student[], allClasses: Class[]) => Promise<{ success: number; failed: number; errors: string[] }>;
  uploadClassesFromCsv: (csvContent: string, currentClasses: Class[]) => Promise<{ success: number; failed: number; errors: string[] }>;
  uploadTeachersFromCsv: (csvContent: string, currentTeachers: Teacher[]) => Promise<{ success: number; failed: number; errors: string[] }>;
  togglePrizeFulfillment: (studentId: string, activityId: string, fulfilled: boolean) => Promise<void>;
  categories: Category[];
  categoriesLoading: boolean;
  achievements: Achievement[];
  achievementsLoading: boolean;
  badges: Badge[];
  badgesLoading: boolean;
  // Backup/School management
  createSchool: (
    schoolId: string,
    name?: string,
    passcodes?: { passcode?: string; schoolAccessPasscode?: string; adminPasscode?: string },
  ) => Promise<{ passcode: string; schoolAccessPasscode: string; adminPasscode: string; cleanId: string } | null>;
  deleteSchool: (schoolId: string) => Promise<void>;
  updateSchool: (schoolId: string, updates: { name?: string; passcode?: string; schoolAccessPasscode?: string; adminPasscode?: string }) => Promise<void>;
  devCreateBackup: (schoolId: string) => Promise<void>;
  devRestoreFromBackup: (schoolId: string, backupId: string) => Promise<void>;
  devDownloadBackup: (schoolId: string, backupId: string) => Promise<void>;
  devBackupAllSchools: () => Promise<void>;
  devVerifyBackup: (schoolId: string, backupId: string) => Promise<{ verified: boolean; reason: string }>;
  devMigrateSchoolData: (schoolId: string) => Promise<void>;
  devResetSampleSchool: (schoolId: string) => Promise<void>;
  devSyncSchoolPublicIndex: () => Promise<void>;
  purgeStudentProgress: (studentId: string) => Promise<void>;
  purgeStudentsProgress: (studentIds: string[]) => Promise<{ success: number; failed: number }>;
  getAttendanceConfig: () => Promise<AttendanceSettings | null>;
  setAttendanceConfig: (settings: AttendanceSettings) => Promise<void>;
  recordClassSignIn: (studentId: string, student: Student, config: AttendanceSettings) => Promise<RecordClassSignInResult>;
  listAttendanceLog: (limitCount?: number) => Promise<AttendanceLogEntry[]>;
  // Per-teacher attendance helpers
  getTeacherAttendanceConfig: (teacherId: string) => Promise<AttendanceSettings | null>;
  setTeacherAttendanceConfig: (teacherId: string, settings: AttendanceSettings) => Promise<void>;
  listTeacherAttendanceLog: (teacherId: string, limitCount?: number) => Promise<AttendanceLogEntry[]>;
  // Homework
  addHomeworkAssignment: (assignment: Omit<HomeworkAssignment, 'id'>) => Promise<string>;
  deleteHomeworkAssignment: (id: string) => Promise<void>;
  submitHomework: (studentId: string, assignmentId: string) => Promise<void>;
  approveHomework: (studentId: string, assignmentId: string, points: number, title: string) => Promise<{ success: boolean; message: string; bonusTotal?: number }>;
}

const AppContext = createContext<AppContextType | null>(null);

/**
 * Inner component that merges all provider values into one context for backward‑compat.
 * This avoids changing every consumer in the codebase right now.
 */
function AppContextBridge({ children }: { children: React.ReactNode }) {
  const authCtx = useAuth();
  const printCtx = usePrint();
  const backupCtx = useBackup();
  const { firestore, functions, auth } = useFirebase();
  const schoolId = authCtx.schoolId;
  const canReadRewardMetadata = authCtx.isAdmin || authCtx.isTeacher || authCtx.isPrizeClerk;

  // Some third-party bundles may (incorrectly) reference a global `react` identifier.
  // Defining it defensively prevents hard crashes like "react is not defined".
  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as any).React = React;
    (window as any).react = React;
  }, []);

  const categoriesQuery = useMemoFirebase(
    () => (schoolId && canReadRewardMetadata ? collection(firestore, 'schools', schoolId, 'categories') : null),
    [firestore, schoolId, canReadRewardMetadata]
  );
  const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);

  const achievementsQuery = useMemoFirebase(
    () => (schoolId && canReadRewardMetadata ? collection(firestore, 'schools', schoolId, 'achievements') : null),
    [firestore, schoolId, canReadRewardMetadata]
  );
  const { data: achievements, isLoading: achievementsLoading } = useCollection<Achievement>(achievementsQuery);

  const badgesQuery = useMemoFirebase(
    () => (schoolId && canReadRewardMetadata ? collection(firestore, 'schools', schoolId, 'badges') : null),
    [firestore, schoolId, canReadRewardMetadata]
  );
  const { data: badges, isLoading: badgesLoading } = useCollection<Badge>(badgesQuery);

  const { settings } = useSettings();
  const { loginState, logout, studentKioskSessionEstablished } = authCtx;

  const logoutRef = React.useRef(logout);
  logoutRef.current = logout;

  // Kiosk entry: optional `?kioskEntry=` or `?entry=` on the student URL verifies with Cloud Functions
  // and grants `kioskMembers` when the school has configured `secrets/entry` (see verifySchoolEntryCode).
  React.useEffect(() => {
    if (loginState !== 'student' || !schoolId || !functions || !auth?.currentUser) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const code = (params.get('kioskEntry') || params.get('entry') || '').trim();
    if (!code) return;
    const doneKey = `kioskEntryVerified:${schoolId}`;
    if (sessionStorage.getItem(doneKey) === code) return;

    const verify = httpsCallable(functions, 'verifySchoolEntryCode');
    void verify({ schoolId, code })
      .then(() => {
        sessionStorage.setItem(doneKey, code);
        params.delete('kioskEntry');
        params.delete('entry');
        const q = params.toString();
        const next = `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash}`;
        window.history.replaceState(null, '', next);
      })
      .catch(() => {});
  }, [loginState, schoolId, functions, auth?.currentUser]);

  // Privileged sessions (admin, teacher, developer, …): auto-logout after idle period.
  // Consumes configurable timeout from settings (default: 5 min).
  // Uses logoutRef + narrow deps so a changing `logout` identity does not reset the timer every render.
  // Throttles mousemove/scroll/wheel so pointer jitter does not keep extending the session forever.
  React.useEffect(() => {
    if (
      loginState !== 'admin' &&
      loginState !== 'developer' &&
      loginState !== 'teacher' &&
      loginState !== 'secretary' &&
      loginState !== 'prizeClerk' &&
      loginState !== 'reports'
    ) {
      return;
    }

    const DEFAULT_IDLE_MS = 5 * 60 * 1000;
    const raw = settings.adminSessionTimeoutMs;
    const idleMs =
      typeof raw === 'number' && Number.isFinite(raw) && raw > 0
        ? Math.min(raw, 24 * 60 * 60 * 1000)
        : DEFAULT_IDLE_MS;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let sessionEndAt = 0;
    const lastNoisyActivityAtRef = { current: 0 };
    const NOISE_THROTTLE_MS = 750;
    const noisyTypes = new Set(['mousemove', 'scroll', 'wheel']);

    const arm = () => {
      sessionEndAt = Date.now() + idleMs;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        // If settings modal is open, don't auto-logout.
        if (typeof document !== 'undefined' && document.querySelector('[data-settings-open="true"]')) {
          arm();
          return;
        }
        logoutRef.current();
      }, idleMs);
    };

    const checkExpired = () => {
      if (Date.now() >= sessionEndAt) {
        if (typeof document !== 'undefined' && document.querySelector('[data-settings-open="true"]')) {
          arm();
        } else {
          logoutRef.current();
        }
      }
    };

    const onActivity = (ev: Event) => {
      if (document.visibilityState !== 'visible') return;
      if (noisyTypes.has(ev.type)) {
        const now = Date.now();
        if (now - lastNoisyActivityAtRef.current < NOISE_THROTTLE_MS) return;
        lastNoisyActivityAtRef.current = now;
      }
      arm();
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
  }, [loginState, settings.adminSessionTimeoutMs]);

  // Background refresh: download coupon snapshot for offline validation.
  React.useEffect(() => {
    if (!schoolId || !functions || schoolId === 'schoolabc') return;
    if (loginState === 'student' && !studentKioskSessionEstablished) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    const fn = httpsCallable(functions, 'getCouponSnapshot');
    void fn({ schoolId })
      .then((res) => {
        const data = res.data as any;
        const list = Array.isArray(data?.coupons) ? data.coupons : [];
        const updatedAt = typeof data?.updatedAt === 'number' ? data.updatedAt : Date.now();
        const couponsByCode: Record<string, any> = {};
        for (const c of list) {
          const code = String(c?.code || '').toUpperCase();
          if (!code) continue;
          couponsByCode[code] = {
            code,
            value: typeof c?.value === 'number' ? c.value : undefined,
            category: typeof c?.category === 'string' ? c.category : undefined,
            startsAt: typeof c?.startsAt === 'number' ? c.startsAt : undefined,
            expiresAt: typeof c?.expiresAt === 'number' ? c.expiresAt : undefined,
            redemptionScope: typeof c?.redemptionScope === 'string' ? c.redemptionScope : undefined,
            createdByTeacherId: typeof c?.createdByTeacherId === 'string' ? c.createdByTeacherId : undefined,
            allowedClassIds: Array.isArray(c?.allowedClassIds) ? c.allowedClassIds : undefined,
            allowedTeacherIds: Array.isArray(c?.allowedTeacherIds) ? c.allowedTeacherIds : undefined,
          };
        }
        saveCouponSnapshot(schoolId, { updatedAt, couponsByCode });
      })
      .catch(() => {});
  }, [schoolId, functions, loginState, studentKioskSessionEstablished]);

  // Background sync: push offline pending redemptions when internet returns.
  React.useEffect(() => {
    if (!schoolId || !functions || !auth?.currentUser) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    const pending = listPendingCouponRedemptions(schoolId);
    if (pending.length === 0) return;
    const fn = httpsCallable(functions, 'syncPendingRedemptions');
    void fn({ schoolId, items: pending })
      .then((res) => {
        const results = (res.data as any)?.results as Array<{ id: string; status: 'confirmed' | 'rejected'; message?: string }> | undefined;
        if (!results?.length) return;
        updatePendingCouponRedemptions(results.map((r) => ({ id: r.id, status: r.status, message: r.message })));
      })
      .catch(() => {});
  }, [schoolId, functions, auth]);

  // Background sync: push offline pending teacher awards when internet returns.
  React.useEffect(() => {
    if (!firestore || !schoolId || !auth?.currentUser) return;
    if (settings.enableTeacherOfflineAwardQueue === false) return;

    const run = () => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      const pending = listPendingTeacherAwards(schoolId);
      if (pending.length === 0) return;
      const allAchievements = settings.enableAchievements ? (achievements || []) : [];
      const allBadges = settings.enableBadges ? (badges || []) : [];
      void (async () => {
        const updates: Array<{ id: string; status: 'synced' | 'failed'; message?: string }> = [];
        for (const item of pending) {
          try {
            const db = await getDb();
            await db.awardPointsToMultipleStudents(
              firestore,
              schoolId,
              item.studentIds,
              item.points,
              item.description,
              allAchievements,
              categories || [],
              allBadges,
            );
            updates.push({ id: item.id, status: 'synced' });
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Award sync failed.';
            updates.push({ id: item.id, status: 'failed', message: msg });
          }
        }
        if (updates.length) updatePendingTeacherAwards(updates);
      })();
    };

    run();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', run);
      return () => window.removeEventListener('online', run);
    }
    return undefined;
  }, [
    schoolId,
    firestore,
    auth,
    categories,
    achievements,
    badges,
    settings.enableTeacherOfflineAwardQueue,
    settings.enableAchievements,
    settings.enableBadges,
  ]);

  // CRUD wrappers load the db helpers on demand so the root client bundle stays lean.
  const addStudent_ = useCallback((s: Omit<Student, 'id' | 'points' | 'lifetimePoints'>) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return getDb().then((db) => db.addStudent(firestore, schoolId, s));
  }, [firestore, schoolId]);

  const updateStudent_ = useCallback((s: Student) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return getDb().then((db) => db.updateStudent(firestore, schoolId, s));
  }, [firestore, schoolId]);

  const deleteStudent_ = useCallback((id: string) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return getDb().then((db) => db.deleteStudent(firestore, schoolId, id));
  }, [firestore, schoolId]);

  const addClass_ = useCallback((c: Omit<Class, 'id'>) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return getDb().then((db) => db.addClass(firestore, schoolId, c));
  }, [firestore, schoolId]);

  const updateClass_ = useCallback((c: Class) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return getDb().then((db) => db.updateClass(firestore, schoolId, c));
  }, [firestore, schoolId]);

  const deleteClass_ = useCallback((id: string, students: Student[]) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return getDb().then((db) => db.deleteClass(firestore, schoolId, id, students));
  }, [firestore, schoolId]);

  const addTeacher_ = useCallback((t: Omit<Teacher, 'id'>) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return getDb().then((db) => db.addTeacher(firestore, schoolId, t));
  }, [firestore, schoolId]);

  const updateTeacher_ = useCallback((t: Teacher, options?: { clearTeacherBudget?: boolean }) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return getDb().then((db) => db.updateTeacher(firestore, schoolId, t, options));
  }, [firestore, schoolId]);

  const deleteTeacher_ = useCallback((id: string) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return getDb().then((db) => db.deleteTeacher(firestore, schoolId, id));
  }, [firestore, schoolId]);

  const addCategory_ = useCallback(async (data: { name: string; points: number; color?: string; teacherId?: string; rubricLevels?: CategoryRubricLevel[] }) => {
    if (!firestore || !schoolId) return undefined;
    return getDb().then((db) => db.addCategory(firestore, schoolId, data));
  }, [firestore, schoolId]);

  const updateCategory_ = useCallback(async (category: Category) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return getDb().then((db) => db.updateCategory(firestore, schoolId, category));
  }, [firestore, schoolId]);

  const deleteCategory_ = useCallback((id: string) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return getDb().then((db) => db.deleteCategory(firestore, schoolId, id));
  }, [firestore, schoolId]);

  const addCoupons_ = useCallback((coupons: Coupon[]) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return getDb().then((db) => db.addCoupons(firestore, schoolId, coupons));
  }, [firestore, schoolId]);

  const redeemCoupon_ = useCallback(async (studentId: string, code: string) => {
    if (!schoolId) return { success: false, message: 'Not logged in.' };
    const couponCode = code.toUpperCase();

    // Offline: only allow coupons known from last snapshot; queue for sync; prevent double-use on kiosk.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      const ok = couponIsKnownAndValidOffline(schoolId, couponCode);
      if (!ok.ok) return { success: false, message: ok.reason || 'Coupon not valid offline.' };
      addPendingCouponRedemption({ schoolId, studentId, couponCode, createdAt: Date.now() });
      return { success: true, message: 'Saved offline (pending sync).' };
    }

    // Online: kiosk-safe server redemption.
    try {
      const fn = httpsCallable(functions, 'redeemCouponServer');
      const res = await fn({ schoolId, studentId, couponCode });
      const data = res.data as any;
      return { success: !!data?.success, message: String(data?.message || 'Redeemed.'), value: data?.value };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Could not redeem this coupon.' };
    }
  }, [schoolId, functions]);

  const deleteCoupon_ = useCallback((couponId: string) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return getDb().then((db) => db.deleteCoupon(firestore, schoolId, couponId));
  }, [firestore, schoolId]);

  const deleteCoupons_ = useCallback((couponIds: string[]) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return getDb().then((db) => db.deleteCoupons(firestore, schoolId, couponIds));
  }, [firestore, schoolId]);

  const awardPoints_ = useCallback(async (studentId: string, points: number, description: string) => {
    if (!firestore || !schoolId) return { success: false, message: 'Not logged in.' };
    const staffish =
      authCtx.isAdmin ||
      authCtx.isTeacher ||
      authCtx.isSecretary ||
      loginState === 'developer' ||
      loginState === 'reports';
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (
      offline &&
      staffish &&
      settings.enableTeacherOfflineAwardQueue !== false &&
      points > 0
    ) {
      addPendingTeacherAward({
        schoolId,
        studentIds: [studentId],
        points,
        description,
        createdAt: Date.now(),
      });
      return {
        success: true,
        message: 'Saved offline — points will be awarded when you are back online.',
        queued: true,
      };
    }
    const allAchievements = settings.enableAchievements ? (achievements || []) : [];
    const allBadges = settings.enableBadges ? (badges || []) : [];
    return getDb().then((db) => db.awardPointsToStudent(firestore, schoolId, studentId, points, description, allAchievements, categories || [], allBadges));
  }, [
    firestore,
    schoolId,
    categories,
    achievements,
    badges,
    settings.enableAchievements,
    settings.enableBadges,
    settings.enableTeacherOfflineAwardQueue,
    authCtx.isAdmin,
    authCtx.isTeacher,
    authCtx.isSecretary,
    loginState,
  ]);

  const awardPointsToMultipleStudents_ = useCallback(async (studentIds: string[], points: number, description: string) => {
    if (!firestore || !schoolId) return { success: false, message: 'Not logged in.', count: 0 };
    const staffish =
      authCtx.isAdmin ||
      authCtx.isTeacher ||
      authCtx.isSecretary ||
      loginState === 'developer' ||
      loginState === 'reports';
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (
      offline &&
      staffish &&
      settings.enableTeacherOfflineAwardQueue !== false &&
      studentIds.length > 0 &&
      points > 0
    ) {
      addPendingTeacherAward({
        schoolId,
        studentIds: [...studentIds],
        points,
        description,
        createdAt: Date.now(),
      });
      return {
        success: true,
        count: studentIds.length,
        message: 'Saved offline — awards will sync when you are back online.',
        queued: true,
      };
    }
    const allAchievements = settings.enableAchievements ? (achievements || []) : [];
    const allBadges = settings.enableBadges ? (badges || []) : [];
    return getDb().then((db) => db.awardPointsToMultipleStudents(firestore, schoolId, studentIds, points, description, allAchievements, categories || [], allBadges));
  }, [
    firestore,
    schoolId,
    categories,
    achievements,
    badges,
    settings.enableAchievements,
    settings.enableBadges,
    settings.enableTeacherOfflineAwardQueue,
    authCtx.isAdmin,
    authCtx.isTeacher,
    authCtx.isSecretary,
    loginState,
  ]);

  const deductPointsFromMultipleStudents_ = useCallback(async (studentIds: string[], points: number, reason: string) => {
    if (!firestore || !schoolId) return { success: false, message: 'Not logged in.', count: 0 };
    return getDb().then((db) => db.deductPointsFromMultipleStudents(firestore, schoolId, studentIds, points, reason));
  }, [firestore, schoolId]);

  const redeemPrize_ = useCallback(async (studentId: string, prize: Prize, quantity: number, pointsOverride?: number, options?: { markFulfilled?: boolean }) => {
    if (!schoolId) return Promise.reject("Not logged into a school.");
    try {
      const fn = httpsCallable(functions, 'redeemPrizeServer');
      const res = await fn({
        schoolId,
        studentId,
        prizeId: prize.id,
        quantity,
        markFulfilled: options?.markFulfilled === true,
      });
      const data = res.data as any;
      return {
        success: !!data?.success,
        activityId: typeof data?.activityId === 'string' ? data.activityId : undefined,
        redeemedAt: typeof data?.redeemedAt === 'number' ? data.redeemedAt : undefined,
        totalCost: typeof data?.totalCost === 'number' ? data.totalCost : undefined,
        message: typeof data?.message === 'string' ? data.message : undefined,
      };
    } catch (e: any) {
      const canUseLocalFallback =
        !!firestore &&
        (authCtx.isAdmin || authCtx.isTeacher || authCtx.isPrizeClerk || loginState === 'developer') &&
        typeof window !== 'undefined' &&
        ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
      const code = String(e?.code || '');
      const isCallableReachabilityFailure =
        code.includes('unavailable') ||
        code.includes('internal') ||
        code.includes('not-found') ||
        /network|failed to fetch|load failed|not found/i.test(String(e?.message || ''));

      if (canUseLocalFallback && isCallableReachabilityFailure) {
        try {
          if (prize.id !== AI_FUN_UNIFIED_PRIZE_ID) {
            const result = await getDb().then((db) => db.redeemPrize(firestore, schoolId, studentId, prize, quantity, pointsOverride, options));
            return {
              success: result.success,
              activityId: result.activityId,
              redeemedAt: result.redeemedAt,
              totalCost: result.totalCost,
              message: 'Redeemed locally.',
            };
          }

          if (settings.enablePrizeAiSurprise !== true) {
            throw new Error('AI reward surprises are turned off.');
          }

          const redeemedAt = Date.now();
          const totalCost = (typeof pointsOverride === 'number' ? pointsOverride : Math.max(0, prize.points || 0)) * quantity;
          const studentRef = doc(firestore, 'schools', schoolId, 'students', studentId);
          const activityRef = doc(collection(firestore, 'schools', schoolId, 'students', studentId, 'activities'));

          await runTransaction(firestore, async (transaction) => {
            const studentDoc = await transaction.get(studentRef);
            if (!studentDoc.exists()) throw new Error('Student not found.');
            const studentData = studentDoc.data() as Student;
            const studentPoints = Number(studentData.points || 0);
            if (studentPoints < totalCost) throw new Error('Not enough points.');
            transaction.update(studentRef, { points: studentPoints - totalCost });
            transaction.set(activityRef, {
              desc: `Redeemed: ${prize.name || 'Fun'}`,
              amount: -totalCost,
              date: redeemedAt,
              fulfilled: options?.markFulfilled === true,
            });
          });

          return {
            success: true,
            activityId: activityRef.id,
            redeemedAt,
            totalCost,
            message: 'Redeemed locally.',
          };
        } catch (fallbackError: any) {
          return {
            success: false,
            message: fallbackError?.message || e?.message || 'Could not redeem this reward.',
          };
        }
      }

      return {
        success: false,
      message: e?.message || 'Could not redeem this reward.',
      };
    }
  }, [
    authCtx.isAdmin,
    authCtx.isTeacher,
    authCtx.isPrizeClerk,
    firestore,
    functions,
    loginState,
    schoolId,
    settings.enablePrizeAiSurprise,
  ]);

  const addPrize_ = useCallback((p: Omit<Prize, 'id'>) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return getDb().then((db) => db.addPrize(firestore, schoolId, p));
  }, [firestore, schoolId]);

  const updatePrize_ = useCallback((p: Prize) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return getDb().then((db) => db.updatePrize(firestore, schoolId, p));
  }, [firestore, schoolId]);

  const deletePrize_ = useCallback((id: string) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return getDb().then((db) => db.deletePrize(firestore, schoolId, id));
  }, [firestore, schoolId]);

  const uploadStudents_ = useCallback((csv: string, curr: Student[], classes: Class[]) => {
    if (!firestore || !schoolId) return Promise.resolve({ success: 0, failed: 0, errors: ["Not logged in."] });
    return getDb().then((db) => db.uploadStudents(firestore, schoolId, csv, curr, classes));
  }, [firestore, schoolId]);

  const uploadClassesFromCsv_ = useCallback((csv: string, curr: Class[]) => {
    if (!firestore || !schoolId) return Promise.resolve({ success: 0, failed: 0, errors: ["Not logged in."] });
    return getDb().then((db) => db.uploadClassesFromCsv(firestore, schoolId, csv, curr));
  }, [firestore, schoolId]);

  const uploadTeachersFromCsv_ = useCallback((csv: string, curr: Teacher[]) => {
    if (!firestore || !schoolId) return Promise.resolve({ success: 0, failed: 0, errors: ["Not logged in."] });
    return getDb().then((db) => db.uploadTeachersFromCsv(firestore, schoolId, csv, curr));
  }, [firestore, schoolId]);

  const togglePrizeFulfillment_ = useCallback(async (studentId: string, activityId: string, fulfilled: boolean) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return getDb().then((db) => db.togglePrizeFulfillment(firestore, schoolId, studentId, activityId, fulfilled));
  }, [firestore, schoolId]);

  const purgeStudentProgress_ = useCallback(async (studentId: string) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return getDb().then((db) => db.purgeStudentProgress(firestore, schoolId, studentId));
  }, [firestore, schoolId]);

  const purgeStudentsProgress_ = useCallback(async (studentIds: string[]) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return getDb().then((db) => db.purgeStudentsProgress(firestore, schoolId, studentIds));
  }, [firestore, schoolId]);

  const getAttendanceConfig_ = useCallback(async () => {
    if (!firestore || !schoolId) return null;
    return getDb().then((db) => db.getAttendanceConfig(firestore, schoolId));
  }, [firestore, schoolId]);

  const setAttendanceConfig_ = useCallback(async (settings: AttendanceSettings) => {
    if (!schoolId) return Promise.reject("Not logged into a school.");
    const setAttendanceConfigFn = httpsCallable<{ schoolId: string; config: AttendanceSettings }, { success: boolean }>(
      functions,
      'setAttendanceConfig'
    );
    try {
      await setAttendanceConfigFn({ schoolId, config: settings });
    } catch (callableErr: unknown) {
      const code = (callableErr as { code?: string })?.code ?? '';
      if (code.includes('internal') || code.includes('unavailable') || code.includes('not-found')) {
        try {
          await getDb().then((db) => db.setAttendanceConfig(firestore!, schoolId, settings));
          return;
        } catch {
          /* fallback failed, throw original so user sees callable error message */
        }
      }
      throw callableErr;
    }
  }, [functions, firestore, schoolId]);

  const recordClassSignIn_ = useCallback(async (studentId: string, student: Student, config: AttendanceSettings) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return getDb().then((db) => db.recordClassSignIn(firestore, schoolId, studentId, student, config));
  }, [firestore, schoolId]);

  const listAttendanceLog_ = useCallback(async (limitCount?: number) => {
    if (!firestore || !schoolId) return [];
    return getDb().then((db) => db.listAttendanceLog(firestore, schoolId, limitCount));
  }, [firestore, schoolId]);

  const getTeacherAttendanceConfig_ = useCallback(async (teacherId: string) => {
    if (!firestore || !schoolId || !teacherId) return null;
    return getDb().then((db) => db.getTeacherAttendanceConfig(firestore, schoolId, teacherId));
  }, [firestore, schoolId]);

  const setTeacherAttendanceConfig_ = useCallback(async (teacherId: string, settings: AttendanceSettings) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return getDb().then((db) => db.setTeacherAttendanceConfig(firestore, schoolId, teacherId, settings));
  }, [firestore, schoolId]);

  const listTeacherAttendanceLog_ = useCallback(async (teacherId: string, limitCount?: number) => {
    if (!firestore || !schoolId || !teacherId) return [];
    return getDb().then((db) => db.listTeacherAttendanceLog(firestore, schoolId, teacherId, limitCount));
  }, [firestore, schoolId]);

  const addHomeworkAssignment_ = useCallback((assignment: Omit<HomeworkAssignment, 'id'>) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return getDb().then((db) => db.addHomeworkAssignment(firestore, schoolId, assignment));
  }, [firestore, schoolId]);

  const deleteHomeworkAssignment_ = useCallback((id: string) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return getDb().then((db) => db.deleteHomeworkAssignment(firestore, schoolId, id));
  }, [firestore, schoolId]);

  const submitHomework_ = useCallback((studentId: string, assignmentId: string) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return getDb().then((db) => db.submitHomework(firestore, schoolId, studentId, assignmentId));
  }, [firestore, schoolId]);

  const approveHomework_ = useCallback((studentId: string, assignmentId: string, points: number, title: string) => {
    if (!firestore || !schoolId) return Promise.resolve({ success: false, message: "Not logged into a school." });
    return getDb().then((db) => db.approveHomework(firestore, schoolId, studentId, assignmentId, points, title, achievements || [], categories || [], badges || []));
  }, [firestore, schoolId, achievements, categories, badges]);

  const value = useMemo(() => ({
    // Auth
    ...authCtx,
    isAdmin: authCtx.isAdmin,
    isTeacher: authCtx.isTeacher,
    isSecretary: authCtx.isSecretary,
    isPrizeClerk: authCtx.isPrizeClerk,
    isReports: authCtx.isReports,
    isLibrarian: authCtx.isLibrarian,
    // Print
    ...printCtx,
    printPrizeTickets: printCtx.printPrizeTickets,
    // CRUD
    addStudent: addStudent_, updateStudent: updateStudent_, deleteStudent: deleteStudent_,
    addClass: addClass_, updateClass: updateClass_, deleteClass: deleteClass_,
    addTeacher: addTeacher_, updateTeacher: updateTeacher_, deleteTeacher: deleteTeacher_,
    addCategory: addCategory_, updateCategory: updateCategory_, deleteCategory: deleteCategory_,
    addCoupons: addCoupons_, redeemCoupon: redeemCoupon_, deleteCoupon: deleteCoupon_, deleteCoupons: deleteCoupons_, awardPoints: awardPoints_,
    awardPointsToMultipleStudents: awardPointsToMultipleStudents_,
    deductPointsFromMultipleStudents: deductPointsFromMultipleStudents_,
    redeemPrize: redeemPrize_,
    addPrize: addPrize_, updatePrize: updatePrize_, deletePrize: deletePrize_,
    uploadStudents: uploadStudents_,
    uploadClassesFromCsv: uploadClassesFromCsv_,
    uploadTeachersFromCsv: uploadTeachersFromCsv_,
    togglePrizeFulfillment: togglePrizeFulfillment_,
    categories: categories || [],
    categoriesLoading,
    achievements: achievements || [],
    achievementsLoading,
    badges: badges || [],
    badgesLoading,
    // Backup
    ...backupCtx,
    purgeStudentProgress: purgeStudentProgress_,
    purgeStudentsProgress: purgeStudentsProgress_,
    getAttendanceConfig: getAttendanceConfig_,
    setAttendanceConfig: setAttendanceConfig_,
    recordClassSignIn: recordClassSignIn_,
    listAttendanceLog: listAttendanceLog_,
    getTeacherAttendanceConfig: getTeacherAttendanceConfig_,
    setTeacherAttendanceConfig: setTeacherAttendanceConfig_,
    listTeacherAttendanceLog: listTeacherAttendanceLog_,
    // Homework
    addHomeworkAssignment: addHomeworkAssignment_,
    deleteHomeworkAssignment: deleteHomeworkAssignment_,
    submitHomework: submitHomework_,
    approveHomework: approveHomework_,
  }), [
    authCtx, printCtx, backupCtx,
    addStudent_, updateStudent_, deleteStudent_,
    addClass_, updateClass_, deleteClass_, addTeacher_, updateTeacher_, deleteTeacher_,
    addCategory_, updateCategory_, deleteCategory_, addCoupons_,
    redeemCoupon_, deleteCoupon_, deleteCoupons_, awardPoints_, awardPointsToMultipleStudents_, deductPointsFromMultipleStudents_,
    redeemPrize_, addPrize_, updatePrize_, deletePrize_,
    uploadStudents_,
    uploadClassesFromCsv_,
    uploadTeachersFromCsv_,
    togglePrizeFulfillment_,
    purgeStudentProgress_, purgeStudentsProgress_,
    getAttendanceConfig_, setAttendanceConfig_, recordClassSignIn_, listAttendanceLog_,
    getTeacherAttendanceConfig_, setTeacherAttendanceConfig_, listTeacherAttendanceLog_,
    addHomeworkAssignment_, deleteHomeworkAssignment_, submitHomework_, approveHomework_,
    categories, categoriesLoading,
    achievements, achievementsLoading,
    badges, badgesLoading,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SettingsProvider>
        <PrintProvider>
          <BackupProvider>
            <AppContextBridge>
              {children}
            </AppContextBridge>
          </BackupProvider>
        </PrintProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
