'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
import type { Student } from '@/lib/types';

export interface RandomStudentPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onAward: (studentId: string, points: number, reason: string) => Promise<boolean | void>;
  defaultPoints?: number;
  defaultReason?: string;
  accentColor?: string;
}

export function RandomStudentPickerModal({
  isOpen,
  onClose,
  students,
  onAward,
  defaultPoints = 5,
  defaultReason = 'Random student pick',
  accentColor = '#10b981',
}: RandomStudentPickerModalProps) {
  const playSound = useArcadeSound();
  const [isSpinning, setIsSpinning] = useState(false);
  const [highlightedStudent, setHighlightedStudent] = useState<Student | null>(null);
  const [selectedWinner, setSelectedWinner] = useState<Student | null>(null);
  const [awardPoints, setAwardPoints] = useState<number>(defaultPoints);
  const [awardReason, setAwardReason] = useState<string>(defaultReason);
  const [isAwarding, setIsAwarding] = useState(false);
  const [awardedSuccess, setAwardedSuccess] = useState(false);
  const [awardError, setAwardError] = useState<string | null>(null);

  const spinTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const studentsRef = useRef(students);
  studentsRef.current = students;
  const soundRef = useRef(playSound);
  soundRef.current = playSound;
  const rosterKey = students.map((student) => student.id).join('|');

  const startSpin = useCallback(() => {
    const students = studentsRef.current;
    if (!students.length) return;
    if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    setIsSpinning(true);
    setSelectedWinner(null);
    setAwardedSuccess(false);
    setAwardError(null);

    let currentIdx = Math.floor(Math.random() * students.length);
    let delay = 60;
    let step = 0;
    const totalSteps = 24 + Math.floor(Math.random() * 8);

    const stepTick = () => {
      currentIdx = (currentIdx + 1) % students.length;
      setHighlightedStudent(students[currentIdx]);
      soundRef.current(CLASSROOM_TAP_SOUND);
      step++;

      if (step < totalSteps) {
        // Decelerate as we approach the winner
        if (step > totalSteps - 5) {
          delay += 70;
        } else if (step > totalSteps - 10) {
          delay += 35;
        }
        spinTimeoutRef.current = setTimeout(stepTick, delay);
      } else {
        // Landed on winner!
        setIsSpinning(false);
        const winner = students[currentIdx];
        setSelectedWinner(winner);
        soundRef.current(CLASSROOM_PICK_SOUND);
      }
    };

    spinTimeoutRef.current = setTimeout(stepTick, delay);
  }, []);

  useEffect(() => {
    if (isOpen) {
      startSpin();
    } else {
      setIsSpinning(false);
      setSelectedWinner(null);
      setHighlightedStudent(null);
      setAwardedSuccess(false);
    }
    return () => {
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    };
  }, [isOpen, startSpin, rosterKey]);

  const handleGiveAward = async (pts: number) => {
    if (!selectedWinner || isAwarding) return;
    setIsAwarding(true);
    setAwardError(null);
    try {
      const result = await onAward(selectedWinner.id, pts, awardReason || 'Random student spotlight');
      if (result === false) throw new Error('Could not save points. Please try again.');
      setAwardedSuccess(true);
      playSound('classroom_award');
    } catch (error) {
      setAwardError(error instanceof Error ? error.message : 'Could not save points. Please try again.');
      playSound('error');
    } finally {
      setIsAwarding(false);
    }
  };

  const currentDisplayStudent = selectedWinner || highlightedStudent || students[0];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="classroom-native-colors max-w-md grid-cols-1 rounded-3xl p-6 sm:p-8 overflow-x-hidden text-center text-foreground">
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

        <div className="mt-4 space-y-6">
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

          {awardError && <p role="alert" className="text-sm text-destructive">{awardError}</p>}
          {/* Action Area */}
          {selectedWinner && !awardedSuccess ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Quick Award Spotlight
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 5].map((pts) => (
                    <Button
                      key={pts}
                      type="button"
                      variant="outline"
                      disabled={isAwarding}
                      onClick={() => handleGiveAward(pts)}
                      className="rounded-2xl border-2 font-black text-sm h-11 transition-transform hover:scale-105 hover:border-amber-400"
                    >
                      <Award className="mr-1.5 h-4 w-4 text-amber-500" />
                      +{pts} pts
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
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
