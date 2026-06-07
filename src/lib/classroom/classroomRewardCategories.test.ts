import { describe, expect, it } from 'vitest';
import {
  classroomTeacherCategoryKey,
  displayCategoryKey,
  isTeacherScopedCategoryKey,
  teacherIdFromCategoryKey,
} from './classroomRewardCategories';

describe('classroomRewardCategories', () => {
  it('builds and parses teacher-scoped keys', () => {
    const key = classroomTeacherCategoryKey('t1', 'Quick award');
    expect(isTeacherScopedCategoryKey(key)).toBe(true);
    expect(teacherIdFromCategoryKey(key)).toBe('t1');
    expect(displayCategoryKey(key)).toBe('Quick award');
  });

  it('leaves plain category names unchanged', () => {
    expect(displayCategoryKey('Good behavior')).toBe('Good behavior');
    expect(isTeacherScopedCategoryKey('Good behavior')).toBe(false);
  });
});
