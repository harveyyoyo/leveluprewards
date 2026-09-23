import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, OrphanSelectItem, isOrphanSelectValue, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, ChevronDown, ChevronUp, Copy, ExternalLink, Mail, Pencil, Phone, Printer, Trash2, Check } from 'lucide-react';
import Link from 'next/link';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { formatCents } from '@/lib/office/officeNav';
import { officeAbsoluteHref, officePublicHref } from '@/lib/officePublicUrl';
import { useOfficeWrite } from '@/lib/office/useOfficeWrite';
import { useOfficePortalChrome } from '@/components/office/OfficePortalChrome';
import { useOfficeEntityHistory } from '@/lib/office/useOfficeEntityHistory';
import { useOfficeAttendanceForStudent } from '@/lib/office/useOfficeAttendance';
import {
  billingAccountForStudent,
  formatGradeDisplay,
  getOfficeTeacherLabel,
  gradesForStudent,
  getOfficeStudentFullName,
} from '@/lib/office/officeUtils';
import type { OfficeBillingAccount, OfficeFamily, OfficeGradeEntry, OfficeStudent, OfficeClass, OfficeTeacher } from '@/lib/office/types';
import { OfficeTeacherSelect } from '@/components/office/OfficeTeacherSelect';
import { OfficeEntityLink } from '@/components/office/OfficeEntityLink';
import { OfficeStudentPhotoUpload } from '@/components/office/OfficeStudentPhotoUpload';
import { OfficeStudentDocumentsPanel } from '@/components/office/OfficeStudentDocumentsPanel';
import { safeString } from '@/lib/safeDisplayValue';

type StudentStatus = NonNullable<OfficeStudent['status']>;

