
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Header from "@/components/layout/Header";
import { SiteFooter } from '@/components/layout/SiteFooter';
import { PortalChooseBackdrop } from '@/components/layout/PortalChooseBackdrop';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSearchParams } from 'next/navigation';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useAppContext } from '@/components/AppProvider';
import { cn } from '@/lib/utils';
import { isKioskPortraitDisplay } from '@/lib/kioskPortraitLayout';
import { ConfirmProvider } from '@/components/providers/ConfirmProvider';
import { isMarketingLandingPath } from '@/lib/marketingLandings';
import { shouldHideGlobalAppChrome } from '@/lib/officeRouting';
import { schoolPathAllowedByGate } from '@/lib/auth/schoolGatePathPolicy';
import { useTopEdgeRevealChrome } from '@/hooks/useTopEdgeRevealChrome';
import { useScrollTopRevealChrome } from '@/hooks/useScrollTopRevealChrome';
import { HoverRevealHeaderShell } from '@/components/layout/HoverRevealHeaderShell';
import { useStaffPortalLayoutMode } from '@/lib/staffPortal/useStaffPortalLayoutMode';
import { staffPortalMainClassName } from '@/components/staff/staffPortalNavStyles';
import { isCompactDisplayMode, isMobileDisplayMode } from '@/lib/displayMode';
import { useTranslation } from '@/components/providers/LocaleProvider';

// Lazy-load heavy, non-critical UI components to reduce initial JS bundle.
// AnimatedSiteBackground: 68 KB (30+ theme layer components)
// StaffAiHelpButton: 15 KB (only needed for staff sessions)
// IntroWizard: 8 KB (one-time onboarding overlay)
const IntroWizard = dynamic(
  () => import('../admin/IntroWizard').then(m => ({ default: m.IntroWizard })),
  { ssr: false }
);
const AnimatedSiteBackground = dynamic(
  () => import('@/components/themes/AnimatedSiteBackground').then(m => ({ default: m.AnimatedSiteBackground })),
  { ssr: false }
);
const StaffAiHelpButton = dynamic(
  () => import('@/components/support/StaffAiHelpButton').then(m => ({ default: m.StaffAiHelpButton })),
  { ssr: false }
);

const SERVICE_WORKER_PAGE_CACHE = 'levelup-offline-v1-pages';

function schoolGateScopesForLoginState(loginState: string): Set<string> {
    const scopes = new Set<string>();
    switch (loginState) {
        case 'developer':
            scopes.add('dev');
            break;
        case 'school':
            scopes.add('portal');
            break;
        case 'student':
            scopes.add('kiosk');
            break;
        case 'admin':
            scopes.add('admin');
            break;
        case 'teacher':
            scopes.add('teacher');
            break;
        case 'secretary':
            scopes.add('secretary');
            break;
        case 'prizeClerk':
            scopes.add('prizeClerk');
            break;
        case 'reports':
            scopes.add('reports');
            break;
        case 'librarian':
            scopes.add('librarian');
            break;
        case 'office':
            scopes.add('office');
            break;
        case 'houseCoordinator':
            scopes.add('houseCoordinator');
            break;
    }
    return scopes;
}

interface LayoutClientWrapperProps {
    children: React.ReactNode;
    /** Set from root layout when request host is `office.*` (clean URLs omit `/office`). */
    isOfficeHost?: boolean;
    /** Set from middleware + root layout for `/{school}/office` and office host. */
    hideGlobalHeader?: boolean;
}

/** Next.js requires `useSearchParams()` to sit under `<Suspense>` or dev SSR/recovery can loop with “missing required error components”. */
function LayoutChromeSuspenseFallback() {
    const { t } = useTranslation();
    return (
        <TooltipProvider>
            <div className="min-h-screen min-h-dvh flex flex-col bg-background">
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm font-medium animate-pulse">
                    {t('layout.loading')}
                </div>
            </div>
            <Toaster />
        </TooltipProvider>
    );
}

