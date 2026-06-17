import type { HistoryItem, StudentTheme } from '@/lib/types';
import { DEMO_STUDENT_THEMES } from '@/lib/demoStudentThemes';
import {
  SAMPLE_KIOSK_STUDENT_FIRST_NAME,
  SAMPLE_KIOSK_STUDENT_ID,
  SAMPLE_KIOSK_STUDENT_LAST_NAME,
} from '@/lib/sampleKioskDemo';

/** Balance high enough to show multiple eligible prizes on the kiosk (Eraser 25, Sticker 50, …). */
export const SAMPLE_KIOSK_STUDENT_POINTS = 75;

export const SAMPLE_KIOSK_STUDENT_CATEGORY_POINTS: Record<string, number> = {
  Demo: 10,
  'Good Behavior': 10,
  Leadership: 10,
  'Extra Curricular': 6,
  Attendance: 4,
  Creativity: 4,
  Academics: 2,
  'Helping Others': 2,
  'School Spirit': 2,
};

export const SAMPLE_KIOSK_STUDENT_CLASS_ID = 'sc1';

export const SAMPLE_KIOSK_STUDENT_THEME: StudentTheme =
  DEMO_STUDENT_THEMES[0] ?? {
    background: '#0f172a',
    text: '#f1f5f9',
    primary: '#22d3ee',
    cardBackground: '#1e293b',
    accent: '#64748b',
    emoji: '⚾',
    fontScale: 1.05,
  };

export function buildSampleKioskStudentDoc(updatedAt = Date.now()): Record<string, unknown> {
  const lifetimePoints = SAMPLE_KIOSK_STUDENT_POINTS;
  return {
    id: SAMPLE_KIOSK_STUDENT_ID,
    firstName: SAMPLE_KIOSK_STUDENT_FIRST_NAME,
    lastName: SAMPLE_KIOSK_STUDENT_LAST_NAME,
    nfcId: SAMPLE_KIOSK_STUDENT_ID,
    points: SAMPLE_KIOSK_STUDENT_POINTS,
    lifetimePoints,
    classId: SAMPLE_KIOSK_STUDENT_CLASS_ID,
    categoryPoints: { ...SAMPLE_KIOSK_STUDENT_CATEGORY_POINTS },
    categoryPointsByPeriod: {},
    earnedAchievements: [],
    earnedBadges: [],
    theme: SAMPLE_KIOSK_STUDENT_THEME,
    updatedAt,
  };
}

export function buildSampleKioskActivitySeeds(now = Date.now()): Array<HistoryItem & { id: string }> {
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  return [
    {
      id: 'demo-act-redeem-000',
      desc: 'Redeemed coupon: 000 (Demo)',
      amount: 10,
      date: now - 2 * hour,
    },
    {
      id: 'demo-act-good-behavior',
      desc: 'Points from Mrs. Jones: Good Behavior',
      amount: 10,
      date: now - 5 * hour,
    },
    {
      id: 'demo-act-leadership',
      desc: 'Points from Mr. Jackson: Leadership',
      amount: 10,
      date: now - day,
    },
    {
      id: 'demo-act-academics',
      desc: 'Points from Mr. Smith: Academics',
      amount: 5,
      date: now - day - 3 * hour,
    },
    {
      id: 'demo-act-spirit',
      desc: 'Points from Mr. Brown: School Spirit',
      amount: 5,
      date: now - 2 * day,
    },
    {
      id: 'demo-act-attendance',
      desc: 'Points from Mr. Wilson: Attendance',
      amount: 4,
      date: now - 3 * day,
    },
  ];
}
