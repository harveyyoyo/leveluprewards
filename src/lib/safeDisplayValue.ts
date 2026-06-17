/** Literal tokens that legacy Firestore rows or bad template joins may surface in UI. */
const SYSTEM_DISPLAY_TOKENS = new Set(['undefined', 'null', 'nan']);

/**
 * Normalize unknown values to a display-safe string.
 * Returns `fallback` for nullish values, non-strings, whitespace-only text,
 * and legacy system tokens like "undefined".
 */
export function safeString(value: unknown, fallback = ''): string {
  if (value == null) return fallback;
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (SYSTEM_DISPLAY_TOKENS.has(trimmed.toLowerCase())) return fallback;
  return trimmed;
}

/** Trimmed safe string; alias for the common display-text path. */
export function safeTrimString(value: unknown, fallback = ''): string {
  return safeString(value, fallback);
}

/**
 * Join display parts without leaking undefined/null/system tokens.
 * Empty segments are dropped before joining.
 */
export function joinDisplayParts(parts: unknown[], separator = ' '): string {
  return parts
    .map((part) => safeString(part))
    .filter(Boolean)
    .join(separator);
}

/**
 * Parse a finite number from legacy Firestore values.
 * Returns `fallback` when the value is missing or not numeric.
 */
export function safeNumber(value: unknown, fallback?: number): number | undefined {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.trim())
        : NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

/** Like `safeNumber`, but always returns a concrete number for math/formatting. */
export function safeNumberOr(value: unknown, fallback: number): number {
  return safeNumber(value, fallback) ?? fallback;
}

/** Optional finite number for nullable numeric fields (grades, amounts, etc.). */
export function safeFiniteNumber(value: unknown): number | undefined {
  return safeNumber(value);
}
