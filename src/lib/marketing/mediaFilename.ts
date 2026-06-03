/** Slugify a human label into a safe marketing screenshot / clip filename. */

export function mediaFilenameFromLabel(label: string, currentFilename: string): string {
  const trimmed = label.trim();
  if (!trimmed) return currentFilename;

  const extMatch = currentFilename.match(/(\.[^.]+)$/);
  const ext = extMatch?.[1] ?? '.png';
  const slug = trimmed
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!slug) return currentFilename;
  return `${slug}${ext}`;
}

export function isValidMediaFilename(name: string): boolean {
  return /^[a-z0-9][a-z0-9.-]*\.(png|mp4)$/i.test(name);
}
