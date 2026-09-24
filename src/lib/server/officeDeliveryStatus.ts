export type OfficeQueueDeliveryState = 'pending' | 'delivered' | 'failed';

export type OfficeQueueDeliverySummary = {
  total: number;
  pending: number;
  delivered: number;
  failed: number;
};

type QueueDocument = {
  id: string;
  data: Record<string, unknown>;
};

function stateFromDocument(data: Record<string, unknown>): OfficeQueueDeliveryState {
  const delivery = data.delivery && typeof data.delivery === 'object' ? data.delivery as Record<string, unknown> : null;
  const raw = [delivery?.state, data.state, data.status]
    .find((value) => typeof value === 'string')
    ?.toString()
    .toLowerCase()
    .trim() ?? '';
  const hasError = [delivery?.error, data.error, data.deliveryMessage]
    .some((value) => typeof value === 'string' && value.trim().length > 0);
  if (hasError || ['failed', 'error', 'failure', 'undelivered', 'rejected'].includes(raw)) return 'failed';
  if (['delivered', 'sent', 'success', 'successful', 'completed'].includes(raw)) return 'delivered';
  return 'pending';
}

/** Summarize only transportation queue records, never exposing recipients or message bodies. */
export function summarizeOfficeDeliveryQueue(documents: QueueDocument[]): Map<string, OfficeQueueDeliverySummary> {
  const summaries = new Map<string, OfficeQueueDeliverySummary>();
  for (const document of documents) {
    const data = document.data;
    if (data.kind !== 'transportation_arrival' || typeof data.arrivalEventId !== 'string' || !data.arrivalEventId) continue;
    const current = summaries.get(data.arrivalEventId) ?? { total: 0, pending: 0, delivered: 0, failed: 0 };
    const state = stateFromDocument(data);
    current.total += 1;
    current[state] += 1;
    summaries.set(data.arrivalEventId, current);
  }
  return summaries;
}
