'use client';

import type { ReactNode } from 'react';
import { Helper } from '@/components/ui/helper';
import type { StaffPortalRole } from '@/lib/staffPortal';
import { staffPortalUsesSidebar } from '@/lib/staffPortal';
import { useSettings } from '@/components/providers/SettingsProvider';
import { staffPortalPageIntroClassName } from '@/components/staff/staffPortalNavStyles';
import { cn } from '@/lib/utils';

function portalHeading(role: StaffPortalRole): string {
  if (role === 'teacher') return 'Teacher portal';
  if (role === 'secretary') return 'Print desk';
  return 'School admin';
}

type StaffPortalChromeProps = {
  role: StaffPortalRole;
  schoolId: string;
  /** Override the default role-based page title. */
  title?: string;
  /** Optional one-line context (e.g. teacher name); kept minimal to match admin header density. */
  displayName?: string;
  subtitle?: string;
  /** Extra header actions (legacy; prefer Welcome tab for tools like bulk roster). */
  endActions?: ReactNode;
};

export function StaffPortalChrome({
  role,
  schoolId: _schoolId,
  title,
  displayName,
  subtitle,
  endActions,
}: StaffPortalChromeProps) {
  const { settings } = useSettings();
  const sidebar = staffPortalUsesSidebar(settings, role);

  const defaultSubtitle =
    role === 'teacher'
      ? 'Teacher tools — points, classes, prizes, and reports.'
      : role === 'secretary'
        ? 'Print coupon sheets for teachers to hand out.'
        : 'Manage students, classes, teachers, points, prizes and much more...';

  const helperContent =
    role === 'teacher'
      ? 'Teacher sign-in uses the same URL as school admin, but only your tabs are shown.'
      : 'School admin portal.';

  const heading = title ?? portalHeading(role);

  const resolvedSubtitle =
    subtitle ??
    (displayName && role === 'teacher'
      ? `${defaultSubtitle} Signed in as ${displayName}.`
      : defaultSubtitle);

  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
        staffPortalPageIntroClassName(sidebar),
      )}
    >
      <Helper content={helperContent}>
        <div>
          <h2
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'hsl(var(--primary))' }}
          >
            {heading}
          </h2>
          <p className="text-muted-foreground">{resolvedSubtitle}</p>
        </div>
      </Helper>

      {endActions ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap shrink-0">
          {endActions}
        </div>
      ) : null}
    </div>
  );
}
