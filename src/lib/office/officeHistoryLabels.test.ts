import { describe, expect, it } from 'vitest';
import { officeHistoryChanges, officeHistoryDayLabel, officeHistoryGroup } from '@/lib/office/officeHistoryLabels';

describe('officeHistoryChanges', () => {
  it('lists only fields that changed, in plain words, with money formatted', () => {
    const changes = officeHistoryChanges({
      before: { label: 'Tuition', amountCents: 125000, updatedAt: 1 },
      after: { label: 'Tuition', amountCents: 25000, updatedAt: 2 },
    });
    expect(changes).toEqual([{ field: 'Amount', before: '$1250.00', after: '$250.00' }]);
  });

  it('shows every field for a newly added record', () => {
    const changes = officeHistoryChanges({ before: null, after: { firstName: 'Ann', archived: false } });
    expect(changes.map((c) => c.field)).toEqual(['First name', 'Removed']);
  });
});

describe('officeHistoryGroup', () => {
  it('puts payments under Billing, families under Students, and bus records under Transportation', () => {
    expect(officeHistoryGroup({ entityType: 'officePayment' })).toBe('billing');
    expect(officeHistoryGroup({ entityType: 'officeFamily' })).toBe('students');
    expect(officeHistoryGroup({ entityType: 'officeBusRoute' })).toBe('transportation');
    expect(officeHistoryGroup({ entityType: 'officeBusTrip' })).toBe('transportation');
  });
});

describe('officeHistoryDayLabel', () => {
  it('says Today and Yesterday', () => {
    const now = new Date(2026, 8, 23, 12).getTime();
    expect(officeHistoryDayLabel(now - 60_000, now)).toBe('Today');
    expect(officeHistoryDayLabel(now - 86_400_000, now)).toBe('Yesterday');
  });
});
