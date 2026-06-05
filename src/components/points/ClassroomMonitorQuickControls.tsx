'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronDown, GraduationCap, LayoutGrid, Monitor, Palette, PanelTop } from 'lucide-react';
import {
  CLASSROOM_DESIGNS,
  type ClassroomDesign,
} from '@/components/points/classroomVisualTheme';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { Class } from '@/lib/types';
import type { ClassroomCelebrationEffect, ClassroomSeatingPrefs } from '@/lib/classroomSeatingChart';
import { normalizeClassroomDesign } from '@/lib/classroomSeatingChart';
import { cn } from '@/lib/utils';

const MONITOR_POPOVER_Z = 'z-[500]';

const CELEBRATION_LABELS: Record<ClassroomCelebrationEffect, string> = {
  flash: 'Simple flash',
  none: 'None',
  sparkles: 'Sparkles',
  confetti: 'Confetti',
  hearts: 'Hearts',
  stars: 'Stars',
  fireworks: 'Fireworks',
  snow: 'Snow',
};

function monitorSelectTriggerClass(design: ClassroomDesign, isFullscreen: boolean) {
  const isDark = design === 'midnight';
  return cn(
    'h-auto w-auto gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-semibold shadow-sm sm:gap-2 sm:px-3 sm:py-2.5 sm:text-sm',
    isFullscreen && 'px-2 py-1.5 text-[11px] sm:px-2.5 sm:py-2 sm:text-xs',
    isDark
      ? 'border-white/15 bg-white/5 text-white hover:border-white/30'
      : design === 'brutalist'
        ? 'border-foreground bg-card text-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]'
        : 'border-border bg-card text-foreground hover:border-primary/40 hover:text-primary',
  );
}

const MonitorCategoryMenuTrigger = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    design: ClassroomDesign;
    isFullscreen: boolean;
    icon: LucideIcon;
    label: string;
  }
>(({ design, isFullscreen, icon: Icon, label, className, type = 'button', ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn(
      monitorSelectTriggerClass(design, isFullscreen),
      'inline-flex items-center',
      className,
    )}
    {...props}
  >
    <Icon className="h-4 w-4 shrink-0" aria-hidden />
    <span>{label}</span>
    <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
  </button>
));
MonitorCategoryMenuTrigger.displayName = 'MonitorCategoryMenuTrigger';

