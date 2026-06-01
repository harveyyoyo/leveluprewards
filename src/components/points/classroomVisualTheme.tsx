'use client';

import { memo, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import {
  Heart,
  LayoutGrid,
  Monitor,
  Palette,
  Sparkles,
  Star,
} from 'lucide-react';
import { cn, getStudentNickname } from '@/lib/utils';
import type { ClassroomDeskDisplay } from '@/lib/classroom/classroomDeskDisplay';
import type { Student } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';

import type { ClassroomDesign } from '@/lib/classroomSeatingChart';
import { normalizeClassroomDesign } from '@/lib/classroomSeatingChart';

export type { ClassroomDesign };

export type ClassroomEffect =
  | 'none'
  | 'confetti'
  | 'sparkles'
  | 'hearts'
  | 'stars'
  | 'fireworks'
  | 'snow';

export const CLASSROOM_DESIGNS: { id: ClassroomDesign; label: string; description: string }[] = [
  { id: 'aurora', label: 'Aurora', description: 'Gradient & glow' },
  { id: 'minimal', label: 'Minimal', description: 'Clean & monochrome' },
  { id: 'playful', label: 'Playful', description: 'Colorful avatars' },
  { id: 'brutalist', label: 'Brutalist', description: 'Sharp & bold' },
];

const PLAYFUL_PALETTES = [
  'from-indigo-500 to-violet-500',
  'from-rose-500 to-orange-500',
  'from-emerald-500 to-teal-500',
  'from-sky-500 to-cyan-500',
  'from-amber-500 to-pink-500',
  'from-fuchsia-500 to-purple-500',
];

export function classroomDesignShellClass(design: ClassroomDesign, isFullscreen: boolean): string {
  const base = isFullscreen ? 'flex h-full min-h-0 flex-col' : 'space-y-4';
  const bg =
    design === 'minimal'
      ? 'bg-background'
      : design === 'midnight'
        ? 'bg-[#0b0b1a] text-white'
        : design === 'playful'
          ? 'bg-gradient-to-br from-rose-50 via-amber-50 to-sky-50 dark:from-rose-950/40 dark:via-amber-950/30 dark:to-sky-950/40'
          : design === 'brutalist'
            ? 'bg-yellow-50 dark:bg-yellow-950/30'
            : 'bg-gradient-to-br from-primary/5 via-background to-primary/10';
  return cn(base, bg, design === 'midnight' && 'rounded-xl');
}

export function classroomControlsBarClass(design: ClassroomDesign): string {
  if (design === 'midnight') {
    return 'mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 shadow-sm';
  }
  if (design === 'brutalist') {
    return 'mb-3 flex flex-wrap items-center gap-2 border-2 border-foreground bg-card p-3 shadow-[4px_4px_0_0_hsl(var(--foreground))]';
  }
  return 'mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/70 p-3 shadow-sm backdrop-blur-md';
}

function studentInitials(student: Student) {
  const first = getStudentNickname(student).charAt(0).toUpperCase();
  const last = (student.lastName || '').charAt(0).toUpperCase();
  return `${first}${last}` || '?';
}

export type ClassroomDeskVisualProps = {
  design: ClassroomDesign;
  /** Prefer `display` for seating grid performance. */
  display?: ClassroomDeskDisplay;
  student?: Student;
  index: number;
  accentColor: string;
  sessionPts: number;
  showBalance: boolean;
  showSession: boolean;
  photoDisplayMode?: 'cover' | 'contain';
};

function deskAvatarShellClass(design: ClassroomDesign, index: number): string {
  const base = 'flex shrink-0 items-center justify-center overflow-hidden';
  if (design === 'minimal') {
    return cn(
      base,
      'h-10 w-10 rounded-full border border-border text-[10px] font-semibold sm:h-12 sm:w-12 sm:text-xs',
    );
  }
  if (design === 'midnight') {
    return cn(
      base,
      'h-10 w-10 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-500 text-[10px] font-semibold text-white shadow-lg shadow-indigo-500/40 sm:h-12 sm:w-12 sm:text-xs',
    );
  }
  if (design === 'playful') {
    return cn(
      base,
      'h-11 w-11 rounded-2xl bg-gradient-to-br text-xs font-bold text-white shadow-lg sm:h-14 sm:w-14 sm:text-sm',
      PLAYFUL_PALETTES[index % PLAYFUL_PALETTES.length],
    );
  }
  if (design === 'brutalist') {
    return cn(
      base,
      'h-11 w-11 border-2 border-foreground bg-yellow-300 text-[10px] font-black uppercase sm:h-14 sm:w-14 sm:text-xs',
    );
  }
  return cn(
    base,
    'h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/80 text-[10px] font-semibold text-primary-foreground shadow-md shadow-primary/20 sm:h-12 sm:w-12 sm:text-xs',
  );
}

function DeskAvatar({
  design,
  index,
  initials,
  photoUrl,
  photoDisplayMode = 'cover',
}: {
  design: ClassroomDesign;
  index: number;
  initials: string;
  photoUrl?: string;
  photoDisplayMode?: 'cover' | 'contain';
}) {
  const shell = deskAvatarShellClass(design, index);
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt=""
        className={cn(
          shell,
          photoDisplayMode === 'cover' ? 'object-cover' : 'object-contain bg-muted/30',
        )}
      />
    );
  }
  return <div className={shell}>{initials}</div>;
}

