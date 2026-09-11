import { describe, expect, it } from 'vitest';
import { buildClassroomPairPath, classroomPairAbsoluteUrl } from './classroomScreenPairUrl';

describe('buildClassroomPairPath', () => {
  it('pairs the student mirror to the fullscreen class screen', () => {
    const path = buildClassroomPairPath({
      schoolId: 'schoolabc',
      classId: 'grade-4a',
      scope: 'admin',
      target: 'mirror',
    });
    expect(path).toContain('/schoolabc/classroom-screen');
    expect(path).toContain('classId=grade-4a');
    expect(path).not.toContain('/classroom-realm/class-screen');
  });

  it('pairs the teacher board to the leftover live monitor, not the legacy /classroom redirect', () => {
    const path = buildClassroomPairPath({
      schoolId: 'schoolabc',
      classId: 'grade-4a',
      scope: 'admin',
      target: 'live',
    });
    expect(path).toContain('/schoolabc/classroom-realm/live');
    expect(path).toContain('classId=grade-4a');
    expect(path).not.toMatch(/\/schoolabc\/classroom(\?|$)/);
  });
});

describe('classroomPairAbsoluteUrl', () => {
  it('prefixes the current origin when provided', () => {
    expect(classroomPairAbsoluteUrl('/schoolabc/classroom-realm/live', 'http://127.0.0.1:3004')).toBe(
      'http://127.0.0.1:3004/schoolabc/classroom-realm/live',
    );
  });
});
