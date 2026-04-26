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
}

export function PrizeModal({ isOpen, setIsOpen, prize, teachers, allClasses }: PrizeModalProps) {
  const { addPrize, updatePrize } = useAppContext();
  const [name, setName] = useState('');
  const [points, setPoints] = useState('0');
  const [icon, setIcon] = useState('Gift');
  const [inStock, setInStock] = useState(true);
  const [offerPrintTicketOnRedeem, setOfferPrintTicketOnRedeem] = useState(false);
  const [teacherId, setTeacherId] = useState('');
  const [classId, setClassId] = useState('');
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
        setOfferPrintTicketOnRedeem(prize.offerPrintTicketOnRedeem === true);
        setTeacherId(prize.teacherId || '');
        setClassId(prize.classId || '');
      } else { // Create mode
        setName('');
        setPoints('0');
        setIcon('Gift');
        setInStock(true);
        setOfferPrintTicketOnRedeem(false);
        setTeacherId('');
        setClassId('');
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
      toast({ variant: 'destructive', title: 'Points must be a positive number.' });
      return;
    }

    if (isEditing && prize) {
      const updatedPrize: Prize = { ...prize, name, points: pointsValue, icon, inStock, offerPrintTicketOnRedeem, teacherId: teacherId || undefined, classId: classId || undefined, addedBy: 'Admin' };
      await updatePrize(updatedPrize);
      playSound('success');
      toast({ title: 'Prize updated!' });
    } else {
      const newPrize = { name, points: pointsValue, icon, inStock, offerPrintTicketOnRedeem, teacherId: teacherId || undefined, classId: classId || undefined, addedBy: 'Admin' };
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
              <Select value={teacherId || 'all'} onValueChange={(v) => setTeacherId(v === 'all' ? '' : v)}>
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
          <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
            <div className="space-y-0.5">
              <Label htmlFor="print-ticket">Print redeem ticket</Label>
              <p className="text-xs text-muted-foreground">
                After a student redeems, offer to print a ticket in the Prize Shop.
              </p>
            </div>
            <Switch
              id="print-ticket"
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
