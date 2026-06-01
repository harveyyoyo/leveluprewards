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
 */
export function buildBalancedDemoRoster(input: BuildBalancedDemoRosterInput): DemoRosterStudentSeed[] {
  const startId = input.startStudentId ?? 100;
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
      const id = String(nextNumericId++);
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
