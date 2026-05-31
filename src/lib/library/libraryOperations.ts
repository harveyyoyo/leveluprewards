import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
  type Firestore,
} from 'firebase/firestore';
import { httpsCallable, type Functions } from 'firebase/functions';
import type { LibraryItem } from '@/lib/types';
import { normalizeLibraryUpc } from '@/lib/library/libraryScanCode';
import { computeDueAt, libraryReturnUsesServer, type LibraryPolicySettings } from '@/lib/library/libraryPolicy';

export type LibraryCheckoutResult =
  | { action: 'checkout'; item: LibraryItem; itemId: string; dueAt?: number | null }
  | { action: 'return'; item: LibraryItem; itemId: string; pointsDelta?: number; pointsMessage?: string }
  | { action: 'wrong_borrower'; item: LibraryItem; borrowerName?: string }
  | { action: 'not_found' };

export type LibraryReturnServerResult = {
  success: boolean;
  message?: string;
  pointsDelta?: number;
  daysOverdue?: number;
};

export async function findLibraryItemByUpc(
  firestore: Firestore,
  schoolId: string,
  rawCode: string,
): Promise<{ item: LibraryItem; itemId: string } | null> {
  const upc = normalizeLibraryUpc(rawCode);
  if (!upc) return null;
  const snap = await getDocs(
    query(collection(firestore, 'schools', schoolId, 'library'), where('upc', '==', upc), limit(1)),
  );
  if (snap.empty) return null;
  const itemDoc = snap.docs[0];
  return { item: { id: itemDoc.id, ...itemDoc.data() } as LibraryItem, itemId: itemDoc.id };
}

function shouldUseServerReturn(policy?: LibraryPolicySettings): boolean {
  return libraryReturnUsesServer(policy);
}

async function clientCheckout(
  firestore: Firestore,
  schoolId: string,
  studentId: string,
  item: LibraryItem,
  itemId: string,
  policy?: LibraryPolicySettings,
): Promise<LibraryCheckoutResult> {
  const checkedOutAt = Date.now();
  const dueAt =
    policy && policy.loanPeriodDays > 0 ? computeDueAt(checkedOutAt, policy.loanPeriodDays) : null;

  await updateDoc(doc(firestore, 'schools', schoolId, 'library', itemId), {
    status: 'checked_out',
    checkedOutTo: studentId,
    checkedOutAt,
    dueAt,
  });
  await addDoc(collection(firestore, 'schools', schoolId, 'students', studentId, 'activities'), {
    desc: `Checked out library item: ${item.name}`,
    amount: 0,
    date: checkedOutAt,
  });
  return {
    action: 'checkout',
    item: { ...item, status: 'checked_out', checkedOutTo: studentId, checkedOutAt, dueAt },
    itemId,
    dueAt,
  };
}

async function clientReturn(
  firestore: Firestore,
  schoolId: string,
  studentId: string,
  item: LibraryItem,
  itemId: string,
): Promise<LibraryCheckoutResult> {
  await updateDoc(doc(firestore, 'schools', schoolId, 'library', itemId), {
    status: 'available',
    checkedOutTo: null,
    checkedOutAt: null,
    dueAt: null,
  });
  await addDoc(collection(firestore, 'schools', schoolId, 'students', studentId, 'activities'), {
    desc: `Returned library item: ${item.name}`,
    amount: 0,
    date: Date.now(),
  });
  return { action: 'return', item: { ...item, status: 'available' }, itemId };
}

export async function performLibraryCheckoutOrReturn(
  firestore: Firestore,
  schoolId: string,
  studentId: string,
  rawCode: string,
  options?: {
    policy?: LibraryPolicySettings;
    functions?: Functions | null;
  },
): Promise<LibraryCheckoutResult> {
  const found = await findLibraryItemByUpc(firestore, schoolId, rawCode);
  if (!found) return { action: 'not_found' };
  const { item, itemId } = found;
  const policy = options?.policy;

  if (item.status === 'available') {
    return clientCheckout(firestore, schoolId, studentId, item, itemId, policy);
  }

  if (item.status === 'checked_out') {
    if (item.checkedOutTo !== studentId) {
      return { action: 'wrong_borrower', item };
    }
    if (shouldUseServerReturn(policy) && options?.functions) {
      const fn = httpsCallable<
        { schoolId: string; studentId: string; upc: string },
        LibraryReturnServerResult
      >(options.functions, 'libraryReturnServer');
      const upc = normalizeLibraryUpc(rawCode);
      const res = await fn({ schoolId, studentId, upc });
      const data = res.data;
      if (!data?.success) {
        return { action: 'not_found' };
      }
      return {
        action: 'return',
        item: { ...item, status: 'available', checkedOutTo: null, checkedOutAt: null, dueAt: null },
        itemId,
        pointsDelta: data.pointsDelta,
        pointsMessage: data.message,
      };
    }
    return clientReturn(firestore, schoolId, studentId, item, itemId);
  }

  return { action: 'not_found' };
}

/** Staff force-return (applies late/on-time points when configured). */
export async function forceReturnLibraryItem(
  firestore: Firestore,
  schoolId: string,
  item: LibraryItem,
  options?: { policy?: LibraryPolicySettings; functions?: Functions | null },
): Promise<LibraryReturnServerResult | { success: true; pointsDelta?: number; message?: string }> {
  const studentId = item.checkedOutTo;
  if (!studentId || item.status !== 'checked_out') {
    await updateDoc(doc(firestore, 'schools', schoolId, 'library', item.id), {
      status: 'available',
      checkedOutTo: null,
      checkedOutAt: null,
      dueAt: null,
    });
    return { success: true, message: 'Item returned.' };
  }

  if (shouldUseServerReturn(options?.policy) && options?.functions) {
    const fn = httpsCallable<
      { schoolId: string; studentId: string; upc: string },
      LibraryReturnServerResult
    >(options.functions, 'libraryReturnServer');
    const res = await fn({ schoolId, studentId, upc: item.upc });
    return res.data ?? { success: false, message: 'Return failed.' };
  }

  await updateDoc(doc(firestore, 'schools', schoolId, 'library', item.id), {
    status: 'available',
    checkedOutTo: null,
    checkedOutAt: null,
    dueAt: null,
  });
  return { success: true, message: 'Item returned.' };
}
