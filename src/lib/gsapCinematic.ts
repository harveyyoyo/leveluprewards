/**
 * GSAP-side entrance tuning aligned with Framer Motion `springCinematic`
 * (`stiffness: 100`, `damping: 20`) from `@/lib/animation`. Core GSAP has no
 * physics spring; these values are hand-tuned for a similar soft settle.
 */
export const GSAP_CINEMATIC_ENTRANCE = {
  from: { y: 28, opacity: 0, scale: 0.97 },
  to: {
    y: 0,
    opacity: 1,
    scale: 1,
    duration: 0.82,
    ease: 'power2.out',
    stagger: 0.07,
    overwrite: 'auto' as const,
  },
} as const;
