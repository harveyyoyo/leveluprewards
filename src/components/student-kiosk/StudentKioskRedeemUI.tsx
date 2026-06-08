'use client';

import React, { type FormEvent, type ReactNode, type Ref } from 'react';
import Link from 'next/link';
import {
  Award,
  ChevronRight,
  Clock,
  Gift,
  HelpCircle,
  BookOpen,
  ScanBarcode,
  Sparkles,
  Ticket,
  Wallet,
} from 'lucide-react';

import type { BarcodeScannerStatus } from '@/lib/barcodeScannerStatus';
import { BarcodeScannerCameraView } from '@/components/barcode/BarcodeScannerCameraView';
import DynamicIcon from '@/components/DynamicIcon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Helper } from '@/components/ui/helper';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Prize } from '@/lib/types';
import { useTranslation } from '@/components/providers/LocaleProvider';

/** Shared max width for redeem coupon, activity, and other center-stack kiosk controls. */
export const studentKioskCenterStackClass = 'w-full min-w-0 max-w-xl mx-auto sm:max-w-2xl';

export function StudentKioskLogoutControls({
  themed,
  primaryForeground,
  isKioskLocked,
  autoLogoutEnabled = true,
  logoutTimer,
  sessionTimeoutSec = 10,
  onLogout,
  className,
}: {
  themed: StudentKioskThemed;
  primaryForeground: string;
  isKioskLocked: boolean;
  autoLogoutEnabled?: boolean;
  logoutTimer: number;
  sessionTimeoutSec?: number;
  onLogout: () => void;
  className?: string;
}) {
  const { t: tr } = useTranslation();
  const t = themed.active;
  const maxSec = Math.max(1, sessionTimeoutSec);
  const progress = Math.min(1, Math.max(0, logoutTimer / maxSec));
  const ringRadius = 14;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - progress);
  const urgent = autoLogoutEnabled && !isKioskLocked && logoutTimer <= 3;

  const lockedPillStyle = t
    ? {
        borderColor: 'color-mix(in srgb, #ef4444 55%, var(--theme-primary))',
        backgroundColor: 'color-mix(in srgb, #ef4444 18%, var(--theme-card))',
        color: 'var(--theme-text)',
      }
    : undefined;

  const countdownPillStyle = t
    ? {
        borderColor: urgent
          ? 'color-mix(in srgb, #f97316 65%, var(--theme-primary))'
          : 'color-mix(in srgb, var(--theme-primary) 40%, transparent)',
        backgroundColor: 'color-mix(in srgb, var(--theme-card) 94%, white)',
        color: 'var(--theme-text)',
      }
    : undefined;

  const ringStroke = t
    ? urgent
      ? '#f97316'
      : 'var(--theme-primary)'
    : urgent
      ? '#f97316'
      : 'hsl(var(--primary))';

  return (
    <div className={cn('flex flex-wrap items-center justify-end gap-2.5', className)}>
      {isKioskLocked ? (
        <div
          className={cn(
            'flex items-center gap-2 rounded-2xl border-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest',
            !t && 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200',
          )}
          style={lockedPillStyle}
          aria-label={tr('student.kiosk.lockedAria')}
        >
          <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          {tr('student.kiosk.locked')}
        </div>
      ) : autoLogoutEnabled ? (
        <div
          className={cn(
            'flex items-center rounded-2xl border-2 p-1.5 shadow-sm transition-shadow',
            urgent && 'shadow-[0_0_0_2px_color-mix(in_srgb,#f97316_35%,transparent)]',
            !t && 'border-slate-200 bg-white/95 dark:border-slate-600 dark:bg-slate-900/90',
          )}
          style={countdownPillStyle}
          role="timer"
          aria-live="polite"
          aria-label={`Auto logout in ${logoutTimer} ${logoutTimer === 1 ? 'second' : 'seconds'}`}
          title={logoutTimer === 1 ? '1 second until auto logout' : `${logoutTimer} seconds until auto logout`}
        >
          <div className="relative h-9 w-9 shrink-0">
            <svg className="h-9 w-9 -rotate-90" viewBox="0 0 36 36" aria-hidden>
              <circle
                cx="18"
                cy="18"
                r={ringRadius}
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="opacity-20"
              />
              <circle
                cx="18"
                cy="18"
                r={ringRadius}
                fill="none"
                stroke={ringStroke}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                className="transition-[stroke-dashoffset] duration-1000 ease-linear"
              />
            </svg>
            <span
              className={cn(
                'absolute inset-0 flex items-center justify-center text-sm font-black tabular-nums leading-none',
                urgent && !t && 'text-orange-600 dark:text-orange-400',
              )}
              style={t && urgent ? { color: '#f97316' } : undefined}
            >
              {logoutTimer}
            </span>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            'rounded-2xl border-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest opacity-80',
            !t && 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300',
          )}
          style={
            t
              ? {
                  borderColor: 'color-mix(in srgb, var(--theme-primary) 30%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--theme-card) 92%, white)',
                  color: 'var(--theme-text)',
                }
              : undefined
          }
          aria-label={tr('student.kiosk.noAutoLogout')}
        >
          {tr('student.kiosk.sessionStaysOpen')}
        </div>
      )}
      <Button
        type="button"
        size="sm"
        className={cn(
          'h-9 whitespace-nowrap rounded-full border-2 px-4 text-[11px] font-bold uppercase tracking-widest shadow-sm',
          !t && 'border-primary/40 bg-primary text-primary-foreground hover:bg-primary/90',
        )}
        style={
          t
            ? {
                borderColor: 'var(--theme-primary)',
                backgroundColor: 'var(--theme-primary)',
                color: primaryForeground,
              }
            : undefined
        }
        onClick={onLogout}
        aria-label={tr('student.kiosk.logOutNowAria')}
      >
        {tr('student.kiosk.logOutNow')}
      </Button>
    </div>
  );
}

