'use client';

import { createContext, useContext } from 'react';
import { Cog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

export type FeatureFilter = {
    query: string;
    enabledOnly: boolean;
    showComingSoon: boolean;
};

export const FeatureFilterContext = createContext<FeatureFilter>({
    query: '',
    enabledOnly: false,
    showComingSoon: false,
});

export function SettingsFeatureRow({
    id,
    label,
    desc,
    icon,
    settings,
    onToggle,
    onConfigure,
    isImplemented = true,
    canEditAdminSettings = true,
    blockHint,
}: {
    id: string;
    label: string;
    desc: string;
    icon: React.ReactNode;
    settings: Record<string, unknown> | object;
    onToggle: (key: string, val: unknown) => void;
    onConfigure?: () => void;
    isImplemented?: boolean;
    canEditAdminSettings?: boolean;
    blockHint?: string;
}) {
    const filter = useContext(FeatureFilterContext);
    const isEnabled = Boolean((settings as Record<string, unknown>)[id]);
    const blockedByConfig = Boolean(blockHint);
    const canUse = isImplemented && !blockedByConfig;

    if (!isImplemented && !filter.showComingSoon && !filter.query.trim()) return null;
    if (filter.enabledOnly && !isEnabled) return null;
    if (filter.query.trim()) {
        const q = filter.query.trim().toLowerCase();
        const hay = `${id} ${label} ${desc}`.toLowerCase();
        if (!hay.includes(q)) return null;
    }

    return (
        <div
            className={`flex items-start justify-between py-4 px-3 border-b border-border/40 last:border-0 hover:bg-muted/30 rounded-xl transition-colors ${canUse && canEditAdminSettings ? 'cursor-pointer' : ''}`}
            onClick={() => {
                if (canUse && canEditAdminSettings) {
                    onToggle(id, !isEnabled);
                }
            }}
        >
            <div className={`flex items-start gap-4 ${!canUse && 'opacity-60'} mr-6 min-w-0`}>
                <div
                    className={`p-2.5 rounded-xl transition-colors shrink-0 mt-0.5 ${isEnabled && canUse ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
                >
                    {icon}
                </div>
                <div className="flex flex-col min-w-0">
                    <span className="font-bold text-sm block text-foreground mb-1">{label}</span>
                    <p className="text-xs text-muted-foreground leading-relaxed w-full pr-4">{desc}</p>
                </div>
            </div>
            {isImplemented ? (
                <div className="flex flex-col flex-shrink-0 items-end justify-start min-h-[44px]">
                    <div className="flex items-center gap-2">
                        {onConfigure ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 rounded-xl"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onConfigure();
                                }}
                                disabled={!canEditAdminSettings}
                                title={`${label} settings`}
                                aria-label={`${label} settings`}
                            >
                                <Cog className="h-4 w-4" />
                            </Button>
                        ) : null}
                        <div onClick={(e) => e.stopPropagation()}>
                            <Switch
                                id={id}
                                checked={isEnabled && canUse}
                                onCheckedChange={(checked) => onToggle(id, checked)}
                                disabled={!canEditAdminSettings || blockedByConfig}
                            />
                        </div>
                    </div>
                    {!canEditAdminSettings && (
                        <span className="text-[10px] text-muted-foreground mt-2 font-black uppercase tracking-widest whitespace-nowrap">
                            Admin Only
                        </span>
                    )}
                    {canEditAdminSettings && blockedByConfig && blockHint && (
                        <span
                            className="text-[10px] text-muted-foreground mt-2 font-semibold tracking-wide max-w-[220px] text-right leading-snug"
                            title={blockHint}
                        >
                            {blockHint}
                        </span>
                    )}
                </div>
            ) : (
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted px-3 py-1.5 rounded-md mt-1 whitespace-nowrap">
                    Soon
                </div>
            )}
        </div>
    );
}
