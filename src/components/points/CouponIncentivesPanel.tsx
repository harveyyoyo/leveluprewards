'use client';

import { useMemo, useState } from 'react';
import { collection, doc, query, updateDoc, where } from 'firebase/firestore';
import {
  CheckCircle2,
  GraduationCap,
  Home,
  LayoutGrid,
  Megaphone,
  Monitor,
  Plus,
  Sparkles,
  Tag,
  Trash2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { Settings } from '@/components/providers/SettingsProvider';
import { addCoupons, deleteCoupon } from '@/lib/db/coupons';
import type { Coupon } from '@/lib/types';
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
import { ContentSectionTreeNav } from '@/components/ui/content-section-tree-nav';
import { AdminRecordListHeader } from '@/components/admin/AdminRecordListHeader';
import {
  adminRecordListGridClassName,
  adminRecordListGridCompactGapClassName,
  adminRecordListGridNameCellClassName,
  adminRecordListGridStyle,
} from '@/components/admin/adminRecordListGrid';
import { BULLETIN_EMOJI_SUGGESTIONS, PRESET_BULLETIN_INCENTIVES } from '@/lib/bulletinBoard';
import {
  INCENTIVE_SURFACE_KEYS,
  INCENTIVE_SURFACE_META,
  incentiveAssignedToSurface,
  incentivesVisibleOnSurface,
  settingsKeyForIncentiveSurface,
  type IncentiveSurfaceKey,
} from '@/lib/incentives/incentiveSurfaces';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

/** Icon, name, category, points, delete — fits the incentives panel without horizontal scroll. */
const INCENTIVES_LIST_GRID_COLS =
  '2.25rem minmax(0, 1fr) minmax(5.5rem, 0.55fr) minmax(4.25rem, 0.4fr) 2.5rem';

const SURFACE_ICONS: Record<IncentiveSurfaceKey, typeof Megaphone> = {
  bulletinBoard: Megaphone,
  smartScreen: Monitor,
  studentKiosk: GraduationCap,
  studentPortal: Home,
};

type CouponIncentivesPanelProps = {
  schoolId: string;
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
};

type IncentivesSection = 'manage' | 'surfaces';

export function CouponIncentivesPanel({ schoolId, settings, updateSettings }: CouponIncentivesPanelProps) {
  const [section, setSection] = useState<IncentivesSection>('manage');
  const { toast } = useToast();
  const firestore = useFirestore();

  const incentivesQuery = useMemoFirebase(
    () =>
      schoolId
        ? query(collection(firestore, 'schools', schoolId, 'coupons'), where('kind', '==', 'incentive'))
        : null,
    [firestore, schoolId],
  );
  const { data: incentives, isLoading } = useCollection<Coupon>(incentivesQuery);

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

  const createIncentive = async (fields: {
    title: string;
    description: string;
    points: number;
    icon: string;
    category: string;
  }) => {
    const newRef = doc(collection(firestore, 'schools', schoolId, 'coupons'));
    const incentiveCoupon: Coupon = {
      id: newRef.id,
      kind: 'incentive',
      code: '',
      title: fields.title,
      description: fields.description,
      value: Number(fields.points) || 0,
      icon: fields.icon.trim() || '🎉',
      category: fields.category.trim() || 'Incentive',
      displaySurfaces: {},
      teacher: '',
      used: false,
      createdAt: Date.now(),
    };
    await addCoupons(firestore, schoolId, [incentiveCoupon]);
  };

  const handleQuickAdd = async (preset: (typeof PRESET_BULLETIN_INCENTIVES)[number]) => {
    if (!schoolId || !firestore) return;
    try {
      await createIncentive({
        title: preset.title,
        description: preset.description,
        points: preset.points,
        icon: preset.icon,
        category: preset.category,
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
      await createIncentive({ title: title.trim(), description: description.trim(), points, icon, category });
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
      await deleteCoupon(firestore, schoolId, id);
      toast({ title: 'Incentive deleted', description: 'Removed from your catalog and all displays.' });
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Delete failed', description: 'Could not delete the incentive.' });
    }
  };

  const handleSurfaceAssignment = async (
    incentive: Coupon,
    surface: IncentiveSurfaceKey,
    next: boolean,
  ) => {
    if (!schoolId || !firestore || !incentive.id) return;
    try {
      const currentSurfaces = { ...(incentive.displaySurfaces ?? {}) };
      if (next) {
        currentSurfaces[surface] = true;
      } else {
        delete currentSurfaces[surface];
      }
      await updateDoc(doc(firestore, 'schools', schoolId, 'coupons', incentive.id), {
        displaySurfaces: currentSurfaces,
      });
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: 'Could not change where this incentive appears.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <ContentSectionTreeNav
        branchLabel="Incentives"
        fullWidth
        items={[
          { id: 'manage', label: 'Manage', icon: Tag },
          { id: 'surfaces', label: 'Where to show', icon: Monitor },
        ]}
        value={section}
        onValueChange={(id) => setSection(id as IncentivesSection)}
        aria-label="Incentives sections"
      />

      {section === 'manage' ? (
        <div className="space-y-4">
          <div className="rounded-2xl border bg-muted/10 p-4">
            <div className="mb-2 flex min-w-0 items-start gap-2">
              <LayoutGrid className="mt-0.5 h-4 w-4 shrink-0 text-ring" aria-hidden />
              <div>
                <p className="text-sm font-bold">Point-earning opportunities</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create and delete your school&apos;s incentive catalog here. Use{' '}
                  <span className="font-semibold text-foreground/90">Where to show</span> to add or
                  remove incentives from the bulletin board, Smart Screen, kiosk, or student portal.
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                className="h-10 shrink-0 gap-1 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all hover:scale-105 active:scale-95"
                onClick={openCreateModal}
              >
                <Plus className="h-4 w-4" /> Create Incentive
              </Button>
            </div>
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
                          +{Number(inc.value) || 0}
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
        </div>
      ) : null}

      {section === 'surfaces' ? (
        <motion.div
          className="space-y-4"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.06 } },
          }}
        >
          <div className="rounded-2xl border bg-muted/10 p-4">
            <p className="text-sm font-bold">Where students see incentives</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Turn each surface on or off, then add or remove individual incentives from that surface.
              Create incentives on the Manage tab first.
            </p>
          </div>

          {INCENTIVE_SURFACE_KEYS.map((surface) => {
            const Icon = SURFACE_ICONS[surface];
            const meta = INCENTIVE_SURFACE_META[surface];
            const settingsKey = settingsKeyForIncentiveSurface(surface);
            const surfaceEnabled = incentivesVisibleOnSurface(settings, surface);
            const assignedCount = sortedIncentives.filter((item) =>
              incentiveAssignedToSurface(item, surface),
            ).length;

            return (
              <motion.div
                key={surface}
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 420, damping: 32 } },
                }}
                className="overflow-hidden rounded-2xl border bg-background"
              >
                <div className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={cn(
                        'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-muted/30',
                        surfaceEnabled ? 'text-primary' : 'text-muted-foreground',
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold">{meta.label}</p>
                      <p className="text-xs text-muted-foreground">{meta.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={surfaceEnabled}
                    onCheckedChange={(next) => updateSettings({ [settingsKey]: next })}
                    aria-label={`Show incentives on ${meta.label}`}
                  />
                </div>

                <div
                  className={cn(
                    'border-t px-4 py-3',
                    !surfaceEnabled && 'pointer-events-none opacity-50',
                  )}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      Assigned incentives
                    </p>
                    <span className="rounded-full border bg-muted/30 px-2 py-0.5 text-[10px] font-black">
                      {assignedCount}
                    </span>
                  </div>

                  {isLoading ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">Loading incentives...</p>
                  ) : sortedIncentives.length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      No incentives yet. Create them on the Manage tab.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {sortedIncentives.map((incentive) => {
                        const assigned = incentiveAssignedToSurface(incentive, surface);
                        return (
                          <li
                            key={`${surface}-${incentive.id}`}
                            className="flex items-center justify-between gap-3 rounded-xl border bg-muted/10 px-3 py-2"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="shrink-0 text-lg" role="img" aria-hidden>
                                {incentive.icon || '🎯'}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold">{incentive.title}</p>
                                <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                  +{Number(incentive.value) || 0} pts
                                </p>
                              </div>
                            </div>
                            <Switch
                              checked={assigned}
                              onCheckedChange={(next) => void handleSurfaceAssignment(incentive, surface, next)}
                              aria-label={`${assigned ? 'Remove' : 'Add'} ${incentive.title} on ${meta.label}`}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      ) : null}
    </div>
  );
}

export function couponIncentivesEnabled(settings: Pick<Settings, 'enableIncentives'>): boolean {
  return settings.enableIncentives !== false;
}
