'use client';

import Link from 'next/link';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { formatCents } from '@/lib/office/officeNav';
import { officePublicHref } from '@/lib/officePublicUrl';
import { billingAccountForStudent, formatGradeDisplay, gradesForStudent, getOfficeStudentFullName } from '@/lib/office/officeUtils';
import type { OfficeBillingAccount, OfficeGradeEntry, OfficeStudent } from '@/lib/office/types';

type OfficeStudentSheetProps = {
  schoolId: string;
  student: OfficeStudent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classLabel?: string;
  gradeEntries: OfficeGradeEntry[];
  billingAccounts: OfficeBillingAccount[];
  activeTerm: string;
};

export function OfficeStudentSheet({
  schoolId,
  student,
  open,
  onOpenChange,
  classLabel,
  gradeEntries,
  billingAccounts,
  activeTerm,
}: OfficeStudentSheetProps) {
  if (!student) return null;

  const name = getOfficeStudentFullName(student);
  const grades = gradesForStudent(gradeEntries, student.id);
  const termGrades = grades.filter((g) => g.termLabel === activeTerm);
  const account = billingAccountForStudent(billingAccounts, student.id);
  const addGradeHref = `${officePublicHref(schoolId, 'grades')}?student=${encodeURIComponent(student.id)}&term=${encodeURIComponent(activeTerm)}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{name}</SheetTitle>
          <SheetDescription>
            {classLabel || 'No class'}
            {student.teacherName ? ` · ${student.teacherName}` : ''}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Billing</h3>
            {account ? (
              <div className="mt-2 rounded-xl border bg-muted/30 p-3 text-sm">
                <p className="font-semibold">{account.familyName}</p>
                <p className="text-teal-800 dark:text-teal-300 font-medium">
                  Balance: {formatCents(account.balanceCents || 0)}
                </p>
                {account.contactEmail ? <p className="text-muted-foreground mt-1">{account.contactEmail}</p> : null}
                {account.contactPhone ? <p className="text-muted-foreground">{account.contactPhone}</p> : null}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No billing account linked.</p>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Grades · {activeTerm}
              </h3>
              <Button asChild variant="outline" size="sm" className="h-8 rounded-lg text-xs">
                <Link href={addGradeHref}>Add grade</Link>
              </Button>
            </div>
            {termGrades.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {termGrades.map((g) => (
                  <li key={g.id} className="flex justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                    <span className="font-medium">{g.subject}</span>
                    <span className="text-muted-foreground">{formatGradeDisplay(g)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No grades recorded for this term yet.</p>
            )}
            {grades.length > termGrades.length ? (
              <p className="mt-2 text-xs text-muted-foreground">
                +{grades.length - termGrades.length} more in other terms
              </p>
            ) : null}
          </section>

          <p className="text-xs text-muted-foreground">
            This student is in the office roster only. Rewards arcade data is not linked automatically.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
