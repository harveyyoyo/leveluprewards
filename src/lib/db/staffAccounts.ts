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
};

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export const addStaffAccount = async (
  firestore: Firestore,
  schoolId: string,
  input: StaffAccountInput
): Promise<StaffAccount> => {
  const id = `sa_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const username = normalizeUsername(input.username);
  const account: StaffAccount = {
    id,
    username,
    passcode: input.passcode.trim(),
    displayName: input.displayName.trim(),
    role: input.role,
    roles: input.roles?.length ? Array.from(new Set(input.roles)) : [input.role],
  };
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
  account: StaffAccount
): Promise<void> => {
  const ref = doc(firestore, 'schools', schoolId, 'staffAccounts', account.id);
  const payload: StaffAccount = {
    ...account,
    username: normalizeUsername(account.username),
    passcode: account.passcode.trim(),
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
