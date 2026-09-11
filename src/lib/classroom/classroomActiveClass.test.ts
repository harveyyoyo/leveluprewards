import { afterEach, describe, expect, it } from 'vitest';
import {
  pickClassroomActiveClass,
  readClassroomActiveClass,
  rememberClassroomActiveClass,
} from './classroomActiveClass';

describe('classroomActiveClass', () => {
  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('remembers a class and reads it back', () => {
    rememberClassroomActiveClass('grade-4a');
    expect(readClassroomActiveClass()).toBe('grade-4a');
    expect(localStorage.getItem('defaultClassId')).toBe('grade-4a');
  });

  it('picks the remembered class when it still exists', () => {
    rememberClassroomActiveClass('b');
    expect(pickClassroomActiveClass([{ id: 'a' }, { id: 'b' }])).toBe('b');
  });

  it('falls back to the first class when the remembered one is gone', () => {
    rememberClassroomActiveClass('gone');
    expect(pickClassroomActiveClass([{ id: 'a' }, { id: 'b' }])).toBe('a');
  });

  it('prefers an explicit class id from the URL', () => {
    rememberClassroomActiveClass('a');
    expect(pickClassroomActiveClass([{ id: 'a' }, { id: 'b' }], 'b')).toBe('b');
  });
});
