import { createHash } from 'node:crypto';

/**
 * One arrival event per school, trip, and stop. The same stop can be confirmed
 * by a tracker first and by a driver's phone or button afterward; using one
 * stable id keeps that from sending duplicate family messages.
 */
export function officeArrivalEventId(schoolId: string, tripId: string, stopId: string): string {
  const digest = createHash('sha256').update(`${schoolId}|${tripId}|${stopId}`).digest('hex').slice(0, 48);
  return `arr_${digest}`;
}
