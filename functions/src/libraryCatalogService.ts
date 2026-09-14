import type { Firestore } from 'firebase-admin/firestore';
import { randomUUID } from 'crypto';
import { HttpsError } from 'firebase-functions/v1/https';
import { libraryId } from './libraryService';

const DEFAULT_LIBRARY_LOCATION_ID = 'main';
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

function randomLibUpc() {
  return `LIB${randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`;
}

/** Next unused FIC-823-0001-style code, or empty if this is not that kind of code. */
function nextUnusedSequentialUpc(requested: string, used: Set<string>): string {
  const match = requested.match(/^(.*-)(\d+)$/);
  if (!match) return '';
  const prefix = match[1];
  const width = match[2].length;
  let seq = parseInt(match[2], 10);
  for (let i = 0; i < 500; i++) {
    const candidate = `${prefix}${String(seq).padStart(width, '0')}`;
    if (!used.has(candidate)) return candidate;
    seq += 1;
  }
  return '';
}

function asLibraryLocationId(value: unknown): string {
  if (value == null || value === '') return DEFAULT_LIBRARY_LOCATION_ID;
  if (typeof value !== 'string' || !value.trim() || value.length > 80 || value.includes('/')) {
    throw new HttpsError('invalid-argument', 'Invalid library.');
  }
  return value.trim();
}

export async function saveLibraryCatalog(db: Firestore, schoolId: string, data: Record<string, any>, uid: string) {
  const school = db.collection('schools').doc(schoolId);
  const receiptRef = school.collection('libraryRequests').doc(`${uid}_${libraryId(data.requestId, 'request ID')}`);
  const fingerprint = JSON.stringify([
    data.itemId ?? null, data.itemIds ?? null, data.item ?? null, data.patch ?? null, data.libraryLocationId ?? null,
  ]);
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
      if (typeof data.patch?.libraryLocationId === 'string' || typeof data.libraryLocationId === 'string') {
        patch.libraryLocationId = asLibraryLocationId(data.patch?.libraryLocationId ?? data.libraryLocationId);
      }
      if (typeof data.patch?.condition === 'string' && ['good', 'lost', 'damaged'].includes(data.patch.condition)) {
        patch.condition = data.patch.condition;
      }
      if (!Object.keys(patch).length) throw new HttpsError('invalid-argument', 'Enter a shelf, category, condition, or library.');
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
      const upcDigits = String(payload.upc || '').replace(/\D/g, '');
      const requestedLooksLikeStoreIsbn = upcDigits.length === 10 || upcDigits.length === 13;
      if (requestedLooksLikeStoreIsbn) payload.upc = '';
      const existing = data.itemId ? await tx.get(school.collection('library').doc(libraryId(data.itemId, 'copy ID'))) : null;
      if (existing && !existing.exists) throw new HttpsError('not-found', 'Copy no longer exists.');
      payload.libraryLocationId = asLibraryLocationId(
        data.libraryLocationId ?? input.libraryLocationId ?? existing?.data()?.libraryLocationId,
      );
      const requestedCode = payload.upc;
      const used = new Set<string>();
      const prefixMatch = requestedCode.match(/^(.*-)\d+$/);
      if (prefixMatch) {
        const prefix = prefixMatch[1];
        const siblings = await tx.get(
          school.collection('library').where('upc', '>=', prefix).where('upc', '<', `${prefix}\uf8ff`).limit(400),
        );
        for (const doc of siblings.docs) {
          if (existing && doc.id === existing.id) continue;
          const code = String(doc.data()?.upc || '').toUpperCase();
          if (code) used.add(code);
        }
      } else if (requestedCode) {
        const matching = await tx.get(school.collection('library').where('upc', '==', requestedCode).limit(2));
        for (const doc of matching.docs) {
          if (existing && doc.id === existing.id) continue;
          used.add(String(doc.data()?.upc || '').toUpperCase());
        }
      }
      const plans: { ref: FirebaseFirestore.DocumentReference; item: Record<string, any> }[] = [];
      for (let index = 0; index < copies; index++) {
        let upc = requestedCode ? nextUnusedSequentialUpc(requestedCode, used) : '';
        if (!upc) upc = randomLibUpc();
        used.add(upc);
        if (!requestedCode || !/^.+-\d+$/.test(upc)) {
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
          labeled: false, checkedOutTo: null, checkedOutAt: null, dueAt: null, createdAt: now, addedBy: uid });
      }
      result = { success: true, count: plans.length, items: plans.map(p => ({ id: p.ref.id, ...p.item })) };
    }
    tx.set(lock, { updatedAt: now });
    tx.set(receiptRef, { fingerprint, result, createdAt: now, actorUid: uid });
    return result;
  });
}
