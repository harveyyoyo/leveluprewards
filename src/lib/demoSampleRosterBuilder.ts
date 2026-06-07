import type { Class, Student } from './types';

export type DemoRosterStudentSeed = Pick<
  Student,
  'id' | 'firstName' | 'lastName' | 'nfcId' | 'points' | 'classId'
> & {
  categoryPoints?: Record<string, number>;
};

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
  /** Category names to distribute points across. If provided, points will be split among these categories. */
  categoryNames?: readonly string[];
};

/**
 * Distributes total points across categories deterministically using seeded randomness.
 * Returns a categoryPoints map where values sum to totalPoints.
 */
function distributeCategoryPoints(
  seed: number,
  totalPoints: number,
  categoryNames: readonly string[],
): Record<string, number> {
  if (categoryNames.length === 0 || totalPoints <= 0) return {};

  const result: Record<string, number> = {};
  let remaining = totalPoints;

  for (let i = 0; i < categoryNames.length; i++) {
    const catName = categoryNames[i];
    if (i === categoryNames.length - 1) {
      if (remaining > 0) result[catName] = remaining;
    } else {
      const weight = seededInt(seed + i * 7919, 5, 30);
      const portion = Math.floor((totalPoints * weight) / 100);
      const assigned = Math.min(portion, remaining);
      if (assigned > 0) {
        result[catName] = assigned;
        remaining -= assigned;
      }
    }
  }

  return result;
}

/**
 * Builds a demo roster with balanced class sizes in the requested range.
 * Class sizes vary deterministically so reseeds stay reproducible.
 * Student IDs are zero-padded to 6 digits for reliable barcode scanning.
 */
export function buildBalancedDemoRoster(input: BuildBalancedDemoRosterInput): DemoRosterStudentSeed[] {
  const startId = input.startStudentId ?? 100100;
  let nextNumericId = startId;
  const students: DemoRosterStudentSeed[] = [];
  const categoryNames = input.categoryNames ?? [];

  input.classes.forEach((cls, classIndex) => {
    const classSize = seededInt(
      classIndex + 1,
      input.minStudentsPerClass,
      input.maxStudentsPerClass,
    );
    for (let seat = 0; seat < classSize; seat += 1) {
      const studentIndex = students.length;
      const nameSeed = studentIndex * 97 + classIndex * 13;
      const firstName =
        input.firstNames[seededInt(nameSeed, 0, input.firstNames.length - 1)] ?? 'Student';
      const lastName =
        input.lastNames[seededInt(nameSeed + 4999, 0, input.lastNames.length - 1)] ?? 'Demo';
      const id = padDemoStudentId(nextNumericId++);
      const points =
        input.pickPoints?.(studentIndex, classIndex) ??
        seededInt(studentIndex + classIndex * 17, 40, 2200);
      const categoryPoints =
        categoryNames.length > 0
          ? distributeCategoryPoints(studentIndex + classIndex * 31, points, categoryNames)
          : undefined;
      students.push({
        id,
        firstName,
        lastName,
        nfcId: id,
        points,
        classId: cls.id,
        ...(categoryPoints && { categoryPoints }),
      });
    }
  });

  return students;
}
