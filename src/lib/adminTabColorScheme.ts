import type { CSSProperties } from 'react';
import type { ColorScheme, Settings } from '@/components/providers/SettingsProvider';
import { STAFF_PORTAL_TAB_REGISTRY } from '@/lib/staffPortal/tabRegistry';
import { complementTripletByIndex, rainbowTripletByIndex, type NavColorScheme } from '@/lib/rainbowNav';

/** Stable ordering so each admin tab maps to a palette slot in the active theme. */
const ADMIN_TAB_ORDER = [
  'students',
  'classes',
  'teachers',
  'prizes',
  'categories',
  'classroom',
  'reports',
  'roster',
  'coupons',
  'redemptions',
  'insights',
  'attendance',
  'displays',
  'library',
  'bonuspoints',
  'category-badges',
  'goals',
  'raffle',
  'houses',
  'notifications',
  'branding',
  'integrations',
  'student-portal',
  'homework',
  'generated-coupons',
] as const;

function adminTabPaletteIndex(tabId: string): number {
  const idx = ADMIN_TAB_ORDER.indexOf(tabId as (typeof ADMIN_TAB_ORDER)[number]);
  if (idx >= 0) return idx;
  let hash = 0;
  for (let i = 0; i < tabId.length; i++) {
    hash = (hash * 31 + tabId.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function parseTriplet(triplet: string): { h: number; s: number; l: number } {
  const parts = triplet.trim().split(/\s+/);
  const h = Number(parts[0]) || 0;
  const s = Number(String(parts[1] || '').replace('%', '')) || 0;
  const l = Number(String(parts[2] || '').replace('%', '')) || 50;
  return { h, s, l };
}

function formatTriplet(h: number, s: number, l: number) {
  return `${h} ${s}% ${l}%`;
}

/** Accent from the school theme palette — distinct per tab but same family. */
export function adminTabAccentTriplet(tabId: string, scheme: ColorScheme = 'default'): string {
  return rainbowTripletByIndex(adminTabPaletteIndex(tabId), scheme as NavColorScheme);
}

/** Slightly muted accent for page chrome (headers, buttons) while a tab is open. */
export function adminTabMildAccentTriplet(
  tabId: string,
  scheme: ColorScheme = 'default',
  darkMode = false,
): string {
  const { h, s, l } = parseTriplet(adminTabAccentTriplet(tabId, scheme));
  const mildS = Math.min(52, Math.max(28, Math.round(s * 0.72)));
  const mildL = darkMode
    ? Math.min(58, Math.max(44, l))
    : Math.min(46, Math.max(36, Math.round(l * 0.92)));
  return formatTriplet(h, mildS, mildL);
}

export function isAdminAddOnTabValue(tabValue: string): boolean {
  if (tabValue === 'welcome') return false;
  const def = STAFF_PORTAL_TAB_REGISTRY.find((t) => t.value === tabValue);
  return def?.kind === 'addon';
}

/** Subtle per-tab tint for pinned extra-feature tabs (sidebar + Add more menu). */
export function adminAddOnTabTriggerStyle(
  tabId: string,
  settings: Pick<Settings, 'colorScheme' | 'darkMode'>,
  isActive: boolean,
): CSSProperties {
  const mild = adminTabMildAccentTriplet(tabId, settings.colorScheme ?? 'sapphire', !!settings.darkMode);
  const dark = !!settings.darkMode;

  const bgAlpha = isActive ? (dark ? 0.2 : 0.12) : dark ? 0.08 : 0.05;
  const borderAlpha = isActive ? (dark ? 0.38 : 0.28) : dark ? 0.16 : 0.1;

  return {
    backgroundColor: `hsl(${mild} / ${bgAlpha})`,
    borderColor: `hsl(${mild} / ${borderAlpha})`,
    color: isActive ? `hsl(${mild})` : `hsl(${mild} / ${dark ? 0.78 : 0.88})`,
    borderWidth: 1,
    borderStyle: 'solid',
  };
}

/** Subtle accent for rows in the Add more feature menu. */
export function adminAddOnTabMenuItemStyle(
  tabId: string,
  settings: Pick<Settings, 'colorScheme' | 'darkMode'>,
): CSSProperties {
  const mild = adminTabMildAccentTriplet(tabId, settings.colorScheme ?? 'sapphire', !!settings.darkMode);
  const dark = !!settings.darkMode;

  return {
    backgroundColor: `hsl(${mild} / ${dark ? 0.1 : 0.06})`,
    borderLeftWidth: 3,
    borderLeftStyle: 'solid',
    borderLeftColor: `hsl(${mild} / ${dark ? 0.5 : 0.4})`,
  };
}

export function adminPerTabAppearanceProps(
  settings: Pick<Settings, 'colorScheme' | 'customAppearanceColors' | 'darkMode'>,
  tabId: string,
  enabled: boolean,
): { style?: CSSProperties } {
  if (!enabled) return {};
  const scheme = settings.colorScheme ?? 'sapphire';
  const primaryTriplet = adminTabMildAccentTriplet(tabId, scheme, !!settings.darkMode);
  const ringTriplet = complementTripletByIndex(adminTabPaletteIndex(tabId), scheme as NavColorScheme);
  const mildRing = (() => {
    const { h, s, l } = parseTriplet(ringTriplet);
    return formatTriplet(h, Math.min(48, Math.max(24, Math.round(s * 0.7))), l);
  })();

  return {
    style: {
      ['--primary' as string]: primaryTriplet,
      ['--chart-1' as string]: primaryTriplet,
      ['--chart-2' as string]: mildRing,
      ['--chart-3' as string]: primaryTriplet,
      ['--chart-4' as string]: mildRing,
      ['--chart-5' as string]: primaryTriplet,
      ['--ring' as string]: mildRing,
    },
  };
}
