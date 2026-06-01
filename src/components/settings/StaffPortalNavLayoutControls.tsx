'use client';

import { PanelLeft, Rows3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/components/providers/SettingsProvider';
import { staffPortalNavLayoutPatch } from '@/lib/staffPortal';
import { cn } from '@/lib/utils';

type StaffPortalNavLayoutControlsProps = {
  /** Which portal layout this row controls. */
  target: 'admin' | 'teacher';
  disabled?: boolean;
  className?: string;
};

export function StaffPortalNavLayoutControls({
  target,
  disabled = false,
  className,
}: StaffPortalNavLayoutControlsProps) {
  const { settings, updateSettings } = useSettings();
  const layout =
    target === 'teacher'
      ? (settings.teacherNavLayout ?? 'sidebar')
      : (settings.adminNavLayout ?? 'sidebar');
  const sidebar = layout === 'sidebar';

  return (
    <div
      className={cn(
        'flex items-center gap-0.5 rounded-xl border border-border/60 bg-muted/40 p-1',
        disabled && 'opacity-50 pointer-events-none',
        className,
      )}
      role="group"
      aria-label={target === 'teacher' ? 'Teacher portal section tab layout' : 'Admin portal section tab layout'}
    >
      <Button
        type="button"
        size="sm"
        variant={sidebar ? 'ghost' : 'default'}
        className="h-9 rounded-lg gap-1.5 px-3 text-xs font-bold"
        onClick={() => updateSettings(staffPortalNavLayoutPatch(target, 'top'))}
        aria-pressed={!sidebar}
        disabled={disabled}
      >
        <Rows3 className="h-3.5 w-3.5" aria-hidden />
        Top tabs
      </Button>
      <Button
        type="button"
        size="sm"
        variant={sidebar ? 'default' : 'ghost'}
        className="h-9 rounded-lg gap-1.5 px-3 text-xs font-bold"
        onClick={() => updateSettings(staffPortalNavLayoutPatch(target, 'sidebar'))}
        aria-pressed={sidebar}
        disabled={disabled}
      >
        <PanelLeft className="h-3.5 w-3.5" aria-hidden />
        Side tabs
      </Button>
    </div>
  );
}
