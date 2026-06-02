'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  staffPortalSectionCardClassName,
  staffPortalSectionCardHeaderClassName,
  staffPortalSectionCardTitleClassName,
} from '@/components/staff/staffPortalNavStyles';

export function StaffPortalSectionCard({
  className,
  ...props
}: React.ComponentProps<typeof Card>) {
  return <Card className={staffPortalSectionCardClassName(className)} {...props} />;
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
