'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStaffPortalInWorkspace } from '@/components/staff/StaffPortalWorkspace';
import {
  staffPortalSectionCardClassName,
  staffPortalSectionCardHeaderClassName,
  staffPortalSectionCardInWorkspaceClassName,
  staffPortalSectionCardTitleClassName,
} from '@/components/staff/staffPortalNavStyles';
import { cn } from '@/lib/utils';

export function StaffPortalSectionCard({
  className,
  ...props
}: React.ComponentProps<typeof Card>) {
  const inWorkspace = useStaffPortalInWorkspace();
  return (
    <Card
      className={cn(
        inWorkspace ? staffPortalSectionCardInWorkspaceClassName() : staffPortalSectionCardClassName(),
        className,
      )}
      {...props}
    />
  );
}

export function StaffPortalSectionCardHeader({
  className,
  ...props
}: React.ComponentProps<typeof CardHeader>) {
  return <CardHeader className={staffPortalSectionCardHeaderClassName(className)} {...props} />;
}

export function StaffPortalSectionCardTitle({
  className,
  ...props
}: React.ComponentProps<typeof CardTitle>) {
  return <CardTitle className={staffPortalSectionCardTitleClassName(className)} {...props} />;
}

export { CardContent as StaffPortalSectionCardContent };
