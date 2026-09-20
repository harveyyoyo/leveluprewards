import { beforeEach, describe, expect, it } from 'vitest';
import { applyClassroomSessionAward, clearClassroomSession, classroomSessionStorageKey, loadClassroomSession, setClassroomSessionRandomPick, setClassroomSessionRaffleProjector, setClassroomSessionRollMarks } from './classroomSeatingChart';

describe('daily classroom session sharing', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
  it('allows a new tab with empty session storage to read awards', () => {
    applyClassroomSessionAward('school', 'teacher', 'class', ['student'], 5, 'Effort');
    sessionStorage.clear();
    expect(loadClassroomSession('school', 'teacher', 'class').totals).toEqual({ student: 5 });
    expect(loadClassroomSession('school', 'admin', 'class').totals).toEqual({});
    expect(loadClassroomSession('school', 'teacher', 'other').totals).toEqual({});
    clearClassroomSession('school', 'teacher', 'class');
    expect(loadClassroomSession('school', 'teacher', 'class').totals).toEqual({});
  });
  it('preserves legacy tab totals until the next shared save', () => {
    sessionStorage.setItem(classroomSessionStorageKey('school', 'teacher', 'class'), JSON.stringify({ totals: { student: 3 } }));
    applyClassroomSessionAward('school', 'teacher', 'class', ['student'], 2, 'Effort');
    sessionStorage.clear();
    expect(loadClassroomSession('school', 'teacher', 'class').totals.student).toBe(5);
  });

  it('shares a random pick with the class screen session', () => {
    setClassroomSessionRandomPick('school', 'teacher', 'class', {
      studentId: 'maya',
      winnerId: 'maya',
      label: 'Maya',
      at: 1,
    });
    expect(loadClassroomSession('school', 'teacher', 'class').randomPick?.winnerId).toBe('maya');
  });

  it('shares a raffle projector draw with the class screen session', () => {
    setClassroomSessionRaffleProjector('school', 'teacher', 'class', {
      show: true,
      mode: 'jackpot',
      pool: [{ id: 'maya', name: 'Maya' }],
      winnerId: 'maya',
      winnerName: 'Maya',
      spinId: 9,
    });
    expect(loadClassroomSession('school', 'teacher', 'class').raffleProjector).toEqual({
      show: true,
      mode: 'jackpot',
      pool: [{ id: 'maya', name: 'Maya' }],
      winnerId: 'maya',
      winnerName: 'Maya',
      spinId: 9,
    });
  });

  it('clears classroom roll marks for a new class', () => {
    setClassroomSessionRollMarks('school', 'teacher', 'class', { a: 'present', b: 'absent' });
    expect(loadClassroomSession('school', 'teacher', 'class').rollMarks).toEqual({ a: 'present', b: 'absent' });
    setClassroomSessionRollMarks('school', 'teacher', 'class', null);
    expect(loadClassroomSession('school', 'teacher', 'class').rollMarks).toBeUndefined();
  });
});
