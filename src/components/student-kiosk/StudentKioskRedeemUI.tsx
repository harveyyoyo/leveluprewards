'use client';

import React, { type FormEvent, type ReactNode, type Ref } from 'react';
import Link from 'next/link';
import {
  Award,
  Camera,
  ChevronRight,
  Clock,
  Gift,
  HelpCircle,
  Keyboard,
  LogOut,
  ScanBarcode,
  ScanLine,
  Sparkles,
  Ticket,
  Type,
  Wallet,
} from 'lucide-react';

import DynamicIcon from '@/components/DynamicIcon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Helper } from '@/components/ui/helper';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Prize } from '@/lib/types';

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
}: StudentKioskBalancePillProps) {
  const t = themed.active;

  return (
    <div
      className={cn(
        'hidden shrink-0 items-center gap-3 rounded-2xl border px-4 py-2.5 shadow-lg backdrop-blur-sm md:flex sm:gap-5 sm:px-5',
        !t && 'border-border/60 bg-card/95',
      )}
      style={
        t
          ? {
              backgroundColor: 'color-mix(in srgb, var(--theme-card) 92%, white)',
              borderColor: 'color-mix(in srgb, var(--theme-primary) 22%, transparent)',
              color: 'var(--theme-text)',
            }
          : undefined
      }
    >
      <div className="text-center sm:text-left">
        <p
          className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-55"
          style={{ color: t ? 'var(--theme-text)' : undefined }}
        >
          Balance
        </p>
        <p
          className="text-lg font-black tabular-nums leading-none sm:text-xl"
          style={{ color: t ? 'var(--theme-primary)' : 'hsl(var(--primary))' }}
        >
          {points.toLocaleString()}{' '}
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">pts</span>
        </p>
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
              className="flex items-center justify-center gap-1 text-lg font-black tabular-nums leading-none sm:justify-start sm:text-xl"
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
        'relative flex flex-wrap items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed px-3 py-4 min-h-[3.5rem] text-center motion-safe:animate-[pulse_1.35s_ease-in-out_infinite] motion-reduce:animate-none sm:gap-3',
        !t &&
          'border-amber-400/80 bg-gradient-to-r from-amber-900/95 via-amber-950/92 to-amber-900/95 text-amber-50 shadow-[0_10px_44px_-10px_rgba(251,191,36,0.45)] dark:border-amber-500/55 dark:from-amber-900/95 dark:via-amber-950/92 dark:to-amber-900/95 dark:shadow-[0_10px_44px_-10px_rgba(251,191,36,0.38)]',
      )}
      style={
        t
          ? {
              borderColor: 'color-mix(in srgb, var(--theme-primary) 50%, transparent)',
              background: `linear-gradient(165deg, color-mix(in srgb, var(--theme-primary) 54%, var(--theme-card)), color-mix(in srgb, var(--theme-primary) 64%, var(--theme-card)) 50%, color-mix(in srgb, var(--theme-primary) 54%, var(--theme-card)))`,
              boxShadow: '0 12px 44px -10px color-mix(in srgb, var(--theme-primary) 48%, transparent)',
              color: 'rgba(248, 250, 252, 0.97)',
            }
          : undefined
      }
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
        <div
          className="student-kiosk-scan-beam absolute left-[8%] right-[8%] top-0 h-10 opacity-80"
          style={{
            background: t
              ? 'linear-gradient(180deg, transparent, color-mix(in srgb, white 55%, var(--theme-primary)), transparent)'
              : `linear-gradient(180deg, transparent, oklch(0.93 0.1 ${prizeAccentHue('scan', 0)} / 0.85), transparent)`,
          }}
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
  couponCode: string;
  setCouponCode: (code: string) => void;
  activeTab: 'manual' | 'camera';
  setActiveTab: (tab: 'manual' | 'camera') => void;
  showCouponMethodTabs: boolean;
  showManualCoupon: boolean;
  showCameraCoupon: boolean;
  couponSectionEnabled: boolean;
  onRedeemCoupon: (code?: string) => void | Promise<void>;
  onLogout: () => void;
  isKioskLocked: boolean;
  logoutTimer: number;
  videoRef: Ref<HTMLVideoElement | null>;
  hasCameraPermission: boolean;
  className?: string;
};

