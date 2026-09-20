import type { LibraryItem } from '@/lib/types';
import { computeDaysOverdue } from '@/lib/library/libraryPolicy';

export type LibraryAiHelpScreen =
  | 'hub'
  | 'desk'
  | 'catalog'
  | 'kiosk'
  | 'settings'
  | 'reports'
  | 'loans'
  | 'picker';

export type LibraryAiHelpContext = {
  libraryName: string;
  libraryCount: number;
  catalogCount: number;
  availableCount: number;
  checkedOutCount: number;
  overdueCount: number;
  needsProcessingCount: number;
  lostDamagedCount: number;
  maxCheckoutsPerStudent: number;
  loanPeriodDays: number;
  gracePeriodDays: number;
  maxRenewals: number;
  currentScreen: LibraryAiHelpScreen;
  selfCheckoutEnabled: boolean;
  topOverdueTitles: string[];
};

const HELP_SCREENS = new Set<LibraryAiHelpScreen>([
  'hub',
  'desk',
  'catalog',
  'kiosk',
  'settings',
  'reports',
  'loans',
  'picker',
]);

function asCount(n: unknown): number {
  const value = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(Math.floor(value), 1_000_000);
}

function copyNeedsProcessing(item: Pick<LibraryItem, 'labeled' | 'shelfLocation'>): boolean {
  return !item.labeled || !item.shelfLocation?.trim();
}

export function resolveLibraryAiHelpScreen(hubHome: boolean, tab: string): LibraryAiHelpScreen {
  if (hubHome) return 'hub';
  if (HELP_SCREENS.has(tab as LibraryAiHelpScreen)) return tab as LibraryAiHelpScreen;
  return 'desk';
}

export function buildLibraryAiHelpContext(params: {
  libraryName?: string | null;
  libraryCount: number;
  copies: LibraryItem[];
  overdueCopies?: LibraryItem[];
  policy: {
    maxCheckoutsPerStudent: number;
    loanPeriodDays: number;
    gracePeriodDays: number;
    maxRenewals: number;
  };
  currentScreen: LibraryAiHelpScreen;
  selfCheckoutEnabled: boolean;
}): LibraryAiHelpContext {
  const active = params.copies.filter((item) => !item.archived);
  const overdue =
    params.overdueCopies ??
    active.filter((item) => item.status === 'checked_out' && computeDaysOverdue(item.dueAt) > 0);

  const topOverdueTitles: string[] = [];
  for (const item of overdue) {
    const title = (item.name || '').trim();
    if (!title || topOverdueTitles.includes(title)) continue;
    topOverdueTitles.push(title.slice(0, 80));
    if (topOverdueTitles.length >= 6) break;
  }

  const libraryName = (params.libraryName || 'School Library').trim().slice(0, 80) || 'School Library';

  return {
    libraryName,
    libraryCount: Math.max(1, asCount(params.libraryCount) || 1),
    catalogCount: active.length,
    availableCount: active.filter(
      (item) => item.status === 'available' && (!item.condition || item.condition === 'good'),
    ).length,
    checkedOutCount: active.filter((item) => item.status === 'checked_out').length,
    overdueCount: overdue.length,
    needsProcessingCount: active.filter(copyNeedsProcessing).length,
    lostDamagedCount: active.filter((item) => item.condition === 'lost' || item.condition === 'damaged').length,
    maxCheckoutsPerStudent: asCount(params.policy.maxCheckoutsPerStudent),
    loanPeriodDays: Math.max(1, asCount(params.policy.loanPeriodDays) || 14),
    gracePeriodDays: asCount(params.policy.gracePeriodDays),
    maxRenewals: asCount(params.policy.maxRenewals),
    currentScreen: HELP_SCREENS.has(params.currentScreen) ? params.currentScreen : 'desk',
    selfCheckoutEnabled: params.selfCheckoutEnabled === true,
    topOverdueTitles,
  };
}

export function parseLibraryAiHelpContext(raw: unknown): LibraryAiHelpContext | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const value = raw as Record<string, unknown>;
  const currentScreen = HELP_SCREENS.has(value.currentScreen as LibraryAiHelpScreen)
    ? (value.currentScreen as LibraryAiHelpScreen)
    : 'hub';
  const topOverdueTitles = Array.isArray(value.topOverdueTitles)
    ? value.topOverdueTitles
        .filter((title): title is string => typeof title === 'string')
        .map((title) => title.trim().slice(0, 80))
        .filter(Boolean)
        .slice(0, 6)
    : [];

  return {
    libraryName:
      typeof value.libraryName === 'string' && value.libraryName.trim()
        ? value.libraryName.trim().slice(0, 80)
        : 'School Library',
    libraryCount: Math.max(1, asCount(value.libraryCount) || 1),
    catalogCount: asCount(value.catalogCount),
    availableCount: asCount(value.availableCount),
    checkedOutCount: asCount(value.checkedOutCount),
    overdueCount: asCount(value.overdueCount),
    needsProcessingCount: asCount(value.needsProcessingCount),
    lostDamagedCount: asCount(value.lostDamagedCount),
    maxCheckoutsPerStudent: asCount(value.maxCheckoutsPerStudent),
    loanPeriodDays: Math.max(1, asCount(value.loanPeriodDays) || 14),
    gracePeriodDays: asCount(value.gracePeriodDays),
    maxRenewals: asCount(value.maxRenewals),
    currentScreen,
    selfCheckoutEnabled: value.selfCheckoutEnabled === true,
    topOverdueTitles,
  };
}

export function formatLibraryAiHelpContextBlock(ctx: LibraryAiHelpContext): string {
  const overdueLine = ctx.topOverdueTitles.length > 0 ? ctx.topOverdueTitles.join('; ') : 'none listed';
  return [
    '**Live Library snapshot (this session — book titles only, no student names)**',
    `- Open library: ${ctx.libraryName} (${ctx.libraryCount} libraries at this school)`,
    `- Catalog: ${ctx.catalogCount} copies; ${ctx.availableCount} on the shelf; ${ctx.checkedOutCount} checked out; ${ctx.overdueCount} overdue`,
    `- Still needs a sticker or shelf spot: ${ctx.needsProcessingCount}`,
    `- Lost or damaged: ${ctx.lostDamagedCount}`,
    `- Loan rules: ${ctx.maxCheckoutsPerStudent} books per student, ${ctx.loanPeriodDays} days, ${ctx.gracePeriodDays} grace days, ${ctx.maxRenewals} renewals`,
    `- Student self-checkout station: ${ctx.selfCheckoutEnabled ? 'on' : 'off'}`,
    `- Staff is on this library screen: ${ctx.currentScreen}`,
    `- Overdue titles (no borrowers): ${overdueLine}`,
    '',
    'Use these counts. Do not invent student names, barcodes, or extra overdue titles.',
  ].join('\n');
}
