'use client';

import { motion, useReducedMotion } from 'framer-motion';

/** Smooth product UI easing: soft deceleration, no bounce. */
const PAGE_EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Next.js `template.tsx` remounts on route changes, so this runs a subtle enter
 * transition for every page without wiring pathname keys manually.
 */
export default function AppRouteTemplate({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="w-full min-h-0 [transform:translateZ(0)]"
      initial={
        reduceMotion
          ? false
          : {
              opacity: 0,
              y: 24,
              scale: 0.985,
              filter: 'blur(16px)',
            }
      }
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        filter: 'blur(0px)',
      }}
      transition={{
        duration: reduceMotion ? 0 : 0.68,
        ease: PAGE_EASE,
      }}
      style={{ willChange: reduceMotion ? 'auto' : 'opacity, transform, filter' }}
    >
      {children}
    </motion.div>
  );
}
