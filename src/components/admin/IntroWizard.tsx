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
import {
  STAFF_AI_HELP_TOUR_TARGET,
  WIZARD_HELP_BUTTON_CLOSING,
} from '@/lib/wizardHelpCopy';
import {
  dispatchIntroTourSelectStaffTab,
  parseStaffTabFromIntroTourTarget,
} from '@/lib/introTourStaffTab';

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
  /** Open this staff sidebar tab when the step is shown (admin/teacher). */
  selectTab?: string;
};

const steps: IntroStep[] = [
  {
    id: 'welcome',
    title: `Welcome to ${APP_NAME}`,
    body:
      'Click here to start a walkthrough of your school rewards portal. Each step highlights one place in the app so you can try it yourself.',
    onRoute: '/portal',
  },
  {
    id: 'portal-hub',
    title: 'School portal',
    body:
      'This hub is your front door. Cards open Admin (school setup), Teacher Portal (coupons and redemptions), Student Kiosk (in-school sign-in), and more when enabled.',
    onRoute: '/portal',
    target: 'portal-hub',
    requireTarget: true,
  },
  {
    id: 'portal-admin',
    title: 'Open Admin Portal',
    body:
      'Admin is where you configure the school — students, classes, staff, point categories, prizes, displays, and optional programs (library, attendance, houses, and more under Add more).',
    onRoute: '/portal',
    target: 'portal-admin',
    advanceOnRoute: '/admin',
    navigateHint: 'Tap Admin Portal (highlighted). Sign in with Google or the school passcode if asked, then tap Next.',
  },
  {
    id: 'admin-sidebar',
    title: 'Admin sidebar',
    body:
      'Core sections live in the left sidebar. Use Add more to pin optional tabs (Hall of Fame, Displays, Library, Notifications, and others). Scroll on smaller screens if you do not see every item.',
    onRoute: '/admin',
    target: 'staff-nav-sidebar',
    requireTarget: true,
  },
  {
    id: 'admin-students',
    title: 'Students',
    body:
      'Students — build your roster (New Student or Import CSV), assign classes and teachers, print ID cards, and use bulk tools for IDs, moves, and kiosk options.',
    onRoute: '/admin',
    target: 'staff-tab-students',
    requireTarget: true,
  },
  {
    id: 'admin-classes',
    title: 'Classes',
    body:
      'Classes — create class groups, set a primary teacher for attendance and reports, and assign students here or from the Students tab.',
    onRoute: '/admin',
    target: 'staff-tab-classes',
    requireTarget: true,
  },
  {
    id: 'admin-teachers',
    title: 'Teachers & staff',
    body:
      'Teachers & staff — add teachers (with optional point budgets), desk accounts (secretary, prize clerk, librarian, reports), and control who can sign in from the portal.',
    onRoute: '/admin',
    target: 'staff-tab-teachers',
    requireTarget: true,
  },
  {
    id: 'admin-points',
    title: 'Points',
    body:
      'Points — define reward categories and default values, award or deduct points manually, print coupon sheets, and audit coupon inventory. Teachers print from their own Points tab using these categories.',
    onRoute: '/admin',
    target: 'staff-tab-categories',
    requireTarget: true,
  },
  {
    id: 'admin-prizes',
    title: 'Prizes',
    body:
      'Prizes — build the rewards catalog and stock levels students see at the kiosk. Print shelf cards for barcode pickup; teachers mark orders delivered in Redemptions.',
    onRoute: '/admin',
    target: 'staff-tab-prizes',
    requireTarget: true,
  },
  {
    id: 'header-home',
    title: 'Back to portal',
    body: 'You are on the portal hub again. Tap Next to open Teacher Portal.',
    extraRoutes: ['/admin', '/teacher'],
    target: 'header-portal-home',
    advanceOnRoute: '/portal',
    navigateHint: 'Tap the house icon in the top-right header (highlighted), then tap Next.',
  },
  {
    id: 'portal-teacher',
    title: 'Open Teacher Portal',
    body:
      'Teacher Portal is where staff print coupon sheets, add or deduct points, manage class prizes, and fulfill kiosk redemptions.',
    onRoute: '/portal',
    target: 'portal-print',
    advanceOnRoute: '/teacher',
    navigateHint: 'Tap Teacher Portal (highlighted). Choose your name and passcode if prompted, then tap Next.',
  },
  {
    id: 'teacher-points-tab',
    title: 'Teacher — Points',
    body:
      'The Points tab opens here — print scannable coupon sheets or use Manually Add/Deduct Points for one-off awards without printing.',
    onRoute: '/teacher',
    target: 'staff-tab-coupons',
    requireTarget: true,
  },
  {
    id: 'teacher-print',
    title: 'Print coupons',
    body:
      'Pick a category and point value, then Generate & print a sheet of unique codes. Hand a code to a student — they redeem it at the kiosk to bank points.',
    onRoute: '/teacher',
    target: 'coupon-print-panel',
    requireTarget: true,
    selectTab: 'coupons',
  },
  {
    id: 'teacher-generate',
    title: 'Generate & print',
    body:
      'This creates a printable PDF of scannable coupon codes (10 or 30 per page). Save one code to test at the kiosk in the next section.',
    onRoute: '/teacher',
    target: 'coupon-generate-btn',
    requireTarget: true,
    selectTab: 'coupons',
  },
  {
    id: 'portal-student',
    title: 'Open Student Kiosk',
    body:
      'The Student Kiosk is a shared in-school screen: students sign in, redeem coupon codes for points, and browse or claim prizes.',
    onRoute: '/portal',
    target: 'portal-redeem',
    advanceOnRoute: '/student',
    navigateHint: 'Tap Student Kiosk (highlighted), then tap Next.',
  },
  {
    id: 'kiosk-login',
    title: 'Student Kiosk sign-in',
    body:
      'Students identify themselves with an ID card tap, barcode scan, face match (if enabled), or by typing their Student ID.',
    onRoute: '/student',
    target: 'kiosk-login',
    requireTarget: true,
  },
  {
    id: 'kiosk-type-tab',
    title: 'Type your ID',
    body: 'For this demo, open the Type tab to enter a Student ID manually (useful when a card reader is not connected).',
    onRoute: '/student',
    target: 'kiosk-login-type-tab',
    requireTarget: true,
    navigateHint: 'Tap the Type tab on the sign-in card (highlighted), then tap Next.',
  },
  {
    id: 'kiosk-type-id',
    title: 'Test student 100',
    body: 'Enter 100 as the Student ID. If your school uses longer IDs (for example 100100), use the ID printed on the student card instead.',
    onRoute: '/student',
    target: 'kiosk-login-id',
    requireTarget: true,
    navigateHint: 'Open the Type tab first so the ID field appears.',
  },
  {
    id: 'kiosk-identify',
    title: 'Identify Student',
    body: 'Tap Identify Student to open the signed-in kiosk. Next unlocks when the redeem panel appears.',
    onRoute: '/student',
    target: 'kiosk-login-submit',
    requireTarget: true,
    advanceOnTarget: 'kiosk-redeem',
    navigateHint: 'Enter student ID 100 and tap Identify Student, then tap Next.',
  },
  {
    id: 'kiosk-redeem',
    title: 'Redeem a coupon',
    body:
      'Type or scan a printed coupon code here. A successful redeem adds those points to the student balance (try a code from the sheet you printed earlier).',
    onRoute: '/student',
    target: 'kiosk-redeem',
    requireTarget: true,
    navigateHint: 'Sign in as a student first so the redeem panel appears, then tap Next.',
  },
  {
    id: 'kiosk-more-prizes',
    title: 'Prize shop',
    body:
      'Eligible rewards shows what this student can afford. Tap More prizes to open the full shop and redeem points for prizes (pickup is completed at the teacher Redemptions tab).',
    onRoute: '/student',
    target: 'kiosk-more-prizes',
    requireTarget: true,
    navigateHint: 'Sign in as a student to see the rewards rail and More prizes button.',
  },
  {
    id: 'header-home-student-portal',
    title: 'Back to portal',
    body: 'Return to the portal hub to open the Student home portal (optional home access for students).',
    extraRoutes: ['/student'],
    target: 'header-portal-home',
    advanceOnRoute: '/portal',
    navigateHint: 'Tap the house icon in the top-right header (highlighted), then tap Next.',
  },
  {
    id: 'portal-student-home',
    title: 'Student home portal',
    body:
      'Student home is a separate sign-in for students (or families) to view points, badges, goals, and house standings from home — not for redeeming coupons (that stays on the kiosk).',
    onRoute: '/portal',
    target: 'portal-student-home',
    advanceOnRoute: '/student-home',
    navigateHint:
      'Tap Student home portal (highlighted). If the card is missing, turn it on under Admin → Student home portal.',
  },
  {
    id: 'student-portal-login',
    title: 'Student home sign-in',
    body: 'Students enter the same Student ID they use at school. Some schools also require a personal portal passcode.',
    onRoute: '/student-home',
    target: 'student-portal-login',
    requireTarget: true,
  },
  {
    id: 'student-portal-id',
    title: 'Test student 100',
    body: 'Type 100 in the Student ID field — the same test student you used at the kiosk.',
    onRoute: '/student-home',
    target: 'student-portal-id',
    requireTarget: true,
  },
  {
    id: 'student-portal-continue',
    title: 'Continue',
    body: 'Tap Continue to sign in. If your school uses portal passcodes, enter it when prompted. Next unlocks when the dashboard loads.',
    onRoute: '/student-home',
    target: 'student-portal-continue',
    requireTarget: true,
    advanceOnTarget: 'student-portal-dashboard',
    navigateHint: 'Enter 100 and tap Continue, then tap Next.',
  },
  {
    id: 'student-portal-dashboard',
    title: 'Student dashboard',
    body:
      'Students see their point balance, point types, badges, goals, library checkouts, and house standings. Prize pickup still happens in person after a kiosk redemption.',
    onRoute: '/student-home',
    target: 'student-portal-dashboard',
    requireTarget: true,
  },
  {
    id: 'teacher-redemptions-tab',
    title: 'Teacher Portal again',
    body:
      'When a student claims a prize at the kiosk, staff fulfill the pickup in Teacher Portal → Redemptions.',
    onRoute: '/portal',
    extraRoutes: ['/student-home', '/student'],
    target: 'portal-print',
    advanceOnRoute: '/teacher',
    selectTab: 'redemptions',
    navigateHint: 'Tap the house icon, open Teacher Portal from the hub, then tap Next.',
  },
  {
    id: 'teacher-redemptions',
    title: 'Mark delivered',
    body:
      'Pending orders list kiosk prize requests. Mark delivered when the student picks up the item so stock counts and history stay accurate.',
    onRoute: '/teacher',
    target: 'teacher-redemptions',
    requireTarget: true,
    selectTab: 'redemptions',
  },
  {
    id: 'finish',
    title: 'You are ready',
    body: `You have toured Admin setup, teacher coupons, the student kiosk, and student home. Open Hall of Fame from the portal for live leaderboards. ${WIZARD_HELP_BUTTON_CLOSING} Close with × anytime, or replay from Settings → Interface → Show Welcome Tour (reload the portal to restart).`,
    extraRoutes: ['/portal', '/hall-of-fame', '/student-home', '/admin', '/teacher', '/student'],
    target: STAFF_AI_HELP_TOUR_TARGET,
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
  const { settings } = useSettings();
  const pathname = usePathname();
  const [stepIndex, setStepIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [, setMeasureTick] = useState(0);

  const isWizardEnabled = settings.showIntroWizard !== false;

  useEffect(() => {
    if (!isWizardEnabled) return;

    const isPortal = routeEndsWith(pathname, '/portal');
    if (isPortal) {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const isHardReload = nav?.type === 'reload';
      if (isHardReload) {
        setDismissed(false);
        setStepIndex(0);
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem('arcade_intro_wizard_step');
        window.localStorage.removeItem('arcade_intro_wizard_step_v2');
        window.localStorage.removeItem('arcade_intro_wizard_step_v3');
        return;
      }
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      const parsed = parseInt(stored, 10);
      if (!Number.isNaN(parsed) && parsed >= 0 && parsed < steps.length) {
        setStepIndex(parsed);
      }
    }
  }, [isWizardEnabled, pathname]);

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

  // Open the relevant staff sidebar tab when a step describes that section.
  useEffect(() => {
    if (!isWizardEnabled || dismissed || !currentStep) return;
    const tab =
      currentStep.selectTab ?? parseStaffTabFromIntroTourTarget(currentStep.target);
    if (!tab) return;
    const id = window.setTimeout(() => dispatchIntroTourSelectStaffTab(tab), 80);
    return () => window.clearTimeout(id);
  }, [isWizardEnabled, dismissed, currentStep, stepIndex, pathname]);
  const ready = currentStep ? canAdvance(currentStep, pathname) : false;
  const spotlightRect = useMemo(
    () => (currentStep?.target ? measureIntroTourTarget(currentStep.target) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- measureTick drives re-measure
    [currentStep?.target, pathname, stepIndex, ready],
  );
  const isWelcomeStep = currentStep?.id === 'welcome';
  const tourCardPlacement = useMemo(() => {
    if (isWelcomeStep) return getWelcomeTourCardPlacement();
    return getTourCardPlacement(spotlightRect);
  }, [isWelcomeStep, spotlightRect]);

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
      <IntroTourSpotlight
        targetId={currentStep.target}
        active={Boolean(currentStep.target) && !isWelcomeStep}
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
              {!isWelcomeStep ? (
                <div
                  className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/35 bg-primary/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-primary"
                  aria-hidden
                >
                  <MousePointerClick className="h-3.5 w-3.5 shrink-0" />
                  Try it out now
                </div>
              ) : null}
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex justify-between items-center w-full gap-3">
                <div className="text-xs font-semibold text-foreground/80 shrink-0">
                  {isWelcomeStep ? 'Getting started' : `Step ${stepIndex + 1} of ${steps.length}`}
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
                    {isLast ? 'Finish' : isWelcomeStep ? 'Start walkthrough' : 'Next'}
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
