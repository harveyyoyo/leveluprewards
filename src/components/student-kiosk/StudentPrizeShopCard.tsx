'use client';

import { Gift, Target } from 'lucide-react';

import DynamicIcon from '@/components/DynamicIcon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Prize } from '@/lib/types';
import { stripLeadingEmojiFromPrizeName } from '@/lib/prizes/prizeUtils';
import { cn } from '@/lib/utils';

export type StudentPrizeShopCardProps = {
  prize: Prize;
  studentPoints: number;
  themed: boolean;
  primaryForeground: string;
  onRedeem: () => void;
  /** Kiosk rail: one tap anywhere on the card. Shop grid: dedicated Redeem button. */
  wholeCardClick?: boolean;
  /** Why this prize is locked, when points exist but the wrong pile is needed. */
  affordHint?: string;
  className?: string;
  /** When Goals are on, students can save toward this prize. */
  enableWishlist?: boolean;
  wishlistActive?: boolean;
  wishlistBusy?: boolean;
  onToggleWishlist?: () => void;
};

export function StudentPrizeShopCard({
  prize,
  studentPoints,
  themed,
  primaryForeground,
  onRedeem,
  wholeCardClick = false,
  affordHint,
  className,
  enableWishlist = false,
  wishlistActive = false,
  wishlistBusy = false,
  onToggleWishlist,
}: StudentPrizeShopCardProps) {
  const canAfford = studentPoints >= (prize.points || 0);
  const displayName = stripLeadingEmojiFromPrizeName(prize.name) || prize.name;
  const pctTowardCost = Math.min(100, Math.floor((studentPoints / (prize.points || 1)) * 100));
  const lockedTitle =
    affordHint ||
    `You have ${pctTowardCost}% of the points this prize costs (need ${(prize.points || 0).toLocaleString()} pts).`;

  const prizeTitle = (
    <h3
      className={cn(
        'line-clamp-2 w-full max-w-full break-words text-lg font-extrabold leading-snug tracking-tight [overflow-wrap:anywhere] sm:text-xl',
        !themed && 'text-foreground',
        !wholeCardClick && 'cursor-help',
      )}
      style={themed ? { color: 'var(--theme-text)' } : undefined}
      title={displayName}
    >
      {displayName}
    </h3>
  );

  const wishlistButton =
    enableWishlist && onToggleWishlist ? (
      <Button
        type="button"
        variant={wishlistActive ? 'default' : 'outline'}
        size="sm"
        disabled={wishlistBusy}
        className="h-9 w-full rounded-xl text-[10px] font-black uppercase tracking-widest"
        onClick={(e) => {
          e.stopPropagation();
          onToggleWishlist();
        }}
      >
        <Target className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        {wishlistActive ? 'On your wishlist' : 'Save toward this'}
      </Button>
    ) : null;

  const mediaAndMeta = (
    <>
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-primary opacity-0 transition-opacity duration-300 group-hover:opacity-5" />

      <div
        className={cn(
          'relative mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br shadow-inner transition-transform duration-500',
          canAfford ? 'group-hover:scale-110 group-hover:rotate-6' : 'opacity-80 grayscale',
        )}
        style={
          themed
            ? {
                backgroundColor: canAfford ? 'var(--theme-bg)' : 'transparent',
                color: canAfford ? 'var(--theme-primary)' : 'var(--theme-text)',
              }
            : {
                backgroundImage: canAfford
                  ? 'linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--chart-3) / 0.3))'
                  : 'linear-gradient(135deg, hsl(var(--muted) / 0.6), hsl(var(--muted) / 0.8))',
                color: canAfford ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
              }
        }
      >
        {prize.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={prize.imageUrl}
            alt=""
            className="absolute inset-0 z-[5] size-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : null}
        {!prize.imageUrl && prize.name ? (
          <div className="pointer-events-none absolute inset-0 z-0 opacity-40 mix-blend-overlay transition-transform duration-700 group-hover:scale-125">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(prize.name)}&backgroundColor=transparent`}
              alt=""
              className="size-full object-cover"
            />
          </div>
        ) : null}
        <DynamicIcon name={prize.icon || 'Gift'} className="relative z-10 h-8 w-8 drop-shadow-sm" />
      </div>

      <div className="mb-4 w-full min-w-0">
        {wholeCardClick ? (
          prizeTitle
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>{prizeTitle}</TooltipTrigger>
            <TooltipContent side="top" align="center" className="max-w-[min(20rem,calc(100vw-2rem))]">
              <p className="break-words text-base font-black [overflow-wrap:anywhere] sm:text-lg">{displayName}</p>
            </TooltipContent>
          </Tooltip>
        )}
        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
          <Badge
            className="rounded-xl px-3 py-0.5 text-sm font-black"
            style={
              themed
                ? { backgroundColor: 'var(--theme-primary)', color: primaryForeground }
                : { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }
            }
          >
            {(prize.points || 0).toLocaleString()} pts
          </Badge>
          {!canAfford ? (
            <Badge
              variant="outline"
              className="rounded-xl border-dashed px-2 py-1 text-xs font-black"
              style={
                themed
                  ? { borderColor: 'var(--theme-text-muted)', color: 'var(--theme-text-muted)' }
                  : { borderColor: 'hsl(var(--muted-foreground))', color: 'hsl(var(--muted-foreground))' }
              }
              title={lockedTitle}
            >
              {pctTowardCost}%
            </Badge>
          ) : null}
          {typeof prize.stockCount === 'number' ? (
            <Badge
              variant="secondary"
              className="rounded-xl px-2 py-1 text-xs font-black"
              style={
                themed
                  ? {
                      backgroundColor: 'color-mix(in srgb, var(--theme-primary) 18%, var(--theme-card))',
                      color: 'var(--theme-text)',
                      borderColor: 'color-mix(in srgb, var(--theme-primary) 30%, transparent)',
                    }
                  : undefined
              }
            >
              {prize.stockCount} in stock
            </Badge>
          ) : null}
        </div>
      </div>
    </>
  );

  const redeemControl = wholeCardClick ? (
    <span
      className={cn(
        'inline-flex h-10 w-full items-center justify-center rounded-xl text-xs font-black uppercase tracking-widest shadow-md',
        !themed && canAfford && 'bg-primary text-primary-foreground',
      )}
      style={
        themed && canAfford
          ? { backgroundColor: 'var(--theme-primary)', color: primaryForeground }
          : !canAfford
            ? { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }
            : undefined
      }
    >
      <Gift className="mr-2 h-4 w-4" aria-hidden />
      Redeem Now
    </span>
  ) : (
    <Button
      type="button"
      onClick={onRedeem}
      disabled={!canAfford}
      className="h-10 w-full rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all"
      style={
        themed && canAfford
          ? { backgroundColor: 'var(--theme-primary)', color: primaryForeground }
          : canAfford
            ? { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }
            : { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }
      }
    >
      <Gift className="mr-2 h-4 w-4" aria-hidden />
      Redeem Now
    </Button>
  );

  const cardClass = cn(
    'group relative flex w-full min-w-0 flex-col items-center justify-between rounded-2xl border-2 border-transparent p-3.5 text-center backdrop-blur-sm transition-all duration-300 sm:p-4',
    canAfford ? 'hover:border-[var(--prize-card-hover-border)] hover:shadow-2xl hover:shadow-primary/5' : 'opacity-75',
    wholeCardClick &&
      'touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
    className,
  );

  const cardStyle = themed
    ? {
        backgroundColor: canAfford ? 'var(--theme-card)' : 'color-mix(in srgb, var(--theme-card) 35%, transparent)',
        color: 'var(--theme-text)',
        borderColor: canAfford
          ? 'color-mix(in srgb, var(--theme-primary) 38%, transparent)'
          : 'color-mix(in srgb, var(--theme-text) 20%, transparent)',
        borderWidth: 1,
        borderStyle: 'solid' as const,
        ['--prize-card-hover-border' as string]: canAfford ? 'var(--theme-primary)' : 'transparent',
      }
    : {
        backgroundColor: canAfford ? 'hsl(var(--card) / 0.4)' : 'hsl(var(--card) / 0.1)',
        ['--prize-card-hover-border' as string]: canAfford ? 'hsl(var(--primary))' : 'transparent',
      };

  if (wholeCardClick) {
    return (
      <div data-stagger-card className={cardClass} style={cardStyle}>
        <button
          type="button"
          onClick={onRedeem}
          aria-label={canAfford ? `Redeem ${displayName}` : `Cannot redeem ${displayName}. ${lockedTitle}`}
          title={!canAfford ? lockedTitle : undefined}
          className="flex w-full cursor-pointer flex-col items-center"
        >
          {mediaAndMeta}
          {redeemControl}
        </button>
        {wishlistButton ? <div className="mt-2 w-full">{wishlistButton}</div> : null}
      </div>
    );
  }

  return (
    <div className={cardClass} style={cardStyle}>
      {mediaAndMeta}
      <div className="flex w-full flex-col gap-2">
        {redeemControl}
        {wishlistButton}
      </div>
    </div>
  );
}
