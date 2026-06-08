'use client';

import { useState, useEffect, useCallback, useMemo, type CSSProperties } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSettings } from '@/components/providers/SettingsProvider';
import { ArrowRight, MousePointerClick, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { springCinematic } from '@/lib/animation';
import { APP_NAME } from '@/lib/appBranding';
import { cn } from '@/lib/utils';
import {
  IntroTourSpotlight,
  measureIntroTourTarget,
  type SpotlightRect,
} from '@/components/admin/IntroTourSpotlight';

const STORAGE_KEY = 'arcade_intro_wizard_step_v4';

type IntroStep = {
  id: string;
  title: string;
  body: string;
  /** Primary route where this step applies. */
  onRoute?: string;
  extraRoutes?: string[];
  /** Element to highlight (`data-intro-tour` value). */
  target?: string;
  /** Next stays disabled until pathname matches. */
  advanceOnRoute?: string;
  /** Next stays disabled until the highlight target exists. */
  requireTarget?: boolean;
  /** Next stays disabled until this target exists (e.g. signed-in dashboard). */
  advanceOnTarget?: string;
  /** Shown when `advanceOnRoute` is not satisfied yet. */
  navigateHint?: string;
};

const steps: IntroStep[] = [
  {
    id: 'welcome',
    title: `Welcome to ${APP_NAME}`,
    body:
      'We will go one step at a time. Each step highlights something on the screen. Take your time — use Next only when you are ready to move on.',
    onRoute: '/portal',
  },
  {
    id: 'portal-hub',
    title: 'School portal',
    body: 'This is your home hub. Each card opens a different part of the school app.',
    onRoute: '/portal',
    target: 'portal-hub',
    requireTarget: true,
  },
  {
    id: 'portal-admin',
    title: 'Open Admin Portal',
    body: 'You are in Admin. Tap Next to tour the left sidebar.',
    onRoute: '/portal',
    target: 'portal-admin',
    advanceOnRoute: '/admin',
    navigateHint: 'Tap Admin Portal (highlighted), sign in if prompted, then tap Next.',
  },
  {
    id: 'admin-sidebar',
    title: 'Admin sidebar',
    body:
      'Admin sections are listed in the left sidebar — not across the top. Scroll the list on smaller screens if you do not see every item.',
    onRoute: '/admin',
    target: 'staff-nav-sidebar',
    requireTarget: true,
  },
  {
    id: 'admin-students',
    title: 'Students',
    body: 'Students — add your roster, import CSV, and print ID cards. Tap this row in the sidebar to open the tab.',
    onRoute: '/admin',
    target: 'staff-tab-students',
    requireTarget: true,
  },
  {
    id: 'admin-classes',
    title: 'Classes',
    body: 'Classes — create class groups and assign a primary teacher. Link students here or from the Students tab.',
    onRoute: '/admin',
    target: 'staff-tab-classes',
    requireTarget: true,
  },
  {
    id: 'admin-teachers',
    title: 'Teachers & staff',
    body: 'Teachers & staff — add and setup teacher, secretary, prize clerk accounts.',
    onRoute: '/admin',
    target: 'staff-tab-teachers',
    requireTarget: true,
  },
  {
    id: 'admin-points',
    title: 'Points',
    body: 'Points — set up reward categories, print coupon sheets, and manage coupon inventory.',
    onRoute: '/admin',
    target: 'staff-tab-categories',
    requireTarget: true,
  },
  {
    id: 'admin-prizes',
    title: 'Prizes',
    body: 'Prizes — build the rewards shop students see at the kiosk.',
    onRoute: '/admin',
    target: 'staff-tab-prizes',
    requireTarget: true,
  },
  {
    id: 'header-home',
    title: 'Back to portal',
    body: 'You are back on the school portal. Tap Next to open Teacher Portal.',
    extraRoutes: ['/admin', '/teacher'],
    target: 'header-home',
    advanceOnRoute: '/portal',
    navigateHint: 'Tap the home icon in the header (highlighted), then tap Next.',
  },
  {
    id: 'portal-teacher',
    title: 'Open Teacher Portal',
    body: 'You are in the Teacher portal. Tap Next to walk through printing coupons.',
    onRoute: '/portal',
    target: 'portal-print',
    advanceOnRoute: '/teacher',
    navigateHint: 'Tap Teacher Portal (highlighted), sign in if prompted, then tap Next.',
  },
  {
    id: 'teacher-points-tab',
    title: 'Teacher — Points',
    body: 'In the left sidebar, open Points (print coupons and award points).',
    onRoute: '/teacher',
    target: 'staff-tab-coupons',
    requireTarget: true,
  },
  {
    id: 'teacher-print',
    title: 'Print coupons',
    body: 'Choose a category and point value, then use Generate & print. Note one coupon code for kiosk testing.',
    onRoute: '/teacher',
    target: 'coupon-print-panel',
    requireTarget: true,
    navigateHint: 'Open the Points tab in the left sidebar first so this panel appears.',
  },
  {
    id: 'teacher-generate',
    title: 'Generate & print',
    body: 'This button creates a printable sheet of scannable coupon codes.',
    onRoute: '/teacher',
    target: 'coupon-generate-btn',
    requireTarget: true,
  },
  {
    id: 'portal-student',
    title: 'Open Student Kiosk',
    body: 'You are on the Student Kiosk. Tap Next to try sign-in and redemption.',
    onRoute: '/portal',
    target: 'portal-redeem',
    advanceOnRoute: '/student',
    navigateHint: 'Tap Student Kiosk (highlighted), then tap Next.',
  },
  {
    id: 'kiosk-login',
    title: 'Student Kiosk sign-in',
    body: 'Students sign in here with a card, camera, or typed ID.',
    onRoute: '/student',
    target: 'kiosk-login',
    requireTarget: true,
  },
  {
    id: 'kiosk-type-tab',
    title: 'Type your ID',
    body: 'For this tour, open the Type tab to enter a student ID by hand.',
    onRoute: '/student',
    target: 'kiosk-login-type-tab',
    requireTarget: true,
    navigateHint: 'Tap the Type tab on the sign-in card (highlighted), then tap Next.',
  },
  {
    id: 'kiosk-type-id',
    title: 'Test student 100',
    body: 'Enter 100 as the Student ID. Use the full ID from your roster if 100 is not found.',
    onRoute: '/student',
    target: 'kiosk-login-id',
    requireTarget: true,
    navigateHint: 'Open the Type tab first so the ID field appears.',
  },
  {
    id: 'kiosk-identify',
    title: 'Identify Student',
    body: 'Tap Identify Student to sign in. Next unlocks once the redeem panel appears.',
    onRoute: '/student',
    target: 'kiosk-login-submit',
    requireTarget: true,
    advanceOnTarget: 'kiosk-redeem',
    navigateHint: 'Enter student ID 100 and tap Identify Student, then tap Next.',
  },
  {
    id: 'kiosk-redeem',
    title: 'Redeem a coupon',
    body: 'After sign-in, type or scan a coupon code in the center panel to add points.',
    onRoute: '/student',
    target: 'kiosk-redeem',
    requireTarget: true,
    navigateHint: 'Sign in as a student first so the redeem panel appears, then tap Next.',
  },
  {
    id: 'kiosk-more-prizes',
    title: 'More prizes',
    body: 'Eligible rewards shows a preview rail. Tap More prizes to open the full shop on this page.',
    onRoute: '/student',
    target: 'kiosk-more-prizes',
    requireTarget: true,
    navigateHint: 'Sign in as a student to see the rewards rail and More prizes button.',
  },
  {
    id: 'header-home-student-portal',
    title: 'Back to portal',
    body: 'Return to the school portal to open the Student home portal.',
    extraRoutes: ['/student'],
    target: 'header-home',
    advanceOnRoute: '/portal',
    navigateHint: 'Tap the home icon in the header (highlighted), then tap Next.',
  },
  {
    id: 'portal-student-home',
    title: 'Student home portal',
    body: 'This is the student’s own page for points and activity — separate from the in-school kiosk.',
    onRoute: '/portal',
    target: 'portal-student-home',
    advanceOnRoute: '/student-home',
    navigateHint:
      'Tap Student home portal (highlighted). Enable it in Admin → Student home portal if the card is missing.',
  },
  {
    id: 'student-portal-login',
    title: 'Student home sign-in',
    body: 'Students enter their ID here to view points at home.',
    onRoute: '/student-home',
    target: 'student-portal-login',
    requireTarget: true,
  },
  {
    id: 'student-portal-id',
    title: 'Test student 100',
    body: 'Type 100 in the Student ID field (same test student as the kiosk).',
    onRoute: '/student-home',
    target: 'student-portal-id',
    requireTarget: true,
  },
  {
    id: 'student-portal-continue',
    title: 'Continue',
    body: 'Tap Continue to sign in. Next unlocks when the dashboard loads.',
    onRoute: '/student-home',
    target: 'student-portal-continue',
    requireTarget: true,
    advanceOnTarget: 'student-portal-dashboard',
    navigateHint: 'Enter 100 and tap Continue, then tap Next.',
  },
  {
    id: 'student-portal-dashboard',
    title: 'Student dashboard',
    body: 'Signed-in students see points, badges, goals, and house standings. Redemption still happens at the kiosk.',
    onRoute: '/student-home',
    target: 'student-portal-dashboard',
    requireTarget: true,
  },
  {
    id: 'teacher-redemptions-tab',
    title: 'Teacher Portal again',
    body: 'Select Redemptions in the left sidebar to fulfill prize pickups.',
    advanceOnRoute: '/teacher',
    target: 'staff-tab-redemptions',
    requireTarget: true,
    navigateHint: 'Use the home icon, open Teacher Portal, then tap Next.',
  },
  {
    id: 'teacher-redemptions',
    title: 'Mark delivered',
    body: 'When a student picks up a prize, mark the order delivered here so stock and history stay correct.',
    onRoute: '/teacher',
    target: 'teacher-redemptions',
    requireTarget: true,
    navigateHint: 'Open the Redemptions tab in the left sidebar first.',
  },
  {
    id: 'finish',
    title: 'You are ready',
    body:
      'Open Hall of Fame from the portal for leaderboards. Close this tour with × anytime. Replay it from Settings → Interface → Show Welcome Tour (it restarts when you reload the portal).',
    onRoute: '/portal',
    extraRoutes: ['/hall-of-fame', '/student-home'],
    target: 'portal-hub',
  },
];

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

/** Keep the tour card off the highlighted element and use high-contrast sizing. */
function getTourCardPlacement(rect: SpotlightRect | null): TourCardPlacement {
  const base = 'fixed z-[200] w-[min(100%-2rem,28rem)]';
  if (!rect || typeof window === 'undefined') {
    return { className: cn(base, 'bottom-6 left-1/2 -translate-x-1/2') };
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const rectBottom = rect.top + rect.height;
  const spaceBelow = vh - rectBottom;
  const isWide = rect.width > vw * 0.45;
  const isTall = rect.height > vh * 0.4;

  if (isWide || isTall) {
    if (spaceBelow >= 160) {
      return {
        className: cn(base, 'left-1/2 -translate-x-1/2'),
        style: { top: Math.min(rectBottom + 12, vh - 220) },
      };
    }
    return { className: cn(base, 'top-6 left-1/2 -translate-x-1/2') };
  }

  const centerX = rect.left + rect.width / 2;
  if (centerX > vw * 0.55) {
    return { className: cn(base, 'top-1/2 -translate-y-1/2 left-4 sm:left-8') };
  }
  if (centerX < vw * 0.45) {
    return { className: cn(base, 'top-1/2 -translate-y-1/2 right-4 sm:right-8 left-auto') };
  }
  return { className: cn(base, 'bottom-6 left-1/2 -translate-x-1/2') };
}

export function IntroWizard() {
  const { settings } = useSettings();
  const pathname = usePathname();
  const [stepIndex, setStepIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [, setMeasureTick] = useState(0);

  const isWizardEnabled = settings.showIntroWizard !== false;
  const isOnPortal = routeEndsWith(pathname, '/portal');

  useEffect(() => {
    if (!isWizardEnabled) return;
    if (isOnPortal) {
      setDismissed(false);
      setStepIndex(0);
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem('arcade_intro_wizard_step');
      window.localStorage.removeItem('arcade_intro_wizard_step_v2');
      window.localStorage.removeItem('arcade_intro_wizard_step_v3');
      return;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      const parsed = parseInt(stored, 10);
      if (!Number.isNaN(parsed) && parsed >= 0 && parsed < steps.length) {
        setStepIndex(parsed);
      }
    }
  }, [isWizardEnabled, isOnPortal, pathname]);

  // Re-check target visibility after route changes and layout settles.
  useEffect(() => {
    if (!isWizardEnabled || dismissed) return;
    const id = window.setInterval(() => setMeasureTick((n) => n + 1), 450);
    return () => window.clearInterval(id);
  }, [isWizardEnabled, dismissed, pathname, stepIndex]);

  const persistStep = useCallback((index: number) => {
    window.localStorage.setItem(STORAGE_KEY, String(index));
  }, []);

  const currentStep = steps[stepIndex];
  const ready = currentStep ? canAdvance(currentStep, pathname) : false;
  const spotlightRect = useMemo(
    () => (currentStep?.target ? measureIntroTourTarget(currentStep.target) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- measureTick drives re-measure
    [currentStep?.target, pathname, stepIndex, ready],
  );
  const tourCardPlacement = useMemo(() => getTourCardPlacement(spotlightRect), [spotlightRect]);

  const handleNext = () => {
    if (!ready) return;
    if (stepIndex < steps.length - 1) {
      const next = stepIndex + 1;
      setStepIndex(next);
      persistStep(next);
    } else {
      handleDismiss();
    }
  };

  const handleBack = () => {
    setStepIndex((prev) => {
      const next = prev > 0 ? prev - 1 : 0;
      persistStep(next);
      return next;
    });
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  const showOnRoute = isStaffAppRoute(pathname);

  if (!isWizardEnabled || dismissed || !currentStep || !showOnRoute) {
    return null;
  }

  const description = stepDescription(currentStep, pathname, ready);
  const isLast = stepIndex >= steps.length - 1;

  return (
    <>
      <IntroTourSpotlight targetId={currentStep.target} active={Boolean(currentStep.target)} />
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
          <Card className="shadow-2xl border-2 border-primary/50 bg-card text-card-foreground ring-1 ring-black/10 dark:ring-white/10">
            <CardHeader className="pb-3 space-y-2">
              <div className="flex justify-between items-start gap-3">
                <CardTitle className="text-lg font-bold leading-snug pr-2 text-foreground">
                  {currentStep.title}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-full"
                  onClick={handleDismiss}
                  aria-label="Close tour"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-base font-medium leading-relaxed text-foreground">{description}</p>
              <div
                className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/35 bg-primary/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-primary"
                aria-hidden
              >
                <MousePointerClick className="h-3.5 w-3.5 shrink-0" />
                Try it out now
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex justify-between items-center w-full gap-3">
                <div className="text-xs font-semibold text-foreground/80 shrink-0">
                  Step {stepIndex + 1} of {steps.length}
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
                    {isLast ? 'Finish' : 'Next'}
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
