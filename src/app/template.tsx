'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { springCinematic } from '@/lib/animation';

/**
 * Next.js `template.tsx` remounts on route changes, so this runs a subtle enter
 * transition for every page without wiring pathname keys manually.
 *
 * Uses shared easing from `@/lib/animation` for cross-dashboard consistency.
 */
export default function AppRouteTemplate({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="w-full min-h-0 flex-1 flex flex-col [transform:translateZ(0)]"
      initial={
        reduceMotion
          ? false
          : {
              // Never start at opacity 0: if motion fails to run to completion, the route can look "blank".
              opacity: 1,
              y: 12,
              scale: 0.992,
            }
      }
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      transition={reduceMotion ? { duration: 0 } : springCinematic}
      style={{ willChange: reduceMotion ? 'auto' : 'transform' }}
    >
      {children}
    </motion.div>
  );
}
