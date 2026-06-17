'use client';

import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Award,
  BadgeCheck,
  BookOpen,
  CalendarCheck,
  Candy,
  Coins,
  Cookie,
  Crown,
  Flame,
  FlaskConical,
  Gamepad2,
  Ghost,
  Gift,
  GraduationCap,
  Medal,
  Moon,
  Music2,
  Palette,
  PartyPopper,
  School,
  Smile,
  Sparkles,
  Star,
  Sun,
  Ticket,
  Trophy,
  Zap,
} from 'lucide-react';
import { useSettings } from '@/components/providers/SettingsProvider';
import {
  globalAnimatedBackdropActive,
  normalizeAnimatedBackgroundStyle,
  resolveAnimatedBackgroundStyle,
  sanitizeHiddenAnimatedBackgroundIds,
  type AnimatedBackgroundStyle,
} from '@/lib/animatedBackdrop';

function ArcadeLayer() {
  return (
    <>
      <div className="absolute inset-0 opacity-20">
        <Sparkles className="absolute top-10 left-10 w-8 h-8 text-chart-1 animate-float" style={{ animationDelay: '0s' }} />
        <Gamepad2 className="absolute top-32 left-8 w-12 h-12 text-foreground/50 -rotate-12 animate-float" style={{ animationDelay: '1s' }} />
        <Sparkles className="absolute top-40 right-16 w-6 h-6 text-chart-5 animate-float" style={{ animationDelay: '2s' }} />
        <Gamepad2 className="absolute top-20 right-6 w-10 h-10 text-foreground/50 rotate-12 animate-float" style={{ animationDelay: '3s' }} />
        <Sparkles className="absolute top-1/2 left-1/4 w-7 h-7 text-chart-2 animate-float" style={{ animationDelay: '0.5s' }} />
        <Gamepad2 className="absolute top-1/3 right-1/4 w-11 h-11 text-foreground/40 rotate-6 animate-float" style={{ animationDelay: '2.5s' }} />
        <Sparkles className="absolute bottom-40 left-12 w-10 h-10 text-chart-2 animate-float" style={{ animationDelay: '4s' }} />
        <Gamepad2 className="absolute bottom-32 right-12 w-12 h-12 text-foreground/50 -rotate-12 animate-float" style={{ animationDelay: '5s' }} />
        <Sparkles className="absolute bottom-20 right-24 w-8 h-8 text-chart-3 animate-float" style={{ animationDelay: '6s' }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-chart-1/10 via-chart-5/10 to-chart-3/10" />
    </>
  );
}

function AuroraLayer() {
  return (
    <>
      <div className="absolute -top-40 -left-32 h-[420px] w-[420px] rounded-full bg-chart-1/25 blur-[110px] animate-arcade-aurora-blob pointer-events-none" />
      <div className="absolute top-1/4 -right-28 h-[480px] w-[480px] rounded-full bg-chart-5/20 blur-[120px] animate-arcade-aurora-blob-slow pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 h-[380px] w-[380px] rounded-full bg-primary/15 blur-[100px] animate-arcade-aurora-blob-fast pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[560px] w-[560px] rounded-full bg-chart-3/10 blur-[130px] animate-arcade-aurora-blob pointer-events-none" style={{ animationDelay: '-12s' }} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/25 to-background/55 dark:via-background/35 dark:to-background/70" />
    </>
  );
}

function ClassroomLayer() {
  return (
    <>
      <div
        className="absolute inset-0 opacity-[0.14] dark:opacity-[0.2]"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--foreground) / 0.07) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground) / 0.07) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/20 via-background to-slate-900/10 dark:from-emerald-950/30 dark:to-slate-950/20" />
      <div className="absolute -top-24 -left-16 h-[min(420px,48vh)] w-[min(420px,48vh)] rounded-full bg-emerald-800/10 blur-[100px] animate-arcade-aurora-blob-slow pointer-events-none" />
      <div className="absolute bottom-0 right-0 h-[min(380px,42vh)] w-[min(380px,42vh)] rounded-full bg-slate-600/10 blur-[95px] animate-arcade-aurora-blob pointer-events-none" />
      <div className="absolute inset-0 opacity-25">
        <BookOpen className="absolute top-[14%] left-[10%] w-9 h-9 text-emerald-700/70 dark:text-emerald-400/55 animate-float" style={{ animationDelay: '0.3s' }} />
        <GraduationCap className="absolute top-[22%] right-[14%] w-10 h-10 text-foreground/35 animate-float" style={{ animationDelay: '1.4s' }} />
        <BookOpen className="absolute bottom-[28%] right-[12%] w-8 h-8 text-emerald-600/50 dark:text-emerald-500/45 animate-float" style={{ animationDelay: '2.1s' }} />
        <School className="absolute bottom-[18%] left-[16%] w-11 h-11 text-foreground/30 animate-float" style={{ animationDelay: '0.8s' }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/65 dark:to-background/80" />
    </>
  );
}

