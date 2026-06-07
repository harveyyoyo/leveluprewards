'use client';

import { useState } from 'react';
import { ChevronRight, Plus, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { cn } from '@/lib/utils';

export type ClassroomSchoolLabelsEditorProps = {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  disabled?: boolean;
  compact?: boolean;
  /** Compact summary + dialog instead of inline editor. */
  popup?: boolean;
};

function QuickAwardsEditorBody({
  settings,
  updateSettings,
  disabled,
  compact,
}: ClassroomSchoolLabelsEditorProps) {
  const quickAwards = normalizeClassroomQuickAwards(settings.classroomQuickAwards);
  const quickTapDescription = resolveClassroomQuickTapDescription(settings);

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

  return (
    <>
      <div className={cn('mb-2 flex items-center gap-2', compact && 'mb-1.5')}>
        <Label className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Quick tap
        </Label>
        <Input
          className={cn('min-w-0 flex-1 rounded-md', compact ? 'h-7 text-xs' : 'h-8 text-sm')}
          value={quickTapDescription}
          disabled={disabled}
          onChange={(e) =>
            updateSettings({ classroomQuickTapDescription: e.target.value.trim() || undefined })
          }
          placeholder="Quick award"
        />
      </div>

      <div className={cn('space-y-1.5', compact && 'sm:grid sm:grid-cols-2 sm:gap-x-2 sm:space-y-0')}>
        {quickAwards.map((q, i) => (
          <div key={q.id} className="flex items-center gap-1">
            <Input
              className="h-7 min-w-0 flex-1 rounded-md text-xs"
              value={q.label}
              disabled={disabled}
              onChange={(e) => patchQuickAward(i, { label: e.target.value })}
              placeholder="Label"
            />
            <Input
              type="number"
              min={1}
              className="h-7 w-12 shrink-0 rounded-md px-1 text-center text-xs"
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
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              disabled={disabled || quickAwards.length <= 1}
              aria-label={`Remove ${q.label}`}
              onClick={() => removeQuickAward(i)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-1.5 h-7 rounded-md px-2 text-[10px] font-bold"
        disabled={disabled || quickAwards.length >= MAX_CLASSROOM_QUICK_AWARDS}
        onClick={addQuickAward}
      >
        <Plus className="mr-1 h-3 w-3" />
        Add
      </Button>
    </>
  );
}

function BehaviorCategoryEditorBody({
  shortcutKey,
  settings,
  updateSettings,
  disabled,
}: ClassroomSchoolLabelsEditorProps & { shortcutKey: ClassroomNoteShortcutKey }) {
  const behaviorOptions = normalizeBehaviorQuickOptions(settings.classroomBehaviorQuickOptions);
  const shortcut = CLASSROOM_NOTE_SHORTCUTS.find((s) => s.key === shortcutKey)!;
  const options = behaviorOptions[shortcutKey] ?? defaultBehaviorQuickOptions()[shortcutKey] ?? [];

  const setBehaviorOptionsForKey = (key: ClassroomNoteShortcutKey, next: string[]) => {
    const merged: ClassroomBehaviorQuickOptions = { ...behaviorOptions, [key]: next };
    updateSettings({ classroomBehaviorQuickOptions: merged });
  };

  const patchBehaviorOption = (index: number, value: string) => {
    const next = options.map((opt, i) => (i === index ? value : opt));
    setBehaviorOptionsForKey(shortcutKey, next);
  };

  const addBehaviorOption = () => {
    if (options.length >= MAX_BEHAVIOR_QUICK_OPTIONS) return;
    setBehaviorOptionsForKey(shortcutKey, [...options, '']);
  };

  const removeBehaviorOption = (index: number) => {
    if (options.length <= 1) return;
    setBehaviorOptionsForKey(
      shortcutKey,
      options.filter((_, i) => i !== index),
    );
  };

  return (
    <div className="space-y-1">
      {options.map((opt, i) => (
        <div key={`${shortcutKey}-${i}`} className="flex items-center gap-1">
          <Input
            className="h-8 flex-1 rounded-md text-sm"
            value={opt}
            disabled={disabled}
            onChange={(e) => patchBehaviorOption(i, e.target.value)}
            placeholder="Phrase"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            disabled={disabled || options.length <= 1}
            aria-label="Remove phrase"
            onClick={() => removeBehaviorOption(i)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 rounded-md px-2 text-xs font-semibold"
        disabled={disabled || options.length >= MAX_BEHAVIOR_QUICK_OPTIONS}
        onClick={addBehaviorOption}
      >
        <Plus className="mr-1 h-3 w-3" />
        Add phrase
      </Button>
      <p className="pt-1 text-[11px] text-muted-foreground">{shortcut.description}</p>
    </div>
  );
}

export function ClassroomSchoolQuickAwardsEditor(props: ClassroomSchoolLabelsEditorProps) {
  const { disabled = false, compact = false, popup = false } = props;
  const quickAwards = normalizeClassroomQuickAwards(props.settings.classroomQuickAwards);
  const [open, setOpen] = useState(false);

  if (popup) {
    return (
      <>
        <Button
          type="button"
          variant="outline"
          className="h-auto min-h-9 w-full justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold"
          disabled={disabled}
          onClick={() => setOpen(true)}
        >
          <span className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-violet-500" aria-hidden />
            Quick awards
            <span className="font-normal text-muted-foreground">({quickAwards.length} buttons)</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[min(90vh,560px)] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Quick awards</DialogTitle>
              <DialogDescription>Buttons on the monitor awards menu and quick-tap label.</DialogDescription>
            </DialogHeader>
            <QuickAwardsEditorBody {...props} compact />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className={cn('rounded-xl border border-border/50 bg-muted/15', compact ? 'p-2.5' : 'border-border/60 bg-muted/20 p-3')}>
      <div className={cn('mb-2 flex items-center gap-1.5', compact && 'mb-1.5')}>
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-500" aria-hidden />
        <p className={cn('font-bold', compact ? 'text-[11px]' : 'text-sm')}>Quick awards</p>
      </div>
      <QuickAwardsEditorBody {...props} compact={compact} />
    </div>
  );
}

export function ClassroomBehaviorQuickPicksEditor(props: ClassroomSchoolLabelsEditorProps) {
  const { disabled = false, popup = false } = props;
  const behaviorOptions = normalizeBehaviorQuickOptions(props.settings.classroomBehaviorQuickOptions);
  const [activeKey, setActiveKey] = useState<ClassroomNoteShortcutKey | null>(null);

  if (popup) {
    return (
      <>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CLASSROOM_NOTE_SHORTCUTS.map((shortcut) => {
            const count = (behaviorOptions[shortcut.key] ?? defaultBehaviorQuickOptions()[shortcut.key] ?? [])
              .length;
            return (
              <Button
                key={shortcut.key}
                type="button"
                variant="outline"
                className="h-auto min-h-9 justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold"
                disabled={disabled}
                onClick={() => setActiveKey(shortcut.key)}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="rounded border bg-muted px-1 font-mono text-[9px] uppercase">
                    {shortcut.key}
                  </span>
                  <span className="truncate">{shortcut.hintLabel}</span>
                  <span className="font-normal text-muted-foreground">({count})</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
              </Button>
            );
          })}
        </div>
        <Dialog open={activeKey != null} onOpenChange={(open) => !open && setActiveKey(null)}>
          <DialogContent className="max-h-[min(90vh,480px)] overflow-y-auto sm:max-w-md">
            {activeKey ? (
              <>
                <DialogHeader>
                  <DialogTitle>
                    {CLASSROOM_NOTE_SHORTCUTS.find((s) => s.key === activeKey)?.popupTitle}
                  </DialogTitle>
                  <DialogDescription>
                    One-tap phrases when holding{' '}
                    <kbd className="rounded border bg-muted px-1 font-mono text-xs uppercase">{activeKey}</kbd>{' '}
                    and clicking a student.
                  </DialogDescription>
                </DialogHeader>
                <BehaviorCategoryEditorBody {...props} shortcutKey={activeKey} />
              </>
            ) : null}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className={cn('rounded-xl border border-border/50 bg-muted/15', props.compact ? 'p-2.5' : 'border-border/60 bg-muted/20 p-3')}>
      <p className={cn('mb-2 font-bold', props.compact ? 'text-[11px]' : 'text-sm')}>Note quick picks</p>
      <div className={cn(props.compact ? 'grid gap-2 sm:grid-cols-2' : 'space-y-3')}>
        {CLASSROOM_NOTE_SHORTCUTS.map((shortcut) => (
          <div
            key={shortcut.key}
            className={cn(
              props.compact
                ? 'rounded-md border border-border/40 bg-background/70 p-2'
                : 'rounded-lg border bg-background/80 p-2.5',
            )}
          >
            <p className="mb-1.5 flex items-center gap-1 text-[11px] font-bold leading-none">
              <span className="rounded border bg-muted px-1 font-mono text-[9px] uppercase">{shortcut.key}</span>
              <span className="truncate">{shortcut.hintLabel}</span>
            </p>
            <BehaviorCategoryEditorBody {...props} shortcutKey={shortcut.key} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** @deprecated Use editors on the seating chart Classroom settings (gear) popover. */
export function ClassroomLabelsSetupSection(props: ClassroomSchoolLabelsEditorProps) {
  return (
    <div className={props.compact ? 'space-y-3' : 'space-y-5'}>
      <ClassroomSchoolQuickAwardsEditor {...props} />
      <ClassroomBehaviorQuickPicksEditor {...props} />
    </div>
  );
}
