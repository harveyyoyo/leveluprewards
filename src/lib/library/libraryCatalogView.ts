export const LIBRARY_COVER_SIZES = ['small', 'medium', 'large'] as const;
export type LibraryCoverSize = (typeof LIBRARY_COVER_SIZES)[number];

export const LIBRARY_COVER_SIZE_STORAGE_KEY = 'library.catalogCoverSize.v2';

export function parseLibraryCoverSize(value: string | null | undefined): LibraryCoverSize {
  if (value === 'small' || value === 'lots' || value === 'more') return 'small';
  if (value === 'medium') return 'medium';
  if (value === 'large' || value === 'big' || value === 'bigger') return 'large';
  return 'small';
}

export function libraryTitleGridClass(size: LibraryCoverSize): string {
  if (size === 'large') return 'grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3';
  if (size === 'small') return 'grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8';
  return 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
}

export function libraryPileGridClass(size: LibraryCoverSize): string {
  if (size === 'large') return 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4';
  if (size === 'small') return 'grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8';
  return 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6';
}

export function libraryCatalogPageSize(viewMode: 'list' | 'grid', size: LibraryCoverSize): number {
  if (viewMode === 'list') return 36;
  if (size === 'large') return 18;
  if (size === 'small') return 60;
  return 36;
}

export const LIBRARY_COVER_SIZE_LABELS: Record<LibraryCoverSize, { label: string; title: string }> = {
  small: { label: 'Small', title: 'Small covers' },
  medium: { label: 'Medium', title: 'Medium covers' },
  large: { label: 'Large', title: 'Large covers' },
};
