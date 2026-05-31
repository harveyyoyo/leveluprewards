import { addDoc, collection } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { BehaviorNoteKind } from '@/lib/types';

export type CreateBehaviorNoteInput = {
  studentId: string;
  studentName: string;
  classId?: string;
  className?: string;
  teacherId: string;
  teacherName: string;
  kind: BehaviorNoteKind;
  note: string;
  visibleToParent?: boolean;
  pointsAmount?: number;
  pointsLabel?: string;
};

export async function createBehaviorNote(
  firestore: Firestore,
  schoolId: string,
  input: CreateBehaviorNoteInput,
): Promise<string> {
  const ref = collection(firestore, 'schools', schoolId, 'behaviorNotes');
  const visibleToParent =
    input.visibleToParent ?? (input.kind === 'positive' || input.kind === 'concern');
  const docRef = await addDoc(ref, {
    studentId: input.studentId,
    studentName: input.studentName,
    classId: input.classId ?? null,
    className: input.className ?? null,
    teacherId: input.teacherId,
    teacherName: input.teacherName,
    kind: input.kind,
    note: input.note.trim(),
    createdAt: Date.now(),
    visibleToParent,
    pointsAmount: input.pointsAmount ?? null,
    pointsLabel: input.pointsLabel ?? null,
  });
  return docRef.id;
}
