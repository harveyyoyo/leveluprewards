import { beforeEach, describe, expect, it } from 'vitest';
import { applyClassroomSessionAward, clearClassroomSession, classroomSessionStorageKey, loadClassroomSession } from './classroomSeatingChart';

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
});
