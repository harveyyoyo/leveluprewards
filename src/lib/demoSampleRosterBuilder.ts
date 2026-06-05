import type { Class, Student } from './types';

export type DemoRosterStudentSeed = Pick<
  Student,
  'id' | 'firstName' | 'lastName' | 'nfcId' | 'points' | 'classId'
>;

/** Deterministic integer in [min, max] from a numeric seed (stable across runs). */
export function seededInt(seed: number, min: number, max: number): number {
  if (max < min) return min;
  const x = Math.sin(seed * 12_989.7549) * 43_758.5453;
  const t = x - Math.floor(x);
  return min + Math.floor(t * (max - min + 1));
}

/** Minimum digits for demo student IDs (ensures reliable barcode scanning). */
export const DEMO_STUDENT_ID_MIN_DIGITS = 6;

/** Pad a numeric ID to at least DEMO_STUDENT_ID_MIN_DIGITS digits. */
export function padDemoStudentId(numericId: number): string {
  return String(numericId).padStart(DEMO_STUDENT_ID_MIN_DIGITS, '0');
}

export type BuildBalancedDemoRosterInput = {
  classes: readonly Pick<Class, 'id' | 'name'>[];
  minStudentsPerClass: number;
  maxStudentsPerClass: number;
  startStudentId?: number;
  firstNames: readonly string[];
  lastNames: readonly string[];
  pickPoints?: (studentIndex: number, classIndex: number) => number;
};

/**
 * Builds a demo roster with balanced class sizes in the requested range.
 * Class sizes vary deterministically so reseeds stay reproducible.
 * Student IDs are zero-padded to 6 digits for reliable barcode scanning.
 */
export function buildBalancedDemoRoster(input: BuildBalancedDemoRosterInput): DemoRosterStudentSeed[] {
  const startId = input.startStudentId ?? 100100;
  let nextNumericId = startId;
  const students: DemoRosterStudentSeed[] = [];

  input.classes.forEach((cls, classIndex) => {
    const classSize = seededInt(
      classIndex + 1,
      input.minStudentsPerClass,
      input.maxStudentsPerClass,
    );
    for (let seat = 0; seat < classSize; seat += 1) {
      const studentIndex = students.length;
      const firstName = input.firstNames[studentIndex % input.firstNames.length] ?? 'Student';
      const lastName =
        input.lastNames[
          Math.floor(studentIndex / input.firstNames.length) % input.lastNames.length
        ] ?? 'Demo';
      const id = padDemoStudentId(nextNumericId++);
      students.push({
        id,
        firstName,
        lastName,
        nfcId: id,
        points:
          input.pickPoints?.(studentIndex, classIndex) ??
          seededInt(studentIndex + classIndex * 17, 40, 2200),
        classId: cls.id,
      });
    }
  });

  return students;
}
