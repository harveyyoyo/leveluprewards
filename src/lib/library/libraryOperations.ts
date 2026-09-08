import {
  collection,
  getDocs,
  limit,
  query,
  where,
  type Firestore,
} from 'firebase/firestore';
import { httpsCallable, type Functions } from 'firebase/functions';
import type { LibraryItem } from '@/lib/types';
import { getIsbnLookupVariants } from '@/lib/library/libraryCatalogLookup';
import { normalizeLibraryUpc } from '@/lib/library/libraryScanCode';
import { type LibraryPolicySettings } from '@/lib/library/libraryPolicy';

export type LibraryCheckoutResult =
  | { action: 'checkout'; item: LibraryItem; itemId: string; dueAt?: number | null }
  | { action: 'return'; item: LibraryItem; itemId: string; pointsDelta?: number; pointsMessage?: string }
  | { action: 'wrong_borrower'; item: LibraryItem; borrowerName?: string }
  | { action: 'limit_reached'; currentCount: number; max: number }
  | { action: 'not_found' }
  | { action: 'already_done' };

export type LibraryReturnServerResult = {
  success: boolean;
  message?: string;
  pointsDelta?: number;
  daysOverdue?: number;
};

function catalogLookupCodes(rawCode: string): string[] {
  const codes = new Set<string>();
  const normalized = normalizeLibraryUpc(rawCode);
  if (normalized) codes.add(normalized);
  for (const variant of getIsbnLookupVariants(rawCode)) {
    const code = normalizeLibraryUpc(variant);
    if (code) codes.add(code);
  }
  return [...codes];
}

export async function findLibraryItemByUpc(
  firestore: Firestore,
  schoolId: string,
  rawCode: string,
): Promise<{ item: LibraryItem; itemId: string } | null> {
  const codes = catalogLookupCodes(rawCode);
  if (!codes.length) return null;
  for (const upc of codes) {
    const snap = await getDocs(
      query(collection(firestore, 'schools', schoolId, 'library'), where('upc', '==', upc), limit(1)),
    );
    if (!snap.empty) {
      const itemDoc = snap.docs[0];
      return { item: { id: itemDoc.id, ...itemDoc.data() } as LibraryItem, itemId: itemDoc.id };
    }
  }
  return null;
}

export async function getStudentLibraryCheckouts(
  firestore: Firestore,
  schoolId: string,
  studentId: string,
): Promise<LibraryItem[]> {
  const snap = await getDocs(
    query(collection(firestore, 'schools', schoolId, 'library'), where('checkedOutTo', '==', studentId)),
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as LibraryItem)
    .filter((item) => item.status === 'checked_out');
}

export async function countStudentLibraryCheckouts(
  firestore: Firestore,
  schoolId: string,
  studentId: string,
): Promise<number> {
  const items = await getStudentLibraryCheckouts(firestore, schoolId, studentId);
  return items.length;
}

// Keep a request ID after uncertain failures so a user retry cannot duplicate a write.
const pendingRequests = new Map<string, string>();
export async function callLibrary<T>(functions: Functions | null | undefined, endpoint: string, payload: Record<string, unknown>): Promise<T> {
  if (!functions) throw new Error('Library connection is not ready. Please try again.');
  const key = endpoint + JSON.stringify(payload);
  const requestId = pendingRequests.get(key) ?? crypto.randomUUID();
  pendingRequests.set(key, requestId);
  try {
    const result = await httpsCallable<Record<string, unknown>, T>(functions, endpoint)({ ...payload, requestId });
    pendingRequests.delete(key);
    return result.data;
  } catch (error) {
    const code = (error as { code?: string }).code ?? '';
    if (!['functions/unavailable', 'functions/deadline-exceeded', 'functions/internal', 'functions/unknown'].includes(code)) pendingRequests.delete(key);
    throw error;
  }
}

export async function performLibraryCheckoutOrReturn(
  firestore: Firestore, schoolId: string, studentId: string, rawCode: string,
  options?: {
    policy?: LibraryPolicySettings;
    functions?: Functions | null;
    action?: 'checkout' | 'return' | 'auto';
    allowCrossReturn?: boolean;
  },
): Promise<LibraryCheckoutResult> {
  const found = await findLibraryItemByUpc(firestore, schoolId, rawCode);
  if (!found || found.item.archived) return { action: 'not_found' };
  const { item, itemId } = found;

  let action = options?.action ?? 'auto';

  // Smart Auto-Detect: Determine borrow vs return based on item status and borrower
  if (action === 'auto') {
    if (item.status === 'checked_out') {
      if (item.checkedOutTo === studentId) {
        // The student has this book borrowed -> return it
        action = 'return';
      } else if (options?.allowCrossReturn) {
        // Drop box / cross return: return on behalf of whoever has it
        action = 'return';
      } else {
        // Checked out to someone else: send checkout to let server report wrong_borrower
        action = 'checkout';
      }
    } else {
      // Book is available in library -> check out (borrow)
      action = 'checkout';
    }
  }

  const effectiveStudentId =
    action === 'return' && item.checkedOutTo && options?.allowCrossReturn
      ? item.checkedOutTo
      : studentId;

  return callLibrary<LibraryCheckoutResult>(options?.functions, 'libraryCirculation', {
    schoolId, studentId: effectiveStudentId, itemId, action,
    expectedLoanId: item.activeLoanId ?? null,
    expectedCheckedOutAt: item.checkedOutAt ?? null,
  });
}

export async function forceReturnLibraryItem(
  _firestore: Firestore, schoolId: string, item: LibraryItem,
  options?: { policy?: LibraryPolicySettings; functions?: Functions | null },
): Promise<LibraryReturnServerResult> {
  if (!item.checkedOutTo || item.status !== 'checked_out') return { success: true, message: 'Already returned.' };
  const result = await callLibrary<LibraryReturnServerResult & { action?: string }>(options?.functions, 'libraryCirculation', {
    schoolId, action: 'return', itemId: item.id, studentId: item.checkedOutTo,
    expectedLoanId: item.activeLoanId ?? null, expectedCheckedOutAt: item.checkedOutAt ?? null,
  });
  if (result.action === 'wrong_borrower') throw new Error('The borrower changed. Refresh this copy and try again.');
  return result;
}
