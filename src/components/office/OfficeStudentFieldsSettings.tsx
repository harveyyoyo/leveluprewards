'use client';

import { useState } from 'react';
import { ListPlus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { useAppContext } from '@/components/AppProvider';
import { saveOfficeSettings } from '@/lib/office/officeSettingsDoc';
import {
  OFFICE_CUSTOM_FIELD_TYPES,
  OFFICE_STUDENT_DETAIL_FIELDS,
  newOfficeCustomFieldId,
} from '@/lib/office/officeStudentFields';
import type { OfficeCustomFieldDef, OfficeCustomFieldType } from '@/lib/office/types';

type Draft = { id: string | null; label: string; type: OfficeCustomFieldType; optionsText: string };

const typeLabel = (t: OfficeCustomFieldType) => OFFICE_CUSTOM_FIELD_TYPES.find((x) => x.type === t)?.label ?? t;

/**
 * Settings → Student fields: school-defined fields shown on every student.
 * Fields are hidden, never deleted, so values already entered are kept.
 */
export function OfficeStudentFieldsSettings({
  schoolId,
  fields,
}: {
  schoolId: string;
  fields: OfficeCustomFieldDef[];
}) {
  const firestore = useFirestore();
  const { userName } = useAppContext();
  const { toast } = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  const active = fields.filter((f) => !f.archived);
  const hidden = fields.filter((f) => f.archived);

  const save = async (next: OfficeCustomFieldDef[], message: string) => {
    if (!firestore) return false;
    setBusy(true);
    try {
      await saveOfficeSettings(firestore, schoolId, { studentCustomFields: next }, userName);
      toast({ title: message });
      return true;
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not save', description: (e as Error).message });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!draft) return;
    const label = draft.label.trim();
    if (!label) {
      toast({ variant: 'destructive', title: 'Give the field a name.' });
      return;
    }
    const taken =
      fields.some((f) => f.id !== draft.id && f.label.trim().toLowerCase() === label.toLowerCase()) ||
      OFFICE_STUDENT_DETAIL_FIELDS.some((f) => f.label.toLowerCase() === label.toLowerCase());
    if (taken) {
      toast({ variant: 'destructive', title: 'There is already a field with that name.' });
      return;
    }
    const options =
      draft.type === 'choice'
        ? Array.from(new Set(draft.optionsText.split(',').map((o) => o.trim()).filter(Boolean)))
        : undefined;
    if (draft.type === 'choice' && (!options || options.length < 2)) {
      toast({ variant: 'destructive', title: 'List at least two choices, separated by commas.' });
      return;
    }
    const def: OfficeCustomFieldDef = {
      id: draft.id ?? newOfficeCustomFieldId(),
      label,
      type: draft.type,
      ...(options ? { options } : {}),
    };
    const next = draft.id ? fields.map((f) => (f.id === draft.id ? { ...f, ...def } : f)) : [...fields, def];
    if (await save(next, draft.id ? 'Field updated' : `“${label}” added to every student`)) setDraft(null);
  };

  const setArchived = (field: OfficeCustomFieldDef, archived: boolean) =>
    save(
      fields.map((f) => (f.id === field.id ? { ...f, archived } : f)),
      archived ? `“${field.label}” hidden — saved answers are kept` : `“${field.label}” is back`,
    );

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="flex items-center gap-2 text-base font-bold">
        <ListPlus className="h-4 w-4 text-teal-700" aria-hidden />
        Student fields
      </h2>
      <p className="mt-1 max-w-xl text-xs text-muted-foreground">
        Every student already has ID number, gender, enrollment date, previous school, home language, allergies, health
        notes, and pickup notes. Add anything else your school keeps track of — it appears under “More details” on each
        student.
      </p>

      {active.length > 0 ? (
        <ul className="mt-4 divide-y rounded-xl border dark:divide-slate-800 dark:border-slate-800">
          {active.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">{f.label}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {typeLabel(f.type)}
                  {f.type === 'choice' && f.options?.length ? ` · ${f.options.join(', ')}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  aria-label={`Edit ${f.label}`}
                  onClick={() =>
                    setDraft({ id: f.id, label: f.label, type: f.type, optionsText: (f.options ?? []).join(', ') })
                  }
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-lg text-xs text-muted-foreground"
                  disabled={busy}
                  onClick={() => void setArchived(f, true)}
                >
                  Hide
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : !draft ? (
        <p className="mt-4 text-sm text-muted-foreground">No extra fields yet.</p>
      ) : null}

      {draft ? (
        <div className="mt-4 space-y-3 rounded-xl border bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="office-field-label">Field name</Label>
              <Input
                id="office-field-label"
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                placeholder="e.g. Bus pass number"
                className="rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kind of answer</Label>
              <Select
                value={draft.type}
                onValueChange={(v) => setDraft({ ...draft, type: v as OfficeCustomFieldType })}
                disabled={!!draft.id}
              >
                <SelectTrigger className="rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OFFICE_CUSTOM_FIELD_TYPES.map((t) => (
                    <SelectItem key={t.type} value={t.type}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {draft.id ? (
                <p className="text-xs text-muted-foreground">The kind of answer can’t change once students have answers.</p>
              ) : null}
            </div>
          </div>
          {draft.type === 'choice' ? (
            <div className="space-y-1.5">
              <Label htmlFor="office-field-options">Choices (separated by commas)</Label>
              <Input
                id="office-field-options"
                value={draft.optionsText}
                onChange={(e) => setDraft({ ...draft, optionsText: e.target.value })}
                placeholder="e.g. Small, Medium, Large"
                className="rounded-lg"
              />
            </div>
          ) : null}
          <div className="flex gap-2">
            <Button type="button" size="sm" className="rounded-lg" disabled={busy} onClick={() => void submit()}>
              {busy ? 'Saving…' : draft.id ? 'Save field' : 'Add field'}
            </Button>
            <Button type="button" size="sm" variant="outline" className="rounded-lg" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 h-8 rounded-lg text-xs"
          onClick={() => setDraft({ id: null, label: '', type: 'text', optionsText: '' })}
        >
          + Add a field
        </Button>
      )}

      {hidden.length > 0 ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowHidden((v) => !v)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {showHidden ? 'Hide' : 'Show'} hidden fields ({hidden.length})
          </button>
          {showHidden ? (
            <ul className="mt-2 space-y-1">
              {hidden.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-1.5 text-sm text-muted-foreground">
                  {f.label}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-lg text-xs"
                    disabled={busy}
                    onClick={() => void setArchived(f, false)}
                  >
                    Show again
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
