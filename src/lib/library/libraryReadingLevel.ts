/**
 * Turns the free-text reading level on a book (Lexile, Accelerated Reader,
 * Fountas & Pinnell, or a plain grade) into a rough, comparable number so
 * books can be sorted and grouped from easiest to hardest.
 *
 * Schools use different reading-level scales that don't convert onto each
 * other exactly (a Lexile score and an AR number measure different things).
 * This is only precise enough to answer "which of these two books is easier",
 * not to state a book's exact grade equivalent.
 */

/** Which reading-level scale a school wants the automatic lookup to prefer reporting. */
export type LibraryReadingLevelSystem = 'auto' | 'lexile' | 'ar' | 'grade' | 'fountas_pinnell';

export const READING_LEVEL_SYSTEM_LABELS: Record<LibraryReadingLevelSystem, string> = {
  auto: 'Any (use whatever a source gives)',
  lexile: 'Lexile',
  ar: 'Accelerated Reader (AR)',
  grade: 'Grade level',
  fountas_pinnell: 'Fountas & Pinnell (Guided Reading)',
};

const KNOWN_READING_LEVEL_SYSTEMS = new Set<LibraryReadingLevelSystem>(Object.keys(READING_LEVEL_SYSTEM_LABELS) as LibraryReadingLevelSystem[]);

/** Parses an untrusted value (query param, saved setting) into a known reading-level system, defaulting to 'auto'. */
export function resolveReadingLevelSystemParam(value: unknown): LibraryReadingLevelSystem {
  return typeof value === 'string' && KNOWN_READING_LEVEL_SYSTEMS.has(value as LibraryReadingLevelSystem)
    ? (value as LibraryReadingLevelSystem)
    : 'auto';
}

export interface ReadingLevelBand {
  id: string;
  label: string;
  shortLabel: string;
  color: string;
  /** Inclusive lower bound of the approximate grade-equivalent scale used below. */
  minGrade: number;
}

export const READING_LEVEL_BANDS: ReadingLevelBand[] = [
  { id: 'emergent', label: 'Emergent Readers (Pre-K–K)', shortLabel: 'Pre-K–K', color: '#CA8A04', minGrade: -1 },
  { id: 'early', label: 'Early Readers (Grades 1–2)', shortLabel: 'Grades 1–2', color: '#059669', minGrade: 1 },
  { id: 'developing', label: 'Developing Readers (Grades 3–4)', shortLabel: 'Grades 3–4', color: '#2563EB', minGrade: 3 },
  { id: 'fluent', label: 'Fluent Readers (Grades 5–6)', shortLabel: 'Grades 5–6', color: '#9333EA', minGrade: 5 },
  { id: 'middle_grade', label: 'Middle Grade Readers (Grades 7–8)', shortLabel: 'Grades 7–8', color: '#D97706', minGrade: 7 },
  { id: 'advanced', label: 'Advanced Readers (Grade 9+)', shortLabel: 'Grade 9+', color: '#DC2626', minGrade: 9 },
];

/** Shown for books with no reading level saved yet. Not part of the ordered bands above. */
export const UNRATED_READING_LEVEL_BAND: ReadingLevelBand = {
  id: 'unrated',
  label: 'Not Leveled Yet',
  shortLabel: 'Unrated',
  color: '#64748B',
  minGrade: Number.NaN,
};

/** Fountas & Pinnell guided-reading letter -> approximate grade-equivalent number. */
const FOUNTAS_PINNELL_GRADE: Record<string, number> = {
  A: 0, B: 0, C: 0.2, D: 0.4, E: 0.6, F: 0.8, G: 1, H: 1.2, I: 1.4, J: 1.6, K: 1.8, L: 2, M: 2.2, N: 2.4,
  O: 2.6, P: 2.8, Q: 3, R: 3.3, S: 3.6, T: 4, U: 4.3, V: 4.6, W: 5, X: 5.5, Y: 6, Z: 7,
};

