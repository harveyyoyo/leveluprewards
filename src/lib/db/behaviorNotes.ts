import { addDoc, collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { BehaviorNote, BehaviorNoteKind } from '@/lib/types';
import { parseBehaviorNoteCreatedAt } from '@/lib/classroom/behaviorNoteTime';

const NOTE_KINDS = new Set<BehaviorNoteKind>(['positive', 'concern', 'incident']);

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

function mapBehaviorNoteDoc(id: string, row: Record<string, unknown>): BehaviorNote {
  const kind = NOTE_KINDS.has(row.kind as BehaviorNoteKind)
    ? (row.kind as BehaviorNoteKind)
    : 'concern';
  return {
    id,
    studentId: String(row.studentId || ''),
    studentName: String(row.studentName || ''),
    classId: row.classId ? String(row.classId) : undefined,
    className: row.className ? String(row.className) : undefined,
    teacherId: String(row.teacherId || ''),
    teacherName: String(row.teacherName || ''),
    kind,
    note: String(row.note || ''),
    createdAt: parseBehaviorNoteCreatedAt(row.createdAt),
    visibleToParent: row.visibleToParent !== false,
    pointsAmount: row.pointsAmount != null ? Number(row.pointsAmount) : undefined,
    pointsLabel: row.pointsLabel ? String(row.pointsLabel) : undefined,
  };
}

/** Staff read of behavior notes (browser rules) when the Admin API is unavailable. */
export async function listBehaviorNotes(
  firestore: Firestore,
  schoolId: string,
  max = 80,
): Promise<BehaviorNote[]> {
  const q = query(
    collection(firestore, 'schools', schoolId, 'behaviorNotes'),
    orderBy('createdAt', 'desc'),
    limit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapBehaviorNoteDoc(d.id, d.data() as Record<string, unknown>));
}
