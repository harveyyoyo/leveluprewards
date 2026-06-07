'use client';

import { MinusCircle } from 'lucide-react';
import { CLASSROOM_NOTE_SHORTCUTS } from '@/lib/classroom/classroomNoteShortcuts';
import {
  defaultClassroomNoteDeductTypes,
  normalizeClassroomNoteDeductTypes,
  type ClassroomNoteDeductConfig,
} from '@/lib/classroom/classroomNoteDeductSettings';
import type { Settings } from '@/components/providers/SettingsProvider';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export function ClassroomPointDeductionSettingsEditor({
  settings,
  updateSettings,
  disabled = false,
}: {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  disabled?: boolean;
}) {
  const enabled =
    settings.classroomNoteDeductEnabled === true ||
    (settings.classroomNoteDeductEnabled === undefined && settings.classroomDeductEnabled === true);
  const points = Math.max(
    1,
    Math.round(
      Number(settings.classroomNoteDeductPoints ?? settings.classroomDeductPoints) || 5,
    ),
  );
  const selectedTypes = settings.classroomNoteDeductTypes
    ? normalizeClassroomNoteDeductTypes(settings.classroomNoteDeductTypes)
    : enabled
      ? normalizeClassroomNoteDeductTypes(undefined)
      : [];

  const patchTypes = (next: ClassroomNoteDeductConfig['types']) => {
    updateSettings({ classroomNoteDeductTypes: next });
  };

  return (
    <div className="rounded-2xl border bg-card/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2">
            <MinusCircle className="h-4 w-4 shrink-0 text-rose-500" aria-hidden />
            <Label htmlFor="classroom-note-deduct-enabled" className="text-sm font-bold">
              Point deductions on comments
            </Label>
          </div>
          <p className="text-[11px] text-muted-foreground">
            When enabled, saving certain behavior notes can also remove points from the student. Teachers
            choose whether to deduct in the note dialog.
          </p>
        </div>
        <Switch
          id="classroom-note-deduct-enabled"
          checked={enabled}
          disabled={disabled}
          onCheckedChange={(v) =>
            updateSettings({
              classroomNoteDeductEnabled: v,
              ...(v && settings.classroomNoteDeductTypes === undefined
                ? { classroomNoteDeductTypes: defaultClassroomNoteDeductTypes() }
                : {}),
            })
          }
        />
      </div>

      <div className="mt-3 space-y-3 border-t border-border/40 pt-3">
        <div className="space-y-1">
          <Label
            htmlFor="classroom-note-deduct-points"
            className="text-[11px] font-semibold text-muted-foreground"
          >
            Points to deduct
          </Label>
          <Input
            id="classroom-note-deduct-points"
            type="number"
            min={1}
            className="h-8 max-w-[8rem] rounded-lg font-bold"
            value={points}
            disabled={disabled || !enabled}
            onChange={(e) =>
              updateSettings({
                classroomNoteDeductPoints: Math.max(1, Number(e.target.value) || 1),
              })
            }
          />
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground">Comment types</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {CLASSROOM_NOTE_SHORTCUTS.map((shortcut) => {
              const checked = selectedTypes.includes(shortcut.key);
              return (
                <label
                  key={shortcut.key}
                  className="flex cursor-pointer items-start gap-2 rounded-xl border bg-background/80 p-2.5"
                >
                  <Checkbox
                    className="mt-0.5"
                    checked={checked}
                    disabled={disabled || !enabled}
                    onCheckedChange={(v) => {
                      const next = v
                        ? [...selectedTypes, shortcut.key]
                        : selectedTypes.filter((key) => key !== shortcut.key);
                      patchTypes(next);
                    }}
                  />
                  <span className="text-xs leading-snug">
                    <span className="font-semibold">{shortcut.hintLabel}</span>
                    <span className="mt-0.5 block text-muted-foreground">
                      Hold <span className="font-mono uppercase">{shortcut.key}</span> + click on monitor
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
