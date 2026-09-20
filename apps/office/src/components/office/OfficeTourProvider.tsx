'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { OFFICE_TOUR_STEPS } from '@/lib/office/officeTour';

type OfficeTourContextValue = {
  start: () => void;
};

const OfficeTourContext = createContext<OfficeTourContextValue | null>(null);

/** Read by components that need to render/start the office tour (e.g. the Home page button). */
export function useOfficeTour(): OfficeTourContextValue {
  const ctx = useContext(OfficeTourContext);
  if (!ctx) throw new Error('useOfficeTour must be used inside OfficeTourProvider');
  return ctx;
}

function queryTourTarget(id: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-office-tour="${id}"]`);
}

/**
 * Bounding rect of the target, or null if it isn't on screen right now (e.g. sidebar
 * closed on mobile). The nav list scrolls independently of the page, so also nudge the
 * target into view - otherwise a later step's item can end up scrolled out of sight
 * with nothing visibly highlighted.
 */
function measureTarget(id: string | undefined): DOMRect | null {
  if (!id) return null;
  const el = queryTourTarget(id);
  if (!el) return null;
  el.scrollIntoView({ block: 'nearest' });
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return rect;
}

const SPOTLIGHT_PADDING = 8;

type OfficeTourProviderProps = {
  children: React.ReactNode;
  /** Called with true while the tour is active, false once it ends - lets the shell keep the mobile sidebar open so highlighted nav items are actually visible. */
  onActiveChange?: (active: boolean) => void;
};

export function OfficeTourProvider({ children, onActiveChange }: OfficeTourProviderProps) {
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const active = stepIndex !== null;
  const step = active ? OFFICE_TOUR_STEPS[stepIndex] : null;

  const start = useCallback(() => {
    setStepIndex(0);
  }, []);

  const end = useCallback(() => {
    setStepIndex(null);
    setRect(null);
  }, []);

  useEffect(() => {
    onActiveChange?.(active);
  }, [active, onActiveChange]);

  // Re-measure the current step's target on mount/step-change and whenever the
  // viewport changes - the sidebar is fixed-position so scrolling the page never
  // moves it, but resizing (or opening the mobile menu) does.
  useEffect(() => {
    if (!step) return;
    const measure = () => setRect(measureTarget(step.target));
    measure();
    // A short delay covers the mobile-sidebar open transition/animation.
    const t = window.setTimeout(measure, 250);
    window.addEventListener('resize', measure);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', measure);
    };
  }, [step]);

  const goNext = useCallback(() => {
    setStepIndex((i) => {
      if (i === null) return null;
      const next = i + 1;
      return next < OFFICE_TOUR_STEPS.length ? next : null;
    });
  }, []);

  const goBack = useCallback(() => {
    setStepIndex((i) => (i === null || i === 0 ? i : i - 1));
  }, []);

  const value = useMemo(() => ({ start }), [start]);

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === OFFICE_TOUR_STEPS.length - 1;

  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 768;
  // The card needs ~336px (max-w-sm) - on a narrow/mobile screen the sidebar itself can
  // take up most of that width, leaving no room to place the card beside the target.
  const CARD_WIDTH_ESTIMATE = 336;
  const roomToTheRight = rect ? viewportWidth - rect.right >= CARD_WIDTH_ESTIMATE + 16 : false;

  let cardStyle: React.CSSProperties;
  if (rect && roomToTheRight) {
    cardStyle = {
      position: 'fixed',
      top: Math.min(Math.max(rect.top, 16), viewportHeight - 220),
      left: rect.right + 16,
    };
  } else if (rect) {
    // Not enough room beside the target - stack the card below it instead, full-width.
    cardStyle = {
      position: 'fixed',
      top: Math.min(rect.bottom + 16, viewportHeight - 260),
      left: 16,
    };
  } else {
    cardStyle = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  return (
    <OfficeTourContext.Provider value={value}>
      {children}
      {active && step ? (
        <div className="fixed inset-0 z-[1000]">
          <button
            type="button"
            aria-label="Close tour"
            className="absolute inset-0 h-full w-full cursor-default bg-slate-950/0"
            onClick={end}
          />
          {rect ? (
            <div
              className="pointer-events-none absolute rounded-xl border-2 border-teal-300 transition-all duration-200"
              style={{
                top: rect.top - SPOTLIGHT_PADDING,
                left: rect.left - SPOTLIGHT_PADDING,
                width: rect.width + SPOTLIGHT_PADDING * 2,
                height: rect.height + SPOTLIGHT_PADDING * 2,
                boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.6)',
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-slate-950/60" />
          )}
          <Card
            className={cn(
              'w-[calc(100vw-2rem)] max-w-sm rounded-2xl p-4 shadow-2xl',
              !rect && 'text-center',
            )}
            style={cardStyle}
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">{step.title}</h2>
              <button
                type="button"
                onClick={end}
                aria-label="Close tour"
                className="-mr-1 -mt-1 rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
            <div className="mt-4 flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {(stepIndex ?? 0) + 1} / {OFFICE_TOUR_STEPS.length}
              </span>
              <div className="flex gap-2">
                {isFirst ? (
                  <Button type="button" variant="ghost" size="sm" onClick={end}>
                    Skip tour
                  </Button>
                ) : (
                  <Button type="button" variant="outline" size="sm" onClick={goBack}>
                    Back
                  </Button>
                )}
                <Button type="button" size="sm" onClick={goNext}>
                  {isLast ? 'Done' : 'Next'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </OfficeTourContext.Provider>
  );
}
