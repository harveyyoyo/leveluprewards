export type TransportParentArrivalPreferences = {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  updatedAt: number;
};

export type TransportParentBus = {
  routeId: string;
  busLabel: string;
  run: 'am' | 'pm' | null;
  state: 'not_started' | 'on_way' | 'delayed' | 'arrived' | 'ended' | 'unavailable';
  message: string;
  nextStopName: string | null;
  etaMinutes: number | null;
  familyStops: Array<{ name: string; morningTime: string | null; afternoonTime: string | null }>;
  lastUpdateAt: number | null;
  stale: boolean;
};

export type TransportParentStatus = {
  familyName: string;
  arrivalPreferences: TransportParentArrivalPreferences;
  buses: TransportParentBus[];
  timeZone: string | null;
  checkedAt: number;
};

export class TransportParentClientError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'TransportParentClientError';
    this.status = status;
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new TransportParentClientError(data.error || 'Private bus status is temporarily unavailable.', response.status);
  return data;
}

export async function signInTransportParent(schoolId: string, code: string) {
  const response = await fetch('/api/office/transport/parent-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ schoolId, code: code.trim() }),
  });
  return readJson<{ ok: boolean; expiresAt: number }>(response);
}

export async function fetchTransportParentStatus(schoolId: string) {
  const response = await fetch(`/api/office/transport/parent-status?schoolId=${encodeURIComponent(schoolId)}`, {
    credentials: 'same-origin',
    cache: 'no-store',
  });
  return readJson<TransportParentStatus>(response);
}

export async function updateTransportParentPreferences(
  schoolId: string,
  preferences: Pick<TransportParentArrivalPreferences, 'email' | 'sms' | 'whatsapp'>,
) {
  const response = await fetch('/api/office/transport/parent-preferences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ schoolId, ...preferences }),
  });
  return readJson<{ ok: boolean; arrivalPreferences: TransportParentArrivalPreferences }>(response);
}

export async function signOutTransportParent() {
  const response = await fetch('/api/office/transport/parent-session', {
    method: 'DELETE',
    credentials: 'same-origin',
  });
  return readJson<{ ok: boolean }>(response);
}
