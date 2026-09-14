/**
 * Library Genre Classification, Color Coding, Barcode Numbering, and Shelf Placement.
 *
 * Provides standard genres with WCAG-compliant colors, Dewey call ranges,
 * structured barcode generators (e.g. FIC-823-0001), and physical shelf routing.
 */

export interface LibraryGenreConfig {
  id: string;
  label: string;
  color: string; // Hex color (e.g. #2563EB)
  callPrefix: string; // 3-letter abbreviation (e.g. FIC, SCI, HIS)
  dewey: string; // Dewey base code (e.g. 823, 500, 900)
  defaultShelf: string; // Furniture-only place name (e.g. "Aisle 1")
  description?: string;
  badgeClass?: string; // Optional custom styling
}

export type BarcodeNumberScheme =
  | 'genre_code' // e.g. FIC-823-0001 (Recommended for school libraries)
  | 'dewey_numeric' // e.g. 823-0001
  | 'prefix_genre' // e.g. LIB-FIC-0001
  | 'classic_random'; // e.g. LIB1A2B3C4D

export const DEFAULT_LIBRARY_GENRES: LibraryGenreConfig[] = [
  {
    id: 'fiction',
    label: 'Fiction & Literature',
    color: '#2563EB',
    callPrefix: 'FIC',
    dewey: '823',
    defaultShelf: 'Aisle 1',
    description: 'Novels, chapter books, short stories, and literature.',
  },
  {
    id: 'science',
    label: 'Science & Technology',
    color: '#059669',
    callPrefix: 'SCI',
    dewey: '500',
    defaultShelf: 'Aisle 2',
    description: 'Biology, astronomy, physics, nature, coding, and inventions.',
  },
  {
    id: 'history',
    label: 'History & Social Studies',
    color: '#D97706',
    callPrefix: 'HIS',
    dewey: '900',
    defaultShelf: 'Aisle 3',
    description: 'Ancient worlds, world wars, civilizations, and geography.',
  },
  {
    id: 'mystery',
    label: 'Mystery & Thriller',
    color: '#6366F1',
    callPrefix: 'MYS',
    dewey: '813',
    defaultShelf: 'Aisle 1',
    description: 'Detective stories, puzzles, mysteries, and thrillers.',
  },
  {
    id: 'fantasy_scifi',
    label: 'Fantasy & Sci-Fi',
    color: '#9333EA',
    callPrefix: 'FAN',
    dewey: '823',
    defaultShelf: 'Aisle 1',
    description: 'Magical realms, space exploration, and futuristic adventures.',
  },
  {
    id: 'biography',
    label: 'Biography & Memoir',
    color: '#0D9488',
    callPrefix: 'BIO',
    dewey: '920',
    defaultShelf: 'North Wall',
    description: 'Life stories of leaders, scientists, artists, and heroes.',
  },
  {
    id: 'graphic_novel',
    label: 'Graphic Novels & Comics',
    color: '#EA580C',
    callPrefix: 'GRA',
    dewey: '741',
    defaultShelf: 'Front Spinner',
    description: 'Illustrated narratives, comics, and manga.',
  },
  {
    id: 'arts_music',
    label: 'Arts, Music & Creativity',
    color: '#E11D48',
    callPrefix: 'ART',
    dewey: '700',
    defaultShelf: 'Aisle 3',
    description: 'Visual arts, music, architecture, sports, and hobbies.',
  },
  {
    id: 'early_reader',
    label: 'Early Readers & Picture Books',
    color: '#CA8A04',
    callPrefix: 'PIC',
    dewey: '100',
    defaultShelf: 'Low Bins',
    description: 'Picture books, beginner readers, and alphabet/counting.',
  },
  {
    id: 'reference',
    label: 'Reference & Dictionaries',
    color: '#475569',
    callPrefix: 'REF',
    dewey: '030',
    defaultShelf: 'Reference Desk',
    description: 'Encyclopedias, atlases, dictionaries, and research guides.',
  },
  {
    id: 'hebrew_judaica',
    label: 'Hebrew & Judaica',
    color: '#0284C7',
    callPrefix: 'HEB',
    dewey: '296',
    defaultShelf: 'Aisle 3',
    description: 'Hebrew literature, Jewish history, holidays, and ethics.',
  },
  {
    id: 'general',
    label: 'General & Stacks',
    color: '#64748B',
    callPrefix: 'GEN',
    dewey: '000',
    defaultShelf: 'Main Stacks',
    description: 'General collections, uncategorized titles, and periodicals.',
  },
];

