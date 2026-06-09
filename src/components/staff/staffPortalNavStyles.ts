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
    'mb-3 w-full max-w-none rounded-b-2xl border border-border/50 border-t-0',
    'bg-slate-200/90 dark:bg-slate-900/88',
    'shadow-lg backdrop-blur-md sm:mb-4 sm:rounded-b-3xl',
  );
}

/** Inner padding for global header content. */
export function staffPortalGlobalHeaderInnerClassName() {
  return 'px-4 md:px-6';
}

/** Page title block — full-width row above the sidebar/content grid. */
export function staffPortalPageIntroClassName(_isWide: boolean) {
  return 'w-full shrink-0 pb-0.5';
}

/** Admin / teacher portal page shell. */
export function staffPortalShellClassName(isWide: boolean) {
  return cn(
    'flex h-full min-h-0 min-w-0 w-full flex-1 flex-col gap-4',
    isWide ? 'max-w-none px-3 py-3 sm:px-4 md:px-5 md:py-4' : 'w-full py-4 md:py-5',
  );
}

/** Unified workspace — sidebar + main share one card backdrop. */
export function staffPortalWorkspaceClassName(className?: string) {
  return cn(
    className,
    'flex min-h-0 w-full min-w-0 flex-1 flex-col rounded-2xl border border-border/60 bg-card shadow-sm',
    'lg:grid lg:grid-cols-[minmax(13.5rem,15rem)_minmax(0,1fr)] lg:items-stretch lg:gap-0',
  );
}

/** Sidebar column inside the workspace — rail with divider, no separate card. */
export function staffPortalSidebarRailClassName(className?: string) {
  return cn(
    className,
    'flex w-full min-w-0 flex-col gap-2 p-2.5 sm:p-3',
    'lg:border-r lg:border-border/50 lg:bg-muted/15 lg:py-3 lg:pl-3 lg:pr-2',
  );
}

/** Main column inside the workspace. */
export function staffPortalWorkspaceMainClassName(className?: string) {
  return cn(className, 'flex min-h-0 min-w-0 flex-1 flex-col lg:min-h-[12rem] lg:py-3 lg:pl-4 lg:pr-3');
}

/** Section card inside the workspace — avoid double borders on the shared backdrop. */
export function staffPortalSectionCardInWorkspaceClassName(className?: string) {
  return cn(
    className,
    'w-full min-w-0 overflow-hidden rounded-none border-0 bg-transparent shadow-none',
    'hover:shadow-none motion-reduce:hover:shadow-none',
  );
}

/** Sidebar nav panel — standalone card (horizontal tab row, legacy). */
export function staffPortalSidebarPanelClassName(className?: string) {
  return cn(
    className,
    'flex w-full min-w-0 min-h-0 flex-1 flex-col gap-2 overflow-hidden rounded-2xl border border-border/60 bg-card p-2.5 shadow-sm',
    'lg:max-h-[calc(100vh-5.5rem)]',
  );
}

/** Desktop sidebar nav column — sticky rail with internal scroll for long tab lists. */
export function staffPortalSidebarNavColumnClassName(className?: string) {
  return cn(
    className,
    'hidden w-full min-w-0 min-h-0 lg:flex lg:flex-1 lg:max-h-[calc(100vh-5.5rem)] lg:flex-col lg:self-start lg:sticky lg:top-3',
  );
}

/**
 * Main tab triggers — shared by admin dashboard and teacher staff portal.
 * Includes data-[state=active] styles for Radix TabsTrigger (admin) and base styles.
 */
export function staffPortalTabTriggerClassName() {
  return cn(
    'rounded-xl font-medium flex items-center gap-2 text-sm text-muted-foreground transition-all',
    'hover:bg-muted/50 hover:text-foreground',
    'w-full justify-start px-3 py-2.5 whitespace-normal text-left',
    // Radix TabsTrigger active state (used by admin page):
    'data-[state=active]:bg-primary data-[state=active]:font-bold data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm',
  );
}

/** Active state styles for plain button tab triggers (JS-controlled, teacher portal). */
export function staffPortalTabTriggerActiveClassName() {
  return cn(
    'bg-primary font-bold text-primary-foreground shadow-sm',
    'hover:bg-primary/90 hover:text-primary-foreground',
  );
}

/** Extra-feature tabs with custom per-tab colors (no forced primary fill on active). */
export function staffPortalAddOnTabTriggerClassName() {
  return cn(
    'rounded-xl font-semibold flex items-center gap-2 text-sm transition-all',
    'w-full justify-start px-3 py-2.5 whitespace-normal text-left',
    'data-[state=active]:bg-transparent data-[state=active]:text-inherit data-[state=active]:shadow-sm',
  );
}

/** Section card — white panel inside the page shell. */
export function staffPortalSectionCardClassName(className?: string) {
  return cn(
    className,
    'w-full min-w-0 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm',
    'hover:shadow-sm motion-reduce:hover:shadow-sm',
  );
}

/** Section toolbar header — simple row inside the card. */
export function staffPortalSectionCardHeaderClassName(className?: string) {
  return cn(
    'flex flex-col gap-2 border-b border-border/50 bg-transparent px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between',
    className,
  );
}

export function staffPortalSectionCardTitleClassName(className?: string) {
  return cn('flex items-center gap-2 text-base font-semibold tracking-tight text-foreground', className);
}

/** Tab-level page title (matches sidebar label). */
export function staffPortalTabHeaderTitleClassName(className?: string) {
  return cn(
    'flex items-center gap-2 text-base font-semibold leading-none tracking-tight text-foreground sm:text-lg',
    className,
  );
}

/** Tab-level header icon beside the title. */
export function staffPortalTabHeaderIconClassName(className?: string) {
  return cn('h-4 w-4 shrink-0 text-primary sm:h-[1.125rem] sm:w-[1.125rem]', className);
}

/** Shared shell — rounded cream panel above tab content (Hall of Fame reference). */
export function staffPortalTabPageHeaderShellClassName(className?: string) {
  return cn(
    'rounded-xl border border-border/50 bg-secondary/80 shadow-sm',
    'px-3 py-2 sm:px-4 sm:py-2.5',
    'dark:bg-secondary/30 dark:border-border/60',
    className,
  );
}

/** Standard gap between tab header panel and content card. */
export function staffPortalTabPanelClassName(className?: string) {
  return cn('flex min-w-0 w-full flex-col gap-2.5', className);
}

/** Section title / header icons — theme second accent (amber in sapphire). */
export function staffPortalSectionIconClassName(className?: string) {
  return cn('shrink-0 text-ring', className);
}

/** Sticky list column header — subtle strip. */
export function staffPortalRecordListHeaderClassName() {
  return 'sticky top-0 z-10 border-b border-border/50 bg-muted/30 px-2 py-1.5 shadow-none backdrop-blur-sm';
}
