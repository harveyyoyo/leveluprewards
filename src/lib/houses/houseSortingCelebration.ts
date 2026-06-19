import type { ClassroomCelebrationEffect } from '@/lib/classroomSeatingChart';
import type { ClassroomEffect } from '@/components/points/classroomVisualTheme';

export const HOUSE_SORTING_CELEBRATION_OPTIONS: ClassroomCelebrationEffect[] = [
  'confetti',
  'fireworks',
  'sparkles',
  'stars',
  'hearts',
  'snow',
  'flash',
  'none',
];

export const HOUSE_SORTING_CELEBRATION_LABELS: Record<ClassroomCelebrationEffect, string> = {
  flash: 'Flash',
  none: 'None',
  sparkles: 'Sparkles',
  confetti: 'Confetti',
  hearts: 'Hearts',
  stars: 'Stars',
  fireworks: 'Fireworks',
  snow: 'Snow',
};

export const DEFAULT_HOUSE_SORTING_CELEBRATION_EFFECT: ClassroomCelebrationEffect = 'confetti';

export function resolveHouseSortingCelebrationEffect(
  effect: ClassroomCelebrationEffect | undefined,
): ClassroomCelebrationEffect {
  if (effect && HOUSE_SORTING_CELEBRATION_OPTIONS.includes(effect)) return effect;
  return DEFAULT_HOUSE_SORTING_CELEBRATION_EFFECT;
}

export function resolveHouseSortingCelebrationParts(celebration: ClassroomCelebrationEffect): {
  showFlash: boolean;
  particleEffect: ClassroomEffect | null;
} {
  if (celebration === 'none') {
    return { showFlash: false, particleEffect: null };
  }
  if (celebration === 'flash') {
    return { showFlash: true, particleEffect: null };
  }
  return { showFlash: true, particleEffect: celebration };
}
