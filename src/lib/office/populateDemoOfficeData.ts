import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import type { Class, StaffAccount, Student, Teacher } from '@/lib/types';
import { isPublicSampleSchoolId } from '@/lib/sampleSchools';
import { schoolPublicDocRef } from '@/lib/schoolPublic';
import { buildStaffDirectory, syncSchoolStaffDirectory } from '@/lib/syncSchoolStaffDirectory';
import {
  seedOfficeDemoDataForSchool,
  type OfficeDemoSeedPayload,
  type OfficeDemoVariant,
} from '@/lib/office/seedOfficeDemoData';

type RewardsRosterSnapshot = {
  students: Pick<Student, 'id' | 'firstName' | 'lastName' | 'nickname' | 'classId'>[];
  classes: Pick<Class, 'id' | 'name'>[];
  teachers: Teacher[];
};

export type PopulateDemoOfficeDataResult = OfficeDemoSeedPayload & {
  staffDirectoryCount: number;
};

async function readRewardsRoster(firestore: Firestore, schoolId: string): Promise<RewardsRosterSnapshot> {
  const [studentSnap, classSnap, teacherSnap] = await Promise.all([
    getDocs(collection(firestore, 'schools', schoolId, 'students')),
    getDocs(collection(firestore, 'schools', schoolId, 'classes')),
    getDocs(collection(firestore, 'schools', schoolId, 'teachers')),
  ]);

  const students = studentSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as RewardsRosterSnapshot['students'];
  const classes = classSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as RewardsRosterSnapshot['classes'];
  const teachers = teacherSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Teacher[];

  if (students.length && classes.length) {
    return { students, classes, teachers };
  }

  const sampleData =
    schoolId === 'yeshiva'
      ? (await import('@/lib/yeshivaData')).YESHIVA_DATA
      : (await import('@/lib/schoolData')).SCHOOL_DATA;

  return {
    students: students.length ? students : sampleData.students ?? [],
    classes: classes.length ? classes : sampleData.classes ?? [],
    teachers: teachers.length ? teachers : sampleData.teachers ?? [],
  };
}

/**
 * Populate a public demo school with fake School Office data from its rewards roster.
 * This is intentionally limited to built-in sample schools.
 */
export async function populateDemoOfficeDataForSchool(
  firestore: Firestore,
  schoolId: string,
): Promise<PopulateDemoOfficeDataResult> {
  const cleanId = schoolId.trim().toLowerCase();
  if (!isPublicSampleSchoolId(cleanId)) {
    throw new Error('Office demo data can only be populated for "schoolabc" or "yeshiva".');
  }

  const { students, classes, teachers } = await readRewardsRoster(firestore, cleanId);
  const payload = await seedOfficeDemoDataForSchool(firestore, cleanId, {
    variant: cleanId as OfficeDemoVariant,
    students,
    classes,
  });

  const schoolRef = doc(firestore, 'schools', cleanId);
  const schoolSnap = await getDoc(schoolRef);
  const existingAppSettings = (schoolSnap.data()?.appSettings as Record<string, unknown> | undefined) ?? {};
  const nextAppSettings = { ...existingAppSettings, payOffice: true };
  await setDoc(
    schoolRef,
    {
      appSettings: nextAppSettings,
      updatedAt: Date.now(),
    },
    { merge: true },
  );
  await setDoc(
    schoolPublicDocRef(firestore, cleanId),
    { active: true, appSettings: nextAppSettings, updatedAt: Date.now() },
    { merge: true },
  );

  const staffSnap = await getDocs(collection(firestore, 'schools', cleanId, 'staffAccounts'));
  const staffAccounts = staffSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as StaffAccount[];
  const staffDirectory = buildStaffDirectory(teachers, staffAccounts);
  await syncSchoolStaffDirectory(firestore, cleanId, teachers, staffAccounts);

  return {
    ...payload,
    staffDirectoryCount: staffDirectory.length,
  };
}
