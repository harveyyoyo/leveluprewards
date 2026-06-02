import { cn } from '@/lib/utils';

/** Content width — wide uses full width; standard matches the former centered portal column. */
export function staffPortalContentWidthClassName(isWide: boolean) {
  return isWide ? 'w-full max-w-none' : 'mx-auto w-full max-w-7xl';
}

/** `<main>` width on staff portal routes (synced with layout toggle). */
export function staffPortalMainClassName(isWide: boolean) {
  return isWide
    ? 'relative z-10 flex w-full min-h-0 max-w-none flex-1 flex-col'
    : 'relative z-10 mx-auto flex w-full min-h-0 max-w-7xl flex-1 flex-col px-4 md:px-8';
}

/** Global header outer wrap on staff portal routes. */
export function staffPortalHeaderWrapClassName(isWide: boolean) {
  return isWide ? staffPortalGlobalHeaderWrapClassName() : 'mx-auto w-full max-w-7xl px-4 md:px-8';
}

/** Site footer inner width on staff portal routes. */
export function staffPortalFooterInnerClassName(isWide: boolean) {
  return isWide ? 'w-full max-w-none px-4 sm:px-6' : 'mx-auto w-full max-w-7xl px-4 sm:px-6';
}

/** Outer wrap: edge-to-edge header band for side-tab portals. */
export function staffPortalGlobalHeaderWrapClassName() {
  return 'max-w-none w-full px-0';
}

/** Global site header band on staff portal pages. */
export function staffPortalGlobalHeaderClassName() {
  return cn(
    'mb-3 w-full max-w-none rounded-none border-0 border-b border-border/50',
    'bg-slate-200/90 dark:bg-slate-900/88',
    'shadow-none sm:mb-4',
  );
}

/** Inner padding for global header content. */
export function staffPortalGlobalHeaderInnerClassName() {
  return 'px-4 md:px-6';
}

/** Page title block — separates intro from tab content. */
export function staffPortalPageIntroClassName(isWide: boolean) {
  return cn(
    'border-b border-border/50 bg-slate-200/90 pb-4 dark:bg-slate-900/88',
    'relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 px-4 sm:px-6',
    !isWide && 'sm:rounded-b-2xl',
  );
}

/** Admin / teacher portal page shell. */
export function staffPortalShellClassName(isWide: boolean) {
  return cn(
    'flex h-full min-h-0 min-w-0 w-full flex-1 flex-col gap-6',
    isWide ? 'max-w-none px-3 py-3 sm:px-4 md:px-6 md:py-4' : 'w-full py-4 md:py-6',
  );
}

/** Main tab triggers — shared by admin dashboard and teacher staff portal. */
export function staffPortalTabTriggerClassName() {
  return cn(
    'rounded-xl font-bold flex items-center gap-2 text-sm text-foreground transition-all',
    'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground',
    'w-full justify-start px-3 py-2.5 whitespace-normal text-left data-[state=active]:shadow-md',
  );
}

/** Section card — flat panel inside shell. */
export function staffPortalSectionCardClassName(className?: string) {
  return cn(
    className,
    'w-full min-w-0 rounded-none border-0 bg-transparent shadow-none',
  );
}

/** Section toolbar header — simple row, not a colored banner. */
export function staffPortalSectionCardHeaderClassName(className?: string) {
  return cn(
    className,
    'flex flex-col gap-3 border-b border-border/50 bg-transparent px-0 py-3 sm:flex-row sm:items-center sm:justify-between',
  );
}

export function staffPortalSectionCardTitleClassName(className?: string) {
  return cn(className, 'text-lg font-semibold tracking-tight text-foreground');
}

/** Sticky list column header — subtle strip. */
export function staffPortalRecordListHeaderClassName() {
  return 'sticky top-0 z-10 border-b border-border/50 bg-muted/25 px-2 py-1.5 shadow-none backdrop-blur-sm';
}
