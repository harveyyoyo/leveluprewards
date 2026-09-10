import { describe, expect, it } from 'vitest';
import {
  classroomRealmHomePhase,
  classroomRealmHomeUi,
  shouldLatchClassroomRealmHub,
} from './classroomRealmHomeView';

describe('classroomRealmHomeUi', () => {
  it('keeps the leftover realm hub, not the seating-chart command center', () => {
    expect(classroomRealmHomeUi()).toBe('leftover-realm-hub');
    expect(classroomRealmHomeUi()).not.toBe('command-center');
  });
});

describe('classroomRealmHomePhase', () => {
  it('stays on the leftover hub after settings refetch', () => {
    expect(
      classroomRealmHomePhase({
        classroomOn: false,
        keepHub: true,
      }),
    ).toBe('hub');
  });

  it('latches the hub once Classroom is on', () => {
    expect(shouldLatchClassroomRealmHub(true)).toBe(true);
    expect(shouldLatchClassroomRealmHub(false)).toBe(false);
  });

  it('shows the off state only before the hub has painted', () => {
    expect(classroomRealmHomePhase({ classroomOn: false, keepHub: false })).toBe('off');
    expect(classroomRealmHomePhase({ classroomOn: true, keepHub: false })).toBe('hub');
  });
});
