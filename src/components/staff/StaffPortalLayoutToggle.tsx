'use client';

import { Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/components/providers/LocaleProvider';
import { useStaffPortalLayoutMode } from '@/lib/staffPortal/useStaffPortalLayoutMode';
import { cn } from '@/lib/utils';

type StaffPortalLayoutToggleProps = {
  variant?: 'outline' | 'ghost';
  className?: string;
};

export function StaffPortalLayoutToggle({
  variant = 'outline',
  className,
}: StaffPortalLayoutToggleProps) {
  const { isWide, toggleLayoutMode } = useStaffPortalLayoutMode();
  const { t } = useTranslation();

  const ariaLabel = isWide
    ? t('header.layout.useStandard')
    : t('header.layout.useWide');
  const title = isWide ? t('header.layout.standard') : t('header.layout.wide');

  return (
    <Button
      type="button"
      variant={variant}
      size="icon"
      className={cn(
        'h-9 w-9 shrink-0',
        variant === 'outline' ? 'rounded-lg' : 'rounded-xl text-primary',
        className,
      )}
      onClick={toggleLayoutMode}
      aria-label={ariaLabel}
      title={title}
    >
      {isWide ? (
        <Minimize2 className={variant === 'ghost' ? 'h-5 w-5' : 'h-3.5 w-3.5'} />
      ) : (
        <Maximize2 className={variant === 'ghost' ? 'h-5 w-5' : 'h-3.5 w-3.5'} />
      )}
    </Button>
  );
}
