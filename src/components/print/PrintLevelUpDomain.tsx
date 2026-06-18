'use client';

import type { CSSProperties } from 'react';
import { useSettings } from '@/components/providers/SettingsProvider';
import { APP_SITE_DOMAIN } from '@/lib/appBranding';
import { cn } from '@/lib/utils';

export function PrintLevelUpDomain({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  const { settings } = useSettings();
  if (!settings.showLevelUpDomainOnPrints) return null;

  return (
    <span className={cn('print-levelup-domain', className)} style={style} aria-hidden>
      {APP_SITE_DOMAIN}
    </span>
  );
}