function DeskInner({
  design,
  display,
  student,
  index,
  accentColor,
  sessionPts,
  showBalance,
  showSession,
  photoDisplayMode,
}: ClassroomDeskVisualProps) {
  const initials = display?.initials ?? (student ? studentInitials(student) : '?');
  const name = display?.name ?? (student ? getStudentNickname(student) : '');
  const points = display?.points ?? student?.points ?? 0;
  const photoUrl = display?.photoUrl ?? student?.photoUrl;
  const avatar = (
    <DeskAvatar
      design={design}
      index={index}
      initials={initials}
      photoUrl={photoUrl}
      photoDisplayMode={photoDisplayMode}
    />
  );

  if (design === 'minimal') {
    return (
      <>
        {avatar}
        <div className="line-clamp-2 text-center text-[10px] font-semibold sm:text-xs">{name}</div>
        {showBalance && (
          <div className="text-[9px] tabular-nums text-muted-foreground sm:text-[10px]">
            {points.toLocaleString()} pts
          </div>
        )}
      </>
    );
  }

  if (design === 'midnight') {
    return (
      <>
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-indigo-500/20 via-transparent to-fuchsia-500/20 opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="relative flex flex-col items-center justify-center gap-1">
          {avatar}
          <div className="line-clamp-2 text-center text-[10px] font-semibold text-white sm:text-xs">{name}</div>
          {showBalance && (
            <div className="text-[9px] tabular-nums text-indigo-200 sm:text-[10px]">
              {points.toLocaleString()} pts
            </div>
          )}
        </div>
      </>
    );
  }

  if (design === 'playful') {
    return (
      <>
        {avatar}
        <div className="line-clamp-2 text-center text-[10px] font-bold sm:text-xs">{name}</div>
        {showBalance && (
          <div className="rounded-full bg-foreground/5 px-2 py-0.5 text-[9px] font-semibold tabular-nums sm:text-[10px]">
            {points.toLocaleString()} pts
          </div>
        )}
      </>
    );
  }

  if (design === 'brutalist') {
    return (
      <>
        {avatar}
        <div className="line-clamp-2 text-center text-[10px] font-black uppercase sm:text-xs">{name}</div>
        {showBalance && (
          <div className="text-[9px] font-bold tabular-nums sm:text-[10px]">{points.toLocaleString()} PTS</div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-primary to-primary/60 opacity-0 transition-opacity group-hover:opacity-100" />
      {avatar}
      <div className="line-clamp-2 text-center text-[10px] font-semibold sm:text-xs">{name}</div>
      {showBalance && (
        <div className="flex items-baseline gap-0.5">
          <span className="text-[10px] font-bold tabular-nums text-primary sm:text-xs">
            {points.toLocaleString()}
          </span>
          <span className="text-[9px] text-muted-foreground">pts</span>
        </div>
      )}
    </>
  );
}

/** Same motion + glow as student kiosk `animate-fly-up`. */
const STUDENT_FLY_UP_TEXT =
  'animate-fly-up font-black tracking-widest text-emerald-400 drop-shadow-[0_0_14px_rgba(52,211,153,0.75)]';

const CLASSROOM_FLY_UP_SIZE_TEXT = {
  small: 'text-2xl',
  medium: 'text-3xl',
  large: 'text-4xl sm:text-5xl',
} as const;

export function classroomStudentDeskClass(
  design: ClassroomDesign,
  state: {
    isPending?: boolean;
    isFlashing?: boolean;
    isBurstSelected?: boolean;
    isRandom?: boolean;
    editMode?: boolean;
    hasStudent: boolean;
  },
): string {
  const { isPending, isFlashing, isBurstSelected, isRandom, editMode, hasStudent } = state;
  const interactive = cn(
    'group relative flex h-full min-h-0 w-full flex-col items-center justify-center gap-1 p-1',
    hasStudent ? 'overflow-visible' : 'overflow-hidden',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
    hasStudent && !editMode && 'hover:shadow-sm [@media(hover:hover)]:hover:-translate-y-px',
    editMode && hasStudent && 'cursor-grab active:cursor-grabbing',
    isPending && 'z-10 scale-[1.02] ring-4 ring-primary',
    isFlashing && 'z-10 ring-4 ring-emerald-400/80',
    isBurstSelected && 'ring-4 ring-sky-500 bg-sky-500/10',
    isRandom && 'z-10 ring-4 ring-amber-400',
  );

  if (!hasStudent) {
    if (design === 'midnight') {
      return cn(
        interactive,
        'rounded-2xl border-2 border-dashed border-white/20 bg-white/[0.02]',
      );
    }
    if (design === 'brutalist') {
      return cn(interactive, 'border-2 border-dashed border-foreground bg-yellow-50/80');
    }
    const radius = design === 'minimal' ? 'rounded-xl' : design === 'playful' ? 'rounded-3xl' : 'rounded-2xl';
    return cn(
      interactive,
      radius,
      'border-2 border-dashed border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10',
    );
  }

  if (design === 'minimal') {
    return cn(
      interactive,
      'rounded-xl border border-border bg-card hover:border-foreground/40',
    );
  }
  if (design === 'midnight') {
    return cn(
      interactive,
      'rounded-2xl border border-white/10 bg-white/[0.06] hover:border-white/30 hover:bg-white/[0.1]',
    );
  }
  if (design === 'playful') {
    return cn(
      interactive,
      'rounded-3xl border-2 border-white bg-white shadow-[0_8px_24px_-8px_rgba(0,0,0,0.12)] hover:-rotate-1 hover:scale-[1.03]',
    );
  }
  if (design === 'brutalist') {
    return cn(
      interactive,
      'border-2 border-foreground bg-card shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:-translate-x-0.5 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_hsl(var(--foreground))]',
    );
  }
  return cn(
    interactive,
    'rounded-2xl border border-border bg-card shadow-sm hover:border-primary/30',
  );
}

export function ClassroomEmptyDeskLabel({ design }: { design: ClassroomDesign }) {
  if (design === 'midnight') {
    return <span className="text-[10px] font-medium text-white/40 sm:text-xs">Empty seat</span>;
  }
  if (design === 'brutalist') {
    return <span className="text-[10px] font-black uppercase sm:text-xs">Empty</span>;
  }
  return <span className="text-[10px] font-medium text-muted-foreground sm:text-xs">Empty seat</span>;
}

export const ClassroomDeskVisual = memo(function ClassroomDeskVisual(props: ClassroomDeskVisualProps) {
  return <DeskInner {...props} />;
});

export function ClassroomSessionBadge({
  sessionPts,
  lastAwardLabel,
  tight,
}: {
  sessionPts: number;
  /** Latest quick-award label for this student this session. */
  lastAwardLabel?: string | null;
  tight?: boolean;
}) {
  if (sessionPts === 0 && !lastAwardLabel) return null;
  return (
    <div
      className={cn(
        'absolute bottom-0.5 right-0.5 z-[1] flex max-w-[92%] flex-col items-end gap-0.5',
        tight && 'max-w-[88%]',
      )}
    >
      {sessionPts !== 0 ? (
        <span
          className={cn(
            'rounded-md px-1 font-black leading-none',
            sessionPts > 0 ? 'bg-emerald-500/90 text-white' : 'bg-rose-500/90 text-white',
            tight ? 'text-[8px]' : 'text-[9px]',
          )}
        >
          {sessionPts > 0 ? '+' : ''}
          {sessionPts}
        </span>
      ) : null}
      {lastAwardLabel ? (
        <span
          className={cn(
            'max-w-full truncate rounded border border-emerald-500/30 bg-background/95 px-1 font-semibold leading-tight text-emerald-800 shadow-sm dark:text-emerald-200',
            tight ? 'text-[7px]' : 'text-[8px]',
          )}
          title={lastAwardLabel}
        >
          {lastAwardLabel}
        </span>
      ) : null}
    </div>
  );
}

export function ClassroomTeacherDesk({
  design,
  frontAtBottom = false,
}: {
  design: ClassroomDesign;
  frontAtBottom?: boolean;
}) {
  const frontHint = frontAtBottom
    ? 'Front of class — bottom of screen'
    : 'Front of class — top of screen';
  const edgeMargin = frontAtBottom ? 'mt-2' : 'mb-2';

  if (design === 'midnight') {
    return (
      <div
        className={cn(
          'flex shrink-0 items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-2.5 shadow-inner',
          edgeMargin,
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 shadow-lg shadow-indigo-500/30">
          <Monitor className="h-5 w-5 text-white" />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold tracking-wide text-white">Teacher desk</p>
          <p className="text-[10px] text-white/50">{frontHint}</p>
        </div>
      </div>
    );
  }
  if (design === 'brutalist') {
    return (
      <div
        className={cn(
          'flex shrink-0 items-center justify-center gap-3 border-2 border-foreground bg-yellow-300 px-4 py-2 shadow-[4px_4px_0_0_hsl(var(--foreground))]',
          frontAtBottom ? 'mt-2' : 'mb-2',
        )}
      >
        <Monitor className="h-6 w-6 text-foreground" strokeWidth={2.5} />
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-wider text-foreground">Teacher desk</p>
          <p className="text-[10px] font-bold uppercase text-foreground/70">{frontHint}</p>
        </div>
      </div>
    );
  }
  if (design === 'playful') {
    return (
      <div
        className={cn(
          'flex shrink-0 items-center justify-center gap-3 rounded-3xl border-2 border-white bg-white px-5 py-2.5 shadow-lg',
          edgeMargin,
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md">
          <Monitor className="h-5 w-5" />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-foreground">Teacher desk</p>
          <p className="text-[10px] text-muted-foreground">{frontHint}</p>
        </div>
      </div>
    );
  }
  if (design === 'minimal') {
    return (
      <div
        className={cn(
          'flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-border bg-muted/30 px-4 py-2',
          edgeMargin,
        )}
      >
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-semibold text-foreground">Teacher desk</p>
        </div>
        <p className="text-[10px] text-muted-foreground">{frontHint}</p>
      </div>
    );
  }
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center gap-3 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card to-primary/10 px-5 py-2.5 shadow-sm',
        edgeMargin,
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md">
        <Monitor className="h-5 w-5" />
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-foreground">Teacher desk</p>
        <p className="text-[10px] text-muted-foreground">{frontHint}</p>
      </div>
    </div>
  );
}

export function ClassroomToolButton({
  icon: Icon,
  label,
  primary,
  active,
  onClick,
  disabled,
  title,
  design,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  primary?: boolean;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  design: ClassroomDesign;
}) {
  const isDark = design === 'midnight';
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50 sm:px-4 sm:py-2.5 sm:text-sm',
        primary || active
          ? isDark
            ? 'border-transparent bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/30'
            : 'border-transparent bg-gradient-to-r from-primary to-primary/85 text-primary-foreground shadow-md shadow-primary/25'
          : isDark
            ? 'border-white/15 bg-white/5 text-white hover:border-white/30'
            : design === 'brutalist'
              ? 'border-foreground bg-card text-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:bg-yellow-100'
              : 'border-border bg-card text-foreground shadow-sm hover:border-primary/40 hover:text-primary',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </button>
  );
}

export function ClassroomDesignSwitcher({
  design,
  onDesignChange,
}: {
  design: ClassroomDesign;
  onDesignChange: (d: ClassroomDesign) => void;
}) {
  const activeDesign = normalizeClassroomDesign(design);

  return (
    <Select value={activeDesign} onValueChange={(v) => onDesignChange(v as ClassroomDesign)}>
      <SelectTrigger
        className="h-auto w-auto gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium shadow-sm hover:bg-accent sm:text-sm [&>svg:last-child]:h-4 [&>svg:last-child]:w-4"
        aria-label="Seating chart style"
      >
        <Palette className="h-4 w-4 shrink-0 text-primary" />
        <span>Style</span>
      </SelectTrigger>
      <SelectContent className="z-[250] w-56" position="popper" align="end">
        <p className="px-2 pb-2 pt-1 text-xs leading-snug text-muted-foreground">
          Desk shapes and accents. App light/dark mode is in profile settings.
        </p>
        {CLASSROOM_DESIGNS.map((d) => (
          <SelectItem key={d.id} value={d.id} className="text-sm">
            <span className="font-semibold">{d.label}</span>
            <span className="text-xs text-muted-foreground"> — {d.description}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type FxParticle = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  hue: number;
  angle: number;
  dist: number;
  /** Confetti strip width (px). */
  width?: number;
  /** Confetti strip height (px). */
  height?: number;
  /** Horizontal sway for falling particles (px). */
  drift?: number;
  /** End rotation (deg). */
  spin?: number;
  shape?: 'rect' | 'circle';
  /** Fireworks burst origin (%). */
  originLeft?: number;
  originTop?: number;
  /** Smaller falling spark after main burst. */
  trail?: boolean;
};

function scopedParticleCount(effect: ClassroomEffect): number {
  if (effect === 'fireworks') return 72;
  if (effect === 'sparkles') return 30;
  if (effect === 'snow') return 28;
  if (effect === 'hearts') return 18;
  if (effect === 'stars') return 20;
  if (effect === 'confetti') return 56;
  return 0;
}

function buildCelebrationParticles(effect: ClassroomEffect, count: number): FxParticle[] {
  if (effect === 'confetti') {
    return Array.from({ length: count }, (_, i) => {
      const isStrip = i % 3 !== 1;
      const base = 5 + Math.random() * 9;
      return {
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.65,
        duration: 1.15 + Math.random() * 1.35,
        size: base,
        width: isStrip ? 3 + Math.random() * 5 : 6 + Math.random() * 10,
        height: isStrip ? 11 + Math.random() * 16 : 5 + Math.random() * 9,
        hue: Math.floor(Math.random() * 360),
        angle: 0,
        dist: 0,
        drift: (Math.random() - 0.5) * 44,
        spin: 420 + Math.random() * 900,
        shape: i % 6 === 0 ? 'circle' : 'rect',
      };
    });
  }

  if (effect === 'fireworks') {
    const burstOrigins = [
      { left: 28 + Math.random() * 8, top: 32 + Math.random() * 12, delay: 0 },
      { left: 52 + Math.random() * 8, top: 26 + Math.random() * 14, delay: 0.2 },
      { left: 72 + Math.random() * 8, top: 34 + Math.random() * 12, delay: 0.42 },
    ];
    const particles: FxParticle[] = [];
    let id = 0;
    const sparksPerBurst = Math.floor(count / burstOrigins.length);

    for (const origin of burstOrigins) {
      for (let i = 0; i < sparksPerBurst; i++) {
        const isTrail = i >= sparksPerBurst - 10;
        particles.push({
          id: id++,
          left: origin.left,
          delay: origin.delay + (isTrail ? 0.12 + Math.random() * 0.18 : Math.random() * 0.1),
          duration: isTrail ? 1.1 + Math.random() * 0.9 : 0.75 + Math.random() * 0.85,
          size: isTrail ? 2.5 + Math.random() * 4 : 5 + Math.random() * 11,
          hue: Math.floor(Math.random() * 360),
          angle: (360 / sparksPerBurst) * i + Math.random() * 18,
          dist: isTrail ? 22 + Math.random() * 38 : 42 + Math.random() * 72,
          originLeft: origin.left,
          originTop: origin.top,
          trail: isTrail,
        });
      }
    }
    return particles;
  }

  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.45,
    duration: 0.95 + Math.random() * 1.25,
    size: 6 + Math.random() * 12,
    hue: Math.floor(Math.random() * 360),
    angle: Math.random() * 360,
    dist: 28 + Math.random() * 42,
  }));
}

export function ClassroomEffectOverlay({
  effect,
  runId,
  points = 0,
}: {
  effect: ClassroomEffect;
  runId: number;
  points?: number;
}) {
  const particles = useMemo((): FxParticle[] => {
    if (effect === 'none') return [];
    return buildCelebrationParticles(effect, scopedParticleCount(effect));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runId regenerates particles each play
  }, [effect, runId]);

  if (effect === 'none') return null;

  const spillsOverDesk = effect === 'confetti' || effect === 'fireworks' || effect === 'sparkles';

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 z-10 rounded-[inherit]',
        spillsOverDesk ? 'overflow-visible' : 'overflow-hidden',
      )}
    >
      {effect === 'fireworks'
        ? [0, 0.2, 0.42].map((delay, i) => (
            <span
              key={`fw-core-${runId}-${i}`}
              className="pointer-events-none absolute animate-classroom-fx-firework-flash-scoped motion-reduce:opacity-70"
              style={{
                left: `${[30, 54, 76][i]}%`,
                top: `${[36, 30, 38][i]}%`,
                animationDelay: `${delay}s`,
              }}
              aria-hidden
            />
          ))
        : null}
      {particles.map((p) => {
        const common: React.CSSProperties = {
          position: 'absolute',
          left: `${p.left}%`,
          width: p.size,
          height: p.size,
          animationDelay: `${p.delay}s`,
          animationDuration: `${p.duration}s`,
        };
        if (effect === 'confetti') {
          const w = p.width ?? p.size;
          const h = p.height ?? p.size * 0.65;
          return (
            <span
              key={p.id}
              style={{
                position: 'absolute',
                left: `${p.left}%`,
                top: -16 - (p.id % 5) * 4,
                width: w,
                height: h,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                background: `hsl(${p.hue} 92% 58%)`,
                borderRadius: p.shape === 'circle' ? '50%' : 2,
                boxShadow: `0 0 6px hsl(${p.hue} 90% 60% / 0.45)`,
                ['--fx-drift' as string]: `${p.drift ?? 0}px`,
                ['--fx-spin' as string]: `${p.spin ?? 720}deg`,
              }}
              className="block animate-classroom-fx-confetti-scoped"
            />
          );
        }
        if (effect === 'snow') {
          return (
            <span
              key={p.id}
              style={{
                ...common,
                top: -8,
                background: 'white',
                borderRadius: '50%',
                opacity: 0.85,
                boxShadow: '0 0 4px rgba(255,255,255,0.8)',
              }}
              className="block animate-classroom-fx-fall-scoped"
            />
          );
        }
        if (effect === 'hearts') {
          return (
            <span
              key={p.id}
              style={{
                ...common,
                bottom: 0,
                top: 'auto',
                color: `hsl(${340 + (p.hue % 20)} 85% 60%)`,
              }}
              className="block animate-classroom-fx-rise-scoped"
            >
              <Heart className="h-full w-full" fill="currentColor" strokeWidth={0} />
            </span>
          );
        }
        if (effect === 'stars') {
          return (
            <span
              key={p.id}
              style={{
                ...common,
                bottom: 0,
                top: 'auto',
                color: `hsl(${45 + (p.hue % 30)} 95% 60%)`,
              }}
              className="block animate-classroom-fx-rise-scoped"
            >
              <Star className="h-full w-full" fill="currentColor" strokeWidth={0} />
            </span>
          );
        }
        if (effect === 'sparkles') {
          return (
            <span
              key={p.id}
              style={{
                ...common,
                top: `${10 + (p.id % 7) * 12}%`,
                left: `${p.left}%`,
                color: `hsl(${p.hue} 92% 68%)`,
                filter: 'drop-shadow(0 0 4px currentColor)',
              }}
              className="block animate-classroom-fx-twinkle-scoped"
            >
              <Sparkles className="h-full w-full" />
            </span>
          );
        }
        if (effect === 'fireworks') {
          const x = Math.cos((p.angle * Math.PI) / 180) * p.dist;
          const y = Math.sin((p.angle * Math.PI) / 180) * p.dist;
          const sparkSize = p.trail ? p.size * 0.45 : p.size * 0.6;
          return (
            <span
              key={p.id}
              style={{
                position: 'absolute',
                left: `${p.originLeft ?? 50}%`,
                top: `${p.originTop ?? 45}%`,
                width: sparkSize,
                height: sparkSize,
                background: p.trail
                  ? `hsl(${p.hue} 98% 72%)`
                  : `radial-gradient(circle, hsl(${p.hue} 98% 78%) 0%, hsl(${p.hue} 95% 58%) 55%, hsl(${p.hue} 90% 45%) 100%)`,
                borderRadius: '50%',
                boxShadow: p.trail
                  ? `0 0 6px hsl(${p.hue} 95% 70% / 0.9)`
                  : `0 0 12px hsl(${p.hue} 95% 65% / 0.95), 0 0 22px hsl(${p.hue} 95% 55% / 0.45)`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                ['--fx-x' as string]: `${x}%`,
                ['--fx-y' as string]: `${y}%`,
                ['--fx-gravity' as string]: `${8 + (p.id % 5) * 3}%`,
              }}
              className={
                p.trail
                  ? 'block animate-classroom-fx-firework-trail-scoped'
                  : 'block animate-classroom-fx-firework-burst-scoped'
              }
            />
          );
        }
        const x = Math.cos((p.angle * Math.PI) / 180) * p.dist;
        const y = Math.sin((p.angle * Math.PI) / 180) * p.dist;
        return (
          <span
            key={p.id}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: p.size * 0.55,
              height: p.size * 0.55,
              background: `hsl(${p.hue} 95% 62%)`,
              borderRadius: '50%',
              boxShadow: `0 0 10px hsl(${p.hue} 95% 60% / 0.85), 0 0 18px hsl(${p.hue} 95% 60% / 0.35)`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              ['--fx-x' as string]: `${x}%`,
              ['--fx-y' as string]: `${y}%`,
            }}
            className="block animate-classroom-fx-burst-scoped"
          />
        );
      })}
    </div>
  );
}

/** Simple award flash on desk (separate from particle celebration and kiosk fly-up). */
export const ClassroomDeskFlashOverlay = memo(function ClassroomDeskFlashOverlay({
  points,
  runId,
  showPointsBadge,
  subtle = false,
}: {
  points: number;
  runId: number;
  showPointsBadge: boolean;
  /** Lighter pulse when fly-up carries the main feedback. */
  subtle?: boolean;
}) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[12] overflow-visible rounded-[inherit]"
      aria-hidden
    >
      <span
        key={`burst-${runId}`}
        className={cn(
          'absolute inset-0 rounded-[inherit] animate-classroom-desk-flash-burst motion-reduce:opacity-60',
          subtle
            ? 'bg-[radial-gradient(circle_at_50%_50%,rgba(52,211,153,0.45)_0%,transparent_68%)]'
            : 'bg-[radial-gradient(circle_at_50%_55%,rgba(52,211,153,0.7)_0%,rgba(16,185,129,0.28)_45%,transparent_72%)]',
        )}
      />
      {!subtle ? (
        <>
          <span
            key={`wave-${runId}`}
            className="absolute inset-0 rounded-[inherit] border-2 border-emerald-400/80 animate-classroom-desk-flash-wave motion-reduce:border-emerald-400"
          />
          <span
            key={`shine-${runId}`}
            className="absolute inset-0 overflow-hidden rounded-[inherit]"
          >
            <span className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-classroom-desk-flash-shine motion-reduce:opacity-40" />
          </span>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span
              key={`spark-${runId}-${i}`}
              className="absolute h-1.5 w-1.5 rounded-full bg-emerald-300 animate-classroom-desk-flash-spark motion-reduce:opacity-70"
              style={{
                left: `${18 + i * 14}%`,
                top: `${22 + (i % 3) * 18}%`,
                animationDelay: `${i * 0.06}s`,
              }}
            />
          ))}
        </>
      ) : null}
      {showPointsBadge && points > 0 ? (
        <span
          key={`pts-${runId}`}
          className="absolute -right-0.5 -top-0.5 z-[14] rounded-md border border-emerald-400/50 bg-emerald-500 px-1.5 py-0.5 text-[11px] font-black tabular-nums text-white shadow-[0_0_12px_rgba(16,185,129,0.75)] animate-classroom-desk-flash-badge motion-reduce:opacity-100"
        >
          +{points}
        </span>
      ) : null}
    </div>
  );
});

