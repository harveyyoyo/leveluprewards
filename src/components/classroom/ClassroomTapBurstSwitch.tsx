'use client';

import { motion } from 'framer-motion';
import type { ClassroomDesign } from '@/components/points/classroomVisualTheme';
import { classroomSidebarToolAppearance, classroomSidebarToolTint } from '@/lib/classroom/classroomTokenTheme';
import { cn } from '@/lib/utils';

const spring = { type: 'spring' as const, stiffness: 280, damping: 26 };

export type ClassroomAwardDeskMode = 'one-tap' | 'show-menu';

export function ClassroomTapBurstSwitch({
  mode,
  onChange,
  design = 'aurora',
}: {
  mode: ClassroomAwardDeskMode;
  onChange: (mode: ClassroomAwardDeskMode) => void;
  defaultPoints?: number;
  design?: ClassroomDesign;
}) {
  const active = classroomSidebarToolAppearance(design, 'instant');
  const tray = classroomSidebarToolTint(design, 'instant');
  const night = design === 'midnight';

  return (
    <div className="w-full space-y-1">
      <p
        className={cn(
          'px-0.5 text-[10px] font-semibold uppercase tracking-normal',
          night ? 'text-indigo-200' : 'text-slate-600',
        )}
      >
        Desk click action
      </p>
      <motion.div
        role="radiogroup"
        aria-label="Desk click action"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { ...spring, staggerChildren: 0.04 } },
        }}
        className="relative grid h-9 w-full grid-cols-2 gap-1 rounded-xl border border-black/10 p-1"
        style={{ backgroundColor: tray }}
      >
        <motion.span
          layoutId="classroom-award-mode-thumb"
          transition={spring}
          className="pointer-events-none absolute inset-y-1 w-[calc(50%-6px)] rounded-lg shadow-sm"
          style={{
            backgroundColor: active.style.backgroundColor,
            left: mode === 'one-tap' ? 4 : 'calc(50% + 2px)',
          }}
        />
        <motion.button
          type="button"
          role="radio"
          aria-checked={mode === 'one-tap'}
          title="Left click awards points. Right click opens the menu."
          variants={{ hidden: { opacity: 0, y: 4 }, visible: { opacity: 1, y: 0, transition: spring } }}
          className={cn(
            'relative z-[1] inline-flex items-center justify-center rounded-lg px-1.5 text-[11px] leading-tight tracking-normal',
            mode === 'one-tap'
              ? 'font-semibold text-white'
              : night
                ? 'font-medium text-indigo-950 hover:text-indigo-900'
                : 'font-medium text-slate-800 hover:text-slate-950',
          )}
          onClick={() => onChange('one-tap')}
        >
          Instant Award
        </motion.button>
        <motion.button
          type="button"
          role="radio"
          aria-checked={mode === 'show-menu'}
          title="Pick the award after you tap"
          variants={{ hidden: { opacity: 0, y: 4 }, visible: { opacity: 1, y: 0, transition: spring } }}
          className={cn(
            'relative z-[1] inline-flex items-center justify-center rounded-lg px-1.5 text-[11px] leading-tight tracking-normal',
            mode === 'show-menu'
              ? 'font-semibold text-white'
              : night
                ? 'font-medium text-indigo-950 hover:text-indigo-900'
                : 'font-medium text-slate-800 hover:text-slate-950',
          )}
          onClick={() => onChange('show-menu')}
        >
          Open Menu
        </motion.button>
      </motion.div>
      {mode === 'one-tap' ? (
        <p
          className={cn(
            'px-0.5 text-[10px] font-medium leading-snug tracking-normal',
            night ? 'text-indigo-200' : 'text-slate-600',
          )}
        >
          Right click opens the menu
        </p>
      ) : null}
    </div>
  );
}
