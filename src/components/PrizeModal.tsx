'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { useFirebase } from '@/firebase';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useToast } from '@/hooks/use-toast';
import type { Prize, PrizeAiFunReward, Teacher, Class } from '@/lib/types';
import DynamicIcon from './DynamicIcon';
import { Switch } from './ui/switch';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { uploadPrizeImage, validatePrizeImageFile } from '@/lib/prizeImageUpload';
import { cn } from '@/lib/utils';
import { doc, updateDoc } from 'firebase/firestore';
import { ImagePlus, Loader2 } from 'lucide-react';

interface PrizeModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  prize: Prize | null;
  teachers: Teacher[];
  allClasses: Class[];
  /** When a teacher opens this modal from the teacher portal, set so new prizes record ownership for edit rights. */
  creatorTeacherId?: string;
}

export function PrizeModal({ isOpen, setIsOpen, prize, teachers, allClasses, creatorTeacherId }: PrizeModalProps) {
  const { addPrize, updatePrize, schoolId } = useAppContext();
  const { storage, firestore } = useFirebase();
  const { settings } = useSettings();
  const [name, setName] = useState('');
  const [points, setPoints] = useState('0');
  const [icon, setIcon] = useState('Gift');
  const [inStock, setInStock] = useState(true);
  const [stockCountStr, setStockCountStr] = useState('');
  const [offerPrintTicketOnRedeem, setOfferPrintTicketOnRedeem] = useState(false);
  const [teacherId, setTeacherId] = useState('');
  const [classId, setClassId] = useState('');
  const [aiFunRewardKind, setAiFunRewardKind] = useState<PrizeAiFunReward>('joke');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [stripImage, setStripImage] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const playSound = useArcadeSound();

  const isEditing = !!prize;

  const pendingPreview = useMemo(
    () => (pendingFile ? URL.createObjectURL(pendingFile) : null),
    [pendingFile],
  );

  useEffect(() => {
    return () => {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    };
  }, [pendingPreview]);

  useEffect(() => {
    if (isOpen) {
      if (prize) { // Edit mode
        setName(prize.name);
        setPoints(prize.points.toString());
        setIcon(prize.icon);
        setInStock(prize.inStock);
        setStockCountStr(prize.stockCount === undefined ? '' : String(prize.stockCount));
        setOfferPrintTicketOnRedeem(prize.offerPrintTicketOnRedeem === true);
        const tidFromIds = (prize.teacherIds || []).find((id) => typeof id === 'string' && id.length > 0);
        setTeacherId(prize.teacherId || tidFromIds || '');
        setClassId(prize.classId || '');
        setAiFunRewardKind((prize.aiFunReward as PrizeAiFunReward) || 'joke');
      } else { // Create mode
        setName('');
        setPoints('0');
        setIcon('Gift');
        setInStock(true);
        setStockCountStr('');
        setOfferPrintTicketOnRedeem(false);
        setTeacherId(creatorTeacherId || '');
        setClassId('');
      }
      setPendingFile(null);
      setStripImage(false);
    }
  }, [prize, isOpen, creatorTeacherId]);

  const displayImageSrc =
    pendingPreview || (!stripImage && prize?.imageUrl ? prize.imageUrl : null);

  const handlePickFile = (file: File | undefined) => {
    if (!file) return;
    const err = validatePrizeImageFile(file);
    if (err) {
      playSound('error');
      toast({ variant: 'destructive', title: err });
      return;
    }
    setPendingFile(file);
    setStripImage(false);
  };

  const handleSave = async () => {
    const pointsValue = parseInt(points);
    if (!name || !icon) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Name and Icon are required.' });
      return;
    }
     if (isNaN(pointsValue) || pointsValue < 0) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Points must be zero or greater.' });
      return;
    }

    if (!schoolId || !storage || !firestore) {
      toast({ variant: 'destructive', title: 'Storage is not ready. Try again.' });
      return;
    }

    const rawStock = stockCountStr.trim();
    const stockCount = rawStock === '' ? undefined : Math.max(0, parseInt(rawStock, 10) || 0);

    const coreFields = {
      name,
      points: pointsValue,
      icon,
      inStock,
      stockCount,
      offerPrintTicketOnRedeem,
      teacherId: teacherId || undefined,
      classId: classId || undefined,
      ...(prize?.aiFunReward && prize.aiFunReward !== 'picker' ? { aiFunReward: aiFunRewardKind } : {}),
    };

    setUploading(true);
    try {
      if (isEditing && prize) {
        let imageUrl: string | undefined = prize.imageUrl;
        if (stripImage && !pendingFile) imageUrl = undefined;
        else if (pendingFile) {
          imageUrl = await uploadPrizeImage(storage, schoolId, prize.id, pendingFile);
        }
        const updatedPrize: Prize = {
          ...prize,
          ...coreFields,
          imageUrl,
        };
        await updatePrize(updatedPrize);
        playSound('success');
        toast({ title: 'Reward item updated!' });
      } else {
        const newId = await addPrize({
          ...coreFields,
          ...(creatorTeacherId
            ? { addedBy: 'teacher' as const, createdByTeacherId: creatorTeacherId }
            : { addedBy: 'Admin' as const }),
        });
        if (pendingFile) {
          const imageUrl = await uploadPrizeImage(storage, schoolId, newId, pendingFile);
          await updateDoc(doc(firestore, 'schools', schoolId, 'prizes', newId), { imageUrl });
        }
        playSound('success');
        toast({ title: 'Reward item added!' });
      }
      setIsOpen(false);
    } catch (e) {
      playSound('error');
      const msg = e instanceof Error ? e.message : 'Could not save reward item.';
      toast({ variant: 'destructive', title: msg });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent size="sm" className="flex flex-col p-0 overflow-hidden max-h-[var(--dialog-max-h,min(90vh,calc(100dvh-2rem)))]">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>{isEditing ? 'Edit reward item' : 'New reward item'}</DialogTitle>
          <DialogDescription>
            Enter the reward item details below. For the icon, use any valid name from the Lucide icon library. Optionally add a photo for the shop and admin list.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid gap-4">
            <div className="space-y-1">
              <Label htmlFor="prize-name">Item name</Label>
              <Input id="prize-name" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="prize-points">Point cost</Label>
              <Input id="prize-points" type="number" min={0} value={points} onChange={e => setPoints(e.target.value)} />
            </div>
            {prize?.aiFunReward === 'picker' ? (
              <p className="text-xs text-muted-foreground">
                Students choose joke, riddle, fortune teller, or a random surprise when they redeem this reward.
              </p>
            ) : prize?.aiFunReward ? (
              <div className="space-y-1">
                <Label htmlFor="prize-ai-kind">AI experience type</Label>
                <Select value={aiFunRewardKind} onValueChange={(v) => setAiFunRewardKind(v as PrizeAiFunReward)}>
                  <SelectTrigger id="prize-ai-kind" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="random">Random (joke, riddle, or fortune teller)</SelectItem>
                    <SelectItem value="joke">Short joke</SelectItem>
                    <SelectItem value="riddle">Riddle (with answer)</SelectItem>
                    <SelectItem value="fortune">Fortune teller line</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  After redemption, students see short school-safe text generated for your school (English, age-appropriate).
                </p>
              </div>
            ) : null}
            <div className="space-y-1">
              <Label htmlFor="prize-icon">Icon name</Label>
              <div className="flex items-center gap-2">
                <Input id="prize-icon" value={icon} onChange={e => setIcon(e.target.value)} placeholder="e.g., 'Gift', 'Star', 'Trophy'" />
                <div className="p-2 border rounded-md bg-secondary shrink-0">
                  <DynamicIcon name={icon} className="w-6 h-6 text-primary" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reward picture (optional)</Label>
              <div className="flex flex-wrap items-start gap-3">
                <div
                  className={cn(
                    'relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-muted flex items-center justify-center',
                    displayImageSrc ? '' : 'border-dashed',
                  )}
                >
                  {displayImageSrc ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={displayImageSrc} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImagePlus className="h-8 w-8 text-muted-foreground/50" aria-hidden />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="cursor-pointer text-sm file:mr-2"
                    disabled={uploading}
                    onChange={(e) => {
                      handlePickFile(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                  <p className="text-xs text-muted-foreground">JPEG, PNG, GIF, or WebP up to 2 MB.</p>
                  {displayImageSrc && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 self-start px-2 text-destructive hover:text-destructive"
                      disabled={uploading}
                      onClick={() => {
                        setPendingFile(null);
                        setStripImage(true);
                      }}
                    >
                      Remove picture
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <div className="space-y-1 min-w-0">
                <Label htmlFor="prize-teacher">Teacher restriction</Label>
                <Select value={teacherId || 'all'} onValueChange={(v) => setTeacherId(v === 'all' ? '' : v)}>
                  <SelectTrigger id="prize-teacher" className="h-10 w-full">
                    <SelectValue placeholder="School-wide" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">School-wide</SelectItem>
                    {teachers.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}&apos;s rewards</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 min-w-0">
                <Label htmlFor="prize-class">Class restriction</Label>
                <Select value={classId || 'all'} onValueChange={(v) => setClassId(v === 'all' ? '' : v)}>
                  <SelectTrigger id="prize-class" className="h-10 w-full">
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
            <div className="rounded-lg border p-3 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <Label htmlFor="in-stock">List in shop</Label>
                  <p className="text-xs text-muted-foreground">
                    When off, students will not see this item until you turn it back on.
                  </p>
                </div>
                <Switch
                  id="in-stock"
                  checked={inStock}
                  onCheckedChange={setInStock}
                  className="shrink-0"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prize-stock">How many on hand (optional)</Label>
                <Input
                  id="prize-stock"
                  type="number"
                  min={0}
                  placeholder="Unlimited"
                  value={stockCountStr}
                  onChange={(e) => setStockCountStr(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank for unlimited. When you enter a number, each redemption reduces it until it reaches zero.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <Label htmlFor="print-ticket">Print redeem voucher</Label>
                <p className="text-xs text-muted-foreground">
                  After a student redeems, offer to print a voucher in the rewards shop.
                </p>
              </div>
              <Switch
                id="print-ticket"
                checked={offerPrintTicketOnRedeem}
                onCheckedChange={setOfferPrintTicketOnRedeem}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <Button type="button" variant="secondary" disabled={uploading} onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button type="submit" disabled={uploading} onClick={handleSave} className="gap-2">
            {uploading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden /> : null}
            {uploading ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
