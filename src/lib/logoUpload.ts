export const LOGO_UPLOAD_ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
] as const;

export type LogoUploadMimeType = (typeof LOGO_UPLOAD_ALLOWED_TYPES)[number];

export const LOGO_UPLOAD_ACCEPT =
  'image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,.svg';

export const LOGO_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

/** Some browsers omit MIME type for `.svg`; fall back to the file extension. */
export function resolveLogoContentType(file: File | Blob, fileName?: string): string {
  const type = (file.type || '').trim().toLowerCase();
  if (LOGO_UPLOAD_ALLOWED_TYPES.includes(type as LogoUploadMimeType)) return type;
  const name = fileName ?? (file instanceof File ? file.name : '');
  if (name.toLowerCase().endsWith('.svg')) return 'image/svg+xml';
  return type;
}

export function isAllowedLogoFile(file: File): boolean {
  return LOGO_UPLOAD_ALLOWED_TYPES.includes(
    resolveLogoContentType(file, file.name) as LogoUploadMimeType,
  );
}

export function isSvgLogoFile(file: File | Blob, fileName?: string): boolean {
  return resolveLogoContentType(file, fileName) === 'image/svg+xml';
}