/** Kiosk-style +PTS — same fly-up as student page (`animate-fly-up` 1.5s ease-out). */
export function ClassroomKioskFlyUpOverlay({
  points,
  runId,
  studentName,
  size = 'medium',
  mode = 'desk',
}: {
  points: number;
  runId: number;
  studentName?: string;
  size?: keyof typeof CLASSROOM_FLY_UP_SIZE_TEXT;
  /** `viewport` = fixed layer over the page (not clipped by desk cells). */
  mode?: 'desk' | 'viewport';
}) {
  const name = (studentName || '').trim();
  const content = (
    <div key={runId} className="flex w-max max-w-[min(92vw,20rem)] flex-col items-center gap-1 text-center">
      {name ? (
        <span
          className={cn(
            STUDENT_FLY_UP_TEXT,
            'max-w-full truncate text-lg uppercase sm:text-xl',
          )}
        >
          {name}
        </span>
      ) : null}
      <span className={cn(STUDENT_FLY_UP_TEXT, CLASSROOM_FLY_UP_SIZE_TEXT[size])}>
        +{points} PTS
      </span>
    </div>
  );

  if (mode === 'viewport') {
    return <div className="pointer-events-none -translate-x-1/2 -translate-y-1/2">{content}</div>;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[30] flex items-center justify-center overflow-visible px-2 py-1">
      {content}
    </div>
  );
}

