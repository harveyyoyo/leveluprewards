'use client';

import { cn } from '@/lib/utils';

export function SettingsSectionJumpNav({
    sections,
    onJump,
    ariaLabel,
}: {
    sections: readonly { readonly id: string; readonly label: string }[];
    onJump: (id: string) => void;
    ariaLabel: string;
}) {
    return (
        <div
            role="navigation"
            aria-label={ariaLabel}
            className={cn(
                'sticky top-0 z-10 -mx-1 mb-3 flex gap-2 overflow-x-auto pb-3 pt-0.5 shrink-0',
                'border-b border-border/40 bg-background/95 backdrop-blur-md [scrollbar-width:thin]',
                '[&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border',
            )}
        >
            {sections.map(({ id, label }) => (
                <button
                    key={id}
                    type="button"
                    onClick={() => onJump(id)}
                    className="shrink-0 whitespace-nowrap rounded-full border border-border/60 bg-muted/35 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary/45 hover:bg-primary/10 hover:text-foreground"
                >
                    {label}
                </button>
            ))}
        </div>
    );
}
