import type { Student } from '@/lib/types';
import { isRewardsPillarOn, type PillarSettings } from '@/lib/productPillars';

/** Balance used for raffle tickets and deductions (Rewards vs classroom-only schools). */
export function rafflePointsForStudent(
  student: Pick<Student, 'points' | 'classroomPoints'>,
  settings: PillarSettings | null | undefined,
): number {
  if (isRewardsPillarOn(settings)) {
    return Number(student.points || 0);
  }
  return Number(student.classroomPoints ?? 0);
}

export function rafflePointsFieldLabel(settings: PillarSettings | null | undefined): string {
  return isRewardsPillarOn(settings) ? 'rewards balance' : 'classroom points';
}
