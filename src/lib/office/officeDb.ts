import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  runTransaction,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { officeAuditSnapshot, writeOfficeAuditEntry } from '@/lib/office/officeAuditLog';
import { billingStatusForAccount } from '@/lib/office/officeUtils';
import type {
  OfficeAttendanceEntry,
  OfficeAuditEntityType,
  OfficeBillingAccount,
  OfficeClass,
  OfficeEvent,
  OfficeFamily,
  OfficeForm,
  OfficeFormResponseStatus,
  OfficeGradeEntry,
  OfficeInvoice,
  OfficePayment,
  OfficePaymentMethod,
  OfficeStudent,
  OfficeTeacher,
} from '@/lib/office/types';

export type OfficeWriteContext = {
  firestore: import('firebase/firestore').Firestore;
  schoolId: string;
  changedBy?: string | null;
  auditLog?: boolean;
};

function sid(schoolId: string): string {
  return schoolId.trim().toLowerCase();
}

async function audit(
  ctx: OfficeWriteContext,
  params: {
    entityType: OfficeAuditEntityType;
    entityId: string;
    action: 'create' | 'update' | 'delete';
    summary: string;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
  },
): Promise<void> {
  if (!ctx.auditLog) return;
  await writeOfficeAuditEntry(ctx.firestore, sid(ctx.schoolId), {
    ...params,
    changedBy: ctx.changedBy,
  });
}

/** Creates a student and auto-provisions an `officeFamilies` row when none is supplied. */
export async function createOfficeStudentWithFamily(
  ctx: OfficeWriteContext,
  data: Omit<OfficeStudent, 'id' | 'familyId'>,
  options?: { createFamily?: boolean },
): Promise<{ studentId: string; familyId: string | null }> {
  let familyId: string | null = null;
  if (options?.createFamily !== false) {
    const displayName = `${data.lastName}`.trim()
      ? `${data.lastName.trim()} family`
      : `${data.firstName.trim()} family`;
    familyId = await upsertOfficeFamily(ctx, null, {
      displayName,
      contacts: [],
      medicalNotes: null,
      legalNotes: null,
      busRoute: data.busRoute ?? null,
      busNotes: null,
      generalNotes: null,
    });
  }
  const studentId = await createOfficeStudent(ctx, { ...data, familyId, updatedAt: data.updatedAt ?? Date.now() });
  return { studentId, familyId };
}

