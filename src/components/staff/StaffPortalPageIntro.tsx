'use client';

import type { ReactNode } from 'react';
import { Helper } from '@/components/ui/helper';
import { cn } from '@/lib/utils';
import { useStaffPortalLayout } from '@/components/staff/StaffPortalLayoutContext';
import { staffPortalPageIntroClassName } from '@/components/staff/staffPortalNavStyles';

export type StaffPortalPageIntroProps = {
  title: string;
  subtitle: string;
  helperContent: string;
  className?: string;
  /** Extra controls (e.g. secretary log out). */
  trailing?: ReactNode;
};

/** Shared page title row for admin / teacher staff portals. */
export function StaffPortalPageIntro({
  title,
  subtitle,
  helperContent,
  className,
  trailing,
}: StaffPortalPageIntroProps) {
  const { isWide } = useStaffPortalLayout();

  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
        staffPortalPageIntroClassName(isWide),
        className,
      )}
    >
      <Helper content={helperContent}>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
        </div>
      </Helper>
      {trailing ? (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:self-start">
          {trailing}
        </div>
      ) : null}
    </div>
  );
}
