import { describe, expect, it } from 'vitest';
import {
  classroomHref,
  classroomPortalHomeHref,
  classroomRealmHref,
  classroomRealmManageHref,
  isClassroomRealmPath,
} from './classroomRealmUrl';

describe('classroomHref', () => {
  it('opens the live Classroom page', () => {
    expect(classroomHref('SchoolABC')).toBe('/schoolabc/classroom');
    expect(classroomRealmHref('schoolabc', '')).toBe('/schoolabc/classroom');
    expect(classroomRealmHref('schoolabc', 'live')).toBe('/schoolabc/classroom');
    expect(classroomRealmHref('schoolabc', 'setup')).toBe('/schoolabc/classroom');
    expect(classroomRealmManageHref('schoolabc', 'behavior')).toBe('/schoolabc/classroom');
  });

  it('opens class screen as the live page for students', () => {
    expect(classroomRealmHref('schoolabc', 'class-screen')).toBe(
      '/schoolabc/classroom?audience=student',
    );
  });

  it('treats classroom and old realm paths as classroom', () => {
    expect(isClassroomRealmPath('/schoolabc/classroom')).toBe(true);
    expect(isClassroomRealmPath('/schoolabc/classroom-realm/live')).toBe(true);
    expect(isClassroomRealmPath('/schoolabc/portal')).toBe(false);
  });

  it('sends Home to the school portal', () => {
    expect(classroomPortalHomeHref('SchoolABC')).toBe('/schoolabc/portal');
  });
});
