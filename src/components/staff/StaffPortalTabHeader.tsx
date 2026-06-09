'use client';

import type { ReactNode } from 'react';
import {
  StaffPortalTabInfoPopover,
  staffPortalTabInfoSection,
  type StaffPortalTabInfoSection,
} from '@/components/staff/StaffPortalTabInfoPopover';
import { StaffPortalSectionCardTitle } from '@/components/staff/StaffPortalSection';
import { staffPortalTabByValue, staffPortalTabDescription } from '@/lib/staffPortal';
import {
  staffPortalTabHeaderIconClassName,
  staffPortalTabHeaderTitleClassName,
  staffPortalTabPageHeaderShellClassName,
  staffPortalTabPanelClassName,
} from '@/components/staff/staffPortalNavStyles';
import { cn } from '@/lib/utils';

export type StaffPortalTabHeaderProps = {
  /** Registry tab value (e.g. `students`, `categories`, `coupons`). */
  tabValue: string;
  title?: string;
  subtitle?: string;
  infoSections?: StaffPortalTabInfoSection[];
  infoAriaLabel?: string;
  hideSubtitle?: boolean;
  showIcon?: boolean;
  iconClassName?: string;
  titleClassName?: string;
  className?: string;
  trailing?: ReactNode;
};

/** Page title row aligned with staff portal sidebar tab labels. */
export function StaffPortalTabHeader({
  tabValue,
  title,
  subtitle,
  infoSections,
  infoAriaLabel,
  hideSubtitle = false,
  showIcon = true,
  iconClassName,
  titleClassName,
  className,
  trailing,
}: StaffPortalTabHeaderProps) {
  const tab = staffPortalTabByValue(tabValue);
  const resolvedTitle = title ?? tab?.label ?? tabValue;
  const resolvedSubtitle =
    subtitle ?? (tab ? staffPortalTabDescription(tab) : undefined);
  const Icon = tab?.icon;
  const sections =
    infoSections ??
    (resolvedSubtitle ? [staffPortalTabInfoSection(resolvedSubtitle)] : []);

  return (
    <div
      className={cn(
        'flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <StaffPortalSectionCardTitle
            className={staffPortalTabHeaderTitleClassName(titleClassName)}
          >
            {showIcon && Icon ? (
              <Icon className={staffPortalTabHeaderIconClassName(iconClassName)} aria-hidden />
            ) : null}
            {resolvedTitle}
          </StaffPortalSectionCardTitle>
          {sections.length > 0 ? (
            <StaffPortalTabInfoPopover
              sections={sections}
              ariaLabel={infoAriaLabel ?? `About ${resolvedTitle}`}
            />
          ) : null}
        </div>
        {!hideSubtitle && resolvedSubtitle ? (
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {resolvedSubtitle}
          </p>
        ) : null}
      </div>
      {trailing ? (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:pl-4">
          {trailing}
        </div>
      ) : null}
    </div>
  );
}

/** Rounded cream header panel (Hall of Fame style). */
export function StaffPortalTabPageHeader({
  headerClassName,
  className,
  ...props
}: StaffPortalTabHeaderProps & { headerClassName?: string }) {
  return (
    <div className={staffPortalTabPageHeaderShellClassName(headerClassName ?? className)}>
      <StaffPortalTabHeader {...props} />
    </div>
  );
}

/** @alias StaffPortalTabPageHeader */
export function StaffPortalTabShellHeader({
  className,
  ...props
}: StaffPortalTabHeaderProps & { className?: string }) {
  return <StaffPortalTabPageHeader className={className} {...props} />;
}

/** Header panel + content below — standard tab page layout. */
export function StaffPortalTabPanel({
  className,
  headerClassName,
  children,
  ...headerProps
}: StaffPortalTabHeaderProps & {
  className?: string;
  headerClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className={staffPortalTabPanelClassName(className)}>
      <StaffPortalTabPageHeader headerClassName={headerClassName} {...headerProps} />
      {children}
    </div>
  );
}
