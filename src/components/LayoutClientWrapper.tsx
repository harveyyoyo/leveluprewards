
'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Header from "@/components/Header";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { IntroWizard } from './IntroWizard';
import { useSettings } from './providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { ConfirmProvider } from '@/components/providers/ConfirmProvider';
import { AnimatedSiteBackground } from '@/components/AnimatedSiteBackground';
import { StaffAiHelpButton } from '@/components/StaffAiHelpButton';

interface LayoutClientWrapperProps {
    children: React.ReactNode;
}

export default function LayoutClientWrapper({ children }: LayoutClientWrapperProps) {
    const pathname = usePathname();
    const { settings } = useSettings();
    const isLoginPage =
      pathname === '/' ||
      pathname === '/login' ||
      pathname === '/developer' ||
      (typeof pathname === 'string' && pathname.includes('/student/welcome')) ||
      pathname.startsWith('/s/');

    const isSignInPage = typeof pathname === 'string' && /\/sign-in\/?$/.test(pathname);
    const hideAppChrome = isLoginPage || isSignInPage;

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
                {!hideAppChrome && <Header />}
                <main id="screen-view" className={cn(
                    /* Login / sign-in: full-width shell so pages can center their own content */
                    hideAppChrome
                      ? 'relative z-10 flex min-h-screen min-w-0 w-full flex-col'
                      : 'relative z-10 mx-auto w-full max-w-7xl flex-1',
                    settings.displayMode === 'app' && 'pb-24'
                )}>
                    {children}
                </main>
                <IntroWizard />
                {!hideAppChrome && <StaffAiHelpButton />}
                {!hideAppChrome && <AnimatedSiteBackground />}
            </ConfirmProvider>
            <Toaster />
        </TooltipProvider>
    );
}
