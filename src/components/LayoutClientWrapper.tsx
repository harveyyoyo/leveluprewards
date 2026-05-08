
'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Header from "@/components/Header";
import { SiteFooter } from '@/components/SiteFooter';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSearchParams } from 'next/navigation';
import { useSettings } from './providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { ConfirmProvider } from '@/components/providers/ConfirmProvider';

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

export default function LayoutClientWrapper({ children }: LayoutClientWrapperProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { settings, isLoaded } = useSettings();
    const [studentChromeVisible, setStudentChromeVisible] = useState(false);
    const studentChromeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    const isAdminDashboardPage =
      typeof pathname === 'string' &&
      /\/admin\/?$/.test(pathname);
    const hideAppChrome = isLoginPage || isSignInPage;
    const appShellNoPageScroll =
      typeof pathname === 'string' &&
      !isAdminDashboardPage &&
      /\/(?:admin|teacher|prize-clerk|secretary|reports)(?:\/|$)/.test(pathname);

    const fullscreen = searchParams?.get('fullscreen') === '1';
    const isFullscreenSpecialPage =
      fullscreen && (pathname?.includes('/halloffame') || pathname?.includes('/bulletin-board'));

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

    return (
        <TooltipProvider>
            <ConfirmProvider>
                <div
                    className={cn(
                        'min-h-screen min-h-dvh flex flex-col',
                        // For app-shell routes, lock viewport height so only inner panels scroll.
                        appShellNoPageScroll && 'h-dvh overflow-hidden'
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
                            /* Login / sign-in: full-width shell so pages can center their own content */
                            hideAppChrome
                                ? 'relative z-10 flex w-full flex-col'
                                : isStudentKioskPage
                                    ? 'relative z-10 flex w-full min-h-0 flex-col'
                                    : isAdminDashboardPage
                                        ? 'relative z-10 w-full max-w-none'
                                        : 'relative z-10 mx-auto w-full max-w-7xl',
                            appShellNoPageScroll && 'overflow-hidden flex flex-col min-h-0',
                            settings.displayMode === 'app' && !isStudentKioskPage && 'pb-24'
                        )}
                    >
                        {children}
                    </main>
                    {showSiteFooter && (
                        <div className="relative z-10 mt-auto shrink-0 no-print">
                            <SiteFooter />
                        </div>
                    )}
                    <IntroWizard />
                    {!hideAppChrome && !isFullscreenSpecialPage && <StaffAiHelpButton />}
                    {!hideAppChrome &&
                      !isFullscreenSpecialPage &&
                      // Prevent a "flash of animated background" before settings hydrate from storage.
                      isLoaded &&
                      settings.enableAnimatedBackground && <AnimatedSiteBackground />}
                </div>
            </ConfirmProvider>
            <Toaster />
        </TooltipProvider>
    );
}
