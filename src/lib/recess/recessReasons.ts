import {
  DoorOpen,
  Footprints,
  GlassWater,
  HeartPulse,
  Building2,
  type LucideIcon,
} from 'lucide-react';
import type { RecessReason } from '@/lib/types';

export type RecessReasonMeta = {
  value: RecessReason;
  label: string;
  icon: LucideIcon;
  badge: string;
  /** One-line copy on the student kiosk category card. */
  kioskDescription: string;
};

/** All checkout reasons (staff Recess tab). */
export const RECESS_REASONS: RecessReasonMeta[] = [
  {
    value: 'bathroom',
    label: 'Bathroom',
    icon: DoorOpen,
    badge: 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-200',
    kioskDescription: 'Use the restroom, then check back in when you return.',
  },
  {
    value: 'break',
    label: 'Break',
    icon: Footprints,
    badge: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-200',
    kioskDescription: 'Quick stretch or calm-down break outside the room.',
  },
  {
    value: 'water',
    label: 'Water',
    icon: GlassWater,
    badge: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-200',
    kioskDescription: 'Fill up your bottle or take a short water break.',
  },
  {
    value: 'nurse',
    label: 'Nurse',
    icon: HeartPulse,
    badge: 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-200',
    kioskDescription: 'Heading to the nurse or health office.',
  },
  {
    value: 'office',
    label: 'Office',
    icon: Building2,
    badge: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
    kioskDescription: 'Sent to the front office or another room.',
  },
];

/** Self-service reasons on the student kiosk (no nurse/office without staff). */
export const KIOSK_RECESS_REASONS: RecessReasonMeta[] = RECESS_REASONS.filter((r) =>
  (['bathroom', 'break', 'water'] as RecessReason[]).includes(r.value),
);

export const RECESS_REASON_BY_VALUE = new Map(RECESS_REASONS.map((r) => [r.value, r]));

export function recessReasonBadgeClasses(reason: RecessReason): string {
  return RECESS_REASON_BY_VALUE.get(reason)?.badge ?? 'border-border bg-muted text-muted-foreground';
}
