'use client';

import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { openSettingsModal } from '@/lib/openSettingsModal';
import type { SettingsView } from '@/components/settings/settingsModalConfig';
import { cn } from '@/lib/utils';

type OpenSchoolSettingsLinkProps = {
    view?: SettingsView;
    label?: string;
    className?: string;
    variant?: 'outline' | 'ghost' | 'link' | 'default' | 'secondary';
    size?: 'default' | 'sm' | 'lg' | 'icon';
};

/** Button that opens the gear settings modal on a specific view. */
export function OpenSchoolSettingsLink({
    view = 'general',
    label = 'School settings',
    className,
    variant = 'outline',
    size = 'sm',
}: OpenSchoolSettingsLinkProps) {
    return (
        <Button
            type="button"
            variant={variant}
            size={size}
            className={cn('rounded-xl gap-1.5 font-semibold', className)}
            onClick={() => openSettingsModal(view)}
        >
            <Settings className="h-3.5 w-3.5" aria-hidden />
            {label}
        </Button>
    );
}
