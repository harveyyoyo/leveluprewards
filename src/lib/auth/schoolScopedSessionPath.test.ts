import { describe, expect, it } from 'vitest';
import { parseSchoolScopedSessionPath } from './schoolScopedSessionPath';

describe('parseSchoolScopedSessionPath', () => {
  it('gates protected school routes', () => {
    expect(parseSchoolScopedSessionPath('/yeshiva/admin')).toEqual({ schoolId: 'yeshiva' });
    expect(parseSchoolScopedSessionPath('/yeshiva/library')).toBeNull();
  });

  it('never treats demo links as a school', () => {
    expect(parseSchoolScopedSessionPath('/demo/admin')).toBeNull();
    expect(parseSchoolScopedSessionPath('/demo/office')).toBeNull();
  });
});
