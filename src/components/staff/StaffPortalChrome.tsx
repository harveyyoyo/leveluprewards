'use client';

import type { ReactNode } from 'react';
import { PanelLeft, Rows3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Helper } from '@/components/ui/helper';
import { useSettings } from '@/components/providers/SettingsProvider';
import type { StaffPortalRole } from '@/lib/staffPortal';

type StaffPortalChromeProps = {
  role: StaffPortalRole;
  schoolId: string;
  /** Optional one-line context (e.g. teacher name); kept minimal to match admin header density. */
  displayName?: string;
  subtitle?: string;
  /** Hide layout toggle (e.g. secretary) */
  showLayoutToggle?: boolean;
  /** Extra header actions (admin: bulk roster; teacher: none — global header handles sign-out). */
  endActions?: ReactNode;
};

export function StaffPortalChrome({
  role,
  schoolId: _schoolId,
  displayName,
  subtitle,
  showLayoutToggle = true,
  endActions,
}: StaffPortalChromeProps) {
  const { settings, updateSettings } = useSettings();
  const sidebar = settings.adminNavLayout === 'sidebar';

  const defaultSubtitle =
    role === 'teacher'
      ? 'Teacher tools — points, classes, prizes, and reports.'
      : role === 'secretary'
        ? 'Print coupon sheets for teachers to hand out.'
        : 'Manage students, classes, prizes, and system settings.';

  const helperContent =
    role === 'teacher'
      ? 'Same admin portal layout with teacher tabs only.'
      : 'School admin portal.';

  const resolvedSubtitle =
    subtitle ??
    (displayName && role === 'teacher'
      ? `${defaultSubtitle} Signed in as ${displayName}.`
      : defaultSubtitle);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <Helper content={helperContent}>
        <div>
          <h2
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'hsl(var(--primary))' }}
          >
            Admin
          </h2>
          <p className="text-muted-foreground">{resolvedSubtitle}</p>
        </div>
      </Helper>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap shrink-0">
        {showLayoutToggle ? (
          <div
            className="flex items-center gap-0.5 rounded-xl border border-border/60 bg-muted/40 p-1"
            role="group"
            aria-label="Admin section tab layout"
          >
            <Button
              type="button"
              size="sm"
              variant={sidebar ? 'ghost' : 'default'}
              className="h-9 rounded-lg gap-1.5 px-3 text-xs font-bold"
              onClick={() => updateSettings({ adminNavLayout: 'top' })}
              aria-pressed={!sidebar}
            >
              <Rows3 className="h-3.5 w-3.5" aria-hidden />
              Top tabs
            </Button>
            <Button
              type="button"
              size="sm"
              variant={sidebar ? 'default' : 'ghost'}
              className="h-9 rounded-lg gap-1.5 px-3 text-xs font-bold"
              onClick={() => updateSettings({ adminNavLayout: 'sidebar' })}
              aria-pressed={sidebar}
            >
              <PanelLeft className="h-3.5 w-3.5" aria-hidden />
              Side tabs
            </Button>
          </div>
        ) : null}
        {endActions}
      </div>
    </div>
  );
}
