import { useState, useEffect } from 'react';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, ExternalLink, Mail, Pencil, Phone, Printer, Trash2, Check } from 'lucide-react';
import Link from 'next/link';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { formatCents } from '@/lib/office/officeNav';
import { officePublicHref } from '@/lib/officePublicUrl';
import { billingAccountForStudent, formatGradeDisplay, gradesForStudent, getOfficeStudentFullName } from '@/lib/office/officeUtils';
import type { OfficeBillingAccount, OfficeGradeEntry, OfficeStudent, OfficeClass } from '@/lib/office/types';

type OfficeStudentSheetProps = {
  schoolId: string;
  student: OfficeStudent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classLabel?: string;
  gradeEntries: OfficeGradeEntry[];
  billingAccounts: OfficeBillingAccount[];
  activeTerm: string;
  classes?: OfficeClass[];
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
  classes = [],
}: OfficeStudentSheetProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [classId, setClassId] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (student) {
      setFirstName(student.firstName ?? '');
      setLastName(student.lastName ?? '');
      setNickname(student.nickname ?? '');
      setClassId(student.classId ?? '');
      setTeacherName(student.teacherName ?? '');
      setNotes(student.notes ?? '');
    }
    setIsEditing(false);
  }, [student, open]);

  if (!student) return null;

  const name = getOfficeStudentFullName(student);
  const grades = gradesForStudent(gradeEntries, student.id);
  const termGrades = grades.filter((g) => g.termLabel === activeTerm);
  const account = billingAccountForStudent(billingAccounts, student.id);
  const addGradeHref = `${officePublicHref(schoolId, 'grades')}?student=${encodeURIComponent(student.id)}&term=${encodeURIComponent(activeTerm)}`;
  const printReportHref = `${officePublicHref(schoolId, 'reports')}?student=${encodeURIComponent(student.id)}&term=${encodeURIComponent(activeTerm)}`;
  const billingHref = officePublicHref(schoolId, 'billing');

  const handleSave = async () => {
    if (!firestore) return;
    if (!firstName.trim() || !lastName.trim()) {
      toast({ variant: 'destructive', title: 'First and last name are required.' });
      return;
    }
    setBusy(true);
    try {
      await updateDoc(doc(firestore, 'schools', schoolId, 'officeStudents', student.id), {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        nickname: nickname.trim() || null,
        classId: classId || null,
        teacherName: teacherName.trim() || null,
        notes: notes.trim() || null,
        updatedAt: Date.now(),
      });
      toast({ title: 'Student profile updated' });
      setIsEditing(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Update failed', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!firestore) return;
    if (!confirm(`Are you sure you want to permanently delete ${name}? All grade entries and billing linkages will be cleaned up.`)) {
      return;
    }
    setBusy(true);
    try {
      const batch = writeBatch(firestore);
      // 1. Delete student
      batch.delete(doc(firestore, 'schools', schoolId, 'officeStudents', student.id));

      // 2. Delete grade entries
      const studentGrades = gradeEntries.filter((g) => g.studentId === student.id);
      for (const g of studentGrades) {
        batch.delete(doc(firestore, 'schools', schoolId, 'officeGradeEntries', g.id));
      }

      // 3. Clean up student ID from billing accounts
      const studentAccounts = billingAccounts.filter((a) => a.studentIds.includes(student.id));
      for (const a of studentAccounts) {
        const nextStudentIds = a.studentIds.filter((id) => id !== student.id);
        batch.update(doc(firestore, 'schools', schoolId, 'officeBillingAccounts', a.id), {
          studentIds: nextStudentIds,
          updatedAt: Date.now(),
        });
      }

      await batch.commit();
      toast({ title: 'Student deleted successfully' });
      onOpenChange(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Delete failed', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="relative">
          {isEditing ? (
            <SheetTitle>Edit Student Details</SheetTitle>
          ) : (
            <div className="flex items-center justify-between pr-6 gap-2">
              <SheetTitle className="text-xl font-bold">{name}</SheetTitle>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg hover:bg-muted/60"
                  aria-label="Copy name"
                  onClick={() => {
                    void navigator.clipboard.writeText(name);
                    toast({ title: 'Copied name' });
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditing(true)}
                  className="h-8 w-8 rounded-lg hover:bg-muted/60"
                  aria-label="Edit student"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          {!isEditing && (
            <SheetDescription>
              {classLabel || 'No class'}
              {student.teacherName ? ` · ${student.teacherName}` : ''}
            </SheetDescription>
          )}
        </SheetHeader>

        {isEditing ? (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First name</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label>Last name</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="rounded-xl" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Nickname (optional)</Label>
              <Input value={nickname} onChange={(e) => setNickname(e.target.value)} className="rounded-xl" />
            </div>

            <div className="space-y-1.5">
              <Label>Class</Label>
              <Select value={classId || '__none__'} onValueChange={(v) => setClassId(v === '__none__' ? '' : v)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="No class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No class</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Teacher (optional)</Label>
              <Input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} className="rounded-xl" />
            </div>

            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-xl" />
            </div>

            <div className="pt-4 border-t space-y-2">
              <div className="flex gap-2">
                <Button type="button" className="flex-1 rounded-xl" onClick={() => void handleSave()} disabled={busy}>
                  <Check className="mr-2 h-4 w-4" /> Save
                </Button>
                <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setIsEditing(false)} disabled={busy}>
                  Cancel
                </Button>
              </div>
              <Button
                type="button"
                variant="destructive"
                className="w-full rounded-xl gap-2 mt-2"
                onClick={() => void handleDelete()}
                disabled={busy}
              >
                <Trash2 className="h-4 w-4" /> Delete Student
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm" className="h-8 rounded-lg text-xs">
                <Link href={addGradeHref}>Add grade</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-8 rounded-lg text-xs gap-1">
                <Link href={billingHref}>
                  Billing
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-8 rounded-lg text-xs gap-1">
                <Link href={printReportHref}>
                  <Printer className="h-3 w-3" />
                  Print report
                </Link>
              </Button>
            </div>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Billing</h3>
              {account ? (
                <div className="mt-2 rounded-xl border bg-muted/30 p-3 text-sm">
                  <p className="font-semibold">{account.familyName}</p>
                  <p className="text-teal-800 dark:text-teal-300 font-medium">
                    Balance: {formatCents(account.balanceCents || 0)}
                  </p>
                  {account.contactEmail ? (
                    <a
                      href={`mailto:${account.contactEmail}`}
                      className="mt-2 flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      {account.contactEmail}
                    </a>
                  ) : null}
                  {account.contactPhone ? (
                    <a
                      href={`tel:${account.contactPhone.replace(/\s/g, '')}`}
                      className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      {account.contactPhone}
                    </a>
                  ) : null}
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

            {student.notes?.trim() && (
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Notes</h3>
                <p className="mt-2 text-sm bg-muted/20 border rounded-xl p-3">{student.notes}</p>
              </section>
            )}

            <p className="text-xs text-muted-foreground">
              This student is in the office roster only. Rewards arcade data is not linked automatically.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