export type ActiveClassroomCelebration = {
  effect: ClassroomEffect;
  cellIndex: number;
  runId: number;
  points: number;
};

export function useClassroomCelebrationEffect() {
  const [active, setActive] = useState<ActiveClassroomCelebration | null>(null);

  const playEffectAtCell = (effect: ClassroomEffect, cellIndex: number, points: number) => {
    if (effect === 'none') return;
    setActive({ effect, cellIndex, runId: Date.now(), points });
  };

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setActive(null), 3800);
    return () => clearTimeout(t);
  }, [active]);

  return { playEffectAtCell, activeCelebration: active };
}

export function ClassroomHeaderBrand({
  design,
  studentCount,
  className,
}: {
  design: ClassroomDesign;
  studentCount: number;
  className?: string;
}) {
  const isDark = design === 'midnight';
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center shadow-md',
          design === 'brutalist'
            ? 'border-2 border-foreground bg-yellow-300'
            : design === 'minimal'
              ? 'rounded-xl border border-border bg-card'
              : 'rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-primary/25',
        )}
      >
        <LayoutGrid
          className={cn(
            'h-5 w-5',
            design === 'brutalist' || design === 'minimal' ? 'text-foreground' : 'text-primary-foreground',
          )}
        />
      </div>
      <div>
        <h2 className={cn('text-lg font-bold tracking-tight sm:text-xl', isDark && 'text-white')}>
          Classroom
        </h2>
        <p className={cn('text-xs', isDark ? 'text-white/60' : 'text-muted-foreground')}>
          {studentCount} on chart · live seating
        </p>
      </div>
    </div>
  );
}

export function ClassroomIconButton({
  children,
  onClick,
  title,
  design,
}: {
  children: ReactNode;
  onClick?: () => void;
  title?: string;
  design: ClassroomDesign;
}) {
  const isDark = design === 'midnight';
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-lg border transition-colors',
        isDark
          ? 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
          : design === 'brutalist'
            ? 'border-foreground bg-card text-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]'
            : 'border-border bg-background text-muted-foreground hover:text-primary',
      )}
    >
      {children}
    </button>
  );
}
