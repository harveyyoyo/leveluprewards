import type { StudentTheme } from './types';
import { normalizeStudentTheme } from './themeContrast';

const rawDemoStudentThemes: StudentTheme[] = [
  // Sports — Baseball
  {
    background: '#0f172a',
    text: '#f1f5f9',
    primary: '#22d3ee',
    cardBackground: '#1e293b',
    accent: '#64748b',
    emoji: '⚾',
    fontScale: 1.05,
  },
  // Sports — Basketball
  {
    background: '#fff7ed',
    text: '#431407',
    primary: '#ea580c',
    cardBackground: '#ffedd5',
    accent: '#c2410c',
    emoji: '🏀',
  },
  // Sports — Soccer
  {
    background: '#ecfdf5',
    text: '#064e3b',
    primary: '#059669',
    cardBackground: '#d1fae5',
    accent: '#047857',
    emoji: '⚽',
  },
  // Sports — Tennis
  {
    background: '#faf5ff',
    text: '#3b0764',
    primary: '#9333ea',
    cardBackground: '#f3e8ff',
    accent: '#7e22ce',
    emoji: '🎾',
    fontTracking: 0.02,
  },
  // Sports — American football
  {
    background: '#fdf2f8',
    text: '#831843',
    primary: '#db2777',
    cardBackground: '#fce7f3',
    accent: '#be123c',
    emoji: '🏈',
  },
  // Sports — Hockey
  {
    background: '#18181b',
    text: '#fafafa',
    primary: '#a78bfa',
    cardBackground: '#27272a',
    accent: '#71717a',
    emoji: '🏒',
    fontWeight: 600,
  },
  // Sports — Racing
  {
    background: '#1e1b4b',
    text: '#eef2ff',
    primary: '#818cf8',
    cardBackground: '#312e81',
    accent: '#a5b4fc',
    emoji: '🏁',
    backgroundStyle: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #1e3a8a 100%)',
  },
  // Sports — Trophy / Champions
  {
    background: '#fefce8',
    text: '#422006',
    primary: '#ca8a04',
    cardBackground: '#fef9c3',
    accent: '#a16207',
    emoji: '🏆',
    fontStyle: 'italic',
  },
];

/** Contrast-normalized themes for the first demo students (School ABC order). */
export const DEMO_STUDENT_THEMES: StudentTheme[] = rawDemoStudentThemes
  .map((t) => normalizeStudentTheme(t))
  .filter((t): t is StudentTheme => !!t);

/** Yeshiva demo palette now matches the same sports themes. */
export const DEMO_STUDENT_THEMES_YESHIVA_ORDER: StudentTheme[] = DEMO_STUDENT_THEMES;
