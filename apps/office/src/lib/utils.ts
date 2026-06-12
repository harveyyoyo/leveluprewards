import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { LEVELUP_BRAND_PRIMARY_HEX } from "@/lib/appBranding"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getStudentNickname(student: { firstName: string; nickname?: string; lastName?: string }) {
  if (!student) return '';
  return student.nickname && student.nickname.trim() !== '' ? student.nickname : student.firstName;
}

/** Label for staff portal welcome greeting — keeps titles and surnames intact. */
export function staffGreetingName(displayName: string): string {
  return displayName.trim();
}

/** How student names appear on shared displays (Hall of Fame, etc.). */
export type PrivacyStudentNameDisplayMode = 'full' | 'preferred_only';

/**
 * Name for leaderboards / shared displays. `preferred_only` avoids showing legal surnames
 * (nickname or first name only). Staff roster views should keep using full legal names.
 */
export function displayStudentNameOnSharedBoard(
  student: { firstName: string; lastName?: string; nickname?: string },
  mode: PrivacyStudentNameDisplayMode,
): string {
  const preferred = getStudentNickname(student).trim() || student.firstName?.trim() || 'Student';
  if (mode === 'preferred_only') return preferred;
  const last = (student.lastName || '').trim();
  return last ? `${preferred} ${last}` : preferred;
}

export function getContrastColor(hexColor: string): 'black' | 'white' {
  if (!hexColor || hexColor === 'transparent') return 'black';
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? 'black' : 'white';
}

export const CATEGORY_COLOR_PALETTE = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  LEVELUP_BRAND_PRIMARY_HEX,
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899',
  '#f43f5e',
];

function normalizeHexColor(c: string) {
  return c.trim().toLowerCase();
}

/**
 * Picks the next palette color not currently in use. If all are used, cycles
 * through the palette (duplicates unavoidable past the palette size).
 */
export function pickDistinctCategoryColor(usedColors: Array<string | undefined | null> = []): string {
  const used = new Set(
    usedColors
      .filter(Boolean)
      .map((c) => normalizeHexColor(String(c)))
  );
  const available = CATEGORY_COLOR_PALETTE.filter((c) => !used.has(normalizeHexColor(c)));
  if (available.length > 0) return available[0];
  return CATEGORY_COLOR_PALETTE[used.size % CATEGORY_COLOR_PALETTE.length];
}

export function getRandomColor(): string {
  return CATEGORY_COLOR_PALETTE[Math.floor(Math.random() * CATEGORY_COLOR_PALETTE.length)];
}
