import type { CSSProperties } from 'react';
import type { ColorScheme, Settings } from '@/components/providers/SettingsProvider';
import { complementTripletByIndex, rainbowTripletByIndex, type NavColorScheme } from '@/lib/rainbowNav';

/** Stable ordering so each admin tab maps to a palette slot in the active theme. */
const ADMIN_TAB_ORDER = [
  'students',
  'classes',
  'teachers',
  'prizes',
  'categories',
  'reports',
  'roster',
  'coupons',
  'redemptions',
  'insights',
  'attendance',
  'halloffame',
  'bulletinboard',
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
  'backups',
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

/** Per-tab colors on section triggers (visible before the tab is selected). */
export function adminTabTriggerStyle(
  tabId: string,
  settings: Pick<Settings, 'colorScheme' | 'darkMode'>,
  isActive: boolean,
): CSSProperties {
  const triplet = adminTabAccentTriplet(tabId, settings.colorScheme ?? 'default');
  const mild = adminTabMildAccentTriplet(tabId, settings.colorScheme ?? 'default', !!settings.darkMode);
  const dark = !!settings.darkMode;

  if (isActive) {
    return {
      ['--primary' as string]: triplet,
      ['--primary-foreground' as string]: dark ? '0 0% 98%' : '0 0% 100%',
    };
  }

  return {
    backgroundColor: `hsl(${mild} / ${dark ? 0.22 : 0.14})`,
    borderColor: `hsl(${mild} / ${dark ? 0.42 : 0.32})`,
    color: `hsl(${mild})`,
    borderWidth: 1,
    borderStyle: 'solid',
  };
}

export function adminPerTabAppearanceProps(
  settings: Pick<Settings, 'colorScheme' | 'customAppearanceColors' | 'darkMode'>,
  tabId: string,
  enabled: boolean,
): { style?: CSSProperties } {
  if (!enabled) return {};
  const scheme = settings.colorScheme ?? 'default';
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
