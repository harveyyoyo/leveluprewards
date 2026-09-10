import type { Firestore } from 'firebase-admin/firestore';
import { randomUUID } from 'crypto';
import { HttpsError } from 'firebase-functions/v1/https';
import { libraryId } from './libraryService';

const fields = [
  'name',
  'upc',
  'isbn',
  'author',
  'category',
  'shelfLocation',
  'copyNumber',
  'notes',
  'coverUrl',
  'description',
  'readingLevel',
  'pageCount',
  'publishedYear',
  'series',
  'volume',
];
export async function saveLibraryCatalog(db: Firestore, schoolId: string, data: Record<string, any>, uid: string) {
  const school = db.collection('schools').doc(schoolId);
  const receiptRef = school.collection('libraryRequests').doc(`${uid}_${libraryId(data.requestId, 'request ID')}`);
  const fingerprint = JSON.stringify([data.itemId ?? null, data.itemIds ?? null, data.item ?? null, data.patch ?? null]);
  // All catalog writers share this lock, including legacy copies without reservations.
  const lock = school.collection('libraryMeta').doc('catalog');
  return db.runTransaction(async tx => {
    const receipt = await tx.get(receiptRef);
    if (receipt.exists) {
      if (receipt.data()!.fingerprint !== fingerprint) throw new HttpsError('invalid-argument', 'Request ID already used.');
      return receipt.data()!.result;
    }
    await tx.get(lock);
    const now = Date.now();
    let result: Record<string, any>;
    if (data.itemIds) {
      if (!Array.isArray(data.itemIds) || !data.itemIds.length || data.itemIds.length > 100) throw new HttpsError('invalid-argument', 'Select up to 100 copies.');
      const ids = [...new Set<string>(data.itemIds.map((id: unknown) => libraryId(id, 'copy ID')))];
      const patch: Record<string, string | null> = {};
      for (const field of ['category', 'shelfLocation']) {
        if (typeof data.patch?.[field] === 'string') patch[field] = data.patch[field].trim().slice(0, 200) || null;
      }
      if (!Object.keys(patch).length) throw new HttpsError('invalid-argument', 'Enter a shelf or category.');
      const docs = await Promise.all(ids.map(id => tx.get(school.collection('library').doc(id))));
      if (docs.some(d => !d.exists)) throw new HttpsError('not-found', 'A selected copy no longer exists.');
      for (const doc of docs) tx.update(doc.ref, patch);
      result = { success: true, count: docs.length };
    } else {
      const input = data.item ?? data.input ?? {};
      if (typeof input.name !== 'string' || !input.name.trim()) throw new HttpsError('invalid-argument', 'Title is required.');
      const copies = data.itemId ? 1 : input.copies ?? 1;
      if (!Number.isInteger(copies) || copies < 1 || copies > 25) throw new HttpsError('invalid-argument', 'Add between 1 and 25 copies.');
      const payload: Record<string, any> = {};
      for (const field of fields) {
        if (field === 'pageCount') {
          payload[field] = typeof input[field] === 'number' && Number.isFinite(input[field]) && input[field] > 0 ? Math.floor(input[field]) : null;
        } else {
          payload[field] = typeof input[field] === 'string' ? input[field].trim().slice(0, field === 'notes' || field === 'description' || field === 'coverUrl' ? 2000 : 300) || null : null;
        }
      }
      payload.upc = payload.upc?.toUpperCase() ?? '';
      const existing = data.itemId ? await tx.get(school.collection('library').doc(libraryId(data.itemId, 'copy ID'))) : null;
      if (existing && !existing.exists) throw new HttpsError('not-found', 'Copy no longer exists.');
      const requestedCode = payload.upc;
      const matching = requestedCode ? await tx.get(school.collection('library').where('upc', '==', requestedCode).limit(2)) : null;
      const taken = matching?.docs.some(d => d.id !== existing?.id);
      if (existing && taken) throw new HttpsError('already-exists', 'Another copy uses this barcode.');
      const plans: { ref: FirebaseFirestore.DocumentReference; item: Record<string, any> }[] = [];
      for (let index = 0; index < copies; index++) {
        const useRequested = requestedCode && !taken && index === 0 && copies === 1;
        const upc = useRequested ? requestedCode : `LIB${randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`;
        if (!useRequested) {
          const collision = await tx.get(school.collection('library').where('upc', '==', upc).limit(1));
          if (!collision.empty) throw new HttpsError('aborted', 'Please retry barcode generation.');
        }
        const ref = existing?.ref ?? school.collection('library').doc();
        const item = { ...payload, upc, copyNumber: copies > 1 ? String(index + 1) : payload.copyNumber };
        plans.push({ ref, item });
      }
      for (const plan of plans) {
        if (existing) tx.update(plan.ref, plan.item);
        else tx.set(plan.ref, { ...plan.item, status: 'available', condition: 'good', archived: false,
          checkedOutTo: null, checkedOutAt: null, dueAt: null, createdAt: now, addedBy: uid });
      }
      result = { success: true, count: plans.length, items: plans.map(p => ({ id: p.ref.id, ...p.item })) };
    }
    tx.set(lock, { updatedAt: now });
    tx.set(receiptRef, { fingerprint, result, createdAt: now, actorUid: uid });
    return result;
  });
}
