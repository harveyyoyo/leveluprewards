'use client';

import type { DependencyList, RefObject } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { GSAP_CINEMATIC_ENTRANCE } from '@/lib/gsapCinematic';

type UseStaggeredCardListEntranceOptions = {
  /** Extra deps that should retrigger the entrance (e.g. prize list identity). */
  dependencies: DependencyList;
  /** Skip all tweens (loading skeletons, empty lists, etc.). */
  skip?: boolean;
  /** Honor prefers-reduced-motion. */
  reducedMotion?: boolean;
  /** Query selector for list items, scoped to `scopeRef`. */
  itemSelector?: string;
};

/**
 * Staggered cinematic entrance for card-like grids using `useGSAP` + `scope`
 * so tweens revert cleanly and selectors stay contained (no leaked globals).
 */
export function useStaggeredCardListEntrance(
  scopeRef: RefObject<HTMLElement | null>,
  {
    dependencies,
    skip = false,
    reducedMotion = false,
    itemSelector = '[data-stagger-card]',
  }: UseStaggeredCardListEntranceOptions,
) {
  useGSAP(
    () => {
      if (skip || reducedMotion) return;
      const root = scopeRef.current;
      if (!root) return;
      const cards = root.querySelectorAll(itemSelector);
      if (!cards.length) return;
      const { from, to } = GSAP_CINEMATIC_ENTRANCE;
      gsap.fromTo(cards, { ...from }, { ...to });
    },
    { scope: scopeRef, dependencies: [skip, reducedMotion, itemSelector, ...dependencies] },
  );
}