/** OKLCH hue used for warm kiosk accents on reward rails when no student theme is active. */
export function prizeAccentHue(seed: string, index = 0): number {
  let h = 10;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) % 360;
  }
  return (h + index * 37) % 360;
}

export type StudentKioskThemed = { active: boolean };

export function StudentKioskWarmBackdrop({ className }: { className?: string }) {
  return (
    <div
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      aria-hidden
    >
      <div
        className={cn(
          'student-kiosk-warm-aurora absolute -left-[20%] -top-[25%] h-[min(85%,52rem)] w-[min(85%,52rem)] rounded-full blur-3xl',
          'bg-[radial-gradient(circle_at_center,oklch(0.92_0.08_28_/_0.55),oklch(0.88_0.06_350_/_0.2),transparent_70%)]',
        )}
      />
      <div
        className={cn(
          'student-kiosk-warm-aurora-reverse absolute -right-[15%] top-[15%] h-[min(75%,48rem)] w-[min(75%,48rem)] rounded-full blur-3xl',
          'bg-[radial-gradient(circle_at_center,oklch(0.91_0.07_330_/_0.5),oklch(0.9_0.05_15_/_0.25),transparent_72%)]',
        )}
      />
      <div className="student-kiosk-warm-grid absolute inset-0 opacity-80" />
    </div>
  );
}

export type StudentKioskBalancePillProps = {
  themed: StudentKioskThemed;
  points: number;
  /** Already-sliced rows (e.g. first 4) from `getStudentPointTypeTotals`. */
  pointTypeTotals: { label: string; points: number }[];
  portalRaffleTickets: null | {
    count: number;
    pointsPerTicket: number;
    equalOddsNote?: boolean;
  };
};

