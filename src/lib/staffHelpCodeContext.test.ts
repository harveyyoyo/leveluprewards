import { describe, expect, it } from 'vitest';
import {
  buildStaffHelpCodeContextBlock,
  extractStaffHelpKeywords,
  isAllowedStaffHelpSourcePath,
  selectStaffHelpSourcePaths,
} from './staffHelpCodeContext';

describe('staffHelpCodeContext', () => {
  it('denies sensitive and test paths', () => {
    expect(isAllowedStaffHelpSourcePath('src/app/api/staff-help-chat/route.ts')).toBe(false);
    expect(isAllowedStaffHelpSourcePath('.env.local')).toBe(false);
    expect(isAllowedStaffHelpSourcePath('src/lib/foo.test.ts')).toBe(false);
    expect(isAllowedStaffHelpSourcePath('src/app/developer/page.tsx')).toBe(false);
  });

  it('allows staff-facing app sources', () => {
    expect(isAllowedStaffHelpSourcePath('src/app/[schoolId]/admin/page.tsx')).toBe(true);
    expect(isAllowedStaffHelpSourcePath('src/components/StaffAiHelpButton.tsx')).toBe(true);
  });

  it('extracts multi-word feature phrases', () => {
    const keys = extractStaffHelpKeywords('How do I set up SMS notifications for parents?');
    expect(keys.some((k) => k.includes('notification'))).toBe(true);
    expect(keys).toContain('sms');
  });

  it('prefers notifications tab sources for notification questions', () => {
    const paths = selectStaffHelpSourcePaths({
      pathname: '/demo-school/admin',
      userMessage: 'enable whatsapp notifications for parents',
    });
    expect(paths.some((p) => p.includes('AdminNotificationsTab'))).toBe(true);
  });

  it('uses pathname for route-level files', () => {
    const paths = selectStaffHelpSourcePaths({
      pathname: '/demo-school/teacher',
      userMessage: 'print coupons',
    });
    expect(paths[0]).toBe('src/app/[schoolId]/teacher/page.tsx');
  });

  it('builds a non-empty context block when sources exist', () => {
    const { block, files } = buildStaffHelpCodeContextBlock({
      pathname: '/demo-school/admin',
      userMessage: 'library checkout barcode',
    });
    expect(files.length).toBeGreaterThan(0);
    expect(block).toContain('Repository excerpts');
    expect(block).toContain('AdminLibraryTab');
  });
});
