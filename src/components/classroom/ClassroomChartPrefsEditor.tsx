'use client';

import { useCallback, useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import {
  loadClassroomPrefs,
  saveClassroomPrefs,
  type ClassroomSeatingPrefs,
} from '@/lib/classroomSeatingChart';

type ClassroomChartPrefsEditorProps = {
  schoolId: string;
  scope: string;
  disabled?: boolean;
  rewardsPillarOn?: boolean;
};

function normalizePrefsPatch(
  prefs: ClassroomSeatingPrefs,
  patch: Partial<ClassroomSeatingPrefs>,
): ClassroomSeatingPrefs {
  return {
    ...prefs,
    ...patch,
    autoAwardMs:
      patch.autoAwardMs !== undefined
        ? Math.max(1000, Math.min(10000, patch.autoAwardMs))
        : prefs.autoAwardMs,
    defaultPoints:
      patch.defaultPoints !== undefined ? Math.max(1, patch.defaultPoints) : prefs.defaultPoints,
    correctionPoints:
      patch.correctionPoints !== undefined
        ? Math.max(0, patch.correctionPoints)
        : prefs.correctionPoints,
  };
}

export function ClassroomChartPrefsEditor({
  schoolId,
  scope,
  disabled = false,
  rewardsPillarOn = false,
}: ClassroomChartPrefsEditorProps) {
  const [prefs, setPrefs] = useState<ClassroomSeatingPrefs>(() =>
    loadClassroomPrefs(schoolId, scope),
  );

  useEffect(() => {
    setPrefs(loadClassroomPrefs(schoolId, scope));
  }, [schoolId, scope]);

  const patchPrefs = useCallback(
    (patch: Partial<ClassroomSeatingPrefs>) => {
      const next = normalizePrefsPatch(prefs, patch);
      setPrefs(next);
      saveClassroomPrefs(schoolId, scope, next);
    },
    [prefs, schoolId, scope],
  );

  return (
    <div className="space-y-4">
      {rewardsPillarOn ? (
        <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
          <p className="mb-1 text-sm font-bold">Award source</p>
          <p className="mb-3 text-[11px] text-muted-foreground">
            Choose whether the live monitor uses classroom quick awards or Points tab categories. You can also
            change this on the monitor under Toolbar options.
          </p>
          <RadioGroup
            value={prefs.awardSource}
            onValueChange={(v) => {
              if (v === 'local' || v === 'categories') patchPrefs({ awardSource: v });
            }}
            className="gap-2"
            disabled={disabled}
          >
            <label className="flex cursor-pointer items-start gap-2">
              <RadioGroupItem value="local" className="mt-0.5" disabled={disabled} aria-label="Local rewards" />
              <span className="text-xs leading-snug">
                <span className="font-semibold">Local rewards</span> — quick award buttons; points stay on
                classroom balance.
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2">
              <RadioGroupItem
                value="categories"
                className="mt-0.5"
                disabled={disabled}
                aria-label="Reward categories"
              />
              <span className="text-xs leading-snug">
                <span className="font-semibold">Reward categories</span> — award from Points tab categories;
                syncs to rewards balance.
              </span>
            </label>
          </RadioGroup>
        </div>
      ) : null}

      <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
        <p className="mb-3 text-sm font-bold">Default points & sounds</p>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Default points</Label>
            <p className="text-[11px] text-muted-foreground">
              Used for quick select, class awards, burst awards, and the awards menu timer.
            </p>
            <Input
              type="number"
              min={1}
              className="h-9 max-w-[8rem] rounded-lg"
              value={prefs.defaultPoints}
              disabled={disabled}
              onChange={(e) =>
                patchPrefs({ defaultPoints: Math.max(1, Number(e.target.value) || 5) })
              }
            />
          </div>
          <label className="flex cursor-pointer items-start gap-2">
            <Switch
              className="mt-0.5"
              checked={prefs.awardSounds !== false}
              disabled={disabled}
              onCheckedChange={(v) => patchPrefs({ awardSounds: v })}
            />
            <span className="text-xs leading-snug">
              <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                <Volume2 className="h-3.5 w-3.5" aria-hidden />
                Award sounds
              </span>{' '}
              — soft chimes for taps and points on the chart.
            </span>
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
        <p className="mb-1 text-sm font-bold">Correction button</p>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Optional deduct shortcut in the awards menu (e.g. reminder −2 pts).
        </p>
        <div className="grid max-w-md grid-cols-[1fr_4rem] gap-2">
          <Input
            className="h-9 rounded-lg text-sm"
            defaultValue={prefs.correctionLabel}
            key={`correction-label-${prefs.correctionLabel}`}
            disabled={disabled}
            onBlur={(e) =>
              patchPrefs({ correctionLabel: e.target.value.trim() || prefs.correctionLabel })
            }
          />
          <Input
            type="number"
            min={0}
            className="h-9 rounded-lg text-sm"
            value={prefs.correctionPoints}
            disabled={disabled}
            onChange={(e) =>
              patchPrefs({ correctionPoints: Math.max(0, Number(e.target.value) || 0) })
            }
          />
        </div>
      </div>
    </div>
  );
}
