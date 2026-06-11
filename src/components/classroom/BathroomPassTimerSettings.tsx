'use client';

import { Timer } from 'lucide-react';
import { StaffPortalTabInfoPopover, staffPortalTabInfoSection } from '@/components/staff/StaffPortalTabInfoPopover';
import type { Settings } from '@/components/providers/SettingsProvider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export type BathroomPassTimerSettingsPatch = Partial<
  Pick<Settings, 'enableBathroomTimer' | 'bathroomMaxMinutes' | 'bathroomRequirePresent'>
>;

type BathroomPassTimerSettingsProps = {
  classSignInEnabled: boolean;
  enableBathroomTimer: boolean;
  bathroomMaxMinutes: number;
  bathroomRequirePresent: boolean;
  canEdit: boolean;
  onChange: (patch: BathroomPassTimerSettingsPatch) => void;
};

export function BathroomPassTimerSettings({
  classSignInEnabled,
  enableBathroomTimer,
  bathroomMaxMinutes,
  bathroomRequirePresent,
  canEdit,
  onChange,
}: BathroomPassTimerSettingsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5">
        <h3 className="flex items-center gap-2 text-lg font-black tracking-tight">
          <Timer className="h-5 w-5 text-ring" aria-hidden />
          Bathroom pass timer
        </h3>
        <StaffPortalTabInfoPopover
          sections={[
            staffPortalTabInfoSection(
              'Teachers start and stop bathroom passes from the Class Awards Live seating chart (Alt+click a desk). Students can be required to sign in for attendance first — turn that on under Admin → Attendance.',
            ),
          ]}
          ariaLabel="About bathroom pass timer"
        />
      </div>
      {!classSignInEnabled ? (
        <p className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-100">
          Turn on <span className="font-semibold">class sign-in</span> in Admin → Attendance so students can
          sign in before bathroom passes.
        </p>
      ) : null}
      <div className="flex items-center justify-between rounded-xl border bg-muted/20 px-4 py-3">
        <div>
          <p className="text-sm font-bold">Enable bathroom timer on seating chart</p>
          <p className="text-xs text-muted-foreground">Alt+click a student to send or return.</p>
        </div>
        <Switch
          checked={enableBathroomTimer}
          disabled={!canEdit || !classSignInEnabled}
          onCheckedChange={(v) => onChange({ enableBathroomTimer: v === true })}
          aria-label="Enable bathroom timer on seating chart"
        />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="bathroom-max-min">Max minutes (warning)</Label>
          <Input
            id="bathroom-max-min"
            type="number"
            min={1}
            max={30}
            disabled={!canEdit || !enableBathroomTimer}
            value={bathroomMaxMinutes}
            onChange={(e) =>
              onChange({
                bathroomMaxMinutes: Math.min(30, Math.max(1, parseInt(e.target.value, 10) || 5)),
              })
            }
          />
          <p className="text-xs text-muted-foreground">Timer turns red after this many minutes.</p>
        </div>
        <div className="flex items-center justify-between rounded-xl border bg-muted/20 px-4 py-3 md:mt-6">
          <div>
            <p className="text-sm font-bold">Require attendance sign-in</p>
            <p className="text-xs text-muted-foreground">Only present students can leave.</p>
          </div>
          <Switch
            checked={bathroomRequirePresent}
            disabled={!canEdit || !enableBathroomTimer}
            onCheckedChange={(v) => onChange({ bathroomRequirePresent: v === true })}
            aria-label="Require attendance sign-in for bathroom pass"
          />
        </div>
      </div>
    </div>
  );
}
