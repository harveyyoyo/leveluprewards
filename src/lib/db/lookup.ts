import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  Firestore,
} from 'firebase/firestore';
import type { Prize } from '../types';
import { isPrizeScanCode, normalizeScanInput, prizeScanCodeFor } from '@/lib/prizes/prizeScanCode';

/** Look up a student by scanned ID (document ID, nfcId string, or nfcId number). Used by both student kiosk and prize redemption. */
export const lookupStudentId = async (
  firestore: Firestore,
  schoolId: string,
  idToSubmit: string
): Promise<string | null> => {
  if (!idToSubmit?.trim() || !schoolId) return null;
  const trimmed = idToSubmit.trim();
  const studentsRef = collection(firestore, 'schools', schoolId, 'students');

  const byDocId = await getDoc(doc(firestore, 'schools', schoolId, 'students', trimmed));
  if (byDocId.exists()) return byDocId.id;

  const qStr = query(studentsRef, where('nfcId', '==', trimmed));
  const querySnap = await getDocs(qStr);
  if (!querySnap.empty) return querySnap.docs[0].id;

  const asNum = /^\d+$/.test(trimmed) ? parseInt(trimmed, 10) : NaN;
  if (!Number.isNaN(asNum)) {
    const qNum = query(studentsRef, where('nfcId', '==', asNum));
    const numSnap = await getDocs(qNum);
    if (!numSnap.empty) return numSnap.docs[0].id;
  }

  return null;
};

/** Look up a prize by shelf / ID card scan code. Returns prize id or null. */
export const lookupPrizeByScanCode = async (
  firestore: Firestore,
  schoolId: string,
  rawCode: string,
): Promise<string | null> => {
  if (!rawCode?.trim() || !schoolId) return null;
  const code = normalizeScanInput(rawCode);
  if (!isPrizeScanCode(code)) return null;

  const prizesRef = collection(firestore, 'schools', schoolId, 'prizes');
  const qStored = query(prizesRef, where('scanCode', '==', code));
  const storedSnap = await getDocs(qStored);
  if (!storedSnap.empty) return storedSnap.docs[0].id;

  const allSnap = await getDocs(prizesRef);
  for (const d of allSnap.docs) {
    const prize = { ...(d.data() as Prize), id: d.id };
    if (prizeScanCodeFor(prize) === code) return d.id;
  }
  return null;
};
