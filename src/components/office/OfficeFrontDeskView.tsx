'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, DoorOpen, HeartPulse, Info, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ContentSectionTreeNav } from '@/components/ui/content-section-tree-nav';
import { useToast } from '@/hooks/use-toast';
import { useOfficeConfirm } from '@/components/office/useOfficeConfirm';
import { useOfficeEntityNav } from '@/components/office/OfficeEntityNavProvider';
import { OfficeEmptyState } from '@/components/office/OfficeEmptyState';
import { OfficeLoadingRows } from '@/components/office/OfficeLoadingRows';
import { OfficeStudentPicker } from '@/components/office/OfficeStudentPicker';
import { useOfficeWrite } from '@/lib/office/useOfficeWrite';
import { useOfficeDeskLogForDate } from '@/lib/office/useOfficeDeskLog';
import { formatScheduleTime } from '@/lib/office/officeSchedule';
import { getOfficeStudentFullName } from '@/lib/office/officeUtils';
import type { OfficeDeskLogEntry, OfficeDeskLogKind, OfficeFamily, OfficeStudent } from '@/lib/office/types';
import { safeString } from '@/lib/safeDisplayValue';
import { cn } from '@/lib/utils';

type Tab = 'arrivals' | 'nurse';
const SOMEONE_ELSE = '__someone_else__';

const KIND_LABEL: Record<OfficeDeskLogKind, string> = {
  late_arrival: 'Late arrival',
  early_pickup: 'Early pickup',
  nurse_visit: 'Nurse visit',
};

const QUICK_REASONS: Record<OfficeDeskLogKind, string[]> = {
  late_arrival: ['Appointment', 'Overslept', 'Bus late', 'Family emergency'],
  early_pickup: ['Appointment', 'Sick', 'Family event'],
  nurse_visit: ['Headache', 'Stomach ache', 'Injury', 'Fever'],
};

function localIsoDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return localIsoDate(d);
}

type Draft = {
  kind: OfficeDeskLogKind;
  studentId: string;
  time: string;
  reason: string;
  pickedUpByChoice: string;
  pickedUpByOther: string;
  nurseAction: string;
  parentContacted: boolean;
  sentHome: boolean;
};

const emptyDraft = (kind: OfficeDeskLogKind): Draft => ({
  kind,
  studentId: '',
  time: nowTime(),
  reason: '',
  pickedUpByChoice: '',
  pickedUpByOther: '',
  nurseAction: '',
  parentContacted: false,
  sentHome: false,
});

type OfficeFrontDeskViewProps = {
  schoolId: string;
  students: OfficeStudent[];
  classNameById: Map<string, string>;
  familyById: Map<string, OfficeFamily>;
  isLoading: boolean;
};

