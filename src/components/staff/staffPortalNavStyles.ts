import { cn } from '@/lib/utils';

/** Content shell width — side tabs use full width (same idea as office wide layout). */
export function staffPortalContentMaxWidthClass(sidebar: boolean) {
  return sidebar ? 'max-w-none' : 'max-w-7xl';
}

/** Outer wrap: drop horizontal inset so the header band is edge-to-edge. */
export function staffPortalGlobalHeaderWrapClassName(sidebar: boolean) {
  if (!sidebar) return '';
  return 'max-w-none w-full px-0';
}

/** Global site header band when staff portal uses side tabs. */
export function staffPortalGlobalHeaderClassName(sidebar: boolean) {
  if (!sidebar) return '';
  return cn(
    'mb-3 w-full max-w-none rounded-none border-0 border-b border-border/50',
    'bg-slate-200/90 dark:bg-slate-900/88',
    'shadow-none sm:mb-4',
  );
}

/** Inner padding for global header content in side-tab layout. */
export function staffPortalGlobalHeaderInnerClassName(sidebar: boolean) {
  return sidebar ? 'px-4 md:px-6' : '';
}

/** Page title block (School admin / Teacher portal) — separates intro from tab content. */
export function staffPortalPageIntroClassName(sidebar: boolean) {
  if (!sidebar) return '';
  return cn(
    'border-b border-border/50 bg-slate-200/90 pb-4 dark:bg-slate-900/88',
    'relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 px-4 sm:px-6',
  );
}

/** Admin / teacher portal page shell — side tabs drop centered max-width frame. */
export function staffPortalShellClassName(sidebar: boolean) {
  return cn(
    'flex h-full min-h-0 min-w-0 w-full flex-1 flex-col gap-6',
    sidebar ? 'max-w-none px-2 py-3 sm:px-3 md:py-4' : 'mx-auto max-w-7xl p-4 md:p-8',
  );
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

/** Section card — side tabs: flat panel inside shell (no top accent / heavy shadow). */
export function staffPortalSectionCardClassName(sidebar: boolean, className?: string) {
  return cn(
    className,
    sidebar
      ? 'w-full min-w-0 rounded-none border-0 bg-transparent shadow-none'
      : 'w-full min-w-0 border-t-4 border-primary shadow-md',
  );
}

/** Section toolbar header — side tabs: simple row, not a colored banner. */
export function staffPortalSectionCardHeaderClassName(sidebar: boolean, className?: string) {
  return cn(
    className,
    sidebar &&
      'flex flex-col gap-3 border-b border-border/50 bg-transparent px-0 py-3 sm:flex-row sm:items-center sm:justify-between',
  );
}

export function staffPortalSectionCardTitleClassName(sidebar: boolean, className?: string) {
  return cn(
    className,
    sidebar && 'text-lg font-semibold tracking-tight text-foreground',
  );
}

/** Sticky list column header — side tabs: subtle strip, not a tan banner. */
export function staffPortalRecordListHeaderClassName(sidebar: boolean) {
  return sidebar
    ? 'sticky top-0 z-10 border-b border-border/50 bg-muted/25 px-2 py-1.5 shadow-none backdrop-blur-sm'
    : 'sticky top-0 z-10 rounded-xl border border-ring/30 bg-secondary px-2 py-1.5 shadow-sm backdrop-blur';
}

