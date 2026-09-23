import { firebaseConfig } from '@/firebase/config';

/**
 * Reads School Office records on the server *as the signed-in person*: every request carries their
 * own ID token, so the same Firestore security rules that guard the app (school separation, office
 * access) decide what comes back. Used by Help → Ask when a question needs the assistant to read
 * records — nothing here uses a service account, so it can never see more than the person could.
 */

/** The person can't read School Office records for this school. */
export class OfficeAccessDenied extends Error {
  constructor() {
    super('No School Office access for this school.');
  }
}

type FirestoreValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  nullValue?: null;
  timestampValue?: string;
  mapValue?: { fields?: Record<string, FirestoreValue> };
  arrayValue?: { values?: FirestoreValue[] };
};

export function decodeFirestoreValue(v: FirestoreValue | undefined): unknown {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('mapValue' in v) return decodeFirestoreFields(v.mapValue?.fields);
  if ('arrayValue' in v) return (v.arrayValue?.values ?? []).map(decodeFirestoreValue);
  return null;
}

export function decodeFirestoreFields(fields: Record<string, FirestoreValue> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields ?? {})) out[key] = decodeFirestoreValue(value);
  return out;
}

export function encodeFirestoreValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeFirestoreValue) } };
  if (typeof value === 'object') {
    const fields: Record<string, FirestoreValue> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) fields[k] = encodeFirestoreValue(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function schoolBase(schoolId: string): string {
  const projectId = firebaseConfig.projectId;
  if (!projectId) throw new Error('Firebase project is not configured.');
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/schools/${encodeURIComponent(schoolId)}`;
}

async function failIfDenied(res: Response): Promise<void> {
  if (res.status === 401 || res.status === 403) throw new OfficeAccessDenied();
  if (!res.ok) throw new Error(`Firestore request failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
}

/** One document, or null when it doesn't exist. Throws OfficeAccessDenied when the rules refuse. */
export async function getOfficeDocAsUser(
  idToken: string,
  schoolId: string,
  path: string,
): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${schoolBase(schoolId)}/${path}`, {
    headers: { Authorization: `Bearer ${idToken}` },
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  await failIfDenied(res);
  const body = (await res.json()) as { fields?: Record<string, FirestoreValue> };
  return decodeFirestoreFields(body.fields);
}

export type OfficeQueryFilter = { field: string; op: 'EQUAL' | 'GREATER_THAN_OR_EQUAL'; value: string | number | boolean };

/**
 * Every document in one of the school's collections (optionally filtered), with only `fields`
 * read when given. Throws OfficeAccessDenied when the rules refuse.
 */
export async function queryOfficeCollectionAsUser(
  idToken: string,
  schoolId: string,
  collectionId: string,
  options: { where?: OfficeQueryFilter; fields?: string[] } = {},
): Promise<Array<Record<string, unknown> & { id: string }>> {
  const structuredQuery: Record<string, unknown> = { from: [{ collectionId }] };
  if (options.where) {
    structuredQuery.where = {
      fieldFilter: {
        field: { fieldPath: options.where.field },
        op: options.where.op,
        value: encodeFirestoreValue(options.where.value),
      },
    };
  }
  if (options.fields?.length) {
    structuredQuery.select = { fields: options.fields.map((fieldPath) => ({ fieldPath })) };
  }
  const res = await fetch(`${schoolBase(schoolId)}:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery }),
    cache: 'no-store',
  });
  await failIfDenied(res);
  const rows = (await res.json()) as Array<{ document?: { name: string; fields?: Record<string, FirestoreValue> } }>;
  return rows
    .filter((r) => r.document)
    .map((r) => ({ ...decodeFirestoreFields(r.document!.fields), id: r.document!.name.split('/').pop() ?? '' }));
}

/** Adds one row to the school's change history, as the signed-in person (rules allow create only). */
export async function appendOfficeAuditAsUser(
  idToken: string,
  schoolId: string,
  entry: Record<string, unknown>,
): Promise<void> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(entry)) fields[k] = encodeFirestoreValue(v);
  const res = await fetch(`${schoolBase(schoolId)}/officeAuditLog`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
    cache: 'no-store',
  });
  await failIfDenied(res);
}
