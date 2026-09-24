import type { OfficeBusRoute, OfficeBusTrip } from '@/lib/office/types';

const PACKET_VERSION = 1;
const MAX_PACKET_LENGTH = 250_000;
const MAX_PACKET_AGE_MS = 24 * 60 * 60 * 1000;

export type OfficeDriverOfflinePacket = {
  version: typeof PACKET_VERSION;
  savedAt: number;
  schoolId: string;
  trip: OfficeBusTrip;
  route: OfficeBusRoute;
};

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function key(schoolId: string): string {
  return `office-driver-offline:${schoolId.trim().toLowerCase()}`;
}

function isPacket(value: unknown, schoolId: string): value is OfficeDriverOfflinePacket {
  if (!value || typeof value !== 'object') return false;
  const packet = value as Partial<OfficeDriverOfflinePacket>;
  const savedAt = packet.savedAt;
  if (packet.version !== PACKET_VERSION || packet.schoolId !== schoolId || typeof savedAt !== 'number' || !Number.isFinite(savedAt)) return false;
  if (savedAt > Date.now() + 5 * 60_000 || Date.now() - savedAt > MAX_PACKET_AGE_MS) return false;
  const trip = packet.trip;
  const route = packet.route;
  if (!trip || typeof trip !== 'object' || trip.status !== 'active') return false;
  if (!route || typeof route !== 'object' || !Array.isArray(route.stops)) return false;
  if (typeof trip.id !== 'string' || typeof trip.routeId !== 'string' || trip.routeId !== route.id || (trip.run !== 'am' && trip.run !== 'pm') || !Number.isFinite(trip.startedAt)) return false;
  if (typeof route.id !== 'string' || typeof route.name !== 'string' || !route.name.trim() || !/^#[0-9a-f]{6}$/i.test(route.color) || route.stops.length > 100) return false;
  if (route.stops.some((stop) => !stop || typeof stop.id !== 'string' || typeof stop.name !== 'string' || !Number.isFinite(stop.lat) || !Number.isFinite(stop.lng) || stop.lat < -90 || stop.lat > 90 || stop.lng < -180 || stop.lng > 180)) return false;
  if (trip.riderManifest != null && (!Array.isArray(trip.riderManifest) || trip.riderManifest.length > 300 || trip.riderManifest.some((entry) => !entry || typeof entry.studentId !== 'string' || typeof entry.displayName !== 'string'))) return false;
  return true;
}

/** Save a read-only copy for this tab only. No rider or trip changes are made here. */
export function saveDriverOfflinePacket(schoolId: string, trip: OfficeBusTrip, route: OfficeBusRoute): boolean {
  const store = storage();
  if (!store || trip.status !== 'active') return false;
  const packet: OfficeDriverOfflinePacket = { version: PACKET_VERSION, savedAt: Date.now(), schoolId, trip, route };
  try {
    const serialized = JSON.stringify(packet);
    if (serialized.length > MAX_PACKET_LENGTH) return false;
    store.setItem(key(schoolId), serialized);
    return true;
  } catch {
    return false;
  }
}

export function readDriverOfflinePacket(schoolId: string): OfficeDriverOfflinePacket | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(key(schoolId));
    if (!raw || raw.length > MAX_PACKET_LENGTH) return null;
    const value: unknown = JSON.parse(raw);
    return isPacket(value, schoolId) ? value : null;
  } catch {
    return null;
  }
}

export function clearDriverOfflinePacket(schoolId: string): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(key(schoolId));
  } catch {
    // A private browsing session may refuse storage access; the live run is unaffected.
  }
}