/** Front desk: who came in late, who left early (and with whom), and nurse visits — day by day. */
export function OfficeFrontDeskView({ schoolId, students, classNameById, familyById, isLoading }: OfficeFrontDeskViewProps) {
  const write = useOfficeWrite(schoolId);
  const { toast } = useToast();
  const { confirm, confirmDialog } = useOfficeConfirm();
  const { openStudent } = useOfficeEntityNav();
  const today = localIsoDate();
  const [date, setDate] = useState(today);
  const [tab, setTab] = useState<Tab>('arrivals');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const { entries, isLoading: logLoading, error } = useOfficeDeskLogForDate(schoolId, date);

  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const nameOf = (id: string) => {
    const s = studentById.get(id);
    return s ? getOfficeStudentFullName(s) : 'Student';
  };

  const arrivals = entries.filter((e) => e.kind !== 'nurse_visit');
  const nurse = entries.filter((e) => e.kind === 'nurse_visit');
  const shown = tab === 'arrivals' ? arrivals : nurse;

  const draftStudent = draft?.studentId ? studentById.get(draft.studentId) : undefined;
  const draftFamily = draftStudent?.familyId ? familyById.get(draftStudent.familyId) : undefined;
  const familyContacts = (draftFamily?.contacts ?? []).filter((c) => c.name?.trim());

  const save = async () => {
    if (!draft || !write.ctx) return;
    if (!draft.studentId) {
      toast({ variant: 'destructive', title: 'Pick a student first.' });
      return;
    }
    let pickedUpBy: string | null = null;
    let pickupApproved: boolean | null = null;
    if (draft.kind === 'early_pickup') {
      if (draft.pickedUpByChoice === SOMEONE_ELSE) {
        pickedUpBy = draft.pickedUpByOther.trim() || null;
        pickupApproved = false;
      } else if (draft.pickedUpByChoice) {
        pickedUpBy = draft.pickedUpByChoice;
        pickupApproved = true;
      }
      if (!pickedUpBy) {
        toast({ variant: 'destructive', title: 'Who picked the student up?' });
        return;
      }
    }
    setBusy(true);
    try {
      await write.createOfficeDeskLog(
        write.ctx,
        {
          kind: draft.kind,
          studentId: draft.studentId,
          date,
          time: draft.time || nowTime(),
          reason: draft.reason.trim() || null,
          pickedUpBy,
          pickupApproved,
          nurseAction: draft.kind === 'nurse_visit' ? draft.nurseAction.trim() || null : null,
          parentContacted: draft.kind === 'nurse_visit' ? draft.parentContacted : null,
          sentHome: draft.kind === 'nurse_visit' ? draft.sentHome : null,
          notes: null,
        },
        nameOf(draft.studentId),
      );
      toast({ title: `${KIND_LABEL[draft.kind]} saved` });
      setDraft(null);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not save', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (entry: OfficeDeskLogEntry) => {
    if (!write.ctx) return;
    const ok = await confirm({
      title: `Remove this ${KIND_LABEL[entry.kind].toLowerCase()}?`,
      description: `${nameOf(entry.studentId)} at ${formatScheduleTime(entry.time)}. It stays in the change history.`,
      confirmLabel: 'Remove',
      tone: 'caution',
    });
    if (!ok) return;
    try {
      await write.archiveOfficeDeskLog(write.ctx, entry, nameOf(entry.studentId));
      toast({ title: 'Removed' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not remove', description: (e as Error).message });
    }
  };

  if (error) {
    return (
      <OfficeEmptyState
        icon={DoorOpen}
        title="The front desk log is almost ready"
        description="It will open here after the next update. Everything else in the office works as usual."
      />
    );
  }

  return (
    <div className="space-y-3">
      {confirmDialog}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-lg" aria-label="Previous day" onClick={() => setDate(shiftDate(date, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            type="date"
            value={date}
            max={today}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="h-9 w-40 rounded-lg"
            aria-label="Day"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg"
            aria-label="Next day"
            disabled={date >= today}
            onClick={() => setDate(shiftDate(date, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {date !== today ? (
            <button type="button" className="ml-1 text-xs font-medium text-teal-800 hover:underline dark:text-teal-300" onClick={() => setDate(today)}>
              Today
            </button>
          ) : null}
        </div>
        <Button
          type="button"
          className="gap-2 rounded-xl"
          onClick={() => setDraft(emptyDraft(tab === 'nurse' ? 'nurse_visit' : 'late_arrival'))}
        >
          <Plus className="h-4 w-4" />
          {tab === 'nurse' ? 'Nurse visit' : 'Arrival or pickup'}
        </Button>
      </div>

      <ContentSectionTreeNav
        items={[
          { id: 'arrivals', label: `Arrivals & pickups${arrivals.length ? ` (${arrivals.length})` : ''}`, icon: DoorOpen },
          { id: 'nurse', label: `Nurse${nurse.length ? ` (${nurse.length})` : ''}`, icon: HeartPulse },
        ]}
        value={tab}
        onValueChange={(v) => setTab(v as Tab)}
        aria-label="Front desk section"
      />

      {isLoading || logLoading ? (
        <OfficeLoadingRows cols={3} rows={3} />
      ) : shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-white px-4 py-8 text-center text-sm text-muted-foreground dark:border-slate-800 dark:bg-slate-900">
          {tab === 'nurse' ? 'No nurse visits' : 'No late arrivals or early pickups'} {date === today ? 'today' : 'this day'}.
        </p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {shown.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3 px-4 py-3">
              <span className="w-20 shrink-0 pt-0.5 text-sm tabular-nums text-muted-foreground">
                {formatScheduleTime(entry.time)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" className="text-sm font-medium hover:text-teal-800 dark:hover:text-teal-300" onClick={() => openStudent(entry.studentId)}>
                    {nameOf(entry.studentId)}
                  </button>
                  {entry.kind !== 'nurse_visit' ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {KIND_LABEL[entry.kind]}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {[
                    entry.reason,
                    entry.kind === 'early_pickup' && entry.pickedUpBy ? `Picked up by ${entry.pickedUpBy}` : null,
                    entry.kind === 'nurse_visit' ? entry.nurseAction : null,
                    entry.parentContacted ? 'Parent contacted' : null,
                    entry.sentHome ? 'Sent home' : null,
                    entry.recordedBy ? `by ${entry.recordedBy}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {entry.kind === 'early_pickup' && entry.pickupApproved === false ? (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="h-3 w-3" aria-hidden />
                    Not on the family&apos;s contact list
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => void remove(entry)}
                aria-label={`Remove ${KIND_LABEL[entry.kind].toLowerCase()} for ${nameOf(entry.studentId)}`}
                className="rounded-full p-1 text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!draft} onOpenChange={(open) => (!open ? setDraft(null) : undefined)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{draft ? KIND_LABEL[draft.kind] : ''}</DialogTitle>
          </DialogHeader>
          {draft ? (
            <div className="space-y-4">
              {draft.kind !== 'nurse_visit' ? (
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label="Kind">
                  {(['late_arrival', 'early_pickup'] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={draft.kind === k}
                      onClick={() => setDraft({ ...draft, kind: k, reason: '' })}
                      className={cn(
                        'rounded-lg py-1.5 text-sm font-medium transition-colors',
                        draft.kind === k ? 'bg-white shadow-sm dark:bg-slate-950' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {KIND_LABEL[k]}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="desk-student">Student</Label>
                  <OfficeStudentPicker
                    id="desk-student"
                    students={students}
                    classNameById={classNameById}
                    value={draft.studentId}
                    onChange={(studentId) => setDraft({ ...draft, studentId, pickedUpByChoice: '' })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="desk-time">Time</Label>
                  <Input
                    id="desk-time"
                    type="time"
                    value={draft.time}
                    onChange={(e) => setDraft({ ...draft, time: e.target.value })}
                    className="h-10 w-32 rounded-xl"
                  />
                </div>
              </div>

              {/* What the office needs to know before letting a student go or treating them. */}
              {draftStudent && draft.kind === 'early_pickup' && (draftFamily?.legalNotes?.trim() || draftStudent.pickupNotes?.trim()) ? (
                <div className="space-y-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                  {draftFamily?.legalNotes?.trim() ? (
                    <p className="flex gap-1.5">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span>
                        <span className="font-medium">Custody note:</span> {draftFamily.legalNotes}
                      </span>
                    </p>
                  ) : null}
                  {draftStudent.pickupNotes?.trim() ? (
                    <p className="flex gap-1.5">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span>
                        <span className="font-medium">Pickup notes:</span> {draftStudent.pickupNotes}
                      </span>
                    </p>
                  ) : null}
                </div>
              ) : null}
              {draftStudent && draft.kind === 'nurse_visit' && (draftStudent.allergies?.trim() || draftStudent.healthNotes?.trim() || draftFamily?.medicalNotes?.trim()) ? (
                <div className="space-y-1 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                  {draftStudent.allergies?.trim() ? (
                    <p>
                      <span className="font-medium">Allergies:</span> {draftStudent.allergies}
                    </p>
                  ) : null}
                  {draftStudent.healthNotes?.trim() ? (
                    <p>
                      <span className="font-medium">Health notes:</span> {draftStudent.healthNotes}
                    </p>
                  ) : null}
                  {draftFamily?.medicalNotes?.trim() ? (
                    <p>
                      <span className="font-medium">Family medical note:</span> {draftFamily.medicalNotes}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {draft.kind === 'early_pickup' ? (
                <div className="space-y-1.5">
                  <Label>Picked up by</Label>
                  <Select
                    value={draft.pickedUpByChoice}
                    onValueChange={(v) => setDraft({ ...draft, pickedUpByChoice: v })}
                    disabled={!draftStudent}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder={draftStudent ? 'Choose who' : 'Pick a student first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {familyContacts.map((c) => (
                        <SelectItem key={c.id} value={c.name}>
                          {c.name}
                          {c.relationship ? ` (${safeString(c.relationship)})` : ''}
                        </SelectItem>
                      ))}
                      <SelectItem value={SOMEONE_ELSE}>Someone else…</SelectItem>
                    </SelectContent>
                  </Select>
                  {draft.pickedUpByChoice === SOMEONE_ELSE ? (
                    <>
                      <Input
                        value={draft.pickedUpByOther}
                        onChange={(e) => setDraft({ ...draft, pickedUpByOther: e.target.value })}
                        placeholder="Their name and how they're related"
                        className="rounded-xl"
                      />
                      <p className="flex items-start gap-1.5 text-xs text-amber-800 dark:text-amber-300">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                        Not on the family&apos;s contact list — check ID and confirm with a parent before releasing.
                      </p>
                    </>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="desk-reason">{draft.kind === 'nurse_visit' ? 'What’s wrong?' : 'Reason'}</Label>
                <Input
                  id="desk-reason"
                  value={draft.reason}
                  onChange={(e) => setDraft({ ...draft, reason: e.target.value })}
                  placeholder="Optional"
                  className="rounded-xl"
                />
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_REASONS[draft.kind].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setDraft({ ...draft, reason: r })}
                      className={cn(
                        'rounded-full border px-2.5 py-0.5 text-xs',
                        draft.reason === r
                          ? 'border-teal-700 bg-teal-700 text-white'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200',
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {draft.kind === 'nurse_visit' ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="desk-action">What was done</Label>
                    <Input
                      id="desk-action"
                      value={draft.nurseAction}
                      onChange={(e) => setDraft({ ...draft, nurseAction: e.target.value })}
                      placeholder="e.g. Ice pack, rested 15 minutes"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={draft.parentContacted}
                        onCheckedChange={(c) => setDraft({ ...draft, parentContacted: c === true })}
                      />
                      Parent contacted
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={draft.sentHome} onCheckedChange={(c) => setDraft({ ...draft, sentHome: c === true })} />
                      Sent home
                    </label>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button type="button" className="rounded-xl" disabled={busy} onClick={() => void save()}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
