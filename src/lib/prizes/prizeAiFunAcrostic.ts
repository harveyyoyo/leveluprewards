import type { Student } from '@/lib/types';
import type { AiSurpriseBody } from '@/lib/prizes/prizeAiFunClientStorage';

/** Letters used for a name acrostic (ASCII A–Z, max 20). */
export function lettersForAcrosticName(raw: string): string {
  const stripped = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '');
  return stripped.toUpperCase().slice(0, 20);
}

/** Legal first name for spelling; falls back to nickname, then a neutral default. */
export function acrosticFirstNameFromStudent(student: Pick<Student, 'firstName' | 'nickname'>): string {
  const legal = (student.firstName || '').trim();
  if (legal) return legal;
  const nick = (student.nickname || '').trim();
  if (nick) return nick.split(/\s+/)[0] || nick;
  return 'Star';
}

const TRAIT_POOL: Record<string, string[]> = {
  A: ['Amazing', 'Adventurous', 'Artistic', 'Attentive', 'Authentic'],
  B: ['Brave', 'Bright', 'Brilliant', 'Balanced', 'Bold'],
  C: ['Creative', 'Curious', 'Caring', 'Confident', 'Calm'],
  D: ['Determined', 'Dependable', 'Diligent', 'Delightful', 'Dedicated'],
  E: ['Energetic', 'Encouraging', 'Empathetic', 'Excellent', 'Enthusiastic'],
  F: ['Friendly', 'Focused', 'Fair', 'Fun', 'Fearless'],
  G: ['Generous', 'Gentle', 'Genuine', 'Grateful', 'Growing'],
  H: ['Helpful', 'Honest', 'Hopeful', 'Hardworking', 'Happy'],
  I: ['Imaginative', 'Inspiring', 'Independent', 'Inclusive', 'Innovative'],
  J: ['Joyful', 'Just', 'Jolly', 'Judicious', 'Jubilant'],
  K: ['Kind', 'Keen', 'Knowledgeable', 'Kindhearted', 'Kinetic'],
  L: ['Loyal', 'Lively', 'Leader', 'Learner', 'Loving'],
  M: ['Motivated', 'Mindful', 'Marvelous', 'Mature', 'Merry'],
  N: ['Nice', 'Noble', 'Neat', 'Notable', 'Nurturing'],
  O: ['Optimistic', 'Open-minded', 'Outstanding', 'Observant', 'Organized'],
  P: ['Positive', 'Patient', 'Polite', 'Persistent', 'Playful'],
  Q: ['Quick thinker', 'Quiet strength', 'Quality helper', 'Quirky in a good way', 'Questing learner'],
  R: ['Respectful', 'Responsible', 'Reliable', 'Radiant', 'Resilient'],
  S: ['Supportive', 'Smart', 'Sincere', 'Strong', 'Studious'],
  T: ['Thoughtful', 'Trustworthy', 'Talented', 'Team player', 'Tenacious'],
  U: ['Understanding', 'Upbeat', 'Unique', 'Unstoppable', 'Uplifting'],
  V: ['Valuable', 'Versatile', 'Vibrant', 'Virtuous', 'Visionary'],
  W: ['Wise', 'Warm', 'Welcoming', 'Wonderful', 'Willing'],
  X: ['eXtra kind', 'eXcellent effort', 'eXcited to learn', 'eXtra helpful', 'eXtra creative'],
  Y: ['Youthful spirit', 'Yearning to learn', 'Yes to teamwork', 'Yielding kindness', 'Young leader'],
  Z: ['Zealous learner', 'Zestful', 'Zippy helper', 'Zany in a fun way', 'Zen calm'],
};

function traitForLetter(letter: string, usedTraits: Set<string>, seed: number): string {
  const pool = TRAIT_POOL[letter] ?? [`${letter} is for Awesome`];
  for (let i = 0; i < pool.length; i += 1) {
    const trait = pool[(seed + i) % pool.length];
    const key = trait.toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (!usedTraits.has(key)) {
      usedTraits.add(key);
      return trait;
    }
  }
  const fallback = `${letter}-star`;
  usedTraits.add(fallback);
  return fallback;
}

/** Offline-safe acrostic when the API is slow or unavailable. */
export function buildFallbackAcrostic(firstNameRaw: string, seed = Date.now()): AiSurpriseBody {
  const letters = lettersForAcrosticName(firstNameRaw);
  const usedTraits = new Set<string>();
  const lines = [...letters].map((letter, idx) => {
    const trait = traitForLetter(letter, usedTraits, seed + idx);
    return `${letter} — ${trait}`;
  });
  return {
    kind: 'acrostic',
    text: lines.length ? lines.join('\n') : 'S — Super student\nT — Terrific teammate\nA — Awesome attitude\nR — Ready to learn',
  };
}

/** Trait-word fingerprint so two students do not get the same compliment set. */
export function acrosticTraitFingerprint(text: string): string {
  const traits: string[] = [];
  for (const line of text.split(/\n+/)) {
    const m = /^\s*([A-Za-z])\s*[—–-]\s*(.+?)\s*$/.exec(line.trim());
    if (m?.[2]) {
      traits.push(m[2].toLowerCase().replace(/[^a-z0-9]+/g, ''));
    }
  }
  return traits.filter(Boolean).join('|').slice(0, 200);
}
