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
import { useAppContext } from '@/components/AppProvider';
import { useToast } from '@/hooks/use-toast';
import type { Prize, Teacher, Class } from '@/lib/types';
import { prizeRestrictionTeacherIds } from '@/lib/prize-utils';
import DynamicIcon from './DynamicIcon';
import { Switch } from './ui/switch';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface PrizeModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  prize: Prize | null;
  teachers: Teacher[];
  allClasses: Class[];
  /** Teacher dashboard: new prizes are tagged as teacher-created. */
  prizeSource?: 'admin' | 'teacher';
  actingTeacherId?: string;
}

export function PrizeModal({
  isOpen,
  setIsOpen,
  prize,
  teachers,
  allClasses,
  prizeSource = 'admin',
  actingTeacherId,
}: PrizeModalProps) {
  const { addPrize, updatePrize } = useAppContext();
  const [name, setName] = useState('');
  const [points, setPoints] = useState('0');
  const [icon, setIcon] = useState('Gift');
  const [inStock, setInStock] = useState(true);
  const [stockCountInput, setStockCountInput] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [classId, setClassId] = useState('');
  const [offerPrintTicketOnRedeem, setOfferPrintTicketOnRedeem] = useState(false);
  const { toast } = useToast();
  const playSound = useArcadeSound();

  const isEditing = !!prize;

  useEffect(() => {
    if (isOpen) {
      if (prize) { // Edit mode
        setName(prize.name);
        setPoints(prize.points.toString());
        setIcon(prize.icon);
        setInStock(prize.inStock);
        setStockCountInput(prize.stockCount === undefined ? '' : String(prize.stockCount));
        const tid = prizeRestrictionTeacherIds(prize);
        setTeacherId(tid.length === 1 ? tid[0] : '');
        setClassId(prize.classId || '');
        setOfferPrintTicketOnRedeem(prize.offerPrintTicketOnRedeem === true);
      } else { // Create mode
        setName('');
        setPoints('0');
        setIcon('Gift');
        setInStock(true);
        setStockCountInput('');
        setTeacherId('');
        setClassId('');
        setOfferPrintTicketOnRedeem(false);
      }
    }
  }, [prize, isOpen]);

  const handleSave = async () => {
    const pointsValue = parseInt(points);
    if (!name || !icon) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Name and Icon are required.' });
      return;
    }
     if (isNaN(pointsValue) || pointsValue < 0) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Point cost must be zero or a positive number.' });
      return;
    }

    const rawStock = stockCountInput.trim();
    const stockCount = rawStock === '' ? undefined : Math.max(0, parseInt(rawStock, 10) || 0);

    if (isEditing && prize) {
      const existingTeacherIds = prizeRestrictionTeacherIds(prize);
      const teacherPayload: Pick<Prize, 'teacherIds' | 'teacherId'> =
        existingTeacherIds.length > 1
          ? { teacherIds: existingTeacherIds, teacherId: undefined }
          : {
              teacherIds: teacherId ? [teacherId] : undefined,
              teacherId: undefined,
            };
      const updatedPrize: Prize = {
        ...prize,
        name,
        points: pointsValue,
        icon,
        inStock,
        stockCount,
        offerPrintTicketOnRedeem,
        ...teacherPayload,
        classId: classId || undefined,
        addedBy: 'Admin',
      };
      await updatePrize(updatedPrize);
      playSound('success');
      toast({ title: 'Prize updated!' });
    } else {
      const newPrize = {
        name,
        points: pointsValue,
        icon,
        inStock,
        stockCount,
        offerPrintTicketOnRedeem,
        teacherIds: teacherId ? [teacherId] : undefined,
        teacherId: undefined,
        classId: classId || undefined,
        addedBy: prizeSource === 'teacher' ? 'teacher' : 'Admin',
        createdByTeacherId:
          prizeSource === 'teacher' && actingTeacherId ? actingTeacherId : undefined,
      };
      await addPrize(newPrize);
      playSound('success');
      toast({ title: 'Prize added!' });
    }
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Prize' : 'New Prize'}</DialogTitle>
           <DialogDescription>
            Enter the prize details below. For the icon, use any valid name from the Lucide icon library.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-1">
            <Label htmlFor="prize-name">Prize Name</Label>
            <Input id="prize-name" value={name} onChange={e => setName(e.target.value)} />
          </div>
           <div className="space-y-1">
            <Label htmlFor="prize-points">Point Cost</Label>
            <Input id="prize-points" type="number" value={points} onChange={e => setPoints(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="prize-icon">Icon Name</Label>
            <div className="flex items-center gap-2">
              <Input id="prize-icon" value={icon} onChange={e => setIcon(e.target.value)} placeholder="e.g., 'Gift', 'Star', 'Trophy'" />
              <div className="p-2 border rounded-md bg-secondary">
                <DynamicIcon name={icon} className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="prize-teacher">Teacher Restriction</Label>
              {isEditing && prize && prizeRestrictionTeacherIds(prize).length > 1 ? (
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Multiple teachers are selected. Change them from Admin → Prize Shop (inline list).
                </p>
              ) : null}
              <Select value={teacherId || 'all'} onValueChange={(v) => setTeacherId(v === 'all' ? '' : v)} disabled={!!(isEditing && prize && prizeRestrictionTeacherIds(prize).length > 1)}>
                <SelectTrigger id="prize-teacher">
                  <SelectValue placeholder="School-wide" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">School-wide</SelectItem>
                  {teachers.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}'s Prizes</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="prize-class">Class Restriction</Label>
              <Select value={classId || 'all'} onValueChange={(v) => setClassId(v === 'all' ? '' : v)}>
                <SelectTrigger id="prize-class">
                  <SelectValue placeholder="School-wide" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">School-wide</SelectItem>
                  {allClasses.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
            <div className="space-y-0.5">
              <Label htmlFor="in-stock">In Stock</Label>
              <p className="text-xs text-muted-foreground">
                Is this prize currently available for redemption?
              </p>
            </div>
            <Switch
              id="in-stock"
              checked={inStock}
              onCheckedChange={setInStock}
            />
          </div>
          {inStock && (
            <div className="space-y-1">
              <Label htmlFor="prize-stock-qty">Quantity on hand (optional)</Label>
              <Input
                id="prize-stock-qty"
                type="number"
                min={0}
                placeholder="Unlimited if empty"
                value={stockCountInput}
                onChange={(e) => setStockCountInput(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">When set, each redemption reduces this count until it reaches zero.</p>
            </div>
          )}
          <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
            <div className="space-y-0.5">
              <Label htmlFor="offer-print-ticket">Print ticket after redeem</Label>
              <p className="text-xs text-muted-foreground">
                Offer to print a redeem ticket when a student redeems this prize.
              </p>
            </div>
            <Switch
              id="offer-print-ticket"
              checked={offerPrintTicketOnRedeem}
              onCheckedChange={setOfferPrintTicketOnRedeem}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button type="submit" onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
