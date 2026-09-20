import { isPillarOn, type PillarSettings, type ProductPillarAccess } from '@/lib/productPillars';
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

/** Library card on `/{school}/portal` — follows the Library product switch, not the hub-card checklist. */
export function isLibraryPortalHubCardVisible(
  settings: PillarSettings | null | undefined,
  pillarAccess?: ProductPillarAccess | null,
): boolean {
  return isPillarOn(settings, 'payLibrary', pillarAccess);
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
  if (compactDisplay) return 'gap-2 sm:gap-2.5';
  if (count <= 3) return 'gap-3 md:gap-4 lg:gap-5';
  if (count === 4) return 'gap-2 sm:gap-3 md:gap-3.5';
  return 'gap-1.5 sm:gap-2 md:gap-2.5';
}

export function portalHubOuterGapClass(count: number, compactDisplay: boolean): string {
  if (compactDisplay) return 'justify-center gap-2 sm:gap-3 md:gap-4';
  if (count <= 3) return 'justify-center gap-4 sm:gap-6 md:gap-8';
  if (count === 4) return 'justify-center gap-2 sm:gap-3 md:gap-3.5 lg:gap-4';
  return 'justify-center gap-1.5 sm:gap-2 md:gap-2.5';
}

export function portalHubTitleClass(count: number, compactDisplay: boolean, portrait: boolean): string {
  if (portrait) return portalChooseTitleClass(portrait, compactDisplay);
  if (compactDisplay) {
    if (count >= 5) return 'px-2 py-0.5 text-2xl sm:text-3xl md:text-4xl';
    if (count === 4) return 'px-2 py-0.5 text-2xl sm:text-3xl md:text-4xl';
    return 'px-2 py-1 text-3xl sm:text-4xl md:text-5xl';
  }
  if (count >= 5) return 'px-2 py-1 text-3xl sm:text-4xl md:text-5xl';
  if (count === 4) return 'px-2 py-1 text-3xl sm:text-4xl md:text-5xl lg:text-5xl';
  return 'px-2 py-1.5 text-4xl sm:text-5xl md:text-6xl lg:text-7xl';
}

export function portalHubCardPaddingClass(count: number, compactDisplay: boolean): string {
  if (compactDisplay) return 'px-3 py-2 sm:px-4 sm:py-2.5';
  if (count <= 3) return 'min-h-[7rem] px-3 py-3 sm:min-h-[clamp(130px,16vh,190px)] sm:px-5 sm:py-4 md:min-h-[clamp(140px,18vh,210px)]';
  if (count === 4) return 'min-h-[5.5rem] px-3 py-2.5 sm:min-h-[clamp(100px,13vh,140px)] sm:px-4 sm:py-3 md:min-h-[clamp(110px,14vh,150px)]';
  return 'min-h-[5rem] px-2.5 py-2 sm:min-h-[clamp(85px,11vh,120px)] sm:px-3 sm:py-2.5 md:min-h-[clamp(95px,12vh,130px)]';
}

export function portalHubGridMaxWidthClass(count: number, compactDisplay: boolean, portrait: boolean): string {
  if (portrait) return '';
  if (compactDisplay) return 'max-w-[min(24rem,calc(100%-0.5rem))] sm:max-w-xl';
  if (count <= 1) return 'max-w-[min(22rem,calc(100%-0.5rem))] sm:max-w-md';
  if (count === 2) return 'max-w-[min(28rem,calc(100%-0.5rem))] sm:max-w-2xl md:max-w-3xl';
  if (count === 3) return 'max-w-[min(22rem,calc(100%-0.5rem))] sm:max-w-md md:max-w-6xl';
  return 'max-w-[min(100%,calc(100%-0.5rem))] sm:max-w-3xl md:max-w-5xl lg:max-w-6xl';
}

/** Common portal-hub destinations to warm via `router.prefetch` (first click snappiness). */
export const PORTAL_HUB_PREFETCH_SEGMENTS = [
  'student',
  'teacher',
  'admin',
  'admin-sign-in',
  'prize',
  'library',
  'student-home',
  'parent',
] as const;

export function portalHubPrefetchRoutes(schoolId: string): string[] {
  const sid = schoolId.trim().toLowerCase();
  if (!sid) return [];
  return [
    `/${sid}/portal`,
    ...PORTAL_HUB_PREFETCH_SEGMENTS.map((segment) => `/${sid}/${segment}`),
  ];
}
