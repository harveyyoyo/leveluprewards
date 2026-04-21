
'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import Header from "@/components/Header";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { IntroWizard } from './IntroWizard';
import { useSettings } from './providers/SettingsProvider';
import { globalAnimatedBackdropActive } from '@/lib/animatedBackdrop';
import { cn } from '@/lib/utils';
import { GlobalSoundListener } from '@/components/GlobalSoundListener';

// 65 KB of animation layers — render purely client-side so the initial HTML
// ships without it and the bundle only loads when a page actually mounts.
const AnimatedSiteBackground = dynamic(
    () => import('@/components/AnimatedSiteBackground').then((m) => m.AnimatedSiteBackground),
    { ssr: false },
);

interface LayoutClientWrapperProps {
    children: React.ReactNode;
}

export default function LayoutClientWrapper({ children }: LayoutClientWrapperProps) {
    const pathname = usePathname();
    const { settings, visualSettings, isLoaded } = useSettings();
    const isLoginPage = pathname === '/' || pathname.startsWith('/s/');
    const animBackdropSite = isLoaded && globalAnimatedBackdropActive(visualSettings);

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

    // Let the global backdrop show through (see unlayered rules in globals.css). useLayoutEffect avoids a painted frame without the html hook class.
    useLayoutEffect(() => {
        const root = document.documentElement;
        root.classList.toggle('animated-backdrop-site', animBackdropSite);
        return () => root.classList.remove('animated-backdrop-site');
    }, [animBackdropSite]);

    return (
        <TooltipProvider>
            <div
                data-app-shell="root"
                className={cn('min-h-screen flex flex-col relative', animBackdropSite && 'bg-transparent')}
            >
                {animBackdropSite && <AnimatedSiteBackground />}
                <GlobalSoundListener />
                {!isLoginPage && <Header />}
                <main id="screen-view" className={cn(
                    isLoginPage ? "flex-1" : "flex-1 w-full max-w-7xl mx-auto relative z-10",
                    settings.displayMode === 'app' && 'pb-24',
                    animBackdropSite && 'bg-transparent'
                )}>
                    <motion.div
                        key={pathname}
                        data-motion-page-shell
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className={cn('h-full', animBackdropSite && 'bg-transparent')}
                    >
                        {children}
                    </motion.div>
                </main>
                <IntroWizard />
            </div>
            <Toaster />
        </TooltipProvider>
    );
}
