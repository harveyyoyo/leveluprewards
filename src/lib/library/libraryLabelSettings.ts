import { LIBRARY_LABEL_OPTIONS, type LibraryLabelFormat } from '@/lib/library/libraryScanCode';

export const LIBRARY_LABEL_FIELD_IDS = [
  'schoolName',
  'title',
  'author',
  'barcode',
  'barcodeText',
  'shelf',
  'genre',
  'copyNumber',
  'synopsis',
  'dueGrid',
] as const;

export type LibraryLabelFieldId = (typeof LIBRARY_LABEL_FIELD_IDS)[number];

export const DEFAULT_LIBRARY_LABEL_FIELDS: Record<LibraryLabelFieldId, boolean> = {
  schoolName: true,
  title: true,
  author: true,
  barcode: true,
  barcodeText: true,
  shelf: true,
  genre: true,
  copyNumber: true,
  synopsis: true,
  dueGrid: true,
};

export const LIBRARY_LABEL_FIELD_COPY: Record<LibraryLabelFieldId, { label: string; hint: string }> = {
  schoolName: { label: 'School name', hint: 'The school name on the sticker.' },
  title: { label: 'Book title', hint: 'The name of the book.' },
  author: { label: 'Author', hint: 'Who wrote the book.' },
  barcode: { label: 'Barcode picture', hint: 'The scan lines or square code.' },
  barcodeText: { label: 'Barcode number', hint: 'The number under the barcode.' },
  shelf: { label: 'Shelf location', hint: 'Where the book lives.' },
  genre: { label: 'Genre color and call number', hint: 'The color band and short genre code.' },
  copyNumber: { label: 'Copy number', hint: 'Copy 1, Copy 2, and so on.' },
  synopsis: { label: 'Short description', hint: 'Only on the large inside bookplate.' },
  dueGrid: { label: 'Date-due grid', hint: 'Only on the pocket slip.' },
};

export function resolveLibraryLabelFields(
  saved?: Partial<Record<LibraryLabelFieldId, boolean>> | null,
): Record<LibraryLabelFieldId, boolean> {
  return {
    ...DEFAULT_LIBRARY_LABEL_FIELDS,
    ...(saved ?? {}),
  };
}

export function libraryLabelShows(
  fields: Partial<Record<LibraryLabelFieldId, boolean>> | undefined,
  id: LibraryLabelFieldId,
): boolean {
  if (!fields || fields[id] == null) return true;
  return fields[id] !== false;
}

export function enabledLibraryLabelFormats(saved?: LibraryLabelFormat[] | null): LibraryLabelFormat[] {
  const known = new Set(LIBRARY_LABEL_OPTIONS.map((option) => option.id));
  const picked = (saved ?? []).filter((id): id is LibraryLabelFormat => known.has(id));
  if (!picked.length) return LIBRARY_LABEL_OPTIONS.map((option) => option.id);
  return LIBRARY_LABEL_OPTIONS.map((option) => option.id).filter((id) => picked.includes(id));
}

export function enabledLibraryLabelOptions(saved?: LibraryLabelFormat[] | null) {
  const enabled = new Set(enabledLibraryLabelFormats(saved));
  return LIBRARY_LABEL_OPTIONS.filter((option) => enabled.has(option.id));
}

export function resolveDefaultLibraryLabelFormat(
  preferred: LibraryLabelFormat | undefined,
  enabled?: LibraryLabelFormat[] | null,
): LibraryLabelFormat {
  const list = enabledLibraryLabelFormats(enabled);
  if (preferred && list.includes(preferred)) return preferred;
  return list[0];
}