export function StudentKioskBalancePill({
  themed,
  points,
  pointTypeTotals,
  portalRaffleTickets,
  showCategories = true,
}: StudentKioskBalancePillProps & { showCategories?: boolean }) {
  const t = themed.active;

  return (
    <div
      className="hidden shrink-0 items-center gap-3 md:flex sm:gap-5"
      style={t ? { color: 'var(--theme-text)' } : undefined}
    >
      <div className="text-center sm:text-left">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-55 sm:text-[11px]"
          style={{ color: t ? 'var(--theme-text)' : undefined }}
        >
          Balance
        </p>
        <p
          className="text-3xl font-black tabular-nums leading-none sm:text-4xl md:text-5xl"
          style={{ color: t ? 'var(--theme-primary)' : 'hsl(var(--primary))' }}
        >
          {points.toLocaleString()}{' '}
          <span className="text-xs font-bold uppercase tracking-widest opacity-70 sm:text-sm">pts</span>
        </p>
        {showCategories ? (
          <div className="mt-2 flex max-w-[17rem] flex-wrap justify-center gap-1 sm:justify-start">
            {pointTypeTotals.length > 0 ? (
              pointTypeTotals.map((row) => (
                <span
                  key={row.label}
                  className="rounded-full border px-2 py-0.5 text-[10px] font-bold leading-tight"
                  style={
                    t
                      ? {
                          borderColor: 'color-mix(in srgb, var(--theme-primary) 22%, transparent)',
                          color: 'var(--theme-text)',
                        }
                      : undefined
                  }
                >
                  {row.label}: {row.points.toLocaleString()}
                </span>
              ))
            ) : (
              <span className="text-[10px] font-semibold opacity-60">No point types yet</span>
            )}
          </div>
        ) : null}
      </div>
      {portalRaffleTickets ? (
        <>
          <div
            className="h-8 w-px shrink-0 opacity-20"
            style={
              t ? { backgroundColor: 'var(--theme-primary)' } : { backgroundColor: 'hsl(var(--border))' }
            }
            aria-hidden
          />
          <div
            className="text-center sm:text-left"
            title={
              `Raffle: ${portalRaffleTickets.count === 1 ? '1 ticket' : `${portalRaffleTickets.count} tickets`} from your balance at ${portalRaffleTickets.pointsPerTicket} points per ticket.` +
              (portalRaffleTickets.equalOddsNote
                ? ' Your school uses equal odds on the wheel (one pool entry per qualifying student, not one slice per ticket shown).'
                : '')
            }
          >
            <p
              className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-55"
              style={{ color: t ? 'var(--theme-text)' : undefined }}
            >
              Raffles
            </p>
            <p
              className="flex items-center justify-center gap-1 text-2xl font-black tabular-nums leading-none sm:justify-start sm:text-3xl"
              style={{ color: t ? 'var(--theme-primary)' : 'hsl(var(--primary))' }}
            >
              <Ticket className="h-4 w-4 shrink-0 opacity-75" aria-hidden />
              {portalRaffleTickets.count.toLocaleString()}
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}

export type StudentKioskRewardRailProps = {
  themed: StudentKioskThemed;
  primaryForeground: string;
  rewards: Prize[];
  prizesLoading: boolean;
  onRewardClick: (reward: Prize) => void;
  /** Optional label above the rail */
  label?: string;
  className?: string;
};

export function StudentKioskRewardRail({
  themed,
  primaryForeground,
  rewards,
  prizesLoading,
  onRewardClick,
  label = 'Rewards',
  className,
}: StudentKioskRewardRailProps) {
  const t = themed.active;
  const railHue = `oklch(0.58 0.14 ${prizeAccentHue('reward', 0)})`;

  return (
    <div className={cn('flex min-h-0 min-w-0 flex-col gap-2', className)}>
      <p
        className="shrink-0 text-center text-[10px] font-black uppercase tracking-[0.2em] opacity-70"
        style={t ? { color: 'var(--theme-page-text)' } : undefined}
      >
        {label}
      </p>
      <div className="min-h-0 min-w-0 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-2 pr-1">
          {prizesLoading
            ? [...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-[6.5rem] w-36 shrink-0 rounded-2xl" />
              ))
            : rewards.map((reward) => (
                <button
                  key={reward.id}
                  type="button"
                  onClick={() => onRewardClick(reward)}
                  className={cn(
                    'flex h-[6.5rem] w-36 shrink-0 flex-col items-stretch justify-between rounded-2xl border p-2.5 text-left shadow-sm transition-[box-shadow,transform] duration-300',
                    'hover:shadow-md motion-reduce:transition-none',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    !t && 'border-slate-100 bg-white/45 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-800/40',
                  )}
                  style={
                    t
                      ? {
                          backgroundColor: 'var(--theme-bg)',
                          color: 'var(--theme-text)',
                          borderColor: 'var(--theme-primary)',
                        }
                      : {
                          borderColor: railHue,
                          boxShadow: `0 8px 28px -12px ${railHue}`,
                        }
                  }
                  aria-label={`Redeem ${reward.name || 'prize'}`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                        !t && 'bg-slate-100/90 dark:bg-slate-900/60',
                      )}
                      style={t ? { backgroundColor: 'var(--theme-card)' } : { color: railHue }}
                    >
                      <DynamicIcon name={reward.icon} className="h-5 w-5" />
                    </div>
                    <Sparkles
                      className="h-4 w-4 shrink-0 opacity-70"
                      style={{ color: t ? 'var(--theme-primary)' : railHue }}
                      aria-hidden
                    />
                  </div>
                  <p
                    className={cn(
                      'line-clamp-2 text-xs font-black leading-tight [overflow-wrap:anywhere]',
                      !t && 'text-slate-800 dark:text-white',
                    )}
                    style={t ? { color: 'var(--theme-text)' } : undefined}
                  >
                    {reward.name}
                  </p>
                  <div className="flex items-center justify-between gap-1">
                    <Badge
                      variant="secondary"
                      className={cn(
                        'rounded-full px-2 py-0 text-[9px] font-black tracking-wider',
                        !t && 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
                      )}
                      style={
                        t ? { backgroundColor: 'var(--theme-primary)', color: primaryForeground } : undefined
                      }
                    >
                      {(reward.points || 0).toLocaleString()} PTS
                    </Badge>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 opacity-80"
                      style={{ color: t ? 'var(--theme-primary)' : railHue }}
                      aria-hidden
                    />
                  </div>
                </button>
              ))}
        </div>
      </div>
    </div>
  );
}

function ScanCouponScanZone({
  themed,
  children,
}: {
  themed: StudentKioskThemed;
  children: ReactNode;
}) {
  const t = themed.active;

  return (
    <div
      className={cn(
        'relative flex flex-wrap items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-dashed px-4 py-5 min-h-[5.5rem] text-center sm:min-h-[6.5rem] sm:gap-4 sm:px-5 sm:py-6 [@media(max-height:760px)]:min-h-[4.5rem] [@media(max-height:760px)]:gap-2 [@media(max-height:760px)]:px-3 [@media(max-height:760px)]:py-3',
        !t &&
          'border-amber-400/80 bg-gradient-to-r from-amber-900/95 via-amber-950/92 to-amber-900/95 text-amber-50 dark:border-amber-500/55 dark:from-amber-900/95 dark:via-amber-950/92 dark:to-amber-900/95',
      )}
      style={
        t
          ? {
              borderColor: 'color-mix(in srgb, var(--theme-primary) 50%, transparent)',
              background: `linear-gradient(165deg, color-mix(in srgb, var(--theme-primary) 54%, var(--theme-card)), color-mix(in srgb, var(--theme-primary) 64%, var(--theme-card)) 50%, color-mix(in srgb, var(--theme-primary) 54%, var(--theme-card)))`,
              color: 'rgba(248, 250, 252, 0.97)',
            }
          : undefined
      }
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
        <div
          className="student-kiosk-scan-flash absolute inset-0 opacity-0"
          style={{
            background: t
              ? 'linear-gradient(90deg, transparent 42%, color-mix(in srgb, white 22%, var(--theme-primary)) 50%, transparent 58%)'
              : `linear-gradient(90deg, transparent 42%, oklch(0.96 0.12 ${prizeAccentHue('scan', 0)} / 0.55) 50%, transparent 58%)`,
          }}
        />
        <div
          className="student-kiosk-scan-beam-horizontal absolute top-[5%] bottom-[5%] w-[36%] max-w-[7rem] rounded-full opacity-80 blur-[10px]"
          style={{
            background: t
              ? 'linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--theme-primary) 35%, white) 42%, color-mix(in srgb, white 70%, var(--theme-primary)) 50%, color-mix(in srgb, var(--theme-primary) 35%, white) 58%, transparent 100%)'
              : `linear-gradient(90deg, transparent 0%, oklch(0.88 0.14 ${prizeAccentHue('scan', 0)} / 0.45) 42%, oklch(0.97 0.1 ${prizeAccentHue('scan', 0)} / 0.95) 50%, oklch(0.88 0.14 ${prizeAccentHue('scan', 0)} / 0.45) 58%, transparent 100%)`,
          }}
        />
        <div
          className="student-kiosk-scan-beam-core absolute top-[2%] bottom-[2%] w-[2px] rounded-full"
          style={{
            background: t ? 'color-mix(in srgb, white 92%, var(--theme-primary))' : `oklch(0.99 0.04 ${prizeAccentHue('scan', 0)})`,
            boxShadow: t
              ? '0 0 14px 3px color-mix(in srgb, var(--theme-primary) 55%, white), 0 0 28px 6px color-mix(in srgb, var(--theme-primary) 35%, transparent)'
              : `0 0 14px 3px oklch(0.93 0.14 ${prizeAccentHue('scan', 0)} / 0.85), 0 0 26px 5px oklch(0.85 0.12 ${prizeAccentHue('scan', 0)} / 0.45)`,
          }}
        />
        <span
          className="absolute left-2 top-2 h-4 w-4 rounded-tl border-l-2 border-t-2 border-white/35"
          aria-hidden
        />
        <span
          className="absolute right-2 top-2 h-4 w-4 rounded-tr border-r-2 border-t-2 border-white/35"
          aria-hidden
        />
        <span
          className="absolute bottom-2 left-2 h-4 w-4 rounded-bl border-b-2 border-l-2 border-white/35"
          aria-hidden
        />
        <span
          className="absolute bottom-2 right-2 h-4 w-4 rounded-br border-b-2 border-r-2 border-white/35"
          aria-hidden
        />
      </div>
      <div className="relative z-[1] flex w-full flex-col items-center gap-1">{children}</div>
    </div>
  );
}

export type StudentKioskRedeemHeroProps = {
  themed: StudentKioskThemed;
  primaryForeground: string;
  couponHelperText: string;
  /** Visible callout when library checkout is enabled on this scan card. */
  libraryCheckoutNote?: string;
  couponCode: string;
  setCouponCode: (code: string) => void;
  showManualCoupon: boolean;
  showCameraCoupon: boolean;
  couponSectionEnabled: boolean;
  onRedeemCoupon: (code?: string) => void | Promise<void>;
  videoRef: Ref<HTMLVideoElement | null>;
  hasCameraPermission: boolean;
  cameraZoom: number;
  onCameraZoomChange: (zoom: number) => void;
  scanStatus?: BarcodeScannerStatus | null;
  className?: string;
};

export function StudentKioskRedeemHero({
  themed,
  primaryForeground,
  couponHelperText,
  libraryCheckoutNote,
  couponCode,
  setCouponCode,
  showManualCoupon,
  showCameraCoupon,
  couponSectionEnabled,
  onRedeemCoupon,
  videoRef,
  hasCameraPermission,
  cameraZoom,
  onCameraZoomChange,
  scanStatus,
  className,
}: StudentKioskRedeemHeroProps) {
  const t = themed.active;

  if (!couponSectionEnabled) return null;

  const manualEntry = (
    <div className="w-full min-w-0 space-y-3 [@media(max-height:760px)]:space-y-2">
      <form
        className="flex min-w-0 w-full flex-col gap-2 sm:flex-row sm:gap-2"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void onRedeemCoupon();
        }}
      >
        <Input
          placeholder="Code appears here when scanned"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          className="h-12 w-full min-w-0 rounded-xl border-2 font-mono text-left text-base tracking-widest sm:flex-1 [@media(max-height:760px)]:h-10"
          style={
            t
              ? { backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-primary)', color: 'var(--theme-text)' }
              : undefined
          }
          autoFocus
          autoComplete="one-time-code"
        />
        <Button
          type="submit"
          className="h-12 w-full shrink-0 rounded-xl px-8 text-sm font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 sm:w-auto [@media(max-height:760px)]:h-10"
          style={
            t
              ? {
                  backgroundColor: 'var(--theme-primary)',
                  color: primaryForeground,
                }
              : { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }
          }
        >
          Redeem
        </Button>
      </form>
      <ScanCouponScanZone themed={themed}>
        <ScanBarcode
          className={cn('h-8 w-8 shrink-0 sm:h-10 sm:w-10 [@media(max-height:760px)]:h-6 [@media(max-height:760px)]:w-6', !t && 'text-amber-200')}
          style={
            t
              ? {
                  color: 'color-mix(in srgb, var(--theme-primary) 72%, white)',
                }
              : undefined
          }
          aria-hidden
        />
        <span
          className={cn(
            'max-w-full text-xl font-black uppercase tracking-[0.12em] leading-snug sm:text-2xl md:text-3xl sm:tracking-[0.18em] [@media(max-height:760px)]:text-lg',
            !t && 'text-amber-50',
          )}
          style={t ? { color: 'rgba(248, 250, 252, 0.97)' } : undefined}
        >
          {libraryCheckoutNote ? 'Scan coupon or LIB book sticker' : 'Scan coupon'}
        </span>
        <p
          className="w-full text-center text-xs font-semibold opacity-90 sm:text-sm [@media(max-height:760px)]:text-[10px]"
          style={t ? { color: 'rgba(248, 250, 252, 0.92)' } : undefined}
        >
          {libraryCheckoutNote
            ? 'Same scanner for coupons and library books (LIB sticker on the book)'
            : 'Scan with your barcode scanner, or type the code above'}
        </p>
      </ScanCouponScanZone>
      <p
        className="text-center text-[9px] [@media(max-height:760px)]:hidden"
        style={
          t ? { color: 'var(--theme-text)', opacity: 0.7 } : { color: 'hsl(var(--muted-foreground))' }
        }
      >
        Available coupon codes can be viewed in the Admin panel.
      </p>
    </div>
  );

  const cameraPane = (
    <BarcodeScannerCameraView
      videoRef={videoRef}
      hasCameraPermission={hasCameraPermission}
      zoom={cameraZoom}
      onZoomChange={onCameraZoomChange}
      scanStatus={scanStatus}
      showScanFeedback
      viewportClassName="h-28 sm:h-32 [@media(max-height:760px)]:h-24 border-slate-100 shadow-inner dark:border-slate-800"
      className="space-y-1.5"
      hintText=""
    />
  );

  return (
    <Card
      className={cn(
        'relative z-20 shrink-0 origin-center overflow-hidden rounded-2xl border-2 shadow-lg backdrop-blur-md transition-transform duration-300 sm:rounded-3xl [@media(max-height:760px)]:rounded-xl',
        studentKioskCenterStackClass,
        !t
          ? 'border-primary/25 bg-card/90 dark:border-amber-400/60 dark:bg-slate-900/90'
          : '',
        className,
      )}
      style={
        t
          ? {
              backgroundColor: 'var(--theme-card)',
              borderColor: 'var(--theme-primary)',
              color: 'var(--theme-text)',
            }
          : undefined
      }
    >
      <CardHeader className="border-b px-4 pb-3 pt-4 text-center sm:px-6 sm:pb-4 sm:pt-5 [@media(max-height:760px)]:px-3 [@media(max-height:760px)]:pb-2 [@media(max-height:760px)]:pt-3" style={t ? { borderColor: 'var(--theme-bg)' } : undefined}>
        <Helper content={couponHelperText}>
          <CardTitle className="flex items-center justify-center gap-2 text-xl font-black uppercase tracking-wide sm:text-2xl md:text-3xl [@media(max-height:760px)]:text-lg [@media(max-height:760px)]:gap-1.5">
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 [@media(max-height:760px)]:h-8 [@media(max-height:760px)]:w-8',
                !t && 'bg-slate-100 dark:bg-slate-800',
              )}
              style={t ? { backgroundColor: 'var(--theme-bg)' } : undefined}
            >
              <Wallet className="h-5 w-5 sm:h-6 sm:w-6 [@media(max-height:760px)]:h-4 [@media(max-height:760px)]:w-4" style={t ? { color: 'var(--theme-primary)' } : undefined} />
            </div>
            {libraryCheckoutNote ? 'Scan coupon or book' : 'Redeem Coupon'}
          </CardTitle>
        </Helper>
        {libraryCheckoutNote ? (
          <div
            className={cn(
              'mt-2 flex items-start gap-1.5 rounded-lg border px-2 py-1.5 text-left text-[10px] font-semibold leading-snug sm:text-xs [@media(max-height:760px)]:hidden',
              !t && 'border-sky-200/80 bg-sky-50/90 text-sky-950 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-100',
            )}
            style={
              t
                ? {
                    borderColor: 'color-mix(in srgb, var(--theme-primary) 35%, transparent)',
                    backgroundColor: 'color-mix(in srgb, var(--theme-primary) 12%, var(--theme-card))',
                    color: 'var(--theme-text)',
                  }
                : undefined
            }
          >
            <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
            <span>{libraryCheckoutNote}</span>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="min-w-0 overflow-x-hidden p-4 pt-3 sm:p-6 sm:pt-4 [@media(max-height:760px)]:p-3 [@media(max-height:760px)]:pt-2">
        {showCameraCoupon ? (
          <div className="w-full min-w-0 space-y-2 [@media(max-height:760px)]:space-y-1.5">
            {cameraPane}
            <form
              className="flex min-w-0 w-full flex-col gap-1.5 sm:flex-row sm:gap-1.5"
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                void onRedeemCoupon();
              }}
            >
              <Input
                placeholder="Or type coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="h-10 w-full min-w-0 rounded-lg border-2 font-mono text-left text-sm tracking-widest sm:flex-1 [@media(max-height:760px)]:h-9"
                style={
                  t
                    ? {
                        backgroundColor: 'var(--theme-bg)',
                        borderColor: 'var(--theme-primary)',
                        color: 'var(--theme-text)',
                      }
                    : undefined
                }
                autoComplete="one-time-code"
              />
              <Button
                type="submit"
                className="h-10 w-full shrink-0 rounded-lg px-6 text-xs font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 sm:w-auto [@media(max-height:760px)]:h-9"
                style={
                  t
                    ? {
                        backgroundColor: 'var(--theme-primary)',
                        color: primaryForeground,
                      }
                    : { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }
                }
              >
                Redeem
              </Button>
            </form>
          </div>
        ) : showManualCoupon ? (
          manualEntry
        ) : null}
      </CardContent>
    </Card>
  );
}