export async function createOfficeStudent(
  ctx: OfficeWriteContext,
  data: Omit<OfficeStudent, 'id'>,
): Promise<string> {
  const ref = doc(collection(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeStudents'));
  const payload = { ...data, updatedAt: data.updatedAt ?? Date.now() };
  await setDoc(ref, payload);
  await audit(ctx, {
    entityType: 'officeStudent',
    entityId: ref.id,
    action: 'create',
    summary: `Created student ${payload.firstName} ${payload.lastName}`.trim(),
    after: officeAuditSnapshot(payload as unknown as Record<string, unknown>),
  });
  return ref.id;
}

export async function updateOfficeStudent(
  ctx: OfficeWriteContext,
  studentId: string,
  patch: Partial<Omit<OfficeStudent, 'id'>>,
  summary?: string,
): Promise<void> {
  const ref = doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeStudents', studentId);
  const beforeSnap = await getDoc(ref);
  const before = beforeSnap.exists() ? (beforeSnap.data() as OfficeStudent) : null;
  const next = { ...patch, updatedAt: Date.now() };
  await updateDoc(ref, next);
  await audit(ctx, {
    entityType: 'officeStudent',
    entityId: studentId,
    action: 'update',
    summary: summary ?? 'Updated office student',
    before: before ? officeAuditSnapshot(before as unknown as Record<string, unknown>) : null,
    after: officeAuditSnapshot({ ...(before ?? {}), ...next } as unknown as Record<string, unknown>),
  });
}

export async function deleteOfficeStudentBatch(
  ctx: OfficeWriteContext,
  params: {
    student: OfficeStudent;
    gradeEntryIds: string[];
    billingUpdates: Array<{ accountId: string; studentIds: string[] }>;
  },
): Promise<void> {
  const batch = writeBatch(ctx.firestore);
  batch.delete(doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeStudents', params.student.id));
  for (const gid of params.gradeEntryIds) {
    batch.delete(doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeGradeEntries', gid));
  }
  for (const u of params.billingUpdates) {
    batch.update(doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeBillingAccounts', u.accountId), {
      studentIds: u.studentIds,
      updatedAt: Date.now(),
    });
  }
  await batch.commit();
  await audit(ctx, {
    entityType: 'officeStudent',
    entityId: params.student.id,
    action: 'delete',
    summary: `Deleted student ${params.student.firstName} ${params.student.lastName}`.trim(),
    before: officeAuditSnapshot(params.student as unknown as Record<string, unknown>),
    after: null,
  });
}

export async function upsertOfficeFamily(
  ctx: OfficeWriteContext,
  familyId: string | null,
  data: Omit<OfficeFamily, 'id' | 'updatedAt' | 'updatedBy'> & { updatedAt?: number },
): Promise<string> {
  const id =
    familyId ?? doc(collection(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeFamilies')).id;
  const ref = doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeFamilies', id);
  const beforeSnap = await getDoc(ref);
  const before = beforeSnap.exists() ? (beforeSnap.data() as OfficeFamily) : null;
  const payload: OfficeFamily = {
    ...data,
    id,
    contacts: data.contacts ?? [],
    updatedAt: data.updatedAt ?? Date.now(),
    updatedBy: ctx.changedBy?.trim() || null,
  };
  await setDoc(ref, payload, { merge: true });
  await audit(ctx, {
    entityType: 'officeFamily',
    entityId: id,
    action: before ? 'update' : 'create',
    summary: before ? `Updated family ${payload.displayName}` : `Created family ${payload.displayName}`,
    before: before ? officeAuditSnapshot(before as unknown as Record<string, unknown>) : null,
    after: officeAuditSnapshot(payload as unknown as Record<string, unknown>),
  });
  return id;
}

export async function deleteOfficeFamily(ctx: OfficeWriteContext, familyId: string): Promise<void> {
  const ref = doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeFamilies', familyId);
  const beforeSnap = await getDoc(ref);
  const before = beforeSnap.exists() ? (beforeSnap.data() as OfficeFamily) : null;
  await deleteDoc(ref);
  await audit(ctx, {
    entityType: 'officeFamily',
    entityId: familyId,
    action: 'delete',
    summary: `Deleted family ${before?.displayName ?? familyId}`,
    before: before ? officeAuditSnapshot(before as unknown as Record<string, unknown>) : null,
    after: null,
  });
}

export async function upsertOfficeClass(
  ctx: OfficeWriteContext,
  classId: string | null,
  data: Pick<OfficeClass, 'name' | 'teacherId' | 'notes' | 'capacity'>,
): Promise<string> {
  const id =
    classId ?? doc(collection(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeClasses')).id;
  const ref = doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeClasses', id);
  const beforeSnap = await getDoc(ref);
  const before = beforeSnap.exists() ? (beforeSnap.data() as OfficeClass) : null;
  const payload: OfficeClass = {
    id,
    name: data.name.trim(),
    teacherId: data.teacherId ?? null,
    notes: data.notes ?? null,
    capacity: data.capacity ?? null,
    updatedAt: Date.now(),
  };
  await setDoc(ref, payload, { merge: true });
  await audit(ctx, {
    entityType: 'officeClass',
    entityId: id,
    action: before ? 'update' : 'create',
    summary: before ? `Updated class ${payload.name}` : `Created class ${payload.name}`,
    before: before ? officeAuditSnapshot(before as unknown as Record<string, unknown>) : null,
    after: officeAuditSnapshot(payload as unknown as Record<string, unknown>),
  });
  return id;
}

export async function deleteOfficeClassBatch(
  ctx: OfficeWriteContext,
  cls: OfficeClass,
  unassignStudentIds: string[],
): Promise<void> {
  const batch = writeBatch(ctx.firestore);
  batch.delete(doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeClasses', cls.id));
  for (const studentId of unassignStudentIds) {
    batch.update(doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeStudents', studentId), {
      classId: null,
      updatedAt: Date.now(),
    });
  }
  await batch.commit();
  await audit(ctx, {
    entityType: 'officeClass',
    entityId: cls.id,
    action: 'delete',
    summary: `Deleted class ${cls.name}`,
    before: officeAuditSnapshot(cls as unknown as Record<string, unknown>),
    after: null,
  });
}

export async function upsertOfficeTeacher(
  ctx: OfficeWriteContext,
  teacherId: string | null,
  data: Pick<OfficeTeacher, 'name' | 'email'>,
): Promise<string> {
  const id =
    teacherId ?? doc(collection(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeTeachers')).id;
  const ref = doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeTeachers', id);
  const beforeSnap = await getDoc(ref);
  const before = beforeSnap.exists() ? (beforeSnap.data() as OfficeTeacher) : null;
  const payload: OfficeTeacher = {
    id,
    name: data.name.trim(),
    email: data.email?.trim() || null,
    updatedAt: Date.now(),
  };
  await setDoc(ref, payload, { merge: true });
  await audit(ctx, {
    entityType: 'officeTeacher',
    entityId: id,
    action: before ? 'update' : 'create',
    summary: before ? `Updated teacher ${payload.name}` : `Created teacher ${payload.name}`,
    before: before ? officeAuditSnapshot(before as unknown as Record<string, unknown>) : null,
    after: officeAuditSnapshot(payload as unknown as Record<string, unknown>),
  });
  return id;
}

export async function deleteOfficeTeacher(
  ctx: OfficeWriteContext,
  teacher: OfficeTeacher,
): Promise<void> {
  await deleteDoc(doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeTeachers', teacher.id));
  await audit(ctx, {
    entityType: 'officeTeacher',
    entityId: teacher.id,
    action: 'delete',
    summary: `Deleted teacher ${teacher.name}`,
    before: officeAuditSnapshot(teacher as unknown as Record<string, unknown>),
    after: null,
  });
}

export async function linkStudentsToFamily(
  ctx: OfficeWriteContext,
  studentIds: string[],
  familyId: string | null,
): Promise<void> {
  if (!familyId) return;
  await Promise.all(
    studentIds.map((studentId) =>
      updateOfficeStudent(ctx, studentId, { familyId }, 'Linked student to family profile'),
    ),
  );
}

export async function deleteOfficeBillingAccount(ctx: OfficeWriteContext, account: OfficeBillingAccount): Promise<void> {
  const ref = doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeBillingAccounts', account.id);
  await deleteDoc(ref);
  await audit(ctx, {
    entityType: 'officeBillingAccount',
    entityId: account.id,
    action: 'delete',
    summary: `Deleted billing account ${account.familyName}`,
    before: officeAuditSnapshot(account as unknown as Record<string, unknown>),
    after: null,
  });
}

/**
 * Applies a signed CHANGE to the account's balance atomically via Firestore `increment()`,
 * instead of writing an absolute value computed from a (possibly stale) client-side read.
 * Two staff recording payments/invoices for the same account at nearly the same time would
 * otherwise silently overwrite each other's balance change.
 */
async function patchOfficeBillingAccountBalance(
  ctx: OfficeWriteContext,
  account: OfficeBillingAccount,
  nextInvoices: OfficeInvoice[],
  balanceDeltaCents: number,
): Promise<void> {
  await updateDoc(doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeBillingAccounts', account.id), {
    balanceCents: increment(balanceDeltaCents),
    status: billingStatusForAccount(account.id, nextInvoices, account.status),
    updatedAt: Date.now(),
  });
}

export async function saveOfficeInvoiceWithBalance(
  ctx: OfficeWriteContext,
  params: {
    invoiceId: string | null;
    account: OfficeBillingAccount;
    invoices: OfficeInvoice[];
    data: {
      label: string;
      amountCents: number;
      dueDate: string;
      status: OfficeInvoice['status'];
    };
  },
): Promise<string> {
  const { invoiceId, account, invoices, data } = params;
  const existing = invoiceId ? invoices.find((i) => i.id === invoiceId) : null;

  const id = await upsertOfficeInvoice(ctx, invoiceId, {
    accountId: account.id,
    label: data.label,
    amountCents: data.amountCents,
    dueDate: data.dueDate,
    status: data.status,
    createdAt: existing?.createdAt,
    paidAmountCents: existing?.paidAmountCents,
    paidAt: existing?.paidAt ?? null,
    paymentMethod: existing?.paymentMethod ?? null,
    paymentNote: existing?.paymentNote ?? null,
  });

  const nextInvoices = invoiceId
    ? invoices.map((i) => (i.id === invoiceId ? { ...i, ...data, id } : i))
    : [
        ...invoices,
        {
          id,
          accountId: account.id,
          ...data,
          createdAt: Date.now(),
          paidAmountCents: 0,
          paidAt: null,
          paymentMethod: null,
          paymentNote: null,
        },
      ];

  // The account balance only ever reflects `sent`/`partial` invoices — a `draft` invoice's
  // amount was never counted, so only these transitions change it.
  let deltaCents = 0;
  if (existing) {
    if (existing.status === 'sent' || existing.status === 'partial') {
      deltaCents = data.amountCents - (existing.amountCents || 0);
    } else if (data.status === 'sent' && existing.status === 'draft') {
      deltaCents = data.amountCents;
    }
  } else if (data.status === 'sent') {
    deltaCents = data.amountCents;
  }

  await patchOfficeBillingAccountBalance(ctx, account, nextInvoices, deltaCents);
  return id;
}

export async function voidOfficeInvoiceWithBalance(
  ctx: OfficeWriteContext,
  inv: OfficeInvoice,
  account: OfficeBillingAccount,
  invoices: OfficeInvoice[],
): Promise<void> {
  await upsertOfficeInvoice(ctx, inv.id, { ...inv, status: 'void' });
  const nextInvoices = invoices.map((i) => (i.id === inv.id ? { ...i, status: 'void' as const } : i));
  // Only `sent`/`partial` invoices were ever added to the balance — voiding a `draft` invoice
  // must not subtract anything, since that amount was never added in the first place.
  if (inv.status === 'sent' || inv.status === 'partial') {
    const remaining = Math.max(0, (inv.amountCents || 0) - (inv.paidAmountCents || 0));
    await patchOfficeBillingAccountBalance(ctx, account, nextInvoices, -remaining);
  }
}

export async function sendOfficeDraftInvoiceWithBalance(
  ctx: OfficeWriteContext,
  inv: OfficeInvoice,
  account: OfficeBillingAccount,
  invoices: OfficeInvoice[],
): Promise<void> {
  if (inv.status !== 'draft') return;
  await upsertOfficeInvoice(ctx, inv.id, { ...inv, status: 'sent' });
  const nextInvoices = invoices.map((i) => (i.id === inv.id ? { ...i, status: 'sent' as const } : i));
  await patchOfficeBillingAccountBalance(ctx, account, nextInvoices, inv.amountCents || 0);
}

export async function bulkCreateOfficeInvoices(
  ctx: OfficeWriteContext,
  params: {
    accounts: OfficeBillingAccount[];
    invoices: OfficeInvoice[];
    label: string;
    amountCents: number;
    dueDate: string;
    status: OfficeInvoice['status'];
  },
): Promise<number> {
  const { accounts, invoices, label, amountCents, dueDate, status } = params;
  for (const account of accounts) {
    const id = await upsertOfficeInvoice(ctx, null, {
      accountId: account.id,
      label,
      amountCents,
      dueDate,
      status,
    });
    if (status === 'sent') {
      const nextInvoices: OfficeInvoice[] = [
        ...invoices,
        {
          id,
          accountId: account.id,
          label,
          amountCents,
          dueDate,
          status,
          createdAt: Date.now(),
          paidAmountCents: 0,
          paidAt: null,
          paymentMethod: null,
          paymentNote: null,
        },
      ];
      await patchOfficeBillingAccountBalance(ctx, account, nextInvoices, amountCents);
    }
  }
  await audit(ctx, {
    entityType: 'officeInvoice',
    entityId: 'bulk',
    action: 'create',
    summary: `Bulk created ${accounts.length} invoice(s) · ${label}`,
    after: officeAuditSnapshot({ count: accounts.length, label, amountCents, status }),
  });
  return accounts.length;
}

export async function upsertOfficeBillingAccount(
  ctx: OfficeWriteContext,
  accountId: string | null,
  data: Omit<OfficeBillingAccount, 'id' | 'updatedAt'>,
): Promise<string> {
  const id =
    accountId ??
    doc(collection(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeBillingAccounts')).id;
  const ref = doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeBillingAccounts', id);
  const beforeSnap = await getDoc(ref);
  const before = beforeSnap.exists() ? (beforeSnap.data() as OfficeBillingAccount) : null;
  const payload: OfficeBillingAccount = { ...data, id, updatedAt: Date.now() };
  await setDoc(ref, payload, { merge: true });
  await audit(ctx, {
    entityType: 'officeBillingAccount',
    entityId: id,
    action: before ? 'update' : 'create',
    summary: before ? `Updated billing ${payload.familyName}` : `Created billing ${payload.familyName}`,
    before: before ? officeAuditSnapshot(before as unknown as Record<string, unknown>) : null,
    after: officeAuditSnapshot(payload as unknown as Record<string, unknown>),
  });
  if (payload.familyId) {
    await linkStudentsToFamily(ctx, payload.studentIds ?? [], payload.familyId);
  }
  return id;
}

export async function upsertOfficeInvoice(
  ctx: OfficeWriteContext,
  invoiceId: string | null,
  data: Omit<OfficeInvoice, 'id' | 'createdAt'> & { createdAt?: number },
): Promise<string> {
  const id =
    invoiceId ?? doc(collection(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeInvoices')).id;
  const ref = doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeInvoices', id);
  const beforeSnap = await getDoc(ref);
  const before = beforeSnap.exists() ? (beforeSnap.data() as OfficeInvoice) : null;
  const payload: OfficeInvoice = {
    ...data,
    id,
    createdAt: data.createdAt ?? before?.createdAt ?? Date.now(),
    paidAmountCents: data.paidAmountCents ?? before?.paidAmountCents ?? 0,
  };
  await setDoc(ref, payload, { merge: true });
  await audit(ctx, {
    entityType: 'officeInvoice',
    entityId: id,
    action: before ? 'update' : 'create',
    summary: before ? `Updated invoice ${payload.label}` : `Created invoice ${payload.label}`,
    before: before ? officeAuditSnapshot(before as unknown as Record<string, unknown>) : null,
    after: officeAuditSnapshot(payload as unknown as Record<string, unknown>),
  });
  return id;
}

export async function recordOfficePayment(
  ctx: OfficeWriteContext,
  params: {
    account: OfficeBillingAccount;
    invoice: OfficeInvoice | null;
    amountCents: number;
    method: OfficePaymentMethod;
    note?: string;
  },
): Promise<string> {
  const amount = Math.max(0, Math.round(params.amountCents));
  if (amount <= 0) throw new Error('Payment amount must be greater than zero.');

  const paymentRef = doc(collection(ctx.firestore, 'schools', sid(ctx.schoolId), 'officePayments'));
  const payment: Omit<OfficePayment, 'id'> = {
    accountId: params.account.id,
    invoiceId: params.invoice?.id ?? null,
    amountCents: amount,
    method: params.method,
    note: params.note?.trim() || null,
    paidAt: Date.now(),
    recordedBy: ctx.changedBy?.trim() || null,
  };
  await setDoc(paymentRef, payment);

  if (params.invoice) {
    // Read-modify-write inside a transaction so two payments landing on the same invoice at
    // nearly the same time (two staff, or a double-click) both count instead of one clobbering
    // the other's `paidAmountCents`.
    const invoiceRef = doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeInvoices', params.invoice.id);
    await runTransaction(ctx.firestore, async (tx) => {
      const snap = await tx.get(invoiceRef);
      const current = snap.exists() ? (snap.data() as OfficeInvoice) : params.invoice!;
      const paidAmountCents = (current.paidAmountCents ?? 0) + amount;
      const fullyPaid = paidAmountCents >= (current.amountCents || 0);
      tx.update(invoiceRef, {
        paidAmountCents,
        status: fullyPaid ? 'paid' : 'partial',
        paidAt: fullyPaid ? Date.now() : current.paidAt ?? null,
        paymentMethod: params.method,
        paymentNote: params.note?.trim() || current.paymentNote || null,
      });
    });
  }

  await updateDoc(
    doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeBillingAccounts', params.account.id),
    { balanceCents: increment(-amount), updatedAt: Date.now() },
  );

  await audit(ctx, {
    entityType: 'officeInvoice',
    entityId: params.invoice?.id ?? paymentRef.id,
    action: 'update',
    summary: `Recorded ${params.method} payment of $${(amount / 100).toFixed(2)}${params.invoice ? ` for ${params.invoice.label}` : ''}`,
    after: officeAuditSnapshot({ paymentId: paymentRef.id, amountCents: amount }),
  });

  return paymentRef.id;
}

export async function createOfficeGradeEntry(
  ctx: OfficeWriteContext,
  data: Omit<OfficeGradeEntry, 'id' | 'updatedAt' | 'updatedBy'>,
): Promise<string> {
  const ref = doc(collection(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeGradeEntries'));
  const payload = {
    ...data,
    updatedAt: Date.now(),
    updatedBy: ctx.changedBy?.trim() || null,
  };
  await setDoc(ref, payload);
  await audit(ctx, {
    entityType: 'officeGradeEntry',
    entityId: ref.id,
    action: 'create',
    summary: `Created grade ${data.subject} for term ${data.termLabel}`,
    after: officeAuditSnapshot(payload as unknown as Record<string, unknown>),
  });
  return ref.id;
}

export async function deleteOfficeGradeEntry(ctx: OfficeWriteContext, entry: OfficeGradeEntry): Promise<void> {
  const ref = doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeGradeEntries', entry.id);
  await deleteDoc(ref);
  await audit(ctx, {
    entityType: 'officeGradeEntry',
    entityId: entry.id,
    action: 'delete',
    summary: `Deleted grade entry ${entry.subject} · ${entry.termLabel}`,
    before: officeAuditSnapshot(entry as unknown as Record<string, unknown>),
    after: null,
  });
}

export async function bulkCreateOfficeGradeEntries(
  ctx: OfficeWriteContext,
  entries: Omit<OfficeGradeEntry, 'id' | 'updatedAt' | 'updatedBy'>[],
): Promise<number> {
  if (entries.length === 0) return 0;
  const batch = writeBatch(ctx.firestore);
  const now = Date.now();
  const changedBy = ctx.changedBy?.trim() || null;
  for (const entry of entries) {
    const ref = doc(collection(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeGradeEntries'));
    batch.set(ref, {
      ...entry,
      updatedAt: now,
      updatedBy: changedBy,
    });
  }
  await batch.commit();
  await audit(ctx, {
    entityType: 'officeGradeEntry',
    entityId: 'bulk',
    action: 'create',
    summary: `Bulk created ${entries.length} grade entries · ${entries[0]?.subject ?? 'grades'}`,
    after: officeAuditSnapshot({ count: entries.length, subject: entries[0]?.subject, term: entries[0]?.termLabel }),
  });
  return entries.length;
}

export async function updateOfficeGradeEntry(
  ctx: OfficeWriteContext,
  entryId: string,
  patch: Partial<Omit<OfficeGradeEntry, 'id'>>,
): Promise<void> {
  const ref = doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeGradeEntries', entryId);
  const beforeSnap = await getDoc(ref);
  const before = beforeSnap.exists() ? (beforeSnap.data() as OfficeGradeEntry) : null;
  const next = { ...patch, updatedAt: Date.now(), updatedBy: ctx.changedBy?.trim() || null };
  await updateDoc(ref, next);
  await audit(ctx, {
    entityType: 'officeGradeEntry',
    entityId: entryId,
    action: 'update',
    summary: `Updated grade entry ${before?.subject ?? entryId}`,
    before: before ? officeAuditSnapshot(before as unknown as Record<string, unknown>) : null,
    after: officeAuditSnapshot({ ...(before ?? {}), ...next } as unknown as Record<string, unknown>),
  });
}

/** Deterministic doc id so re-marking the same student on the same day overwrites instead of duplicating. */
function attendanceDocId(date: string, studentId: string): string {
  return `${date}_${studentId}`;
}

/** Marks attendance for one or more students in one class on one day. One audit entry per save. */
export async function bulkSetOfficeAttendance(
  ctx: OfficeWriteContext,
  params: {
    classId: string;
    date: string;
    marks: Array<{ studentId: string; status: OfficeAttendanceEntry['status']; notes?: string | null }>;
  },
): Promise<number> {
  if (params.marks.length === 0) return 0;
  const batch = writeBatch(ctx.firestore);
  const now = Date.now();
  const changedBy = ctx.changedBy?.trim() || null;
  for (const mark of params.marks) {
    const ref = doc(
      ctx.firestore,
      'schools',
      sid(ctx.schoolId),
      'officeAttendance',
      attendanceDocId(params.date, mark.studentId),
    );
    batch.set(ref, {
      studentId: mark.studentId,
      classId: params.classId,
      date: params.date,
      status: mark.status,
      notes: mark.notes ?? null,
      updatedAt: now,
      updatedBy: changedBy,
    });
  }
  await batch.commit();
  const counts = params.marks.reduce<Record<string, number>>((acc, m) => {
    acc[m.status] = (acc[m.status] ?? 0) + 1;
    return acc;
  }, {});
  await audit(ctx, {
    entityType: 'officeAttendanceEntry',
    entityId: `${params.classId}_${params.date}`,
    action: 'update',
    summary: `Recorded attendance for ${params.marks.length} student${params.marks.length === 1 ? '' : 's'} on ${params.date}`,
    after: officeAuditSnapshot({ classId: params.classId, date: params.date, counts }),
  });
  return params.marks.length;
}

export async function createOfficeForm(
  ctx: OfficeWriteContext,
  data: {
    title: string;
    description?: string | null;
    dueDate?: string | null;
    targetClassId: string;
    studentIds: string[];
  },
): Promise<string> {
  const ref = doc(collection(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeForms'));
  const responses: Record<string, OfficeFormResponseStatus> = {};
  for (const studentId of data.studentIds) responses[studentId] = 'sent';
  const payload = {
    title: data.title,
    description: data.description ?? null,
    dueDate: data.dueDate ?? null,
    targetClassId: data.targetClassId,
    responses,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    updatedBy: ctx.changedBy?.trim() || null,
  };
  await setDoc(ref, payload);
  await audit(ctx, {
    entityType: 'officeForm',
    entityId: ref.id,
    action: 'create',
    summary: `Sent form "${data.title}" to ${data.studentIds.length} student${data.studentIds.length === 1 ? '' : 's'}`,
    after: officeAuditSnapshot({ title: data.title, targetClassId: data.targetClassId, count: data.studentIds.length }),
  });
  return ref.id;
}

export async function setOfficeFormResponse(
  ctx: OfficeWriteContext,
  formId: string,
  studentId: string,
  status: OfficeFormResponseStatus,
): Promise<void> {
  await updateDoc(doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeForms', formId), {
    [`responses.${studentId}`]: status,
    updatedAt: Date.now(),
    updatedBy: ctx.changedBy?.trim() || null,
  });
}

export async function deleteOfficeForm(ctx: OfficeWriteContext, form: OfficeForm): Promise<void> {
  await deleteDoc(doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeForms', form.id));
  await audit(ctx, {
    entityType: 'officeForm',
    entityId: form.id,
    action: 'delete',
    summary: `Deleted form "${form.title}"`,
    before: officeAuditSnapshot(form as unknown as Record<string, unknown>),
    after: null,
  });
}

export async function upsertOfficeEvent(
  ctx: OfficeWriteContext,
  eventId: string | null,
  data: { title: string; description?: string | null; date: string },
): Promise<string> {
  const id = eventId ?? doc(collection(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeEvents')).id;
  const ref = doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeEvents', id);
  const beforeSnap = await getDoc(ref);
  const before = beforeSnap.exists() ? (beforeSnap.data() as OfficeEvent) : null;
  const payload: OfficeEvent = {
    id,
    title: data.title.trim(),
    description: data.description?.trim() || null,
    date: data.date,
    updatedAt: Date.now(),
    updatedBy: ctx.changedBy?.trim() || null,
  };
  await setDoc(ref, payload, { merge: true });
  await audit(ctx, {
    entityType: 'officeEvent',
    entityId: id,
    action: before ? 'update' : 'create',
    summary: before ? `Updated event ${payload.title}` : `Created event ${payload.title}`,
    before: before ? officeAuditSnapshot(before as unknown as Record<string, unknown>) : null,
    after: officeAuditSnapshot(payload as unknown as Record<string, unknown>),
  });
  return id;
}

export async function deleteOfficeEvent(ctx: OfficeWriteContext, event: OfficeEvent): Promise<void> {
  await deleteDoc(doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeEvents', event.id));
  await audit(ctx, {
    entityType: 'officeEvent',
    entityId: event.id,
    action: 'delete',
    summary: `Deleted event ${event.title}`,
    before: officeAuditSnapshot(event as unknown as Record<string, unknown>),
    after: null,
  });
}

export function sumPaymentsForAccountYear(
  payments: OfficePayment[],
  accountId: string,
  year: number,
): number {
  return payments
    .filter((p) => p.accountId === accountId && new Date(p.paidAt).getFullYear() === year)
    .reduce((sum, p) => sum + (p.amountCents || 0), 0);
}
