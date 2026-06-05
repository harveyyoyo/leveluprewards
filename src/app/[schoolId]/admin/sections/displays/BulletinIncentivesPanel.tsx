'use client';

import { useMemo, useState } from 'react';
import { collection, doc, addDoc, updateDoc, deleteDoc, query } from 'firebase/firestore';
import {
  CheckCircle2,
  Edit,
  Plus,
  Settings2,
  Sparkles,
  Tag,
  Trash2,
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AdminRecordListHeader } from '@/components/admin/AdminRecordListHeader';
import {
  BULLETIN_EMOJI_SUGGESTIONS,
  PRESET_BULLETIN_INCENTIVES,
  type BulletinBoardIncentiveRecord,
} from '@/lib/bulletinBoard';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type BulletinIncentivesPanelProps = {
  schoolId: string;
};

export function BulletinIncentivesPanel({ schoolId }: BulletinIncentivesPanelProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const incentivesQuery = useMemoFirebase(
    () => (schoolId ? query(collection(firestore, 'schools', schoolId, 'bulletinBoardIncentives')) : null),
    [firestore, schoolId],
  );
  const { data: incentives, isLoading } = useCollection<BulletinBoardIncentiveRecord>(incentivesQuery);

  const sortedIncentives = useMemo(() => {
    if (!incentives?.length) return [];
    return [...incentives].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }, [incentives]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncentive, setEditingIncentive] = useState<BulletinBoardIncentiveRecord | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(50);
  const [icon, setIcon] = useState('🎉');
  const [category, setCategory] = useState('Attendance');
  const [active, setActive] = useState(true);

  const openModal = (incentive?: BulletinBoardIncentiveRecord) => {
    if (incentive) {
      setEditingIncentive(incentive);
      setTitle(incentive.title);
      setDescription(incentive.description);
      setPoints(incentive.points);
      setIcon(incentive.icon || '🎉');
      setCategory(incentive.category || 'Attendance');
      setActive(incentive.active !== false);
    } else {
      setEditingIncentive(null);
      setTitle('');
      setDescription('');
      setPoints(50);
      setIcon('🎉');
      setCategory('Attendance');
      setActive(true);
    }
    setIsModalOpen(true);
  };

  const handleQuickAdd = async (preset: (typeof PRESET_BULLETIN_INCENTIVES)[number]) => {
    if (!schoolId || !firestore) return;
    try {
      await addDoc(collection(firestore, 'schools', schoolId, 'bulletinBoardIncentives'), {
        title: preset.title,
        description: preset.description,
        points: preset.points,
        icon: preset.icon,
        category: preset.category,
        active: true,
        createdAt: Date.now(),
      });
      toast({ title: 'Preset Added!', description: `The incentive "${preset.title}" was added to the board.` });
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Action failed', description: 'Could not add preset incentive.' });
    }
  };

  const handleSaveIncentive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !firestore || !title.trim()) return;

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        points: Number(points),
        icon: icon.trim() || '🎉',
        category: category.trim() || 'Attendance',
        active: active !== false,
        updatedAt: Date.now(),
      };

      if (editingIncentive) {
        await updateDoc(doc(firestore, 'schools', schoolId, 'bulletinBoardIncentives', editingIncentive.id), payload);
        toast({ title: 'Incentive Updated!', description: 'The incentive has been successfully updated.' });
      } else {
        await addDoc(collection(firestore, 'schools', schoolId, 'bulletinBoardIncentives'), {
          ...payload,
          createdAt: Date.now(),
        });
        toast({ title: 'Incentive Added!', description: 'A new incentive has been posted to the bulletin board.' });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Action failed', description: 'Could not save the incentive.' });
    }
  };

  const handleDeleteIncentive = async (id: string) => {
    if (!schoolId || !firestore || !id) return;
    try {
      await deleteDoc(doc(firestore, 'schools', schoolId, 'bulletinBoardIncentives', id));
      toast({ title: 'Incentive Deleted', description: 'The incentive has been removed from the board.' });
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Delete failed', description: 'Could not delete the incentive.' });
    }
  };

  return (
    <>
      <div className="rounded-2xl border bg-muted/10 p-4">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div className="flex min-w-0 items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
            <div>
              <p className="text-sm font-bold">Incentive management</p>
              <p className="text-xs text-muted-foreground">Create or remove options for points-earning incentives.</p>
            </div>
          </div>
          <Button
            type="button"
            className="h-10 shrink-0 gap-1 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all hover:scale-105 active:scale-95"
            onClick={() => openModal()}
          >
            <Plus className="h-4 w-4" /> Add Incentive
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Quick Add Incentives
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PRESET_BULLETIN_INCENTIVES.map((preset, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  className="flex h-auto shrink-0 flex-col items-start gap-1 whitespace-normal rounded-2xl border p-3 text-left transition-all duration-300 hover:bg-slate-50 hover:shadow-md active:scale-95 dark:hover:bg-slate-900"
                  onClick={() => handleQuickAdd(preset)}
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xl" role="img" aria-label={preset.title}>
                        {preset.icon}
                      </span>
                      <span className="text-xs font-black leading-tight">{preset.title}</span>
                    </div>
                    <span className="text-xs font-black tracking-wider text-emerald-600 dark:text-emerald-400">
                      +{preset.points} PTS
                    </span>
                  </div>
                  <span className="line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
                    {preset.description}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <Tag className="h-3.5 w-3.5 text-indigo-500" /> Posted Incentives
              <span className="ml-1 rounded-full border bg-background px-2 py-0.5 text-[10px] font-black">
                {sortedIncentives.length}
              </span>
            </h3>
            <div className="rounded-2xl border bg-slate-50/40 dark:bg-slate-900/40">
              {isLoading ? (
                <p className="animate-pulse p-8 text-center text-sm text-muted-foreground">Loading posted incentives...</p>
              ) : sortedIncentives.length > 0 ? (
                <ul className="space-y-1 p-2">
                  <AdminRecordListHeader
                    gridClassName="grid-cols-[76px_minmax(180px,1fr)_44px]"
                    columns={[
                      { label: 'Edit' },
                      { label: 'Incentive Name, Category, Points & Status' },
                      { label: 'Delete', className: 'text-right' },
                    ]}
                  />
                  {sortedIncentives.map((inc) => (
                    <li
                      key={inc.id}
                      className={cn(
                        'grid grid-cols-[76px_minmax(180px,1fr)_44px] items-center gap-3 rounded-xl border px-3 py-2 transition-colors',
                        inc.active === false
                          ? 'bg-muted/30 opacity-75'
                          : 'bg-white hover:border-primary/20 hover:shadow-sm dark:bg-slate-950',
                      )}
                    >
                      <div className="flex items-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 rounded-lg border-primary/20 bg-background font-semibold text-primary hover:bg-primary/5"
                          onClick={() => openModal(inc)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                      </div>
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="shrink-0 text-xl" role="img" aria-label="incentive icon">
                          {inc.icon || '🎉'}
                        </span>
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-bold">{inc.title}</span>
                          <span className="truncate rounded-lg border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {inc.category}
                          </span>
                          <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                            +{inc.points} PTS
                          </span>
                          <span
                            className={cn(
                              'rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest',
                              inc.active
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
                            )}
                          >
                            {inc.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-rose-600 dark:text-rose-400"
                          onClick={() => handleDeleteIncentive(inc.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="p-12 text-center text-sm text-muted-foreground">
                  No custom incentives created yet. Add presets or create custom options above.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="rounded-3xl p-6 sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
              {editingIncentive ? <Settings2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              {editingIncentive ? 'Edit Board Incentive' : 'Add New Incentive'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure the points value and details of the bulletin board incentive.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSaveIncentive}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="incTitle" className="text-xs font-bold">
                  Incentive Title
                </Label>
                <Input
                  id="incTitle"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Clean Classroom"
                  className="h-10 rounded-xl"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="incPoints" className="text-xs font-bold">
                  Points to Earn
                </Label>
                <Input
                  id="incPoints"
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value))}
                  placeholder="e.g., 50"
                  className="h-10 rounded-xl"
                  min={1}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="incDesc" className="text-xs font-bold">
                Detailed Description
              </Label>
              <Input
                id="incDesc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="How to earn these points..."
                className="h-10 rounded-xl"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="incCategory" className="text-xs font-bold">
                  Category
                </Label>
                <Input
                  id="incCategory"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., Attendance, Service"
                  className="h-10 rounded-xl"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="incIcon" className="text-xs font-bold">
                  Emoji / Icon
                </Label>
                <Input
                  id="incIcon"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="e.g., 📅, 🧹"
                  className="h-10 rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Quick icon picks</Label>
              <div className="flex max-h-[88px] flex-wrap gap-1 overflow-y-auto rounded-xl border bg-muted/20 p-2">
                {BULLETIN_EMOJI_SUGGESTIONS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    className={cn(
                      'size-9 rounded-lg border bg-background/80 text-lg leading-none transition-colors hover:border-primary/30 hover:bg-primary/10',
                      icon === em && 'border-primary ring-2 ring-primary',
                    )}
                    onClick={() => setIcon(em)}
                    aria-label={`Use ${em} as icon`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border bg-slate-50 p-3 dark:bg-slate-900/40">
              <div className="space-y-0.5">
                <p className="text-xs font-bold">Active / Visible on Board</p>
                <p className="text-[10px] leading-tight text-muted-foreground">
                  Allows students to view this incentive immediately.
                </p>
              </div>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 shrink-0 rounded-xl px-4 text-xs font-bold uppercase tracking-widest"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 shrink-0 rounded-xl px-5 text-xs font-black uppercase tracking-widest shadow-lg"
              >
                {editingIncentive ? 'Save Updates' : 'Post to Board'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