export type StudentKioskMorePrizesButtonProps = {
  themed: StudentKioskThemed;
  primaryForeground: string;
  schoolId: string;
  studentId: string;
  onClick?: () => void;
  className?: string;
};

export function StudentKioskMorePrizesButton({
  themed,
  primaryForeground,
  schoolId,
  studentId,
  onClick,
  className,
}: StudentKioskMorePrizesButtonProps) {
  const t = themed.active;

  const label = (
    <>
      <Gift className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden />
      More prizes
    </>
  );

  if (onClick) {
    return (
      <Button
        type="button"
        onClick={onClick}
        className={cn(
          'h-12 w-full shrink-0 text-sm font-black uppercase tracking-wide shadow-md sm:h-14 sm:text-base',
          !t && 'bg-gradient-to-r from-primary to-primary/90',
          className,
        )}
        style={
          t
            ? {
                backgroundColor: 'var(--theme-primary)',
                color: primaryForeground,
              }
            : undefined
        }
      >
        <span className="flex items-center justify-center gap-2">{label}</span>
      </Button>
    );
  }

  return (
    <Button
      asChild
      className={cn(
        'h-12 w-full shrink-0 text-sm font-black uppercase tracking-wide shadow-md sm:h-14 sm:text-base',
        !t && 'bg-gradient-to-r from-primary to-primary/90',
        className,
      )}
      style={
        t
          ? {
              backgroundColor: 'var(--theme-primary)',
              color: primaryForeground,
            }
          : undefined
      }
    >
      <Link
        href={`/${schoolId}/student?shop=prizes`}
        className="flex items-center justify-center gap-2"
      >
        {label}
      </Link>
    </Button>
  );
}

