import { collection, doc, setDoc, updateDoc, deleteDoc, Firestore } from 'firebase/firestore';
import type { StaffAccount, StaffAccountRole } from '../types';
import { reportFirestorePermissionError } from '@/firebase/error-emitter';
import { removeUndefined } from './helpers';

export type StaffAccountInput = {
  username: string;
  passcode: string;
  displayName: string;
  role: StaffAccountRole;
  roles?: StaffAccountRole[];
  email?: string;
  phone?: string;
};

/** Matches the shape returned by `useAuthFetch()` / `authFetch`. */
export type AuthFetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

/**
 * Hashes and stores a staff account's passcode server-side (never written to
 * Firestore in plaintext from the client - see /api/office/staff-passcode).
 */
async function setStaffPasscode(
  authFetch: AuthFetchFn,
  schoolId: string,
  accountId: string,
  passcode: string,
): Promise<void> {
  const res = await authFetch('/api/office/staff-passcode', {
    method: 'POST',
    body: JSON.stringify({ schoolId, accountId, passcode }),
  });
  if (!res.ok) {
    let message = 'Could not set the staff passcode.';
    try {
      const data = (await res.json()) as { error?: string };
      if (typeof data.error === 'string' && data.error.trim()) message = data.error.trim();
    } catch {
      // ignore
    }
    throw new Error(message);
  }
}

export const addStaffAccount = async (
  firestore: Firestore,
  schoolId: string,
  input: StaffAccountInput,
  authFetch: AuthFetchFn,
): Promise<StaffAccount> => {
  const id = `sa_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const username = normalizeUsername(input.username);
  const account: Omit<StaffAccount, 'passcode'> = {
    id,
    username,
    displayName: input.displayName.trim(),
    role: input.role,
    roles: input.roles?.length ? Array.from(new Set(input.roles)) : [input.role],
    email: input.email?.trim(),
    phone: input.phone?.trim(),
  };
  await setStaffPasscode(authFetch, schoolId, id, input.passcode.trim());
  const ref = doc(firestore, 'schools', schoolId, 'staffAccounts', id);
  try {
    await setDoc(ref, removeUndefined(account as unknown as Record<string, unknown>));
  } catch (error) {
    reportFirestorePermissionError(error, { path: ref.path, operation: 'create', requestResourceData: account });
    throw error;
  }
  return account;
};

export const updateStaffAccount = async (
  firestore: Firestore,
  schoolId: string,
  account: StaffAccount,
  authFetch: AuthFetchFn,
  /** Only rotate the stored passcode when the admin actually typed a new one. */
  newPasscode?: string,
): Promise<void> => {
  if (newPasscode?.trim()) {
    await setStaffPasscode(authFetch, schoolId, account.id, newPasscode.trim());
  }
  const ref = doc(firestore, 'schools', schoolId, 'staffAccounts', account.id);
  const { passcode: _passcode, ...rest } = account;
  const payload: Omit<StaffAccount, 'passcode'> = {
    ...rest,
    username: normalizeUsername(account.username),
    displayName: account.displayName.trim(),
    roles: account.roles?.length ? Array.from(new Set(account.roles)) : [account.role],
  };
  try {
    await updateDoc(ref, removeUndefined(payload as unknown as Record<string, unknown>));
  } catch (error) {
    reportFirestorePermissionError(error, { path: ref.path, operation: 'update', requestResourceData: payload });
    throw error;
  }
};

export const deleteStaffAccount = async (firestore: Firestore, schoolId: string, accountId: string): Promise<void> => {
  const ref = doc(firestore, 'schools', schoolId, 'staffAccounts', accountId);
  try {
    await deleteDoc(ref);
  } catch (error) {
    reportFirestorePermissionError(error, { path: ref.path, operation: 'delete' });
    throw error;
  }
};

export function staffAccountsCollectionRef(firestore: Firestore, schoolId: string) {
  return collection(firestore, 'schools', schoolId, 'staffAccounts');
}
