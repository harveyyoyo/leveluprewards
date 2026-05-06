'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSettings } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { Megaphone, ExternalLink } from 'lucide-react';

/**
 * KioskSponsorBanner
 * Displays a highly visible sponsor or announcement banner.
 * Supports date-specific schedules and standard fallback options.
 */
export interface SponsorPreviewOverride {
    message: string;
    link?: string;
    logoUrl?: string;
    speed?: string;
    position?: string;
    bannerStyle?: string;
    icon?: string;
}

function sponsorFallbackMessage(logoUrl?: string, link?: string) {
    if (logoUrl || link) return 'Thanks to our sponsor';
    return '';
}

export function KioskSponsorBanner({ className, previewOverride }: { className?: string, previewOverride?: SponsorPreviewOverride }) {
    const { settings } = useSettings();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Check if there is a specific sponsor scheduled for today
    const localDate = new Date().toLocaleDateString('en-CA'); // "YYYY-MM-DD"
    const matchedSchedule = (settings.kioskSponsorSchedules || []).find(s => s.date === localDate);

    // Combine properties from preview, matched schedule, or use fallback
    const logoUrl = previewOverride ? previewOverride.logoUrl : (matchedSchedule ? matchedSchedule.logoUrl : settings.kioskSponsorLogoUrl);
    const link = previewOverride ? previewOverride.link : (matchedSchedule ? matchedSchedule.link : settings.kioskSponsorLink);
    const rawMessage = previewOverride ? previewOverride.message : (matchedSchedule ? matchedSchedule.message : settings.kioskSponsorMessage);
    const msg = (rawMessage?.trim() || sponsorFallbackMessage(logoUrl, link));
    const speed = previewOverride ? previewOverride.speed : (matchedSchedule ? matchedSchedule.speed : (settings.kioskSponsorSpeed || 'normal'));
    const position = previewOverride ? previewOverride.position : (matchedSchedule ? matchedSchedule.position : (settings.kioskSponsorPosition || 'bottom'));
    const bannerStyle = previewOverride ? previewOverride.bannerStyle : (matchedSchedule ? matchedSchedule.bannerStyle : (settings.kioskSponsorBannerStyle || 'primary'));
    const icon = previewOverride ? previewOverride.icon : (matchedSchedule ? matchedSchedule.icon : settings.kioskSponsorIcon);

    // If we are not in preview mode, require explicit enablement.
    // Schedules should not auto-show unless the sponsor banner is enabled.
    if (!previewOverride && !settings.kioskSponsorEnabled) {
        return null;
    }

    // If we are not in preview mode, and there is no schedule and no content, hide it.
    if (!previewOverride && !matchedSchedule && !msg) {
        return null;
    }

    if (!msg) return null;

    // Visual Style Presets with extremely strong readability and premium aesthetic.
    // globals.css forces .font-extrabold / .font-black to hsl(--primary); on bg-primary that
    // washes out text. Each preset re-asserts the intended text color on those utilities.
    const styleMap: Record<string, string> = {
        subtle:
            'bg-slate-100 border-slate-300 text-slate-800 dark:bg-slate-900/90 dark:text-slate-100 dark:border-slate-800 [&_.font-extrabold]:text-slate-800 [&_.font-black]:text-slate-800 dark:[&_.font-extrabold]:text-slate-100 dark:[&_.font-black]:text-slate-100',
        neon_gold:
            'bg-black border-amber-400 text-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.35)] [&_.font-extrabold]:text-amber-300 [&_.font-black]:text-amber-300',
        electric:
            'bg-blue-950 border-blue-400 text-blue-50 shadow-[0_0_25px_rgba(59,130,246,0.35)] [&_.font-extrabold]:text-blue-50 [&_.font-black]:text-blue-50',
        gradient:
            'bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-700 text-white border-pink-400 [&_.font-extrabold]:text-white [&_.font-black]:text-white',
        glass:
            'bg-white/50 dark:bg-black/40 backdrop-blur-2xl border-white/30 text-foreground shadow-xl [&_.font-extrabold]:text-foreground [&_.font-black]:text-foreground',
        primary:
            'bg-primary border-primary-foreground/30 text-primary-foreground shadow-2xl [&_.font-extrabold]:text-primary-foreground [&_.font-black]:text-primary-foreground',
    };

    // Speed durations
    const speedDurations: Record<string, string> = {
        slow: '40s',
        normal: '22s',
        fast: '14s',
        very_fast: '8s',
        static: '0s',
    };

    const isStatic = speed === 'static';
    const isPreview = !!previewOverride;
    const isAppMode = settings.displayMode === 'app';

    const bannerStyleClass = (bannerStyle && styleMap[bannerStyle]) || styleMap.primary;

    // In app mode, sit above the bottom tab bar so the banner is fully visible across the row.
    const bottomPlacement =
        !isPreview && position === 'bottom'
            ? isAppMode
                ? 'bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] top-auto border-t-2'
                : 'bottom-0 top-auto border-t-2'
            : '';

    // In preview mode, use a relative wrapper instead of fixed, and rounded corners
    const wrapperClasses = isPreview
        ? cn(
              'relative flex w-full items-center justify-center overflow-hidden select-none rounded-xl border-2',
              bannerStyleClass,
              className,
          )
        : cn(
              'fixed inset-x-0 z-[90] flex w-full min-w-0 items-center justify-center overflow-hidden select-none',
              position === 'top' ? 'top-20 bottom-auto border-b-2' : bottomPlacement,
              bannerStyleClass,
              className,
          );

    const logoOrBadge = logoUrl ? (
        <img
            src={logoUrl}
            alt="Sponsor logo"
            className="h-8 w-auto max-w-[100px] object-contain shrink-0 filter drop-shadow-sm"
        />
    ) : (
        <div className="flex items-center gap-2 shrink-0 rounded-lg bg-black/15 px-3 py-1.5 dark:bg-white/15 backdrop-blur-sm border border-black/10 dark:border-white/10">
            {icon ? (
                <span className="text-xl shrink-0">{icon}</span>
            ) : (
                <Megaphone className="w-5 h-5 shrink-0 opacity-100" aria-hidden="true" />
            )}
            <span className="text-xs font-black uppercase tracking-[0.2em] opacity-95 whitespace-nowrap">Sponsor</span>
        </div>
    );

    const banner = (
        <div
            className={wrapperClasses}
            aria-label="Sponsor message"
            role="marquee"
            style={{ height: '3.75rem' }}
        >
            {isStatic ? (
                <div className="flex h-full w-full min-w-0 items-center justify-center gap-3 px-4 sm:gap-5 sm:px-8">
                    {logoOrBadge}
                    <span className="text-center text-base font-extrabold tracking-wide md:text-lg min-w-0 max-w-[min(100%,42rem)] truncate">
                        {msg}
                    </span>
                    {link && (
                        <a
                            href={link.startsWith('http') ? link : `https://${link}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs md:text-sm font-black flex items-center gap-1.5 bg-black/25 hover:bg-black/35 dark:bg-white/15 dark:hover:bg-white/25 px-4 py-1.5 rounded-full transition-all shrink-0 shadow-sm border border-white/10"
                        >
                            <span>Learn more</span>
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    )}
                </div>
            ) : (
                <div className="flex h-full w-full min-w-0 items-center justify-center gap-3 px-3 sm:gap-4 sm:px-6">
                    {logoUrl ? logoOrBadge : null}
                    <div className="min-w-0 flex-1 overflow-hidden relative flex items-center justify-center h-full">
                        <div
                            className="flex whitespace-nowrap animate-sponsor-scroll"
                            style={{
                                animationDuration: (speed && speedDurations[speed]) || '22s',
                                willChange: 'transform',
                            }}
                        >
                            {[0, 1].map((i) => (
                                <span
                                    key={i}
                                    className="text-base md:text-lg font-extrabold tracking-wide flex items-center gap-10 px-16 h-full"
                                    aria-hidden={i === 1}
                                >
                                    <span className="flex items-center gap-3">
                                        {icon && <span className="text-xl shrink-0">{icon}</span>}
                                        <span>{msg}</span>
                                    </span>
                                    {link && (
                                        <span className="text-xs md:text-sm font-black opacity-90 flex items-center gap-1.5 border-b-2 border-dashed border-current pb-0.5">
                                            Visit: {link}
                                        </span>
                                    )}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    if (!isPreview) {
        if (!mounted) return null;
        return createPortal(banner, document.body);
    }

    return banner;
}
