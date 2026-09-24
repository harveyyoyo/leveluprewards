import {
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { officeAuditSnapshot, writeOfficeAuditEntry } from '@/lib/office/officeAuditLog';
import { riderSnapshotFromStudents, routeSnapshotForRun } from '@/lib/office/officeTransport';
import { billingStatusForAccount } from '@/lib/office/officeUtils';
import type {
  OfficeAttendanceEntry,
  OfficeAuditEntityType,
  OfficeBillingAccount,
  OfficeBusLocation,
  OfficeBusRiderStatus,
  OfficeBusRoute,
  OfficeBusRouteSnapshot,
  OfficeBusRun,
  OfficeBusStop,
  OfficeBusTrip,
  OfficeBusTripAlert,
  OfficeBusVehicleDetails,
  OfficeClass,
  OfficeDeskLogEntry,
  OfficeEvent,
  OfficeFamily,
  OfficeForm,
  OfficeFormResponseStatus,
  OfficeGradeEntry,
  OfficeInvoice,
  OfficePayment,
  OfficePaymentMethod,
  OfficeScheduleBlock,
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

/**
 * Office records are never erased — "removing" one only hides it, so every past record stays
 * available for lookups and history. Returns the fields written, for the audit entry.
 */
async function archiveOfficeDoc(
  ctx: OfficeWriteContext,
  collectionName: string,
  id: string,
): Promise<{ archived: true; archivedAt: number }> {
  const now = Date.now();
  const fields = { archived: true as const, archivedAt: now };
  await updateDoc(doc(ctx.firestore, 'schools', sid(ctx.schoolId), collectionName, id), {
    ...fields,
    updatedAt: now,
  });
  return fields;
}

export type OfficeChangeParams = {
  entityType: OfficeAuditEntityType;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  summary: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
};

async function audit(ctx: OfficeWriteContext, params: OfficeChangeParams): Promise<void> {
  if (!ctx.auditLog) return;
  await writeOfficeAuditEntry(ctx.firestore, sid(ctx.schoolId), {
    ...params,
    changedBy: ctx.changedBy,
  });
}

/**
 * Adds a change-history entry for a save made outside this module (e.g. Billing's own
 * multi-invoice payment flow). Every Office save must leave one of these behind.
 */
export async function logOfficeChange(ctx: OfficeWriteContext, params: OfficeChangeParams): Promise<void> {
  await audit(ctx, params);
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

export async function archiveOfficeStudentBatch(
  ctx: OfficeWriteContext,
  params: {
    student: OfficeStudent;
    gradeEntryIds: string[];
    billingUpdates: Array<{ accountId: string; studentIds: string[] }>;
  },
): Promise<void> {
  const batch = writeBatch(ctx.firestore);
  const now = Date.now();
  batch.update(doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeStudents', params.student.id), {
    archived: true,
    archivedAt: now,
    updatedAt: now,
  });
  for (const gid of params.gradeEntryIds) {
    batch.update(doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeGradeEntries', gid), {
      archived: true,
      archivedAt: now,
      updatedAt: now,
    });
  }
  for (const u of params.billingUpdates) {
    batch.update(doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeBillingAccounts', u.accountId), {
      studentIds: u.studentIds,
      updatedAt: now,
    });
  }
  await batch.commit();
  await audit(ctx, {
    entityType: 'officeStudent',
    entityId: params.student.id,
    action: 'delete',
    summary: `Archived student ${params.student.firstName} ${params.student.lastName}`.trim(),
    before: officeAuditSnapshot(params.student as unknown as Record<string, unknown>),
    after: officeAuditSnapshot({ archived: true, archivedAt: now }),
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

export async function archiveOfficeFamily(ctx: OfficeWriteContext, familyId: string): Promise<void> {
  const ref = doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeFamilies', familyId);
  const beforeSnap = await getDoc(ref);
  const before = beforeSnap.exists() ? (beforeSnap.data() as OfficeFamily) : null;
  const now = Date.now();
  await updateDoc(ref, { archived: true, archivedAt: now, updatedAt: now });
  await audit(ctx, {
    entityType: 'officeFamily',
    entityId: familyId,
    action: 'delete',
    summary: `Archived family ${before?.displayName ?? familyId}`,
    before: before ? officeAuditSnapshot(before as unknown as Record<string, unknown>) : null,
    after: officeAuditSnapshot({ archived: true, archivedAt: now }),
  });
}

export async function upsertOfficeClass(
  ctx: OfficeWriteContext,
  classId: string | null,
  data: Pick<OfficeClass, 'name' | 'teacherId' | 'notes' | 'capacity'> & { teacherIds?: string[] },
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
    teacherIds: data.teacherIds ?? (data.teacherId ? [data.teacherId] : []),
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

export async function archiveOfficeClassBatch(
  ctx: OfficeWriteContext,
  cls: OfficeClass,
  unassignStudentIds: string[],
): Promise<void> {
  const batch = writeBatch(ctx.firestore);
  const now = Date.now();
  batch.update(doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeClasses', cls.id), {
    archived: true,
    archivedAt: now,
    updatedAt: now,
  });
  for (const studentId of unassignStudentIds) {
    batch.update(doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeStudents', studentId), {
      classId: null,
      updatedAt: now,
    });
  }
  await batch.commit();
  await audit(ctx, {
    entityType: 'officeClass',
    entityId: cls.id,
    action: 'delete',
    summary: `Archived class ${cls.name}`,
    before: officeAuditSnapshot(cls as unknown as Record<string, unknown>),
    after: officeAuditSnapshot({ archived: true, archivedAt: now }),
  });
}

/**
 * Replaces a class's teacher list and carries it to every student in the class (students
 * follow their homeroom's teachers), with one history entry naming who was added/removed.
 */
export async function setOfficeClassTeachers(
  ctx: OfficeWriteContext,
  params: {
    cls: OfficeClass;
    teacherIds: string[];
    classStudentIds: string[];
    teacherNameById?: Map<string, string>;
  },
): Promise<void> {
  const { cls, teacherIds, classStudentIds, teacherNameById } = params;
  const before = cls.teacherIds?.length ? cls.teacherIds : cls.teacherId ? [cls.teacherId] : [];
  const now = Date.now();
  const teacherFields = { teacherId: teacherIds[0] ?? null, teacherIds };
  const batch = writeBatch(ctx.firestore);
  batch.update(doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeClasses', cls.id), {
    ...teacherFields,
    updatedAt: now,
  });
  for (const studentId of classStudentIds) {
    batch.update(doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeStudents', studentId), {
      ...teacherFields,
      teacherName: null,
      updatedAt: now,
    });
  }
  await batch.commit();

  const nameOf = (id: string) => teacherNameById?.get(id) ?? 'a teacher';
  const added = teacherIds.filter((id) => !before.includes(id)).map(nameOf);
  const removed = before.filter((id) => !teacherIds.includes(id)).map(nameOf);
  const parts = [
    added.length ? `added ${added.join(', ')}` : '',
    removed.length ? `removed ${removed.join(', ')}` : '',
    // The first teacher is the class's main teacher.
    teacherIds[0] && teacherIds[0] !== before[0] ? `main teacher is now ${nameOf(teacherIds[0])}` : '',
  ].filter(Boolean);
  await audit(ctx, {
    entityType: 'officeClass',
    entityId: cls.id,
    action: 'update',
    summary: `${cls.name}: ${parts.join('; ') || 'updated teachers'}`,
    before: officeAuditSnapshot({ teacherIds: before }),
    after: officeAuditSnapshot({ teacherIds, studentIds: classStudentIds }),
  });
}

