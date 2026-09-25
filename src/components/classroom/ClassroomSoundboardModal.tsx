'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bell,
  Headphones,
  Music,
  Pause,
  Play,
  Radio,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import {
  playClassroomSound,
  startClassroomAmbient,
  stopClassroomAmbient,
  isClassroomAmbientPlaying,
  type ClassroomSoundName,
  type ClassroomAmbientName,
} from '@/lib/classroom/classroomSoundSynth';

export interface ClassroomSoundboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SOUND_CUES: {
  id: ClassroomSoundName;
  name: string;
  desc: string;
  icon: string;
  color: string;
}[] = [
  {
    id: 'attention_gong',
    name: 'Attention Gong',
    desc: 'Harmonic singing bowl for instant calm',
    icon: '🔔',
    color: '#06b6d4',
  },
  {
    id: 'victory_fanfare',
    name: 'Victory Fanfare',
    desc: 'Triumphant celebratory chord',
    icon: '🎺',
    color: '#f59e0b',
  },
  {
    id: 'drumroll',
    name: 'Drumroll & Ding',
    desc: 'Building suspense before big reveals',
    icon: '🥁',
    color: '#ec4899',
  },
  {
    id: 'applause',
    name: 'Class Applause',
    desc: 'Warm wave of praise and cheers',
    icon: '👏',
    color: '#10b981',
  },
  {
    id: 'idea_spark',
    name: 'Brilliant Spark',
    desc: 'Bright crystal ping for great insights',
    icon: '💡',
    color: '#8b5cf6',
  },
  {
    id: 'warp_speed',
    name: 'Transition Warp',
    desc: 'Sci-fi swoosh for quick classroom shifts',
    icon: '🚀',
    color: '#3b82f6',
  },
];

const AMBIENT_SOUNDSCAPES: {
  id: ClassroomAmbientName;
  name: string;
  desc: string;
  icon: string;
}[] = [
  {
    id: 'cosmic_hum',
    name: 'Cosmic Library',
    desc: 'Warm, low-frequency soothing focus hum',
    icon: '🌌',
  },
  {
    id: 'alpha_waves',
    name: 'Alpha Flow',
    desc: 'Gentle binaural tone for deep study',
    icon: '🧘',
  },
  {
    id: 'rain_drift',
    name: 'Gentle Rain Drift',
    desc: 'Soft textured rainfall for calm work',
    icon: '🌧️',
  },
];

export function ClassroomSoundboardModal({ open, onOpenChange }: ClassroomSoundboardProps) {
  const [playingSound, setPlayingSound] = useState<string | null>(null);
  const [activeAmbient, setActiveAmbient] = useState<ClassroomAmbientName | null>(null);
  const [ambientVolume, setAmbientVolume] = useState<number>(0.35);

  const handlePlaySound = (id: ClassroomSoundName) => {
    setPlayingSound(id);
    playClassroomSound(id, 1.0);
    setTimeout(() => {
      setPlayingSound((curr) => (curr === id ? null : curr));
    }, 1200);
  };

  const handleToggleAmbient = (id: ClassroomAmbientName) => {
    if (activeAmbient === id) {
      stopClassroomAmbient();
      setActiveAmbient(null);
    } else {
      startClassroomAmbient(id, ambientVolume);
      setActiveAmbient(id);
    }
  };

  const handleAmbientVolumeChange = (vol: number) => {
    setAmbientVolume(vol);
    if (activeAmbient) {
      startClassroomAmbient(activeAmbient, vol);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg border-2 border-amber-500/30 bg-slate-950/95 text-white shadow-2xl backdrop-blur-2xl rounded-3xl p-6 overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
              <Music className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight text-white">
                Classroom Soundboard &amp; Focus Ambience
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Attention chimes, celebration fanfares, and calm background focus loops
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* 1-Tap Soundboard Cues Grid */}
        <div className="my-3 space-y-2">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
            Instant Sound Cues (1-Tap)
          </p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {SOUND_CUES.map((cue) => {
              const isTriggered = playingSound === cue.id;
              return (
                <button
                  key={cue.id}
                  type="button"
                  onClick={() => handlePlaySound(cue.id)}
                  className={cn(
                    'group flex flex-col items-start rounded-2xl border p-3 text-left transition-all duration-150',
                    isTriggered
                      ? 'scale-95 border-amber-400 bg-amber-500/25 ring-2 ring-amber-400'
                      : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10 active:scale-95',
                  )}
                >
                  <span className="text-2xl transition-transform group-hover:scale-110">
                    {cue.icon}
                  </span>
                  <span className="mt-1.5 text-xs font-black tracking-tight text-white">
                    {cue.name}
                  </span>
                  <span className="text-[10px] text-slate-400 leading-snug line-clamp-2 mt-0.5">
                    {cue.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Ambient Focus Audio Section */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Headphones className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                Focus Soundscapes (Work Time)
              </span>
            </div>
            {activeAmbient && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Playing now
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {AMBIENT_SOUNDSCAPES.map((amb) => {
              const isActive = activeAmbient === amb.id;
              return (
                <button
                  key={amb.id}
                  type="button"
                  onClick={() => handleToggleAmbient(amb.id)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all',
                    isActive
                      ? 'border-cyan-400 bg-cyan-500/20 text-white shadow-sm'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
                  )}
                >
                  <span className="text-xl">{amb.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">{amb.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{amb.desc}</p>
                  </div>
                  {isActive ? (
                    <Pause className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
                  ) : (
                    <Play className="h-3.5 w-3.5 shrink-0 text-slate-400 opacity-60" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-3 pt-1">
            <Volume2 className="h-4 w-4 text-slate-400" />
            <div className="flex-1">
              <Slider
                value={[ambientVolume]}
                min={0.05}
                max={0.8}
                step={0.05}
                onValueChange={([val]) => handleAmbientVolumeChange(val)}
              />
            </div>
            <span className="font-mono text-[10px] text-slate-400 w-8 text-right">
              {Math.round(ambientVolume * 100)}%
            </span>
            {activeAmbient && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  stopClassroomAmbient();
                  setActiveAmbient(null);
                }}
                className="h-7 text-xs text-rose-300 hover:text-white hover:bg-rose-500/20"
              >
                Stop
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