export type StudentKioskMoreActivityButtonProps = {
  themed: StudentKioskThemed;
  primaryForeground: string;
  onClick: () => void;
  className?: string;
};

export function StudentKioskMoreActivityButton({
  themed,
  primaryForeground,
  onClick,
  className,
}: StudentKioskMoreActivityButtonProps) {
  const t = themed.active;

  return (
    <Button
      type="button"
      onClick={onClick}
      className={cn(
        'h-12 w-full shrink-0 text-sm font-black uppercase tracking-wide shadow-md sm:h-14 sm:text-base',
        !t && 'bg-gradient-to-r from-primary to-primary/90',
        className,
      )}
      style={
        t
          ? {
              backgroundColor: 'var(--theme-primary)',
              color: primaryForeground,
            }
          : undefined
      }
    >
      <span className="flex items-center justify-center gap-2">
        <Clock className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden />
        More activity
      </span>
    </Button>
  );
}

export type StudentKioskMobileRewardsGridProps = {
  themed: StudentKioskThemed;
  primaryForeground: string;
  rewards: Prize[];
  prizesLoading: boolean;
  onRewardClick: (reward: Prize) => void;
  className?: string;
};

export function StudentKioskMobileRewardsGrid({
  themed,
  primaryForeground,
  rewards,
  prizesLoading,
  onRewardClick,
  className,
}: StudentKioskMobileRewardsGridProps) {
  const t = themed.active;

  return (
    <div className={cn('flex min-h-0 min-w-0 flex-col gap-2', className)}>
      <p className="shrink-0 text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
        Eligible rewards
      </p>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto pb-2">
        {prizesLoading
          ? [...Array(6)].map((_, i) => (
              <Skeleton key={`m-${i}`} className="min-h-[6.5rem] w-full rounded-xl" />
            ))
          : rewards.map((reward) => (
              <button
                key={reward.id}
                type="button"
                data-stagger-card
                onClick={() => onRewardClick(reward)}
                aria-label={`Redeem ${reward.name || 'prize'}`}
                className={cn(
                  'reward-card flex min-h-[6.5rem] min-w-0 cursor-pointer flex-col items-stretch justify-between gap-1 rounded-2xl border p-2 text-center shadow-sm',
                  'transition-[box-shadow] duration-500 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] hover:shadow-lg motion-reduce:transition-none',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  !t && 'border-slate-100 bg-white/40 dark:border-slate-800 dark:bg-slate-800/40',
                )}
                style={
                  t
                    ? {
                        backgroundColor: 'var(--theme-bg)',
                        color: 'var(--theme-text)',
                        borderColor: 'var(--theme-primary)',
                        borderWidth: 1,
                        borderStyle: 'solid',
                      }
                    : undefined
                }
              >
                <p
                  className={cn(
                    'z-10 min-h-0 shrink text-sm font-black leading-tight line-clamp-2 break-words [overflow-wrap:anywhere] sm:text-base',
                    !t && 'text-slate-800 dark:text-white',
                  )}
                  style={t ? { color: 'var(--theme-text)' } : undefined}
                >
                  {reward.name}
                </p>
                <div className="z-10 mt-auto flex w-full shrink-0 flex-col items-center gap-1.5 pt-0.5">
                  <Badge
                    variant="secondary"
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-black tracking-wider',
                      !t && 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
                    )}
                    style={
                      t ? { backgroundColor: 'var(--theme-primary)', color: primaryForeground } : undefined
                    }
                  >
                    {(reward.points || 0).toLocaleString()} PTS
                  </Badge>
                  <span
                    className={cn(
                      'inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest sm:text-[11px]',
                      !t &&
                        'bg-primary/10 text-primary ring-1 ring-inset ring-primary/25 dark:bg-primary/20 dark:text-primary',
                    )}
                    style={
                      t
                        ? {
                            backgroundColor: 'color-mix(in srgb, var(--theme-primary) 18%, transparent)',
                            color: 'var(--theme-primary)',
                            boxShadow:
                              'inset 0 0 0 1px color-mix(in srgb, var(--theme-primary) 38%, transparent)',
                          }
                        : undefined
                    }
                  >
                    Tap to redeem
                  </span>
                </div>
              </button>
            ))}
        {!prizesLoading && rewards.length === 0 ? (
          <div
            className={cn(
              'col-span-2 flex flex-col items-center justify-center rounded-xl border border-dashed py-8 text-center',
              !t && 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50',
            )}
            style={
              t
                ? {
                    backgroundColor: 'var(--theme-bg)',
                    borderColor: 'var(--theme-primary)',
                    color: 'var(--theme-text)',
                  }
                : undefined
            }
          >
            <Sparkles className="mb-2 h-6 w-6 opacity-60" aria-hidden />
            <p className="text-xs font-black">Almost there!</p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-widest opacity-70">
              Keep earning points to unlock rewards
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
