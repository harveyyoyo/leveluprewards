import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  Firestore,
} from 'firebase/firestore';

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
