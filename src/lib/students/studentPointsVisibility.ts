import {
  displayCategoryKey,
  filterSchoolwideCategoryKeys,
  isTeacherScopedCategoryKey,
  teacherIdFromCategoryKey,
} from '@/lib/classroom/classroomRewardCategories';
import type { Student } from '@/lib/types';
import type { StudentPointTypeTotal } from '@/lib/students/studentPointTypes';

function safePoints(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

/** Point-type rows appropriate for the current pillar mode. */
export function getVisibleStudentPointTypeTotals(
  student: Pick<Student, 'points' | 'lifetimePoints' | 'categoryPoints' | 'classroomPoints'>,
  options: { rewardsPillarOn: boolean; viewerTeacherId?: string },
): StudentPointTypeTotal[] {
  if (!options.rewardsPillarOn) {
    const classroomTotal = safePoints(student.classroomPoints);
    if (classroomTotal <= 0) return [];
    return [{ label: 'Classroom points', points: classroomTotal }];
  }

  const byType = Object.entries(student.categoryPoints || {})
    .filter(([key]) => {
      if (!isTeacherScopedCategoryKey(key)) return true;
      if (!options.viewerTeacherId) return false;
      return teacherIdFromCategoryKey(key) === options.viewerTeacherId;
    })
    .map(([label, value]) => ({
      label: displayCategoryKey(label),
      points: safePoints(value),
    }))
    .filter((row) => row.points > 0)
    .sort((a, b) => b.points - a.points || a.label.localeCompare(b.label));

  const categorizedTotal = byType.reduce((sum, row) => sum + row.points, 0);
  const lifetimeTotal = safePoints(student.lifetimePoints ?? student.points);
  const uncategorized = Math.max(0, lifetimeTotal - categorizedTotal);

  if (uncategorized > 0) {
    byType.push({
      label: categorizedTotal > 0 ? 'Bonus or legacy' : 'Uncategorized',
      points: uncategorized,
    });
  }

  return byType;
}

/** Keys to include in school-wide category reports (excludes teacher classroom keys). */
export function schoolwideCategoryPointKeys(categoryPoints: Record<string, number> | undefined): string[] {
  return filterSchoolwideCategoryKeys(Object.keys(categoryPoints || {}));
}

/** Primary spendable balance for display / raffle / parent portal. */
export function studentDisplayPoints(
  student: Pick<Student, 'points' | 'classroomPoints'>,
  rewardsPillarOn: boolean,
): number {
  return rewardsPillarOn ? safePoints(student.points) : safePoints(student.classroomPoints);
}
