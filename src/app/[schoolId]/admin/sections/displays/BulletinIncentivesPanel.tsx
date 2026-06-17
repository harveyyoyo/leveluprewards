'use client';

import { useMemo, useState } from 'react';
import { collection, doc, addDoc, deleteDoc, query } from 'firebase/firestore';
import {
  CheckCircle2,
  Plus,
  Sparkles,
  Tag,
  Trash2,
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  adminRecordListGridClassName,
  adminRecordListGridCompactGapClassName,
  adminRecordListGridNameCellClassName,
  adminRecordListGridStyle,
} from '@/components/admin/adminRecordListGrid';
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

/** Icon, name, category, points, delete — fits the incentives panel without horizontal scroll. */
const INCENTIVES_LIST_GRID_COLS =
  '2.25rem minmax(0, 1fr) minmax(5.5rem, 0.55fr) minmax(4.25rem, 0.4fr) 2.5rem';

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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(50);
  const [icon, setIcon] = useState('🎉');
  const [category, setCategory] = useState('Attendance');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPoints(50);
    setIcon('🎉');
    setCategory('Attendance');
  };

  const openCreateModal = () => {
    resetForm();
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
        surfaces: {},
        createdAt: Date.now(),
      });
      toast({
        title: 'Incentive created',
        description: `"${preset.title}" was added to your catalog. Assign it under Where to show.`,
      });
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Action failed', description: 'Could not add preset incentive.' });
    }
  };

  const handleCreateIncentive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !firestore || !title.trim()) return;

    try {
      await addDoc(collection(firestore, 'schools', schoolId, 'bulletinBoardIncentives'), {
        title: title.trim(),
        description: description.trim(),
        points: Number(points),
        icon: icon.trim() || '🎉',
        category: category.trim() || 'Attendance',
        surfaces: {},
        createdAt: Date.now(),
      });
      toast({
        title: 'Incentive created',
        description: 'Add it to displays under Where to show.',
      });
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
      toast({ title: 'Incentive deleted', description: 'Removed from your catalog and all displays.' });
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
              <p className="text-sm font-bold">Incentive catalog</p>
              <p className="text-xs text-muted-foreground">
                Create or delete incentives here. Assign them to displays under Where to show.
              </p>
            </div>
          </div>
          <Button
            type="button"
            className="h-10 shrink-0 gap-1 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all hover:scale-105 active:scale-95"
            onClick={openCreateModal}
          >
            <Plus className="h-4 w-4" /> Create Incentive
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Quick add templates
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
              <Tag className="h-3.5 w-3.5 text-indigo-500" /> Your incentives
              <span className="ml-1 rounded-full border bg-background px-2 py-0.5 text-[10px] font-black">
                {sortedIncentives.length}
              </span>
            </h3>
            <div className="rounded-2xl border bg-slate-50/40 dark:bg-slate-900/40">
              {isLoading ? (
                <p className="animate-pulse p-8 text-center text-sm text-muted-foreground">Loading incentives...</p>
              ) : sortedIncentives.length > 0 ? (
                <ul className="space-y-1 p-2">
                  <AdminRecordListHeader
                    gridColumns={INCENTIVES_LIST_GRID_COLS}
                    columns={[
                      { label: '', id: 'icon' },
                      { label: 'Name' },
                      { label: 'Category' },
                      { label: 'Points', className: 'text-center' },
                      { label: 'Delete', className: 'text-right' },
                    ]}
                  />
                  {sortedIncentives.map((inc) => (
                    <li
                      key={inc.id}
                      className={cn(
                        'items-center rounded-xl border px-3 py-2 transition-colors',
                        'bg-white hover:border-primary/20 hover:shadow-sm dark:bg-slate-950',
                        adminRecordListGridCompactGapClassName,
                        adminRecordListGridClassName,
                      )}
                      style={adminRecordListGridStyle(INCENTIVES_LIST_GRID_COLS)}
                    >
                      <span className="text-xl leading-none" role="img" aria-label="incentive icon">
                        {inc.icon || '🎉'}
                      </span>
                      <span
                        className={cn(
                          adminRecordListGridNameCellClassName,
                          'truncate text-sm font-bold',
                        )}
                        title={inc.title}
                      >
                        {inc.title}
                      </span>
                      <span
                        className="truncate text-xs font-medium text-muted-foreground"
                        title={inc.category}
                      >
                        {inc.category || '—'}
                      </span>
                      <span className="text-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        +{Number(inc.points) || 0}
                      </span>
                      <div className="flex items-center justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-rose-600 dark:text-rose-400"
                          onClick={() => handleDeleteIncentive(inc.id)}
                          aria-label={`Delete ${inc.title}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="p-12 text-center text-sm text-muted-foreground">
                  No incentives yet. Create one above or use a quick-add template.
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
              <Plus className="h-5 w-5" />
              Create incentive
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add a new opportunity to your catalog. Assign it to displays afterward under Where to show.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateIncentive}>
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
                Create incentive
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
