'use client';

import { useSettings } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { Megaphone } from 'lucide-react';

/**
 * KioskSponsorBanner
 * Displays a scrolling sponsor / announcement message pinned to the bottom of
 * all student-facing kiosk screens.  Shown only when the admin has enabled
 * `kioskSponsorEnabled` and entered a non-empty `kioskSponsorMessage`.
 */
export function KioskSponsorBanner({ className }: { className?: string }) {
    const { settings } = useSettings();

    if (!settings.kioskSponsorEnabled || !settings.kioskSponsorMessage?.trim()) {
        return null;
    }

    const msg = settings.kioskSponsorMessage.trim();

    return (
        <div
            className={cn(
                'fixed bottom-0 left-0 right-0 z-50 flex items-center gap-0 overflow-hidden',
                'bg-primary/95 backdrop-blur-md text-primary-foreground shadow-lg border-t border-primary/30',
                className,
            )}
            aria-label="Sponsor message"
            role="marquee"
            style={{ height: '2.5rem' }}
        >
            {/* Static icon badge */}
            <div className="shrink-0 flex items-center gap-1.5 px-3 h-full bg-primary-foreground/10 border-r border-primary-foreground/20">
                <Megaphone className="w-4 h-4 shrink-0 opacity-90" aria-hidden="true" />
                <span className="text-[10px] font-black uppercase tracking-[0.18em] opacity-80 whitespace-nowrap">
                    Sponsor
                </span>
            </div>

            {/* Scrolling marquee text */}
            <div className="flex-1 overflow-hidden relative">
                <div
                    className="flex whitespace-nowrap animate-sponsor-scroll"
                    style={{
                        // Duplicate the message so the scroll loops seamlessly
                        willChange: 'transform',
                    }}
                >
                    {/* Two copies for seamless looping */}
                    {[0, 1].map((i) => (
                        <span
                            key={i}
                            className="text-sm font-bold tracking-wide px-16"
                            aria-hidden={i === 1}
                        >
                            {msg}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
