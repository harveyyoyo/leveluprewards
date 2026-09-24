'use client';

import { useMemo } from 'react';
import { useAppContext } from '@/components/AppProvider';
import { useOfficePortalData } from '@/components/office/OfficePortalGate';
import { useOfficeSharedData } from '@/lib/office/useOfficeSharedData';
import { useOfficeTerm } from '@/lib/office/useOfficeTerm';
import { useOfficeAttendanceForDate } from '@/lib/office/useOfficeAttendance';
import { useOfficeDeskLogForDate } from '@/lib/office/useOfficeDeskLog';
import { useReportOfficeAssistantResults } from '@/lib/office/officeAssistantResults';
import { dollarsParamToCents, findClassByAskedName, type OfficeAssistantView } from '@/lib/office/officeAssistantView';
import {
  OFFICE_ATTENDANCE_UNAVAILABLE,
  OFFICE_DESK_UNAVAILABLE,
  filterOfficeBillingAccounts,
  filterOfficeStudents,
  officeAttendanceListReport,
  officeAttendanceMatches,
  officeBillingListReport,
  officeDeskListReport,
  officeDeskShown,
  officeFailingStudentIds,
  officeInvoicesByAccount,
  officeOwedByAccount,
  officeStudentsListReport,
} from '@/lib/office/officeAssistantLists';
import { getOfficeStudentFullName, officeLocalIsoDate, studentIdsWithGradesForTerm } from '@/lib/office/officeUtils';
import type { OfficeStudent } from '@/lib/office/types';

/**
 * Works out a "show me" list for the answer without opening its page, using the same rules the
 * page uses, and reports it like the page would. Renders nothing.
 */
export function OfficeAssistantListPreview({ view, askAt }: { view: OfficeAssistantView; askAt: string }) {
  if (view.page === 'students') return <StudentsPreview view={view} askAt={askAt} />;
  if (view.page === 'billing') return <BillingPreview view={view} askAt={askAt} />;
  if (view.page === 'attendance') return <AttendancePreview view={view} askAt={askAt} />;
  if (view.page === 'frontdesk') return <FrontDeskPreview view={view} askAt={askAt} />;
  return null;
}

/** Whether the answer can list names for this view (the Transportation map just opens). */
export function officeAssistantViewHasList(view: OfficeAssistantView): boolean {
  return view.page === 'students' || view.page === 'billing' || view.page === 'attendance' || view.page === 'frontdesk';
}

type Props<P extends OfficeAssistantView['page']> = { view: Extract<OfficeAssistantView, { page: P }>; askAt: string };

const todayIso = () => officeLocalIsoDate();

const byName = (a: OfficeStudent, b: OfficeStudent) => getOfficeStudentFullName(a).localeCompare(getOfficeStudentFullName(b));

function StudentsPreview({ view, askAt }: Props<'students'>) {
  const { schoolId } = useAppContext();
  const shared = useOfficeSharedData(schoolId, true);
  const { gradeEntries, billingAccounts, isOfficeDataLoading } = useOfficePortalData();
  const { term } = useOfficeTerm(schoolId);
  const familyById = useMemo(() => new Map(shared.families.map((f) => [f.id, f])), [shared.families]);

  useReportOfficeAssistantResults(askAt, !shared.isLoading && !isOfficeDataLoading, () => {
    const cls = findClassByAskedName(shared.classes, view.className);
    const list = filterOfficeStudents(
      shared.students,
      {
        rosterFilter: view.show ?? 'all',
        classFilter: view.show === 'unassigned' ? '__unassigned__' : cls ? cls.id : 'all',
        homeroomFilter: 'all',
        query: view.text ?? '',
        teacherText: view.teacher ?? '',
        addressText: view.address ?? '',
        lastStarts: view.lastNameStarts ?? '',
        firstStarts: view.firstNameStarts ?? '',
        birthMonth: view.birthMonth,
        idsFilter: null,
      },
      {
        classNameById: shared.classNameById,
        teacherNameById: shared.teacherNameById,
        gradedForTerm: studentIdsWithGradesForTerm(gradeEntries, term),
        failingForTerm: officeFailingStudentIds(gradeEntries, term),
        billingAccounts,
        familyById,
      },
    );
    return officeStudentsListReport(list.slice().sort(byName), shared.classNameById, view.birthMonth);
  });
  return null;
}

function BillingPreview({ view, askAt }: Props<'billing'>) {
  const { schoolId } = useAppContext();
  const shared = useOfficeSharedData(schoolId, true);
  const { billingAccounts, invoices, isOfficeDataLoading } = useOfficePortalData();

  useReportOfficeAssistantResults(askAt, !shared.isLoading && !isOfficeDataLoading, () => {
    const owedByAccount = officeOwedByAccount(invoices);
    const list = filterOfficeBillingAccounts(
      billingAccounts,
      {
        search: view.family ?? '',
        minOwedCents: view.minOwed == null ? null : dollarsParamToCents(String(view.minOwed)),
        maxOwedCents: view.maxOwed == null ? null : dollarsParamToCents(String(view.maxOwed)),
        invoiceFilter: view.status ?? 'all',
      },
      { owedByAccount, invoicesByAccount: officeInvoicesByAccount(invoices), studentLabelById: shared.studentLabelById },
    );
    return officeBillingListReport(list, owedByAccount);
  });
  return null;
}

function AttendancePreview({ view, askAt }: Props<'attendance'>) {
  const { schoolId } = useAppContext();
  const shared = useOfficeSharedData(schoolId, true);
  const date = view.date ?? todayIso();
  const { entries, isLoading, error } = useOfficeAttendanceForDate(schoolId, date);

  useReportOfficeAssistantResults(askAt, !!error || (!shared.isLoading && !isLoading), () => {
    if (error) return { status: 'unavailable', message: OFFICE_ATTENDANCE_UNAVAILABLE };
    const cls = findClassByAskedName(shared.classes, view.className);
    const matches = officeAttendanceMatches(entries, view.status, cls?.id ?? null, shared.students, shared.classNameById);
    return officeAttendanceListReport(matches, view.status);
  });
  return null;
}

function FrontDeskPreview({ view, askAt }: Props<'frontdesk'>) {
  const { schoolId } = useAppContext();
  const shared = useOfficeSharedData(schoolId, true);
  const today = todayIso();
  const date = view.date && view.date <= today ? view.date : today;
  const { entries, isLoading, error } = useOfficeDeskLogForDate(schoolId, date);

  useReportOfficeAssistantResults(askAt, !!error || (!shared.isLoading && !isLoading), () => {
    if (error) return { status: 'unavailable', message: OFFICE_DESK_UNAVAILABLE };
    const tab = view.kind ? (view.kind === 'nurse_visit' ? 'nurse' : 'arrivals') : (view.tab ?? 'arrivals');
    const studentById = new Map(shared.students.map((s) => [s.id, s]));
    const nameOf = (id: string) => {
      const s = studentById.get(id);
      return s ? getOfficeStudentFullName(s) : 'Student';
    };
    return officeDeskListReport(officeDeskShown(entries, tab, view.kind), nameOf);
  });
  return null;
}
