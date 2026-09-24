import type { Firestore } from 'firebase-admin/firestore';
import { getSchoolDayClock } from '@/lib/attendance/schoolDayClock';

export function transportSchoolTimeZone(schoolData: unknown): string | undefined {
  if (!schoolData || typeof schoolData !== 'object') return undefined;
  const data = schoolData as Record<string, unknown>;
  const appSettings = data.appSettings && typeof data.appSettings === 'object' ? data.appSettings as Record<string, unknown> : {};
  const value = appSettings.attendanceTimeZone ?? data.attendanceTimeZone ?? data.timezone;
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export async function getTransportSchoolTimeZone(db: Firestore, schoolId: string): Promise<string | undefined> {
  const schoolRef = db.collection('schools').doc(schoolId);
  const schoolTimeZone = transportSchoolTimeZone((await schoolRef.get()).data());
  try {
    const attendance = await schoolRef.collection('attendance').doc('config').get();
    return transportSchoolTimeZone(attendance.data()) ?? schoolTimeZone;
  } catch {
    return schoolTimeZone;
  }
}

export function transportSchoolToday(now = Date.now(), timeZone?: string): string {
  const clock = getSchoolDayClock(now, timeZone, { whenUnset: 'utc' });
  return `${clock.year}-${String(clock.month).padStart(2, '0')}-${String(clock.day).padStart(2, '0')}`;
}
