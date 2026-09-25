'use client';

import { useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { Shuffle, Users, X } from 'lucide-react';
import {
  CLASSROOM_GROUP_COUNT_MAX,
  CLASSROOM_GROUP_COUNT_MIN,
  type ClassroomGroupAssignment,
} from '@/lib/classroom/classroomGroups';
import { classroomTokenAccent } from '@/lib/classroom/classroomTokenTheme';
import { cn } from '@/lib/utils';

const spring = { type: 'spring' as const, stiffness: 280, damping: 26 };

const GROUP_COUNTS = Array.from(
  { length: CLASSROOM_GROUP_COUNT_MAX - CLASSROOM_GROUP_COUNT_MIN + 1 },
  (_, i) => CLASSROOM_GROUP_COUNT_MIN + i,
);

export function ClassroomGroupsTool({
  triggerClassName,
  triggerStyle,
  groups,
  onAssign,
  onClear,
}: {
  triggerClassName: string;
  triggerStyle?: CSSProperties;
  groups?: ClassroomGroupAssignment;
  onAssign: (count: number) => void;
  onClear: () => void;
}) {
  const [count, setCount] = useState(groups?.count ?? 4);
  const teal = classroomTokenAccent(5);
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { ...spring, staggerChildren: 0.05 } },
      }}
      className="space-y-1"
    >
      <motion.div
        variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0, transition: spring } }}
        style={triggerStyle}
        className={cn(
          triggerClassName,
          'flex w-full flex-col items-stretch gap-1.5 px-2 py-1.5 hover:translate-y-0',
        )}
      >
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1 text-left text-xs font-semibold tracking-normal">
            {count} groups
          </span>
        </div>
        <div
          id="classroom-group-count"
          role="radiogroup"
          aria-label="Number of groups"
          className="grid w-full grid-cols-5 gap-1"
        >
          {GROUP_COUNTS.map((value) => {
            const selected = count === value;
            return (
              <motion.button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`${value} groups`}
                variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0, transition: spring } }}
                className={cn(
                  'inline-flex h-8 items-center justify-center rounded-xl border text-xs font-semibold text-white shadow-sm shadow-black/15 transition-all hover:-translate-y-0.5 hover:shadow-md',
                  selected ? 'ring-2 ring-white/70' : 'opacity-80 hover:opacity-100',
                )}
                style={{
                  // `teal.fill` is too light for the fixed white label (~2.2:1) —
                  // use `teal.border` for both states and rely on opacity/ring
                  // (below) for the selected/unselected distinction instead.
                  backgroundColor: teal.border,
                  borderColor: teal.ring,
                }}
                onClick={() => setCount(value)}
              >
                {value}
              </motion.button>
            );
          })}
        </div>
      </motion.div>
      <motion.button
        type="button"
        variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0, transition: spring } }}
        style={triggerStyle}
        className={cn(triggerClassName, 'inline-flex w-full items-center justify-start gap-2')}
        onClick={() => onAssign(count)}
      >
        <Shuffle className="h-4 w-4 shrink-0 text-white" aria-hidden />
        <span>{groups ? 'Shuffle groups' : 'Split into groups'}</span>
      </motion.button>
      {groups ? (
        <motion.button
          type="button"
          variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0, transition: spring } }}
          style={triggerStyle}
          className={cn(triggerClassName, 'inline-flex w-full items-center justify-start gap-2')}
          onClick={onClear}
        >
          <X className="h-4 w-4 shrink-0 text-white" aria-hidden />
          <span>Clear groups</span>
        </motion.button>
      ) : null}
    </motion.div>
  );
}
