
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Header from "@/components/Header";
import { SiteFooter } from '@/components/SiteFooter';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSearchParams } from 'next/navigation';
import { useSettings } from './providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { ConfirmProvider } from '@/components/providers/ConfirmProvider';
import { isMarketingLandingPath } from '@/lib/marketingLandings';

// Lazy-load heavy, non-critical UI components to reduce initial JS bundle.
// AnimatedSiteBackground: 68 KB (30+ theme layer components)
// StaffAiHelpButton: 15 KB (only needed for staff sessions)
// IntroWizard: 8 KB (one-time onboarding overlay)
const IntroWizard = dynamic(
  () => import('./IntroWizard').then(m => ({ default: m.IntroWizard })),
  { ssr: false }
);
const AnimatedSiteBackground = dynamic(
  () => import('@/components/AnimatedSiteBackground').then(m => ({ default: m.AnimatedSiteBackground })),
  { ssr: false }
);
const StaffAiHelpButton = dynamic(
  () => import('@/components/StaffAiHelpButton').then(m => ({ default: m.StaffAiHelpButton })),
  { ssr: false }
);

interface LayoutClientWrapperProps {
    children: React.ReactNode;
}

/** Next.js requires `useSearchParams()` to sit under `<Suspense>` or dev SSR/recovery can loop with “missing required error components”. */
function LayoutChromeSuspenseFallback() {
    return (
        <TooltipProvider>
            <div className="min-h-screen min-h-dvh flex flex-col bg-background">
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm font-medium animate-pulse">
                    Loading…
                </div>
            </div>
            <Toaster />
        </TooltipProvider>
    );
}

