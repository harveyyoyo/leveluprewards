'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useStaffPortalLayout } from '@/components/staff/StaffPortalLayoutContext';
import {
  staffPortalSectionCardClassName,
  staffPortalSectionCardHeaderClassName,
  staffPortalSectionCardTitleClassName,
} from '@/components/staff/staffPortalNavStyles';

export function StaffPortalSectionCard({
  className,
  ...props
}: React.ComponentProps<typeof Card>) {
  const { sidebar } = useStaffPortalLayout();
  return <Card className={staffPortalSectionCardClassName(sidebar, className)} {...props} />;
}

export function StaffPortalSectionCardHeader({
  className,
  ...props
}: React.ComponentProps<typeof CardHeader>) {
  const { sidebar } = useStaffPortalLayout();
  return (
    <CardHeader className={staffPortalSectionCardHeaderClassName(sidebar, className)} {...props} />
  );
}

export function StaffPortalSectionCardTitle({
  className,
  ...props
}: React.ComponentProps<typeof CardTitle>) {
  const { sidebar } = useStaffPortalLayout();
  return (
    <CardTitle className={staffPortalSectionCardTitleClassName(sidebar, className)} {...props} />
  );
}

export { CardContent as StaffPortalSectionCardContent };
