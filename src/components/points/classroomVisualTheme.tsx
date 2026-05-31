'use client';

import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import {
  ChevronDown,
  Heart,
  LayoutGrid,
  Monitor,
  Palette,
  Sparkles,
  Star,
} from 'lucide-react';
import { cn, getStudentNickname } from '@/lib/utils';
import type { Student } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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
    return 'mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 shadow-sm backdrop-blur-md';
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
  student: Student;
  index: number;
  accentColor: string;
  sessionPts: number;
  showBalance: boolean;
  showSession: boolean;
  photoUrl?: string;
};

function DeskInner({
  design,
  student,
  index,
  accentColor,
  sessionPts,
  showBalance,
  showSession,
}: ClassroomDeskVisualProps) {
  const initials = studentInitials(student);
  const name = getStudentNickname(student);
  const points = student.points ?? 0;

  if (design === 'minimal') {
    return (
      <>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-[10px] font-semibold sm:h-12 sm:w-12 sm:text-xs">
          {initials}
        </div>
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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-500 text-[10px] font-semibold text-white shadow-lg shadow-indigo-500/40 sm:h-12 sm:w-12 sm:text-xs">
            {initials}
          </div>
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
    const grad = PLAYFUL_PALETTES[index % PLAYFUL_PALETTES.length];
    return (
      <>
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-xs font-bold text-white shadow-lg sm:h-14 sm:w-14 sm:text-sm',
            grad,
          )}
        >
          {initials}
        </div>
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
        <div className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-foreground bg-yellow-300 text-[10px] font-black uppercase sm:h-14 sm:w-14 sm:text-xs">
          {initials}
        </div>
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
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-[10px] font-semibold text-primary-foreground shadow-md shadow-primary/20 sm:h-12 sm:w-12 sm:text-xs">
        {initials}
      </div>
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
    'group relative flex h-full min-h-0 w-full flex-col items-center justify-center gap-1 overflow-hidden p-1 transition-all duration-300',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
    hasStudent && !editMode && 'hover:-translate-y-0.5 hover:shadow-md',
    editMode && hasStudent && 'cursor-grab active:cursor-grabbing',
    isPending && 'z-10 scale-[1.02] ring-4 ring-primary',
    isFlashing && 'animate-pulse ring-4 ring-emerald-400/80',
    isBurstSelected && 'ring-4 ring-sky-500 bg-sky-500/10',
    isRandom && 'z-10 animate-pulse ring-4 ring-amber-400',
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
      'rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur hover:border-white/30 hover:bg-white/[0.06]',
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

export function ClassroomDeskVisual(props: ClassroomDeskVisualProps) {
  return <DeskInner {...props} />;
}

export function ClassroomSessionBadge({
  sessionPts,
  tight,
}: {
  sessionPts: number;
  tight?: boolean;
}) {
  if (sessionPts === 0) return null;
  return (
    <span
      className={cn(
        'absolute right-0.5 top-0.5 z-[1] rounded-md px-1 font-black leading-none',
        sessionPts > 0 ? 'bg-emerald-500/90 text-white' : 'bg-rose-500/90 text-white',
        tight ? 'text-[8px]' : 'text-[9px]',
      )}
    >
      {sessionPts > 0 ? '+' : ''}
      {sessionPts}
    </span>
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
  const current = CLASSROOM_DESIGNS.find((d) => d.id === activeDesign) ?? CLASSROOM_DESIGNS[0];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium shadow-sm transition-colors hover:bg-accent sm:text-sm"
          title="Seating chart style"
        >
          <Palette className="h-4 w-4 text-primary" />
          <span>{current.label}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="z-[250] w-72 p-3" align="end">
        <p className="mb-1 text-sm font-semibold">Seating chart style</p>
        <p className="mb-3 text-xs leading-snug text-muted-foreground">
          Desk shapes, colors, and accents for this classroom chart. Light and dark mode come from your app
          theme in profile settings — not here.
        </p>
        <div className="space-y-1">
          {CLASSROOM_DESIGNS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onDesignChange(d.id)}
              className={cn(
                'flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                d.id === activeDesign ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60',
              )}
            >
              <div className="flex-1">
                <div className="font-semibold">{d.label}</div>
                <div className="text-xs text-muted-foreground">{d.description}</div>
              </div>
              {d.id === activeDesign && <div className="mt-1.5 h-2 w-2 rounded-full bg-primary" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
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
};

function scopedParticleCount(effect: ClassroomEffect): number {
  if (effect === 'fireworks') return 14;
  if (effect === 'sparkles') return 10;
  if (effect === 'snow') return 12;
  if (effect === 'hearts') return 6;
  if (effect === 'stars') return 7;
  if (effect === 'confetti') return 16;
  return 0;
}

export function ClassroomEffectOverlay({
  effect,
  runId,
}: {
  effect: ClassroomEffect;
  runId: number;
}) {
  const particles = useMemo((): FxParticle[] => {
    if (effect === 'none') return [];
    const count = scopedParticleCount(effect);
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.35,
      duration: 0.9 + Math.random() * 1.1,
      size: 6 + Math.random() * 10,
      hue: Math.floor(Math.random() * 360),
      angle: Math.random() * 360,
      dist: 25 + Math.random() * 35,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runId is intentionally included to regenerate particles on each play
  }, [effect, runId]);

  if (effect === 'none') return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[inherit]">
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
          return (
            <span
              key={p.id}
              style={{ ...common, top: -8, background: `hsl(${p.hue} 90% 60%)`, borderRadius: 2 }}
              className="block animate-classroom-fx-fall-scoped"
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
                top: `${Math.random() * 100}%`,
                color: `hsl(${p.hue} 90% 70%)`,
              }}
              className="block animate-classroom-fx-twinkle-scoped"
            >
              <Sparkles className="h-full w-full" />
            </span>
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
              background: `hsl(${p.hue} 95% 60%)`,
              borderRadius: '50%',
              boxShadow: `0 0 8px hsl(${p.hue} 95% 60%)`,
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

export type ActiveClassroomCelebration = {
  effect: ClassroomEffect;
  cellIndex: number;
  runId: number;
};

export function useClassroomCelebrationEffect() {
  const [active, setActive] = useState<ActiveClassroomCelebration | null>(null);

  const playEffectAtCell = (effect: ClassroomEffect, cellIndex: number) => {
    if (effect === 'none') return;
    setActive({ effect, cellIndex, runId: Date.now() });
  };

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setActive(null), 2800);
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
