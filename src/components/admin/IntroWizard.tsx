'use client';

import { useState, useEffect, useCallback, useMemo, type CSSProperties } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useSettings } from '@/components/providers/SettingsProvider';
import { ArrowRight, MousePointerClick } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { springCinematic } from '@/lib/animation';
import { cn } from '@/lib/utils';
import {
  IntroTourSpotlight,
  measureIntroTourTarget,
  type SpotlightRect,
} from '@/components/admin/IntroTourSpotlight';
import {
  dispatchIntroTourSelectStaffTab,
  parseStaffTabFromIntroTourTarget,
} from '@/lib/introTourStaffTab';

import type { IntroStep } from '@/lib/tours/types';
import { welcomeTourSteps } from '@/lib/tours/welcomeTour';
import { featuresTourSteps } from '@/lib/tours/featuresTour';
import { adminTourSteps } from '@/lib/tours/adminTour';
import { teacherTourSteps } from '@/lib/tours/teacherTour';
import { studentTourSteps } from '@/lib/tours/studentTour';

function getTourSteps(tourId: string | null | undefined): IntroStep[] {
  if (tourId === 'features') return featuresTourSteps;
  if (tourId === 'welcome') return welcomeTourSteps;
  if (tourId === 'admin') return adminTourSteps;
  if (tourId === 'teacher') return teacherTourSteps;
  if (tourId === 'student') return studentTourSteps;
  return [];
}

const getStorageKey = (tourId: string) => `arcade_tour_progress_${tourId}`;

const STAFF_ROUTE_SUFFIXES = [
  '/portal',
  '/admin',
  '/teacher',
  '/student',
  '/student-home',
  '/prize',
  '/hall-of-fame',
];

function isPublicRoute(pathname: string) {
  return (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/developer' ||
    pathname.startsWith('/s/')
  );
}

function routeEndsWith(pathname: string | null, suffix: string): boolean {
  if (!pathname) return false;
  return pathname === suffix || pathname.endsWith(suffix);
}

function isStaffAppRoute(pathname: string | null): boolean {
  if (!pathname || isPublicRoute(pathname)) return false;
  return STAFF_ROUTE_SUFFIXES.some((suffix) => routeEndsWith(pathname, suffix));
}

function stepMatchesRoute(step: IntroStep, pathname: string | null): boolean {
  if (!pathname) return false;
  if (step.onRoute && routeEndsWith(pathname, step.onRoute)) return true;
  if (step.extraRoutes?.some((r) => routeEndsWith(pathname, r))) return true;
  if (!step.onRoute && !step.extraRoutes?.length) return true;
  return false;
}

function canAdvance(step: IntroStep, pathname: string | null): boolean {
  if (step.advanceOnRoute) {
    if (!routeEndsWith(pathname, step.advanceOnRoute)) return false;
    if (step.advanceOnTarget && !measureIntroTourTarget(step.advanceOnTarget)) return false;
    if (step.requireTarget && step.target && !measureIntroTourTarget(step.target)) return false;
    return true;
  }
  if (step.onRoute && !stepMatchesRoute(step, pathname)) return false;
  if (step.advanceOnTarget && !measureIntroTourTarget(step.advanceOnTarget)) return false;
  if (step.requireTarget && step.target && !measureIntroTourTarget(step.target)) return false;
  return true;
}

function stepDescription(step: IntroStep, pathname: string | null, ready: boolean): string {
  if (ready) return step.body;
  return step.navigateHint ?? step.body;
}

type TourCardPlacement = {
  className: string;
  style?: CSSProperties;
};

/** Minimum gap between the tour card and any viewport edge (incl. safe area). */
const TOUR_EDGE_PX = 24;
const TOUR_CARD_ESTIMATE_PX = 280;

const TOUR_CARD_SHELL_CLASS =
  'pointer-events-auto max-h-[calc(100dvh-3rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] overflow-y-auto overscroll-contain';

function tourCardWidthClass(): string {
  return 'w-[min(calc(100vw-3rem),28rem)]';
}

function clampTourTop(preferredTop: number, vh: number): number {
  return Math.max(
    TOUR_EDGE_PX,
    Math.min(preferredTop, vh - TOUR_CARD_ESTIMATE_PX - TOUR_EDGE_PX),
  );
}

