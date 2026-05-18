/**
 * Derives age-appropriate guidance for the prize AI Fun endpoint (joke / riddle / fortune / name acrostic).
 * Birthday is the primary signal; when unknown, prompts use a conservative mixed-age baseline.
 */

/** ISO YYYY-MM-DD → whole years at `ref`, or undefined if missing/invalid/out of range (3–22). */
export function studentAgeYearsFromBirthday(
  birthday: string | null | undefined,
  ref = new Date(),
): number | undefined {
  if (!birthday || typeof birthday !== 'string') return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthday.trim());
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d) || mo < 1 || mo > 12 || d < 1 || d > 31) {
    return undefined;
  }
  const birth = new Date(y, mo - 1, d);
  if (Number.isNaN(birth.getTime())) return undefined;
  let age = ref.getFullYear() - birth.getFullYear();
  const md = ref.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && ref.getDate() < birth.getDate())) age -= 1;
  if (age < 3 || age > 22) return undefined;
  return age;
}

/** Buckets for client-side stock / recent lists (one bucket per developmental band). */
export function prizeAiFunAgeBandKey(ageYears: number | undefined): string {
  if (ageYears == null || !Number.isFinite(ageYears)) return '0';
  const a = Math.floor(ageYears);
  if (a < 3 || a > 22) return '0';
  if (a <= 7) return '1';
  if (a <= 10) return '2';
  if (a <= 13) return '3';
  return '4';
}

export function clampStudentAgeYearsForAiRequest(raw: unknown): number | undefined {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return undefined;
  const n = Math.floor(raw);
  if (n < 3 || n > 22) return undefined;
  return n;
}

/** Injected into the model system prompt after global safety rules. */
export function prizeAiFunAudiencePromptBlock(ageYears: number | undefined): string {
  if (ageYears == null) {
    return `Audience: School reward kiosk; exact age unknown—aim for upper elementary (about ages 8–11): clear, friendly wording, no assumptions about pop culture or life experience beyond school.`;
  }
  if (ageYears <= 7) {
    return `Audience: This student is about ${ageYears} years old (early elementary). Use very simple everyday words, very short sentences, concrete school-friendly ideas (classroom, friends, learning, animals, nature). No riddles that require abstract lateral thinking beyond this level. Humor should be gentle and obvious.`;
  }
  if (ageYears <= 10) {
    return `Audience: This student is about ${ageYears} years old (upper elementary). Friendly vocabulary; jokes and riddles should be fair, kind, and solvable without obscure facts. Light wordplay is OK if still classroom-clear.`;
  }
  if (ageYears <= 13) {
    return `Audience: This student is about ${ageYears} years old (middle school). You may use a bit more cleverness and structure in jokes/riddles; keep topics inclusive and never exclusive, sarcastic toward peers, or “inside joke” toward adults.`;
  }
  return `Audience: This student is about ${ageYears} years old (high school). Slightly wittier tone is OK; still keep everything strictly appropriate for a public school classroom: no romantic, political, religious, violent, scary, or exclusionary humor; no slang that demeans anyone.`;
}
