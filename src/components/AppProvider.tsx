'use client';

import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
} from 'react';
import type { Student, Class, Coupon, Teacher, Prize, Category, HistoryItem, Achievement, Badge, AttendanceSettings, AttendanceLogEntry, RecordClassSignInResult } from '@/lib/types';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { reportFirestorePermissionError } from '@/firebase/error-emitter';
import { collection } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import {
  addCategory as dbAddCategory, deleteCategory as dbDeleteCategory, updateCategory as dbUpdateCategory,
  addCoupons as dbAddCoupons, deleteCoupon as dbDeleteCoupon,
  redeemPrize as dbRedeemPrize, addPrize as dbAddPrize,
  updatePrize as dbUpdatePrize, deletePrize as dbDeletePrize,
  addStudent as dbAddStudent, updateStudent as dbUpdateStudent,
  deleteStudent as dbDeleteStudent, addClass as dbAddClass, updateClass as dbUpdateClass,
  deleteClass as dbDeleteClass, addTeacher as dbAddTeacher, updateTeacher as dbUpdateTeacher, deleteTeacher as dbDeleteTeacher, uploadStudents as dbUploadStudents,
  awardPointsToStudent as dbAwardPointsToStudent,
  awardPointsToMultipleStudents as dbAwardPointsToMultipleStudents,
  deductPointsFromMultipleStudents as dbDeductPointsFromMultipleStudents,
  togglePrizeFulfillment as dbTogglePrizeFulfillment,
  purgeStudentProgress as dbPurgeStudentProgress,
  getAttendanceConfig as dbGetAttendanceConfig,
  setAttendanceConfig as dbSetAttendanceConfig,
  recordClassSignIn as dbRecordClassSignIn,
  listAttendanceLog as dbListAttendanceLog,
  getTeacherAttendanceConfig as dbGetTeacherAttendanceConfig,
  setTeacherAttendanceConfig as dbSetTeacherAttendanceConfig,
  listTeacherAttendanceLog as dbListTeacherAttendanceLog,
} from '@/lib/db';
import { AuthProvider, useAuth } from './providers/AuthProvider';
import { PrintProvider, usePrint } from './providers/PrintProvider';
import { BackupProvider, useBackup } from './providers/BackupProvider';
import { SettingsProvider, useSettings } from './providers/SettingsProvider';
import { addPendingCouponRedemption, listPendingCouponRedemptions, updatePendingCouponRedemptions } from '@/lib/pendingSync';
import { couponIsKnownAndValidOffline, saveCouponSnapshot } from '@/lib/couponCache';

// Re-export types from AuthProvider for backward compatibility
export type { SyncStatus, LoginState } from './providers/AuthProvider';

interface AppContextType {
  // ... existing types

