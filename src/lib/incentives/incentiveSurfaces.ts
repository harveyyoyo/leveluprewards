import type { Settings } from '@/components/providers/SettingsProvider';

export type IncentiveListItem = {
  id: string;
  title: string;
  description?: string;
  points?: number;
  icon?: string;
  active?: boolean;
  createdAt?: number;
};

export const INCENTIVE_SURFACE_KEYS = [
  'bulletinBoard',
  'smartScreen',
  'studentKiosk',
  'studentPortal',
] as const;

export type IncentiveSurfaceKey = (typeof INCENTIVE_SURFACE_KEYS)[number];

export type IncentiveSurfaceSettings = Pick<
  Settings,
  | 'incentivesShowOnBulletinBoard'
  | 'incentivesShowOnSmartScreen'
  | 'incentivesShowOnStudentKiosk'
  | 'incentivesShowOnStudentPortal'
>;

export const INCENTIVE_SURFACE_META: Record<
  IncentiveSurfaceKey,
  { label: string; description: string }
> = {
  bulletinBoard: {
    label: 'Bulletin board display',
    description: 'Fullscreen hallway board for opportunities and celebrations.',
  },
  smartScreen: {
    label: 'Smart Screen',
    description:
      'Bulletin module on the live hallway dashboard (module must also be enabled under Displays → Smart Screen).',
  },
  studentKiosk: {
    label: 'Student kiosk',
    description: 'Card on the rewards kiosk after a student signs in.',
  },
  studentPortal: {
    label: 'Student home portal',
    description: 'Opportunities card on the at-home student dashboard.',
  },
};

export function settingsKeyForIncentiveSurface(
  surface: IncentiveSurfaceKey,
): keyof IncentiveSurfaceSettings {
  const map: Record<IncentiveSurfaceKey, keyof IncentiveSurfaceSettings> = {
    bulletinBoard: 'incentivesShowOnBulletinBoard',
    smartScreen: 'incentivesShowOnSmartScreen',
    studentKiosk: 'incentivesShowOnStudentKiosk',
    studentPortal: 'incentivesShowOnStudentPortal',
  };
  return map[surface];
}

/** Default-on for hallway displays; opt-in for student-facing surfaces. */
export function incentivesVisibleOnSurface(
  settings: IncentiveSurfaceSettings | null | undefined,
  surface: IncentiveSurfaceKey,
): boolean {
  switch (surface) {
    case 'bulletinBoard':
      return settings?.incentivesShowOnBulletinBoard !== false;
    case 'smartScreen':
      return settings?.incentivesShowOnSmartScreen !== false;
    case 'studentKiosk':
      return settings?.incentivesShowOnStudentKiosk === true;
    case 'studentPortal':
      return settings?.incentivesShowOnStudentPortal === true;
    default:
      return false;
  }
}

export function activeIncentivesList(
  incentives: IncentiveListItem[] | null | undefined,
): IncentiveListItem[] {
  if (!incentives?.length) return [];
  return [...incentives]
    .filter((item) => item.active !== false)
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}