/** Saves a class's whole weekly schedule; `summary` says what changed in plain words. */
export async function saveOfficeClassSchedule(
  ctx: OfficeWriteContext,
  params: { cls: OfficeClass; schedule: OfficeScheduleBlock[]; summary: string },
): Promise<void> {
  const { cls, schedule, summary } = params;
  await updateDoc(doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeClasses', cls.id), {
    schedule,
    updatedAt: Date.now(),
  });
  await audit(ctx, {
    entityType: 'officeClass',
    entityId: cls.id,
    action: 'update',
    summary: `${cls.name} schedule: ${summary}`,
    before: officeAuditSnapshot({ schedule: cls.schedule ?? [] }),
    after: officeAuditSnapshot({ schedule }),
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

export async function archiveOfficeTeacher(
  ctx: OfficeWriteContext,
  teacher: OfficeTeacher,
): Promise<void> {
  const fields = await archiveOfficeDoc(ctx, 'officeTeachers', teacher.id);
  await audit(ctx, {
    entityType: 'officeTeacher',
    entityId: teacher.id,
    action: 'delete',
    summary: `Archived teacher ${teacher.name}`,
    before: officeAuditSnapshot(teacher as unknown as Record<string, unknown>),
    after: officeAuditSnapshot(fields),
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

export async function archiveOfficeBillingAccount(ctx: OfficeWriteContext, account: OfficeBillingAccount): Promise<void> {
  const fields = await archiveOfficeDoc(ctx, 'officeBillingAccounts', account.id);
  await audit(ctx, {
    entityType: 'officeBillingAccount',
    entityId: account.id,
    action: 'delete',
    summary: `Archived billing account ${account.familyName}`,
    before: officeAuditSnapshot(account as unknown as Record<string, unknown>),
    after: officeAuditSnapshot(fields),
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

export async function archiveOfficeGradeEntry(ctx: OfficeWriteContext, entry: OfficeGradeEntry): Promise<void> {
  const fields = await archiveOfficeDoc(ctx, 'officeGradeEntries', entry.id);
  await audit(ctx, {
    entityType: 'officeGradeEntry',
    entityId: entry.id,
    action: 'delete',
    summary: `Archived grade entry ${entry.subject} · ${entry.termLabel}`,
    before: officeAuditSnapshot(entry as unknown as Record<string, unknown>),
    after: officeAuditSnapshot(fields),
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
    // Keep each student's mark so earlier marks on the same day remain traceable after a re-mark.
    after: officeAuditSnapshot({ classId: params.classId, date: params.date, counts, marks: params.marks }),
  });
  return params.marks.length;
}

const DESK_KIND_LABEL: Record<OfficeDeskLogEntry['kind'], string> = {
  late_arrival: 'Late arrival',
  early_pickup: 'Early pickup',
  nurse_visit: 'Nurse visit',
};

/**
 * Logs a front-desk event. The history entry is filed under the student so it shows on their
 * card's History as well as the school-wide change history.
 */
export async function createOfficeDeskLog(
  ctx: OfficeWriteContext,
  data: Omit<OfficeDeskLogEntry, 'id' | 'createdAt' | 'recordedBy'>,
  studentName: string,
): Promise<string> {
  const ref = doc(collection(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeDeskLog'));
  const payload = { ...data, createdAt: Date.now(), recordedBy: ctx.changedBy?.trim() || null };
  await setDoc(ref, payload);
  const detail =
    data.kind === 'early_pickup' && data.pickedUpBy
      ? ` · picked up by ${data.pickedUpBy}`
      : data.reason
        ? ` · ${data.reason}`
        : '';
  await audit(ctx, {
    entityType: 'officeDeskLog',
    entityId: data.studentId,
    action: 'create',
    summary: `${DESK_KIND_LABEL[data.kind]}: ${studentName} at ${data.time} on ${data.date}${detail}`,
    after: officeAuditSnapshot({ ...payload, logId: ref.id }),
  });
  return ref.id;
}

export async function archiveOfficeDeskLog(
  ctx: OfficeWriteContext,
  entry: OfficeDeskLogEntry,
  studentName: string,
): Promise<void> {
  const fields = await archiveOfficeDoc(ctx, 'officeDeskLog', entry.id);
  await audit(ctx, {
    entityType: 'officeDeskLog',
    entityId: entry.studentId,
    action: 'delete',
    summary: `Removed ${DESK_KIND_LABEL[entry.kind].toLowerCase()} for ${studentName} (${entry.date} ${entry.time})`,
    before: officeAuditSnapshot(entry as unknown as Record<string, unknown>),
    after: officeAuditSnapshot(fields),
  });
}

function busLabel(route: Pick<OfficeBusRoute, 'name' | 'busNumber'>): string {
  return route.busNumber?.trim() ? `Bus ${route.busNumber.trim()} (${route.name})` : route.name;
}

const RUN_WORD: Record<OfficeBusRun, string> = { am: 'morning', pm: 'afternoon' };

function assertSafeFieldId(value: string, label: string): void {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error(`${label} is not valid.`);
}

async function activeRouteIds(ctx: OfficeWriteContext, routeIds: string[]): Promise<Set<string>> {
  const active = new Set<string>();
  const unique = [...new Set(routeIds.map((id) => id.trim()).filter(Boolean))];
  for (let start = 0; start < unique.length; start += 20) {
    const chunk = unique.slice(start, start + 20);
    const snap = await getDocs(
      query(collection(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeBusTrips'), where('routeId', 'in', chunk)),
    );
    for (const doc of snap.docs) {
      const trip = doc.data() as Pick<OfficeBusTrip, 'routeId' | 'status'>;
      if (trip.status === 'active') active.add(trip.routeId);
    }
  }
  return active;
}

function assertValidVehicle(vehicle: OfficeBusVehicleDetails | null | undefined): void {
  if (vehicle == null) return;
  if (typeof vehicle !== 'object' || Array.isArray(vehicle)) throw new Error('Vehicle information is invalid.');
  for (const [key, label, max] of [
    ['make', 'Vehicle make', 80],
    ['model', 'Vehicle model', 80],
    ['plate', 'Vehicle plate', 20],
    ['vin', 'Vehicle VIN', 32],
    ['notes', 'Vehicle notes', 500],
  ] as const) {
    const value = vehicle[key];
    if (value != null && (typeof value !== 'string' || value.trim().length > max)) throw new Error(`${label} is invalid.`);
  }
  if (vehicle.year != null && (!Number.isInteger(vehicle.year) || vehicle.year < 1900 || vehicle.year > 2100)) throw new Error('Vehicle year is invalid.');
  for (const [key, label] of [['inspectionDue', 'Inspection date'], ['insuranceDue', 'Insurance date']] as const) {
    const value = vehicle[key];
    if (value != null && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} is invalid.`);
  }
  if (vehicle.maintenanceLog != null) {
    if (!Array.isArray(vehicle.maintenanceLog) || vehicle.maintenanceLog.length > 50) throw new Error('A bus can have up to 50 service records.');
    const ids = new Set<string>();
    for (const entry of vehicle.maintenanceLog) {
      if (!entry || typeof entry !== 'object') throw new Error('A service record is invalid.');
      assertSafeFieldId(entry.id, 'Service record');
      if (ids.has(entry.id)) throw new Error('A bus cannot contain the same service record twice.');
      ids.add(entry.id);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.serviceDate)) throw new Error('Service date is invalid.');
      if (typeof entry.serviceType !== 'string' || !entry.serviceType.trim() || entry.serviceType.trim().length > 100) throw new Error('Give each service record a type under 100 characters.');
      if (entry.archived != null && typeof entry.archived !== 'boolean') throw new Error('Service record choice is invalid.');
      if (entry.mileage != null && (!Number.isInteger(entry.mileage) || entry.mileage < 0 || entry.mileage > 10_000_000)) throw new Error('Mileage is invalid.');
      for (const [key, label, max] of [['vendor', 'Service provider', 120], ['notes', 'Service notes', 500]] as const) {
        const value = entry[key];
        if (value != null && (typeof value !== 'string' || value.trim().length > max)) throw new Error(`${label} is invalid.`);
      }
    }
  }
}

function assertValidBusRoute(data: Pick<OfficeBusRoute, 'name' | 'color' | 'capacity' | 'vehicle' | 'notifyFamiliesOnAlert' | 'notifyFamiliesOnArrival' | 'requireReleaseConfirmations' | 'stops'>): void {
  if (!data.name.trim() || data.name.trim().length > 100) throw new Error('Give the route a name under 100 characters.');
  if (!/^#[0-9a-f]{6}$/i.test(data.color)) throw new Error('Choose a valid route color.');
  if (data.notifyFamiliesOnAlert != null && typeof data.notifyFamiliesOnAlert !== 'boolean') throw new Error('Family notification choice is invalid.');
  if (data.notifyFamiliesOnArrival != null && typeof data.notifyFamiliesOnArrival !== 'boolean') throw new Error('Arrival notification choice is invalid.');
  if (data.requireReleaseConfirmations != null && typeof data.requireReleaseConfirmations !== 'boolean') throw new Error('Release confirmation choice is invalid.');
  if (data.capacity != null && (!Number.isInteger(data.capacity) || data.capacity < 1 || data.capacity > 200)) {
    throw new Error('Bus capacity must be between 1 and 200.');
  }
  assertValidVehicle(data.vehicle);
  if (!Array.isArray(data.stops) || data.stops.length > 100) throw new Error('A route can have up to 100 stops.');
  let schoolStops = 0;
  const ids = new Set<string>();
  for (const stop of data.stops) {
    assertSafeFieldId(stop.id, 'Stop');
    if (ids.has(stop.id)) throw new Error('A route cannot contain the same stop twice.');
    ids.add(stop.id);
    if (!stop.name.trim() || stop.name.trim().length > 120) throw new Error('Give every stop a name under 120 characters.');
    if (!Number.isFinite(stop.lat) || !Number.isFinite(stop.lng) || stop.lat < -90 || stop.lat > 90 || stop.lng < -180 || stop.lng > 180) {
      throw new Error('Every stop must have a valid map location.');
    }
    for (const time of [stop.amTime, stop.pmTime]) {
      if (time != null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Stop times must use a valid time.');
    }
    if (stop.isSchool) schoolStops += 1;
  }
  if (schoolStops > 1) throw new Error('A route can have only one school stop.');
  if (schoolStops === 1 && data.stops[data.stops.length - 1]?.isSchool !== true) {
    throw new Error('Keep the school as the last stop so afternoon runs start at school.');
  }
}

export async function upsertOfficeBusRoute(
  ctx: OfficeWriteContext,
  data: Omit<OfficeBusRoute, 'id' | 'updatedAt' | 'updatedBy'> & { id?: string; expectedUpdatedAt?: number | null },
): Promise<string> {
  assertValidBusRoute(data);
  const col = collection(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeBusRoutes');
  if (data.id && (await activeRouteIds(ctx, [data.id])).has(data.id)) {
    throw new Error('This bus is on the road. Wait until the run ends before changing its route.');
  }
  const ref = data.id ? doc(col, data.id) : doc(col);
  const { id: _id, expectedUpdatedAt: _expectedUpdatedAt, ...rest } = data;
  const payload = { ...rest, updatedAt: Date.now(), updatedBy: ctx.changedBy?.trim() || null };
  let before: OfficeBusRoute | null = null;
  await runTransaction(ctx.firestore, async (transaction) => {
    const beforeSnap = await transaction.get(ref);
    before = beforeSnap.exists() ? (beforeSnap.data() as OfficeBusRoute) : null;
    if (data.id && data.expectedUpdatedAt != null && before && before.updatedAt !== data.expectedUpdatedAt) {
      throw new Error('This route changed in another window. Refresh it before saving.');
    }
    transaction.set(ref, payload, { merge: true });
  });
  await audit(ctx, {
    entityType: 'officeBusRoute',
    entityId: ref.id,
    action: before ? 'update' : 'create',
    summary: before ? `Updated bus route ${busLabel(data)}` : `Added bus route ${busLabel(data)}`,
    before: before ? officeAuditSnapshot(before as unknown as Record<string, unknown>) : null,
    after: officeAuditSnapshot(payload as unknown as Record<string, unknown>),
  });
  return ref.id;
}

export async function archiveOfficeBusRoute(ctx: OfficeWriteContext, route: OfficeBusRoute): Promise<void> {
  if ((await activeRouteIds(ctx, [route.id])).has(route.id)) {
    throw new Error('This bus is on the road. Wait until the run ends before removing its route.');
  }
  const fields = await archiveOfficeDoc(ctx, 'officeBusRoutes', route.id);
  await audit(ctx, {
    entityType: 'officeBusRoute',
    entityId: route.id,
    action: 'delete',
    summary: `Removed bus route ${busLabel(route)}`,
    before: officeAuditSnapshot(route as unknown as Record<string, unknown>),
    after: officeAuditSnapshot(fields),
  });
}

/** Sets how several students get home in one save (e.g. assigning riders to a route). */
export async function setOfficeStudentsTransport(
  ctx: OfficeWriteContext,
  changes: Array<{
    student: OfficeStudent;
    studentName: string;
    patch: Pick<OfficeStudent, 'transportMode' | 'busRouteId' | 'busStopId'>;
  }>,
  describe: (studentName: string) => string,
): Promise<void> {
  if (changes.length === 0) return;
  if (changes.some((change) => change.patch.transportMode !== 'bus' && (change.patch.busRouteId || change.patch.busStopId))) {
    throw new Error('Choose “Not set” before saving a different pickup plan.');
  }
  const busChanges = changes.filter((change) => change.patch.transportMode === 'bus');
  const routeIds = [...new Set(busChanges.map((change) => change.patch.busRouteId).filter((id): id is string => !!id))];
  const affectedRouteIds = [
    ...new Set([...routeIds, ...changes.flatMap((change) => [change.student.busRouteId, change.patch.busRouteId].filter((id): id is string => !!id))]),
  ];
  const active = await activeRouteIds(ctx, affectedRouteIds);
  if (changes.some((change) => active.has(change.student.busRouteId ?? '') || active.has(change.patch.busRouteId ?? ''))) {
    throw new Error('A rider on that bus is currently on a run. Wait until the run ends before changing riders.');
  }
  if (busChanges.some((change) => !change.patch.busRouteId)) {
    throw new Error('Choose a bus route before saving a bus rider.');
  }
  const routeSnaps = await Promise.all(routeIds.map((id) => getDoc(doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeBusRoutes', id))));
  const routesById = new Map(routeIds.map((id, index) => [id, routeSnaps[index]]));
  for (const change of busChanges) {
    const route = routesById.get(change.patch.busRouteId!);
    const routeData = route?.data() as OfficeBusRoute | undefined;
    if (!route?.exists() || routeData?.archived) throw new Error('That bus route is no longer available.');
    if (change.patch.busStopId && !routeData?.stops?.some((stop: OfficeBusStop) => stop.id === change.patch.busStopId && !stop.isSchool)) {
      throw new Error('Choose a current stop on this bus route.');
    }
  }

  const now = Date.now();
  const chunkSize = 400;
  for (let start = 0; start < changes.length; start += chunkSize) {
    const chunk = changes.slice(start, start + chunkSize);
    const batch = writeBatch(ctx.firestore);
    for (const c of chunk) {
      batch.update(doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeStudents', c.student.id), { ...c.patch, updatedAt: now });
    }
    await batch.commit();
    for (const c of chunk) {
      await audit(ctx, {
        entityType: 'officeStudent',
        entityId: c.student.id,
        action: 'update',
        summary: describe(c.studentName),
        before: officeAuditSnapshot({
          transportMode: c.student.transportMode ?? null,
          busRouteId: c.student.busRouteId ?? null,
          busStopId: c.student.busStopId ?? null,
        }),
        after: officeAuditSnapshot(c.patch as Record<string, unknown>),
      });
    }
  }
}

/** @deprecated Trip writes go through /api/office/transport; these helpers remain for older callers. */
function tripRef(ctx: OfficeWriteContext, tripId: string) {
  return doc(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeBusTrips', tripId);
}

function routeSnapshot(route: OfficeBusRoute): OfficeBusRouteSnapshot {
  return routeSnapshotForRun(route);
}

/** Starts (or resumes) a run. A completed run is never overwritten. Returns the trip id. */
export async function startOfficeBusTrip(
  ctx: OfficeWriteContext,
  route: OfficeBusRoute,
  params: { tripId: string; date: string; run: OfficeBusRun },
): Promise<string> {
  const now = Date.now();
  const riderSnapshot = riderSnapshotFromStudents(
    (await getDocs(query(collection(ctx.firestore, 'schools', sid(ctx.schoolId), 'officeStudents'), where('busRouteId', '==', route.id)))).docs.map((snap) => ({
      ...(snap.data() as OfficeStudent),
      id: snap.id,
    })),
  );
  let tripId = params.tripId;
  let resumed = false;

  await runTransaction(ctx.firestore, async (transaction) => {
    let ref = tripRef(ctx, tripId);
    let snap = await transaction.get(ref);

    // The normal id is one run per route/day. If it was already completed, make a new
    // attempt instead of replacing the saved history (important for child safety records).
    while (snap.exists() && snap.data().status === 'done') {
      const suffix = `${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      tripId = `${params.tripId}_retry-${suffix}`;
      ref = tripRef(ctx, tripId);
      snap = await transaction.get(ref);
    }

    if (snap.exists()) {
      const existingTrip = snap.data() as OfficeBusTrip;
      transaction.update(ref, {
        status: 'active',
        endedAt: null,
        updatedAt: now,
        ...(existingTrip.routeSnapshot ? {} : { routeSnapshot: routeSnapshot(route) }),
        ...(existingTrip.riderSnapshot ? {} : { riderSnapshot }),
      });
      resumed = true;
    } else {
      transaction.set(ref, {
        routeId: route.id,
        routeSnapshot: routeSnapshot(route),
        riderSnapshot,
        date: params.date,
        run: params.run,
        status: 'active',
        driverName: ctx.changedBy?.trim() || route.driverName || null,
        startedAt: now,
        endedAt: null,
        location: null,
        stopArrivals: {},
        riders: {},
        alerts: [],
        childCheckDone: null,
        updatedAt: now,
      } satisfies Omit<OfficeBusTrip, 'id'>);
      resumed = false;
    }
  });

  await audit(ctx, {
    entityType: 'officeBusTrip',
    entityId: tripId,
    action: resumed ? 'update' : 'create',
    summary: `${busLabel(route)} ${resumed ? 'resumed' : 'started'} the ${RUN_WORD[params.run]} run`,
  });
  return tripId;
}

/** Live position from the driver's phone. Sent often, so it is not written to the change history. */
export async function updateOfficeBusTripLocation(
  ctx: OfficeWriteContext,
  tripId: string,
  location: OfficeBusLocation,
  reachedStopId?: string | null,
): Promise<void> {
  if (!Number.isFinite(location.lat) || !Number.isFinite(location.lng) || location.lat < -90 || location.lat > 90 || location.lng < -180 || location.lng > 180) {
    throw new Error('The bus location is outside the map.');
  }
  const patch: Record<string, unknown> = { location, updatedAt: Date.now() };
  if (reachedStopId) patch[`stopArrivals.${reachedStopId}`] = location.at;
  await updateDoc(tripRef(ctx, tripId), patch);
}

export async function setOfficeBusStopReached(
  ctx: OfficeWriteContext,
  trip: Pick<OfficeBusTrip, 'id' | 'routeSnapshot'>,
  stopId: string,
  reached: boolean,
): Promise<void> {
  assertSafeFieldId(stopId, 'Stop');
  if (trip.routeSnapshot && !trip.routeSnapshot.stops?.some((stop) => stop.id === stopId)) {
    throw new Error('That stop is not part of this saved run.');
  }
  await updateDoc(tripRef(ctx, trip.id), {
    [`stopArrivals.${stopId}`]: reached ? Date.now() : deleteField(),
    updatedAt: Date.now(),
  });
}

const RIDER_WORD: Record<OfficeBusRiderStatus, string> = { on: 'got on', off: 'got off', absent: 'was marked not riding' };

/** Who got on or off. Filed under the student so it shows on their card's History. */
export async function setOfficeBusRiders(
  ctx: OfficeWriteContext,
  trip: Pick<OfficeBusTrip, 'id' | 'run' | 'riderSnapshot'>,
  route: OfficeBusRoute,
  changes: Array<{ studentId: string; studentName: string; status: OfficeBusRiderStatus | null }>,
): Promise<void> {
  if (changes.length === 0) return;
  if (trip.riderSnapshot) {
    const allowed = new Set(trip.riderSnapshot);
    if (changes.some((change) => !allowed.has(change.studentId))) {
      throw new Error('That student was not assigned to this bus when the run began.');
    }
  }
  const now = Date.now();
  const patch: Record<string, unknown> = { updatedAt: now };
  for (const c of changes) {
    assertSafeFieldId(c.studentId, 'Student');
    patch[`riders.${c.studentId}`] = c.status ? { status: c.status, at: now } : deleteField();
  }
  await updateDoc(tripRef(ctx, trip.id), patch);
  for (const c of changes) {
    await audit(ctx, {
      entityType: 'officeBusTrip',
      entityId: c.studentId,
      action: 'update',
      summary: c.status
        ? `${c.studentName} ${RIDER_WORD[c.status]} ${busLabel(route)} (${RUN_WORD[trip.run]})`
        : `Cleared ${c.studentName}'s ride mark on ${busLabel(route)} (${RUN_WORD[trip.run]})`,
      after: officeAuditSnapshot({ tripId: trip.id, status: c.status }),
    });
  }
}

export async function addOfficeBusTripAlert(
  ctx: OfficeWriteContext,
  trip: Pick<OfficeBusTrip, 'id' | 'run'>,
  route: OfficeBusRoute,
  alert: Omit<OfficeBusTripAlert, 'id' | 'at' | 'by'>,
): Promise<void> {
  if (!['delay', 'breakdown', 'accident', 'behavior', 'other'].includes(alert.kind)) throw new Error('Choose a valid problem type.');
  if (alert.message && alert.message.length > 500) throw new Error('Keep the problem note under 500 characters.');
  if (alert.minutes != null && (!Number.isInteger(alert.minutes) || alert.minutes < 1 || alert.minutes > 240)) {
    throw new Error('Delay must be between 1 and 240 minutes.');
  }
  const entry: OfficeBusTripAlert = {
    ...alert,
    id: `alert-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    at: Date.now(),
    by: ctx.changedBy?.trim() || null,
  };
  await updateDoc(tripRef(ctx, trip.id), { alerts: arrayUnion(entry), updatedAt: Date.now() });
  await audit(ctx, {
    entityType: 'officeBusTrip',
    entityId: trip.id,
    action: 'update',
    summary: `${busLabel(route)} reported: ${alert.kind === 'delay' ? `running late${alert.minutes ? ` (${alert.minutes} min)` : ''}` : alert.kind}${alert.message ? ` — ${alert.message}` : ''}`,
    after: officeAuditSnapshot(entry as unknown as Record<string, unknown>),
  });
}

export async function endOfficeBusTrip(
  ctx: OfficeWriteContext,
  trip: Pick<OfficeBusTrip, 'id' | 'run'>,
  route: OfficeBusRoute,
  childCheckDone: boolean,
): Promise<void> {
  const now = Date.now();
  const snap = await getDoc(tripRef(ctx, trip.id));
  if (!snap.exists() || snap.data().status !== 'active') throw new Error('This bus run is not active.');
  const riders = (snap.data().riders ?? {}) as Record<string, { status?: string }>;
  if (Object.values(riders).some((rider) => rider.status === 'on')) {
    throw new Error('Mark every rider off before ending the run.');
  }
  if (!childCheckDone) throw new Error('Confirm that you walked the bus before ending the run.');
  await updateDoc(tripRef(ctx, trip.id), { status: 'done', endedAt: now, childCheckDone, updatedAt: now });
  await audit(ctx, {
    entityType: 'officeBusTrip',
    entityId: trip.id,
    action: 'update',
    summary: `${busLabel(route)} finished the ${RUN_WORD[trip.run]} run${childCheckDone ? ' · bus checked, nobody left on' : ' · end-of-run bus check not confirmed'}`,
  });
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

export async function archiveOfficeForm(ctx: OfficeWriteContext, form: OfficeForm): Promise<void> {
  const fields = await archiveOfficeDoc(ctx, 'officeForms', form.id);
  await audit(ctx, {
    entityType: 'officeForm',
    entityId: form.id,
    action: 'delete',
    summary: `Archived form "${form.title}"`,
    before: officeAuditSnapshot(form as unknown as Record<string, unknown>),
    after: officeAuditSnapshot(fields),
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

export async function archiveOfficeEvent(ctx: OfficeWriteContext, event: OfficeEvent): Promise<void> {
  const fields = await archiveOfficeDoc(ctx, 'officeEvents', event.id);
  await audit(ctx, {
    entityType: 'officeEvent',
    entityId: event.id,
    action: 'delete',
    summary: `Archived event ${event.title}`,
    before: officeAuditSnapshot(event as unknown as Record<string, unknown>),
    after: officeAuditSnapshot(fields),
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
