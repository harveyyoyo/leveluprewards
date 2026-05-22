'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';

import { HouseBadge } from '@/components/houses/HouseBadge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { House } from '@/lib/types';

type Props = {
  birthdayToday?: boolean;
  studentHouse?: House | null;
  customEmojiUrl?: string | null;
  themeEmoji?: string | null;
  welcomeStylesHref?: string | null;
  showWelcomeStyles?: boolean;
  themed?: boolean;
};

export function StudentKioskProfileExtras({
  birthdayToday,
  studentHouse,
  customEmojiUrl,
  themeEmoji,
  welcomeStylesHref,
  showWelcomeStyles,
  themed,
}: Props) {
  const emojiVisible = !!(customEmojiUrl || themeEmoji);
  const welcomeVisible = !!(showWelcomeStyles && welcomeStylesHref);
  const hasAny = birthdayToday || studentHouse || emojiVisible || welcomeVisible;

  if (!hasAny) return null;

  return (
    <div
      className={cn(
        'flex w-full shrink-0 flex-wrap items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5',
        !themed && 'border-border/60 bg-card/90',
      )}
      style={
        themed
          ? {
              borderColor: 'color-mix(in srgb, var(--theme-primary) 28%, transparent)',
              backgroundColor: 'color-mix(in srgb, var(--theme-card) 92%, white)',
            }
          : undefined
      }
    >
      {birthdayToday ? (
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <span
              className="inline-flex cursor-help items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-200"
              tabIndex={0}
            >
              🎂 Birthday
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            It&apos;s your birthday today — your school is celebrating you on the kiosk.
          </TooltipContent>
        </Tooltip>
      ) : null}

      {studentHouse ? (
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <span className="inline-flex cursor-help" tabIndex={0}>
              <HouseBadge house={studentHouse} size="sm" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            Your house team{studentHouse.value ? `: ${studentHouse.value}` : ''}. You earn points together in house
            competitions and standings.
          </TooltipContent>
        </Tooltip>
      ) : null}

      {emojiVisible ? (
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <span className="inline-flex cursor-help items-center justify-center" tabIndex={0}>
              {customEmojiUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={customEmojiUrl}
                  alt=""
                  className="theme-animated-emoji h-8 w-8 shrink-0 object-contain"
                />
              ) : (
                <span className="theme-animated-emoji text-2xl leading-none">{themeEmoji}</span>
              )}
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            {customEmojiUrl
              ? 'Your personal emoji — shown on your kiosk profile.'
              : 'Emoji from your theme — part of the colors and style you picked for this page.'}
          </TooltipContent>
        </Tooltip>
      ) : null}

      {welcomeVisible ? (
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 cursor-help gap-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
              style={
                themed
                  ? {
                      borderColor: 'var(--theme-primary)',
                      backgroundColor: 'transparent',
                      color: 'var(--theme-primary)',
                    }
                  : undefined
              }
              asChild
            >
              <Link href={welcomeStylesHref!}>
                <Sparkles className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                Welcome styles
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            Pick how the kiosk greets you when you sign in — choose welcome animations and styles.
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
