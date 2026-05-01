'use client';

import { useSettings } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { Megaphone, ExternalLink } from 'lucide-react';

/**
 * KioskSponsorBanner
 * Displays a premium, highly visible sponsor or announcement banner.
 * Supports date-specific schedules and standard fallback options.
 */
export function KioskSponsorBanner({ className }: { className?: string }) {
    const { settings } = useSettings();

    // Check if there is a specific sponsor scheduled for today
    const localDate = new Date().toLocaleDateString('en-CA'); // "YYYY-MM-DD"
    const matchedSchedule = (settings.kioskSponsorSchedules || []).find(s => s.date === localDate);

    // If neither the main sponsor is enabled nor a specific schedule matches today, hide it
    if (!matchedSchedule && (!settings.kioskSponsorEnabled || !settings.kioskSponsorMessage?.trim())) {
        return null;
    }

    // Combine properties from matched schedule, or use fallback
    const msg = (matchedSchedule ? matchedSchedule.message : settings.kioskSponsorMessage)?.trim();
    const logoUrl = matchedSchedule ? matchedSchedule.logoUrl : settings.kioskSponsorLogoUrl;
    const link = matchedSchedule ? matchedSchedule.link : settings.kioskSponsorLink;
    const speed = matchedSchedule ? matchedSchedule.speed : (settings.kioskSponsorSpeed || 'normal');
    const position = matchedSchedule ? matchedSchedule.position : (settings.kioskSponsorPosition || 'bottom');
    const bannerStyle = matchedSchedule ? matchedSchedule.bannerStyle : (settings.kioskSponsorBannerStyle || 'primary');
    const icon = matchedSchedule ? matchedSchedule.icon : settings.kioskSponsorIcon;

    if (!msg) return null;

    // Visual Style Presets with extremely strong readability and premium aesthetic
    const styleMap: Record<string, string> = {
        subtle: 'bg-slate-100 border-slate-300 text-slate-800 dark:bg-slate-900/90 dark:text-slate-100 dark:border-slate-800',
        neon_gold: 'bg-black border-amber-400 text-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.35)]',
        electric: 'bg-blue-950 border-blue-400 text-blue-50 shadow-[0_0_25px_rgba(59,130,246,0.35)]',
        gradient: 'bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-700 text-white border-pink-400',
        glass: 'bg-white/50 dark:bg-black/40 backdrop-blur-2xl border-white/30 text-foreground shadow-xl',
        primary: 'bg-primary border-primary-foreground/30 text-primary-foreground shadow-2xl backdrop-blur-xl',
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
    const positionClass = position === 'top' ? 'top-0 bottom-auto border-b-2' : 'bottom-0 top-auto border-t-2';
    const bannerStyleClass = (bannerStyle && styleMap[bannerStyle]) || styleMap.primary;

    return (
        <div
            className={cn(
                'fixed left-0 right-0 z-50 flex items-center gap-0 overflow-hidden select-none',
                positionClass,
                bannerStyleClass,
                className,
            )}
            aria-label="Sponsor message"
            role="marquee"
            style={{ height: '3.75rem' }} // Made it larger for high visibility
        >
            {/* Logo or Badge Section */}
            <div className="shrink-0 flex items-center gap-3 px-5 h-full bg-black/15 dark:bg-white/15 border-r border-black/10 dark:border-white/10 backdrop-blur-sm">
                {logoUrl ? (
                    <img
                        src={logoUrl}
                        alt="Sponsor"
                        className="h-8 w-auto max-w-[100px] object-contain shrink-0 filter drop-shadow-sm"
                    />
                ) : (
                    <div className="flex items-center gap-2 shrink-0">
                        {icon ? (
                            <span className="text-xl shrink-0">{icon}</span>
                        ) : (
                            <Megaphone className="w-5 h-5 shrink-0 opacity-100" aria-hidden="true" />
                        )}
                        <span className="text-xs font-black uppercase tracking-[0.2em] opacity-95 whitespace-nowrap">
                            Sponsor
                        </span>
                    </div>
                )}
            </div>

            {/* Marquee or Static Message text */}
            {isStatic ? (
                <div className="flex-1 px-8 flex items-center justify-between min-w-0 h-full">
                    <span className="text-base md:text-lg font-extrabold tracking-wide truncate">
                        {msg}
                    </span>
                    {link && (
                        <a
                            href={link.startsWith('http') ? link : `https://${link}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs md:text-sm font-black flex items-center gap-1.5 bg-black/25 hover:bg-black/35 dark:bg-white/15 dark:hover:bg-white/25 px-4 py-1.5 rounded-full transition-all shrink-0 shadow-sm border border-white/10"
                        >
                            <span>Learn More</span>
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    )}
                </div>
            ) : (
                <div className="flex-1 overflow-hidden relative flex items-center h-full">
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
            )}
        </div>
    );
}
