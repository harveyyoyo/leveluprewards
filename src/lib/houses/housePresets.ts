import type { House } from '@/lib/types';

export type HousePresetThemeId = 'quick' | 'classic' | 'yeshiva' | 'sports' | 'elements';

type HouseSeed = Omit<House, 'id' | 'points' | 'lifetimePoints'>;

export type HousePresetTheme = {
  id: HousePresetThemeId;
  label: string;
  description: string;
  houses: HouseSeed[];
};

/** Starter packs for Admin → Houses (not affiliated with any external house program). */
export const HOUSE_PRESET_THEMES: HousePresetTheme[] = [
  {
    id: 'quick',
    label: 'Quick demo',
    description: 'Four houses for a fast tryout or small school.',
    houses: [
      {
        name: 'Phoenix',
        value: 'Excellence',
        color: '#DC2626',
        emoji: '🔥',
        motto: 'Rise and shine.',
        presetKey: 'quick:phoenix',
        sortOrder: 0,
      },
      {
        name: 'Tide',
        value: 'Teamwork',
        color: '#2563EB',
        emoji: '🌊',
        motto: 'Stronger together.',
        presetKey: 'quick:tide',
        sortOrder: 1,
      },
      {
        name: 'Summit',
        value: 'Perseverance',
        color: '#16A34A',
        emoji: '⛰️',
        motto: 'Climb every mountain.',
        presetKey: 'quick:summit',
        sortOrder: 2,
      },
      {
        name: 'Nova',
        value: 'Innovation',
        color: '#7C3AED',
        emoji: '💫',
        motto: 'Bright ideas win.',
        presetKey: 'quick:nova',
        sortOrder: 3,
      },
    ],
  },
  {
    id: 'classic',
    label: 'Classic virtues',
    description: 'Eight houses built around character strengths.',
    houses: [
      {
        name: 'Ember',
        value: 'Courage',
        color: '#DC2626',
        emoji: '🔥',
        motto: 'Brave hearts lead the way.',
        presetKey: 'classic:ember',
        sortOrder: 0,
      },
      {
        name: 'Harbor',
        value: 'Support',
        color: '#2563EB',
        emoji: '⚓',
        motto: 'We lift each other up.',
        presetKey: 'classic:harbor',
        sortOrder: 1,
      },
      {
        name: 'Crest',
        value: 'Integrity',
        color: '#7C3AED',
        emoji: '🛡️',
        motto: 'Do what is right.',
        presetKey: 'classic:crest',
        sortOrder: 2,
      },
      {
        name: 'Grove',
        value: 'Growth',
        color: '#16A34A',
        emoji: '🌿',
        motto: 'Grow a little every day.',
        presetKey: 'classic:grove',
        sortOrder: 3,
      },
      {
        name: 'Beacon',
        value: 'Leadership',
        color: '#CA8A04',
        emoji: '🏮',
        motto: 'Light the path for others.',
        presetKey: 'classic:beacon',
        sortOrder: 4,
      },
      {
        name: 'Summit',
        value: 'Perseverance',
        color: '#475569',
        emoji: '⛰️',
        motto: 'Keep climbing.',
        presetKey: 'classic:summit',
        sortOrder: 5,
      },
      {
        name: 'Horizon',
        value: 'Hope',
        color: '#0EA5E9',
        emoji: '🌅',
        motto: 'Tomorrow can be brighter.',
        presetKey: 'classic:horizon',
        sortOrder: 6,
      },
      {
        name: 'Anchor',
        value: 'Stability',
        color: '#1E3A8A',
        emoji: '⚓',
        motto: 'Steady and strong.',
        presetKey: 'classic:anchor',
        sortOrder: 7,
      },
    ],
  },
  {
    id: 'yeshiva',
    label: 'Yeshiva middot',
    description: 'Six houses rooted in Torah values (Hebrew middot).',
    houses: [
      {
        name: 'Torah',
        value: 'Learning',
        color: '#1E3A8A',
        emoji: '📖',
        motto: 'Grow in Torah.',
        presetKey: 'yeshiva:torah',
        sortOrder: 0,
      },
      {
        name: 'Chesed',
        value: 'Kindness',
        color: '#BE185D',
        emoji: '💗',
        motto: 'Acts of loving-kindness.',
        presetKey: 'yeshiva:chesed',
        sortOrder: 1,
      },
      {
        name: 'Kavod',
        value: 'Honor',
        color: '#CA8A04',
        emoji: '🕯️',
        motto: 'Honor people and place.',
        presetKey: 'yeshiva:kavod',
        sortOrder: 2,
      },
      {
        name: 'Emet',
        value: 'Truth',
        color: '#475569',
        emoji: '⚖️',
        motto: 'Speak and live with truth.',
        presetKey: 'yeshiva:emet',
        sortOrder: 3,
      },
      {
        name: 'Achdus',
        value: 'Unity',
        color: '#0F766E',
        emoji: '🤝',
        motto: 'One school, one heart.',
        presetKey: 'yeshiva:achdus',
        sortOrder: 4,
      },
      {
        name: 'Ruach',
        value: 'Spirit',
        color: '#7C3AED',
        emoji: '✨',
        motto: 'Joy in avodas Hashem.',
        presetKey: 'yeshiva:ruach',
        sortOrder: 5,
      },
    ],
  },
  {
    id: 'sports',
    label: 'Sports teams',
    description: 'Four rivalry-style houses for athletics and pep rallies.',
    houses: [
      {
        name: 'Lions',
        value: 'Pride',
        color: '#CA8A04',
        emoji: '🦁',
        motto: 'Hear us roar.',
        presetKey: 'sports:lions',
        sortOrder: 0,
      },
      {
        name: 'Eagles',
        value: 'Focus',
        color: '#1D4ED8',
        emoji: '🦅',
        motto: 'Soar together.',
        presetKey: 'sports:eagles',
        sortOrder: 1,
      },
      {
        name: 'Bears',
        value: 'Strength',
        color: '#78350F',
        emoji: '🐻',
        motto: 'Stand your ground.',
        presetKey: 'sports:bears',
        sortOrder: 2,
      },
      {
        name: 'Wolves',
        value: 'Pack',
        color: '#475569',
        emoji: '🐺',
        motto: 'Run as one pack.',
        presetKey: 'sports:wolves',
        sortOrder: 3,
      },
    ],
  },
  {
    id: 'elements',
    label: 'Four elements',
    description: 'Fire, water, earth, and air—works well for STEM or fantasy themes.',
    houses: [
      {
        name: 'Emberforge',
        value: 'Fire',
        color: '#DC2626',
        emoji: '🔥',
        motto: 'Passion fuels progress.',
        presetKey: 'elements:fire',
        sortOrder: 0,
      },
      {
        name: 'Tidewell',
        value: 'Water',
        color: '#0284C7',
        emoji: '💧',
        motto: 'Flow around obstacles.',
        presetKey: 'elements:water',
        sortOrder: 1,
      },
      {
        name: 'Stonegate',
        value: 'Earth',
        color: '#15803D',
        emoji: '🌲',
        motto: 'Roots run deep.',
        presetKey: 'elements:earth',
        sortOrder: 2,
      },
      {
        name: 'Skyreach',
        value: 'Air',
        color: '#7C3AED',
        emoji: '🌬️',
        motto: 'Reach higher.',
        presetKey: 'elements:air',
        sortOrder: 3,
      },
    ],
  },
];

export function getHousePresetTheme(id: HousePresetThemeId): HousePresetTheme {
  const theme = HOUSE_PRESET_THEMES.find((t) => t.id === id);
  if (!theme) throw new Error(`Unknown house preset theme: ${id}`);
  return theme;
}

/** Collect preset keys from a house doc (current + legacy fields). */
export function housePresetKeysFromDoc(house: House): string[] {
  const keys: string[] = [];
  if (house.presetKey) keys.push(house.presetKey);
  if (house.rcaPresetKey) keys.push(`legacy-rca:${house.rcaPresetKey}`);
  if (house.samplePresetKey) keys.push(`legacy-sample:${house.samplePresetKey}`);
  return keys;
}
