'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  Mic,
  MicOff,
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { playClassroomSound } from '@/lib/classroom/classroomSoundSynth';

export interface ClassroomNoiseRadarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type NoiseZone = 'silent' | 'whisper' | 'collaborative' | 'presentation';

const NOISE_ZONES: {
  id: NoiseZone;
  name: string;
  threshold: number;
  icon: string;
  desc: string;
  color: string;
}[] = [
  {
    id: 'silent',
    name: 'Silent Orbit',
    threshold: 22,
    icon: '🤫',
    desc: 'Solo testing or quiet reading',
    color: '#06b6d4',
  },
  {
    id: 'whisper',
    name: 'Whisper Nebula',
    threshold: 42,
    icon: '💬',
    desc: 'Low voice pair consultations',
    color: '#3b82f6',
  },
  {
    id: 'collaborative',
    name: 'Group Station',
    threshold: 65,
    icon: '👥',
    desc: 'Active team missions & projects',
    color: '#8b5cf6',
  },
  {
    id: 'presentation',
    name: 'Presentation Deck',
    threshold: 88,
    icon: '📢',
    desc: 'Whole-class discussion & cheers',
    color: '#ec4899',
  },
];

export function ClassroomNoiseRadarModal({ open, onOpenChange }: ClassroomNoiseRadarProps) {
  const [selectedZone, setSelectedZone] = useState<NoiseZone>('whisper');
  const [isListening, setIsListening] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [spikeCount, setSpikeCount] = useState(0);
  const [sensitivity, setSensitivity] = useState(1.0);
  const [softChimeOnSpike, setSoftChimeOnSpike] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const spikeCooldownRef = useRef<number>(0);

  const activeZone = NOISE_ZONES.find((z) => z.id === selectedZone) || NOISE_ZONES[1];
  const isOverLimit = isListening && currentLevel > activeZone.threshold;

  // Stop mic helper
  const stopListening = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        void audioCtxRef.current.close();
      } catch {
        /* ignore */
      }
      audioCtxRef.current = null;
    }
    setIsListening(false);
    setCurrentLevel(0);
  }, []);

  // Start mic helper
  const startListening = useCallback(async () => {
    setMicError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMicError('Microphone is not supported in this browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.65;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        // Map 0..128 to 0..100 with sensitivity multiplier
        const normalized = Math.min(100, Math.round((avg / 1.28) * sensitivity));
        setCurrentLevel(normalized);

        // Check spike
        if (normalized > activeZone.threshold) {
          const now = Date.now();
          if (now - spikeCooldownRef.current > 3500) {
            spikeCooldownRef.current = now;
            setSpikeCount((prev) => prev + 1);
            if (softChimeOnSpike) {
              playClassroomSound('timer_tick', 0.4);
            }
          }
        }

        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      setIsListening(true);
      animFrameRef.current = requestAnimationFrame(checkVolume);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Please grant microphone access';
      setMicError(msg.includes('Permission') ? 'Microphone permission denied. Allow mic in browser bar.' : msg);
      stopListening();
    }
  }, [activeZone.threshold, sensitivity, softChimeOnSpike, stopListening]);

  // Clean up when modal closes or unmounts
  useEffect(() => {
    if (!open) {
      stopListening();
    }
    return () => {
      stopListening();
    };
  }, [open, stopListening]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg border-2 border-indigo-500/30 bg-slate-950/95 text-white shadow-2xl backdrop-blur-2xl rounded-3xl p-6 overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400">
              <Radio className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight text-white">
                Classroom Noise Radar
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Live volume feedback for self-regulating student focus
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {micError && (
          <div className="mt-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{micError}</span>
          </div>
        )}

        {/* Visual Noise Meter Radar */}
        <div className="relative my-4 flex flex-col items-center justify-center p-4 rounded-3xl border border-white/10 bg-slate-900/50">
          {/* Radar Circles */}
          <div className="relative h-44 w-44 flex items-center justify-center">
            {/* Outer Target Limit Ring */}
            <div
              className={cn(
                'absolute inset-0 rounded-full border-2 border-dashed transition-all duration-300',
                isOverLimit
                  ? 'border-rose-500 animate-ping'
                  : 'border-white/20',
              )}
            />

            {/* Glowing Audio Level Bulb */}
            <motion.div
              animate={{
                scale: isListening ? Math.max(0.3, currentLevel / 80) : 0.4,
                opacity: isListening ? 0.85 : 0.3,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className={cn(
                'h-28 w-28 rounded-full blur-sm transition-colors duration-200',
                !isListening
                  ? 'bg-slate-700'
                  : isOverLimit
                  ? 'bg-gradient-to-tr from-rose-600 to-amber-500 shadow-xl shadow-rose-500/50'
                  : 'bg-gradient-to-tr from-cyan-500 to-emerald-400 shadow-xl shadow-cyan-500/40',
              )}
            />

            {/* Center Readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black font-mono tracking-tight text-white drop-shadow">
                {isListening ? `${currentLevel}%` : 'Muted'}
              </span>
              <span
                className={cn(
                  'mt-0.5 text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full',
                  !isListening
                    ? 'bg-slate-800 text-slate-400'
                    : isOverLimit
                    // `rose-500` only reads ~3.7:1 against white text — `rose-600` clears AA (~4.7:1).
                    ? 'bg-rose-600 text-white animate-bounce'
                    : 'bg-emerald-500/20 text-emerald-300',
                )}
              >
                {!isListening
                  ? 'Offline'
                  : isOverLimit
                  ? '⚠️ Too Loud'
                  : '✨ Great Level'}
              </span>
            </div>
          </div>

          {/* Target Threshold Indicator Bar */}
          <div className="mt-4 w-full max-w-xs space-y-1.5">
            <div className="flex justify-between text-[11px] font-bold text-slate-400">
              <span>Room Volume</span>
              <span>Limit: {activeZone.threshold}%</span>
            </div>
            <div className="relative h-3 w-full rounded-full bg-slate-800 overflow-hidden">
              {/* Target Threshold Marker Line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10"
                style={{ left: `${activeZone.threshold}%` }}
              />
              {/* Live Fill */}
              <div
                className={cn(
                  'h-full transition-all duration-150 rounded-full',
                  isOverLimit
                    ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                    : 'bg-gradient-to-r from-emerald-500 to-cyan-400',
                )}
                style={{ width: `${currentLevel}%` }}
              />
            </div>
          </div>

          {/* Spike Stats Counter */}
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400 font-semibold">
            <span>Spikes over limit:</span>
            <span
              className={cn(
                'font-mono font-bold px-2 py-0.5 rounded-lg',
                spikeCount > 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-white/5 text-slate-300',
              )}
            >
              {spikeCount}
            </span>
            {spikeCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSpikeCount(0)}
                className="h-6 text-[10px] text-slate-400 hover:text-white px-2"
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Start / Stop Toggle Button */}
        <div className="flex gap-3">
          {isListening ? (
            <Button
              type="button"
              size="lg"
              onClick={stopListening}
              className="h-11 flex-1 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black text-sm gap-2"
            >
              <MicOff className="h-4 w-4 text-rose-400" /> Pause Radar
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              onClick={() => void startListening()}
              className="h-11 flex-1 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white font-black text-sm gap-2 shadow-lg shadow-indigo-500/25"
            >
              <Mic className="h-4 w-4" /> Start Noise Radar
            </Button>
          )}
        </div>

        {/* Target Noise Zones Selection */}
        <div className="mt-4 space-y-2">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
            Target Noise Goal
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {NOISE_ZONES.map((zone) => (
              <button
                key={zone.id}
                type="button"
                onClick={() => setSelectedZone(zone.id)}
                className={cn(
                  'flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition-all',
                  selectedZone === zone.id
                    ? 'border-indigo-400 bg-indigo-500/20 text-white shadow-sm'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
                )}
              >
                <span className="text-xl">{zone.icon}</span>
                <span className="mt-1 text-xs font-bold leading-tight">{zone.name}</span>
                <span className="text-[10px] text-slate-400">{zone.threshold}% max</span>
              </button>
            ))}
          </div>
        </div>

        {/* Calibration & Feedback Controls */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Switch
              id="soft-chime"
              checked={softChimeOnSpike}
              onCheckedChange={setSoftChimeOnSpike}
              className="data-[state=checked]:bg-indigo-500"
            />
            <Label htmlFor="soft-chime" className="text-xs text-slate-300 cursor-pointer">
              Soft chime on spike
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Mic Sensitivity:</span>
            <div className="w-20">
              <Slider
                value={[sensitivity]}
                min={0.5}
                max={2.0}
                step={0.1}
                onValueChange={([val]) => setSensitivity(val)}
              />
            </div>
            <span className="font-mono text-[10px] text-slate-300">{sensitivity.toFixed(1)}x</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