function MonitorCategoryPopover({
  design,
  isFullscreen,
  icon,
  label,
  contentClassName,
  children,
}: {
  design: ClassroomDesign;
  isFullscreen: boolean;
  icon: LucideIcon;
  label: string;
  contentClassName?: string;
  children: ReactNode;
}) {
  return (
    <Popover modal>
      <PopoverTrigger asChild>
        <MonitorCategoryMenuTrigger design={design} isFullscreen={isFullscreen} icon={icon} label={label} />
      </PopoverTrigger>
      <PopoverContent
        className={cn(MONITOR_POPOVER_Z, 'rounded-xl p-3', contentClassName)}
        align="start"
        collisionPadding={12}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}

function ClassroomMonitorClassMenu({
  design,
  classes,
  classId,
  isFullscreen,
  onChange,
}: {
  design: ClassroomDesign;
  classes: Class[];
  classId: string;
  isFullscreen: boolean;
  onChange: (classId: string) => void;
}) {
  if (classes.length <= 1) return null;

  const sorted = classes.slice().sort((a, b) => a.name.localeCompare(b.name));

  return (
    <MonitorCategoryPopover
      design={design}
      isFullscreen={isFullscreen}
      icon={GraduationCap}
      label="Class"
      contentClassName="w-56"
    >
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Class</p>
      <div className="space-y-1">
        {sorted.map((c) => (
          <button
            key={c.id}
            type="button"
            className={cn(
              'w-full rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted',
              classId === c.id && 'bg-primary/10 ring-1 ring-primary/30',
            )}
            onClick={() => onChange(c.id)}
          >
            <span className="font-semibold">{c.name}</span>
          </button>
        ))}
      </div>
    </MonitorCategoryPopover>
  );
}

function ClassroomMonitorDeskDisplayMenu({
  design,
  prefs,
  isFullscreen,
  onChange,
}: {
  design: ClassroomDesign;
  prefs: ClassroomSeatingPrefs;
  isFullscreen: boolean;
  onChange: (patch: Partial<ClassroomSeatingPrefs>) => void;
}) {
  return (
    <MonitorCategoryPopover
      design={design}
      isFullscreen={isFullscreen}
      icon={Monitor}
      label="Desk display"
      contentClassName="w-72"
    >
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Desk display</p>
      <div className="space-y-2">
        <label className="flex cursor-pointer items-start gap-2">
          <Checkbox
            className="mt-0.5"
            checked={prefs.showPointBalances}
            onCheckedChange={(v) => onChange({ showPointBalances: v === true })}
          />
          <span className="text-xs leading-snug">
            <span className="font-semibold">Point balances</span> — current total on each desk.
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2">
          <Checkbox
            className="mt-0.5"
            checked={prefs.showSessionTotals}
            onCheckedChange={(v) => onChange({ showSessionTotals: v === true })}
          />
          <span className="text-xs leading-snug">
            <span className="font-semibold">Session badges</span> — session points and last award label.
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2">
          <Checkbox
            className="mt-0.5"
            checked={prefs.showLastName}
            onCheckedChange={(v) => onChange({ showLastName: v === true })}
          />
          <span className="text-xs leading-snug">
            <span className="font-semibold">Last names</span> — append surname after each desk label.
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2">
          <Checkbox
            className="mt-0.5"
            checked={prefs.showStudentEmoji}
            onCheckedChange={(v) => onChange({ showStudentEmoji: v === true })}
          />
          <span className="text-xs leading-snug">
            <span className="font-semibold">Student emoji</span> — sticker or theme emoji on avatars.
          </span>
        </label>
      </div>
    </MonitorCategoryPopover>
  );
}

function ClassroomMonitorToolbarOptionsMenu({
  design,
  prefs,
  isFullscreen,
  rewardsPillarOn,
  onChange,
}: {
  design: ClassroomDesign;
  prefs: ClassroomSeatingPrefs;
  isFullscreen: boolean;
  rewardsPillarOn: boolean;
  onChange: (patch: Partial<ClassroomSeatingPrefs>) => void;
}) {
  const flyUpValue = !prefs.showKioskFlyUp ? 'off' : prefs.kioskFlyUpSize;

  return (
    <MonitorCategoryPopover
      design={design}
      isFullscreen={isFullscreen}
      icon={PanelTop}
      label="Toolbar options"
      contentClassName="w-[min(100vw-2rem,22rem)] max-h-[min(70vh,520px)] overflow-y-auto"
    >
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Toolbar options</p>

      <div className="space-y-4">
        {rewardsPillarOn ? (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-foreground">Award source</p>
            <RadioGroup
              value={prefs.awardSource}
              onValueChange={(v) => {
                if (v === 'local' || v === 'categories') onChange({ awardSource: v });
              }}
              className="gap-2"
            >
              <label className="flex cursor-pointer items-start gap-2">
                <RadioGroupItem value="local" className="mt-0.5" aria-label="Local rewards" />
                <span className="text-xs leading-snug">
                  <span className="font-semibold">Local rewards</span> — classroom quick awards saved to classroom
                  balance.
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2">
                <RadioGroupItem value="categories" className="mt-0.5" aria-label="Reward categories" />
                <span className="text-xs leading-snug">
                  <span className="font-semibold">Reward categories</span> — Points tab categories sync to rewards
                  balance.
                </span>
              </label>
            </RadioGroup>
          </div>
        ) : null}

        <div className={cn('space-y-2', rewardsPillarOn && 'border-t border-border/40 pt-3')}>
          <p className="text-[11px] font-bold text-foreground">Show on toolbar</p>
          <label className="flex cursor-pointer items-start gap-2">
            <Checkbox
              className="mt-0.5"
              checked={prefs.showRandomPicker}
              onCheckedChange={(v) => onChange({ showRandomPicker: v === true })}
            />
            <span className="text-xs leading-snug">
              <span className="font-semibold">Random picker</span> — Random button and{' '}
              <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">R</kbd> shortcut.
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2">
            <Checkbox
              className="mt-0.5"
              checked={prefs.showClassAwardButton}
              onCheckedChange={(v) => onChange({ showClassAwardButton: v === true })}
            />
            <span className="text-xs leading-snug">
              <span className="font-semibold">Entire class award</span> — Class +N button for everyone on the chart.
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2">
            <Checkbox
              className="mt-0.5"
              checked={prefs.showBurstAward}
              onCheckedChange={(v) => onChange({ showBurstAward: v === true })}
            />
            <span className="text-xs leading-snug">
              <span className="font-semibold">Burst award</span> — select several students, then award once.
            </span>
          </label>
        </div>

        <div className="space-y-2 border-t border-border/40 pt-3">
          <p className="text-[11px] font-bold text-foreground">Tap mode</p>
          <RadioGroup
            value={prefs.instantTap ? 'quick' : 'menu'}
            onValueChange={(v) => {
              if (v === 'quick' || v === 'menu') onChange({ instantTap: v === 'quick' });
            }}
            className="gap-2"
          >
            <label className="flex cursor-pointer items-start gap-2">
              <RadioGroupItem value="quick" className="mt-0.5" aria-label="Quick select" />
              <span className="text-xs leading-snug">
                <span className="font-semibold">Quick select</span> — one tap awards default points.
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2">
              <RadioGroupItem value="menu" className="mt-0.5" aria-label="Show awards menu" />
              <span className="text-xs leading-snug">
                <span className="font-semibold">Show awards menu</span> — tap opens the full awards menu.
              </span>
            </label>
          </RadioGroup>
        </div>

        <div className="space-y-2 border-t border-border/40 pt-3">
          <p className="text-[11px] font-bold text-foreground">Kiosk fly-up</p>
          <RadioGroup
            value={flyUpValue}
            onValueChange={(v) => {
              if (v === 'off') {
                onChange({ showKioskFlyUp: false });
                return;
              }
              onChange({
                showKioskFlyUp: true,
                kioskFlyUpSize: v as ClassroomSeatingPrefs['kioskFlyUpSize'],
              });
            }}
            className="gap-2"
          >
            {(['off', 'small', 'medium', 'large'] as const).map((size) => (
              <label key={size} className="flex cursor-pointer items-center gap-2">
                <RadioGroupItem value={size} aria-label={size === 'off' ? 'Fly-up off' : `${size} fly-up`} />
                <span className="text-xs font-medium capitalize">
                  {size === 'off' ? 'Off' : `${size} fly-up`}
                </span>
              </label>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-2 border-t border-border/40 pt-3">
          <p className="text-[11px] font-bold text-foreground">Celebration</p>
          <RadioGroup
            value={prefs.celebrationEffect}
            onValueChange={(v) => onChange({ celebrationEffect: v as ClassroomCelebrationEffect })}
            className="gap-2"
          >
            {(Object.keys(CELEBRATION_LABELS) as ClassroomCelebrationEffect[]).map((key) => (
              <label key={key} className="flex cursor-pointer items-center gap-2">
                <RadioGroupItem value={key} aria-label={CELEBRATION_LABELS[key]} />
                <span className="text-xs font-medium">{CELEBRATION_LABELS[key]}</span>
              </label>
            ))}
          </RadioGroup>
        </div>
      </div>
    </MonitorCategoryPopover>
  );
}

export function ClassroomMonitorQuickControls({
  design,
  prefs,
  classes,
  classId,
  isFullscreen = false,
  rewardsPillarOn = false,
  onChange,
  onClassChange,
}: {
  design: ClassroomDesign;
  prefs: ClassroomSeatingPrefs;
  classes: Class[];
  classId: string;
  isFullscreen?: boolean;
  rewardsPillarOn?: boolean;
  onChange: (patch: Partial<ClassroomSeatingPrefs>) => void;
  onClassChange?: (classId: string) => void;
}) {
  const activeDesign = normalizeClassroomDesign(prefs.design);

  if (!isFullscreen) return null;

  return (
    <>
      {onClassChange ? (
        <ClassroomMonitorClassMenu
          design={design}
          classes={classes}
          classId={classId}
          isFullscreen={isFullscreen}
          onChange={onClassChange}
        />
      ) : null}

      <Popover modal>
        <PopoverTrigger asChild>
          <MonitorCategoryMenuTrigger design={design} isFullscreen={isFullscreen} icon={Palette} label="Chart style" />
        </PopoverTrigger>
        <PopoverContent className={cn(MONITOR_POPOVER_Z, 'w-56 rounded-xl p-2')} align="start" collisionPadding={12}>
          <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Chart style</p>
          <div className="space-y-1">
            {CLASSROOM_DESIGNS.map((d) => (
              <button
                key={d.id}
                type="button"
                className={cn(
                  'w-full rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted',
                  activeDesign === d.id && 'bg-primary/10 ring-1 ring-primary/30',
                )}
                onClick={() => onChange({ design: d.id })}
              >
                <span className="font-semibold">{d.label}</span>
                <span className="block text-xs text-muted-foreground">{d.description}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Popover modal>
        <PopoverTrigger asChild>
          <MonitorCategoryMenuTrigger design={design} isFullscreen={isFullscreen} icon={LayoutGrid} label="Layout" />
        </PopoverTrigger>
        <PopoverContent className={cn(MONITOR_POPOVER_Z, 'w-56 rounded-xl p-3')} align="start" collisionPadding={12}>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Layout</p>
          <RadioGroup
            value={prefs.frontAtBottom ? 'bottom' : 'top'}
            onValueChange={(v) => onChange({ frontAtBottom: v === 'bottom' })}
            className="gap-2"
          >
            <label className="flex cursor-pointer items-center gap-2">
              <RadioGroupItem value="top" aria-label="Teacher desk at top" />
              <span className="text-xs font-medium">Teacher desk at top</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <RadioGroupItem value="bottom" aria-label="Teacher desk at bottom" />
              <span className="text-xs font-medium">Teacher desk at bottom</span>
            </label>
          </RadioGroup>
        </PopoverContent>
      </Popover>

      <ClassroomMonitorDeskDisplayMenu
        design={design}
        prefs={prefs}
        isFullscreen={isFullscreen}
        onChange={onChange}
      />

      <ClassroomMonitorToolbarOptionsMenu
        design={design}
        prefs={prefs}
        isFullscreen={isFullscreen}
        rewardsPillarOn={rewardsPillarOn}
        onChange={onChange}
      />
    </>
  );
}
