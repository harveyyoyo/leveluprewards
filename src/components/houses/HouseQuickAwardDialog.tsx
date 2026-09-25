'use client';

import { useState } from 'react';
import { Sparkles, Trophy, Plus, Minus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HouseBadge } from './HouseBadge';
import type { House } from '@/lib/types';
import { useHousesSound } from '@/hooks/useHousesSound';
import { classroomPointSoundEffect } from '@/lib/classroom/classroomPointSounds';
import { pickReadableOn } from '@/lib/themeContrast';

export interface HouseQuickAwardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  house: House | null;
  onAward: (house: House, delta: number, reason?: string) => Promise<void>;
}

const PRESET_AMOUNTS = [5, 10, 25, 50, 100];

export function HouseQuickAwardDialog({
  open,
  onOpenChange,
  house,
  onAward,
}: HouseQuickAwardDialogProps) {
  const { playUi } = useHousesSound();
  const [selectedDelta, setSelectedDelta] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isDeduction, setIsDeduction] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!house) return null;

  const currentPoints = house.points ?? 0;
  const effectiveAmount = customAmount ? Math.max(0, parseInt(customAmount, 10) || 0) : selectedDelta;
  const finalDelta = isDeduction ? -effectiveAmount : effectiveAmount;
  const projectedPoints = Math.max(0, currentPoints + finalDelta);

  const handleSubmit = async () => {
    if (finalDelta === 0 || submitting) return;
    setSubmitting(true);
    try {
      playUi(classroomPointSoundEffect(finalDelta, isDeduction));
      await onAward(house, finalDelta, reason.trim() || undefined);
      onOpenChange(false);
      setCustomAmount('');
      setReason('');
      setIsDeduction(false);
      setSelectedDelta(10);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-white/20 bg-slate-950/95 text-white shadow-2xl backdrop-blur-xl">
        <DialogHeader className="space-y-3 pb-2">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg"
              style={{
                backgroundColor: `${house.color}25`,
                borderColor: `${house.color}60`,
                borderWidth: '1.5px',
              }}
            >
              <span className="text-2xl">{house.emoji || '🛡️'}</span>
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-white flex items-center gap-2">
                Award Points to {house.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-white/60">
                Current score: <span className="font-bold text-white/90 tabular-nums">{currentPoints.toLocaleString()} pts</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Mode Switch: Add vs Deduct */}
          <div className="flex rounded-xl bg-white/10 p-1">
            <button
              type="button"
              onClick={() => {
                playUi('click');
                setIsDeduction(false);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                !isDeduction ? 'bg-emerald-600 text-white shadow-xs' : 'text-white/60 hover:text-white'
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Points</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playUi('click');
                setIsDeduction(true);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                isDeduction ? 'bg-rose-600 text-white shadow-xs' : 'text-white/60 hover:text-white'
              }`}
            >
              <Minus className="h-3.5 w-3.5" />
              <span>Deduct Points</span>
            </button>
          </div>

          {/* Quick preset buttons */}
          <div className="space-y-1.5">
            <Label className="text-xs text-white/70 font-semibold">Quick Amounts</Label>
            <div className="grid grid-cols-5 gap-2">
              {PRESET_AMOUNTS.map((amt) => {
                const isSelected = !customAmount && selectedDelta === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      playUi('click');
                      setSelectedDelta(amt);
                      setCustomAmount('');
                    }}
                    className={`h-11 rounded-xl font-black text-sm transition-all border ${
                      isSelected
                        ? isDeduction
                          ? 'border-rose-400 bg-rose-500/25 text-rose-300 ring-2 ring-rose-400/40'
                          : 'border-emerald-400 bg-emerald-500/25 text-emerald-300 ring-2 ring-emerald-400/40'
                        : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {isDeduction ? `-${amt}` : `+${amt}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom amount */}
          <div className="space-y-1.5">
            <Label htmlFor="quick-award-custom" className="text-xs text-white/70 font-semibold">
              Or Custom Amount
            </Label>
            <Input
              id="quick-award-custom"
              type="number"
              min="1"
              placeholder="e.g. 150"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="bg-white/5 border-white/15 text-white placeholder:text-white/30 h-10 rounded-xl"
            />
          </div>

          {/* Optional reason */}
          <div className="space-y-1.5">
            <Label htmlFor="quick-award-reason" className="text-xs text-white/70 font-semibold">
              Reason (optional)
            </Label>
            <Input
              id="quick-award-reason"
              placeholder="e.g. Spirit Week Victory, Clean Hallway Challenge"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bg-white/5 border-white/15 text-white placeholder:text-white/30 h-10 rounded-xl"
            />
          </div>

          {/* Projected total banner */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center justify-between">
            <span className="text-xs text-white/60 font-medium">New Total for {house.name}:</span>
            <span className="text-base font-black tabular-nums text-white">
              {projectedPoints.toLocaleString()} pts
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-white/70 hover:text-white hover:bg-white/10 rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={effectiveAmount <= 0 || submitting}
            onClick={() => void handleSubmit()}
            className="rounded-xl font-bold px-5"
            style={{
              backgroundImage: isDeduction
                ? 'linear-gradient(135deg, #e11d48, #be123c)'
                : `linear-gradient(135deg, ${house.color}, var(--hr-accent-to, #7c3aed))`,
              // Deduction side is a fixed rose gradient (white always reads).
              // The award side starts from the free-form house color, which
              // can be pale enough that fixed white text goes unreadable.
              color: isDeduction ? '#ffffff' : pickReadableOn(house.color),
            }}
          >
            <Sparkles className="mr-1.5 h-4 w-4" />
            {isDeduction
              ? `Deduct ${effectiveAmount} pts`
              : `Award +${effectiveAmount} pts`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
