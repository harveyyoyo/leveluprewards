'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  CheckCircle2,
  Crown,
  RotateCcw,
  Shuffle,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import {
  CLASSROOM_PICK_SOUND,
  CLASSROOM_TAP_SOUND,
} from '@/lib/classroom/classroomPointSounds';
import { getStudentNickname } from '@/lib/utils';
import { playClassroomSound } from '@/lib/classroom/classroomSoundSynth';
import type { Student } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export interface RandomStudentPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onAward: (studentId: string, points: number, reason: string) => Promise<boolean | void>;
  defaultPoints?: number;
  defaultReason?: string;
  accentColor?: string;
  attendanceMap?: Map<string, string>;
}

export function RandomStudentPickerModal({
  isOpen,
  onClose,
  students,
  onAward,
  defaultPoints = 5,
  defaultReason = 'Random student spotlight',
  accentColor = '#10b981',
  attendanceMap,
}: RandomStudentPickerModalProps) {
  const playSound = useArcadeSound();
  const [isSpinning, setIsSpinning] = useState(false);
  const [highlightedStudent, setHighlightedStudent] = useState<Student | null>(null);
  const [selectedWinner, setSelectedWinner] = useState<Student | null>(null);
  const [awardPoints, setAwardPoints] = useState<number>(defaultPoints);
  const [awardReason, setAwardReason] = useState<string>(defaultReason);
  const [isAwarding, setIsAwarding] = useState(false);
  const [awardedSuccess, setAwardedSuccess] = useState(false);
  const [onlyPresent, setOnlyPresent] = useState(true);

  // Compute absent students from attendance map
  const absentCount = useMemo(() => {
    if (!attendanceMap) return 0;
    return students.filter((s) => attendanceMap.get(s.id) === 'absent').length;
  }, [students, attendanceMap]);

  const eligibleStudents = useMemo(() => {
    if (!onlyPresent || !attendanceMap || absentCount === 0) return students;
    const presentOnly = students.filter((s) => attendanceMap.get(s.id) !== 'absent');
    return presentOnly.length > 0 ? presentOnly : students;
  }, [students, attendanceMap, onlyPresent, absentCount]);

  const spinTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startSpin = useCallback(() => {
    if (!eligibleStudents.length) return;
    setIsSpinning(true);
    setSelectedWinner(null);
    setAwardedSuccess(false);

    let currentIdx = Math.floor(Math.random() * eligibleStudents.length);
    let delay = 60;
    let step = 0;
    const totalSteps = 24 + Math.floor(Math.random() * 8);

    const stepTick = () => {
      currentIdx = (currentIdx + 1) % eligibleStudents.length;
      setHighlightedStudent(eligibleStudents[currentIdx]);
      playSound(CLASSROOM_TAP_SOUND);
      step++;

      if (step < totalSteps) {
        // Decelerate as we approach the winner
        if (step > totalSteps - 10) {
          delay += 35;
        } else if (step > totalSteps - 5) {
          delay += 70;
        }
        spinTimeoutRef.current = setTimeout(stepTick, delay);
      } else {
        // Landed on winner!
        setIsSpinning(false);
        const winner = eligibleStudents[currentIdx];
        setSelectedWinner(winner);
        playSound(CLASSROOM_PICK_SOUND);
        playClassroomSound('victory_fanfare', 0.85);
      }
    };

    spinTimeoutRef.current = setTimeout(stepTick, delay);
  }, [eligibleStudents, playSound]);

  useEffect(() => {
    if (isOpen && eligibleStudents.length > 0 && !selectedWinner && !isSpinning) {
      startSpin();
    }
    return () => {
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    };
  }, [isOpen, eligibleStudents.length, startSpin, isSpinning, selectedWinner]);

  const handleGiveAward = async (pts: number, customReason?: string) => {
    if (!selectedWinner || isAwarding) return;
    setIsAwarding(true);
    try {
      await onAward(selectedWinner.id, pts, customReason || awardReason || 'Random student spotlight');
      setAwardedSuccess(true);
      playSound('classroom_award');
    } catch {
      playSound('error');
    } finally {
      setIsAwarding(false);
    }
  };

  const currentDisplayStudent = selectedWinner || highlightedStudent || eligibleStudents[0] || students[0];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md overflow-y-auto rounded-3xl p-4 text-center sm:p-8">
        <DialogHeader className="space-y-1">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 mb-1">
            <Shuffle className="h-6 w-6" />
          </div>
          <DialogTitle className="text-2xl font-black tracking-tight">
            Random Student Picker
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isSpinning ? 'Shuffling students…' : selectedWinner ? 'Congratulations!' : 'Ready to pick'}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Attendance filter toggle if any student is absent */}
          {absentCount > 0 ? (
            <div className="flex items-center justify-between rounded-2xl border bg-muted/40 px-3.5 py-2 text-xs">
              <span className="font-semibold text-muted-foreground">
                {onlyPresent
                  ? `Present students only (${students.length - absentCount} in class)`
                  : `All students (${absentCount} absent)`}
              </span>
              <div className="flex items-center gap-2">
                <Switch
                  id="only-present-switch"
                  checked={onlyPresent}
                  disabled={isSpinning}
                  onCheckedChange={setOnlyPresent}
                />
              </div>
            </div>
          ) : null}

          {/* Winner / Active Student Display Card */}
          <div
            className={`relative mx-auto flex flex-col items-center justify-center rounded-3xl border-2 p-6 transition-all duration-300 ${
              selectedWinner
                ? 'border-amber-400/60 bg-gradient-to-b from-amber-500/15 via-amber-500/5 to-transparent shadow-xl shadow-amber-500/10'
                : 'border-border bg-muted/30'
            }`}
          >
            {selectedWinner && (
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                className="absolute -top-3.5 flex items-center gap-1 rounded-full bg-amber-500 px-3 py-0.5 text-[11px] font-black uppercase tracking-wider text-black shadow-lg"
              >
                <Crown className="h-3 w-3" />
                Winner
              </motion.div>
            )}

            {/* Avatar */}
            <div className="relative mb-3">
              <Avatar
                className={`h-24 w-24 border-4 transition-transform duration-200 shadow-md ${
                  selectedWinner
                    ? 'border-amber-400 scale-105 ring-4 ring-amber-400/20'
                    : isSpinning
                      ? 'border-primary/50 scale-95'
                      : 'border-border'
                }`}
              >
                <AvatarImage src={currentDisplayStudent?.photoUrl} />
                <AvatarFallback className="text-2xl font-black bg-muted text-foreground">
                  {currentDisplayStudent
                    ? `${currentDisplayStudent.firstName?.[0] || ''}${currentDisplayStudent.lastName?.[0] || ''}`.toUpperCase()
                    : '?'}
                </AvatarFallback>
              </Avatar>

              {selectedWinner && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow"
                >
                  <Sparkles className="h-4 w-4" />
                </motion.div>
              )}
            </div>

            {/* Name */}
            <h3 className="text-xl sm:text-2xl font-black text-foreground">
              {currentDisplayStudent ? getStudentNickname(currentDisplayStudent) : 'Loading…'}
            </h3>
            {currentDisplayStudent?.lastName && (
              <p className="text-xs font-semibold text-muted-foreground">
                {currentDisplayStudent.lastName}
              </p>
            )}
          </div>

          {/* Action Area */}
          {selectedWinner && !awardedSuccess ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 text-left"
            >
              {/* Quick Award Points */}
              <div className="space-y-2">
                <p className="text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Quick Award Spotlight
                </p>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 5, 10].map((pts) => (
                    <Button
                      key={pts}
                      type="button"
                      variant="outline"
                      disabled={isAwarding}
                      onClick={() => handleGiveAward(pts)}
                      className="h-11 min-w-0 rounded-2xl border-2 px-1 font-black text-sm transition-transform hover:scale-105 hover:border-amber-400 sm:px-3"
                    >
                      +{pts} pts
                    </Button>
                  ))}
                </div>
              </div>

              {/* Quick Reason Chips */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-muted-foreground">Award reason:</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Spotlight Star',
                    'Active Participation',
                    'Great Effort',
                    'Team Helper',
                    'Super Answer',
                  ].map((presetReason) => (
                    <button
                      key={presetReason}
                      type="button"
                      onClick={() => setAwardReason(presetReason)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                        awardReason === presetReason
                          ? 'bg-amber-500 text-black font-bold shadow-sm'
                          : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {presetReason}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={startSpin}
                  disabled={isSpinning || isAwarding}
                  className="flex-1 font-bold text-xs gap-1.5 rounded-2xl h-10"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Spin Again
                </Button>
                <Button
                  type="button"
                  onClick={() => handleGiveAward(awardPoints)}
                  disabled={isAwarding}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs gap-1.5 rounded-2xl h-10 shadow"
                >
                  <Trophy className="h-3.5 w-3.5" />
                  Award +{awardPoints}
                </Button>
              </div>
            </motion.div>
          ) : awardedSuccess ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 space-y-3"
            >
              <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="h-5 w-5" />
                Points Awarded Successfully!
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={startSpin}
                  className="flex-1 rounded-xl font-bold text-xs gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Pick Another
                </Button>
                <Button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl font-bold text-xs bg-foreground text-background"
                >
                  Done
                </Button>
              </div>
            </motion.div>
          ) : (
            <Button
              type="button"
              size="lg"
              disabled={isSpinning}
              onClick={startSpin}
              className="w-full rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-base h-12 shadow-lg"
            >
              <Shuffle className="mr-2 h-5 w-5 animate-spin" />
              Shuffling Students…
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