/** Furniture only — no book topics in the name. */
export const DEFAULT_LIBRARY_PLACEMENT_ZONES: string[] = [
  'Aisle 1',
  'Aisle 2',
  'Aisle 3',
  'North Wall',
  'Front Spinner',
  'Low Bins',
  'Reference Desk',
  'Main Stacks',
];

/** Older place names that mixed a topic into the furniture. */
export const LEGACY_SHELF_TO_FURNITURE: Record<string, string> = {
  'Aisle 1 - Fiction Bays A-M': 'Aisle 1',
  'Aisle 1B - Fantasy & Adventure': 'Aisle 1',
  'Fantasy & Adventure Bay (Aisle 1B)': 'Aisle 1',
  'Aisle 2 - Science & Nature Stacks': 'Aisle 2',
  'Aisle 3 - World History & Geography': 'Aisle 3',
  'Graphic Novel Spinner Towers': 'Front Spinner',
  'Front Display Carousel': 'Front Spinner',
  'Biography Wall (North Bay)': 'North Wall',
  'Early Reader Low Bins': 'Low Bins',
  'Early Reader Low Bins (Carpet Area)': 'Low Bins',
  'Reference Desk & Study Island': 'Reference Desk',
  'Judaica & Heritage Stacks': 'Aisle 3',
  'Mystery & Whodunit Nook': 'Aisle 1',
  'Fine Arts & Creativity Bay': 'Aisle 3',
  'Return Drop Box (Sorting Cart)': 'Main Stacks',
};

export function furnitureNameForShelf(name: string): string {
  const trimmed = name.trim();
  if (LEGACY_SHELF_TO_FURNITURE[trimmed]) return LEGACY_SHELF_TO_FURNITURE[trimmed];
  if (trimmed.includes(' - ')) return trimmed.split(' - ')[0]!.trim();
  return trimmed;
}

export function placementLooksLegacy(zones: string[] | null | undefined): boolean {
  return Boolean(
    zones?.some((zone) => zone in LEGACY_SHELF_TO_FURNITURE || zone.includes(' - ')),
  );
}

export function genresLookLegacy(genres: LibraryGenreConfig[] | null | undefined): boolean {
  return Boolean(
    genres?.some(
      (genre) => genre.defaultShelf in LEGACY_SHELF_TO_FURNITURE || genre.defaultShelf.includes(' - '),
    ),
  );
}

/** Turn old topic-in-the-name places into furniture-only names. */
export function migrateFurnitureOnlySetup(
  zones: string[] | null | undefined,
  genres: LibraryGenreConfig[] | null | undefined,
): { zones: string[]; genres: LibraryGenreConfig[] } {
  const mappedZones = (zones?.length ? zones : DEFAULT_LIBRARY_PLACEMENT_ZONES).map(furnitureNameForShelf);
  const nextZones = [...new Set(mappedZones.filter(Boolean))];
  const sourceGenres = genres?.length ? genres : DEFAULT_LIBRARY_GENRES;
  return {
    zones: nextZones.length > 0 ? nextZones : [...DEFAULT_LIBRARY_PLACEMENT_ZONES],
    genres: sourceGenres.map((genre) => ({
      ...genre,
      defaultShelf: furnitureNameForShelf(genre.defaultShelf),
    })),
  };
}

export interface ResolvedGenreClassification {
  genre: LibraryGenreConfig;
  isCustom: boolean;
  color: string;
  badgeStyle: {
    backgroundColor: string;
    color: string;
    borderColor: string;
  };
  shelfLocation: string;
}

/**
 * Get full active genres list merging school settings overrides with defaults.
 */
export function getActiveLibraryGenres(customGenres?: LibraryGenreConfig[] | null): LibraryGenreConfig[] {
  if (Array.isArray(customGenres) && customGenres.length > 0) {
    return customGenres;
  }
  return DEFAULT_LIBRARY_GENRES;
}

/**
 * Normalize text for fuzzy category matching.
 */
