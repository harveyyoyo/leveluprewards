'use client';

import { collection, doc } from 'firebase/firestore';
import {
  useCollection,
  useDoc,
  useFirestore,
  useMemoFirebase,
} from '@/firebase';
import type {
  LibraryItem,
  AttendanceScheduleSlot,
  BackupInfo,
  Category,
  Class,
  House,
  Coupon,
  Prize,
  StaffAccount,
  Student,
  Teacher,
} from '@/lib/types';

export interface SchoolDocData {
  name?: string;
  logoUrl?: string;
  logoHistory?: { url?: string; uploadedAt?: number }[];
}

export interface AppConfigGlobalData {
  appLogoUrl?: string;
  appName?: string;
  appTagline?: string;
}

/**
 * Centralizes every Firestore read the admin dashboard needs so the main
 * page component doesn't have to manage ~10 memoized queries inline. Callers
 * destructure only what they use; identities of returned arrays/objects are
 * stable as long as Firestore snapshots don't change.
 */
export function useAdminDashboardData(schoolId: string | null, payLibrary?: boolean) {
  const firestore = useFirestore();

  // --- Queries ---------------------------------------------------------
  const studentsQuery = useMemoFirebase(
    () => (schoolId ? collection(firestore, 'schools', schoolId, 'students') : null),
    [firestore, schoolId],
  );
  const classesQuery = useMemoFirebase(
    () => (schoolId ? collection(firestore, 'schools', schoolId, 'classes') : null),
    [firestore, schoolId],
  );
  const housesQuery = useMemoFirebase(
    () => (schoolId ? collection(firestore, 'schools', schoolId, 'houses') : null),
    [firestore, schoolId],
  );
  const teachersQuery = useMemoFirebase(
    () => (schoolId ? collection(firestore, 'schools', schoolId, 'teachers') : null),
    [firestore, schoolId],
  );
  const staffAccountsQuery = useMemoFirebase(
    () => (schoolId ? collection(firestore, 'schools', schoolId, 'staffAccounts') : null),
    [firestore, schoolId],
  );
  const categoriesQuery = useMemoFirebase(
    () => (schoolId ? collection(firestore, 'schools', schoolId, 'categories') : null),
    [firestore, schoolId],
  );
  const prizesQuery = useMemoFirebase(
    () => (schoolId ? collection(firestore, 'schools', schoolId, 'prizes') : null),
    [firestore, schoolId],
  );
  const libraryQuery = useMemoFirebase(
    () => (schoolId && payLibrary ? collection(firestore, 'schools', schoolId, 'library') : null),
    [firestore, schoolId, payLibrary],
  );
  const couponsQuery = useMemoFirebase(
    () => (schoolId ? collection(firestore, 'schools', schoolId, 'coupons') : null),
    [firestore, schoolId],
  );
  const attendancePeriodsQuery = useMemoFirebase(
    () => (schoolId ? collection(firestore, 'schools', schoolId, 'periods') : null),
    [firestore, schoolId],
  );
  const backupsQuery = useMemoFirebase(
    () => (schoolId ? collection(firestore, 'schools', schoolId, 'backups') : null),
    [firestore, schoolId],
  );

  // --- Doc refs --------------------------------------------------------
  const schoolDocRef = useMemoFirebase(
    () => (firestore && schoolId ? doc(firestore, 'schools', schoolId) : null),
    [firestore, schoolId],
  );
  const appConfigRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'appConfig', 'global') : null),
    [firestore],
  );

  // --- Subscriptions ---------------------------------------------------
  const students = useCollection<Student>(studentsQuery);
  const classes = useCollection<Class>(classesQuery);
  const houses = useCollection<House>(housesQuery);
  const teachers = useCollection<Teacher>(teachersQuery);
  const staffAccounts = useCollection<StaffAccount>(staffAccountsQuery);
  const categories = useCollection<Category>(categoriesQuery);
  const prizes = useCollection<Prize>(prizesQuery);
  const library = useCollection<LibraryItem>(libraryQuery);
  const coupons = useCollection<Coupon>(couponsQuery);
  const attendancePeriods = useCollection<AttendanceScheduleSlot>(attendancePeriodsQuery);
  const backups = useCollection<BackupInfo>(backupsQuery);
  const schoolDoc = useDoc<SchoolDocData>(schoolDocRef);
  const appConfigDoc = useDoc<AppConfigGlobalData>(appConfigRef);

  return {
    firestore,
    students: students.data,
    studentsLoading: students.isLoading,
    studentsError: students.error,
    classes: classes.data,
    classesLoading: classes.isLoading,
    classesError: classes.error,
    houses: houses.data,
    housesLoading: houses.isLoading,
    housesError: houses.error,
    teachers: teachers.data,
    teachersLoading: teachers.isLoading,
    teachersError: teachers.error,
    staffAccounts: staffAccounts.data,
    staffAccountsLoading: staffAccounts.isLoading,
    staffAccountsError: staffAccounts.error,
    categories: categories.data,
    categoriesLoading: categories.isLoading,
    categoriesError: categories.error,
    prizes: prizes.data,
    prizesLoading: prizes.isLoading,
    prizesError: prizes.error,
    library: library.data,
    libraryLoading: library.isLoading,
    libraryError: library.error,
    coupons: coupons.data,
    couponsLoading: coupons.isLoading,
    couponsError: coupons.error,
    attendancePeriods: attendancePeriods.data,
    attendancePeriodsLoading: attendancePeriods.isLoading,
    backups: backups.data,
    backupsLoading: backups.isLoading,
    backupsError: backups.error,
    schoolData: schoolDoc.data,
    schoolDocRef,
    appConfigGlobal: appConfigDoc.data,
    appConfigRef,
  } as const;
}

export type AdminDashboardData = ReturnType<typeof useAdminDashboardData>;

