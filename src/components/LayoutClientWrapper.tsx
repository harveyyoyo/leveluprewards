
'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Header from "@/components/Header";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import dynamic from 'next/dynamic';
import { useSettings } from './providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { ConfirmProvider } from '@/components/providers/ConfirmProvider';

const IntroWizard = dynamic(() => import('./IntroWizard').then(m => m.IntroWizard), { ssr: false });
const AnimatedSiteBackground = dynamic(() => import('@/components/AnimatedSiteBackground').then(m => m.AnimatedSiteBackground), { ssr: false });

interface LayoutClientWrapperProps {
    children: React.ReactNode;
}

export default function LayoutClientWrapper({ children }: LayoutClientWrapperProps) {
    const pathname = usePathname();
    const { settings } = useSettings();
    const isLoginPage = pathname === '/' || pathname.startsWith('/s/');

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
                    id="arcade-backdrop-host"
                    className="arcade-animated-site-bg no-print pointer-events-none fixed inset-0 min-h-0 w-full overflow-visible"
                    aria-hidden
                />
                <div data-app-view-root className="min-h-screen flex flex-col">
                    {!isLoginPage && <Header />}
                    <main id="screen-view" className={cn(
                        isLoginPage ? "flex-1" : "flex-1 w-full max-w-7xl mx-auto relative z-10",
                        settings.displayMode === 'app' && 'pb-24'
                    )}>
                        {children}
                    </main>
                    <IntroWizard />
                </div>
                <AnimatedSiteBackground />
            </ConfirmProvider>
            <Toaster />
        </TooltipProvider>
    );
}