function LayoutClientWrapperInner({
    children,
    isOfficeHost = false,
    hideGlobalHeader = false,
}: LayoutClientWrapperProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { settings, isLoaded } = useSettings();
    const { loginState, schoolId: contextSchoolId, isKioskLocked, isInitialized } = useAppContext();
    const [nonCriticalUiReady, setNonCriticalUiReady] = useState(false);
    const devChunkReloadGuard = useRef(false);
    const isLoginPage =
      pathname === '/' ||
      pathname === '/contact' ||
      pathname === '/login' ||
      pathname === '/portal' ||
      pathname === '/office-bootstrap' ||
      pathname === '/developer' ||
      (typeof pathname === 'string' && pathname.includes('/student/welcome')) ||
      pathname.startsWith('/s/');

    const isSignInPage = typeof pathname === 'string' && /\/sign-in\/?$/.test(pathname);
    const isAdminSignInPage =
      typeof pathname === 'string' && /\/admin-sign-in\/?$/.test(pathname);
    const isPortalChoosePage =
      typeof pathname === 'string' && /\/portal\/?$/.test(pathname);
    /** Version / legal footer: in document flow (not fixed); only on login + portal hub */
    const showSiteFooter =
      pathname === '/login' || isSignInPage || isAdminSignInPage || isPortalChoosePage;
    const isStudentHomePage =
      typeof pathname === 'string' && /\/student-home(?:\/|$)/.test(pathname);
    /** In-school kiosk surfaces (/student, /prize) — locked viewport, internal scroll. */
    const isStudentKioskSurface =
      typeof pathname === 'string' && /\/(?:student|prize)(?:\/|$)/.test(pathname);
    /** Any student-facing rewards surface (kiosk + home portal). */
    const isStudentRewardsPage = isStudentKioskSurface || isStudentHomePage;
    const isKioskPortraitRoute =
      typeof pathname === 'string' &&
      !isStudentHomePage &&
      /\/(?:portal|student|prize)(?:\/|$)/.test(pathname);
    const kioskPortraitLayout = isKioskPortraitDisplay(settings) && isKioskPortraitRoute;
    const browserHost = typeof window !== 'undefined' ? window.location.host : '';
    const hideOfficeChrome =
      isOfficeHost || shouldHideGlobalAppChrome(pathname, browserHost) || hideGlobalHeader;
    const hideAppChrome =
      isLoginPage || isSignInPage || isMarketingLandingPath(pathname) || hideOfficeChrome;
    const hideHeaderEnabled = settings.hideSiteHeaderOutsidePortal === true;
    const isStaffPortalRoute =
      typeof pathname === 'string' &&
      /\/(?:admin|teacher|secretary|reports|prize-clerk|librarian)(?:\/|$)/.test(pathname);
    const { isWide: staffPortalWide } = useStaffPortalLayoutMode();
    const canShowGlobalHeader = !hideAppChrome;
    /** Student kiosk: top-edge hover reveal (locked viewport, internal scroll). */
    const useKioskHoverHeader = isStudentKioskSurface && canShowGlobalHeader;
    /** Hide header on scroll down; reveal at scroll top or when scrolling up. */
    const usePortalScrollHeader =
      hideHeaderEnabled && canShowGlobalHeader && !isStudentKioskSurface;
    const hoverGlobalHeaderVisible = useTopEdgeRevealChrome(useKioskHoverHeader);
    const sidebarScrollHeaderVisible = useScrollTopRevealChrome(usePortalScrollHeader);
    /** Staff portal “home” routes: same shell as admin (full-width `<main>`, inner pages use `max-w-7xl`). */
    const isStaffPortalShellRoot =
      typeof pathname === 'string' &&
      /\/(?:admin|teacher|secretary|reports)\/?$/.test(pathname);
    const appShellNoPageScroll =
      typeof pathname === 'string' &&
      !isStaffPortalShellRoot &&
      /\/(?:admin|teacher|prize-clerk|secretary|reports)(?:\/|$)/.test(pathname);

    const fullscreen = searchParams?.get('fullscreen') === '1';
    const isClassroomScreenPage =
      typeof pathname === 'string' && pathname.includes('/classroom-screen');
    const isSmartScreenPage =
      typeof pathname === 'string' &&
      (pathname.includes('/smart-screen') || pathname.includes('/displays'));
    const isFullscreenSpecialPage =
      isClassroomScreenPage ||
      isSmartScreenPage ||
      (fullscreen &&
        (pathname?.includes('/hall-of-fame') ||
          pathname?.includes('/bulletin-board') ||
          pathname?.includes('/displays') ||
          pathname?.includes('/classroom')));

    const schoolPathMatch =
      typeof pathname === 'string'
        ? pathname.match(
            /^\/([^/]+)\/(?:portal|student|student-home|teacher|admin|admin-sign-in|prize|secretary|prize-clerk|reports|sign-in|hall-of-fame|bulletin-board|smart-screen|displays|office)(?:\/|$)/i,
          )
        : null;
    const routeSchoolId = schoolPathMatch?.[1];
    const routeSchoolIdLower = routeSchoolId?.trim().toLowerCase() || '';
    const contextSchoolIdLower = contextSchoolId?.trim().toLowerCase() || '';
    const schoolScopedChromePending = Boolean(
      routeSchoolIdLower &&
      (!isInitialized ||
        loginState === 'loggedOut' ||
        (loginState !== 'developer' && contextSchoolIdLower !== routeSchoolIdLower) ||
        (loginState !== 'developer' &&
          !schoolPathAllowedByGate(
            pathname,
            routeSchoolIdLower,
            schoolGateScopesForLoginState(loginState),
          ))),
    );
    const shouldRenderGlobalHeader = canShowGlobalHeader && !schoolScopedChromePending;

    const dockSchoolId = contextSchoolId ?? routeSchoolId ?? null;
    const compactDisplay = isCompactDisplayMode(settings.displayMode);
    const mobileDisplay = isMobileDisplayMode(settings.displayMode);
    const showPortalBottomDockPadding =
      compactDisplay &&
      isInitialized &&
      !!dockSchoolId &&
      loginState !== 'loggedOut' &&
      loginState !== 'student' &&
      !isKioskLocked &&
      !hideAppChrome &&
      !isStudentRewardsPage &&
      !isFullscreenSpecialPage;
    const useCompactSiteFooter = compactDisplay && isPortalChoosePage;

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
            `/${routeSchoolId}/admin-sign-in`,
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

    // Offline support is production-only by default. Local dev keeps unregistering
    // service workers so stale Next chunks from old builds do not break HMR.
    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

        const serviceWorkerOverride = process.env.NEXT_PUBLIC_ENABLE_SERVICE_WORKER;
        const serviceWorkerEnabled =
            process.env.NODE_ENV === 'production' ||
            serviceWorkerOverride === 'true' ||
            serviceWorkerOverride === '1';

        if (!serviceWorkerEnabled) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                for (let registration of registrations) {
                    registration.unregister();
                }
            });
            if ('caches' in window) {
                void caches.keys().then((keys) =>
                    Promise.all(
                        keys
                            .filter((name) => name.startsWith('levelup-'))
                            .map((name) => caches.delete(name)),
                    ),
                );
            }
            return;
        }

        let cancelled = false;
        const hadController = !!navigator.serviceWorker.controller;
        let refreshingForUpdate = false;
        let removeOnlineUpdateListener: (() => void) | undefined;

        const onControllerChange = () => {
            if (!hadController || refreshingForUpdate) return;
            refreshingForUpdate = true;
            window.location.reload();
        };

        const warmCurrentPage = (registration: ServiceWorkerRegistration) => {
            const worker = registration.active || registration.waiting || registration.installing;
            worker?.postMessage({
                type: 'LEVELUP_CACHE_URLS',
                urls: [window.location.href],
            });
            if ('caches' in window) {
                void fetch(window.location.href, { credentials: 'same-origin' })
                    .then((response) => {
                        if (!response.ok) return undefined;
                        return caches
                            .open(SERVICE_WORKER_PAGE_CACHE)
                            .then((cache) => cache.put(window.location.href, response));
                    })
                    .catch(() => undefined);
            }
        };

        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

        navigator.serviceWorker
            .register('/sw.js?v=levelup-offline-v1', { scope: '/' })
            .then((registration) => {
                if (cancelled) return;
                const update = () => registration.update().catch(() => {});
                window.addEventListener('online', update);
                removeOnlineUpdateListener = () => window.removeEventListener('online', update);
                void navigator.serviceWorker.ready.then((readyRegistration) => {
                    if (!cancelled) warmCurrentPage(readyRegistration);
                });
            })
            .catch((error) => {
                if (process.env.NODE_ENV === 'development') {
                    console.warn('[ServiceWorker] Registration failed:', error);
                }
            });

        return () => {
            cancelled = true;
            removeOnlineUpdateListener?.();
            navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
        };
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
                    data-kiosk-portrait={kioskPortraitLayout ? 'true' : undefined}
                    className={cn(
                        'min-h-screen min-h-dvh flex flex-col',
                        kioskPortraitLayout && 'kiosk-portrait-layout',
                        // Lock viewport height so only inner panels scroll (student kiosk + app-shell staff routes).
                        // Portal hub: fixed layers + in-flow footer — constrain shell so main flex-1 fills without a page scrollbar.
                        (appShellNoPageScroll || isStudentKioskSurface || isPortalChoosePage) &&
                            'h-dvh max-h-dvh',
                        (appShellNoPageScroll || isStudentKioskSurface) &&
                            'overflow-hidden overflow-x-hidden',
                        isPortalChoosePage && 'overflow-x-hidden',
                    )}
                >
                    {isPortalChoosePage ? <PortalChooseBackdrop /> : null}
                    {shouldRenderGlobalHeader &&
                        !isFullscreenSpecialPage &&
                        (useKioskHoverHeader ? (
                            <HoverRevealHeaderShell
                                visible={hoverGlobalHeaderVisible}
                                peekWhenHidden={!isStaffPortalRoute}
                                layout="overlay"
                            >
                                <Header />
                            </HoverRevealHeaderShell>
                        ) : usePortalScrollHeader ? (
                            <HoverRevealHeaderShell
                                visible={sidebarScrollHeaderVisible}
                                peekWhenHidden={true}
                                layout="overlay"
                            >
                                <Header />
                            </HoverRevealHeaderShell>
                        ) : (
                            <Header />
                        ))}
                    <main
                        id="screen-view"
                        className={cn(
                            'flex-1 min-w-0',
                            usePortalScrollHeader && 'pt-[var(--global-header-height,5rem)]',
                            hideAppChrome || isAdminSignInPage
                                ? 'relative z-10 flex w-full flex-col'
                                : isStudentKioskSurface
                                    ? 'relative z-10 flex w-full min-h-0 flex-col overflow-hidden'
                                    : isStaffPortalRoute
                                        ? staffPortalMainClassName(staffPortalWide)
                                        : isStudentHomePage
                                            ? 'relative z-10 mx-auto w-full max-w-7xl'
                                        : isPortalChoosePage || isSmartScreenPage
                                            ? 'relative z-10 w-full max-w-none'
                                            : 'relative z-10 mx-auto w-full max-w-7xl',
                            appShellNoPageScroll && 'overflow-hidden flex flex-col min-h-0',
                            isPortalChoosePage && 'min-h-0 flex flex-col overflow-hidden',
                            showPortalBottomDockPadding && 'pb-24'
                        )}
                    >
                        {children}
                    </main>
                    {showSiteFooter && (
                        <div className="relative z-10 mt-auto shrink-0 no-print">
                            <SiteFooter
                                compact={useCompactSiteFooter}
                                staffPortalWide={isStaffPortalRoute && staffPortalWide}
                            />
                        </div>
                    )}
                    {nonCriticalUiReady && settings.showIntroWizard && <IntroWizard />}
                    {nonCriticalUiReady &&
                      !hideAppChrome &&
                      !isFullscreenSpecialPage &&
                      !isStudentRewardsPage &&
                      !mobileDisplay && <StaffAiHelpButton />}
                    {!hideAppChrome &&
                      !isFullscreenSpecialPage &&
                      !mobileDisplay &&
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

export default function LayoutClientWrapper({
    children,
    isOfficeHost,
    hideGlobalHeader,
}: LayoutClientWrapperProps) {
    return (
        <Suspense fallback={<LayoutChromeSuspenseFallback />}>
            <LayoutClientWrapperInner
                isOfficeHost={isOfficeHost}
                hideGlobalHeader={hideGlobalHeader}
            >
                {children}
            </LayoutClientWrapperInner>
        </Suspense>
    );
}
