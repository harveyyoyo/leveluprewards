import { describe, expect, it, vi } from 'vitest';
import type { Firestore } from 'firebase/firestore';
import type { Goal, Student } from '@/lib/types';

const school = vi.hoisted(() => ({ students: [
  { id: 'a', classId: 'first', lifetimePoints: 80, categoryPoints: { Kindness: 20 } },
  { id: 'b', classId: 'second', lifetimePoints: 50, categoryPoints: { Kindness: 10 } },
  { id: 'c', lifetimePoints: 30, categoryPoints: { Kindness: 5 } },
] }));
vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => args.slice(1).join('/'),
  getDocs: vi.fn(async () => ({ docs: school.students.map((s) => ({ id: s.id, data: () => s })) })),
}));

vi.mock('@/lib/db/goals', () => ({ updateGoal: vi.fn() }));
vi.mock('@/lib/db/students', () => ({ awardPointsToStudent: vi.fn() }));

import { computeGoalProgress } from './goalsProgress';

const student = { id: 'student', points: 10, lifetimePoints: 80, classId: 'class' } as Student;
const base: Goal = { id: 'goal', title: 'Target', type: 'personal', studentId: student.id, targetPoints: 50, status: 'active', createdAt: 1 };
const db = {} as Firestore;

describe('goal progress', () => {
  it('counts the entire school even when the caller only has one student', async () => {
    expect(await computeGoalProgress(db, 'school', { ...base, type: 'school' }, student, [student], [])).toBe(160);
  });
  it('counts only the chosen category across all classes and unassigned students', async () => {
    expect(await computeGoalProgress(db, 'school', { ...base, type: 'school', categoryId: 'kindness' }, student, [student], [{ id: 'kindness', name: 'Kindness', points: 1 }])).toBe(35);
  });
  it.each(['personal', 'class', 'prize_savings'] as const)('keeps completed %s goals full after their deadline', async (type) => {
    expect(await computeGoalProgress(db, 'school', { ...base, type, status: 'completed', endDate: 1 }, student, [student], [])).toBe(50);
  });

  it('uses available balance for an active savings goal', async () => {
    expect(await computeGoalProgress(db, 'school', { ...base, type: 'prize_savings' }, student, [student], [])).toBe(10);
  });

  it('uses lifetime points for an active personal goal without dates', async () => {
    expect(await computeGoalProgress(db, 'school', base, student, [student], [])).toBe(80);
  });
});
