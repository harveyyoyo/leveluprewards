'use client';

import { MinusCircle } from 'lucide-react';
import type { Settings } from '@/components/providers/SettingsProvider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export function ClassroomDeductSettingsEditor({
  settings,
  updateSettings,
  disabled = false,
}: {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  disabled?: boolean;
}) {
  const enabled = settings.classroomDeductEnabled === true;
  const points = Math.max(1, Math.round(Number(settings.classroomDeductPoints) || 5));
  const label = settings.classroomDeductLabel?.trim() || 'Deduct';
  const description = settings.classroomDeductDescription?.trim() || 'Point deduction';

  return (
    <div className="rounded-2xl border bg-card/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2">
            <MinusCircle className="h-4 w-4 shrink-0 text-rose-500" aria-hidden />
            <Label htmlFor="classroom-deduct-enabled" className="text-sm font-bold">
              Quick deduct
            </Label>
          </div>
          <p className="text-[11px] text-muted-foreground">
            When on, teachers can <span className="font-semibold">Ctrl+click</span> a desk on the monitor to
            remove points.
          </p>
        </div>
        <Switch
          id="classroom-deduct-enabled"
          checked={enabled}
          disabled={disabled}
          onCheckedChange={(v) => updateSettings({ classroomDeductEnabled: v })}
        />
      </div>

      <div className="mt-3 grid gap-3 border-t border-border/40 pt-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="classroom-deduct-points" className="text-[11px] font-semibold text-muted-foreground">
            Points to deduct
          </Label>
          <Input
            id="classroom-deduct-points"
            type="number"
            min={1}
            className="h-8 rounded-lg font-bold"
            value={points}
            disabled={disabled || !enabled}
            onChange={(e) =>
              updateSettings({ classroomDeductPoints: Math.max(1, Number(e.target.value) || 1) })
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="classroom-deduct-label" className="text-[11px] font-semibold text-muted-foreground">
            Button label
          </Label>
          <Input
            id="classroom-deduct-label"
            className="h-8 rounded-lg text-sm"
            value={label}
            disabled={disabled || !enabled}
            onChange={(e) => updateSettings({ classroomDeductLabel: e.target.value })}
            placeholder="Deduct"
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="classroom-deduct-description" className="text-[11px] font-semibold text-muted-foreground">
            Activity log description
          </Label>
          <Input
            id="classroom-deduct-description"
            className="h-8 rounded-lg text-sm"
            value={description}
            disabled={disabled || !enabled}
            onChange={(e) => updateSettings({ classroomDeductDescription: e.target.value })}
            placeholder="Point deduction"
          />
        </div>
      </div>
    </div>
  );
}
