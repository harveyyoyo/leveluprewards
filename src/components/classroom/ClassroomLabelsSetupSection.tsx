'use client';

import { Plus, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createClassroomQuickAward,
  defaultBehaviorQuickOptions,
  MAX_BEHAVIOR_QUICK_OPTIONS,
  MAX_CLASSROOM_QUICK_AWARDS,
  normalizeBehaviorQuickOptions,
  normalizeClassroomQuickAwards,
  resolveClassroomQuickTapDescription,
  type ClassroomBehaviorQuickOptions,
} from '@/lib/classroom/classroomQuickAwardsSettings';
import {
  CLASSROOM_NOTE_SHORTCUTS,
  type ClassroomNoteShortcutKey,
} from '@/lib/classroom/classroomNoteShortcuts';
import type { ClassroomQuickAward } from '@/lib/classroomSeatingChart';
import type { Settings } from '@/components/providers/SettingsProvider';

type ClassroomLabelsSetupSectionProps = {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  disabled?: boolean;
  compact?: boolean;
};

export function ClassroomLabelsSetupSection({
  settings,
  updateSettings,
  disabled = false,
  compact = false,
}: ClassroomLabelsSetupSectionProps) {
  const quickAwards = normalizeClassroomQuickAwards(settings.classroomQuickAwards);
  const quickTapDescription = resolveClassroomQuickTapDescription(settings);
  const behaviorOptions = normalizeBehaviorQuickOptions(settings.classroomBehaviorQuickOptions);

  const setQuickAwards = (next: ClassroomQuickAward[]) => {
    updateSettings({ classroomQuickAwards: next });
  };

  const patchQuickAward = (index: number, patch: Partial<ClassroomQuickAward>) => {
    setQuickAwards(
      quickAwards.map((q, i) => {
        if (i !== index) return q;
        const label = patch.label !== undefined ? patch.label.trim() || q.label : q.label;
        const points =
          patch.points !== undefined ? Math.max(1, Math.round(Number(patch.points) || 1)) : q.points;
        const description =
          patch.description !== undefined
            ? patch.description.trim() || label
            : patch.label !== undefined
              ? label
              : q.description;
        return { ...q, ...patch, label, points, description };
      }),
    );
  };

  const removeQuickAward = (index: number) => {
    if (quickAwards.length <= 1) return;
    setQuickAwards(quickAwards.filter((_, i) => i !== index));
  };

  const addQuickAward = () => {
    if (quickAwards.length >= MAX_CLASSROOM_QUICK_AWARDS) return;
    setQuickAwards([...quickAwards, createClassroomQuickAward('New award', 5)]);
  };

  const setBehaviorOptionsForKey = (key: ClassroomNoteShortcutKey, options: string[]) => {
    const next: ClassroomBehaviorQuickOptions = { ...behaviorOptions, [key]: options };
    updateSettings({ classroomBehaviorQuickOptions: next });
  };

  const patchBehaviorOption = (key: ClassroomNoteShortcutKey, index: number, value: string) => {
    const current = behaviorOptions[key] ?? defaultBehaviorQuickOptions()[key] ?? [];
    const next = current.map((opt, i) => (i === index ? value : opt));
    setBehaviorOptionsForKey(key, next);
  };

  const addBehaviorOption = (key: ClassroomNoteShortcutKey) => {
    const current = behaviorOptions[key] ?? defaultBehaviorQuickOptions()[key] ?? [];
    if (current.length >= MAX_BEHAVIOR_QUICK_OPTIONS) return;
    setBehaviorOptionsForKey(key, [...current, '']);
  };

  const removeBehaviorOption = (key: ClassroomNoteShortcutKey, index: number) => {
    const current = behaviorOptions[key] ?? defaultBehaviorQuickOptions()[key] ?? [];
    if (current.length <= 1) return;
    setBehaviorOptionsForKey(
      key,
      current.filter((_, i) => i !== index),
    );
  };

  const resetBehaviorOptions = (key: ClassroomNoteShortcutKey) => {
    const defaults = defaultBehaviorQuickOptions()[key] ?? [];
    setBehaviorOptionsForKey(key, defaults);
  };

  return (
    <div className={compact ? 'space-y-4' : 'space-y-5'}>
      <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
        <div className="mb-3 flex items-start gap-2">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" aria-hidden />
          <div>
            <p className="text-sm font-bold">Quick award labels</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Shared across your school — used in the Awards menu, quick tap description, and session
              badges. Admins and teachers can edit these here.
            </p>
          </div>
        </div>

        <div className="mb-3 space-y-1.5">
          <Label className="text-xs font-semibold">Quick tap label</Label>
          <p className="text-[11px] text-muted-foreground">
            Description saved when teachers use Quick +N on a desk (toolbar tab).
          </p>
          <Input
            className="h-9 rounded-lg text-sm"
            value={quickTapDescription}
            disabled={disabled}
            onChange={(e) =>
              updateSettings({ classroomQuickTapDescription: e.target.value.trim() || undefined })
            }
            placeholder="Quick award"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold">Awards menu buttons</Label>
          {quickAwards.map((q, i) => (
            <div key={q.id} className="flex items-center gap-1.5">
              <Input
                className="h-8 min-w-0 flex-1 rounded-lg text-xs"
                value={q.label}
                disabled={disabled}
                onChange={(e) => patchQuickAward(i, { label: e.target.value })}
                placeholder="Label"
              />
              <Input
                type="number"
                min={1}
                className="h-8 w-16 shrink-0 rounded-lg text-xs"
                value={q.points}
                disabled={disabled}
                onChange={(e) =>
                  patchQuickAward(i, { points: Math.max(1, Number(e.target.value) || 1) })
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                disabled={disabled || quickAwards.length <= 1}
                aria-label={`Remove ${q.label}`}
                onClick={() => removeQuickAward(i)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-lg text-xs font-bold"
            disabled={disabled || quickAwards.length >= MAX_CLASSROOM_QUICK_AWARDS}
            onClick={addQuickAward}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add award button
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
        <p className="mb-1 text-sm font-bold">Behavior & comment quick picks</p>
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
          One-tap phrases inside each note dialog (Positive, Comment, Incident, Warning, Highlight).
        </p>
        <div className="space-y-3">
          {CLASSROOM_NOTE_SHORTCUTS.map((shortcut) => {
            const options =
              behaviorOptions[shortcut.key] ?? defaultBehaviorQuickOptions()[shortcut.key] ?? [];
            return (
              <div key={shortcut.key} className="rounded-lg border bg-background/80 p-2.5">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold">
                    <span className="mr-1.5 rounded border bg-muted px-1 font-mono text-[10px] uppercase">
                      {shortcut.key}
                    </span>
                    {shortcut.popupTitle}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-lg px-2 text-[10px] font-semibold"
                    disabled={disabled}
                    onClick={() => resetBehaviorOptions(shortcut.key)}
                  >
                    Reset defaults
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {options.map((opt, i) => (
                    <div key={`${shortcut.key}-${i}`} className="flex items-center gap-1.5">
                      <Input
                        className="h-8 flex-1 rounded-lg text-xs"
                        value={opt}
                        disabled={disabled}
                        onChange={(e) => patchBehaviorOption(shortcut.key, i, e.target.value)}
                        placeholder="Quick pick phrase"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        disabled={disabled || options.length <= 1}
                        aria-label="Remove quick pick"
                        onClick={() => removeBehaviorOption(shortcut.key, i)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-lg text-[10px] font-bold"
                    disabled={disabled || options.length >= MAX_BEHAVIOR_QUICK_OPTIONS}
                    onClick={() => addBehaviorOption(shortcut.key)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add phrase
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
