
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
    const isLoginPage = pathname === '/' || pathname === '/login' || pathname === '/developer' || pathname.startsWith('/s/');

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
                {!isLoginPage && <Header />}
                <main id="screen-view" className={cn(
                    isLoginPage ? "flex-1" : "flex-1 w-full max-w-7xl mx-auto relative z-10",
                    settings.displayMode === 'app' && 'pb-24'
                )}>
                    {children}
                </main>
                <IntroWizard />
                {!isLoginPage && <StaffAiHelpButton />}
                {!isLoginPage && <AnimatedSiteBackground />}
            </ConfirmProvider>
            <Toaster />
        </TooltipProvider>
    );
}
