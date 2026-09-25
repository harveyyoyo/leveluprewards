import { doc, updateDoc } from 'firebase/firestore';
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
        await updateDoc(attendanceLogRef(firestore, schoolId, existingLogId), {
          onTime: false,
          status: 'late',
          updatedAt: Date.now(),
        });
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

/**
 * Check-ins made after `since` only. "Start new class" moves `since` forward on this
 * class screen instead of erasing the school's attendance records, which other
 * screens, reports and parent alerts still rely on.
 */
export function attendanceRecordsSince<T extends { signedInAt: number }>(
  records: Map<string, T>,
  since: number | undefined,
): Map<string, T> {
  if (!since) return records;
  const next = new Map<string, T>();
  records.forEach((record, studentId) => {
    if (record.signedInAt >= since) next.set(studentId, record);
  });
  return next;
}