function centeredTourTop(vh: number): number {
  return clampTourTop((vh - TOUR_CARD_ESTIMATE_PX) / 2, vh);
}

/** Keep the tour card off the highlighted element, with padding from all screen edges. */
function getTourCardPlacement(rect: SpotlightRect | null): TourCardPlacement {
  const base = cn('fixed z-[200]', tourCardWidthClass(), TOUR_CARD_SHELL_CLASS);
  if (!rect || typeof window === 'undefined') {
    return { className: cn(base, 'left-1/2 -translate-x-1/2'), style: { bottom: TOUR_EDGE_PX } };
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const rectBottom = rect.top + rect.height;
  const spaceBelow = vh - rectBottom - TOUR_EDGE_PX;
  const isWide = rect.width > vw * 0.45;
  const isTall = rect.height > vh * 0.4;

  if (isWide || isTall) {
    if (spaceBelow >= TOUR_CARD_ESTIMATE_PX) {
      return {
        className: cn(base, 'left-1/2 -translate-x-1/2'),
        style: { top: clampTourTop(rectBottom + 12, vh) },
      };
    }
    return {
      className: cn(base, 'left-1/2 -translate-x-1/2'),
      style: { top: TOUR_EDGE_PX },
    };
  }

  const centerX = rect.left + rect.width / 2;
  if (centerX > vw * 0.55) {
    return {
      className: cn(base, 'left-6 sm:left-8'),
      style: { top: centeredTourTop(vh) },
    };
  }
  if (centerX < vw * 0.45) {
    return {
      className: cn(base, 'right-6 sm:right-8 left-auto'),
      style: { top: centeredTourTop(vh) },
    };
  }
  return { className: cn(base, 'left-1/2 -translate-x-1/2'), style: { bottom: TOUR_EDGE_PX } };
}

function getWelcomeTourCardPlacement(): TourCardPlacement {
  if (typeof window === 'undefined') {
    return {
      className: cn('fixed z-[200]', tourCardWidthClass(), TOUR_CARD_SHELL_CLASS, 'left-1/2 -translate-x-1/2'),
      style: { top: TOUR_EDGE_PX },
    };
  }
  return {
    className: cn('fixed z-[200]', tourCardWidthClass(), TOUR_CARD_SHELL_CLASS, 'left-1/2 -translate-x-1/2'),
    style: { top: centeredTourTop(window.innerHeight) },
  };
}

export function IntroWizard() {
  const { settings, updateSettings } = useSettings();
  const pathname = usePathname();
  const [stepIndex, setStepIndex] = useState(0);
  const [, setMeasureTick] = useState(0);

  const activeTourId = settings.activeTourId;
  const steps = useMemo(() => getTourSteps(activeTourId), [activeTourId]);
  const isWizardEnabled = Boolean(activeTourId && steps.length > 0);

  useEffect(() => {
    if (!isWizardEnabled || !activeTourId) return;

    const storageKey = getStorageKey(activeTourId);

    const stored = window.localStorage.getItem(storageKey);
    if (stored !== null) {
      const parsed = parseInt(stored, 10);
      if (!Number.isNaN(parsed) && parsed >= 0 && parsed < steps.length) {
        setStepIndex(parsed);
      }
    } else {
      setStepIndex(0);
    }
  }, [isWizardEnabled, activeTourId, pathname, steps.length]);

  // Re-check target visibility after route changes and layout settles.
  useEffect(() => {
    if (!isWizardEnabled) return;
    const id = window.setInterval(() => setMeasureTick((n) => n + 1), 450);
    return () => window.clearInterval(id);
  }, [isWizardEnabled, pathname, stepIndex]);

  const persistStep = useCallback((index: number, tourId: string) => {
    window.localStorage.setItem(getStorageKey(tourId), String(index));
  }, []);

  const currentStep = steps[stepIndex];

  // Open the relevant staff sidebar tab when a step describes that section.
  useEffect(() => {
    if (!isWizardEnabled || !currentStep) return;
    const tab =
      currentStep.selectTab ?? parseStaffTabFromIntroTourTarget(currentStep.target);
    if (!tab) return;
    const id = window.setTimeout(() => dispatchIntroTourSelectStaffTab(tab), 80);
    return () => window.clearTimeout(id);
  }, [isWizardEnabled, currentStep, stepIndex, pathname]);

  const ready = currentStep ? canAdvance(currentStep, pathname) : false;
  const spotlightRect = useMemo(
    () => (currentStep?.target ? measureIntroTourTarget(currentStep.target) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- measureTick drives re-measure
    [currentStep?.target, pathname, stepIndex, ready],
  );
  
  const isFirstStep = stepIndex === 0;
  const tourCardPlacement = useMemo(() => {
    if (isFirstStep) return getWelcomeTourCardPlacement();
    return getTourCardPlacement(spotlightRect);
  }, [isFirstStep, spotlightRect]);

  const handleDismiss = useCallback(() => {
    updateSettings({ activeTourId: null });
  }, [updateSettings]);

  const handleNext = () => {
    if (!ready || !activeTourId) return;
    if (stepIndex < steps.length - 1) {
      const next = stepIndex + 1;
      setStepIndex(next);
      persistStep(next, activeTourId);
    } else {
      handleDismiss();
    }
  };

  const handleBack = () => {
    if (!activeTourId) return;
    setStepIndex((prev) => {
      const next = prev > 0 ? prev - 1 : 0;
      persistStep(next, activeTourId);
      return next;
    });
  };

  const showOnRoute = isStaffAppRoute(pathname);

  if (!isWizardEnabled || !currentStep || !showOnRoute) {
    return null;
  }

  const description = stepDescription(currentStep, pathname, ready);
  const isLast = stepIndex >= steps.length - 1;
  const progressPercent = steps.length > 1 ? (stepIndex / (steps.length - 1)) * 100 : 100;

  return (
    <>
      <IntroTourSpotlight
        targetId={currentStep.target}
        active={Boolean(currentStep.target) && !isFirstStep}
      />
      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ ...springCinematic, duration: 0.55 }}
          className={tourCardPlacement.className}
          style={tourCardPlacement.style}
        >
          <Card className="shadow-2xl border-2 border-primary/50 bg-card text-card-foreground ring-1 ring-black/10 dark:ring-white/10 overflow-hidden">
            <Progress value={progressPercent} className="h-1.5 rounded-none bg-primary/20" />
            
            <CardHeader className="pb-3 space-y-2 pt-5">
              <div className="flex justify-between items-start gap-3">
                <CardTitle className="text-lg font-bold leading-snug pr-2 text-foreground">
                  {currentStep.title}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0 rounded-full px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  onClick={handleDismiss}
                >
                  Skip Tour
                </Button>
              </div>
              <p className="text-base font-medium leading-relaxed text-foreground">{description}</p>
              {!isFirstStep ? (
                <div
                  className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/35 bg-primary/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-primary"
                  aria-hidden
                >
                  <MousePointerClick className="h-3.5 w-3.5 shrink-0" />
                  Try it out now
                </div>
              ) : null}
            </CardHeader>
            <CardContent className="pt-0 pb-5">
              <div className="flex justify-between items-center w-full gap-3 mt-4">
                <div className="text-xs font-semibold text-foreground/80 shrink-0">
                  {isFirstStep ? 'Getting started' : `Step ${stepIndex + 1} of ${steps.length}`}
                </div>
                <div className="flex gap-2">
                  {stepIndex > 0 && (
                    <Button variant="outline" onClick={handleBack} className="rounded-full h-10 px-4">
                      Back
                    </Button>
                  )}
                  <Button
                    onClick={handleNext}
                    disabled={!ready}
                    className="rounded-full shadow-lg h-10 px-5 text-sm font-bold"
                  >
                    {isLast ? 'Finish' : isFirstStep ? 'Start walkthrough' : 'Next'}
                    {!isLast ? <ArrowRight className="w-4 h-4 ml-2" /> : null}
                  </Button>
                </div>
              </div>
              {!ready ? (
                <p className="text-sm font-medium text-foreground/85 mt-3 leading-snug">
                  Try the highlighted control now — Next unlocks when you&apos;re done.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
