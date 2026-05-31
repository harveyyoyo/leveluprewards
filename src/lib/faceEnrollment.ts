import { httpsCallable } from 'firebase/functions';
import type { Functions } from 'firebase/functions';
import type { Student } from '@/lib/types';

export type FaceEnrollmentRow = {
  studentId: string;
  enabled: boolean;
  scanCount: number;
  updatedAt: number | null;
};

type FaceAuthStatusResponse = {
  enrolled?: boolean;
  scanCount?: number;
  updatedAt?: number | null;
  enabled?: boolean;
};

export const FACE_ENROLLMENT_CHANGED_EVENT = 'school-face-enrollment-changed';

export function notifyFaceEnrollmentChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(FACE_ENROLLMENT_CHANGED_EVENT));
}

export function isActiveFaceEnrollment(
  row: Pick<FaceEnrollmentRow, 'enabled' | 'scanCount'>,
): boolean {
  return row.enabled && row.scanCount > 0;
}

async function loadRosterFaceStatuses(
  schoolId: string,
  students: Student[],
  functions: Functions,
): Promise<FaceEnrollmentRow[]> {
  const fn = httpsCallable(functions, 'getStudentFaceAuthStatus');
  const results = await Promise.all(
    students.map(async (student) => {
      try {
        const res = await fn({ schoolId, studentId: student.id });
        const data = res.data as FaceAuthStatusResponse;
        const scanCount = typeof data.scanCount === 'number' ? data.scanCount : 0;
        if (!data.enrolled && scanCount === 0) return null;
        return {
          studentId: student.id,
          enabled: data.enabled === true,
          scanCount,
          updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : null,
        } satisfies FaceEnrollmentRow;
      } catch {
        return null;
      }
    }),
  );
  return results.filter((row): row is FaceEnrollmentRow => row !== null);
}

export async function fetchSchoolFaceEnrollments(
  schoolId: string,
  functions: Functions,
  students?: Student[] | null,
): Promise<{ rows: FaceEnrollmentRow[]; rosterOnly: boolean }> {
  try {
    const fn = httpsCallable(functions, 'listSchoolFaceEnrollments');
    const res = await fn({ schoolId });
    const enrollments =
      (res.data as { enrollments?: FaceEnrollmentRow[] })?.enrollments ?? [];
    return { rows: enrollments, rosterOnly: false };
  } catch {
    const roster = students?.length
      ? await loadRosterFaceStatuses(schoolId, students, functions)
      : [];
    return { rows: roster, rosterOnly: true };
  }
}

export type FaceDuplicateCheckResult = {
  duplicate: boolean;
  matchedStudentId?: string;
  confidence?: number;
};

export async function checkFaceEnrollmentDuplicate(
  schoolId: string,
  studentId: string,
  descriptor: number[],
  functions: Functions,
): Promise<FaceDuplicateCheckResult | null> {
  try {
    const fn = httpsCallable(functions, 'checkStudentFaceDuplicate');
    const res = await fn({ schoolId, studentId, descriptor });
    const data = res.data as FaceDuplicateCheckResult;
    return {
      duplicate: !!data.duplicate,
      matchedStudentId:
        typeof data.matchedStudentId === 'string' ? data.matchedStudentId : undefined,
      confidence: typeof data.confidence === 'number' ? data.confidence : undefined,
    };
  } catch {
    return null;
  }
}
