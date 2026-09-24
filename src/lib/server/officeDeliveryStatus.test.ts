// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { summarizeOfficeDeliveryQueue } from './officeDeliveryStatus';

describe('Office delivery queue summary', () => {
  it('counts only bus queue records and keeps recipient details out of the summary', () => {
    const summaries = summarizeOfficeDeliveryQueue([
      { id: 'mail-1', data: { kind: 'transportation_arrival', arrivalEventId: 'event-1', delivery: { state: 'delivered' }, to: 'parent@example.com' } },
      { id: 'sms-1', data: { kind: 'transportation_arrival', arrivalEventId: 'event-1', status: 'pending', to: '+15550000001' } },
      { id: 'whatsapp-1', data: { kind: 'transportation_arrival', arrivalEventId: 'event-1', delivery: { state: 'failed' }, to: '+15550000001' } },
      { id: 'other-1', data: { kind: 'reward', arrivalEventId: 'event-1', delivery: { state: 'delivered' } } },
    ]);

    expect(summaries.get('event-1')).toEqual({ total: 3, pending: 1, delivered: 1, failed: 1 });
    expect(summaries.has('event-2')).toBe(false);
  });

  it('treats unknown queue states as waiting rather than delivered', () => {
    const summaries = summarizeOfficeDeliveryQueue([
      { id: 'mail-1', data: { kind: 'transportation_arrival', arrivalEventId: 'event-1' } },
    ]);
    expect(summaries.get('event-1')).toEqual({ total: 1, pending: 1, delivered: 0, failed: 0 });
  });
});
