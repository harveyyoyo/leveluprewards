/** Default wording on the library home “doors” screen. Empty strings are filled in at render time. */
export const DEFAULT_LIBRARY_HUB_COPY = {
  headerProduct: 'Library',
  /** Blank means show the school name. */
  eyebrow: '',
  welcomeLead: 'Welcome to',
  welcomeHighlight: 'the Library',
  intro: 'Choose a place to begin. We’ll take good care of the rest.',
  footer: 'Quiet voices, happy readers',
  enterLabel: 'Come in',
  deskTitle: 'Librarian',
  deskTagline: 'Answers at the desk',
  deskDescription:
    'Look up a title or a student, see who has a book, and send them to borrow or return when they are ready.',
  deskBadge: 'Help desk',
  catalogTitle: 'Catalog',
  catalogTagline: 'Your collection',
  catalogDescription: 'Browse the collection, print labels, and keep every copy in its place.',
  catalogBadge: 'On the shelves',
  catalogCopiesLabel: 'copies',
  kioskTitle: 'Student Station',
  kioskTagline: 'Borrow and return',
  kioskDescription: 'Students scan their own card to borrow and return — quietly and independently.',
  kioskBadge: 'Self-checkout',
} as const;

export type LibraryHubCopyField = keyof typeof DEFAULT_LIBRARY_HUB_COPY;
export type LibraryHubCopy = { [K in LibraryHubCopyField]: string };

export const LIBRARY_HUB_COPY_KEYS = Object.keys(DEFAULT_LIBRARY_HUB_COPY) as LibraryHubCopyField[];

export function sanitizeLibraryHubCopy(value: unknown): Partial<LibraryHubCopy> | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const next: Partial<LibraryHubCopy> = {};
  const raw = value as Record<string, unknown>;
  for (const key of LIBRARY_HUB_COPY_KEYS) {
    if (typeof raw[key] === 'string') next[key] = raw[key];
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

export function resolveLibraryHubCopy(stored?: Partial<LibraryHubCopy> | null): LibraryHubCopy {
  const out = { ...DEFAULT_LIBRARY_HUB_COPY } as LibraryHubCopy;
  if (!stored) return out;
  for (const key of LIBRARY_HUB_COPY_KEYS) {
    const value = stored[key];
    if (typeof value === 'string' && value.trim()) out[key] = value.trim();
  }
  return out;
}

export function patchLibraryHubCopy(
  stored: Partial<LibraryHubCopy> | null | undefined,
  field: LibraryHubCopyField,
  value: string,
): Partial<LibraryHubCopy> {
  const next = { ...(stored ?? {}) };
  const trimmed = value.trim();
  if (!trimmed || trimmed === DEFAULT_LIBRARY_HUB_COPY[field]) {
    delete next[field];
  } else {
    next[field] = value;
  }
  return next;
}
