import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, ExternalLink, Mail, Pencil, Phone, Printer, Trash2, Check } from 'lucide-react';
import Link from 'next/link';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { formatCents } from '@/lib/office/officeNav';
import { officeAbsoluteHref, officePublicHref } from '@/lib/officePublicUrl';
import {
  billingAccountForStudent,
  formatGradeDisplay,
  getOfficeTeacherLabel,
  gradesForStudent,
  getOfficeStudentFullName,
} from '@/lib/office/officeUtils';
import { safeString } from '@/lib/safeDisplayValue';
import type {
  OfficeBillingAccount,
  OfficeFamily,
  OfficeGradeEntry,
  OfficeStudent,
  OfficeClass,
  OfficeTeacher,
} from '@/lib/office/types';
import { OfficeTeacherSelect } from '@/components/office/OfficeTeacherSelect';
import { useOfficeWrite } from '@/lib/office/useOfficeWrite';
import { useOfficePortalChrome } from '@/components/office/OfficePortalChrome';
import { OfficeStudentPhotoUpload } from '@/components/office/OfficeStudentPhotoUpload';
import { useToast } from '@/hooks/use-toast';

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
  teachers?: OfficeTeacher[];
  families?: OfficeFamily[];
  onOpenFamily?: (familyId: string | null) => void;
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
  teachers = [],
  families = [],
  onOpenFamily,
}: OfficeStudentSheetProps) {
  const { toast } = useToast();
  const write = useOfficeWrite(schoolId);
  const { marksLabels, features } = useOfficePortalChrome();

  const teacherNameById = useMemo(
    () => new Map(teachers.map((t) => [t.id, safeString(t.name)])),
    [teachers],
  );

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [classId, setClassId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [familyId, setFamilyId] = useState('');
  const [busRoute, setBusRoute] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (student) {
      setFirstName(safeString(student.firstName));
      setLastName(safeString(student.lastName));
      setNickname(safeString(student.nickname));
      setClassId(safeString(student.classId));
      setTeacherId(safeString(student.teacherId));
      setFamilyId(safeString(student.familyId));
      setBusRoute(safeString(student.busRoute));
      setNotes(safeString(student.notes));
      setPhotoUrl(safeString(student.photoUrl));
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
    if (!write.ctx) return;
    if (!firstName.trim() || !lastName.trim()) {
      toast({ variant: 'destructive', title: 'First and last name are required.' });
      return;
    }
    setBusy(true);
    try {
      await write.updateOfficeStudent(write.ctx, student.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        nickname: nickname.trim() || null,
        classId: classId || null,
        teacherId: teacherId || null,
        teacherName: null,
        familyId: familyId || null,
        busRoute: features.busInfo ? busRoute.trim() || null : student.busRoute ?? null,
        notes: notes.trim() || null,
        photoUrl: photoUrl || null,
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
    if (!write.ctx) return;
    if (!confirm(`Are you sure you want to permanently delete ${name}? All grade entries and billing linkages will be cleaned up.`)) {
      return;
    }
    setBusy(true);
    try {
      const studentGrades = gradeEntries.filter((g) => g.studentId === student.id);
      const studentAccounts = billingAccounts.filter((a) => a.studentIds.includes(student.id));
      await write.deleteOfficeStudentBatch(write.ctx, {
        student,
        gradeEntryIds: studentGrades.map((g) => g.id),
        billingUpdates: studentAccounts.map((a) => ({
          accountId: a.id,
          studentIds: a.studentIds.filter((id) => id !== student.id),
        })),
      });
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
                  className="h-8 w-8 rounded-lg hover:bg-muted/60"
                  aria-label="Copy link to student"
                  onClick={() => {
                    const url = `${officeAbsoluteHref(schoolId, 'students')}?student=${encodeURIComponent(student.id)}`;
                    void navigator.clipboard.writeText(url);
                    toast({ title: 'Copied student link' });
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
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
              {getOfficeTeacherLabel(student, teacherNameById)
                ? ` · ${getOfficeTeacherLabel(student, teacherNameById)}`
                : ''}
            </SheetDescription>
          )}
        </SheetHeader>

        {isEditing ? (
          <div className="mt-6 space-y-4">
            {features.studentPhotos ? (
              <OfficeStudentPhotoUpload
                schoolId={schoolId}
                studentId={student.id}
                photoUrl={photoUrl}
                studentName={name}
                onPhotoUrl={setPhotoUrl}
              />
            ) : null}
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
                  {classId && classes.length > 0 && !classes.some((c) => c.id === classId) ? (
                    <SelectItem value={classId}>Unknown class (deleted)</SelectItem>
                  ) : null}
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <OfficeTeacherSelect
              schoolId={schoolId}
              teachers={teachers}
              value={teacherId}
              onChange={setTeacherId}
            />

            {features.familyProfiles ? (
              <div className="space-y-1.5">
                <Label>Family profile</Label>
                <Select value={familyId || '__none__'} onValueChange={(v) => setFamilyId(v === '__none__' ? '' : v)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="No family linked" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No family linked</SelectItem>
                    {families.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {onOpenFamily ? (
                  <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => onOpenFamily(familyId || null)}>
                    {familyId ? 'Edit family profile' : 'Create family profile'}
                  </Button>
                ) : null}
              </div>
            ) : null}

            {features.busInfo ? (
              <div className="space-y-1.5">
                <Label>Bus route</Label>
                <Input value={busRoute} onChange={(e) => setBusRoute(e.target.value)} className="rounded-xl" />
              </div>
            ) : null}

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
                <Link href={addGradeHref}>Add {marksLabels.singular}</Link>
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
                  {marksLabels.section} · {activeTerm}
                </h3>
                <Button asChild variant="outline" size="sm" className="h-8 rounded-lg text-xs">
                  <Link href={addGradeHref}>Add {marksLabels.singular}</Link>
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
                <p className="mt-2 text-sm text-muted-foreground">No {marksLabels.plural} recorded for this term yet.</p>
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

          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
