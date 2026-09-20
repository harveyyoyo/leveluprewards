import { describe, expect, it } from 'vitest';
import { parseSchoolScopedSessionPath } from './schoolScopedSessionPath';

describe('parseSchoolScopedSessionPath', () => {
  it('does not gate public sample school student kiosk at the edge', () => {
    expect(parseSchoolScopedSessionPath('/schoolabc/student')).toBeNull();
    expect(parseSchoolScopedSessionPath('/yeshiva/student')).toBeNull();
  });

  it('gates non-sample school student kiosks at the edge', () => {
    expect(parseSchoolScopedSessionPath('/customschool/student')).toEqual({ schoolId: 'customschool' });
  });

  it('gates portal and staff routes even for public sample schools', () => {
    expect(parseSchoolScopedSessionPath('/schoolabc/portal')).toEqual({ schoolId: 'schoolabc' });
    expect(parseSchoolScopedSessionPath('/schoolabc/admin')).toEqual({ schoolId: 'schoolabc' });
  });

  it('ignores non-school routes', () => {
    expect(parseSchoolScopedSessionPath('/login')).toBeNull();
    expect(parseSchoolScopedSessionPath('/developer')).toBeNull();
    expect(parseSchoolScopedSessionPath('/api/test')).toBeNull();
  });
});