function normalizeCategoryKey(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Resolve a category/genre name to its full classification metadata.
 */
export function resolveBookClassification(
  categoryRaw?: string | null,
  customGenres?: LibraryGenreConfig[] | null,
  fallbackShelf?: string | null,
): ResolvedGenreClassification {
  const genres = getActiveLibraryGenres(customGenres);
  const raw = (categoryRaw ?? '').trim();

  let matched: LibraryGenreConfig | undefined;

  if (raw) {
    const key = normalizeCategoryKey(raw);
    matched = genres.find((g) => {
      const gKey = normalizeCategoryKey(g.label);
      const gId = normalizeCategoryKey(g.id);
      const gPrefix = normalizeCategoryKey(g.callPrefix);
      return gKey === key || gId === key || gPrefix === key || gKey.includes(key) || key.includes(gKey);
    });
  }

  // Fallback to General
  const genre = matched ?? genres.find((g) => g.id === 'general') ?? genres[0] ?? DEFAULT_LIBRARY_GENRES[0];
  const isCustom = !DEFAULT_LIBRARY_GENRES.some((d) => d.id === genre.id);

  // Derive accessible pastel background and high-contrast border
  const baseColor = genre.color || '#64748B';
  const badgeStyle = {
    backgroundColor: `${baseColor}18`, // 10% opacity tint
    color: baseColor,
    borderColor: `${baseColor}55`, // 33% opacity border
  };

  const shelfLocation = fallbackShelf?.trim() || genre.defaultShelf || 'Main Stacks';

  return {
    genre,
    isCustom,
    color: baseColor,
    badgeStyle,
    shelfLocation,
  };
}

/**
 * Generate a genre-relevant barcode based on the school's configured numbering scheme.
 */
export function generateGenreBarcode(options: {
  category?: string | null;
  existingUpcs?: string[] | Set<string>;
  scheme?: BarcodeNumberScheme;
  customGenres?: LibraryGenreConfig[] | null;
  sequenceNumber?: number;
}): string {
  const { category, existingUpcs, scheme = 'genre_code', customGenres, sequenceNumber } = options;
  const classification = resolveBookClassification(category, customGenres);
  const g = classification.genre;

  const upcSet = existingUpcs instanceof Set ? existingUpcs : new Set(existingUpcs ?? []);

  // Format 1: 'genre_code' -> FIC-823-0001
  // Format 2: 'dewey_numeric' -> 823-0001
  // Format 3: 'prefix_genre' -> LIB-FIC-0001
  // Format 4: 'classic_random' -> LIB1A2B3C4D

  if (scheme === 'classic_random') {
    let candidate = '';
    let attempts = 0;
    do {
      attempts++;
      const rand = Math.floor(10000000 + Math.random() * 90000000).toString(16).toUpperCase().padStart(8, '0');
      candidate = `LIB${rand}`;
    } while (upcSet.has(candidate) && attempts < 100);
    return candidate;
  }

  let prefix = '';
  if (scheme === 'genre_code') {
    prefix = `${g.callPrefix}-${g.dewey}`;
  } else if (scheme === 'dewey_numeric') {
    prefix = `${g.dewey}`;
  } else {
    // prefix_genre
    prefix = `LIB-${g.callPrefix}`;
  }

  // Find next available sequence number
  let seq = sequenceNumber && sequenceNumber > 0 ? sequenceNumber : 1;

  // Search existing barcodes matching this prefix to find highest sequence
  if (!sequenceNumber) {
    let maxFound = 0;
    const regex = new RegExp(`^${prefix}-(\\d+)$`, 'i');
    for (const code of upcSet) {
      const m = code.match(regex);
      if (m && m[1]) {
        const num = parseInt(m[1], 10);
        if (!isNaN(num) && num > maxFound) {
          maxFound = num;
        }
      }
    }
    seq = maxFound + 1;
  }

  let candidate = '';
  let attempts = 0;
  do {
    const padded = String(seq).padStart(4, '0');
    candidate = `${prefix}-${padded}`;
    seq++;
    attempts++;
  } while (upcSet.has(candidate) && attempts < 1000);

  return candidate;
}

/**
 * Extract genre prefix or relevance from a barcode string if available.
 */
export function extractGenreFromBarcode(
  upc: string,
  customGenres?: LibraryGenreConfig[] | null,
): LibraryGenreConfig | null {
  const genres = getActiveLibraryGenres(customGenres);
  const clean = upc.trim().toUpperCase();

  for (const g of genres) {
    if (
      clean.startsWith(`${g.callPrefix}-`) ||
      clean.startsWith(`LIB-${g.callPrefix}-`) ||
      clean.startsWith(`${g.dewey}-`)
    ) {
      return g;
    }
  }
  return null;
}