/**
 * Best-effort parse of a free-text reading level into an approximate
 * grade-equivalent number for sorting/banding. Returns null when nothing
 * recognizable is found (an empty field, or text with no known format).
 */
export function parseReadingLevelGradeEquivalent(raw?: string | null): number | null {
  const text = (raw ?? '').trim();
  if (!text) return null;

  // Lexile, e.g. "650L", "Lexile 650L", "GN450L", "BR100L".
  const lexileMatch = text.match(/(-?\d+)\s*L\b/i);
  if (lexileMatch) {
    const lexile = Number(lexileMatch[1]);
    if (Number.isFinite(lexile)) return Math.max(0, lexile / 133 - 0.3);
  }

  // Fountas & Pinnell / Guided Reading letter, e.g. "F&P M", "Level M", "Guided Reading Level M".
  // Strip the scale's own name first so its letters ("F&P", "Guided Reading") aren't mistaken
  // for the level letter itself.
  const fpMarker = /fountas\s*(?:and|&)\s*pinnell|f\s*&\s*p\b|f\/p\b|guided reading(?:\s+level)?/i;
  if (fpMarker.test(text)) {
    const stripped = text.replace(new RegExp(fpMarker, 'gi'), '');
    const letterMatch = stripped.match(/\b([A-Za-z])\b/);
    const grade = letterMatch ? FOUNTAS_PINNELL_GRADE[letterMatch[1].toUpperCase()] : undefined;
    if (grade != null) return grade;
  }

  // Accelerated Reader / ATOS, e.g. "AR 4.2", "ATOS: 4.2".
  const arMatch = text.match(/\b(?:AR|ATOS)\s*[:#]?\s*(\d+(?:\.\d+)?)/i);
  if (arMatch) {
    const grade = Number(arMatch[1]);
    if (Number.isFinite(grade)) return grade;
  }

  // Grade range, e.g. "Grade 3-5", "Grades K-1".
  const gradeRangeMatch = text.match(/grades?\s*(k|\d+)\s*(?:-|to|–)\s*(k|\d+)/i);
  if (gradeRangeMatch) {
    const toNum = (v: string) => (v.toLowerCase() === 'k' ? 0 : Number(v));
    const lo = toNum(gradeRangeMatch[1]);
    const hi = toNum(gradeRangeMatch[2]);
    if (Number.isFinite(lo) && Number.isFinite(hi)) return (lo + hi) / 2;
  }

  // Single grade, e.g. "Grade 3", "3rd Grade", "Grade K".
  const singleGradeMatch = text.match(/\bgrades?\s*(k|\d+)\b/i) || text.match(/\b(k|\d+)(?:st|nd|rd|th)\s*grade\b/i);
  if (singleGradeMatch) {
    const v = singleGradeMatch[1].toLowerCase();
    return v === 'k' ? 0 : Number(v);
  }

  // A bare number with no other marker, e.g. "4.2" — treat as a grade-equivalent number.
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);

  return null;
}

/** Which shelf band a book's reading level falls into, for grouping/shelving. */
export function resolveReadingLevelBand(raw?: string | null): { band: ReadingLevelBand; value: number | null } {
  const value = parseReadingLevelGradeEquivalent(raw);
  if (value == null) return { band: UNRATED_READING_LEVEL_BAND, value: null };
  let matched = READING_LEVEL_BANDS[0];
  for (const band of READING_LEVEL_BANDS) {
    if (value >= band.minGrade) matched = band;
  }
  return { band: matched, value };
}

/** Comparator for sorting easiest-to-hardest; books with no level saved sort last. */
export function compareReadingLevel(a?: string | null, b?: string | null): number {
  const va = parseReadingLevelGradeEquivalent(a);
  const vb = parseReadingLevelGradeEquivalent(b);
  if (va == null && vb == null) return 0;
  if (va == null) return 1;
  if (vb == null) return -1;
  return va - vb;
}
