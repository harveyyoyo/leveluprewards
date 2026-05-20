import {
  collection,
  doc,
  getDocs,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import {
  buildOfficeDemoSeed,
  type OfficeDemoSeedInput,
  type OfficeDemoSeedPayload,
} from '@/lib/office/officeDemoSeedFactory';
export {
  buildOfficeDemoSeed,
  buildOfficeDemoStaffAccount,
} from '@/lib/office/officeDemoSeedFactory';
export type {
  OfficeDemoSeedInput,
  OfficeDemoSeedPayload,
  OfficeDemoVariant,
} from '@/lib/office/officeDemoSeedFactory';

export const OFFICE_DEMO_COLLECTIONS = [
  'officeStudents',
  'officeClasses',
  'officeGradeEntries',
  'officeBillingAccounts',
  'officeInvoices',
] as const;

const BATCH_LIMIT = 499;

type OfficeDemoWritableCollection = (typeof OFFICE_DEMO_COLLECTIONS)[number] | 'staffAccounts';

export async function clearOfficeCollections(firestore: Firestore, schoolId: string): Promise<void> {
  const school = schoolId.trim().toLowerCase();
  for (const sub of OFFICE_DEMO_COLLECTIONS) {
    const snap = await getDocs(collection(firestore, 'schools', school, sub));
    if (snap.empty) continue;
    for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
      const batch = writeBatch(firestore);
      snap.docs.slice(i, i + BATCH_LIMIT).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
}

export async function writeOfficeDemoSeedToFirestore(
  firestore: Firestore,
  schoolId: string,
  payload: OfficeDemoSeedPayload,
): Promise<void> {
  const school = schoolId.trim().toLowerCase();
  const ops: Array<{ collection: OfficeDemoWritableCollection; id: string; data: object }> = [];

  for (const c of payload.officeClasses) {
    const { id, ...data } = c;
    ops.push({ collection: 'officeClasses', id, data });
  }
  for (const s of payload.officeStudents) {
    const { id, ...data } = s;
    ops.push({ collection: 'officeStudents', id, data });
  }
  for (const g of payload.gradeEntries) {
    const { id, ...data } = g;
    ops.push({ collection: 'officeGradeEntries', id, data });
  }
  for (const a of payload.billingAccounts) {
    const { id, ...data } = a;
    ops.push({ collection: 'officeBillingAccounts', id, data });
  }
  for (const inv of payload.invoices) {
    const { id, ...data } = inv;
    ops.push({ collection: 'officeInvoices', id, data });
  }
  for (const account of payload.staffAccounts) {
    ops.push({ collection: 'staffAccounts', id: account.id, data: account });
  }

  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = writeBatch(firestore);
    for (const op of ops.slice(i, i + BATCH_LIMIT)) {
      batch.set(doc(firestore, 'schools', school, op.collection, op.id), op.data);
    }
    await batch.commit();
  }
}

export async function seedOfficeDemoDataForSchool(
  firestore: Firestore,
  schoolId: string,
  input: OfficeDemoSeedInput,
): Promise<OfficeDemoSeedPayload> {
  const payload = buildOfficeDemoSeed(input);
  await clearOfficeCollections(firestore, schoolId);
  await writeOfficeDemoSeedToFirestore(firestore, schoolId, payload);
  return payload;
}
