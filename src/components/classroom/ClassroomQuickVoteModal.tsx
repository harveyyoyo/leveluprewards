'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart2,
  CheckCircle,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Vote,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { playClassroomSound } from '@/lib/classroom/classroomSoundSynth';
import { pickReadableOn } from '@/lib/themeContrast';

export interface ClassroomQuickVoteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classNameLabel?: string;
}

type PollType = 'abcd' | 'truefalse' | 'confidence' | 'traffic';

interface PollOption {
  key: string;
  label: string;
  icon?: string;
  color: string;
}

const POLL_MODES: {
  id: PollType;
  name: string;
  icon: string;
  options: PollOption[];
}[] = [
  {
    id: 'abcd',
    name: 'A / B / C / D',
    icon: '🔠',
    options: [
      { key: 'A', label: 'Option A', color: '#06b6d4' },
      { key: 'B', label: 'Option B', color: '#3b82f6' },
      { key: 'C', label: 'Option C', color: '#8b5cf6' },
      { key: 'D', label: 'Option D', color: '#ec4899' },
    ],
  },
  {
    id: 'truefalse',
    name: 'True / False',
    icon: '⚖️',
    options: [
      { key: 'True', label: 'True', icon: '✅', color: '#10b981' },
      { key: 'False', label: 'False', icon: '❌', color: '#ef4444' },
    ],
  },
  {
    id: 'confidence',
    name: 'Confidence Check',
    icon: '👍',
    options: [
      { key: 'high', label: 'Got It!', icon: '👍', color: '#10b981' },
      { key: 'mid', label: 'Getting There', icon: '🤏', color: '#f59e0b' },
      { key: 'low', label: 'Need Help', icon: '🙋', color: '#ec4899' },
    ],
  },
  {
    id: 'traffic',
    name: 'Traffic Light',
    icon: '🚦',
    options: [
      { key: 'green', label: 'Ready to Move On', icon: '🟢', color: '#22c55e' },
      { key: 'yellow', label: 'A Few Questions', icon: '🟡', color: '#eab308' },
      { key: 'red', label: 'Pause & Review', icon: '🔴', color: '#ef4444' },
    ],
  },
];

export function ClassroomQuickVoteModal({
  open,
  onOpenChange,
  classNameLabel = 'Classroom',
}: ClassroomQuickVoteProps) {
  const [activePollType, setActivePollType] = useState<PollType>('abcd');
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [revealed, setRevealed] = useState(false);

  const activeMode = POLL_MODES.find((m) => m.id === activePollType) || POLL_MODES[0];

  const totalVotes = Object.values(votes).reduce((sum, count) => sum + count, 0);

  const handleVote = (key: string, delta: number) => {
    setVotes((prev) => {
      const current = prev[key] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [key]: next };
    });
    playClassroomSound('timer_tick', 0.6);
  };

  const handleReset = () => {
    setVotes({});
    setRevealed(false);
  };

  const handleSelectMode = (type: PollType) => {
    setActivePollType(type);
    setVotes({});
    setRevealed(false);
  };

  const handleCelebrateResults = () => {
    setRevealed(true);
    playClassroomSound('victory_fanfare', 1.0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg border-2 border-violet-500/30 bg-slate-950/95 text-white shadow-2xl backdrop-blur-2xl rounded-3xl p-6 overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-400">
              <Vote className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight text-white">
                Live Quick Check &amp; Poll
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Instant understanding pulse for {classNameLabel}
              </DialogDescription>
            </div>
          </div>
          <Badge className="bg-violet-500/20 text-violet-300 font-mono text-xs border border-violet-500/30">
            {totalVotes} {totalVotes === 1 ? 'Vote' : 'Votes'}
          </Badge>
        </DialogHeader>

        {/* Mode Selector Chips */}
        <div className="flex gap-2 my-2 overflow-x-auto pb-1">
          {POLL_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => handleSelectMode(mode.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold shrink-0 transition-all',
                activePollType === mode.id
                  ? 'border-violet-400 bg-violet-500/25 text-white'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white',
              )}
            >
              <span>{mode.icon}</span>
              <span>{mode.name}</span>
            </button>
          ))}
        </div>

        {/* Live Voting Cards */}
        <div className="space-y-3 my-2">
          {activeMode.options.map((opt) => {
            const count = votes[opt.key] || 0;
            const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

            return (
              <div
                key={opt.key}
                className="relative rounded-2xl border border-white/10 bg-slate-900/70 p-3 overflow-hidden shadow-sm"
              >
                {/* Visual Progress Bar Fill */}
                <motion.div
                  className="absolute inset-0 opacity-20 pointer-events-none"
                  style={{ backgroundColor: opt.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                />

                <div className="relative z-10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-xl font-black text-sm shadow-sm"
                      // Fixed white text failed AA on every option color here
                      // (e.g. cyan/amber/yellow read ~1.9–2.4:1) — pick
                      // whichever of black/white actually contrasts.
                      style={{ backgroundColor: opt.color, color: pickReadableOn(opt.color) }}
                    >
                      {opt.icon || opt.key}
                    </span>
                    <div>
                      <p className="text-sm font-black text-white">{opt.label}</p>
                      <p className="text-xs text-slate-400 font-mono">
                        {count} votes ({percentage}%)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => handleVote(opt.key, -1)}
                      disabled={count === 0}
                      className="h-8 w-8 rounded-lg border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                    >
                      -
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleVote(opt.key, 1)}
                      className="h-8 px-3 rounded-lg font-black text-xs shadow"
                      style={{ backgroundColor: opt.color, color: pickReadableOn(opt.color) }}
                    >
                      + Vote
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="rounded-xl border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 text-xs font-bold"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset Poll
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleCelebrateResults}
            disabled={totalVotes === 0}
            className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white font-black text-xs gap-1.5 shadow-lg shadow-violet-500/25"
          >
            <Sparkles className="h-3.5 w-3.5" /> Celebrate Class Check
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Badge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
        className,
      )}
    >
      {children}
    </span>
  );
}
