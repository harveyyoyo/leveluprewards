import { describe, expect, it } from 'vitest';
import { officeCommonTasks } from '@/lib/office/officeCommonTasks';
import type { OfficeAuditLogEntry } from '@/lib/office/types';

const entry = (over: Partial<OfficeAuditLogEntry>): OfficeAuditLogEntry => ({
  id: Math.random().toString(36),
  entityType: 'officeStudent',
  entityId: 'x',
  action: 'create',
  summary: '',
  changedBy: 'Ms. Lee',
  changedAt: 0,
  ...over,
});

const all = () => true;

describe('officeCommonTasks', () => {
  it('ranks this person’s jobs, counting one save of many rows once', () => {
    const history = [
      // One attendance save for a whole class: many rows in the same minute.
      ...Array.from({ length: 20 }, () => entry({ entityType: 'officeAttendanceEntry', changedAt: 60_000 })),
      entry({ entityType: 'officeInvoice', changedAt: 1 * 3_600_000 }),
      entry({ entityType: 'officeInvoice', changedAt: 2 * 3_600_000 }),
      // Someone else's work doesn't count.
      ...Array.from({ length: 5 }, (_, i) => entry({ entityType: 'officeTeacher', changedBy: 'Mr. Park', changedAt: i * 3_600_000 })),
    ];
    const { tasks, fromHistory } = officeCommonTasks(history, 'ms. lee', all);
    expect(fromHistory).toBe(true);
    expect(tasks.slice(0, 2)).toEqual(['new-invoice', 'take-attendance']);
    expect(tasks).not.toContain('add-teacher');
    expect(tasks).toHaveLength(4);
  });

  it('offers everyday defaults with no history, leaving out sections this person can’t use', () => {
    const { tasks, fromHistory } = officeCommonTasks([], 'Ms. Lee', (section) => section !== 'billing');
    expect(fromHistory).toBe(false);
    expect(tasks).toEqual(['add-student', 'take-attendance', 'record-grades']);
  });
});
