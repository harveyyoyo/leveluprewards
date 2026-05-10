'use client';

import { motion, useReducedMotion } from 'framer-motion';

/** Smooth “product UI” easing — soft deceleration, no bounce (Lovable-style). */
const PAGE_EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Next.js `template.tsx` remounts on route changes, so this runs a subtle enter
 * transition for every page without wiring pathname keys manually.
 */
export default function AppRouteTemplate({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="w-full min-h-0"
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? 0 : 0.42,
        ease: PAGE_EASE,
      }}
    >
      {children}
    </motion.div>
  );
}
