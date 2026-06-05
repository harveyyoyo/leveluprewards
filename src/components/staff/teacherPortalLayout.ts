import { cn } from '@/lib/utils';
import { staffPortalContentWidthClassName } from '@/components/staff/staffPortalNavStyles';

export const teacherPortalTabContentClassName =
  'transition-opacity duration-150 mt-0 w-full min-w-0 flex-col pb-6 focus-visible:outline-none data-[state=active]:animate-none motion-reduce:animate-none';

export function teacherPortalPanelClassName(isWide: boolean) {
  return cn('w-full', staffPortalContentWidthClassName(isWide));
}
