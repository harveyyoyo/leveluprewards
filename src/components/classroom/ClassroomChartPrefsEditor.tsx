'use client';

import { useCallback, useEffect, useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  loadClassroomPrefs,
  saveClassroomPrefs,
  type ClassroomSeatingPrefs,
} from '@/lib/classroomSeatingChart';
import { cn } from '@/lib/utils';

type ClassroomChartPrefsEditorProps = {
  schoolId: string;
  scope: string;
  disabled?: boolean;
  rewardsPillarOn?: boolean;
  /** Flat layout inside a parent settings panel (no nested card chrome). */
  embedded?: boolean;
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
  };
}

function SectionShell({
  embedded,
  title,
  children,
}: {
  embedded?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  if (embedded) {
    return (
      <div className="space-y-3">
        {title ? <p className="text-sm font-bold">{title}</p> : null}
        {children}
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
      {title ? <p className="mb-3 text-sm font-bold">{title}</p> : null}
      {children}
    </div>
  );
}

export function ClassroomChartPrefsEditor({
  schoolId,
  scope,
  disabled = false,
  rewardsPillarOn = false,
  embedded = false,
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
    <div className={cn('space-y-6', embedded && 'space-y-5')}>
      {rewardsPillarOn ? (
        <SectionShell embedded={embedded} title="Award source">
          <RadioGroup
            value={prefs.awardSource}
            onValueChange={(v) => {
              if (v === 'local' || v === 'categories') patchPrefs({ awardSource: v });
            }}
            className="grid gap-2 sm:grid-cols-2"
            disabled={disabled}
          >
            <label className="flex cursor-pointer items-start gap-2 rounded-xl border bg-background/80 p-3">
              <RadioGroupItem value="local" className="mt-0.5" disabled={disabled} aria-label="Local rewards" />
              <span className="text-xs leading-snug">
                <span className="font-semibold">Local rewards</span>
                <span className="mt-0.5 block text-muted-foreground">Classroom balance only.</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 rounded-xl border bg-background/80 p-3">
              <RadioGroupItem
                value="categories"
                className="mt-0.5"
                disabled={disabled}
                aria-label="Reward categories"
              />
              <span className="text-xs leading-snug">
                <span className="font-semibold">Reward categories</span>
                <span className="mt-0.5 block text-muted-foreground">Uses Points tab categories.</span>
              </span>
            </label>
          </RadioGroup>
        </SectionShell>
      ) : null}
    </div>
  );
}
