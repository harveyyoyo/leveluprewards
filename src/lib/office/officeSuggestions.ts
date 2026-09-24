/**
 * Answers already used at the school for a typed-in field (like "Language at home"), most used
 * first, so a box can suggest them as you type. Case and extra spaces don't make a new answer.
 */
export function officeUsedValues<T>(
  records: T[],
  pick: (record: T) => string | null | undefined,
  max = 30,
  /** Everyday answers to offer after the school's own, e.g. common languages. */
  starters: readonly string[] = [],
): string[] {
  const counts = new Map<string, { value: string; count: number }>();
  for (const record of records) {
    const value = pick(record)?.trim().replace(/\s+/g, ' ');
    if (!value) continue;
    const key = value.toLowerCase();
    const seen = counts.get(key);
    if (seen) seen.count += 1;
    else counts.set(key, { value, count: 1 });
  }
  const used = [...counts.values()]
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    .map((v) => v.value);
  const extra = starters.filter((v) => !counts.has(v.toLowerCase()));
  return [...used, ...extra].slice(0, max);
}

export const OFFICE_GENDER_STARTERS = ['Female', 'Male'] as const;

export const OFFICE_LANGUAGE_STARTERS = [
  'English',
  'Spanish',
  'Chinese',
  'Arabic',
  'French',
  'Hebrew',
  'Russian',
  'Portuguese',
  'Vietnamese',
  'Korean',
  'Haitian Creole',
  'Yiddish',
] as const;