function LayoutClientWrapperInner({ children }: LayoutClientWrapperProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { settings, isLoaded } = useSettings();
    const [nonCriticalUiReady, setNonCriticalUiReady] = useState(false);
    const [studentChromeVisible, setStudentChromeVisible] = useState(false);
    const studentChromeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const devChunkReloadGuard = useRef(false);
    const isLoginPage =
      pathname === '/' ||
      pathname === '/login' ||
      pathname === '/developer' ||
      (typeof pathname === 'string' && pathname.includes('/student/welcome')) ||
      pathname.startsWith('/s/');

    const isSignInPage = typeof pathname === 'string' && /\/sign-in\/?$/.test(pathname);
    const isAdminSignInPage =
      typeof pathname === 'string' && /\/admin-signin\/?$/.test(pathname);
    const isPortalChoosePage =
      typeof pathname === 'string' && /\/portal\/?$/.test(pathname);
    /** Version / legal footer: in document flow (not fixed); only on login + portal hub */
    const showSiteFooter =
      pathname === '/login' || isSignInPage || isAdminSignInPage || isPortalChoosePage;
    const isStudentKioskPage =
      typeof pathname === 'string' &&
      /\/(?:student|student-home|prize)(?:\/|$)/.test(pathname);
    /** Staff portal “home” routes: same shell as admin (full-width `<main>`, inner pages use `max-w-7xl`). */
    const isStaffPortalShellRoot =
      typeof pathname === 'string' &&
      /\/(?:admin|teacher|secretary|reports)\/?$/.test(pathname);
    const hideAppChrome =
      isLoginPage || isSignInPage || isMarketingLandingPath(pathname);
    const appShellNoPageScroll =
      typeof pathname === 'string' &&
      !isStaffPortalShellRoot &&
      /\/(?:admin|teacher|prize-clerk|secretary|reports)(?:\/|$)/.test(pathname);

    const fullscreen = searchParams?.get('fullscreen') === '1';
    const isFullscreenSpecialPage =
      fullscreen && (pathname?.includes('/halloffame') || pathname?.includes('/bulletin-board'));

    const schoolPathMatch =
      typeof pathname === 'string'
        ? pathname.match(/^\/([^/]+)\/(?:portal|student|student-home|teacher|admin|admin-signin|prize|secretary|prize-clerk|reports)(?:\/|$)/i)
        : null;
    const routeSchoolId = schoolPathMatch?.[1];

    useEffect(() => {
        const runWhenIdle = (cb: () => void, timeout = 1200) => {
            if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
                const id = window.requestIdleCallback(cb, { timeout });
                return () => window.cancelIdleCallback(id);
            }
            const id = globalThis.setTimeout(cb, Math.min(timeout, 800));
            return () => globalThis.clearTimeout(id);
        };

        return runWhenIdle(() => setNonCriticalUiReady(true));
    }, []);

    useEffect(() => {
        if (!routeSchoolId) return;
        const routes = [
            `/${routeSchoolId}/portal`,
            `/${routeSchoolId}/student`,
            `/${routeSchoolId}/teacher`,
            `/${routeSchoolId}/admin-signin`,
            `/${routeSchoolId}/prize`,
        ];
        const runWhenIdle = (cb: () => void) => {
            if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
                const id = window.requestIdleCallback(cb, { timeout: 2500 });
                return () => window.cancelIdleCallback(id);
            }
            const id = globalThis.setTimeout(cb, 1200);
            return () => globalThis.clearTimeout(id);
        };

        return runWhenIdle(() => {
            for (const route of routes) {
                if (route !== pathname) router.prefetch(route);
            }
        });
    }, [pathname, routeSchoolId, router]);

    useEffect(() => {
        if (!isStudentKioskPage || hideAppChrome) {
            setStudentChromeVisible(false);
            if (studentChromeTimerRef.current) {
                clearTimeout(studentChromeTimerRef.current);
                studentChromeTimerRef.current = null;
            }
            return;
        }

        const revealChrome = () => {
            // Already visible — skip redundant state update + timer reset.
            // This eliminates ~95% of setState calls from high-frequency mousemove.
            if (studentChromeTimerRef.current) return;
            setStudentChromeVisible(true);
            studentChromeTimerRef.current = setTimeout(() => {
                setStudentChromeVisible(false);
                studentChromeTimerRef.current = null;
            }, 2500);
        };

        window.addEventListener('mousemove', revealChrome, { passive: true });
        return () => {
            window.removeEventListener('mousemove', revealChrome);
            if (studentChromeTimerRef.current) {
                clearTimeout(studentChromeTimerRef.current);
                studentChromeTimerRef.current = null;
            }
        };
    }, [hideAppChrome, isStudentKioskPage]);

    // Unregister service workers to prevent stale cache issues
    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function (registrations) {
                for (let registration of registrations) {
                    registration.unregister();
                }
            });
        }
    }, []);

    /**
     * Dev-only: after HMR / `.next` clean, the document can reference old `/_next/static/*`
     * chunk hashes → 404 script/CSS and a broken shell. One or two full reloads pick up
     * the new manifest (matches StudentScanner chunk-recovery pattern).
     */
    useEffect(() => {
        if (process.env.NODE_ENV !== 'development') return;

        const STORAGE_KEY = 'lvlup-dev-chunk-reload-count';
        const maxRetries = 2;

        const bumpAndReload = () => {
            if (devChunkReloadGuard.current) return;
            devChunkReloadGuard.current = true;
            try {
                const n = Number(sessionStorage.getItem(STORAGE_KEY) || '0');
                if (n >= maxRetries) return;
                sessionStorage.setItem(STORAGE_KEY, String(n + 1));
                window.location.reload();
            } catch {
                window.location.reload();
            }
        };

        const chunkRelated = (msg: string, name?: string) =>
            name === 'ChunkLoadError' ||
            /chunk load/i.test(msg) ||
            /loading chunk/i.test(msg) ||
            /failed to fetch dynamically imported module/i.test(msg);

        const onWindowError = (ev: ErrorEvent) => {
            const msg = String(ev.message || ev.error?.message || '');
            const name = ev.error?.name || '';
            if (chunkRelated(msg, name)) bumpAndReload();
        };

        const onRejection = (ev: PromiseRejectionEvent) => {
            const r = ev.reason;
            const msg =
                typeof r?.message === 'string'
                    ? r.message
                    : typeof r === 'string'
                      ? r
                      : '';
            const name = r?.name || '';
            if (chunkRelated(msg, name)) bumpAndReload();
        };

        /** Captures failed `<script>` / `<link>` loads (e.g. stale chunk hash → HTTP 404). */
        const onResourceErrorCapture = (ev: Event) => {
            const el = ev.target as HTMLElement | undefined;
            if (!el) return;
            if (el.tagName === 'SCRIPT') {
                const src = (el as HTMLScriptElement).src || '';
                if (src.includes('/_next/static/')) bumpAndReload();
            }
            if (el.tagName === 'LINK') {
                const href = (el as HTMLLinkElement).href || '';
                if (href.includes('/_next/static/')) bumpAndReload();
            }
        };

        window.addEventListener('error', onWindowError);
        window.addEventListener('unhandledrejection', onRejection);
        document.addEventListener('error', onResourceErrorCapture, true);
        return () => {
            window.removeEventListener('error', onWindowError);
            window.removeEventListener('unhandledrejection', onRejection);
            document.removeEventListener('error', onResourceErrorCapture, true);
        };
    }, []);

    return (
        <TooltipProvider>
            <ConfirmProvider>
                <div
                    className={cn(
                        'min-h-screen min-h-dvh flex flex-col',
                        // Lock viewport height so only inner panels scroll (student kiosk + app-shell staff routes).
                        // Portal hub: fixed layers + in-flow footer — constrain shell so main flex-1 fills without a page scrollbar.
                        (appShellNoPageScroll || isStudentKioskPage || isPortalChoosePage) &&
                            'h-dvh max-h-dvh overflow-hidden'
                    )}
                >
                    {!hideAppChrome && (
                        isStudentKioskPage ? (
                            <div
                                className={cn(
                                    'fixed inset-x-0 top-0 z-[200] transition-opacity duration-300 no-print',
                                    studentChromeVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                                )}
                                aria-hidden={!studentChromeVisible}
                            >
                                <Header />
                            </div>
                        ) : (
                            <Header />
                        )
                    )}
                    <main
                        id="screen-view"
                        className={cn(
                            'flex-1 min-w-0',
                            /* Login / sign-in / admin-signin: full-width shell so pages can center their own content */
                            hideAppChrome || isAdminSignInPage
                                ? 'relative z-10 flex w-full flex-col'
                                : isStudentKioskPage
                                    ? 'relative z-10 flex w-full min-h-0 flex-col overflow-hidden'
                                    : isStaffPortalShellRoot
                                        ? 'relative z-10 w-full max-w-none'
                                        : 'relative z-10 mx-auto w-full max-w-7xl',
                            appShellNoPageScroll && 'overflow-hidden flex flex-col min-h-0',
                            isPortalChoosePage && 'min-h-0 flex flex-col',
                            settings.displayMode === 'app' &&
                                !isStudentKioskPage &&
                                !isPortalChoosePage &&
                                'pb-24'
                        )}
                    >
                        {children}
                    </main>
                    {showSiteFooter && (
                        <div className="relative z-10 mt-auto shrink-0 no-print">
                            <SiteFooter />
                        </div>
                    )}
                    {nonCriticalUiReady && settings.showIntroWizard && <IntroWizard />}
                    {nonCriticalUiReady && !hideAppChrome && !isFullscreenSpecialPage && !isStudentKioskPage && <StaffAiHelpButton />}
                    {!hideAppChrome &&
                      !isFullscreenSpecialPage &&
                      // Prevent a "flash of animated background" before settings hydrate from storage.
                      nonCriticalUiReady &&
                      isLoaded &&
                      settings.enableAnimatedBackground && <AnimatedSiteBackground />}
                </div>
            </ConfirmProvider>
            <Toaster />
        </TooltipProvider>
    );
}

export default function LayoutClientWrapper({ children }: LayoutClientWrapperProps) {
    return (
        <Suspense fallback={<LayoutChromeSuspenseFallback />}>
            <LayoutClientWrapperInner>{children}</LayoutClientWrapperInner>
        </Suspense>
    );
}
