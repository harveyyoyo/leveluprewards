'use client';

import { useMemo, useState } from 'react';
import { Copy, Mail, Megaphone, Plus, Trash2, CalendarDays, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ContentSectionTreeNav } from '@/components/ui/content-section-tree-nav';
import { useToast } from '@/hooks/use-toast';
import { useOfficeWrite } from '@/lib/office/useOfficeWrite';
import { useOfficeForms } from '@/lib/office/useOfficeForms';
import { useOfficeEvents } from '@/lib/office/useOfficeEvents';
import { buildAnnouncementMailto, getOfficeStudentFullName, officeStudentsForClass } from '@/lib/office/officeUtils';
import { OfficeEmptyState } from '@/components/office/OfficeEmptyState';
import { OfficeLoadingRows } from '@/components/office/OfficeLoadingRows';
import { cn } from '@/lib/utils';
import type { OfficeClass, OfficeFamily, OfficeForm, OfficeFormResponseStatus, OfficeStudent } from '@/lib/office/types';

type OfficeCommunicationViewProps = {
  schoolId: string;
  students: OfficeStudent[];
  classes: OfficeClass[];
  families: OfficeFamily[];
  isLoading: boolean;
};

export function OfficeCommunicationView({ schoolId, students, classes, families, isLoading }: OfficeCommunicationViewProps) {
  const [section, setSection] = useState('announcements');

  if (isLoading) return <OfficeLoadingRows cols={2} rows={5} />;

  return (
    <div className="space-y-4">
      <ContentSectionTreeNav
        items={[
          { id: 'announcements', label: 'Announcements', icon: Megaphone },
          { id: 'forms', label: 'Permission slips', icon: ClipboardCheck },
          { id: 'events', label: 'Events', icon: CalendarDays },
        ]}
        value={section}
        onValueChange={setSection}
        aria-label="Communication section"
      />
      {section === 'announcements' ? (
        <AnnouncementsPanel students={students} classes={classes} families={families} />
      ) : null}
      {section === 'forms' ? (
        <FormsPanel schoolId={schoolId} students={students} classes={classes} />
      ) : null}
      {section === 'events' ? <EventsPanel schoolId={schoolId} /> : null}
    </div>
  );
}

function AnnouncementsPanel({
  students,
  classes,
  families,
}: {
  students: OfficeStudent[];
  classes: OfficeClass[];
  families: OfficeFamily[];
}) {
  const { toast } = useToast();
  const [audience, setAudience] = useState<'all' | string>('all');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const targetStudents = useMemo(
    () => (audience === 'all' ? students : officeStudentsForClass(students, audience)),
    [students, audience],
  );

  const emails = useMemo(() => {
    const familyIds = new Set(targetStudents.map((s) => s.familyId).filter((id): id is string => !!id));
    const set = new Set<string>();
    for (const family of families) {
      if (!familyIds.has(family.id)) continue;
      for (const contact of family.contacts ?? []) {
        if (contact.email?.trim()) set.add(contact.email.trim());
      }
    }
    return Array.from(set);
  }, [targetStudents, families]);

  return (
    <div className="space-y-4 rounded-2xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm text-muted-foreground">
        Opens your own email app with everyone&apos;s address filled in — nothing is sent from here. Nobody sees any
        other family&apos;s address (they go in Bcc).
      </p>
      <div className="space-y-2">
        <Label>Send to</Label>
        <Select value={audience} onValueChange={setAudience}>
          <SelectTrigger className="w-56 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All families</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {emails.length} email address{emails.length === 1 ? '' : 'es'} found across {targetStudents.length} student
          {targetStudents.length === 1 ? '' : 's'}.
        </p>
      </div>
      <div className="space-y-2">
        <Label>Subject</Label>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded-xl" />
      </div>
      <div className="space-y-2">
        <Label>Message</Label>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[140px] rounded-xl" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="rounded-xl gap-2"
          disabled={emails.length === 0 || !subject.trim()}
          onClick={() => {
            window.location.href = buildAnnouncementMailto({ emails, subject, body });
          }}
        >
          <Mail className="h-4 w-4" />
          Open in email app
        </Button>
        <Button
          type="button"
          variant="outline"
          className="rounded-xl gap-2"
          disabled={emails.length === 0}
          onClick={() => {
            void navigator.clipboard.writeText(emails.join(', '));
            toast({ title: 'Addresses copied' });
          }}
        >
          <Copy className="h-4 w-4" />
          Copy addresses
        </Button>
      </div>
    </div>
  );
}

const FORM_STATUS_LABEL: Record<OfficeFormResponseStatus, string> = {
  sent: 'Sent',
  returned: 'Returned',
  declined: 'Declined',
};

const FORM_STATUS_STYLES: Record<OfficeFormResponseStatus, string> = {
  sent: 'bg-muted text-muted-foreground',
  returned: 'bg-emerald-600 text-white',
  declined: 'bg-red-600 text-white',
};

