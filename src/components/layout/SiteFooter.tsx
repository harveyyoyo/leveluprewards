'use client';

import Link from 'next/link';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { getContactFormHref } from '@/lib/appBranding';
import { staffPortalFooterInnerClassName } from '@/components/staff/staffPortalNavStyles';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/components/providers/LocaleProvider';

export function SiteFooter({
  compact = false,
  staffPortalWide = false,
}: {
  compact?: boolean;
  staffPortalWide?: boolean;
}) {
  const playSound = useArcadeSound();
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border/50 bg-background/85 shadow-[0_-4px_12px_rgba(15,23,42,0.05)] backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className={cn(staffPortalFooterInnerClassName(staffPortalWide), compact ? 'py-1' : 'py-1.5')}>
        <div className={cn('flex flex-col items-center text-center', compact ? 'gap-0' : 'gap-0.5')}>
          <p className="text-[7px] font-medium uppercase tracking-[0.12em] text-muted-foreground/45">
            beta · {process.env.NEXT_PUBLIC_VERSION || 'beta-1.1.0'}
            {process.env.NEXT_PUBLIC_BUILD_TIME ? <> · {process.env.NEXT_PUBLIC_BUILD_TIME}</> : null}
          </p>
          {!compact && (
            <>
              <p className="text-[10px] leading-tight font-semibold text-muted-foreground/70">
                {t('common.allRightsReserved')}{' '}
                <span className="text-muted-foreground/50">|</span>{' '}
                <Link
                  href="/terms"
                  onClick={() => playSound('click')}
                  className="underline underline-offset-4 hover:text-foreground transition-colors"
                >
                  {t('footer.terms')}
                </Link>{' '}
                <span className="text-muted-foreground/50">|</span>{' '}
                <Link
                  href="/privacy"
                  onClick={() => playSound('click')}
                  className="underline underline-offset-4 hover:text-foreground transition-colors"
                >
                  {t('footer.privacy')}
                </Link>{' '}
                <span className="text-muted-foreground/50">|</span>{' '}
                <Link
                  href={getContactFormHref()}
                  onClick={() => playSound('click')}
                  className="underline underline-offset-4 hover:text-foreground transition-colors"
                >
                  {t('footer.contact')}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </footer>
  );
}
