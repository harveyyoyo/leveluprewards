import { cn } from '@/lib/utils';

/** Content shell width — side tabs use full width (same idea as office wide layout). */
export function staffPortalContentMaxWidthClass(sidebar: boolean) {
  return sidebar ? 'max-w-none' : 'max-w-7xl';
}

/** Main tab triggers — shared by admin dashboard and teacher staff portal on `/admin`. */
export function staffPortalTabTriggerClassName(sidebar: boolean) {
  return cn(
    'rounded-xl font-bold flex items-center gap-2 text-sm text-foreground transition-all',
    'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground',
    sidebar
      ? 'w-full justify-start px-3 py-2.5 whitespace-normal text-left data-[state=active]:shadow-md'
      : 'px-4 py-2 whitespace-nowrap data-[state=active]:shadow-md data-[state=active]:ring-2 data-[state=active]:ring-primary/25',
  );
}
