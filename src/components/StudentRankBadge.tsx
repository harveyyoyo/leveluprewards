'use client';

import { motion } from 'framer-motion';
import { Crown, Gem, Medal, Shield, Sparkles, Star, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StudentRank =
  | 'Bronze'
  | 'Silver'
  | 'Gold'
  | 'Platinum'
  | 'Diamond'
  | 'Master';

export interface StudentRankBadgeProps {
  /** Current rank tier. Defaults to "Gold" for mock data. */
  rank?: StudentRank;
  /** Optional points value to display under the rank. */
  points?: number;
  /** Optional subtitle (e.g. student name). */
  subtitle?: string;
  className?: string;
}

type RankStyle = {
  label: StudentRank;
  /** Tailwind gradient classes for the badge face. */
  gradient: string;
  /** Tailwind classes for the glowing ring color. */
  glow: string;
  /** Text color used on the badge face. */
  text: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const RANK_STYLES: Record<StudentRank, RankStyle> = {
  Bronze: {
    label: 'Bronze',
    gradient: 'from-amber-700 via-orange-600 to-amber-800',
    glow: 'shadow-[0_0_25px_rgba(217,119,6,0.65)] ring-amber-500/60',
    text: 'text-amber-50',
    Icon: Medal,
  },
  Silver: {
    label: 'Silver',
    gradient: 'from-slate-300 via-slate-100 to-slate-400',
    glow: 'shadow-[0_0_28px_rgba(203,213,225,0.7)] ring-slate-200/70',
    text: 'text-slate-800',
    Icon: Shield,
  },
  Gold: {
    label: 'Gold',
    gradient: 'from-yellow-300 via-amber-400 to-yellow-600',
    glow: 'shadow-[0_0_32px_rgba(250,204,21,0.8)] ring-yellow-300/80',
    text: 'text-amber-950',
    Icon: Trophy,
  },
  Platinum: {
    label: 'Platinum',
    gradient: 'from-cyan-100 via-slate-200 to-indigo-200',
    glow: 'shadow-[0_0_32px_rgba(165,243,252,0.85)] ring-cyan-200/80',
    text: 'text-slate-800',
    Icon: Star,
  },
  Diamond: {
    label: 'Diamond',
    gradient: 'from-cyan-300 via-sky-400 to-indigo-500',
    glow: 'shadow-[0_0_38px_rgba(56,189,248,0.85)] ring-cyan-300/80',
    text: 'text-white',
    Icon: Gem,
  },
  Master: {
    label: 'Master',
    gradient: 'from-fuchsia-500 via-purple-600 to-indigo-700',
    glow: 'shadow-[0_0_42px_rgba(217,70,239,0.85)] ring-fuchsia-400/80',
    text: 'text-white',
    Icon: Crown,
  },
};

export function StudentRankBadge({
  rank = 'Gold',
  points = 1280,
  subtitle = 'Mock Student',
  className,
}: StudentRankBadgeProps) {
  const style = RANK_STYLES[rank];
  const { Icon } = style;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 18 }}
      whileHover={{ scale: 1.04 }}
      className={cn('relative inline-flex select-none', className)}
    >
      {/* Animated glow ring */}
      <motion.div
        aria-hidden
        className={cn(
          'absolute inset-0 rounded-2xl blur-xl opacity-70 bg-gradient-to-br',
          style.gradient,
        )}
        animate={{ opacity: [0.45, 0.85, 0.45] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Badge face */}
      <div
        className={cn(
          'relative flex items-center gap-4 rounded-2xl px-5 py-4 ring-2 backdrop-blur-sm',
          'bg-gradient-to-br',
          style.gradient,
          style.glow,
          style.text,
        )}
      >
        {/* Rotating shimmer */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
          initial={false}
        >
          <motion.div
            className="absolute -inset-[40%] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,255,255,0.35)_60deg,transparent_120deg)]"
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>

        {/* Icon medallion */}
        <motion.div
          className="relative flex h-12 w-12 items-center justify-center rounded-full bg-black/15 ring-1 ring-white/40"
          animate={{ rotate: [0, -6, 6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Icon className="h-6 w-6 drop-shadow" />
          <Sparkles className="absolute -right-1 -top-1 h-3.5 w-3.5 opacity-80" />
        </motion.div>

        {/* Text */}
        <div className="relative flex flex-col leading-tight">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-80">
            Rank
          </span>
          <span className="text-xl font-extrabold tracking-tight drop-shadow-sm">
            {style.label}
          </span>
          <span className="text-[11px] font-medium opacity-85">
            {points.toLocaleString()} pts · {subtitle}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default StudentRankBadge;