function FormsPanel({
  schoolId,
  students,
  classes,
}: {
  schoolId: string;
  students: OfficeStudent[];
  classes: OfficeClass[];
}) {
  const { toast } = useToast();
  const write = useOfficeWrite(schoolId);
  const { forms, isLoading } = useOfficeForms(schoolId);
  const [open, setOpen] = useState(false);
  const [expandedFormId, setExpandedFormId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [targetClassId, setTargetClassId] = useState('all');
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    if (!write.ctx || !title.trim()) {
      toast({ variant: 'destructive', title: 'Give the form a title.' });
      return;
    }
    const targetStudents = targetClassId === 'all' ? students : officeStudentsForClass(students, targetClassId);
    if (targetStudents.length === 0) {
      toast({ variant: 'destructive', title: 'No students match that class.' });
      return;
    }
    setBusy(true);
    try {
      await write.createOfficeForm(write.ctx, {
        title: title.trim(),
        description: description.trim() || null,
        dueDate: dueDate || null,
        targetClassId,
        studentIds: targetStudents.map((s) => s.id),
      });
      toast({ title: 'Form sent', description: `${targetStudents.length} students` });
      setOpen(false);
      setTitle('');
      setDescription('');
      setDueDate('');
      setTargetClassId('all');
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not create form', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (form: OfficeForm) => {
    if (!write.ctx || !confirm(`Delete "${form.title}"? This removes everyone's tracked responses.`)) return;
    try {
      await write.deleteOfficeForm(write.ctx, form);
      toast({ title: 'Form deleted' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not delete form', description: (e as Error).message });
    }
  };

  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  if (isLoading) return <OfficeLoadingRows cols={2} rows={3} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" className="rounded-xl gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          New form
        </Button>
      </div>

      {forms.length === 0 ? (
        <OfficeEmptyState
          icon={ClipboardCheck}
          title="No permission slips yet"
          description="Send one to a class or the whole school, then track who's returned it."
        />
      ) : (
        <div className="space-y-2">
          {forms.map((form) => {
            const entries = Object.entries(form.responses);
            const returned = entries.filter(([, s]) => s === 'returned').length;
            const expanded = expandedFormId === form.id;
            return (
              <div key={form.id} className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40"
                  onClick={() => setExpandedFormId(expanded ? null : form.id)}
                >
                  <div>
                    <p className="font-semibold">{form.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {returned}/{entries.length} returned
                      {form.dueDate ? ` · due ${form.dueDate}` : ''}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDelete(form);
                    }}
                    aria-label="Delete form"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </button>
                {expanded ? (
                  <ul className="divide-y border-t dark:divide-slate-800">
                    {entries.map(([studentId, status]) => (
                      <li key={studentId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                        <span className="text-sm">{studentById.get(studentId) ? getOfficeStudentFullName(studentById.get(studentId)!) : studentId}</span>
                        <div className="flex gap-1.5">
                          {(Object.keys(FORM_STATUS_LABEL) as OfficeFormResponseStatus[]).map((s) => (
                            <button
                              key={s}
                              type="button"
                              className={cn(
                                'rounded-lg px-2 py-0.5 text-xs font-semibold',
                                status === s ? FORM_STATUS_STYLES[s] : 'bg-muted text-muted-foreground hover:bg-muted/70',
                              )}
                              onClick={() => {
                                if (!write.ctx) return;
                                void write.setOfficeFormResponse(write.ctx, form.id, studentId, s);
                              }}
                            >
                              {FORM_STATUS_LABEL[s]}
                            </button>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>New permission slip</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Field trip permission" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Send to</Label>
                <Select value={targetClassId} onValueChange={setTargetClassId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Whole school</SelectItem>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due date (optional)</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="rounded-xl" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreate()} disabled={busy}>
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EventsPanel({ schoolId }: { schoolId: string }) {
  const { toast } = useToast();
  const write = useOfficeWrite(schoolId);
  const { events, isLoading } = useOfficeEvents(schoolId);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);

  const openNew = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setDate('');
    setOpen(true);
  };

  const handleSave = async () => {
    if (!write.ctx || !title.trim() || !date) {
      toast({ variant: 'destructive', title: 'Title and date are required.' });
      return;
    }
    setBusy(true);
    try {
      await write.upsertOfficeEvent(write.ctx, editingId, {
        title: title.trim(),
        description: description.trim() || null,
        date,
      });
      toast({ title: editingId ? 'Event updated' : 'Event added' });
      setOpen(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not save event', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return <OfficeLoadingRows cols={2} rows={3} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" className="rounded-xl gap-2" onClick={openNew}>
          <Plus className="h-4 w-4" />
          New event
        </Button>
      </div>

      {events.length === 0 ? (
        <OfficeEmptyState icon={CalendarDays} title="No events yet" description="Add school-wide dates families should know about." />
      ) : (
        <ul className="space-y-2">
          {events.map((event) => (
            <li key={event.id} className="flex items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div>
                <p className="font-semibold">{event.title}</p>
                <p className="text-xs text-muted-foreground">
                  {event.date}
                  {event.description ? ` · ${event.description}` : ''}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-lg text-xs"
                  onClick={() => {
                    setEditingId(event.id);
                    setTitle(event.title);
                    setDescription(event.description ?? '');
                    setDate(event.date);
                    setOpen(true);
                  }}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  aria-label="Delete event"
                  onClick={() => {
                    if (!write.ctx || !confirm(`Delete "${event.title}"?`)) return;
                    void write.deleteOfficeEvent(write.ctx, event);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit event' : 'New event'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={busy}>
              {editingId ? 'Save changes' : 'Add event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
