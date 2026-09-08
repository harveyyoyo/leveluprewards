import type { Firestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v1/https';

type Data = Record<string, any>;
export type LibraryActor = { uid: string; staff: boolean; studentId?: string; kiosk?: boolean };
const DAY = 86_400_000;
const fail = (message: string): never => { throw new HttpsError('failed-precondition', message); };
export function libraryId(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 200 || value.includes('/')) {
    throw new HttpsError('invalid-argument', `Invalid ${label}.`);
  }
  return value.trim();
}
const numeric = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;

/** Every circulation change reads the copy and borrower inside one transaction.
 * The borrower write serializes concurrent checkouts, including different copies.
 * Request receipts make a retry after an uncertain network response safe. */
export async function runLibraryOperation(db: Firestore, schoolId: string, data: Data, actor: LibraryActor) {
  const action = data.action;
  if (!['checkout', 'return', 'renew', 'condition', 'archive', 'waive'].includes(action)) {
    throw new HttpsError('invalid-argument', 'Unknown library action.');
  }
  if (!['checkout', 'return'].includes(action) && !actor.staff) {
    throw new HttpsError('permission-denied', 'Library staff access required.');
  }
  const requestId = libraryId(data.requestId, 'request ID');
  const school = db.collection('schools').doc(schoolId);
  const receiptRef = school.collection('libraryRequests').doc(`${actor.uid}_${requestId}`);
  const itemId = action === 'waive' ? '' : libraryId(data.itemId, 'copy ID');
  const studentId = data.studentId ? libraryId(data.studentId, 'student ID') : '';
  if (!actor.staff && actor.studentId && actor.studentId !== studentId) {
    throw new HttpsError('permission-denied', 'Use your own student account.');
  }
  const fingerprint = JSON.stringify([action, itemId, studentId, data.expectedLoanId ?? null,
    data.expectedCheckedOutAt ?? null, data.condition ?? null, data.amount ?? null, data.reason ?? null]);
  return db.runTransaction(async tx => {
    const receipt = await tx.get(receiptRef);
    if (receipt.exists) {
      if (receipt.data()!.fingerprint !== fingerprint) fail('This request ID has already been used.');
      return receipt.data()!.result;
    }
    const schoolSnap = await tx.get(school);
    const settings = schoolSnap.data()?.appSettings ?? {};
    if (settings.payLibrary === false) fail('Library is not enabled.');
    if (!actor.staff && settings.libraryStudentKioskCheckoutEnabled === false &&
        settings.libraryAutoStudentPortalEnabled === false) fail('Student checkout is disabled.');
    const now = Date.now();
    const finish = (result: Data) => {
      tx.set(receiptRef, { fingerprint, result, createdAt: now, actorUid: actor.uid });
      return result;
    };
    if (action === 'waive') {
      if (!studentId) fail('Select a student.');
      const ref = school.collection('students').doc(studentId);
      const snap = await tx.get(ref);
      if (!snap.exists) fail('Student not found.');
      const reason = String(data.reason ?? '').trim().slice(0, 500);
      const balance = numeric(snap.data()!.libraryFineBalance, 0);
      const amount = numeric(data.amount, 0);
      if (!reason || amount <= 0 || amount > balance) fail('Enter a reason and an amount up to the fine balance.');
      tx.update(ref, { libraryFineBalance: balance - amount, libraryUpdatedAt: now });
      tx.set(school.collection('libraryEvents').doc(), {
        action, studentId, amount, reason, actorUid: actor.uid, date: now,
      });
      return finish({ success: true, message: `${amount} fine units waived.` });
    }
    const itemRef = school.collection('library').doc(itemId);
    const itemSnap = await tx.get(itemRef);
    if (!itemSnap.exists) fail('Book not found.');
    const item = itemSnap.data()!;
    if (action === 'condition' || action === 'archive') {
      if (item.status === 'checked_out') fail('Return this copy before changing its condition or archiving it.');
      const condition = data.condition;
      if (action === 'condition' && !['good', 'lost', 'damaged'].includes(condition)) fail('Choose a valid condition.');
      tx.update(itemRef, action === 'archive' ? { archived: true, archivedAt: now } : { condition });
      tx.set(school.collection('libraryEvents').doc(), {
        itemId, title: item.name, action, condition: condition ?? null, actorUid: actor.uid, date: now,
      });
      return finish({ success: true, message: action === 'archive' ? 'Copy archived. Loan history is preserved.' : 'Condition updated.' });
    }
    if (!studentId) fail('Select a student.');
    const studentRef = school.collection('students').doc(studentId);
    const studentSnap = await tx.get(studentRef);
    if (!studentSnap.exists) fail('Student not found.');
    const student = studentSnap.data()!;
    const loanDays = Math.max(1, numeric(settings.libraryLoanPeriodDays, 14));
    if (action === 'checkout') {
      if (item.archived || (item.condition && item.condition !== 'good')) fail('This copy is unavailable.');
      if (item.status === 'checked_out') {
        if (item.checkedOutTo === studentId) return finish({ action: 'already_done', itemId, item: { ...item, id: itemId } });
        return finish({ action: 'wrong_borrower', item: { ...item, id: itemId } });
      }
      const loans = await tx.get(school.collection('library').where('checkedOutTo', '==', studentId));
      const count = loans.docs.filter(d => d.data().status === 'checked_out').length;
      const max = numeric(settings.libraryMaxCheckoutsPerStudent, 3);
      if (max > 0 && count >= max) return finish({ action: 'limit_reached', currentCount: count, max });
      const loanRef = school.collection('libraryLoans').doc();
      const dueAt = now + loanDays * DAY;
      const changes = { status: 'checked_out', checkedOutTo: studentId, checkedOutAt: now, dueAt, activeLoanId: loanRef.id };
      tx.update(itemRef, changes);
      tx.update(studentRef, { libraryUpdatedAt: now });
      tx.set(loanRef, {
        itemId, studentId, title: item.name, upc: item.upc, checkedOutAt: now, dueAt,
        returnedAt: null, renewalCount: 0, actorUid: actor.uid,
      });
      tx.set(studentRef.collection('activities').doc(), { desc: `Checked out library item: ${item.name}`, amount: 0, date: now });
      return finish({ action: 'checkout', itemId, item: { ...item, id: itemId, ...changes }, dueAt });
    }
    if (item.status !== 'checked_out') return finish({ action: 'already_done', success: true, message: 'This copy is already returned.' });
    if (item.checkedOutTo !== studentId) return finish({ action: 'wrong_borrower', item: { ...item, id: itemId } });
    if ((data.expectedLoanId && item.activeLoanId !== data.expectedLoanId) ||
        (data.expectedCheckedOutAt != null && item.checkedOutAt !== data.expectedCheckedOutAt)) {
      fail('The loan changed. Refresh and scan the copy again.');
    }
    const loanRef = school.collection('libraryLoans').doc(item.activeLoanId || `legacy_${itemId}_${item.checkedOutAt || 0}`);
    const loanSnap = await tx.get(loanRef);
    const loan = loanSnap.data() ?? { itemId, studentId, title: item.name, upc: item.upc,
      checkedOutAt: item.checkedOutAt ?? null, dueAt: item.dueAt ?? null, renewalCount: 0, legacy: true };
    if (action === 'renew') {
      const dueAt = Math.max(now, numeric(item.dueAt, now)) + loanDays * DAY;
      tx.update(itemRef, { dueAt, activeLoanId: loanRef.id });
      tx.update(studentRef, { libraryUpdatedAt: now });
      tx.set(loanRef, { ...loan, dueAt, renewalCount: numeric(loan.renewalCount, 0) + 1, renewedAt: now, renewedBy: actor.uid });
      tx.set(school.collection('libraryEvents').doc(), { action, itemId, studentId, title: item.name, date: now, dueAt, actorUid: actor.uid });
      return finish({ success: true, dueAt, message: 'Loan renewed.' });
    }
    const categoryId = String(settings.libraryPointsCategoryId ?? '').trim();
    const category = categoryId ? await tx.get(school.collection('categories').doc(categoryId)) : null;
    const categoryName = category?.data()?.name ?? '';
    const mode = settings.libraryRewardMode || (categoryName ? 'app_points' : 'none');
    const daysOverdue = item.dueAt && now > item.dueAt ? Math.ceil((now - item.dueAt) / DAY) : 0;
    const fee = settings.libraryLateFeesEnabled !== false ? daysOverdue * numeric(settings.libraryLatePointsPerDay, 2) : 0;
    const bonus = daysOverdue === 0 ? numeric(settings.libraryOnTimeReturnPoints, 0) : 0;
    let pointsDelta = 0;
    const studentUpdates: Data = { libraryUpdatedAt: now };
    if (mode === 'fines' && fee > 0) {
      pointsDelta = fee;
      studentUpdates.libraryFineBalance = numeric(student.libraryFineBalance, 0) + fee;
    } else if (mode === 'isolated_points') {
      const current = numeric(student.libraryPoints, 0);
      studentUpdates.libraryPoints = Math.max(0, current + (fee > 0 ? -fee : bonus));
      pointsDelta = studentUpdates.libraryPoints - current;
    } else if (mode === 'app_points' && categoryName) {
      const current = numeric(student.points, 0);
      studentUpdates.points = Math.max(0, current + (fee > 0 ? -fee : bonus));
      pointsDelta = studentUpdates.points - current;
      studentUpdates.categoryPoints = { ...(student.categoryPoints ?? {}),
        [categoryName]: (student.categoryPoints?.[categoryName] ?? 0) + pointsDelta };
    }
    const changes = { status: 'available', checkedOutTo: null, checkedOutAt: null, dueAt: null, activeLoanId: null };
    tx.update(itemRef, changes);
    tx.update(studentRef, studentUpdates);
    tx.set(loanRef, { ...loan, returnedAt: now, returnedBy: actor.uid, daysOverdue, pointsDelta, rewardMode: mode });
    tx.set(studentRef.collection('activities').doc(), { desc: `Returned library item: ${item.name}`, amount: 0, date: now });
    if (pointsDelta !== 0) tx.set(studentRef.collection('activities').doc(), {
      desc: mode === 'fines' ? `Library late fine (${daysOverdue} days): ${item.name}` :
        pointsDelta < 0 ? `Library late fee: ${item.name}` : `Library on-time bonus: ${item.name}`,
      amount: mode === 'fines' ? 0 : pointsDelta, date: now,
    });
    return finish({ action: 'return', success: true, itemId, item: { ...item, id: itemId, ...changes },
      pointsDelta, daysOverdue, message: `Returned ${item.name}.${pointsDelta ? ` ${Math.abs(pointsDelta)} ${mode === 'fines' ? 'fine units added' : pointsDelta < 0 ? 'points deducted' : 'points added'}.` : ''}` });
  });
}
