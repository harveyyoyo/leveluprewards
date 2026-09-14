/** Saved wallpaper for the library home, desk, catalog, and student station. */

export const LIBRARY_BACKGROUND_IMAGE_MAX_URL = 2000;
export const LIBRARY_BACKGROUND_DIM_MIN = 30;
export const LIBRARY_BACKGROUND_DIM_MAX = 80;
export const LIBRARY_BACKGROUND_DIM_DEFAULT = 58;
export const LIBRARY_BACKGROUND_MAX_BYTES = 8 * 1024 * 1024;
/** Calm sample shelves — used for a one-tap preview when no photo is uploaded yet. */
export const SAMPLE_LIBRARY_BACKGROUND_IMAGE_URL =
  'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1920&q=80';

export const LIBRARY_BACKGROUND_ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;

export function sanitizeLibraryBackgroundImageUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const url = value.trim();
  if (!url || url.length > LIBRARY_BACKGROUND_IMAGE_MAX_URL) return undefined;
  if (!/^https:\/\//i.test(url)) return undefined;
  return url;
}

export function clampLibraryBackgroundDim(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return LIBRARY_BACKGROUND_DIM_DEFAULT;
  return Math.min(
    LIBRARY_BACKGROUND_DIM_MAX,
    Math.max(LIBRARY_BACKGROUND_DIM_MIN, Math.round(value)),
  );
}

export function validateLibraryBackgroundFile(file: Pick<File, 'type' | 'size'>): string | null {
  const type = (file.type || '').trim().toLowerCase();
  if (!LIBRARY_BACKGROUND_ALLOWED_TYPES.includes(type as (typeof LIBRARY_BACKGROUND_ALLOWED_TYPES)[number])) {
    return 'Please use a JPEG, PNG, or WebP picture.';
  }
  if (file.size > LIBRARY_BACKGROUND_MAX_BYTES) {
    return 'That picture is too big. Please pick one under 8 MB.';
  }
  return null;
}
