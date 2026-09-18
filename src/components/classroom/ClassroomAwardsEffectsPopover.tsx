'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { ClassroomCelebrationEffect, ClassroomSeatingPrefs } from '@/lib/classroomSeatingChart';

const spring = { type: 'spring' as const, stiffness: 280, damping: 26 };

const CELEBRATION_LABELS: Record<ClassroomCelebrationEffect, string> = {
  flash: 'Flash',
  none: 'None',
  sparkles: 'Sparkles',
  confetti: 'Confetti',
  hearts: 'Hearts',
  stars: 'Stars',
  fireworks: 'Fireworks',
  snow: 'Snow',
};

const FLY_UP_SIZES = ['off', 'small', 'medium', 'large'] as const;

export function ClassroomAwardsEffectsPopover({
  prefs,
  onChange,
  triggerClassName,
  iconOnly = false,
}: {
  prefs: ClassroomSeatingPrefs;
  onChange: (patch: Partial<ClassroomSeatingPrefs>) => void;
  triggerClassName?: string;
  iconOnly?: boolean;
}) {
  const flyUpValue = !prefs.showKioskFlyUp ? 'off' : prefs.kioskFlyUpSize;

  return (
    <Popover modal>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={triggerClassName}
          aria-label="Awards & effects"
          title="Default points, tap awards, fly-up, and celebration"
        >
          <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
          {iconOnly ? null : <span className="hidden sm:inline">Awards</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={12}
        className="classroom-light-ink z-[500] w-[22rem] rounded-2xl border-2 border-[#102033] bg-white p-0 text-[#102033]"
      >
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { ...spring, staggerChildren: 0.06 } },
          }}
          className="max-h-[min(70vh,32rem)] space-y-4 overflow-y-auto p-3"
        >
          <motion.div variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: spring } }}>
            <p className="text-xs font-black uppercase tracking-wide text-[#102033]">Awards & effects</p>
            <p className="mt-0.5 text-[11px] font-semibold leading-snug text-[#334155]">
              How tapping a desk gives points, and what pops up on screen.
            </p>
          </motion.div>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: spring } }}
            className="space-y-2 border-t border-[#102033]/15 pt-3"
          >
            <p className="text-xs font-black uppercase tracking-wide text-[#102033]">Default points</p>
            <Input
              type="number"
              min={1}
              aria-label="Default points"
              className="h-9 rounded-lg border-2 border-[#102033] bg-white font-black text-[#102033]"
              value={prefs.defaultPoints}
              onChange={(e) =>
                onChange({ defaultPoints: Math.max(1, Number(e.target.value) || prefs.defaultPoints) })
              }
            />
          </motion.div>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: spring } }}
            className="space-y-2 border-t border-[#102033]/15 pt-3"
          >
            <p className="text-xs font-black uppercase tracking-wide text-[#102033]">Tap awards</p>
            <RadioGroup
              value={prefs.instantTap ? 'quick' : 'menu'}
              onValueChange={(v) => {
                if (v === 'quick' || v === 'menu') onChange({ instantTap: v === 'quick' });
              }}
              className="gap-2"
            >
              <label className="flex cursor-pointer items-start gap-2">
                <RadioGroupItem value="quick" className="mt-0.5" aria-label="One tap awards points" />
                <span className="text-xs leading-snug text-[#102033]">
                  <span className="font-black">One tap</span> — award default points with a left click.
                  Right-click opens the menu.
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2">
                <RadioGroupItem value="menu" className="mt-0.5" aria-label="Show awards menu" />
                <span className="text-xs leading-snug text-[#102033]">
                  <span className="font-black">Show menu</span> — pick the award after you tap.
                </span>
              </label>
            </RadioGroup>
          </motion.div>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: spring } }}
            className="space-y-2 border-t border-[#102033]/15 pt-3"
          >
            <p className="text-xs font-black uppercase tracking-wide text-[#102033]">Fly-up</p>
            <RadioGroup
              value={flyUpValue}
              onValueChange={(v) => {
                if (v === 'off') {
                  onChange({ showKioskFlyUp: false });
                  return;
                }
                onChange({
                  showKioskFlyUp: true,
                  kioskFlyUpSize: v as ClassroomSeatingPrefs['kioskFlyUpSize'],
                });
              }}
              className="gap-1"
            >
              {FLY_UP_SIZES.map((size) => (
                <label key={size} className="flex cursor-pointer items-center gap-2">
                  <RadioGroupItem
                    value={size}
                    aria-label={size === 'off' ? 'Fly-up off' : `${size} fly-up`}
                  />
                  <span className="text-xs font-bold capitalize text-[#102033]">
                    {size === 'off' ? 'Off' : size}
                  </span>
                </label>
              ))}
            </RadioGroup>
          </motion.div>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: spring } }}
            className="space-y-2 border-t border-[#102033]/15 pt-3"
          >
            <p className="text-xs font-black uppercase tracking-wide text-[#102033]">Celebration</p>
            <RadioGroup
              value={prefs.celebrationEffect}
              onValueChange={(v) => onChange({ celebrationEffect: v as ClassroomCelebrationEffect })}
              className="grid grid-cols-2 gap-1"
            >
              {(Object.keys(CELEBRATION_LABELS) as ClassroomCelebrationEffect[]).map((key) => (
                <label key={key} className="flex cursor-pointer items-center gap-2">
                  <RadioGroupItem value={key} aria-label={CELEBRATION_LABELS[key]} />
                  <span className="text-xs font-bold text-[#102033]">{CELEBRATION_LABELS[key]}</span>
                </label>
              ))}
            </RadioGroup>
          </motion.div>
        </motion.div>
      </PopoverContent>
    </Popover>
  );
}