const STATUS_LABEL: Record<StudentStatus, string> = {
  active: 'Active',
  withdrawn: 'Withdrawn',
  graduated: 'Graduated',
};

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
  allStudents?: OfficeStudent[];
  families?: OfficeFamily[];
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
  allStudents = [],
  families = [],
}: OfficeStudentSheetProps) {
  const { toast } = useToast();
  const write = useOfficeWrite(schoolId);
  const { features } = useOfficePortalChrome();

  const teacherNameById = useMemo(() => new Map(teachers.map((t) => [t.id, t.name])), [teachers]);

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [classId, setClassId] = useState('');
  const [teacherIds, setTeacherIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [status, setStatus] = useState<StudentStatus>('active');
  const [tagsText, setTagsText] = useState('');
  const [busy, setBusy] = useState(false);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    if (student) {
      setFirstName(student.firstName ?? '');
      setLastName(student.lastName ?? '');
      setNickname(student.nickname ?? '');
      setClassId(student.classId ?? '');
      setTeacherIds(student.teacherIds ?? (student.teacherId ? [student.teacherId] : []));
      setNotes(student.notes ?? '');
      setDateOfBirth(student.dateOfBirth ?? '');
      setStatus((student.status as StudentStatus | undefined) ?? 'active');
      setTagsText((student.tags ?? []).join(', '));
    }
    setIsEditing(false);
    setShowMore(false);
  }, [student, open]);

  const family = useMemo(
    () => (student?.familyId ? families.find((f) => f.id === student.familyId) ?? null : null),
    [families, student],
  );

  const siblings = useMemo(() => {
    if (!student?.familyId) return [];
    return allStudents.filter((s) => s.id !== student.id && s.familyId === student.familyId);
  }, [allStudents, student]);

  const { entries: historyEntries } = useOfficeEntityHistory(schoolId, student?.id ?? null, open && !!student);
  const { entries: attendanceEntries } = useOfficeAttendanceForStudent(schoolId, student?.id ?? null, open && !!student);

  const recentAbsences = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffIso = cutoff.toISOString().slice(0, 10);
    return attendanceEntries.filter((e) => e.date >= cutoffIso && (e.status === 'absent' || e.status === 'late'))
      .length;
  }, [attendanceEntries]);

  if (!student) return null;

  const name = getOfficeStudentFullName(student);
  const grades = gradesForStudent(gradeEntries, student.id);
  const termGrades = grades.filter((g) => g.termLabel === activeTerm);
  const account = billingAccountForStudent(billingAccounts, student.id);
  const addGradeHref = `${officePublicHref(schoolId, 'grades')}?student=${encodeURIComponent(student.id)}&term=${encodeURIComponent(activeTerm)}`;
  const printReportHref = `${officePublicHref(schoolId, 'reports')}?report=grades&student=${encodeURIComponent(student.id)}&term=${encodeURIComponent(activeTerm)}`;
  const billingHref = officePublicHref(schoolId, 'billing');
  const currentStatus: StudentStatus = (student.status as StudentStatus | undefined) ?? 'active';
  const hasMedicalNote = !!family?.medicalNotes?.trim();
  const primaryContact = family?.contacts?.find((c) => c.isPrimary) ?? family?.contacts?.[0] ?? null;

  const handleSave = async () => {
    if (!write.ctx) return;
    if (!firstName.trim() || !lastName.trim()) {
      toast({ variant: 'destructive', title: 'First and last name are required.' });
      return;
    }
    setBusy(true);
    try {
      const tags = tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      await write.updateOfficeStudent(
        write.ctx,
        student.id,
        {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          nickname: nickname.trim() || null,
          classId: classId || null,
          teacherId: teacherIds[0] ?? null,
          teacherIds: teacherIds,
          teacherName: null,
          notes: notes.trim() || null,
          dateOfBirth: dateOfBirth || null,
          status,
          tags: tags.length > 0 ? tags : null,
        },
        `Updated student ${firstName.trim()} ${lastName.trim()}`.trim(),
      );
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
    if (!confirm(`Are you sure you want to permanently delete ${name}? All grade entries and billing linkages will be cleaned up. If you just want to remove them from the active roster, use Status → Withdrawn or Graduated instead.`)) {
      return;
    }
    setBusy(true);
    try {
      const studentGradeIds = gradeEntries.filter((g) => g.studentId === student.id).map((g) => g.id);
      const billingUpdates = billingAccounts
        .filter((a) => a.studentIds.includes(student.id))
        .map((a) => ({ accountId: a.id, studentIds: a.studentIds.filter((id) => id !== student.id) }));

      await write.deleteOfficeStudentBatch(write.ctx, {
        student,
        gradeEntryIds: studentGradeIds,
        billingUpdates,
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
              <div className="flex items-center gap-2 min-w-0">
                <SheetTitle className="text-xl font-bold truncate">{name}</SheetTitle>
                {currentStatus !== 'active' ? (
                  <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[0.625rem] font-bold uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {STATUS_LABEL[currentStatus]}
                  </span>
                ) : null}
                {hasMedicalNote ? (
                  <span
                    className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[0.625rem] font-bold uppercase text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
                    title="This family has a medical note on file"
                  >
                    <AlertTriangle className="h-3 w-3" aria-hidden />
                    Medical
                  </span>
                ) : null}
              </div>
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
              {getTeacherIds(student).length > 0 ? (
                <>
                  <span>·</span>
                  {getTeacherIds(student).map((tId, idx) => (
                    <span key={tId} className="flex items-center gap-1">
                      {idx > 0 && <span>, </span>}
                      <OfficeEntityLink
                        kind="teacher"
                        id={tId}
                        label={teacherNameById.get(tId) ?? 'Teacher'}
                        muted
                      />
                    </span>
                  ))}
                </>
              ) : null}
            </SheetDescription>
          )}
        </SheetHeader>

        {isEditing ? (
          <div className="mt-6 space-y-4">
            {features.studentPhotos ? (
              <OfficeStudentPhotoUpload
                schoolId={schoolId}
                studentId={student.id}
                photoUrl={student.photoUrl}
                studentName={name}
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date of birth (optional)</Label>
                <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as StudentStatus)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="withdrawn">Withdrawn</SelectItem>
                    <SelectItem value="graduated">Graduated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              values={teacherIds}
              onValuesChange={setTeacherIds}
              multiple
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
                onClick={() => setShowMore((v) => !v)}
              >
                {showMore ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {showMore ? 'Hide tags' : 'More (tags)'}
              </Button>
            </div>

            {showMore ? (
              <div className="space-y-1.5 rounded-xl border bg-muted/20 p-3">
                <Label>Tags (optional, comma-separated)</Label>
                <Input
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  placeholder="e.g. needs a ride, scholarship"
                  className="rounded-xl"
                />
              </div>
            ) : null}

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
            {features.studentPhotos && student.photoUrl ? (
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={student.photoUrl}
                  alt=""
                  className="h-20 w-20 rounded-2xl border object-cover"
                />
              </div>
            ) : null}

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

            {features.familyProfiles ? (
              <section>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Family</h3>
                  {family ? <OfficeEntityLink kind="family" id={family.id} label="Open profile" /> : null}
                </div>
                {family ? (
                  <div className="mt-2 rounded-xl border bg-muted/30 p-3 text-sm space-y-2">
                    <p className="font-semibold">{safeString(family.displayName)}</p>
                    {primaryContact ? (
                      <div className="space-y-1 text-muted-foreground">
                        <p>{safeString(primaryContact.name)}</p>
                        {primaryContact.phone ? (
                          <a
                            href={`tel:${primaryContact.phone.replace(/\s/g, '')}`}
                            className="flex items-center gap-1.5 hover:text-foreground"
                          >
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            {primaryContact.phone}
                          </a>
                        ) : null}
                        {primaryContact.email ? (
                          <a href={`mailto:${primaryContact.email}`} className="flex items-center gap-1.5 hover:text-foreground">
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            {primaryContact.email}
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                    {siblings.length > 0 ? (
                      <div className="pt-1">
                        <p className="text-xs font-medium text-muted-foreground">Siblings</p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {siblings.map((sib) => (
                            <OfficeEntityLink
                              key={sib.id}
                              kind="student"
                              id={sib.id}
                              label={getOfficeStudentFullName(sib)}
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No family profile linked yet.</p>
                )}
              </section>
            ) : null}

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

            <section>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Attendance</h3>
                <Button asChild variant="outline" size="sm" className="h-8 rounded-lg text-xs">
                  <Link href={officePublicHref(schoolId, 'attendance')}>Take attendance</Link>
                </Button>
              </div>
              {attendanceEntries.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {recentAbsences > 0 ? (
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      {recentAbsences} absence{recentAbsences === 1 ? '' : 's'}/late{recentAbsences === 1 ? '' : 's'} in the last 30 days
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No absences in the last 30 days.</p>
                  )}
                  <ul className="space-y-1">
                    {attendanceEntries.slice(0, 5).map((e) => (
                      <li key={e.id} className="flex justify-between rounded-lg border px-2.5 py-1.5 text-xs">
                        <span>{e.date}</span>
                        <span className="font-medium capitalize">{e.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No attendance recorded yet.</p>
              )}
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
                onClick={() => setShowMore((v) => !v)}
              >
                {showMore ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {showMore ? 'Hide tags, documents & history' : 'More (tags, documents & history)'}
              </Button>

              {showMore ? (
                <div className="mt-2 space-y-4">
                  <OfficeStudentDocumentsPanel schoolId={schoolId} studentId={student.id} enabled={showMore} />

                  {student.tags && student.tags.length > 0 ? (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Tags</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {student.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-900 dark:bg-teal-950/50 dark:text-teal-200"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <p className="text-xs font-medium text-muted-foreground">History</p>
                    {historyEntries.length > 0 ? (
                      <ul className="mt-1 space-y-1.5">
                        {historyEntries.slice(0, 20).map((entry) => (
                          <li key={entry.id} className="rounded-lg border px-2.5 py-1.5 text-xs">
                            <p className="font-medium">{entry.summary}</p>
                            <p className="text-muted-foreground">
                              {new Date(entry.changedAt).toLocaleString()}
                              {entry.changedBy ? ` · ${safeString(entry.changedBy)}` : ''}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">No recorded changes yet.</p>
                    )}
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
