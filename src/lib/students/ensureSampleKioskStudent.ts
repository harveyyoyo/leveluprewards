import { doc, Firestore, writeBatch } from 'firebase/firestore';
import { SAMPLE_KIOSK_STUDENT_ID } from '@/lib/sampleKioskDemo';
import {
  buildSampleKioskActivitySeeds,
  buildSampleKioskStudentDoc,
} from '@/lib/sampleKioskDemoProfile';

/** Upsert John Doe (ID 100) with demo points, categories, theme, and activity history. */
export async function ensureSampleKioskStudent(firestore: Firestore, schoolId: string): Promise<void> {
  const sid = schoolId.trim().toLowerCase();
  const now = Date.now();
  const studentRef = doc(firestore, 'schools', sid, 'students', SAMPLE_KIOSK_STUDENT_ID);
  const batch = writeBatch(firestore);
  batch.set(studentRef, buildSampleKioskStudentDoc(now), { merge: true });

  for (const activity of buildSampleKioskActivitySeeds(now)) {
    const { id, ...payload } = activity;
    batch.set(
      doc(firestore, 'schools', sid, 'students', SAMPLE_KIOSK_STUDENT_ID, 'activities', id),
      payload,
      { merge: true },
    );
  }

  await batch.commit();
}
