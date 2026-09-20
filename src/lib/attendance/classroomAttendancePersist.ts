import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { Functions } from 'firebase/functions';
import type { Student } from '@/lib/types';
import type { ClassroomRollMark } from '@/lib/classroom/classroomAttendanceRoll';

function attendanceLogRef(firestore: Firestore, schoolId: string, logId: string) {
  return doc(firestore, 'schools', schoolId, 'attendanceLog', logId);
}

export async function persistClassroomRollMark(params: {
  functions: Functions;
  firestore: Firestore;
  schoolId: string;
  student: Student;
  mark: Exclude<ClassroomRollMark, 'unmarked'>;
  existingLogId?: string;
}): Promise<{ ok: boolean; message: string }> {
  const { firestore, schoolId, mark, existingLogId } = params;

  if (mark === 'present') {
    if (existingLogId) return { ok: true, message: 'Already checked in.' };
    // Teacher roll must not award kiosk sign-in points. Presence is saved on the classroom session
    // and still follows live card-scan records from attendanceLog.
    return { ok: true, message: 'Marked present. No extra points from roll call.' };
  }

  if (mark === 'late') {
    if (existingLogId) {
      try {
        await updateDoc(attendanceLogRef(firestore, schoolId, existingLogId), { onTime: false });
      } catch (err) {
        return {
          ok: false,
          message: err instanceof Error ? err.message : 'Could not mark late on the saved list.',
        };
      }
    }
    return { ok: true, message: 'Marked late.' };
  }

  // Teacher absent marks stay on the classroom overlay so kiosk card records are not erased.
  void existingLogId;
  return { ok: true, message: 'Marked absent.' };
}

export function classroomAttendanceLogIdsForStudents(
  records: Map<string, { logId: string }>,
  studentIds: readonly string[],
): string[] {
  const want = new Set(studentIds.filter(Boolean));
  const ids: string[] = [];
  want.forEach((studentId) => {
    const logId = records.get(studentId)?.logId;
    if (logId) ids.push(logId);
  });
  return ids;
}

export async function resetClassroomAttendanceLogs(params: {
  firestore: Firestore;
  schoolId: string;
  logIds: string[];
}): Promise<{ cleared: number; failed: number }> {
  let cleared = 0;
  let failed = 0;
  for (const logId of params.logIds) {
    try {
      await deleteDoc(attendanceLogRef(params.firestore, params.schoolId, logId));
      cleared += 1;
    } catch {
      failed += 1;
    }
  }
  return { cleared, failed };
}
