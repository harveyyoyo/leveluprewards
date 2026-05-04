'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Badge, Category } from '@/lib/types';
import DynamicIcon from './DynamicIcon';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { Switch } from '@/components/ui/switch';

const PERIOD_LABELS: Record<Badge['period'], string> = {
  month: 'This month',
  semester: 'This semester (Jan–Jun / Jul–Dec)',
  year: 'This school year',
  all_time: 'All time',
};

export interface BadgeModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  badge: Badge | null;
  categories: Category[];
  onSave: (data: Omit<Badge, 'id'> | Badge) => Promise<void>;
}

export function BadgeModal({ isOpen, setIsOpen, badge, categories, onSave }: BadgeModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Award');
  const [categoryId, setCategoryId] = useState('');
  const [pointsRequired, setPointsRequired] = useState('50');
  const [period, setPeriod] = useState<Badge['period']>('month');
  const [tier, setTier] = useState<Badge['tier'] | ''>('');
  const [accentColor, setAccentColor] = useState('');
  const [enabled, setEnabled] = useState(true);
  const { toast } = useToast();
  const playSound = useArcadeSound();
  const isEditing = !!badge;

  useEffect(() => {
    if (isOpen) {
      if (badge) {
        setName(badge.name);
        setDescription(badge.description);
        setIcon(badge.icon);
        setCategoryId(badge.categoryId);
        setPointsRequired(String(badge.pointsRequired));
        setPeriod(badge.period);
        setTier(badge.tier || '');
        setAccentColor(badge.accentColor || '');
        setEnabled(badge.enabled !== false);
      } else {
        setName('');
        setDescription('');
        setIcon('Award');
        setCategoryId(categories?.[0]?.id ?? '');
        setPointsRequired('50');
        setPeriod('month');
        setTier('');
        setAccentColor('');
        setEnabled(true);
      }
    }
  }, [isOpen, badge, categories]);

  const handleSave = async () => {
    const points = parseInt(pointsRequired, 10);
    if (!name.trim() || !description.trim() || !icon.trim()) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Name, description, and icon are required.' });
      return;
    }
    if (!categoryId) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Category required', description: 'Choose a category for this badge.' });
      return;
    }
    if (isNaN(points) || points < 1) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Invalid points', description: 'Points required must be at least 1.' });
      return;
    }
    try {
      const base = {
        name: name.trim(),
        description: description.trim(),
        icon,
        categoryId,
        pointsRequired: points,
        period,
        tier: tier || undefined,
        accentColor: accentColor.trim() || undefined,
        enabled,
      };
      if (isEditing && badge) {
        await onSave({ ...base, id: badge.id });
      } else {
        await onSave(base);
      }
      playSound('success');
      toast({ title: 'Badge saved' });
      setIsOpen(false);
    } catch (e: any) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Save failed', description: e?.message ?? 'Could not save badge.' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent size="sm" className="flex flex-col p-0 overflow-hidden max-h-[var(--dialog-max-h,min(90vh,calc(100dvh-2rem)))]">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>{isEditing ? 'Edit badge' : 'New badge'}</DialogTitle>
          <DialogDescription>
            Award this badge when a student reaches the required points in the chosen category within the time period.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="badge-name">Name</Label>
              <Input id="badge-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Good Behavior Badge" />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="badge-enabled">Enabled</Label>
                <p className="text-xs text-muted-foreground">When off, this badge is not awarded (existing earners stay).</p>
              </div>
              <Switch id="badge-enabled" checked={enabled} onCheckedChange={setEnabled} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="badge-desc">Description</Label>
              <Input id="badge-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Earn 50 Good Behavior points this month" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="badge-points">Points required</Label>
                <Input id="badge-points" type="number" min={1} value={pointsRequired} onChange={(e) => setPointsRequired(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Time period</Label>
              <Select value={period} onValueChange={(v: Badge['period']) => setPeriod(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PERIOD_LABELS) as Badge['period'][]).map((p) => (
                    <SelectItem key={p} value={p}>{PERIOD_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icon</Label>
                <div className="flex gap-2 items-center">
                  <Input value={icon} onChange={(e) => setIcon(e.target.value)} />
                  <div className="w-10 h-10 rounded-lg border bg-muted flex items-center justify-center shrink-0">
                    <DynamicIcon name={icon} className="w-5 h-5" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tier</Label>
                <Select value={tier || 'none'} onValueChange={(v) => setTier(v === 'none' ? '' : (v as Badge['tier']))}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="bronze">Bronze</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="platinum">Platinum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="badge-accent">Accent color (optional)</Label>
              <div className="flex gap-2 items-center">
                <input
                  id="badge-accent"
                  type="color"
                  value={accentColor && /^#[0-9A-Fa-f]{6}$/.test(accentColor) ? accentColor : '#0ea5e9'}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} placeholder="#0ea5e9" className="font-mono text-sm" />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save badge</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
