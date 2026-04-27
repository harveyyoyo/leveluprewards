'use client';

import { useCallback, useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Globe } from 'lucide-react';
import { ATTENDANCE_TIMEZONE_OPTIONS, getSuggestedTimeZoneId } from '@/lib/attendance/schoolDayClock';
import type { AttendanceSettings } from '@/lib/types';

const UNSET = '__unset__';
const CUSTOM = '__custom__';

const FALLBACK: AttendanceSettings = {
  pointsForSignIn: 1,
  pointsForOnTime: 5,
  onTimeWindowMinutes: 5,
  schedule: [],
};

type Props = {
  schoolId: string | null | undefined;
  getAttendanceConfig: () => Promise<AttendanceSettings | null>;
  setAttendanceConfig: (s: AttendanceSettings) => Promise<void>;
  /** When false, control is not rendered. */
  enabled?: boolean;
  className?: string;
  /** Short label for compact layouts (e.g. settings). */
  compact?: boolean;
};

/**
 * IANA time zone for school day / bell schedule. Stored on `attendance/config`.
 * Pairs with the Attendance feature toggle: sets where “now” falls for period windows in cloud sign-in.
 */
export function AttendanceTimeZoneField({
  schoolId,
  getAttendanceConfig,
  setAttendanceConfig,
  enabled = true,
  className = '',
  compact = false,
}: Props) {
  const [raw, setRaw] = useState('');
  const [customEdit, setCustomEdit] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!enabled || !schoolId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    getAttendanceConfig()
      .then((c) => {
        const v = (c?.attendanceTimeZone || '').trim();
        setRaw(v);
        if (v && !ATTENDANCE_TIMEZONE_OPTIONS.some((o) => o.id === v)) {
          setCustomEdit(v);
        } else {
          setCustomEdit('');
        }
      })
      .catch(() => {
        setRaw('');
        setCustomEdit('');
        setErr('Could not load.');
      })
      .finally(() => setLoading(false));
  }, [enabled, schoolId, getAttendanceConfig]);

  useEffect(() => {
    reload();
  }, [reload]);

  const persist = useCallback(
    async (next: string | undefined) => {
      if (!schoolId) return;
      setSaving(true);
      setErr(null);
      try {
        const c = (await getAttendanceConfig()) ?? FALLBACK;
        await setAttendanceConfig({
          ...c,
          schedule: Array.isArray(c.schedule) ? c.schedule : [],
          attendanceTimeZone: next && next.trim() ? next.trim() : undefined,
        });
        setRaw(next?.trim() ?? '');
        if (next && !ATTENDANCE_TIMEZONE_OPTIONS.some((o) => o.id === next)) {
          setCustomEdit(next.trim());
        } else {
          setCustomEdit('');
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Save failed');
      } finally {
        setSaving(false);
      }
    },
    [schoolId, getAttendanceConfig, setAttendanceConfig]
  );

  if (!enabled || !schoolId) return null;
  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`} role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading time zone…
      </div>
    );
  }

  const inList = raw && ATTENDANCE_TIMEZONE_OPTIONS.some((o) => o.id === raw);
  const selectValue = !raw
    ? UNSET
    : inList
      ? raw
      : CUSTOM;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5 min-w-[200px] flex-1">
          <Label className={`flex items-center gap-1.5 ${compact ? 'text-xs' : 'text-sm'} font-bold text-foreground`}>
            <Globe className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            School day time zone
          </Label>
          {!compact && (
            <p className="text-xs text-muted-foreground leading-relaxed max-w-prose">
              Set this so <strong>cloud</strong> attendance uses the same clock as your period times. Kiosk fallback can still use a different
              device clock until you save a zone. Not set: kiosk uses this device, cloud uses UTC.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <Select
            value={selectValue}
            onValueChange={(v) => {
              if (v === UNSET) {
                void persist(undefined);
                return;
              }
              if (v === CUSTOM) {
                if (customEdit.trim()) void persist(customEdit);
                return;
              }
              void persist(v);
            }}
            disabled={saving}
          >
            <SelectTrigger className="w-[min(100%,280px)] rounded-xl" aria-label="School day time zone">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNSET}>Not set (kiosk: device · cloud: UTC)</SelectItem>
              {ATTENDANCE_TIMEZONE_OPTIONS.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.label} ({o.id})
                </SelectItem>
              ))}
              <SelectItem value={CUSTOM}>Other (IANA)…</SelectItem>
            </SelectContent>
          </Select>
          {saving ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-label="Saving" /> : null}
        </div>
      </div>
      {selectValue === CUSTOM ? (
        <div className="flex flex-wrap items-end gap-2 max-w-md">
          <div className="space-y-1 flex-1 min-w-[200px]">
            <Label htmlFor="attendance-iana" className="text-xs text-muted-foreground">
              IANA time zone
            </Label>
            <Input
              id="attendance-iana"
              className="rounded-xl font-mono text-sm"
              placeholder="e.g. America/Chicago"
              value={customEdit || (inList ? '' : raw)}
              onChange={(e) => setCustomEdit(e.target.value)}
              onBlur={() => {
                const t = (customEdit || raw).trim();
                if (t) void persist(t);
              }}
              disabled={saving}
            />
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-xl text-xs h-8"
          disabled={saving}
          onClick={() => {
            const t = getSuggestedTimeZoneId();
            if (t) void persist(t);
          }}
        >
          Use this device
        </Button>
        {err ? <p className="text-xs text-destructive">{err}</p> : null}
      </div>
    </div>
  );
}
