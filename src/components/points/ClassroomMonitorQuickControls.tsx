'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ChevronDown,
  GraduationCap,
  Hash,
  Monitor,
  Palette,
  PanelTop,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import {
  CLASSROOM_DESIGNS,
  type ClassroomDesign,
} from '@/components/points/classroomVisualTheme';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { Class } from '@/lib/types';
import type {
  ClassroomCelebrationEffect,
  ClassroomMonitorMenuTab,
  ClassroomSeatingPrefs,
} from '@/lib/classroomSeatingChart';
import {
  MONITOR_MENU_TAB_LABELS,
  MONITOR_MENU_TAB_ORDER,
  normalizeClassroomDesign,
  normalizeMonitorMenuTabs,
} from '@/lib/classroomSeatingChart';
import { cn } from '@/lib/utils';

const MONITOR_POPOVER_Z = 'z-[500]';

const CELEBRATION_LABELS: Record<ClassroomCelebrationEffect, string> = {
  flash: 'Flash',
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
  const menus = normalizeMonitorMenuTabs(prefs.monitorMenuTabs);

  const patchMenu = (key: ClassroomMonitorMenuTab, visible: boolean) => {
    onChange({
      monitorMenuTabs: {
        ...menus,
        [key]: visible,
      },
    });
  };

  return (
    <MonitorCategoryPopover
      design={design}
      isFullscreen={isFullscreen}
      icon={PanelTop}
      label="Toolbar options"
      contentClassName="w-64"
    >
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Toolbar options</p>

      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-foreground">Toolbar buttons</p>
          <label className="flex cursor-pointer items-start gap-2">
            <Checkbox
              className="mt-0.5"
              checked={prefs.showRandomPicker}
              onCheckedChange={(v) => onChange({ showRandomPicker: v === true })}
            />
            <span className="text-xs leading-snug">
              <span className="font-semibold">Random picker</span> — button +{' '}
              <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">R</kbd>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2">
            <Checkbox
              className="mt-0.5"
              checked={prefs.showClassAwardButton}
              onCheckedChange={(v) => onChange({ showClassAwardButton: v === true })}
            />
            <span className="text-xs leading-snug">
              <span className="font-semibold">Class +N award</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2">
            <Checkbox
              className="mt-0.5"
              checked={prefs.showBurstAward}
              onCheckedChange={(v) => onChange({ showBurstAward: v === true })}
            />
            <span className="text-xs leading-snug">
              <span className="font-semibold">Burst award</span>
            </span>
          </label>
        </div>

        <div className="space-y-2 border-t border-border/40 pt-3">
          <p className="text-[11px] font-bold text-foreground">Toolbar menus</p>
          <p className="text-[10px] text-muted-foreground">
            Chart style, tap mode, sounds, etc. Layout is on the arrange room bar while editing seats.
          </p>
          {MONITOR_MENU_TAB_ORDER.filter((key) => key !== 'awardSource').map((key) => (
              <label key={key} className="flex cursor-pointer items-center gap-2">
                <Checkbox checked={menus[key]} onCheckedChange={(v) => patchMenu(key, v === true)} />
                <span className="text-xs font-medium">{MONITOR_MENU_TAB_LABELS[key]}</span>
              </label>
            ))}
        </div>
      </div>
    </MonitorCategoryPopover>
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

export function ClassroomMonitorQuickControls({
  design,
  prefs,
  classes,
  classId,
  isFullscreen = false,
  editMode = false,
  rewardsPillarOn = false,
  onChange,
  onClassChange,
}: {
  design: ClassroomDesign;
  prefs: ClassroomSeatingPrefs;
  classes: Class[];
  classId: string;
  isFullscreen?: boolean;
  editMode?: boolean;
  rewardsPillarOn?: boolean;
  onChange: (patch: Partial<ClassroomSeatingPrefs>) => void;
  onClassChange?: (classId: string) => void;
}) {
  const activeDesign = normalizeClassroomDesign(prefs.design);
  const tabs = normalizeMonitorMenuTabs(prefs.monitorMenuTabs);
  const flyUpValue = !prefs.showKioskFlyUp ? 'off' : prefs.kioskFlyUpSize;

  if (!isFullscreen || editMode) return null;

  return (
    <div className="flex w-full min-w-0 flex-wrap items-start gap-1.5 sm:items-center sm:gap-2">
      <ClassroomMonitorToolbarOptionsMenu
        design={design}
        prefs={prefs}
        isFullscreen={isFullscreen}
        rewardsPillarOn={rewardsPillarOn}
        onChange={onChange}
      />

      {onClassChange ? (
        <ClassroomMonitorClassMenu
          design={design}
          classes={classes}
          classId={classId}
          isFullscreen={isFullscreen}
          onChange={onClassChange}
        />
      ) : null}

      {tabs.style ? (
        <MonitorCategoryPopover
          design={design}
          isFullscreen={isFullscreen}
          icon={Palette}
          label="Chart style"
          contentClassName="w-56"
        >
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Chart style</p>
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
        </MonitorCategoryPopover>
      ) : null}

      {tabs.deskDisplay ? (
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
                <span className="font-semibold">
                  {rewardsPillarOn ? 'Point balances' : 'Classroom balances'}
                </span>{' '}
                — {rewardsPillarOn ? 'rewards total' : 'classroom points total'} on each desk.
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
      ) : null}

      {tabs.tapMode ? (
        <MonitorCategoryPopover
          design={design}
          isFullscreen={isFullscreen}
          icon={Zap}
          label="Tap mode"
          contentClassName="w-64"
        >
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Tap mode</p>
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
        </MonitorCategoryPopover>
      ) : null}

      {tabs.effects ? (
        <MonitorCategoryPopover
          design={design}
          isFullscreen={isFullscreen}
          icon={Sparkles}
          label="Effects"
          contentClassName="w-64"
        >
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Kiosk fly-up</p>
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
            className="mb-4 gap-1"
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

          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Celebration</p>
          <RadioGroup
            value={prefs.celebrationEffect}
            onValueChange={(v) => onChange({ celebrationEffect: v as ClassroomCelebrationEffect })}
            className="grid grid-cols-2 gap-1"
          >
            {(Object.keys(CELEBRATION_LABELS) as ClassroomCelebrationEffect[]).map((key) => (
              <label key={key} className="flex cursor-pointer items-center gap-2">
                <RadioGroupItem value={key} aria-label={CELEBRATION_LABELS[key]} />
                <span className="text-xs font-medium">{CELEBRATION_LABELS[key]}</span>
              </label>
            ))}
          </RadioGroup>
        </MonitorCategoryPopover>
      ) : null}

      {tabs.defaults ? (
        <MonitorCategoryPopover
          design={design}
          isFullscreen={isFullscreen}
          icon={Hash}
          label="Default points"
          contentClassName="w-48"
        >
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Default points</p>
          <Input
            type="number"
            min={1}
            className="h-9 rounded-lg font-bold"
            value={prefs.defaultPoints}
            onChange={(e) =>
              onChange({ defaultPoints: Math.max(1, Number(e.target.value) || prefs.defaultPoints) })
            }
          />
          <p className="mt-2 text-[10px] text-muted-foreground">
            Used for quick tap, class award, and burst awards.
          </p>
        </MonitorCategoryPopover>
      ) : null}

      {tabs.sounds ? (
        <button
          type="button"
          className={cn(
            monitorSelectTriggerClass(design, isFullscreen),
            'inline-flex items-center justify-center px-2 py-2 sm:px-2.5',
            prefs.awardSounds === false && 'opacity-60',
          )}
          aria-label={prefs.awardSounds !== false ? 'Turn award sounds off' : 'Turn award sounds on'}
          title={prefs.awardSounds !== false ? 'Award sounds on — click to mute' : 'Award sounds off — click to unmute'}
          onClick={() => onChange({ awardSounds: prefs.awardSounds === false })}
        >
          {prefs.awardSounds !== false ? (
            <Volume2 className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <VolumeX className="h-4 w-4 shrink-0" aria-hidden />
          )}
        </button>
      ) : null}
    </div>
  );
}
