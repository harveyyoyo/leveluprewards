import { portalChooseTitleClass } from '@/lib/kioskPortraitLayout';

/** Portal hub card ids on the main `/{schoolId}/portal` chooser screen. */
export type MainPortalCardId = 'admin' | 'print' | 'redeem' | 'student-home' | 'parent';

export const MAIN_PORTAL_CARD_ORDER: readonly MainPortalCardId[] = [
  'admin',
  'print',
  'redeem',
  'student-home',
  'parent',
];

/** Default hub cards: admin, teacher, and student kiosk only. */
export const DEFAULT_MAIN_PORTAL_CARDS: readonly MainPortalCardId[] = ['admin', 'print', 'redeem'];

const MAIN_PORTAL_CARD_ID_SET = new Set<string>(MAIN_PORTAL_CARD_ORDER);

export function isMainPortalCardId(value: unknown): value is MainPortalCardId {
  return typeof value === 'string' && MAIN_PORTAL_CARD_ID_SET.has(value);
}

/** Normalize stored settings; falls back to the three core portals. */
export function resolveMainPortalCards(value: unknown): MainPortalCardId[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [...DEFAULT_MAIN_PORTAL_CARDS];
  }
  const seen = new Set<MainPortalCardId>();
  for (const entry of value) {
    if (isMainPortalCardId(entry)) seen.add(entry);
  }
  const resolved = MAIN_PORTAL_CARD_ORDER.filter((id) => seen.has(id));
  return resolved.length > 0 ? [...resolved] : [...DEFAULT_MAIN_PORTAL_CARDS];
}

export function isMainPortalCardEnabled(
  cards: readonly MainPortalCardId[] | undefined,
  portalId: string,
): boolean {
  return resolveMainPortalCards(cards).includes(portalId as MainPortalCardId);
}

export function toggleMainPortalCard(
  cards: readonly MainPortalCardId[] | undefined,
  portalId: MainPortalCardId,
  enabled: boolean,
): MainPortalCardId[] {
  const current = resolveMainPortalCards(cards);
  if (enabled) {
    if (current.includes(portalId)) return current;
    const next = [...current, portalId];
    return MAIN_PORTAL_CARD_ORDER.filter((id) => next.includes(id));
  }
  if (current.length <= 1) return current;
  return current.filter((id) => id !== portalId);
}

/** Grid columns for the portal hub card area. */
export function portalHubGridClass(count: number, compactDisplay: boolean, portrait: boolean): string {
  if (portrait || compactDisplay || count <= 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-1 sm:grid-cols-2';
  if (count === 3) return 'grid-cols-1 md:grid-cols-3';
  if (count === 4) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2';
  return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
}

export function portalHubGapClass(count: number, compactDisplay: boolean): string {
  if (compactDisplay) return 'gap-3';
  if (count <= 3) return 'gap-3 md:gap-5';
  if (count === 4) return 'gap-2.5 md:gap-4';
  return 'gap-2 md:gap-3';
}

export function portalHubOuterGapClass(count: number, compactDisplay: boolean): string {
  if (compactDisplay) return 'justify-start gap-3 sm:gap-4 md:justify-center md:gap-8';
  if (count <= 3) return 'justify-start gap-10 sm:gap-12 md:gap-16';
  if (count === 4) return 'justify-start gap-6 sm:gap-8 md:gap-10';
  return 'justify-start gap-4 sm:gap-6 md:gap-8';
}

export function portalHubTitleClass(count: number, compactDisplay: boolean, portrait: boolean): string {
  if (portrait) return portalChooseTitleClass(portrait, compactDisplay);
  if (compactDisplay) {
    if (count >= 5) return 'px-2 py-1 text-4xl sm:text-5xl md:text-6xl';
    if (count === 4) return 'px-2 py-1 text-4xl sm:text-5xl md:text-6xl';
    return 'px-2 py-2 text-5xl sm:text-6xl md:text-7xl';
  }
  if (count >= 5) return 'px-2 py-2 text-4xl sm:text-5xl md:text-6xl';
  if (count === 4) return 'px-2 py-2 text-5xl sm:text-6xl md:text-7xl';
  return 'px-2 py-3 text-6xl sm:text-7xl md:text-8xl';
}

export function portalHubCardPaddingClass(count: number, compactDisplay: boolean): string {
  if (compactDisplay) return 'px-4 py-4 sm:px-5 sm:py-5';
  if (count <= 3) return 'min-h-[12rem] px-3 py-3.5 sm:min-h-[clamp(200px,24vw,300px)] sm:px-5 sm:py-5 md:min-h-[clamp(220px,24vw,300px)]';
  if (count === 4) return 'min-h-[10rem] px-3 py-3 sm:min-h-[clamp(160px,18vw,220px)] sm:px-4 sm:py-4 md:min-h-[clamp(170px,16vw,230px)]';
  return 'min-h-[9rem] px-2.5 py-2.5 sm:min-h-[clamp(130px,14vw,190px)] sm:px-3.5 sm:py-3.5 md:min-h-[clamp(140px,13vw,200px)]';
}

export function portalHubGridMaxWidthClass(count: number, compactDisplay: boolean, portrait: boolean): string {
  if (portrait) return '';
  if (compactDisplay) return 'max-w-[min(24rem,calc(100%-0.5rem))] sm:max-w-xl';
  if (count <= 1) return 'max-w-[min(22rem,calc(100%-0.5rem))] sm:max-w-md';
  if (count === 2) return 'max-w-[min(28rem,calc(100%-0.5rem))] sm:max-w-2xl md:max-w-3xl';
  if (count === 3) return 'max-w-[min(22rem,calc(100%-0.5rem))] sm:max-w-md md:max-w-6xl';
  return 'max-w-[min(100%,calc(100%-0.5rem))] sm:max-w-3xl md:max-w-5xl lg:max-w-6xl';
}
