import { describe, expect, it } from 'vitest';
import { schoolPathAllowedByGate } from './schoolGatePathPolicy';

describe('schoolPathAllowedByGate', () => {
  const sid = 'demo-school';

  it('allows developer for any section', () => {
    expect(schoolPathAllowedByGate(`/${sid}/admin`, sid, new Set(['dev']))).toBe(true);
    expect(schoolPathAllowedByGate(`/${sid}/hall-of-fame`, sid, new Set(['dev']))).toBe(true);
  });

  it('admin section: school portal or prize clerk or admin', () => {
    expect(schoolPathAllowedByGate(`/${sid}/admin`, sid, new Set(['portal']))).toBe(true);
    expect(schoolPathAllowedByGate(`/${sid}/admin`, sid, new Set(['prizeClerk']))).toBe(true);
    expect(schoolPathAllowedByGate(`/${sid}/admin`, sid, new Set(['admin']))).toBe(true);
    expect(schoolPathAllowedByGate(`/${sid}/admin`, sid, new Set(['teacher']))).toBe(false);
  });

  it('teacher root is open; subpaths need teacher or admin', () => {
    expect(schoolPathAllowedByGate(`/${sid}/teacher`, sid, new Set(['kiosk']))).toBe(true);
    expect(schoolPathAllowedByGate(`/${sid}/teacher/print`, sid, new Set(['kiosk']))).toBe(false);
    expect(schoolPathAllowedByGate(`/${sid}/teacher/print`, sid, new Set(['teacher']))).toBe(true);
  });

  it('hall of fame is staff-only', () => {
    expect(schoolPathAllowedByGate(`/${sid}/hall-of-fame`, sid, new Set(['kiosk']))).toBe(false);
    expect(schoolPathAllowedByGate(`/${sid}/hall-of-fame`, sid, new Set(['teacher']))).toBe(true);
  });

  it('default hub routes for kiosk', () => {
    expect(schoolPathAllowedByGate(`/${sid}/student`, sid, new Set(['kiosk']))).toBe(true);
    expect(schoolPathAllowedByGate(`/${sid}/portal`, sid, new Set(['portal']))).toBe(true);
    expect(schoolPathAllowedByGate(`/${sid}/portal`, sid, new Set(['kiosk']))).toBe(false);
  });

  it('student home allows studentPortal scope only', () => {
    expect(schoolPathAllowedByGate(`/${sid}/student-home`, sid, new Set(['studentPortal']))).toBe(
      true,
    );
    expect(schoolPathAllowedByGate(`/${sid}/student`, sid, new Set(['studentPortal']))).toBe(false);
    expect(schoolPathAllowedByGate(`/${sid}/admin`, sid, new Set(['studentPortal']))).toBe(false);
  });
});
