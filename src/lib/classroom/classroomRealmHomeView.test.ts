import { describe, expect, it } from 'vitest';
import {
  classroomRealmHomePhase,
  shouldLatchClassroomCommandCenter,
} from './classroomRealmHomeView';

const readyInput = {
  classroomOn: true,
  staffOk: true,
  canReadRoster: true,
  studentsLoading: false,
  classesLoading: false,
};

describe('classroomRealmHomePhase', () => {
  it('stays on the command center after settings or roster refetch', () => {
    expect(
      classroomRealmHomePhase({
        ...readyInput,
        studentsLoading: true,
        classroomOn: false,
        keepReady: true,
      }),
    ).toBe('ready');
  });

  it('does not treat a refetch as a reason to leave ready', () => {
    expect(shouldLatchClassroomCommandCenter(readyInput)).toBe(true);
    expect(
      shouldLatchClassroomCommandCenter({
        ...readyInput,
        studentsLoading: true,
      }),
    ).toBe(false);
  });

  it('shows loading only before the first ready paint', () => {
    expect(
      classroomRealmHomePhase({
        ...readyInput,
        studentsLoading: true,
        keepReady: false,
      }),
    ).toBe('loading');
  });
});
