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
import type { Prize, Teacher, Class, PrizeAiFunReward } from '@/lib/types';
import DynamicIcon from './DynamicIcon';
import { Switch } from './ui/switch';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { uploadPrizeImage, validatePrizeImageFile } from '@/lib/prize-image-upload';
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
  const prizeAiOn = settings.enablePrizeAiSurprise === true;
  const [name, setName] = useState('');
  const [points, setPoints] = useState('0');
  const [icon, setIcon] = useState('Gift');
  const [inStock, setInStock] = useState(true);
  const [offerPrintTicketOnRedeem, setOfferPrintTicketOnRedeem] = useState(false);
  const [aiFun, setAiFun] = useState<'off' | PrizeAiFunReward>('off');
  const [teacherId, setTeacherId] = useState('');
  const [classId, setClassId] = useState('');
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
        setOfferPrintTicketOnRedeem(prize.offerPrintTicketOnRedeem === true);
        setAiFun(prize.aiFunReward ?? 'off');
        const tidFromIds = (prize.teacherIds || []).find((id) => typeof id === 'string' && id.length > 0);
        setTeacherId(prize.teacherId || tidFromIds || '');
        setClassId(prize.classId || '');
      } else { // Create mode
        setName('');
        setPoints('0');
        setIcon('Gift');
        setInStock(true);
        setOfferPrintTicketOnRedeem(false);
        setAiFun('off');
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
      toast({ variant: 'destructive', title: 'Points must be a positive number.' });
      return;
    }

    if (!schoolId || !storage || !firestore) {
      toast({ variant: 'destructive', title: 'Storage is not ready. Try again.' });
      return;
    }

    const coreFields = {
      name,
      points: pointsValue,
      icon,
      inStock,
      offerPrintTicketOnRedeem,
      aiFunReward: prizeAiOn && aiFun !== 'off' ? aiFun : undefined,
      teacherId: teacherId || undefined,
      classId: classId || undefined,
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
        toast({ title: 'Prize updated!' });
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
        toast({ title: 'Prize added!' });
      }
      setIsOpen(false);
    } catch (e) {
      playSound('error');
      const msg = e instanceof Error ? e.message : 'Could not save prize.';
      toast({ variant: 'destructive', title: msg });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Prize' : 'New Prize'}</DialogTitle>
           <DialogDescription>
            Enter the prize details below. For the icon, use any valid name from the Lucide icon library. Optionally add a photo for the shop and admin list.
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
          <div className="space-y-2">
            <Label>Prize picture (optional)</Label>
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
          {prizeAiOn ? (
          <div className="flex flex-col gap-2 rounded-lg border p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ai-fun">AI surprise after redeem</Label>
              <p className="text-xs text-muted-foreground">
                Optional joke, riddle, or fortune on the Prize Shop kiosk.
              </p>
            </div>
            <Select value={aiFun} onValueChange={(v) => setAiFun(v as 'off' | PrizeAiFunReward)}>
              <SelectTrigger id="ai-fun" className="w-full sm:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Off</SelectItem>
                <SelectItem value="random">Random</SelectItem>
                <SelectItem value="joke">Joke</SelectItem>
                <SelectItem value="riddle">Riddle</SelectItem>
                <SelectItem value="fortune">Fortune cookie</SelectItem>
              </SelectContent>
            </Select>
          </div>
          ) : null}
        </div>
        <DialogFooter>
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
