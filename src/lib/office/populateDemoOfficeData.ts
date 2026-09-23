import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { buildOfficeDemoFamilies, demoStudentDetails } from '@/lib/office/officeDemoSeedFactory';
import { officeAuditSnapshot, writeOfficeAuditEntry } from '@/lib/office/officeAuditLog';
import type { OfficeBillingAccount, OfficeFamily, OfficeStudent } from '@/lib/office/types';
import type { Class, Student, Teacher } from '@/lib/types';
import { isPublicSampleSchoolId } from '@/lib/sampleSchools';
import { schoolPublicDocRef } from '@/lib/schoolPublic';
import {
  seedOfficeDemoDataForSchool,
  type OfficeDemoSeedPayload,
  type OfficeDemoVariant,
} from '@/lib/office/seedOfficeDemoData';

type RewardsRosterSnapshot = {
  students: Pick<Student, 'id' | 'firstName' | 'lastName' | 'nickname' | 'classId'>[];
  classes: Pick<Class, 'id' | 'name' | 'primaryTeacherId'>[];
  teachers: Pick<Teacher, 'id' | 'name' | 'email'>[];
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
  const teachers = teacherSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as RewardsRosterSnapshot['teachers'];

  if (students.length && classes.length) {
    return { students, classes, teachers };
  }

  const sampleData =
    schoolId === 'yeshiva'
      ? (await import('@/lib/yeshivaData')).YESHIVA_DATA
      : (await import('@/lib/schoolData')).SCHOOL_DATA;

  return {
    students: students.length ? (students as RewardsRosterSnapshot['students']) : (sampleData.students as RewardsRosterSnapshot['students']) ?? [],
    classes: classes.length ? (classes as RewardsRosterSnapshot['classes']) : (sampleData.classes as unknown as RewardsRosterSnapshot['classes']) ?? [],
    teachers: teachers.length ? (teachers as RewardsRosterSnapshot['teachers']) : (sampleData.teachers as unknown as RewardsRosterSnapshot['teachers']) ?? [],
  };
}

/**
 * Gives demo students without a family a fake household (parents, phones, emails, address), links
 * matching billing accounts, and fills a few empty sample details. Adds only — nothing is replaced.
 */
export async function addDemoFamiliesToSchool(
  firestore: Firestore,
  schoolId: string,
  params: {
    students: OfficeStudent[];
    families: OfficeFamily[];
    billingAccounts: OfficeBillingAccount[];
    changedBy?: string | null;
  },
): Promise<{ familiesAdded: number; studentsLinked: number }> {
  const cleanId = schoolId.trim().toLowerCase();
  if (!isPublicSampleSchoolId(cleanId)) {
    throw new Error('Demo families can only be added to a demo school.');
  }
  const missing = params.students.filter((s) => !s.familyId);
  if (missing.length === 0) return { familiesAdded: 0, studentsLinked: 0 };

  const { families, familyIdByStudentId } = buildOfficeDemoFamilies(cleanId as OfficeDemoVariant, missing);
  const existingIds = new Set(params.families.map((f) => f.id));
  const newFamilies = families.filter((f) => !existingIds.has(f.id));
  const now = Date.now();

  const writes: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];
  for (const { id, ...data } of newFamilies) {
    writes.push((b) => b.set(doc(firestore, 'schools', cleanId, 'officeFamilies', id), data));
  }
  for (const s of missing) {
    const familyId = familyIdByStudentId.get(s.id);
    if (!familyId) continue;
    const sample = demoStudentDetails(s.id);
    const fill = Object.fromEntries(
      Object.entries(sample).filter(([k, v]) => v != null && !(s as Record<string, unknown>)[k]),
    );
    writes.push((b) =>
      b.update(doc(firestore, 'schools', cleanId, 'officeStudents', s.id), { ...fill, familyId, updatedAt: now }),
    );
  }
  for (const account of params.billingAccounts) {
    if (account.familyId) continue;
    const familyId = (account.studentIds ?? []).map((id) => familyIdByStudentId.get(id)).find(Boolean);
    if (familyId) {
      writes.push((b) =>
        b.update(doc(firestore, 'schools', cleanId, 'officeBillingAccounts', account.id), { familyId, updatedAt: now }),
      );
    }
  }
  for (let i = 0; i < writes.length; i += 400) {
    const batch = writeBatch(firestore);
    writes.slice(i, i + 400).forEach((w) => w(batch));
    await batch.commit();
  }

  await writeOfficeAuditEntry(firestore, cleanId, {
    entityType: 'officeFamily',
    entityId: 'demo',
    action: 'create',
    summary: `Added ${newFamilies.length} demo families and linked ${missing.length} students`,
    after: officeAuditSnapshot({ familyIds: newFamilies.map((f) => f.id), studentIds: missing.map((s) => s.id) }),
    changedBy: params.changedBy,
  });
  return { familiesAdded: newFamilies.length, studentsLinked: missing.length };
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
    teachers,
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

  return {
    ...payload,
    staffDirectoryCount: payload.staffAccounts.length,
  };
}
