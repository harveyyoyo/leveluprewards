'use client';

import { useEffect, useState } from 'react';
import { Trash2, Sparkles, Shield } from 'lucide-react';
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
import type { House, Student } from '@/lib/types';
import { useHousesSound } from '@/hooks/useHousesSound';
import { pickReadableOn } from '@/lib/themeContrast';

export interface HouseEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  house: House | null; // null = creating new house
  onSave: (data: {
    id?: string;
    name: string;
    value?: string;
    color: string;
    emoji?: string;
    motto?: string;
  }) => Promise<void>;
  onDelete?: (house: House) => Promise<void>;
  assignedStudentsCount?: number;
}

const COLOR_SWATCHES = [
  '#DC2626', // Red
  '#EA580C', // Orange
  '#D97706', // Amber
  '#16A34A', // Emerald
  '#0D9488', // Teal
  '#2563EB', // Blue
  '#7C3AED', // Violet
  '#C026D3', // Fuchsia
  '#DB2777', // Pink
  '#475569', // Slate
];

const EMOJI_SUGGESTIONS = [
  '🦁', '🦅', '🦡', '🐍', '🔥', '💧', '🌿', '⚡',
  '🌟', '👑', '🛡️', '🚀', '🐺', '🐉', '⚔️', '🏆',
];

export function HouseEditorDialog({
  open,
  onOpenChange,
  house,
  onSave,
  onDelete,
  assignedStudentsCount = 0,
}: HouseEditorDialogProps) {
  const { playUi } = useHousesSound();
  const isEditing = Boolean(house);
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [color, setColor] = useState('#2563EB');
  const [emoji, setEmoji] = useState('🛡️');
  const [motto, setMotto] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (house) {
      setName(house.name || '');
      setValue(house.value || '');
      setColor(house.color || '#2563EB');
      setEmoji(house.emoji || '🛡️');
      setMotto(house.motto || '');
    } else {
      setName('');
      setValue('');
      setColor('#2563EB');
      setEmoji('🛡️');
      setMotto('');
    }
  }, [house, open]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || busy) return;
    setBusy(true);
    try {
      await onSave({
        id: house?.id,
        name: trimmedName,
        value: value.trim() || undefined,
        color,
        emoji: emoji.trim() || undefined,
        motto: motto.trim() || undefined,
      });
      playUi(isEditing ? 'success' : 'redeem');
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!house || !onDelete || busy) return;
    setBusy(true);
    try {
      await onDelete(house);
      playUi('trash');
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg border-white/20 bg-slate-950/95 text-white shadow-2xl backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-white flex items-center gap-2">
            {isEditing ? `Edit ${house?.name}` : 'Create New House Team'}
          </DialogTitle>
          <DialogDescription className="text-xs text-white/60">
            {isEditing
              ? 'Update this house team’s name, colors, emblem, and core value.'
              : 'Add a new house team for school competitions and student spirit.'}
          </DialogDescription>
        </DialogHeader>

        {/* Live Preview Card */}
        <div
          className="rounded-2xl border p-4 flex items-center gap-4 transition-colors"
          style={{
            borderColor: `${color}60`,
            backgroundColor: `${color}18`,
          }}
        >
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl shadow-lg border"
            style={{
              borderColor: `${color}80`,
              backgroundColor: `${color}35`,
            }}
          >
            {emoji || '🛡️'}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-black text-lg text-white truncate">{name.trim() || 'House Name'}</h4>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {value.trim() ? (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/90"
                  style={{ backgroundColor: `${color}50` }}
                >
                  {value.trim()}
                </span>
              ) : null}
              {motto.trim() ? (
                <span className="text-xs text-white/70 italic truncate">
                  &ldquo;{motto.trim()}&rdquo;
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-4 py-1">
          {/* House Name */}
          <div className="space-y-1.5">
            <Label htmlFor="house-name" className="text-xs font-bold text-white/80">
              House Name <span className="text-rose-400">*</span>
            </Label>
            <Input
              id="house-name"
              placeholder="e.g. Gryffindor, Phoenix, Firebirds"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white/5 border-white/15 text-white placeholder:text-white/30 h-10 rounded-xl"
            />
          </div>

          {/* Emoji & Emblem Picker */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-white/80">House Emblem (Emoji)</Label>
            <div className="flex items-center gap-2">
              <Input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                maxLength={4}
                className="w-16 text-center text-xl bg-white/5 border-white/15 text-white h-10 rounded-xl"
              />
              <div className="flex flex-wrap gap-1 flex-1">
                {EMOJI_SUGGESTIONS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setEmoji(em)}
                    className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/15 text-base flex items-center justify-center transition-colors"
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Color Picker */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-white/80">House Color</Label>
            <div className="flex items-center gap-2">
              <div
                className="h-9 w-9 rounded-xl border border-white/20 shadow-xs shrink-0"
                style={{ backgroundColor: color }}
              />
              <div className="flex flex-wrap gap-1.5 flex-1">
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => setColor(swatch)}
                    className={`h-7 w-7 rounded-lg transition-transform hover:scale-110 border ${
                      color.toUpperCase() === swatch.toUpperCase()
                        ? 'border-white ring-2 ring-white/50 scale-110'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: swatch }}
                  />
                ))}
                <Input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-7 w-8 p-0 border-0 bg-transparent cursor-pointer rounded-lg"
                  title="Custom hex color"
                />
              </div>
            </div>
          </div>

          {/* Core Value */}
          <div className="space-y-1.5">
            <Label htmlFor="house-value" className="text-xs font-bold text-white/80">
              Core Value (optional)
            </Label>
            <Input
              id="house-value"
              placeholder="e.g. Courage, Wisdom, Kindness, Perseverance"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="bg-white/5 border-white/15 text-white placeholder:text-white/30 h-10 rounded-xl"
            />
          </div>

          {/* Motto */}
          <div className="space-y-1.5">
            <Label htmlFor="house-motto" className="text-xs font-bold text-white/80">
              Motto or Slogan (optional)
            </Label>
            <Input
              id="house-motto"
              placeholder="e.g. Strive for greatness together"
              value={motto}
              onChange={(e) => setMotto(e.target.value)}
              className="bg-white/5 border-white/15 text-white placeholder:text-white/30 h-10 rounded-xl"
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row justify-between gap-2 pt-2">
          {isEditing && onDelete ? (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => void handleDelete()}
              className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl sm:mr-auto"
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete House
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
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
              disabled={!name.trim() || busy}
              onClick={() => void handleSave()}
              className="rounded-xl font-bold px-5"
              style={{
                backgroundColor: color,
                // House color is free-form (swatches or the native color
                // picker), so it can land anywhere from near-black to
                // near-white — fixed white text was unreadable on pale
                // house colors. Pick whichever of black/white contrasts.
                color: pickReadableOn(color),
              }}
            >
              {isEditing ? 'Save Changes' : 'Create House'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