export function StudentKioskRedeemHero({
  themed,
  primaryForeground,
  couponHelperText,
  couponCode,
  setCouponCode,
  activeTab,
  setActiveTab,
  showCouponMethodTabs,
  showManualCoupon,
  showCameraCoupon,
  couponSectionEnabled,
  onRedeemCoupon,
  onLogout,
  isKioskLocked,
  logoutTimer,
  videoRef,
  hasCameraPermission,
  className,
}: StudentKioskRedeemHeroProps) {
  const t = themed.active;
  const showCameraPreview =
    showCameraCoupon && (!showCouponMethodTabs || activeTab === 'camera');

  if (!couponSectionEnabled) return null;

  const manualEntry = (
    <div className="w-full min-w-0 space-y-3">
      <ScanCouponScanZone themed={themed}>
        <ScanBarcode
          className={cn('h-7 w-7 shrink-0 sm:h-8 sm:w-8', !t && 'text-amber-200')}
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
            'max-w-full text-base sm:text-lg md:text-xl font-black uppercase tracking-[0.12em] sm:tracking-[0.18em] leading-snug',
            !t && 'text-amber-50',
          )}
          style={t ? { color: 'rgba(248, 250, 252, 0.97)' } : undefined}
        >
          Scan coupon
        </span>
        <p
          className="w-full text-center text-[11px] font-semibold opacity-90 sm:text-xs"
          style={t ? { color: 'rgba(248, 250, 252, 0.92)' } : undefined}
        >
          Hold your code under the camera, or type below
        </p>
      </ScanCouponScanZone>
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
          className="h-12 w-full min-w-0 rounded-xl border-2 font-mono text-left text-sm tracking-widest sm:flex-1"
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
          className="h-12 w-full shrink-0 rounded-xl px-6 text-xs font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 sm:w-auto"
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
      <p
        className="pt-1 text-center text-[10px]"
        style={
          t ? { color: 'var(--theme-text)', opacity: 0.7 } : { color: 'hsl(var(--muted-foreground))' }
        }
      >
        Available coupon codes can be viewed in the Admin panel.
      </p>
    </div>
  );

  const cameraPane = (
    <div className="relative h-36 overflow-hidden rounded-xl border-2 border-slate-100 bg-black shadow-inner sm:h-40 dark:border-slate-800">
            {/* videoRef allows null from parent useRef */}
            <video ref={videoRef as React.Ref<HTMLVideoElement>} className="h-full w-full object-cover" playsInline muted />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-3/2 w-3/4 rounded-2xl border-2 border-dashed border-white/40" />
      </div>
      {!hasCameraPermission ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 p-6 text-center backdrop-blur-sm">
          <Camera className="mb-4 h-12 w-12 text-destructive" />
          <p className="font-bold text-foreground">Camera access required</p>
          <p className="mt-2 text-xs text-muted-foreground">Please enable camera in settings</p>
        </div>
      ) : null}
    </div>
  );

  return (
    <Card
      className={cn(
        'relative z-20 mx-auto w-full min-w-0 max-w-xl shrink-0 origin-center overflow-hidden rounded-[32px] border-2 shadow-[0_24px_60px_rgba(15,23,42,0.28)] ring-4 ring-offset-4 ring-offset-background backdrop-blur-md transition-transform duration-300 lg:max-w-none',
        !t
          ? 'border-primary/25 bg-card/90 ring-primary/15 dark:border-amber-400/60 dark:bg-slate-900/90 dark:ring-amber-500/20'
          : '',
        className,
      )}
      style={
        t
          ? {
              backgroundColor: 'var(--theme-card)',
              borderColor: 'var(--theme-primary)',
              boxShadow: '0 24px 60px color-mix(in srgb, var(--theme-primary) 34%, transparent)',
              color: 'var(--theme-text)',
              ['--tw-ring-color' as string]: 'color-mix(in srgb, var(--theme-primary) 32%, transparent)',
            }
          : undefined
      }
    >
      <CardHeader className="border-b pb-3" style={t ? { borderColor: 'var(--theme-bg)' } : undefined}>
        <Helper content={couponHelperText}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-black">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg',
                  !t && 'bg-slate-100 dark:bg-slate-800',
                )}
                style={t ? { backgroundColor: 'var(--theme-bg)' } : undefined}
              >
                <Wallet className="h-4 w-4" style={t ? { color: 'var(--theme-primary)' } : undefined} />
              </div>
              Redeem Coupon
            </CardTitle>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div
                className={cn(
                  'whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest transition-colors',
                  isKioskLocked
                    ? 'border-red-100 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400'
                    : 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
                )}
                aria-label={isKioskLocked ? 'Kiosk locked' : `Auto logout in ${logoutTimer} seconds`}
              >
                <span>
                  {isKioskLocked ? 'Kiosk Locked • ' : ''}
                  {isKioskLocked ? 'Stays signed in' : `Auto-logout ${logoutTimer}`}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="relative h-8 whitespace-nowrap rounded-full px-3.5 text-[11px] font-bold uppercase tracking-widest"
                onClick={onLogout}
                aria-label="Log out now."
              >
                Logout
              </Button>
            </div>
          </div>
        </Helper>
      </CardHeader>
      <CardContent className="min-w-0 overflow-x-hidden pt-4">
        {showCouponMethodTabs ? (
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'manual' | 'camera')}
            className="w-full min-w-0"
          >
            <div className="mb-4 md:hidden">
              <Label htmlFor="student-coupon-entry-mode" className="sr-only">
                How to enter your coupon code
              </Label>
              <Select value={activeTab} onValueChange={(v) => setActiveTab(v as 'manual' | 'camera')}>
                <SelectTrigger
                  id="student-coupon-entry-mode"
                  className="h-12 w-full rounded-xl font-bold"
                  style={
                    t
                      ? {
                          backgroundColor: 'var(--theme-bg)',
                          borderColor: 'var(--theme-primary)',
                          color: 'var(--theme-text)',
                        }
                      : undefined
                  }
                  aria-label="Coupon entry method"
                >
                  <SelectValue placeholder="Choose method" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-[min(60vh,320px)]">
                  <SelectItem value="manual">Manual / USB scanner</SelectItem>
                  <SelectItem value="camera">Webcam scan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <TabsList
              className={cn(
                'mb-4 hidden h-12 min-w-0 w-full grid-cols-2 overflow-hidden rounded-xl p-1 md:grid',
                !t && 'bg-slate-100 dark:bg-slate-800',
              )}
              style={t ? { backgroundColor: 'var(--theme-bg)' } : undefined}
            >
              <TabsTrigger
                value="manual"
                className={cn(
                  'flex min-w-0 items-center gap-1.5 rounded-lg py-1 text-[12px] font-bold data-[state=active]:shadow-sm',
                  !t &&
                    'data-[state=active]:bg-white hover:bg-white hover:shadow-sm dark:data-[state=active]:bg-slate-700 dark:hover:bg-slate-700',
                  t && 'hover:bg-[var(--theme-card)] hover:text-[var(--theme-text)] hover:shadow-sm',
                )}
                style={
                  t && activeTab === 'manual'
                    ? { backgroundColor: 'var(--theme-card)', color: 'var(--theme-text)' }
                    : undefined
                }
              >
                <Type className="h-3.5 w-3.5" aria-hidden /> Manual / USB
              </TabsTrigger>
              <TabsTrigger
                value="camera"
                className={cn(
                  'flex min-w-0 items-center gap-1.5 rounded-lg py-1 text-[12px] font-bold data-[state=active]:shadow-sm',
                  !t &&
                    'data-[state=active]:bg-white hover:bg-white hover:shadow-sm dark:data-[state=active]:bg-slate-700 dark:hover:bg-slate-700',
                  t && 'hover:bg-[var(--theme-card)] hover:text-[var(--theme-text)] hover:shadow-sm',
                )}
                style={
                  t && activeTab === 'camera'
                    ? { backgroundColor: 'var(--theme-card)', color: 'var(--theme-text)' }
                    : undefined
                }
              >
                <Camera className="h-3.5 w-3.5" aria-hidden /> Webcam Scan
              </TabsTrigger>
            </TabsList>

            {activeTab === 'manual' ? (
              <div className="w-full min-w-0">{manualEntry}</div>
            ) : activeTab === 'camera' && showCouponMethodTabs ? (
              <div className="w-full min-w-0">{cameraPane}</div>
            ) : null}
          </Tabs>
        ) : showManualCoupon ? (
          manualEntry
        ) : showCameraCoupon ? (
          cameraPane
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

  return (
    <Button
      asChild
      className={cn(
        'h-10 w-full shrink-0 text-[10px] font-black uppercase tracking-wide shadow-md',
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
        href={`/${schoolId}/prize?student=${encodeURIComponent(studentId)}`}
        onClick={onClick}
        className="flex items-center justify-center gap-1.5"
      >
        <Gift className="h-3.5 w-3.5 shrink-0" aria-hidden />
        More prizes
      </Link>
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
