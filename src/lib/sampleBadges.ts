import type { Achievement, Badge } from '@/lib/types';

/** Ready-made bonus point milestones for one-click setup. */
export const SAMPLE_BADGES: Omit<Achievement, 'id'>[] = [
  {
    name: 'Early Bird',
    description: 'Earn your first 50 points.',
    icon: 'Sun',
    criteria: { type: 'points', threshold: 50 },
    bonusPoints: 5,
    tier: 'bronze',
    accentColor: '#b45309',
  },
  {
    name: 'Century',
    description: 'Reach 100 points.',
    icon: 'Target',
    criteria: { type: 'points', threshold: 100 },
    bonusPoints: 10,
    tier: 'silver',
    accentColor: '#64748b',
  },
  {
    name: 'Rising Star',
    description: 'Reach 250 points.',
    icon: 'Star',
    criteria: { type: 'points', threshold: 250 },
    bonusPoints: 15,
    tier: 'gold',
    accentColor: '#eab308',
  },
  {
    name: 'Half Grand',
    description: 'Earn 500 total lifetime points.',
    icon: 'TrendingUp',
    criteria: { type: 'lifetimePoints', threshold: 500 },
    bonusPoints: 25,
    tier: 'gold',
    accentColor: '#ca8a04',
  },
  {
    name: 'Star Student',
    description: 'Earn 1,000 total lifetime points.',
    icon: 'Trophy',
    criteria: { type: 'lifetimePoints', threshold: 1000 },
    bonusPoints: 50,
    tier: 'platinum',
    accentColor: '#06b6d4',
  },
  {
    name: 'Champion',
    description: 'Reach 500 current points.',
    icon: 'Award',
    criteria: { type: 'points', threshold: 500 },
    bonusPoints: 20,
    tier: 'platinum',
    accentColor: '#8b5cf6',
  },
];

/** Sample category-based badges for one-click setup. Pass the category id to use (e.g. first category). */
export function getSampleCategoryBadges(categoryId: string): Omit<Badge, 'id'>[] {
  return [
    {
      name: 'Monthly Star',
      description: 'Earn 25 points in this category this month.',
      icon: 'Star',
      categoryId,
      pointsRequired: 25,
      period: 'month',
      tier: 'bronze',
      accentColor: '#b45309',
      enabled: true,
    },
    {
      name: 'Monthly Champion',
      description: 'Earn 50 points in this category this month.',
      icon: 'Award',
      categoryId,
      pointsRequired: 50,
      period: 'month',
      tier: 'silver',
      accentColor: '#64748b',
      enabled: true,
    },
    {
      name: 'Semester Standout',
      description: 'Earn 100 points in this category this semester.',
      icon: 'Trophy',
      categoryId,
      pointsRequired: 100,
      period: 'semester',
      tier: 'gold',
      accentColor: '#eab308',
      enabled: true,
    },
    {
      name: 'Yearly Excellence',
      description: 'Earn 250 points in this category this school year.',
      icon: 'Medal',
      categoryId,
      pointsRequired: 250,
      period: 'year',
      tier: 'platinum',
      accentColor: '#06b6d4',
      enabled: true,
    },
  ];
}
