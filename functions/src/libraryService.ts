import type { Firestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v1/https';

type Data = Record<string, any>;
export type LibraryActor = { uid: string; staff: boolean; studentId?: string; kiosk?: boolean };
const DAY = 86_400_000;
const DEFAULT_LIBRARY_LOCATION_ID = 'main';
const fail = (message: string): never => { throw new HttpsError('failed-precondition', message); };
function asLibraryLocationId(value: unknown): string {
  if (value == null || value === '') return DEFAULT_LIBRARY_LOCATION_ID;
  if (typeof value !== 'string' || !value.trim() || value.length > 80 || value.includes('/')) {
    throw new HttpsError('invalid-argument', 'Invalid library.');
  }
  return value.trim();
}
function itemLocationId(item: { libraryLocationId?: unknown } | null | undefined): string {
  return asLibraryLocationId(item?.libraryLocationId ?? DEFAULT_LIBRARY_LOCATION_ID);
}
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
  if (!['checkout', 'return', 'renew', 'condition', 'archive', 'delete', 'waive', 'review', 'label', 'report_damage', 'update_student'].includes(action)) {
    throw new HttpsError('invalid-argument', 'Unknown library action.');
  }
  if (!['checkout', 'return', 'review', 'report_damage'].includes(action) && !actor.staff) {
    throw new HttpsError('permission-denied', 'Library staff access required.');
  }
  const requestId = libraryId(data.requestId, 'request ID');
  const school = db.collection('schools').doc(schoolId);
  const receiptRef = school.collection('libraryRequests').doc(`${actor.uid}_${requestId}`);
  const itemId = action === 'waive' || action === 'update_student' ? '' : libraryId(data.itemId, 'copy ID');
  const studentId = data.studentId ? libraryId(data.studentId, 'student ID') : '';
  if (!actor.staff && actor.studentId && actor.studentId !== studentId) {
    throw new HttpsError('permission-denied', 'Use your own student account.');
  }
  const fingerprint = JSON.stringify([action, itemId, studentId, data.expectedLoanId ?? null,
    data.expectedCheckedOutAt ?? null, data.condition ?? null, data.amount ?? null, data.reason ?? null,
    data.rating ?? null, data.reviewText ?? null, data.override ?? null,
    data.libraryMaxCheckouts ?? null, data.libraryBlocked ?? null, data.libraryLocationId ?? null]);
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
    if (action === 'update_student') {
      if (!studentId) fail('Select a student.');
      const ref = school.collection('students').doc(studentId);
      const snap = await tx.get(ref);
      if (!snap.exists) fail('Student not found.');
      const updates: Data = { libraryUpdatedAt: now };
      if ('libraryMaxCheckouts' in data) {
        if (data.libraryMaxCheckouts === null || data.libraryMaxCheckouts === '') {
          updates.libraryMaxCheckouts = null;
        } else {
          updates.libraryMaxCheckouts = Math.max(0, Math.floor(numeric(data.libraryMaxCheckouts, 0)));
        }
      }
      if (typeof data.libraryBlocked === 'boolean') {
        updates.libraryBlocked = data.libraryBlocked;
      }
      if (Object.keys(updates).length <= 1) fail('Choose a library account change to save.');
      tx.update(ref, updates);
      tx.set(school.collection('libraryEvents').doc(), {
        action, studentId, libraryMaxCheckouts: updates.libraryMaxCheckouts ?? null,
        libraryBlocked: updates.libraryBlocked ?? null, actorUid: actor.uid, date: now,
      });
      return finish({ success: true, message: 'Student library account updated.', ...updates });
    }
    const itemRef = school.collection('library').doc(itemId);
    const itemSnap = await tx.get(itemRef);
    if (!itemSnap.exists) fail('Book not found.');
    const item = itemSnap.data()!;
    if (action === 'label') {
      // Printing a spine/barcode label marks the copy as fully processed — this is the only
      // server-trusted path that can flip it, since clients cannot write library/{itemId} directly.
      tx.update(itemRef, { labeled: true, labeledAt: now });
      tx.set(school.collection('libraryEvents').doc(), {
        itemId, title: item.name, action, actorUid: actor.uid, date: now,
      });
      return finish({ success: true, message: 'Copy marked as labeled.' });
    }
    if (action === 'report_damage') {
      // Lets a student flag a copy as damaged right after returning it — the only condition
      // change a non-staff actor may make, and only while the copy isn't out with someone else.
      if (!studentId) fail('Select a student.');
      if (item.status === 'checked_out') fail('This copy is still checked out — return it first.');
      if (item.condition === 'damaged') return finish({ success: true, message: 'Already marked as damaged.' });
      if (item.lastCheckedOutTo !== studentId) fail('You can only report damage on a book you just returned.');
      tx.update(itemRef, { condition: 'damaged' });
      tx.set(school.collection('libraryEvents').doc(), {
        itemId, title: item.name, action, condition: 'damaged', studentId, actorUid: actor.uid, date: now,
      });
      return finish({ success: true, message: 'Thanks for letting us know — a librarian will take a look.' });
    }
    if (action === 'condition' || action === 'archive' || action === 'delete') {
      if (item.status === 'checked_out') fail('Return this copy before changing its condition, archiving, or deleting it.');
      if (action === 'delete') {
        tx.delete(itemRef);
        tx.set(school.collection('libraryEvents').doc(), {
          itemId, title: item.name, action, actorUid: actor.uid, date: now,
        });
        return finish({ success: true, message: 'Copy permanently deleted.' });
      }
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

    if (action === 'review') {
      const rating = Math.min(5, Math.max(1, Math.round(numeric(data.rating, 5))));
      const reviewText = String(data.reviewText ?? '').trim().slice(0, 500);
      const studentName = data.studentName ? String(data.studentName).slice(0, 100) : `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim();
      const reviewRef = school.collection('libraryReviews').doc(`${studentId}_${itemId}`);
      const existingReview = await tx.get(reviewRef);
      if (existingReview.exists) {
        return finish({ success: true, message: 'You already reviewed this book.', alreadyReviewed: true });
      }
      if (item.checkedOutTo !== studentId && item.lastCheckedOutTo !== studentId) {
        fail('Borrow this book before reviewing it.');
      }
      tx.set(reviewRef, {
        itemId,
        isbn: item.isbn || '',
        studentId,
        studentName,
        rating,
        reviewText,
        createdAt: now,
      });
      const count = numeric(item.ratingCount, 0);
      const oldAvg = numeric(item.ratingAvg, 0);
      const newCount = count + 1;
      const newAvg = Math.round(((oldAvg * count + rating) / newCount) * 10) / 10;
      tx.update(itemRef, { ratingCount: newCount, ratingAvg: newAvg });
      const bonus = 5;
      const categoryId = String(settings.libraryPointsCategoryId ?? '').trim();
      const category = categoryId ? await tx.get(school.collection('categories').doc(categoryId)) : null;
      const categoryName = category?.data()?.name ?? '';
      const mode = settings.libraryRewardMode || (categoryName ? 'app_points' : 'none');
      const studentUpdates: Data = { libraryUpdatedAt: now };
      if (mode === 'isolated_points') {
        studentUpdates.libraryPoints = numeric(student.libraryPoints, 0) + bonus;
      } else if (mode === 'app_points' && categoryName) {
        studentUpdates.points = numeric(student.points, 0) + bonus;
        studentUpdates.categoryPoints = {
          ...(student.categoryPoints ?? {}),
          [categoryName]: (student.categoryPoints?.[categoryName] ?? 0) + bonus,
        };
      }
      tx.update(studentRef, studentUpdates);
      tx.set(studentRef.collection('activities').doc(), {
        desc: `Book review bonus (+${bonus} pts): ${item.name}`,
        amount: bonus,
        date: now,
      });
      return finish({ success: true, ratingAvg: newAvg, ratingCount: newCount, message: 'Thank you for reviewing this book!' });
    }

    const loanDays = Math.max(1, numeric(settings.libraryLoanPeriodDays, 14));
    if (action === 'checkout') {
      if (item.archived || (item.condition && item.condition !== 'good')) fail('This copy is unavailable.');
      // Only copies explicitly marked not-ready are blocked. Older catalog rows have no `labeled` field.
      if (item.labeled === false) fail('This copy still needs a spine label before it can be checked out.');
      if (item.status === 'checked_out') {
        if (item.checkedOutTo === studentId) return finish({ action: 'already_done', itemId, item: { ...item, id: itemId } });
        return finish({ action: 'wrong_borrower', item: { ...item, id: itemId } });
      }
      const staffOverride = actor.staff && data.override === true;
      if (student.libraryBlocked === true && !staffOverride) {
        fail('This student\'s library account is paused. A librarian can turn borrowing back on.');
      }
      if (data.libraryLocationId != null && data.libraryLocationId !== '') {
        const requestedLibrary = asLibraryLocationId(data.libraryLocationId);
        if (itemLocationId(item) !== requestedLibrary) {
          return finish({
            action: 'wrong_library',
            item: { ...item, id: itemId },
            libraryLocationId: itemLocationId(item),
            message: 'This book belongs to a different library.',
          });
        }
      }
      const loans = await tx.get(school.collection('library').where('checkedOutTo', '==', studentId));
      const locationId = itemLocationId(item);
      const count = loans.docs.filter(d =>
        d.data().status === 'checked_out' && itemLocationId(d.data()) === locationId).length;
      const defaultMax = numeric(settings.libraryMaxCheckoutsPerStudent, 3);
      const studentCustomMax = student.libraryMaxCheckouts != null ? numeric(student.libraryMaxCheckouts, -1) : -1;
      const max = studentCustomMax >= 0 ? studentCustomMax : defaultMax;
      if (max > 0 && count >= max && !staffOverride) return finish({ action: 'limit_reached', currentCount: count, max });
      const loanRef = school.collection('libraryLoans').doc();
      const dueAt = now + loanDays * DAY;
      const changes = { status: 'checked_out', checkedOutTo: studentId, checkedOutAt: now, dueAt, activeLoanId: loanRef.id };
      tx.update(itemRef, changes);
      tx.update(studentRef, { libraryUpdatedAt: now });
      tx.set(loanRef, {
        itemId, studentId, title: item.name, upc: item.upc, libraryLocationId: locationId,
        checkedOutAt: now, dueAt, returnedAt: null, renewalCount: 0, actorUid: actor.uid,
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
      const renewalDays = Math.max(1, numeric(settings.libraryRenewalDays, loanDays));
      const maxRenewals = numeric(settings.libraryMaxRenewals, 2);
      const allowRenewIfOverdue = settings.libraryAllowRenewIfOverdue === true;
      const currentRenewals = numeric(loan.renewalCount, 0);
      const staffOverride = actor.staff && data.override === true;
      if (!staffOverride && !allowRenewIfOverdue && item.dueAt && now > item.dueAt) fail('This loan is overdue. Return it or ask a librarian to renew it.');
      if (!staffOverride && maxRenewals > 0 && currentRenewals >= maxRenewals) fail(`This copy has already been renewed ${currentRenewals} time${currentRenewals === 1 ? '' : 's'}.`);
      const dueAt = Math.max(now, numeric(item.dueAt, now)) + renewalDays * DAY;
      tx.update(itemRef, { dueAt, activeLoanId: loanRef.id });
      tx.update(studentRef, { libraryUpdatedAt: now });
      tx.set(loanRef, { ...loan, dueAt, renewalCount: currentRenewals + 1, renewedAt: now, renewedBy: actor.uid });
      tx.set(school.collection('libraryEvents').doc(), { action, itemId, studentId, title: item.name, date: now, dueAt, actorUid: actor.uid });
      return finish({ success: true, dueAt, message: 'Loan renewed.' });
    }
    const categoryId = String(settings.libraryPointsCategoryId ?? '').trim();
    const category = categoryId ? await tx.get(school.collection('categories').doc(categoryId)) : null;
    const categoryName = category?.data()?.name ?? '';
    const mode = settings.libraryRewardMode || (categoryName ? 'app_points' : 'none');
    const daysOverdue = item.dueAt && now > item.dueAt ? Math.ceil((now - item.dueAt) / DAY) : 0;
    const graceDays = numeric(settings.libraryGracePeriodDays, 0);
    const chargeableDays = Math.max(0, daysOverdue - graceDays);
    const uncappedFee = settings.libraryLateFeesEnabled !== false ? chargeableDays * numeric(settings.libraryLatePointsPerDay, 2) : 0;
    const fineCap = numeric(settings.libraryMaxFineCap, 0);
    const fee = fineCap > 0 ? Math.min(uncappedFee, fineCap) : uncappedFee;
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
    const changes = { status: 'available', checkedOutTo: null, checkedOutAt: null, dueAt: null, activeLoanId: null, lastCheckedOutTo: studentId };
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