  // Auth
  isInitialized: boolean;
  isUserLoading: boolean;
  loginState: 'loggedOut' | 'school' | 'developer' | 'student' | 'teacher' | 'admin';
  isAdmin: boolean;
  isTeacher: boolean;
  userName: string | null;
  userId: string | null;
  teacherDocId: string | null;
  schoolId: string | null;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  login: (type: 'school' | 'developer' | 'student' | 'teacher' | 'admin', credentials: { schoolId?: string; passcode?: string; username?: string; teacherName?: string; teacherDocId?: string }) => Promise<boolean>;
  logout: () => void;
  setUserName: (name: string | null) => void;
  isKioskLocked: boolean;
  setIsKioskLocked: (locked: boolean) => void;
  // Print
  setCouponsToPrint: (coupons: Coupon[]) => void;
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
  updateTeacher: (teacher: Teacher) => Promise<void>;
  deleteTeacher: (teacherId: string) => Promise<void>;
  addCategory: (category: { name: string; points: number; color?: string; teacherId?: string }) => Promise<Category | undefined>;
  updateCategory: (category: Category) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  addCoupons: (coupons: Coupon[]) => Promise<void>;
  redeemCoupon: (studentId: string, couponCode: string) => Promise<{ success: boolean; message: string; value?: number; bonusTotal?: number }>;
  deleteCoupon: (couponId: string) => Promise<void>;
  awardPoints: (studentId: string, points: number, description: string) => Promise<{ success: boolean; message: string; bonusTotal?: number }>;
  awardPointsToMultipleStudents: (studentIds: string[], points: number, description: string) => Promise<{ success: boolean; message: string; count: number }>;
  deductPointsFromMultipleStudents: (studentIds: string[], points: number, reason: string) => Promise<{ success: boolean; message: string; count: number; }>;
  redeemPrize: (studentId: string, prize: Prize, quantity: number) => Promise<{ success: boolean; activityId?: string; redeemedAt?: number; totalCost?: number; message?: string }>;
  addPrize: (prize: Omit<Prize, 'id'>) => Promise<string>;
  updatePrize: (prize: Prize) => Promise<void>;
  deletePrize: (prizeId: string) => Promise<void>;
  uploadStudents: (csvContent: string, currentStudents: Student[], allClasses: Class[]) => Promise<{ success: number; failed: number; errors: string[] }>;
  togglePrizeFulfillment: (studentId: string, activityId: string, fulfilled: boolean) => Promise<void>;
  categories: Category[];
  categoriesLoading: boolean;
  achievements: Achievement[];
  achievementsLoading: boolean;
  badges: Badge[];
  badgesLoading: boolean;
  // Backup/School management
  createSchool: (schoolId: string, name?: string, passcode?: string) => Promise<{ passcode: string; cleanId: string } | null>;
  deleteSchool: (schoolId: string) => Promise<void>;
  updateSchool: (schoolId: string, updates: { name?: string; passcode?: string }) => Promise<void>;
  devCreateBackup: (schoolId: string) => Promise<void>;
  devRestoreFromBackup: (schoolId: string, backupId: string) => Promise<void>;
  devDownloadBackup: (schoolId: string, backupId: string) => Promise<void>;
  devBackupAllSchools: () => Promise<void>;
  devVerifyBackup: (schoolId: string, backupId: string) => Promise<{ verified: boolean; reason: string }>;
  devMigrateSchoolData: (schoolId: string) => Promise<void>;
  devResetSampleSchool: (schoolId: string) => Promise<void>;
  devSyncSchoolPublicIndex: () => Promise<void>;
  purgeStudentProgress: (studentId: string) => Promise<void>;
  getAttendanceConfig: () => Promise<AttendanceSettings | null>;
  setAttendanceConfig: (settings: AttendanceSettings) => Promise<void>;
  recordClassSignIn: (studentId: string, student: Student, config: AttendanceSettings) => Promise<RecordClassSignInResult>;
  listAttendanceLog: (limitCount?: number) => Promise<AttendanceLogEntry[]>;
  // Per-teacher attendance helpers
  getTeacherAttendanceConfig: (teacherId: string) => Promise<AttendanceSettings | null>;
  setTeacherAttendanceConfig: (teacherId: string, settings: AttendanceSettings) => Promise<void>;
  listTeacherAttendanceLog: (teacherId: string, limitCount?: number) => Promise<AttendanceLogEntry[]>;
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
  const canReadRewardMetadata = authCtx.isAdmin || authCtx.isTeacher;

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

