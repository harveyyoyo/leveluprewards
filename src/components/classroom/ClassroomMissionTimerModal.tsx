'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Check,
  Maximize2,
  Minimize2,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Timer,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { playClassroomSound } from '@/lib/classroom/classroomSoundSynth';

export interface ClassroomMissionTimerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  defaultMinutes?: number;
}

const PRESET_DURATIONS = [
  { label: '1m Sprint', seconds: 60, icon: '⚡' },
  { label: '2m Pair Talk', seconds: 120, icon: '💬' },
  { label: '3m Warm-Up', seconds: 180, icon: '🧠' },
  { label: '5m Quick Lab', seconds: 300, icon: '🔬' },
  { label: '10m Deep Work', seconds: 600, icon: '🎯' },
  { label: '15m Mission', seconds: 900, icon: '🚀' },
];

export function ClassroomMissionTimerModal({
  open,
  onOpenChange,
  title = 'Classroom Activity Timer',
  defaultMinutes = 5,
}: ClassroomMissionTimerProps) {
  const [totalSeconds, setTotalSeconds] = useState(defaultMinutes * 60);
  const [secondsRemaining, setSecondsRemaining] = useState(defaultMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [tickSoundEnabled, setTickSoundEnabled] = useState(false);
  const [timerFinished, setTimerFinished] = useState(false);

  const timerRef = useRef<number | null>(null);

  // Sync defaultMinutes if modal opens anew while not running
  useEffect(() => {
    if (!isRunning && secondsRemaining === totalSeconds) {
      const s = defaultMinutes * 60;
      setTotalSeconds(s);
      setSecondsRemaining(s);
    }
  }, [defaultMinutes, isRunning, secondsRemaining, totalSeconds]);

  // Main countdown loop
  useEffect(() => {
    if (isRunning && secondsRemaining > 0) {
      timerRef.current = window.setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            window.clearInterval(timerRef.current!);
            setIsRunning(false);
            setTimerFinished(true);
            if (soundEnabled) {
              playClassroomSound('timer_end', 1.0);
            }
            return 0;
          }
          if (tickSoundEnabled && prev <= 10) {
            playClassroomSound('timer_tick', 0.5);
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [isRunning, secondsRemaining, soundEnabled, tickSoundEnabled]);

  const handleStart = () => {
    if (secondsRemaining === 0) {
      setSecondsRemaining(totalSeconds);
    }
    setTimerFinished(false);
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimerFinished(false);
    setSecondsRemaining(totalSeconds);
  };

  const handleSelectPreset = (seconds: number) => {
    setIsRunning(false);
    setTimerFinished(false);
    setTotalSeconds(seconds);
    setSecondsRemaining(seconds);
  };

  const adjustSeconds = (delta: number) => {
    setSecondsRemaining((prev) => {
      const next = Math.max(10, prev + delta);
      if (!isRunning) {
        setTotalSeconds(next);
      }
      return next;
    });
    setTimerFinished(false);
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const progressFraction = totalSeconds > 0 ? (totalSeconds - secondsRemaining) / totalSeconds : 0;
  const isUrgent = secondsRemaining > 0 && secondsRemaining <= 30;

  // Floating Minimized HUD
  if (isMinimized && open) {
    return (
      <div className="fixed bottom-6 right-6 z-[9999] pointer-events-auto">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className={cn(
            'flex items-center gap-3 rounded-2xl border-2 px-4 py-2.5 shadow-2xl backdrop-blur-xl',
            timerFinished
              ? 'border-emerald-500 bg-emerald-950/90 text-emerald-200 animate-bounce'
              : isUrgent
              ? 'border-rose-500 bg-rose-950/90 text-rose-200 animate-pulse'
              : 'border-cyan-500/40 bg-slate-950/90 text-white',
          )}
        >
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-cyan-400" />
            <span className="font-mono text-xl font-black tracking-wider">
              {formatTime(secondsRemaining)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {isRunning ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={handlePause}
                className="h-8 w-8 text-white hover:bg-white/10"
              >
                <Pause className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={handleStart}
                className="h-8 w-8 text-white hover:bg-white/10"
              >
                <Play className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={handleReset}
              className="h-8 w-8 text-white/70 hover:bg-white/10"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setIsMinimized(false)}
              className="h-8 w-8 text-white/70 hover:bg-white/10"
              title="Expand full screen"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 text-white/50 hover:bg-white/10 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Full Screen / Dialog View
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md sm:max-w-lg border-2 border-cyan-500/30 bg-slate-950/95 text-white shadow-2xl backdrop-blur-2xl rounded-3xl p-6 overflow-hidden"
      >
        <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-400">
              <Timer className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight text-white">
                {title}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                {timerFinished
                  ? "🎉 Time is up! Great focus, class!"
                  : isRunning
                  ? '⚡ Mission in progress'
                  : 'Ready when you are'}
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mr-6">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsMinimized(true)}
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl"
              title="Minimize to floating HUD badge"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Circular Hologram Countdown Dial */}
        <div className="relative my-4 flex flex-col items-center justify-center">
          <div className="relative h-56 w-56 flex items-center justify-center">
            {/* Background Circle */}
            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="44"
                className="stroke-slate-800"
                strokeWidth="5"
                fill="transparent"
              />
              {/* Animated Progress Ring */}
              <circle
                cx="50"
                cy="50"
                r="44"
                className={cn(
                  'transition-all duration-500 ease-out',
                  timerFinished
                    ? 'stroke-emerald-400'
                    : isUrgent
                    ? 'stroke-rose-500 animate-pulse'
                    : 'stroke-cyan-400',
                )}
                strokeWidth="6"
                strokeDasharray="276.46"
                strokeDashoffset={276.46 * (1 - progressFraction)}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            {/* Glowing Inner Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <motion.span
                key={secondsRemaining}
                initial={{ scale: 0.96 }}
                animate={{ scale: 1 }}
                className={cn(
                  'font-mono text-5xl font-black tracking-wider transition-colors',
                  timerFinished
                    ? 'text-emerald-400'
                    : isUrgent
                    ? 'text-rose-400'
                    : 'text-white',
                )}
              >
                {formatTime(secondsRemaining)}
              </motion.span>
              <span className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                {timerFinished ? 'Complete' : isRunning ? 'Active' : 'Standby'}
              </span>
            </div>
          </div>

          {/* Quick Bump Buttons (+1 min, -1 min, +30s) */}
          <div className="mt-3 flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => adjustSeconds(-60)}
              disabled={secondsRemaining <= 60}
              className="h-8 rounded-xl border-white/10 bg-white/5 text-xs text-white hover:bg-white/10"
            >
              <Minus className="mr-1 h-3 w-3" /> 1m
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => adjustSeconds(30)}
              className="h-8 rounded-xl border-white/10 bg-white/5 text-xs text-white hover:bg-white/10"
            >
              <Plus className="mr-1 h-3 w-3" /> 30s
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => adjustSeconds(60)}
              className="h-8 rounded-xl border-white/10 bg-white/5 text-xs text-white hover:bg-white/10"
            >
              <Plus className="mr-1 h-3 w-3" /> 1m
            </Button>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center justify-center gap-3">
          {isRunning ? (
            <Button
              type="button"
              size="lg"
              onClick={handlePause}
              className="h-12 flex-1 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm gap-2 shadow-lg shadow-amber-500/20"
            >
              <Pause className="h-5 w-5" /> Pause
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              onClick={handleStart}
              className="h-12 flex-1 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-sm gap-2 shadow-lg shadow-cyan-500/25"
            >
              <Play className="h-5 w-5 fill-current" />
              {secondsRemaining < totalSeconds && secondsRemaining > 0 ? 'Resume' : 'Start Timer'}
            </Button>
          )}

          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={handleReset}
            className="h-12 px-5 rounded-2xl border-white/20 bg-white/5 text-white hover:bg-white/10 font-bold"
            title="Reset timer"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Activity Presets */}
        <div className="mt-4 space-y-2">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
            Quick Activity Presets
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {PRESET_DURATIONS.map((preset) => (
              <button
                key={preset.seconds}
                type="button"
                onClick={() => handleSelectPreset(preset.seconds)}
                className={cn(
                  'flex flex-col items-center justify-center rounded-xl border p-2 text-center transition-all',
                  totalSeconds === preset.seconds
                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
                )}
              >
                <span className="text-base">{preset.icon}</span>
                <span className="mt-1 text-[10px] font-bold leading-tight">{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Preferences Toggle Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Switch
              id="sound-alert"
              checked={soundEnabled}
              onCheckedChange={setSoundEnabled}
              className="data-[state=checked]:bg-cyan-500"
            />
            <Label htmlFor="sound-alert" className="text-xs text-slate-300 cursor-pointer">
              Chime at 0:00
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="tick-sound"
              checked={tickSoundEnabled}
              onCheckedChange={setTickSoundEnabled}
              className="data-[state=checked]:bg-cyan-500"
            />
            <Label htmlFor="tick-sound" className="text-xs text-slate-300 cursor-pointer">
              Final 10s tick
            </Label>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
