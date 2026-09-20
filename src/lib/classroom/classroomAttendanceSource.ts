export type ClassroomAttendanceSource = 'card-scan' | 'manual';

export const DEFAULT_CLASSROOM_ATTENDANCE_SOURCE: ClassroomAttendanceSource = 'card-scan';

export function normalizeClassroomAttendanceSource(raw: unknown): ClassroomAttendanceSource {
  return raw === 'manual' ? 'manual' : DEFAULT_CLASSROOM_ATTENDANCE_SOURCE;
}

export function isClassroomCardScanSource(source: ClassroomAttendanceSource): boolean {
  return source !== 'manual';
}

export function classroomAttendanceSourceTag(source: ClassroomAttendanceSource): string {
  return source === 'manual' ? 'Manual roll call' : 'Card Scan Active';
}
