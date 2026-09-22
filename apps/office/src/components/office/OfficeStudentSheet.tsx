import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, OrphanSelectItem, isOrphanSelectValue, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronUp, Copy, ExternalLink, Mail, Pencil, Phone, Printer, Trash2, Check } from 'lucide-react';
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
import type { OfficeBillingAccount, OfficeGradeEntry, OfficeStudent, OfficeClass, OfficeTeacher } from '@/lib/office/types';
import { OfficeTeacherSelect } from '@/components/office/OfficeTeacherSelect';
import { OfficeEntityLink } from '@/components/office/OfficeEntityLink';

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
}: OfficeStudentSheetProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const teacherNameById = useMemo(() => new Map(teachers.map((t) => [t.id, t.name])), [teachers]);

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [classId, setClassId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [notes, setNotes] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [homeLanguage, setHomeLanguage] = useState('');
  const [enrollmentDate, setEnrollmentDate] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [showMoreEdit, setShowMoreEdit] = useState(false);
  const [showBackground, setShowBackground] = useState(false);

  // Firestore's live snapshot hands us a new `student` object on every background
  // update, not just when the sheet is opened for a different student. Re-seeding
  // (and force-closing edit mode) on every one of those would silently wipe out
  // whatever the admin is mid-way through typing - only do it when the sheet
  // actually opens or switches to a different student.
  const seededKeyRef = useRef<string | null>(null);
  const seededValuesRef = useRef<{
    firstName: string;
    lastName: string;
    nickname: string;
    classId: string;
    teacherId: string;
    notes: string;
    dateOfBirth: string;
    gender: string;
    address: string;
    homeLanguage: string;
    enrollmentDate: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    medicalNotes: string;
  } | null>(null);

  const isDirty = useCallback(() => {
    const seed = seededValuesRef.current;
    if (!seed) return false;
    return (
      firstName !== seed.firstName ||
      lastName !== seed.lastName ||
      nickname !== seed.nickname ||
      classId !== seed.classId ||
      teacherId !== seed.teacherId ||
      notes !== seed.notes ||
      dateOfBirth !== seed.dateOfBirth ||
      gender !== seed.gender ||
      address !== seed.address ||
      homeLanguage !== seed.homeLanguage ||
      enrollmentDate !== seed.enrollmentDate ||
      emergencyContactName !== seed.emergencyContactName ||
      emergencyContactPhone !== seed.emergencyContactPhone ||
      medicalNotes !== seed.medicalNotes
    );
  }, [
    firstName,
    lastName,
    nickname,
    classId,
    teacherId,
    notes,
    dateOfBirth,
    gender,
    address,
    homeLanguage,
    enrollmentDate,
    emergencyContactName,
    emergencyContactPhone,
    medicalNotes,
  ]);

  useEffect(() => {
    if (!open || !student) {
      seededKeyRef.current = null;
      return;
    }
    if (seededKeyRef.current === student.id) return;

    // seededKeyRef was already set once and the student changed under us without the
    // sheet ever closing - e.g. clicking a different row while this one is open. That
    // bypasses the close-confirmation below entirely, so guard it here too instead of
    // silently discarding whatever is mid-edit.
    if (seededKeyRef.current !== null && isEditing && isDirty()) {
      if (!confirm('Discard unsaved changes to this student?')) {
        onOpenChange(false);
        return;
      }
    }

    seededKeyRef.current = student.id;
    seededValuesRef.current = {
      firstName: student.firstName ?? '',
      lastName: student.lastName ?? '',
      nickname: student.nickname ?? '',
      classId: student.classId ?? '',
      teacherId: student.teacherId ?? '',
      notes: student.notes ?? '',
      dateOfBirth: student.dateOfBirth ?? '',
      gender: student.gender ?? '',
      address: student.address ?? '',
      homeLanguage: student.homeLanguage ?? '',
      enrollmentDate: student.enrollmentDate ?? '',
      emergencyContactName: student.emergencyContactName ?? '',
      emergencyContactPhone: student.emergencyContactPhone ?? '',
      medicalNotes: student.medicalNotes ?? '',
    };
    setFirstName(student.firstName ?? '');
    setLastName(student.lastName ?? '');
    setNickname(student.nickname ?? '');
    setClassId(student.classId ?? '');
    setTeacherId(student.teacherId ?? '');
    setNotes(student.notes ?? '');
    setDateOfBirth(student.dateOfBirth ?? '');
    setGender(student.gender ?? '');
    setAddress(student.address ?? '');
    setHomeLanguage(student.homeLanguage ?? '');
    setEnrollmentDate(student.enrollmentDate ?? '');
    setEmergencyContactName(student.emergencyContactName ?? '');
    setEmergencyContactPhone(student.emergencyContactPhone ?? '');
    setMedicalNotes(student.medicalNotes ?? '');
    setIsEditing(false);
    setShowMoreEdit(false);
    setShowBackground(false);
  }, [student, open, isEditing, onOpenChange, isDirty]);

  if (!student) return null;

  const name = getOfficeStudentFullName(student);
  const grades = gradesForStudent(gradeEntries, student.id);
  const termGrades = grades.filter((g) => g.termLabel === activeTerm);
  const account = billingAccountForStudent(billingAccounts, student.id);
  const addGradeHref = `${officePublicHref(schoolId, 'grades')}?student=${encodeURIComponent(student.id)}&term=${encodeURIComponent(activeTerm)}`;
  const printReportHref = `${officePublicHref(schoolId, 'reports')}?report=grades&student=${encodeURIComponent(student.id)}&term=${encodeURIComponent(activeTerm)}`;
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
        teacherId: teacherId || null,
        teacherName: null,
        notes: notes.trim() || null,
        dateOfBirth: dateOfBirth || null,
        gender: gender.trim() || null,
        address: address.trim() || null,
        homeLanguage: homeLanguage.trim() || null,
        enrollmentDate: enrollmentDate || null,
        emergencyContactName: emergencyContactName.trim() || null,
        emergencyContactPhone: emergencyContactPhone.trim() || null,
        medicalNotes: medicalNotes.trim() || null,
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

  const handleOpenChange = (next: boolean) => {
    if (!next && isEditing) {
      if (isDirty() && !confirm('Discard unsaved changes to this student?')) return;
      setIsEditing(false);
    }
    onOpenChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
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
            <SheetDescription className="flex flex-wrap items-center gap-1">
              {student.classId ? (
                <OfficeEntityLink
                  kind="class"
                  id={student.classId}
                  label={classLabel || 'Class'}
                  muted
                />
              ) : (
                <span>No class</span>
              )}
              {student.teacherId ? (
                <>
                  <span>·</span>
                  <OfficeEntityLink
                    kind="teacher"
                    id={student.teacherId}
                    label={getOfficeTeacherLabel(student, teacherNameById)}
                    muted
                  />
                </>
              ) : null}
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
                  <OrphanSelectItem
                    value={classId}
                    entityName="class"
                    show={isOrphanSelectValue(classId, classes, { requireNonEmptyOptions: true })}
                  />
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

            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-xl" />
            </div>

            <div className="pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2 text-xs text-muted-foreground"
                onClick={() => setShowMoreEdit((v) => !v)}
              >
                {showMoreEdit ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {showMoreEdit ? 'Hide background details' : 'More background details'}
              </Button>
            </div>

            {showMoreEdit && (
              <div className="space-y-4 rounded-xl border bg-muted/20 p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Date of birth (optional)</Label>
                    <Input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Gender (optional)</Label>
                    <Input value={gender} onChange={(e) => setGender(e.target.value)} className="rounded-xl" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Address (optional)</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} className="rounded-xl" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Home language (optional)</Label>
                    <Input
                      value={homeLanguage}
                      onChange={(e) => setHomeLanguage(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Enrollment date (optional)</Label>
                    <Input
                      type="date"
                      value={enrollmentDate}
                      onChange={(e) => setEnrollmentDate(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Emergency contact name (optional)</Label>
                    <Input
                      value={emergencyContactName}
                      onChange={(e) => setEmergencyContactName(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Emergency contact phone (optional)</Label>
                    <Input
                      value={emergencyContactPhone}
                      onChange={(e) => setEmergencyContactPhone(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Allergies / medical notes (optional)</Label>
                  <Textarea
                    value={medicalNotes}
                    onChange={(e) => setMedicalNotes(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>
            )}

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

            <section>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2 text-xs text-muted-foreground"
                onClick={() => setShowBackground((v) => !v)}
              >
                {showBackground ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {showBackground ? 'Hide background' : 'More'}
              </Button>

              {showBackground && (
                <div className="mt-2 space-y-2 rounded-xl border bg-muted/20 p-3 text-sm">
                  <BackgroundRow label="Date of birth" value={student.dateOfBirth} />
                  <BackgroundRow label="Gender" value={student.gender} />
                  <BackgroundRow label="Address" value={student.address} />
                  <BackgroundRow label="Home language" value={student.homeLanguage} />
                  <BackgroundRow label="Enrollment date" value={student.enrollmentDate} />
                  <BackgroundRow label="Emergency contact" value={student.emergencyContactName} />
                  <BackgroundRow label="Emergency phone" value={student.emergencyContactPhone} />
                  <BackgroundRow label="Allergies / medical notes" value={student.medicalNotes} />
                  {!student.dateOfBirth &&
                    !student.gender &&
                    !student.address &&
                    !student.homeLanguage &&
                    !student.enrollmentDate &&
                    !student.emergencyContactName &&
                    !student.emergencyContactPhone &&
                    !student.medicalNotes && (
                      <p className="text-muted-foreground">
                        No background details yet. Select the pencil above to add some.
                      </p>
                    )}
                </div>
              )}
            </section>

          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function BackgroundRow({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
