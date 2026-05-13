/**
 * Shared animation constants for the LevelUp Rewards dashboard.
 *
 * Conventions:
 *  - `springCinematic` — stiffness 100 / damping 20 (pairs with GSAP list tuning in `gsapCinematic.ts`)
 *  - consistent easing for non-spring overlays
 *  - staggerChildren for entrance reveals
 */
import type { Transition, Variants } from 'framer-motion';

/* ─── Easing & Timing ─────────────────────────────────────────── */

/** Signature LevelUp easing: smooth deceleration with a subtle bounce-out. */
export const easePremium = [0.22, 1, 0.36, 1] as const;

/** Gentler version for micro-interactions (e.g. card hover). */
export const easeGentle = [0.25, 0.1, 0.25, 1] as const;

/** Snappier variant for modals / overlay reveals. */
export const easeSnap = [0.16, 1, 0.3, 1] as const;

/* ─── Spring Presets ──────────────────────────────────────────── */

/** Cinematic spring — shared baseline (matches GSAP list tuning in `gsapCinematic.ts`). */
export const springCinematic: Transition = {
  type: 'spring',
  stiffness: 100,
  damping: 20,
};

/** Default spring for most card / tile entrance animations. */
export const springDefault: Transition = { ...springCinematic };

/** Softer spring for content sections that should feel light. */
export const springSoft: Transition = { ...springCinematic };

/** Bouncy spring for celebratory reveals (badges, points fly-up, etc.). */
export const springBouncy: Transition = { ...springCinematic };

/* ─── Stagger / Container Variants ────────────────────────────── */

/**
 * Standard stagger entrance for a list of items.
 * Usage:
 *   <motion.div variants={staggerContainer} initial="hidden" animate="show">
 *     <motion.div variants={staggerItem}>…</motion.div>
 *     <motion.div variants={staggerItem}>…</motion.div>
 *   </motion.div>
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.055,
      delayChildren: 0.06,
    },
  },
};

/** A single item within a stagger container — fade + slide up. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { ...springCinematic },
  },
};

/**
 * Faster stagger — for dense grids (e.g. reward prize tiles).
 */
export const staggerGrid: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.025,
      delayChildren: 0.04,
    },
  },
};

export const staggerGridItem: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { ...springCinematic },
  },
};

/* ─── Page Transition Variants ────────────────────────────────── */

/** Page-level fade + slide up (used in template.tsx). */
export const pageEnter: Variants = {
  initial: { opacity: 0, y: 24, scale: 0.985, filter: 'blur(16px)' },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { ...springCinematic },
  },
  exit: { opacity: 0, y: -12, scale: 0.99, filter: 'blur(8px)', transition: { ...springCinematic } },
};

/* ─── Card / Surface Variants ─────────────────────────────────── */

/** Card entrance — slight scale + fade. */
export const cardEnter: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { ...springCinematic },
  },
};

/** Hover micro-interaction for cards, tiles, buttons. */
export const hoverLift: Transition = { ...springCinematic };

/* ─── Dialog / Overlay Variants ───────────────────────────────── */

export const dialogOverlay: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.18, ease: easePremium } },
};

export const dialogContent: Variants = {
  hidden: { opacity: 0, scale: 0.92, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { ...springCinematic },
  },
  exit: { opacity: 0, scale: 0.96, y: 10, transition: { duration: 0.14, ease: easeGentle } },
};

/* ─── Points / Score Pop Variants ─────────────────────────────── */

export const pointsFlyUp: Variants = {
  hidden: { opacity: 0, y: 0, scale: 0.6 },
  visible: {
    opacity: 1,
    y: -60,
    scale: 1.3,
    transition: { ...springCinematic },
  },
};

export const pointsFlyExit: Variants = {
  exit: { opacity: 0, scale: 1.6, y: -120, transition: { duration: 0.4, ease: easePremium } },
};

/* ─── Icon / Badge Bounce ─────────────────────────────────────── */

export const iconBounce: Variants = {
  hidden: { scale: 0, rotate: -15 },
  visible: {
    scale: 1,
    rotate: 0,
    transition: { ...springCinematic },
  },
};