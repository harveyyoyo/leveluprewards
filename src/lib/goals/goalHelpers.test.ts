import { describe, expect, it } from 'vitest';
import {
  GOAL_ALMOST_THERE_RATIO,
  bucketForGoal,
  filterStudentsByQuery,
  goalAudienceLabel,
  goalStatusLabel,
  goalTypeLabel,
  isAlmostThere,
  isRecentCompletion,
  progressPercent,
  titleForPrizeSavings,
} from './goalHelpers';
import type { Goal, Student } from '@/lib/types';

describe('goalHelpers', () => {
  it('labels goal types and statuses in plain language', () => {
    expect(goalTypeLabel('personal')).toBe('Personal');
    expect(goalTypeLabel('prize_savings')).toBe('Savings');
    expect(goalTypeLabel('class')).toBe('Class');
    expect(goalStatusLabel('active')).toBe('In progress');
    expect(goalStatusLabel('completed')).toBe('Finished');
    expect(goalStatusLabel('expired')).toBe('Past due');
  });

  it('buckets goals including archived', () => {
    const base = {
      id: '1',
      title: 't',
      type: 'personal' as const,
      targetPoints: 10,
      createdAt: 1,
    };
    expect(bucketForGoal({ ...base, status: 'active' })).toBe('active');
    expect(bucketForGoal({ ...base, status: 'completed' })).toBe('finished');
    expect(bucketForGoal({ ...base, status: 'expired' })).toBe('past_due');
    expect(bucketForGoal({ ...base, status: 'completed', archived: true })).toBe('archived');
  });

  it('detects almost-there and progress percent', () => {
    expect(GOAL_ALMOST_THERE_RATIO).toBe(0.8);
    expect(isAlmostThere(80, 100)).toBe(true);
    expect(isAlmostThere(79, 100)).toBe(false);
    expect(isAlmostThere(100, 100)).toBe(false);
    expect(progressPercent(50, 200)).toBe(25);
  });

  it('builds audience labels and prize titles', () => {
    const students = [
      { id: 's1', firstName: 'Ada', lastName: 'Lovelace' } as Student,
    ];
    const classes = [{ id: 'c1', name: 'Room 12' }];
    const personal: Goal = {
      id: 'g1',
      title: 'x',
      type: 'personal',
      targetPoints: 10,
      status: 'active',
      createdAt: 1,
      studentId: 's1',
    };
    const classGoal: Goal = {
      id: 'g2',
      title: 'y',
      type: 'class',
      targetPoints: 10,
      status: 'active',
      createdAt: 1,
      classId: 'c1',
    };
    expect(goalAudienceLabel(personal, students, classes as never)).toBe('Ada Lovelace');
    expect(goalAudienceLabel(classGoal, students, classes as never)).toBe('Room 12');
    expect(titleForPrizeSavings({ name: 'Sticker Pack' })).toBe('Save for Sticker Pack');
  });

  it('filters students by search query', () => {
    const students = [
      { id: '1', firstName: 'Maya', lastName: 'Chen' },
      { id: '2', firstName: 'Leo', lastName: 'Park' },
    ] as Student[];
    expect(filterStudentsByQuery(students, 'may')).toHaveLength(1);
    expect(filterStudentsByQuery(students, '')).toHaveLength(2);
  });

  it('flags recent completions within 7 days', () => {
    const now = Date.now();
    const recent: Goal = {
      id: '1',
      title: 't',
      type: 'personal',
      targetPoints: 1,
      status: 'completed',
      createdAt: now,
      completedAt: now - 1000,
    };
    const old: Goal = {
      ...recent,
      id: '2',
      completedAt: now - 8 * 24 * 60 * 60 * 1000,
    };
    expect(isRecentCompletion(recent, now)).toBe(true);
    expect(isRecentCompletion(old, now)).toBe(false);
  });
});
