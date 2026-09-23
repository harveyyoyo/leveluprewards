import { beforeEach, expect, it, vi } from 'vitest';
import type { Firestore } from 'firebase/firestore';

const fake = vi.hoisted(() => ({
  goal: { id: 'g', title: 'Class target', type: 'class', classId: 'c', status: 'active', targetPoints: 100, bonusPointsReward: 5 },
  students: [{ id: 'a', classId: 'c', lifetimePoints: 60 }, { id: 'b', classId: 'c', lifetimePoints: 60 }],
}));
vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => args.slice(1).join('/'),
  collection: (...args: unknown[]) => args.slice(1).join('/'),
  query: (ref: string) => ref,
  where: vi.fn(),
  getDoc: vi.fn(async () => ({ exists: () => true, id: 'a', data: () => fake.students[0] })),
  getDocs: vi.fn(async (ref: string) => ({ docs: (ref.endsWith('/goals') ? [fake.goal] : ref.endsWith('/students') ? fake.students : []).map((data) => ({ id: data.id, data: () => data })) })),
}));
vi.mock('@/lib/db/goals', () => ({ updateGoal: vi.fn() }));
vi.mock('@/lib/db/students', () => ({ awardPointsToStudent: vi.fn() }));
import { awardPointsToStudent } from '@/lib/db/students';
import { updateGoal } from '@/lib/db/goals';
import { syncGoalsForStudent } from '@/lib/goalsProgress';

beforeEach(() => { vi.clearAllMocks(); vi.mocked(awardPointsToStudent).mockResolvedValue({ success: true, message: 'Awarded' }); });

it('pays every class member with a reusable receipt before marking completion', async () => {
  const db = {} as Firestore;
  await syncGoalsForStudent(db, 'school', 'a');
  expect(awardPointsToStudent).toHaveBeenCalledTimes(2);
  for (const id of ['a', 'b']) expect(awardPointsToStudent).toHaveBeenCalledWith(db, 'school', id, 5, 'Class goal reward: Class target', [], [], [], { skipGoalSync: true, goalRewardId: 'g' });
  expect(updateGoal).toHaveBeenCalledWith(db, 'school', 'g', expect.objectContaining({ status: 'completed', completedProgress: 120 }));
  expect(vi.mocked(updateGoal).mock.invocationCallOrder[0]).toBeGreaterThan(vi.mocked(awardPointsToStudent).mock.invocationCallOrder[1]);
});

it('keeps a failed class payout retryable instead of marking it finished', async () => {
  vi.mocked(awardPointsToStudent).mockResolvedValueOnce({ success: true, message: 'Awarded' }).mockResolvedValueOnce({ success: false, message: 'Try again' });
  await expect(syncGoalsForStudent({} as Firestore, 'school', 'a')).rejects.toThrow('Try again');
  expect(updateGoal).not.toHaveBeenCalled();
});

it('completes a school goal and rewards students across different classes', async () => {
  fake.goal.type = 'school';
  fake.students[1].classId = 'another-class';
  try {
    const db = {} as Firestore;
    await syncGoalsForStudent(db, 'school', 'a');
    expect(awardPointsToStudent).toHaveBeenCalledTimes(2);
    for (const id of ['a', 'b']) expect(awardPointsToStudent).toHaveBeenCalledWith(db, 'school', id, 5, 'School goal reward: Class target', [], [], [], { skipGoalSync: true, goalRewardId: 'g' });
    expect(updateGoal).toHaveBeenCalledWith(db, 'school', 'g', expect.objectContaining({ status: 'completed', completedProgress: 120 }));
  } finally {
    fake.goal.type = 'class';
    fake.students[1].classId = 'c';
  }
});