  // Background refresh: download coupon snapshot for offline validation.
  React.useEffect(() => {
    if (!schoolId || !functions || schoolId === 'schoolabc') return;
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
            expiresAt: typeof c?.expiresAt === 'number' ? c.expiresAt : undefined,
          };
        }
        saveCouponSnapshot(schoolId, { updatedAt, couponsByCode });
      })
      .catch(() => {});
  }, [schoolId, functions]);

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

  // CRUD wrappers — delegate straight to db.ts — delegate straight to db.ts
  const addStudent_ = useCallback((s: Omit<Student, 'id' | 'points' | 'lifetimePoints'>) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbAddStudent(firestore, schoolId, s);
  }, [firestore, schoolId]);

  const updateStudent_ = useCallback((s: Student) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbUpdateStudent(firestore, schoolId, s);
  }, [firestore, schoolId]);

  const deleteStudent_ = useCallback((id: string) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbDeleteStudent(firestore, schoolId, id);
  }, [firestore, schoolId]);

  const addClass_ = useCallback((c: Omit<Class, 'id'>) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbAddClass(firestore, schoolId, c);
  }, [firestore, schoolId]);

  const updateClass_ = useCallback((c: Class) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbUpdateClass(firestore, schoolId, c);
  }, [firestore, schoolId]);

  const deleteClass_ = useCallback((id: string, students: Student[]) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbDeleteClass(firestore, schoolId, id, students);
  }, [firestore, schoolId]);

  const addTeacher_ = useCallback((t: Omit<Teacher, 'id'>) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbAddTeacher(firestore, schoolId, t);
  }, [firestore, schoolId]);

  const updateTeacher_ = useCallback((t: Teacher) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbUpdateTeacher(firestore, schoolId, t);
  }, [firestore, schoolId]);

  const deleteTeacher_ = useCallback((id: string) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbDeleteTeacher(firestore, schoolId, id);
  }, [firestore, schoolId]);

  const addCategory_ = useCallback(async (data: { name: string; points: number; color?: string; teacherId?: string }) => {
    if (!firestore || !schoolId) return undefined;
    return dbAddCategory(firestore, schoolId, data);
  }, [firestore, schoolId]);

  const updateCategory_ = useCallback(async (category: Category) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbUpdateCategory(firestore, schoolId, category);
  }, [firestore, schoolId]);

  const deleteCategory_ = useCallback((id: string) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbDeleteCategory(firestore, schoolId, id);
  }, [firestore, schoolId]);

  const addCoupons_ = useCallback((coupons: Coupon[]) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbAddCoupons(firestore, schoolId, coupons);
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
    return dbDeleteCoupon(firestore, schoolId, couponId);
  }, [firestore, schoolId]);

  const awardPoints_ = useCallback(async (studentId: string, points: number, description: string) => {
    if (!firestore || !schoolId) return { success: false, message: 'Not logged in.' };
    const allAchievements = settings.enableAchievements ? (achievements || []) : [];
    const allBadges = settings.enableBadges ? (badges || []) : [];
    return dbAwardPointsToStudent(firestore, schoolId, studentId, points, description, allAchievements, categories || [], allBadges);
  }, [firestore, schoolId, categories, achievements, badges, settings.enableAchievements, settings.enableBadges]);

  const awardPointsToMultipleStudents_ = useCallback(async (studentIds: string[], points: number, description: string) => {
    if (!firestore || !schoolId) return { success: false, message: 'Not logged in.', count: 0 };
    const allAchievements = settings.enableAchievements ? (achievements || []) : [];
    const allBadges = settings.enableBadges ? (badges || []) : [];
    return dbAwardPointsToMultipleStudents(firestore, schoolId, studentIds, points, description, allAchievements, categories || [], allBadges);
  }, [firestore, schoolId, categories, achievements, badges, settings.enableAchievements, settings.enableBadges]);

  const deductPointsFromMultipleStudents_ = useCallback(async (studentIds: string[], points: number, reason: string) => {
    if (!firestore || !schoolId) return { success: false, message: 'Not logged in.', count: 0 };
    return dbDeductPointsFromMultipleStudents(firestore, schoolId, studentIds, points, reason);
  }, [firestore, schoolId]);

  const redeemPrize_ = useCallback(async (studentId: string, prize: Prize, quantity: number) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbRedeemPrize(firestore, schoolId, studentId, prize, quantity);
  }, [firestore, schoolId]);

  const addPrize_ = useCallback((p: Omit<Prize, 'id'>) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbAddPrize(firestore, schoolId, p);
  }, [firestore, schoolId]);

  const updatePrize_ = useCallback((p: Prize) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbUpdatePrize(firestore, schoolId, p);
  }, [firestore, schoolId]);

  const deletePrize_ = useCallback((id: string) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbDeletePrize(firestore, schoolId, id);
  }, [firestore, schoolId]);

  const uploadStudents_ = useCallback((csv: string, curr: Student[], classes: Class[]) => {
    if (!firestore || !schoolId) return Promise.resolve({ success: 0, failed: 0, errors: ["Not logged in."] });
    return dbUploadStudents(firestore, schoolId, csv, curr, classes);
  }, [firestore, schoolId]);

  const togglePrizeFulfillment_ = useCallback(async (studentId: string, activityId: string, fulfilled: boolean) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbTogglePrizeFulfillment(firestore, schoolId, studentId, activityId, fulfilled);
  }, [firestore, schoolId]);

  const purgeStudentProgress_ = useCallback(async (studentId: string) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbPurgeStudentProgress(firestore, schoolId, studentId);
  }, [firestore, schoolId]);

  const getAttendanceConfig_ = useCallback(async () => {
    if (!firestore || !schoolId) return null;
    return dbGetAttendanceConfig(firestore, schoolId);
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
          await dbSetAttendanceConfig(firestore!, schoolId, settings);
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
    return dbRecordClassSignIn(firestore, schoolId, studentId, student, config);
  }, [firestore, schoolId]);

  const listAttendanceLog_ = useCallback(async (limitCount?: number) => {
    if (!firestore || !schoolId) return [];
    return dbListAttendanceLog(firestore, schoolId, limitCount);
  }, [firestore, schoolId]);

  const getTeacherAttendanceConfig_ = useCallback(async (teacherId: string) => {
    if (!firestore || !schoolId || !teacherId) return null;
    return dbGetTeacherAttendanceConfig(firestore, schoolId, teacherId);
  }, [firestore, schoolId]);

  const setTeacherAttendanceConfig_ = useCallback(async (teacherId: string, settings: AttendanceSettings) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbSetTeacherAttendanceConfig(firestore, schoolId, teacherId, settings);
  }, [firestore, schoolId]);

  const listTeacherAttendanceLog_ = useCallback(async (teacherId: string, limitCount?: number) => {
    if (!firestore || !schoolId || !teacherId) return [];
    return dbListTeacherAttendanceLog(firestore, schoolId, teacherId, limitCount);
  }, [firestore, schoolId]);

  const value = useMemo(() => ({
    // Auth
    ...authCtx,
    isAdmin: authCtx.isAdmin,
    isTeacher: authCtx.isTeacher,
    // Print
    ...printCtx,
    printPrizeTickets: printCtx.printPrizeTickets,
    // CRUD
    addStudent: addStudent_, updateStudent: updateStudent_, deleteStudent: deleteStudent_,
    addClass: addClass_, updateClass: updateClass_, deleteClass: deleteClass_,
    addTeacher: addTeacher_, updateTeacher: updateTeacher_, deleteTeacher: deleteTeacher_,
    addCategory: addCategory_, updateCategory: updateCategory_, deleteCategory: deleteCategory_,
    addCoupons: addCoupons_, redeemCoupon: redeemCoupon_, deleteCoupon: deleteCoupon_, awardPoints: awardPoints_,
    awardPointsToMultipleStudents: awardPointsToMultipleStudents_,
    deductPointsFromMultipleStudents: deductPointsFromMultipleStudents_,
    redeemPrize: redeemPrize_,
    addPrize: addPrize_, updatePrize: updatePrize_, deletePrize: deletePrize_,
    uploadStudents: uploadStudents_,
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
    getAttendanceConfig: getAttendanceConfig_,
    setAttendanceConfig: setAttendanceConfig_,
    recordClassSignIn: recordClassSignIn_,
    listAttendanceLog: listAttendanceLog_,
    getTeacherAttendanceConfig: getTeacherAttendanceConfig_,
    setTeacherAttendanceConfig: setTeacherAttendanceConfig_,
    listTeacherAttendanceLog: listTeacherAttendanceLog_,
  }), [
    authCtx, printCtx, backupCtx,
    addStudent_, updateStudent_, deleteStudent_,
    addClass_, updateClass_, deleteClass_, addTeacher_, updateTeacher_, deleteTeacher_,
    addCategory_, updateCategory_, deleteCategory_, addCoupons_,
    redeemCoupon_, deleteCoupon_, awardPoints_, awardPointsToMultipleStudents_, deductPointsFromMultipleStudents_,
    redeemPrize_, addPrize_, updatePrize_, deletePrize_,
    uploadStudents_,
    togglePrizeFulfillment_,
    purgeStudentProgress_,
    getAttendanceConfig_, setAttendanceConfig_, recordClassSignIn_, listAttendanceLog_,
    getTeacherAttendanceConfig_, setTeacherAttendanceConfig_, listTeacherAttendanceLog_,
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
