'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export const CLASSROOM_REALM_ACCENT_BUTTON = {
  backgroundImage: 'linear-gradient(135deg, var(--cr-accent-from), var(--cr-accent-to))',
  color: 'var(--cr-on-accent)',
} as const;

const SPRING = { type: 'spring' as const, stiffness: 260, damping: 24 };

export function ClassroomRealmPageHeader({
  eyebrow = 'Classroom',
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING}
      className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div className="min-w-0">
        <p
          className="mb-2 text-[10px] font-black uppercase tracking-[0.4em]"
          style={{ color: 'var(--cr-accent-text)' }}
        >
          {eyebrow}
        </p>
        <div className="flex items-center gap-3">
          {Icon ? (
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-lg shadow-black/30"
              style={CLASSROOM_REALM_ACCENT_BUTTON}
            >
              <Icon className="h-5 w-5" aria-hidden />
            </div>
          ) : null}
          <motion.h1
            layoutId="classroom-realm-title"
            className="classroom-realm-display text-3xl font-bold text-white sm:text-4xl"
          >
            {title}
          </motion.h1>
        </div>
        {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">{subtitle}</p> : null}
      </div>
      {children ? <div className="flex shrink-0 flex-wrap items-center gap-3">{children}</div> : null}
    </motion.div>
  );
}

export function ClassroomRealmPanel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/20 backdrop-blur-md sm:p-6',
        className,
      )}
    >
      {children}
    </div>
  );
}
