'use client';
import { motion, useReducedMotion } from 'framer-motion';
import { springCinematic } from '@/lib/animation';

export default function Template({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={reduceMotion ? { duration: 0 } : springCinematic}
    >
      {children}
    </motion.div>
  );
}