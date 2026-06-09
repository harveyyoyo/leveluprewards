'use client';

import Link from 'next/link';
import { Sparkles, UserRound } from 'lucide-react';

import { HouseBadge } from '@/components/houses/HouseBadge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { House } from '@/lib/types';

type Props = {
  birthdayToday?: boolean;
  welcomeStylesHref?: string | null;
  showWelcomeStyles?: boolean;
  themed?: boolean;
};

/** House badge for the top welcome bar. */
export function StudentKioskHouseBadge({
  studentHouse,
  themed,
}: {
  studentHouse: House;
  themed?: boolean;
}) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span className="inline-flex shrink-0 cursor-help flex-col items-start gap-0.5" tabIndex={0}>
          <span
            className="text-[8px] font-black uppercase tracking-[0.2em] opacity-60 sm:text-[9px]"
            style={themed ? { color: 'var(--theme-page-text)' } : undefined}
          >
            House
          </span>
          <HouseBadge house={studentHouse} size="sm" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        Your house{studentHouse.value ? ` (${studentHouse.value})` : ''}. You earn points together in house
        competitions and standings.
      </TooltipContent>
    </Tooltip>
  );
}

/** Avatar badge beside the student name — custom upload or a neutral student icon (not theme emoji). */
export function StudentKioskEmojiBadge({
  customEmojiUrl,
  themed,
}: {
  customEmojiUrl?: string | null;
  themeEmoji?: string | null;
  themed?: boolean;
}) {
  if (!customEmojiUrl) {
    return (
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex shrink-0 cursor-help items-center justify-center rounded-xl border-2 p-1.5',
              !themed && 'border-border/50 bg-card/80',
            )}
            style={
              themed
                ? {
                    borderColor: 'color-mix(in srgb, var(--theme-primary) 35%, transparent)',
                    backgroundColor: 'color-mix(in srgb, var(--theme-card) 90%, white)',
                    color: 'var(--theme-primary)',
                  }
                : undefined
            }
            tabIndex={0}
          >
            <UserRound className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden />
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          Your kiosk profile — change colors with the Theme button below.
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-flex shrink-0 cursor-help items-center justify-center rounded-xl border-2 p-1',
            !themed && 'border-border/50 bg-card/80',
          )}
          style={
            themed
              ? {
                  borderColor: 'color-mix(in srgb, var(--theme-primary) 35%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--theme-card) 90%, white)',
                }
              : undefined
          }
          tabIndex={0}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={customEmojiUrl}
            alt=""
            className="theme-animated-emoji h-8 w-8 shrink-0 object-contain sm:h-9 sm:w-9"
          />
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        Your personal avatar — shown on your kiosk profile.
      </TooltipContent>
    </Tooltip>
  );
}

export function StudentKioskProfileExtras({
  birthdayToday,
  welcomeStylesHref,
  showWelcomeStyles,
  themed,
}: Props) {
  const welcomeVisible = !!(showWelcomeStyles && welcomeStylesHref);
  const hasAny = birthdayToday || welcomeVisible;

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
