import type { SoundEffect } from '@/hooks/useArcadeSound';

/** Pleasant classroom chimes by award size (not kiosk success/redeem). */
export function classroomPointSoundEffect(points: number, isDeduct: boolean): SoundEffect {
  const magnitude = Math.abs(points);
  if (isDeduct) return 'classroom_deduct';
  if (magnitude >= 15) return 'classroom_big_award';
  if (magnitude >= 5) return 'classroom_award';
  return 'classroom_tap';
}

export const CLASSROOM_TAP_SOUND: SoundEffect = 'classroom_tap';
export const CLASSROOM_PICK_SOUND: SoundEffect = 'classroom_award';
export const CLASSROOM_UNDO_SOUND: SoundEffect = 'classroom_deduct';