function CampusLayer() {
  return (
    <>
      <div className="absolute -top-32 left-[5%] h-[min(500px,55vh)] w-[min(500px,90vw)] rounded-full bg-sky-400/20 blur-[115px] animate-arcade-aurora-blob pointer-events-none" />
      <div className="absolute top-[35%] -right-[10%] h-[min(440px,48vh)] w-[min(440px,80vw)] rounded-full bg-blue-300/15 blur-[105px] animate-arcade-aurora-blob-slow pointer-events-none" />
      <div className="absolute -bottom-20 left-[25%] h-[min(360px,40vh)] w-[min(700px,95vw)] rounded-full bg-white/25 blur-[90px] animate-arcade-aurora-blob-fast pointer-events-none dark:bg-sky-100/10" />
      <div className="absolute inset-0 bg-gradient-to-b from-sky-500/10 via-transparent to-background/55 dark:from-sky-400/10 dark:to-background/75" />
      <div className="absolute inset-0 opacity-[0.22]">
        <GraduationCap className="absolute top-[12%] left-[18%] w-10 h-10 text-sky-600/55 dark:text-sky-400/45 animate-float" style={{ animationDelay: '0s' }} />
        <School className="absolute top-[40%] right-[10%] w-12 h-12 text-sky-700/40 dark:text-sky-300/35 animate-float" style={{ animationDelay: '1.2s' }} />
        <Sparkles className="absolute bottom-[24%] left-[22%] w-7 h-7 text-chart-2/60 animate-float" style={{ animationDelay: '2.4s' }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-background/15 via-background/40 to-background/70 dark:via-background/50 dark:to-background/85" />
    </>
  );
}

function StudyHallLayer() {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-amber-950/10 via-background to-stone-800/10 dark:from-amber-950/20 dark:to-stone-950/20" />
      <div className="absolute -top-20 right-[8%] h-[min(460px,50vh)] w-[min(460px,75vw)] rounded-full bg-amber-200/20 blur-[100px] animate-arcade-aurora-blob pointer-events-none dark:bg-amber-500/15" />
      <div className="absolute bottom-0 left-0 h-[min(400px,45vh)] w-[min(520px,85vw)] rounded-full bg-orange-900/10 blur-[95px] animate-arcade-aurora-blob-slow pointer-events-none dark:bg-orange-950/20" />
      <div className="absolute top-1/2 left-1/3 h-[min(320px,38vh)] w-[min(320px,50vw)] rounded-full bg-stone-400/10 blur-[85px] animate-arcade-aurora-blob-fast pointer-events-none dark:bg-stone-600/15" />
      <div className="absolute inset-0 opacity-[0.24]">
        <BookOpen className="absolute top-[18%] right-[20%] w-9 h-9 text-amber-800/50 dark:text-amber-200/40 animate-float" style={{ animationDelay: '0.5s' }} />
        <BookOpen className="absolute bottom-[32%] left-[12%] w-8 h-8 text-stone-600/45 dark:text-stone-400/40 animate-float" style={{ animationDelay: '1.8s' }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-background/55 via-amber-950/5 to-background/40 dark:from-background/70 dark:to-background/50" />
    </>
  );
}

const CONFETTI: { top: string; left: string; delay: string; w: number; h: number; rot: number; tone: 'c1' | 'c2' | 'c3' | 'c4' | 'c5' }[] = [
  { top: '8%', left: '11%', delay: '0s', w: 10, h: 16, rot: -8, tone: 'c1' },
  { top: '14%', left: '78%', delay: '0.4s', w: 12, h: 10, rot: 22, tone: 'c2' },
  { top: '26%', left: '44%', delay: '1.1s', w: 8, h: 18, rot: 5, tone: 'c3' },
  { top: '38%', left: '18%', delay: '0.2s', w: 14, h: 12, rot: -18, tone: 'c4' },
  { top: '42%', left: '86%', delay: '1.6s', w: 9, h: 14, rot: 14, tone: 'c5' },
  { top: '54%', left: '8%', delay: '0.9s', w: 11, h: 11, rot: 35, tone: 'c1' },
  { top: '58%', left: '62%', delay: '2s', w: 10, h: 15, rot: -12, tone: 'c2' },
  { top: '72%', left: '28%', delay: '0.6s', w: 13, h: 9, rot: 8, tone: 'c3' },
  { top: '78%', left: '74%', delay: '1.3s', w: 8, h: 12, rot: -25, tone: 'c4' },
  { top: '18%', left: '52%', delay: '1.9s', w: 12, h: 14, rot: 18, tone: 'c5' },
  { top: '66%', left: '48%', delay: '0.1s', w: 9, h: 9, rot: 42, tone: 'c1' },
  { top: '88%', left: '36%', delay: '2.2s', w: 11, h: 13, rot: -6, tone: 'c2' },
];

const toneClass: Record<(typeof CONFETTI)[number]['tone'], string> = {
  c1: 'bg-chart-1',
  c2: 'bg-chart-2',
  c3: 'bg-chart-3',
  c4: 'bg-chart-4',
  c5: 'bg-chart-5',
};

function CelebrationLayer() {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-chart-1/10 via-chart-5/5 to-chart-3/10" />
      <div className="absolute inset-0 opacity-[0.55]">
        {CONFETTI.map((p, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{ top: p.top, left: p.left, animationDelay: p.delay }}
          >
            <div
              className={`rounded-sm opacity-90 shadow-sm ${toneClass[p.tone]}`}
              style={{ width: p.w, height: p.h, transform: `rotate(${p.rot}deg)` }}
            />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 opacity-30">
        <Sparkles className="absolute top-[12%] right-[16%] w-8 h-8 text-chart-5 animate-float" style={{ animationDelay: '0.3s' }} />
        <Sparkles className="absolute bottom-[20%] left-[20%] w-7 h-7 text-chart-1 animate-float" style={{ animationDelay: '1.1s' }} />
        <Sparkles className="absolute top-[48%] left-[8%] w-6 h-6 text-chart-3 animate-float" style={{ animationDelay: '2s' }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-background/25 via-transparent to-background/60 dark:to-background/80" />
    </>
  );
}

function TrophyGlowLayer() {
  return (
    <>
      <div className="absolute -top-16 left-[12%] h-[min(480px,52vh)] w-[min(480px,52vh)] rounded-full bg-amber-400/30 blur-[105px] animate-arcade-aurora-blob-fast pointer-events-none" />
      <div className="absolute bottom-0 right-[5%] h-[min(420px,46vh)] w-[min(420px,46vh)] rounded-full bg-yellow-500/20 blur-[100px] animate-arcade-aurora-blob pointer-events-none" />
      <div className="absolute top-[38%] left-1/2 h-[min(380px,42vh)] w-[min(380px,70vw)] -translate-x-1/2 rounded-full bg-chart-4/20 blur-[95px] animate-arcade-aurora-blob-slow pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.28]">
        <Trophy className="absolute top-[16%] left-[14%] w-10 h-10 text-amber-600/70 dark:text-amber-400/60 animate-float" style={{ animationDelay: '0s' }} />
        <Sparkles className="absolute top-[24%] right-[18%] w-9 h-9 text-yellow-500/75 animate-float" style={{ animationDelay: '0.7s' }} />
        <Trophy className="absolute bottom-[26%] right-[22%] w-9 h-9 text-chart-4/65 animate-float" style={{ animationDelay: '1.5s' }} />
        <Sparkles className="absolute bottom-[18%] left-[24%] w-8 h-8 text-amber-500/70 animate-float" style={{ animationDelay: '2.2s' }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-background/65 dark:from-amber-400/10 dark:to-background/80" />
    </>
  );
}

function ScienceLabLayer() {
  return (
    <>
      <div
        className="absolute inset-0 opacity-[0.1] dark:opacity-[0.14]"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--primary) / 0.12) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.1) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="absolute -top-28 left-[8%] h-[min(440px,50vh)] w-[min(440px,50vh)] rounded-full bg-teal-500/20 blur-[105px] animate-arcade-aurora-blob pointer-events-none" />
      <div className="absolute top-[30%] -right-[12%] h-[min(400px,46vh)] w-[min(400px,46vh)] rounded-full bg-cyan-400/20 blur-[100px] animate-arcade-aurora-blob-slow pointer-events-none" />
      <div className="absolute -bottom-16 left-[20%] h-[min(360px,42vh)] w-[min(560px,90vw)] rounded-full bg-sky-500/15 blur-[95px] animate-arcade-aurora-blob-fast pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.26]">
        <FlaskConical className="absolute top-[16%] right-[18%] w-9 h-9 text-teal-600/65 dark:text-teal-400/55 animate-float" style={{ animationDelay: '0.4s' }} />
        <Sparkles className="absolute top-[38%] left-[12%] w-8 h-8 text-cyan-500/60 animate-float" style={{ animationDelay: '1.2s' }} />
        <FlaskConical className="absolute bottom-[24%] right-[14%] w-8 h-8 text-primary/50 animate-float" style={{ animationDelay: '2s' }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-teal-950/10 via-transparent to-background/70 dark:from-teal-950/15 dark:to-background/80" />
    </>
  );
}

function ArtStudioLayer() {
  return (
    <>
      <div className="absolute -top-20 -left-12 h-[min(380px,44vh)] w-[min(380px,44vh)] rounded-full bg-chart-1/20 blur-[95px] animate-arcade-aurora-blob-fast pointer-events-none" />
      <div className="absolute top-[20%] right-0 h-[min(420px,48vh)] w-[min(420px,48vh)] rounded-full bg-chart-5/20 blur-[100px] animate-arcade-aurora-blob pointer-events-none" />
      <div className="absolute bottom-0 left-[10%] h-[min(400px,45vh)] w-[min(640px,92vw)] rounded-full bg-chart-3/20 blur-[110px] animate-arcade-aurora-blob-slow pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 h-[min(340px,40vh)] w-[min(340px,55vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-chart-2/15 blur-[90px] animate-arcade-aurora-blob-fast pointer-events-none" style={{ animationDelay: '-5s' }} />
      <div className="absolute inset-0 opacity-[0.28]">
        <Palette className="absolute top-[14%] left-[16%] w-10 h-10 text-chart-4/70 animate-float" style={{ animationDelay: '0s' }} />
        <Sparkles className="absolute top-[42%] right-[12%] w-8 h-8 text-chart-1/65 animate-float" style={{ animationDelay: '1.1s' }} />
        <Palette className="absolute bottom-[20%] left-[22%] w-9 h-9 text-chart-5/60 animate-float" style={{ animationDelay: '1.8s' }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-chart-4/5 via-transparent to-chart-2/10" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background/65 dark:to-background/80" />
    </>
  );
}

function FieldDayLayer() {
  return (
    <>
      <div className="absolute -top-24 left-[6%] h-[min(480px,52vh)] w-[min(480px,52vh)] rounded-full bg-lime-400/20 blur-[105px] animate-arcade-aurora-blob pointer-events-none" />
      <div className="absolute top-[28%] -right-[8%] h-[min(420px,46vh)] w-[min(420px,46vh)] rounded-full bg-green-500/20 blur-[100px] animate-arcade-aurora-blob-slow pointer-events-none" />
      <div className="absolute -bottom-12 left-[28%] h-[min(380px,42vh)] w-[min(680px,94vw)] rounded-full bg-emerald-400/15 blur-[95px] animate-arcade-aurora-blob-fast pointer-events-none" />
      <div className="absolute top-[8%] right-[22%] h-[min(200px,22vh)] w-[min(200px,22vh)] rounded-full bg-yellow-200/25 blur-[70px] animate-arcade-aurora-blob-slow pointer-events-none dark:bg-yellow-100/10" />
      <div className="absolute inset-0 opacity-[0.3]">
        <Medal className="absolute top-[18%] left-[14%] w-10 h-10 text-lime-700/60 dark:text-lime-400/50 animate-float" style={{ animationDelay: '0.2s' }} />
        <Sparkles className="absolute top-[36%] right-[20%] w-9 h-9 text-chart-3/65 animate-float" style={{ animationDelay: '1.4s' }} />
        <Medal className="absolute bottom-[26%] left-[20%] w-9 h-9 text-emerald-600/55 dark:text-emerald-400/45 animate-float" style={{ animationDelay: '0.9s' }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-lime-500/5 via-transparent to-background/60 dark:to-background/80" />
    </>
  );
}

const MIDNIGHT_STARS: { top: string; left: string; delay: string; size: string }[] = [
  { top: '10%', left: '18%', delay: '0s', size: '2px' },
  { top: '14%', left: '72%', delay: '0.5s', size: '3px' },
  { top: '22%', left: '44%', delay: '1.1s', size: '2px' },
  { top: '32%', left: '12%', delay: '0.3s', size: '2px' },
  { top: '38%', left: '88%', delay: '1.6s', size: '3px' },
  { top: '48%', left: '56%', delay: '0.8s', size: '2px' },
  { top: '58%', left: '28%', delay: '2s', size: '2px' },
  { top: '68%', left: '78%', delay: '0.2s', size: '3px' },
  { top: '78%', left: '40%', delay: '1.3s', size: '2px' },
  { top: '12%', left: '92%', delay: '1.9s', size: '2px' },
];

function MidnightStudyLayer() {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/25 via-violet-950/10 to-background dark:from-indigo-950/35 dark:via-violet-950/20" />
      <div className="absolute -top-32 left-[10%] h-[min(460px,50vh)] w-[min(460px,50vh)] rounded-full bg-indigo-600/20 blur-[110px] animate-arcade-aurora-blob-slow pointer-events-none" />
      <div className="absolute bottom-0 right-0 h-[min(400px,44vh)] w-[min(400px,44vh)] rounded-full bg-violet-700/15 blur-[100px] animate-arcade-aurora-blob pointer-events-none" />
      <div className="absolute top-[40%] left-1/3 h-[min(320px,38vh)] w-[min(320px,50vw)] rounded-full bg-slate-500/10 blur-[90px] animate-arcade-aurora-blob-fast pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.55] dark:opacity-[0.65]">
        {MIDNIGHT_STARS.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/70 shadow-[0_0_4px_rgba(199,210,254,0.8)] animate-float dark:bg-indigo-100/80"
            style={{
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>
      <div className="absolute inset-0 opacity-[0.32]">
        <Moon className="absolute top-[12%] right-[16%] w-11 h-11 text-indigo-200/50 dark:text-indigo-300/45 animate-float" style={{ animationDelay: '0.4s' }} />
        <BookOpen className="absolute bottom-[22%] left-[18%] w-9 h-9 text-violet-300/40 dark:text-violet-400/35 animate-float" style={{ animationDelay: '1.5s' }} />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_35%,transparent_25%,hsl(var(--background))_78%)] opacity-[0.85] dark:opacity-[0.9]" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/25 via-transparent to-background/75 dark:to-background/90" />
    </>
  );
}

function OceanBreezeLayer() {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-b from-sky-600/10 via-teal-600/5 to-background dark:from-sky-500/10 dark:via-teal-700/10" />
      <div className="absolute top-[15%] -left-[15%] h-[min(380px,42vh)] w-[min(90vw,820px)] rounded-full bg-cyan-500/15 blur-[100px] animate-arcade-aurora-blob-slow pointer-events-none" />
      <div className="absolute top-[45%] -right-[10%] h-[min(360px,40vh)] w-[min(85vw,760px)] rounded-full bg-blue-500/15 blur-[95px] animate-arcade-aurora-blob pointer-events-none" />
      <div className="absolute -bottom-24 left-[5%] h-[min(340px,38vh)] w-[min(95vw,880px)] rounded-full bg-teal-600/10 blur-[105px] animate-arcade-aurora-blob-fast pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.22]">
        <Sparkles className="absolute top-[20%] left-[24%] w-7 h-7 text-cyan-400/55 animate-float" style={{ animationDelay: '0s' }} />
        <Sparkles className="absolute bottom-[30%] right-[20%] w-6 h-6 text-sky-400/50 animate-float" style={{ animationDelay: '1.3s' }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/30 to-background/70 dark:via-background/40 dark:to-background/85" />
    </>
  );
}

function CandyRushLayer() {
  return (
    <>
      <div className="absolute -top-20 right-[6%] h-[min(460px,50vh)] w-[min(460px,50vh)] rounded-full bg-pink-400/20 blur-[100px] animate-arcade-aurora-blob pointer-events-none" />
      <div className="absolute top-[32%] -left-[8%] h-[min(400px,44vh)] w-[min(400px,44vh)] rounded-full bg-rose-400/20 blur-[98px] animate-arcade-aurora-blob-slow pointer-events-none" />
      <div className="absolute bottom-0 left-[18%] h-[min(420px,46vh)] w-[min(680px,92vw)] rounded-full bg-emerald-300/15 blur-[105px] animate-arcade-aurora-blob-fast pointer-events-none dark:bg-emerald-500/10" />
      <div className="absolute top-1/2 right-[15%] h-[min(280px,32vh)] w-[min(280px,32vh)] rounded-full bg-violet-400/10 blur-[85px] animate-arcade-aurora-blob pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.3]">
        <Gift className="absolute top-[16%] left-[14%] w-10 h-10 text-pink-600/60 dark:text-pink-400/50 animate-float" style={{ animationDelay: '0.3s' }} />
        <Sparkles className="absolute top-[40%] right-[12%] w-9 h-9 text-rose-400/65 animate-float" style={{ animationDelay: '1s' }} />
        <Gift className="absolute bottom-[24%] right-[22%] w-9 h-9 text-emerald-500/55 dark:text-emerald-400/45 animate-float" style={{ animationDelay: '1.8s' }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-transparent to-violet-500/10" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background/65 dark:to-background/80" />
    </>
  );
}

const STICKER_DOTS: { top: string; left: string; delay: string; size: number; tone: keyof typeof toneClass }[] = [
  { top: '12%', left: '10%', delay: '0s', size: 14, tone: 'c1' },
  { top: '18%', left: '82%', delay: '0.5s', size: 18, tone: 'c2' },
  { top: '28%', left: '48%', delay: '1s', size: 12, tone: 'c3' },
  { top: '38%', left: '16%', delay: '0.2s', size: 16, tone: 'c4' },
  { top: '44%', left: '72%', delay: '1.4s', size: 11, tone: 'c5' },
  { top: '54%', left: '8%', delay: '0.8s', size: 15, tone: 'c1' },
  { top: '58%', left: '58%', delay: '1.9s', size: 13, tone: 'c2' },
  { top: '70%', left: '32%', delay: '0.4s', size: 17, tone: 'c3' },
  { top: '76%', left: '78%', delay: '1.1s', size: 12, tone: 'c4' },
  { top: '22%', left: '62%', delay: '2.1s', size: 14, tone: 'c5' },
  { top: '86%', left: '42%', delay: '0.6s', size: 16, tone: 'c1' },
];

function RainbowPopLayer() {
  return (
    <>
      <div className="absolute -top-28 left-1/2 h-[min(520px,55vh)] w-[min(95vw,900px)] -translate-x-1/2 rounded-full bg-gradient-to-r from-chart-1/20 via-chart-3/20 to-chart-5/20 blur-[120px] animate-arcade-aurora-blob-slow pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-[min(400px,45vh)] w-[min(80vw,720px)] rounded-full bg-chart-2/15 blur-[105px] animate-arcade-aurora-blob pointer-events-none" />
      <div className="absolute top-[35%] -right-[5%] h-[min(360px,40vh)] w-[min(360px,40vh)] rounded-full bg-chart-4/20 blur-[95px] animate-arcade-aurora-blob-fast pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.5]">
        {STICKER_DOTS.map((p, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{ top: p.top, left: p.left, animationDelay: p.delay }}
          >
            <div
              className={`rounded-full opacity-90 shadow-md ring-2 ring-white/30 dark:ring-white/10 ${toneClass[p.tone]}`}
              style={{ width: p.size, height: p.size }}
            />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 opacity-[0.26]">
        <Sparkles className="absolute top-[14%] left-[20%] w-8 h-8 text-chart-5 animate-float" style={{ animationDelay: '0.1s' }} />
        <Sparkles className="absolute bottom-[18%] right-[16%] w-9 h-9 text-chart-1 animate-float" style={{ animationDelay: '1.2s' }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-chart-5/5 via-transparent to-background/70 dark:to-background/80" />
    </>
  );
}

function PointsBankLayer() {
  return (
    <>
      <div className="absolute -top-20 left-[8%] h-[min(460px,50vh)] w-[min(460px,50vh)] rounded-full bg-amber-400/25 blur-[105px] animate-arcade-aurora-blob pointer-events-none" />
      <div className="absolute top-[30%] -right-[10%] h-[min(420px,46vh)] w-[min(420px,46vh)] rounded-full bg-yellow-500/15 blur-[100px] animate-arcade-aurora-blob-slow pointer-events-none" />
      <div className="absolute -bottom-16 left-[22%] h-[min(400px,44vh)] w-[min(700px,92vw)] rounded-full bg-chart-4/20 blur-[110px] animate-arcade-aurora-blob-fast pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 h-[min(300px,35vh)] w-[min(300px,35vh)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-400/10 blur-[80px] animate-arcade-aurora-blob-slow pointer-events-none" style={{ animationDelay: '-10s' }} />
      <div className="absolute inset-0 opacity-[0.32]">
        <Coins className="absolute top-[14%] left-[16%] w-10 h-10 text-amber-600/70 dark:text-amber-400/60 animate-float" style={{ animationDelay: '0s' }} />
        <Star className="absolute top-[38%] right-[14%] w-9 h-9 text-chart-4/75 fill-chart-4/25 animate-float" style={{ animationDelay: '0.8s' }} />
        <Coins className="absolute bottom-[26%] left-[20%] w-9 h-9 text-yellow-600/60 dark:text-yellow-400/50 animate-float" style={{ animationDelay: '1.6s' }} />
        <Sparkles className="absolute bottom-[16%] right-[24%] w-8 h-8 text-amber-500/65 animate-float" style={{ animationDelay: '0.4s' }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 via-transparent to-background/65 dark:from-amber-400/10 dark:to-background/80" />
    </>
  );
}

function PrizeBoothLayer() {
  return (
    <>
      <div className="absolute -top-24 right-[6%] h-[min(440px,48vh)] w-[min(440px,48vh)] rounded-full bg-rose-500/20 blur-[100px] animate-arcade-aurora-blob pointer-events-none" />
      <div className="absolute top-[25%] -left-[8%] h-[min(400px,44vh)] w-[min(400px,44vh)] rounded-full bg-red-500/15 blur-[95px] animate-arcade-aurora-blob-slow pointer-events-none" />
      <div className="absolute bottom-0 left-[12%] h-[min(420px,46vh)] w-[min(680px,90vw)] rounded-full bg-chart-5/20 blur-[108px] animate-arcade-aurora-blob-fast pointer-events-none" />
      <div className="absolute top-[48%] right-[18%] h-[min(320px,36vh)] w-[min(320px,36vh)] rounded-full bg-amber-500/15 blur-[88px] animate-arcade-aurora-blob pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.3]">
        <Ticket className="absolute top-[18%] left-[12%] w-10 h-10 text-rose-600/65 dark:text-rose-400/55 animate-float" style={{ animationDelay: '0.2s' }} />
        <Gift className="absolute top-[36%] right-[16%] w-9 h-9 text-chart-3/70 animate-float" style={{ animationDelay: '1.1s' }} />
        <Ticket className="absolute bottom-[22%] right-[20%] w-9 h-9 text-red-500/55 dark:text-red-400/45 animate-float" style={{ animationDelay: '1.7s' }} />
        <Sparkles className="absolute bottom-[14%] left-[22%] w-8 h-8 text-amber-500/60 animate-float" style={{ animationDelay: '0.6s' }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-chart-5/10" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background/70 dark:to-background/80" />
    </>
  );
}

function HallOfFameLayer() {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-b from-violet-950/10 via-transparent to-amber-950/10 dark:from-violet-950/20 dark:to-amber-950/10" />
      <div className="absolute -top-28 left-1/2 h-[min(500px,54vh)] w-[min(92vw,880px)] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[115px] animate-arcade-aurora-blob-slow pointer-events-none" />
      <div className="absolute bottom-0 right-0 h-[min(440px,48vh)] w-[min(440px,48vh)] rounded-full bg-amber-500/20 blur-[102px] animate-arcade-aurora-blob pointer-events-none" />
      <div className="absolute top-[40%] -left-[12%] h-[min(380px,42vh)] w-[min(380px,42vh)] rounded-full bg-purple-700/15 blur-[95px] animate-arcade-aurora-blob-fast pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.3]">
        <Crown className="absolute top-[12%] left-[18%] w-11 h-11 text-amber-500/70 dark:text-amber-400/60 animate-float" style={{ animationDelay: '0s' }} />
        <Trophy className="absolute top-[40%] right-[12%] w-10 h-10 text-violet-500/60 dark:text-violet-400/50 animate-float" style={{ animationDelay: '1.2s' }} />
        <Star className="absolute bottom-[24%] left-[20%] w-9 h-9 text-amber-400/65 fill-amber-400/20 animate-float" style={{ animationDelay: '0.5s' }} />
        <Sparkles className="absolute bottom-[18%] right-[22%] w-9 h-9 text-chart-5/65 animate-float" style={{ animationDelay: '1.8s' }} />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_50%_at_50%_28%,rgba(245,158,11,0.08),transparent_55%)] dark:bg-[radial-gradient(ellipse_65%_50%_at_50%_28%,rgba(245,158,11,0.12),transparent_55%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background/70 dark:to-background/85" />
    </>
  );
}

function BadgeWallLayer() {
  return (
    <>
      <div className="absolute -top-20 -left-10 h-[min(400px,46vh)] w-[min(400px,46vh)] rounded-full bg-chart-1/20 blur-[98px] animate-arcade-aurora-blob-fast pointer-events-none" />
      <div className="absolute top-[22%] right-0 h-[min(430px,48vh)] w-[min(430px,48vh)] rounded-full bg-chart-2/15 blur-[100px] animate-arcade-aurora-blob pointer-events-none" />
      <div className="absolute bottom-8 left-[15%] h-[min(380px,42vh)] w-[min(620px,88vw)] rounded-full bg-chart-3/15 blur-[105px] animate-arcade-aurora-blob-slow pointer-events-none" />
      <div className="absolute top-1/2 right-[25%] h-[min(300px,34vh)] w-[min(300px,34vh)] rounded-full bg-chart-5/15 blur-[88px] animate-arcade-aurora-blob-fast pointer-events-none" style={{ animationDelay: '-7s' }} />
      <div className="absolute inset-0 opacity-[0.3]">
        <Award className="absolute top-[16%] left-[14%] w-10 h-10 text-chart-1/75 animate-float" style={{ animationDelay: '0.3s' }} />
        <BadgeCheck className="absolute top-[38%] right-[18%] w-9 h-9 text-chart-2/70 animate-float" style={{ animationDelay: '1s' }} />
        <Award className="absolute bottom-[26%] left-[22%] w-9 h-9 text-chart-3/70 animate-float" style={{ animationDelay: '1.6s' }} />
        <Medal className="absolute bottom-[14%] right-[16%] w-9 h-9 text-chart-5/65 animate-float" style={{ animationDelay: '0.7s' }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-chart-1/5 via-chart-3/5 to-chart-5/5" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background/65 dark:to-background/80" />
    </>
  );
}

function RewardMegaLayer() {
  return (
    <>
      <div className="absolute -top-16 left-[4%] h-[min(360px,40vh)] w-[min(360px,40vh)] rounded-full bg-amber-400/15 blur-[92px] animate-arcade-aurora-blob pointer-events-none" />
      <div className="absolute top-[22%] -right-[6%] h-[min(340px,38vh)] w-[min(340px,38vh)] rounded-full bg-rose-500/10 blur-[88px] animate-arcade-aurora-blob-slow pointer-events-none" />
      <div className="absolute top-[8%] left-[35%] h-[min(300px,34vh)] w-[min(300px,34vh)] rounded-full bg-violet-600/15 blur-[85px] animate-arcade-aurora-blob-fast pointer-events-none" />
      <div className="absolute bottom-[6%] left-[8%] h-[min(380px,42vh)] w-[min(680px,88vw)] rounded-full bg-emerald-500/10 blur-[98px] animate-arcade-aurora-blob pointer-events-none" />
      <div className="absolute top-[48%] left-[12%] h-[min(260px,30vh)] w-[min(260px,30vh)] rounded-full bg-chart-1/10 blur-[78px] animate-arcade-aurora-blob-slow pointer-events-none" style={{ animationDelay: '-9s' }} />
      <div className="absolute bottom-[18%] right-[8%] h-[min(320px,36vh)] w-[min(320px,36vh)] rounded-full bg-chart-3/10 blur-[90px] animate-arcade-aurora-blob-fast pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 h-[min(420px,48vmin)] w-[min(420px,48vmin)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-chart-5/10 blur-[105px] animate-arcade-aurora-blob pointer-events-none" style={{ animationDelay: '-15s' }} />
      <div className="absolute inset-0 opacity-[0.19]">
        <Coins className="absolute top-[7%] left-[10%] w-7 h-7 text-amber-600 dark:text-amber-400 animate-float" style={{ animationDelay: '0s' }} />
        <Star className="absolute top-[12%] right-[18%] w-7 h-7 text-chart-4 fill-chart-4/20 animate-float" style={{ animationDelay: '0.4s' }} />
        <Ticket className="absolute top-[28%] left-[6%] w-7 h-7 text-rose-600 dark:text-rose-400 animate-float" style={{ animationDelay: '0.8s' }} />
        <Gift className="absolute top-[32%] right-[8%] w-7 h-7 text-chart-3 animate-float" style={{ animationDelay: '1.2s' }} />
        <Crown className="absolute top-[18%] left-[44%] w-7 h-7 text-amber-500 animate-float" style={{ animationDelay: '0.2s' }} />
        <Trophy className="absolute top-[46%] right-[22%] w-7 h-7 text-violet-600 dark:text-violet-400 animate-float" style={{ animationDelay: '1.6s' }} />
        <Award className="absolute top-[52%] left-[18%] w-7 h-7 text-chart-1 animate-float" style={{ animationDelay: '0.6s' }} />
        <BadgeCheck className="absolute top-[58%] right-[12%] w-6 h-6 text-chart-2 animate-float" style={{ animationDelay: '2s' }} />
        <Medal className="absolute bottom-[26%] left-[14%] w-7 h-7 text-chart-5 animate-float" style={{ animationDelay: '1s' }} />
        <CalendarCheck className="absolute bottom-[20%] right-[16%] w-7 h-7 text-emerald-600 dark:text-emerald-400 animate-float" style={{ animationDelay: '1.4s' }} />
        <Sparkles className="absolute bottom-[10%] left-[42%] w-6 h-6 text-amber-500 animate-float" style={{ animationDelay: '0.3s' }} />
        <Sparkles className="absolute top-[62%] left-[48%] w-6 h-6 text-chart-5 animate-float" style={{ animationDelay: '2.2s' }} />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_60%_at_50%_45%,transparent_30%,hsl(var(--background))_85%)] opacity-[0.88] dark:opacity-[0.92]" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/15 via-transparent to-background/70 dark:to-background/80" />
    </>
  );
}

function SunriseRaysLayer() {
  return (
    <>
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[min(165vh,1400px)] w-[min(165vh,1400px)] -translate-x-1/2 animate-[spin_280s_linear_infinite] opacity-[0.42] dark:opacity-[0.5] [mask-image:radial-gradient(ellipse_58%_72%_at_50%_100%,black_18%,transparent_70%)]">
        <div
          className="h-full w-full blur-2xl"
          style={{
            background:
              'conic-gradient(from 0deg at 50% 100%, rgba(253, 224, 71, 0.55) 0deg, rgba(251, 113, 133, 0.4) 40deg, rgba(192, 132, 252, 0.45) 80deg, rgba(125, 211, 252, 0.5) 120deg, rgba(110, 231, 183, 0.42) 160deg, rgba(253, 186, 116, 0.48) 200deg, rgba(244, 114, 182, 0.4) 240deg, rgba(147, 197, 253, 0.45) 280deg, rgba(253, 224, 71, 0.5) 320deg, rgba(253, 224, 71, 0.55) 360deg)',
          }}
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-background/55 via-background/25 to-transparent dark:from-background/65" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/75 via-background/15 to-background/40 dark:from-background/90 dark:to-background/50" />
    </>
  );
}

function HalftoneDotsLayer() {
  return (
    <>
      <div
        className="absolute inset-0 opacity-[0.14] dark:opacity-[0.2]"
        style={{
          backgroundImage: 'radial-gradient(circle, hsl(var(--foreground) / 0.11) 1.2px, transparent 1.2px)',
          backgroundSize: '13px 13px',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.08] dark:opacity-[0.12]"
        style={{
          backgroundImage: 'radial-gradient(circle, hsl(var(--primary) / 0.14) 1px, transparent 1px)',
          backgroundSize: '19px 19px',
          backgroundPosition: '6px 4px',
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_50%_40%,transparent_20%,hsl(var(--background))_88%)] opacity-95" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/70 dark:to-background/85" />
    </>
  );
}

function DiagonalStripesLayer() {
  return (
    <>
      <div
        className="absolute inset-0 opacity-[0.55] dark:opacity-[0.65]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -32deg,
            hsl(var(--chart-1) / 0.07) 0px,
            hsl(var(--chart-1) / 0.07) 16px,
            hsl(var(--chart-3) / 0.06) 16px,
            hsl(var(--chart-3) / 0.06) 32px,
            hsl(var(--chart-5) / 0.06) 32px,
            hsl(var(--chart-5) / 0.06) 48px
          )`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-background/50 via-transparent to-background/55 dark:from-background/60 dark:to-background/70" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,hsl(var(--background))_0%,transparent_55%)] opacity-80 dark:opacity-75" />
    </>
  );
}

const BOKEH: { top: string; left: string; size: number; cls: string; delay: string; blur: string }[] = [
  { top: '6%', left: '8%', size: 48, cls: 'bg-sky-400/40', delay: '0s', blur: 'blur-2xl' },
  { top: '12%', left: '72%', size: 36, cls: 'bg-rose-300/35', delay: '0.7s', blur: 'blur-xl' },
  { top: '22%', left: '38%', size: 56, cls: 'bg-amber-300/40', delay: '1.1s', blur: 'blur-2xl' },
  { top: '18%', left: '88%', size: 28, cls: 'bg-violet-400/35', delay: '0.3s', blur: 'blur-lg' },
  { top: '38%', left: '4%', size: 40, cls: 'bg-emerald-400/30', delay: '1.8s', blur: 'blur-xl' },
  { top: '42%', left: '58%', size: 52, cls: 'bg-chart-2/40', delay: '0.5s', blur: 'blur-2xl' },
  { top: '48%', left: '28%', size: 32, cls: 'bg-chart-5/40', delay: '2.1s', blur: 'blur-lg' },
  { top: '52%', left: '82%', size: 44, cls: 'bg-cyan-300/35', delay: '0.9s', blur: 'blur-xl' },
  { top: '62%', left: '14%', size: 38, cls: 'bg-chart-1/35', delay: '1.4s', blur: 'blur-xl' },
  { top: '68%', left: '46%', size: 60, cls: 'bg-fuchsia-300/30', delay: '0.2s', blur: 'blur-2xl' },
  { top: '72%', left: '76%', size: 34, cls: 'bg-yellow-300/35', delay: '1.6s', blur: 'blur-lg' },
  { top: '8%', left: '52%', size: 30, cls: 'bg-blue-400/30', delay: '2.3s', blur: 'blur-lg' },
  { top: '28%', left: '92%', size: 42, cls: 'bg-chart-3/40', delay: '0.6s', blur: 'blur-xl' },
  { top: '58%', left: '92%', size: 36, cls: 'bg-orange-300/35', delay: '1.9s', blur: 'blur-xl' },
  { top: '78%', left: '32%', size: 50, cls: 'bg-teal-400/30', delay: '0.4s', blur: 'blur-2xl' },
  { top: '84%', left: '8%', size: 34, cls: 'bg-pink-300/35', delay: '2s', blur: 'blur-lg' },
  { top: '86%', left: '58%', size: 46, cls: 'bg-indigo-400/30', delay: '1.2s', blur: 'blur-xl' },
  { top: '32%', left: '18%', size: 26, cls: 'bg-lime-300/35', delay: '2.4s', blur: 'blur-md' },
  { top: '14%', left: '28%', size: 22, cls: 'bg-white/40', delay: '1s', blur: 'blur-md' },
  { top: '64%', left: '68%', size: 28, cls: 'bg-chart-4/35', delay: '0.8s', blur: 'blur-lg' },
];

function BokehFieldLayer() {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-b from-slate-500/5 via-transparent to-violet-500/10 dark:from-slate-400/10 dark:to-violet-950/15" />
      <div className="absolute inset-0 opacity-[0.85]">
        {BOKEH.map((b, i) => (
          <div
            key={i}
            className="absolute animate-float rounded-full"
            style={{ top: b.top, left: b.left, width: b.size, height: b.size, animationDelay: b.delay }}
          >
            <div className={`h-full w-full rounded-full ${b.cls} ${b.blur}`} />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_65%_at_50%_48%,transparent_25%,hsl(var(--background))_82%)] opacity-90 dark:opacity-92" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/25 via-transparent to-background/70 dark:to-background/85" />
    </>
  );
}

function ContourLinesLayer() {
  return (
    <>
      <div
        className="absolute inset-0 opacity-[0.22] dark:opacity-[0.28]"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 24px, hsl(var(--chart-2) / 0.09) 24px, hsl(var(--chart-2) / 0.09) 25px),
            repeating-linear-gradient(0deg, transparent, transparent 37px, hsl(var(--chart-1) / 0.06) 37px, hsl(var(--chart-1) / 0.06) 38px),
            repeating-linear-gradient(0deg, transparent, transparent 51px, hsl(var(--primary) / 0.07) 51px, hsl(var(--primary) / 0.07) 52px)`,
          backgroundPosition: '0 0, 12px 8px, 5px 19px',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-chart-3/10 via-transparent to-chart-5/10 opacity-60 dark:opacity-70" />
      <div className="absolute inset-0 bg-gradient-to-br from-background/40 via-transparent to-background/50 dark:from-background/55 dark:to-background/65" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_75%_at_50%_35%,hsl(var(--background))_0%,transparent_65%)] opacity-85" />
    </>
  );
}

/** Saturated “arcade neon” — stronger than default arcade / aurora. */
function NeonArcadeLayer() {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/30 via-fuchsia-600/20 to-violet-600/25 dark:from-cyan-400/30 dark:via-fuchsia-500/30 dark:to-violet-500/30" />
      <div className="absolute -top-32 -left-20 h-[min(560px,60vh)] w-[min(560px,60vh)] rounded-full bg-cyan-400/50 blur-[100px] animate-arcade-bold-blob-fast pointer-events-none" />
      <div className="absolute top-[18%] -right-[12%] h-[min(520px,56vh)] w-[min(520px,56vh)] rounded-full bg-fuchsia-500/45 blur-[115px] animate-arcade-bold-blob pointer-events-none" />
      <div className="absolute bottom-[-8%] left-[15%] h-[min(480px,52vh)] w-[min(780px,96vw)] rounded-full bg-violet-500/40 blur-[120px] animate-arcade-bold-blob-slow pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 h-[min(440px,50vmin)] w-[min(440px,50vmin)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-chart-3/40 blur-[110px] animate-arcade-bold-blob-fast pointer-events-none" style={{ animationDelay: '-4s' }} />
      <div className="absolute inset-0 opacity-[0.72]">
        <Zap className="absolute top-[10%] left-[12%] w-12 h-12 text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.85)] animate-float" style={{ animationDelay: '0s' }} />
        <Gamepad2 className="absolute top-[28%] right-[10%] w-14 h-14 text-fuchsia-400 drop-shadow-[0_0_14px_rgba(232,121,249,0.8)] -rotate-12 animate-float" style={{ animationDelay: '0.6s' }} />
        <Sparkles className="absolute bottom-[20%] left-[18%] w-11 h-11 text-violet-400 drop-shadow-[0_0_12px_rgba(167,139,250,0.85)] animate-float" style={{ animationDelay: '1.2s' }} />
        <Sparkles className="absolute top-[48%] left-[8%] w-9 h-9 text-cyan-300 animate-float" style={{ animationDelay: '2s' }} />
        <Zap className="absolute bottom-[14%] right-[16%] w-10 h-10 text-chart-5 animate-float" style={{ animationDelay: '0.3s' }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background/50 dark:from-background/20 dark:to-background/60" />
    </>
  );
}

/** Bold diagonal bands + large drifting color masses. */
function HyperwaveLayer() {
  return (
    <>
      <div
        className="absolute inset-0 opacity-[0.72] dark:opacity-[0.78]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -28deg,
            hsl(var(--chart-1) / 0.16) 0px,
            hsl(var(--chart-1) / 0.16) 14px,
            hsl(var(--chart-2) / 0.14) 14px,
            hsl(var(--chart-2) / 0.14) 28px,
            hsl(var(--chart-3) / 0.15) 28px,
            hsl(var(--chart-3) / 0.15) 42px,
            hsl(var(--chart-5) / 0.14) 42px,
            hsl(var(--chart-5) / 0.14) 56px
          )`,
        }}
      />
      <div className="absolute -top-28 left-[4%] h-[min(540px,58vh)] w-[min(540px,58vh)] rounded-full bg-chart-1/45 blur-[118px] animate-arcade-bold-blob pointer-events-none" />
      <div className="absolute top-[22%] -right-[14%] h-[min(500px,54vh)] w-[min(500px,54vh)] rounded-full bg-chart-5/40 blur-[112px] animate-arcade-bold-blob-slow pointer-events-none" />
      <div className="absolute -bottom-20 left-[20%] h-[min(460px,50vh)] w-[min(820px,98vw)] rounded-full bg-chart-2/40 blur-[125px] animate-arcade-bold-blob-fast pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.5]">
        <Star className="absolute top-[16%] right-[18%] w-11 h-11 text-chart-4 fill-chart-4/50 animate-float" style={{ animationDelay: '0.4s' }} />
        <Sparkles className="absolute bottom-[22%] left-[14%] w-10 h-10 text-chart-1 animate-float" style={{ animationDelay: '1.1s' }} />
        <Trophy className="absolute top-[44%] left-[10%] w-10 h-10 text-chart-3/90 animate-float" style={{ animationDelay: '1.8s' }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-background/35 via-background/15 to-background/45 dark:from-background/45 dark:via-background/20 dark:to-background/55" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_40%,transparent_18%,hsl(var(--background))_72%)] opacity-75 dark:opacity-78" />
    </>
  );
}

/** Hot sun / flare energy — very warm and bright. */
function SolarFlareLayer() {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-b from-amber-400/20 via-orange-500/20 to-red-600/20 dark:from-amber-500/25 dark:via-orange-600/20 dark:to-red-700/25" />
      <div className="pointer-events-none absolute left-1/2 top-[18%] h-[min(90vmin,720px)] w-[min(90vmin,720px)] -translate-x-1/2 rounded-full bg-yellow-300/55 blur-[80px] animate-pulse-glow dark:bg-amber-200/35" />
      <div className="absolute -top-24 left-[8%] h-[min(520px,56vh)] w-[min(520px,56vh)] rounded-full bg-orange-400/50 blur-[110px] animate-arcade-bold-blob-fast pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[4%] h-[min(480px,52vh)] w-[min(480px,52vh)] rounded-full bg-red-500/40 blur-[105px] animate-arcade-bold-blob pointer-events-none" />
      <div className="absolute top-[40%] -left-[10%] h-[min(420px,46vh)] w-[min(420px,46vh)] rounded-full bg-amber-500/45 blur-[100px] animate-arcade-bold-blob-slow pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.65]">
        <Sun className="absolute top-[12%] left-1/2 w-16 h-16 -translate-x-1/2 text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.9)] animate-float" style={{ animationDelay: '0s' }} />
        <Flame className="absolute top-[32%] right-[14%] w-12 h-12 text-orange-500 drop-shadow-[0_0_14px_rgba(249,115,22,0.85)] animate-float" style={{ animationDelay: '0.5s' }} />
        <Sparkles className="absolute bottom-[24%] left-[16%] w-10 h-10 text-yellow-400 animate-float" style={{ animationDelay: '1.2s' }} />
        <Flame className="absolute bottom-[18%] right-[22%] w-11 h-11 text-red-500/90 animate-float" style={{ animationDelay: '0.8s' }} />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_50%_at_50%_22%,transparent_0%,hsl(var(--background))_68%)] opacity-55 dark:opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/25 via-transparent to-background/50 dark:to-background/60" />
    </>
  );
}

/** Faster, more opaque rotating rainbow + saturated blobs. */
function ChromaSpinLayer() {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-chart-1/20 via-chart-3/20 to-chart-5/20" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[min(175vh,1500px)] w-[min(175vh,1500px)] -translate-x-1/2 animate-[spin_48s_linear_infinite] opacity-[0.72] dark:opacity-[0.78] [mask-image:radial-gradient(ellipse_62%_75%_at_50%_100%,black_15%,transparent_72%)]">
        <div
          className="h-full w-full blur-xl"
          style={{
            background:
              'conic-gradient(from 0deg at 50% 100%, rgba(239, 68, 68, 0.75) 0deg, rgba(234, 179, 8, 0.7) 45deg, rgba(34, 197, 94, 0.72) 90deg, rgba(59, 130, 246, 0.75) 135deg, rgba(168, 85, 247, 0.72) 180deg, rgba(236, 72, 153, 0.7) 225deg, rgba(20, 184, 166, 0.72) 270deg, rgba(249, 115, 22, 0.75) 315deg, rgba(239, 68, 68, 0.75) 360deg)',
          }}
        />
      </div>
      <div className="absolute -top-20 right-[6%] h-[min(500px,54vh)] w-[min(500px,54vh)] rounded-full bg-chart-2/45 blur-[115px] animate-arcade-bold-blob pointer-events-none" />
      <div className="absolute bottom-[5%] left-[6%] h-[min(460px,50vh)] w-[min(460px,50vh)] rounded-full bg-chart-4/40 blur-[108px] animate-arcade-bold-blob-slow pointer-events-none" />
      <div className="absolute top-[36%] -left-[8%] h-[min(400px,44vh)] w-[min(400px,44vh)] rounded-full bg-chart-1/45 blur-[102px] animate-arcade-bold-blob-fast pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.55]">
        <Sparkles className="absolute top-[14%] left-[20%] w-10 h-10 text-chart-5 animate-float" style={{ animationDelay: '0.2s' }} />
        <Sparkles className="absolute top-[22%] right-[24%] w-9 h-9 text-chart-2 animate-float" style={{ animationDelay: '1s' }} />
        <Palette className="absolute bottom-[20%] right-[12%] w-11 h-11 text-chart-3 animate-float" style={{ animationDelay: '0.6s' }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/10 to-background/55 dark:from-background/50 dark:via-background/15 dark:to-background/65" />
    </>
  );
}

/** Neon streamer tape + party pops — loud on purpose. */
function SillyStringLayer() {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/15 via-yellow-400/10 to-cyan-500/15 dark:from-fuchsia-400/20 dark:via-amber-300/10 dark:to-sky-400/15" />
      <div
        className="pointer-events-none absolute inset-[-40%] opacity-[0.4] animate-[spin_120s_linear_infinite] dark:opacity-[0.32]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            118deg,
            transparent 0px,
            transparent 28px,
            rgba(236, 72, 153, 0.14) 28px,
            rgba(236, 72, 153, 0.14) 34px,
            transparent 34px,
            transparent 52px,
            rgba(34, 211, 238, 0.12) 52px,
            rgba(34, 211, 238, 0.12) 58px,
            transparent 58px,
            transparent 80px,
            rgba(250, 204, 21, 0.11) 80px,
            rgba(250, 204, 21, 0.11) 86px
          )`,
        }}
      />
      <div className="absolute -top-16 right-[10%] h-[min(480px,50vh)] w-[min(480px,50vh)] rounded-full bg-fuchsia-400/30 blur-[108px] animate-arcade-bold-blob-fast pointer-events-none" />
      <div className="absolute bottom-[6%] left-[8%] h-[min(420px,46vh)] w-[min(420px,46vh)] rounded-full bg-cyan-400/20 blur-[102px] animate-arcade-bold-blob-slow pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.55]">
        <PartyPopper className="absolute top-[14%] left-[16%] w-11 h-11 text-fuchsia-600/80 dark:text-fuchsia-400/75 animate-float" style={{ animationDelay: '0s' }} />
        <Smile className="absolute top-[22%] right-[20%] w-10 h-10 text-amber-500/85 dark:text-amber-300/75 animate-float" style={{ animationDelay: '0.6s' }} />
        <PartyPopper className="absolute bottom-[24%] right-[14%] w-12 h-12 text-cyan-600/75 dark:text-cyan-400/70 animate-float" style={{ animationDelay: '1.1s' }} />
        <Sparkles className="absolute bottom-[16%] left-[22%] w-9 h-9 text-yellow-500/80 animate-float" style={{ animationDelay: '0.3s' }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/10 to-background/60 dark:from-background/45 dark:via-background/10 dark:to-background/70" />
    </>
  );
}

/** Mischievous purple + slime green — “cute chaos.” */
function GlitterGoblinLayer() {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-violet-950/20 via-emerald-950/10 to-fuchsia-950/15 dark:from-violet-900/25 dark:via-emerald-950/20 dark:to-fuchsia-950/20" />
      <div className="absolute -top-20 left-[6%] h-[min(500px,54vh)] w-[min(500px,54vh)] rounded-full bg-violet-500/25 blur-[112px] animate-arcade-bold-blob pointer-events-none" />
      <div className="absolute top-[32%] -right-[8%] h-[min(440px,48vh)] w-[min(440px,48vh)] rounded-full bg-emerald-400/20 blur-[105px] animate-arcade-bold-blob-fast pointer-events-none" />
      <div className="absolute bottom-[-5%] left-[28%] h-[min(400px,44vh)] w-[min(640px,90vw)] rounded-full bg-fuchsia-500/20 blur-[98px] animate-arcade-bold-blob-slow pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.5]">
        <Ghost className="absolute top-[18%] left-[20%] w-11 h-11 text-violet-500/75 dark:text-violet-300/70 animate-float" style={{ animationDelay: '0.2s' }} />
        <Sparkles className="absolute top-[12%] right-[24%] w-10 h-10 text-emerald-400/80 animate-float" style={{ animationDelay: '0.9s' }} />
        <Ghost className="absolute bottom-[20%] right-[18%] w-10 h-10 text-fuchsia-500/70 dark:text-fuchsia-300/65 animate-float" style={{ animationDelay: '0.5s' }} />
        <Sparkles className="absolute bottom-[14%] left-[16%] w-9 h-9 text-chart-5/90 animate-float" style={{ animationDelay: '1.4s' }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/10 to-background/60 dark:from-background/50 dark:via-background/10 dark:to-background/70" />
    </>
  );
}

/** Saturday-night lights in a Monday-morning body. */
function DiscoDetentionLayer() {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 via-fuchsia-950/15 to-orange-950/15 dark:from-indigo-950/20 dark:via-purple-950/20 dark:to-orange-950/20" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[min(140vmin,1200px)] w-[min(140vmin,1200px)] -translate-x-1/2 -translate-y-1/2 animate-[spin_90s_linear_infinite] opacity-[0.35] dark:opacity-[0.42] [mask-image:radial-gradient(ellipse_55%_55%_at_50%_50%,black_8%,transparent_70%)]">
        <div
          className="h-full w-full blur-2xl"
          style={{
            background:
              'conic-gradient(from 0deg at 50% 50%, rgba(99, 102, 241, 0.5) 0deg, rgba(236, 72, 153, 0.45) 72deg, rgba(251, 146, 60, 0.48) 144deg, rgba(52, 211, 153, 0.42) 216deg, rgba(129, 140, 248, 0.5) 288deg, rgba(99, 102, 241, 0.5) 360deg)',
          }}
        />
      </div>
      <div className="absolute top-[8%] left-[12%] h-[min(380px,40vh)] w-[min(380px,40vh)] rounded-full bg-pink-500/20 blur-[95px] animate-arcade-aurora-blob pointer-events-none" />
      <div className="absolute bottom-[12%] right-[10%] h-[min(360px,38vh)] w-[min(360px,38vh)] rounded-full bg-orange-400/20 blur-[92px] animate-arcade-aurora-blob-slow pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.48]">
        <Music2 className="absolute top-[20%] left-[22%] w-11 h-11 text-indigo-500/80 dark:text-indigo-300/75 animate-float" style={{ animationDelay: '0s' }} />
        <Sparkles className="absolute top-[28%] right-[18%] w-10 h-10 text-fuchsia-500/85 animate-float" style={{ animationDelay: '0.7s' }} />
        <Music2 className="absolute bottom-[22%] right-[26%] w-10 h-10 text-orange-500/80 dark:text-orange-300/70 animate-float" style={{ animationDelay: '1.1s' }} />
        <Star className="absolute bottom-[16%] left-[20%] w-9 h-9 text-amber-400/80 fill-amber-400/35 animate-float" style={{ animationDelay: '0.4s' }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-background/45 via-background/10 to-background/60 dark:from-background/50 dark:via-background/15 dark:to-background/70" />
    </>
  );
}

/** Hungry-hour gradients + snack icons. */
function SnackEmergencyLayer() {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-amber-100/25 via-orange-200/15 to-rose-200/20 dark:from-amber-950/20 dark:via-orange-950/15 dark:to-rose-950/20" />
      <div className="absolute -top-24 right-[8%] h-[min(460px,48vh)] w-[min(460px,48vh)] rounded-full bg-orange-300/30 blur-[104px] animate-arcade-bold-blob pointer-events-none dark:bg-orange-500/20" />
      <div className="absolute bottom-0 left-[4%] h-[min(420px,45vh)] w-[min(520px,85vw)] rounded-full bg-amber-200/30 blur-[100px] animate-arcade-bold-blob-slow pointer-events-none dark:bg-amber-600/20" />
      <div className="absolute top-[40%] -left-[6%] h-[min(340px,36vh)] w-[min(340px,36vh)] rounded-full bg-rose-300/20 blur-[88px] animate-arcade-bold-blob-fast pointer-events-none dark:bg-rose-500/15" />
      <div className="absolute inset-0 opacity-[0.52]">
        <Cookie className="absolute top-[16%] left-[18%] w-11 h-11 text-amber-700/70 dark:text-amber-400/65 animate-float" style={{ animationDelay: '0.1s' }} />
        <Candy className="absolute top-[24%] right-[22%] w-10 h-10 text-rose-500/75 dark:text-rose-400/70 animate-float" style={{ animationDelay: '0.8s' }} />
        <Cookie className="absolute bottom-[26%] right-[14%] w-10 h-10 text-orange-600/70 dark:text-orange-400/60 animate-float" style={{ animationDelay: '0.4s' }} />
        <Candy className="absolute bottom-[14%] left-[24%] w-9 h-9 text-pink-500/70 dark:text-pink-400/65 animate-float" style={{ animationDelay: '1.2s' }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-background/35 via-background/5 to-background/55 dark:from-background/45 dark:via-background/10 dark:to-background/65" />
    </>
  );
}

function AttendanceStreakLayer() {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/10 via-background to-green-950/10 dark:from-emerald-950/20 dark:to-green-950/15" />
      <div className="absolute -top-24 left-[10%] h-[min(440px,48vh)] w-[min(440px,48vh)] rounded-full bg-emerald-500/20 blur-[102px] animate-arcade-aurora-blob pointer-events-none" />
      <div className="absolute top-[35%] -right-[10%] h-[min(400px,44vh)] w-[min(400px,44vh)] rounded-full bg-green-400/15 blur-[96px] animate-arcade-aurora-blob-slow pointer-events-none" />
      <div className="absolute -bottom-12 left-[24%] h-[min(360px,40vh)] w-[min(680px,92vw)] rounded-full bg-teal-500/10 blur-[100px] animate-arcade-aurora-blob-fast pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.28]">
        <CalendarCheck className="absolute top-[14%] right-[16%] w-10 h-10 text-emerald-600/65 dark:text-emerald-400/55 animate-float" style={{ animationDelay: '0s' }} />
        <BadgeCheck className="absolute top-[42%] left-[12%] w-9 h-9 text-green-600/60 dark:text-green-400/50 animate-float" style={{ animationDelay: '1.1s' }} />
        <CalendarCheck className="absolute bottom-[22%] right-[20%] w-9 h-9 text-teal-600/55 dark:text-teal-400/45 animate-float" style={{ animationDelay: '0.6s' }} />
        <Sparkles className="absolute bottom-[12%] left-[24%] w-8 h-8 text-emerald-500/55 animate-float" style={{ animationDelay: '1.7s' }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-background/65 dark:to-background/80" />
    </>
  );
}

function PrizeBurstLayer() {
  return (
    <>
      <div className="absolute -top-36 -left-24 h-[min(520px,58vh)] w-[min(520px,58vh)] rounded-full bg-chart-1/30 blur-[115px] animate-arcade-aurora-blob-fast pointer-events-none" />
      <div className="absolute top-[15%] -right-20 h-[min(500px,52vh)] w-[min(500px,52vh)] rounded-full bg-chart-5/30 blur-[110px] animate-arcade-aurora-blob pointer-events-none" />
      <div className="absolute bottom-0 left-[15%] h-[min(440px,48vh)] w-[min(720px,92vw)] rounded-full bg-chart-3/25 blur-[120px] animate-arcade-aurora-blob-slow pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 h-[min(600px,65vmin)] w-[min(600px,65vmin)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[125px] animate-arcade-aurora-blob-fast pointer-events-none" style={{ animationDelay: '-6s' }} />
      <div className="absolute inset-0 opacity-[0.35]">
        <Sparkles className="absolute top-[20%] left-[20%] w-9 h-9 text-chart-1 animate-float" style={{ animationDelay: '0.2s' }} />
        <Sparkles className="absolute top-[30%] right-[12%] w-8 h-8 text-chart-5 animate-float" style={{ animationDelay: '1s' }} />
        <Gamepad2 className="absolute bottom-[22%] left-[18%] w-10 h-10 text-chart-3/70 rotate-6 animate-float" style={{ animationDelay: '1.4s' }} />
        <Sparkles className="absolute bottom-[14%] right-[28%] w-10 h-10 text-chart-2 animate-float" style={{ animationDelay: '0.5s' }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background/70 dark:via-background/30 dark:to-background/90" />
    </>
  );
}

function StyleBody({ style }: { style: AnimatedBackgroundStyle }) {
  switch (style) {
    case 'classroom':
      return <ClassroomLayer />;
    case 'campus':
      return <CampusLayer />;
    case 'study_hall':
      return <StudyHallLayer />;
    case 'science_lab':
      return <ScienceLabLayer />;
    case 'art_studio':
      return <ArtStudioLayer />;
    case 'field_day':
      return <FieldDayLayer />;
    case 'midnight_study':
      return <MidnightStudyLayer />;
    case 'ocean_breeze':
      return <OceanBreezeLayer />;
    case 'celebration':
      return <CelebrationLayer />;
    case 'trophy_glow':
      return <TrophyGlowLayer />;
    case 'prize_burst':
      return <PrizeBurstLayer />;
    case 'candy_rush':
      return <CandyRushLayer />;
    case 'rainbow_pop':
      return <RainbowPopLayer />;
    case 'points_bank':
      return <PointsBankLayer />;
    case 'prize_booth':
      return <PrizeBoothLayer />;
    case 'hall_of_fame':
      return <HallOfFameLayer />;
    case 'badge_wall':
      return <BadgeWallLayer />;
    case 'attendance_streak':
      return <AttendanceStreakLayer />;
    case 'reward_mega':
      return <RewardMegaLayer />;
    case 'sunrise_rays':
      return <SunriseRaysLayer />;
    case 'halftone_dots':
      return <HalftoneDotsLayer />;
    case 'diagonal_stripes':
      return <DiagonalStripesLayer />;
    case 'bokeh_field':
      return <BokehFieldLayer />;
    case 'contour_lines':
      return <ContourLinesLayer />;
    case 'neon_arcade':
      return <NeonArcadeLayer />;
    case 'hyperwave':
      return <HyperwaveLayer />;
    case 'solar_flare':
      return <SolarFlareLayer />;
    case 'chroma_spin':
      return <ChromaSpinLayer />;
    case 'silly_string':
      return <SillyStringLayer />;
    case 'glitter_goblin':
      return <GlitterGoblinLayer />;
    case 'disco_detention':
      return <DiscoDetentionLayer />;
    case 'snack_emergency':
      return <SnackEmergencyLayer />;
    case 'aurora':
      return <AuroraLayer />;
    case 'arcade':
    default:
      return <ArcadeLayer />;
  }
}

/** Full-viewport decorative layer; respects Features → animated background and Legacy mode. */
export function AnimatedSiteBackground() {
  const { settings, isLoaded } = useSettings();
  // Avoid a brief animated flash while settings hydrate (defaults are "on").
  // Keep hook order stable by gating via `active` rather than early-returning.
  const active = isLoaded && globalAnimatedBackdropActive(settings);
  const style = resolveAnimatedBackgroundStyle(
    normalizeAnimatedBackgroundStyle(settings.animatedBackgroundStyle),
    sanitizeHiddenAnimatedBackgroundIds(settings.hiddenAnimatedBackgroundIds),
  );
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const shouldRender = active && !prefersReducedMotion;

  const shouldPauseAnimations = useMemo(() => {
    // Pause when:
    // - tab hidden (handled by visibility effect below)
    // - reduced motion requested
    // - backdrop is toggled off (belt-and-suspenders, still pauses any lingering CSS)
    return prefersReducedMotion || !active;
  }, [prefersReducedMotion, active]);

  useLayoutEffect(() => {
    setHost(document.getElementById('arcade-backdrop-host'));
  }, []);

  // Respect OS-level reduced-motion preference.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setPrefersReducedMotion(!!mq.matches);
    onChange();
    if (mq.addEventListener) {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
    // Safari < 14
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);

  // Pause the heavy decorative animations while the tab is hidden. CSS
  // animations otherwise keep ticking in background tabs and consume battery
  // for nothing visible. We toggle a class on the portal host and style
  // `animation-play-state: paused` on all descendants via globals.css.
  useEffect(() => {
    if (!host) return;
    const update = () => {
      if (document.hidden) {
        host.classList.add('arcade-backdrop-paused');
      } else {
        host.classList.remove('arcade-backdrop-paused');
      }
    };
    update();
    document.addEventListener('visibilitychange', update);
    return () => {
      document.removeEventListener('visibilitychange', update);
      host.classList.remove('arcade-backdrop-paused');
    };
  }, [host]);

  // Hard-stop animation ticking when backdrop is off / reduced-motion.
  useEffect(() => {
    if (!host) return;
    host.classList.toggle('arcade-backdrop-off', !active || prefersReducedMotion);
    host.classList.toggle('arcade-backdrop-paused', shouldPauseAnimations);
    return () => {
      host.classList.remove('arcade-backdrop-off');
      if (!document.hidden) host.classList.remove('arcade-backdrop-paused');
    };
  }, [host, active, prefersReducedMotion, shouldPauseAnimations]);

  if (!shouldRender || !host) return null;

  return createPortal(
    <div
      className="absolute inset-0 h-full w-full min-h-0 overflow-visible"
      data-arcade-backdrop-root
    >
      <StyleBody style={style} />
    </div>,
    host,
  );
}
