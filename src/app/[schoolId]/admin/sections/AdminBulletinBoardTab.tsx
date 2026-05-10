'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, query } from 'firebase/firestore';
import {
  Megaphone,
  Plus,
  Edit,
  Trash2,
  Sparkles,
  CheckCircle2,
  Tag,
  Palette,
  ArrowUpRight,
  Settings2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Helper } from '@/components/ui/helper';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  BULLETIN_EMOJI_SUGGESTIONS,
  DEFAULT_BULLETIN_SUBTITLE,
  PRESET_BULLETIN_INCENTIVES,
  PRESET_BULLETIN_THEMES,
  type BulletinBoardIncentiveRecord,
} from '@/lib/bulletinBoard';
import { cn } from '@/lib/utils';
import { AdminRecordListHeader } from '@/components/admin/AdminRecordListHeader';
import { LiveScreenPreview } from '@/components/admin/LiveScreenPreview';

export function AdminBulletinBoardTab({
  schoolId,
  schoolLogoUrl,
  settings,
  updateSettings,
}: {
  schoolId: string;
  schoolLogoUrl: string | null;
  settings: any;
  updateSettings: (updates: any) => void;
}) {
  const { toast } = useToast();
  const firestore = useFirestore();

  // Load incentives from school Firestore subcollection
  const incentivesQuery = useMemoFirebase(
    () => (schoolId ? query(collection(firestore, 'schools', schoolId, 'bulletinBoardIncentives')) : null),
    [firestore, schoolId]
  );
  const { data: incentives, isLoading } = useCollection<BulletinBoardIncentiveRecord>(incentivesQuery);

  const sortedIncentives = useMemo(() => {
    if (!incentives?.length) return [];
    return [...incentives].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }, [incentives]);

  // States for Modals and creation/editing
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncentive, setEditingIncentive] = useState<BulletinBoardIncentiveRecord | null>(null);

  // New/Editing incentive fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(50);
  const [icon, setIcon] = useState('🎉');
  const [category, setCategory] = useState('Attendance');
  const [active, setActive] = useState(true);

  // Bulletin Board customizations (default on when unset — same as staff board + Features tab)
  const bulletinEnabled = settings.bulletinEnabled !== false;
  const bulletinTitle = settings.bulletinTitle || 'School Bulletin Board';
  const bulletinTheme = settings.bulletinTheme || 'default';
  const bulletinLogoSize = settings.bulletinLogoSize || 'md';
  const bulletinShowWowBadge = settings.bulletinShowWowBadge !== false;
  const bulletinColumns = settings.bulletinColumns || '2';

  // Toggle create/edit modal
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

  // Quick Add Preset Incentive
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

  // Save incentive (Add / Update)
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

  // Delete incentive
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

  const fullHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set('fullscreen', '1');
    return `/${schoolId}/bulletin-board?${params.toString()}`;
  }, [schoolId]);

  return (
    <>
      <Card className="w-full border-t-4 border-primary shadow-md overflow-hidden">
        <CardHeader className="py-6 flex flex-row items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" /> Bulletin Board
            </CardTitle>
            <CardDescription>
              Configure the board here, then open the full-screen display (opens in a new tab). Staff-facing board;
              not shown on the student kiosk.
            </CardDescription>
          </div>
          <Button asChild variant="outline" className="rounded-xl gap-2 shrink-0">
            <Link href={fullHref} target="_blank" rel="noopener noreferrer">
              View full page <ArrowUpRight className="w-4 h-4" aria-hidden />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            <div className="w-full rounded-2xl border bg-muted/10 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Settings2 className="w-4 h-4 text-muted-foreground" aria-hidden />
                <Helper content="Manage options and incentives on the Bulletin Board. Enable the feature, change visual settings, and create custom incentives to earn points.">
                  <p className="text-sm font-bold">Display settings</p>
                </Helper>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 flex flex-col gap-3 rounded-xl border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-bold">Enable bulletin board</p>
                    <p className="text-[11px] text-muted-foreground">Show the board on the staff display and in preview.</p>
                  </div>
                  <div
                    className="flex shrink-0 items-center gap-1 rounded-xl border bg-muted/40 p-1"
                    role="group"
                    aria-label="Bulletin board on or off"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'h-9 min-w-[72px] rounded-lg px-4 text-xs font-black uppercase tracking-wide',
                        bulletinEnabled
                          ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                      onClick={() => updateSettings({ bulletinEnabled: true })}
                    >
                      On
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'h-9 min-w-[72px] rounded-lg px-4 text-xs font-black uppercase tracking-wide',
                        !bulletinEnabled
                          ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                      onClick={() => updateSettings({ bulletinEnabled: false })}
                    >
                      Off
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground" htmlFor="bulletinTitle">
                    Bulletin board title
                  </Label>
                  <Input
                    id="bulletinTitle"
                    value={bulletinTitle}
                    onChange={(e) => updateSettings({ bulletinTitle: e.target.value })}
                    placeholder="e.g., Monthly Challenges"
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground" htmlFor="bulletinTheme">
                    Board theme
                  </Label>
                  <div className="flex flex-wrap gap-2 pt-1 max-h-[140px] overflow-y-auto pr-1">
                    {PRESET_BULLETIN_THEMES.map((theme) => (
                      <Button
                        key={theme.id}
                        type="button"
                        variant={bulletinTheme === theme.id ? 'default' : 'outline'}
                        className="text-xs h-8 px-3 rounded-full font-bold transition-all uppercase tracking-wide flex items-center gap-1 shrink-0"
                        onClick={() => updateSettings({ bulletinTheme: theme.id })}
                      >
                        <Palette className="w-3 h-3" />
                        {theme.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground" htmlFor="bulletinSubtitle">
                    Tagline (under the title)
                  </Label>
                  <Textarea
                    id="bulletinSubtitle"
                    value={settings.bulletinSubtitle ?? ''}
                    onChange={(e) => updateSettings({ bulletinSubtitle: e.target.value })}
                    placeholder={DEFAULT_BULLETIN_SUBTITLE}
                    rows={2}
                    className="rounded-xl resize-y min-h-[72px] text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Shown on the Board page and this preview. Leave blank to use the default sentence.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">School logo size</Label>
                  <div className="flex flex-wrap gap-2">
                    {(['sm', 'md', 'lg'] as const).map((sz) => (
                      <Button
                        key={sz}
                        type="button"
                        size="sm"
                        variant={bulletinLogoSize === sz ? 'default' : 'outline'}
                        className="rounded-xl capitalize font-bold text-xs"
                        onClick={() => updateSettings({ bulletinLogoSize: sz })}
                      >
                        {sz === 'sm' ? 'Small' : sz === 'md' ? 'Medium' : 'Large'}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Incentive grid</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={bulletinColumns === '2' ? 'default' : 'outline'}
                      className="rounded-xl font-bold text-xs"
                      onClick={() => updateSettings({ bulletinColumns: '2' })}
                    >
                      Two columns (wide screens)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={bulletinColumns === '1' ? 'default' : 'outline'}
                      className="rounded-xl font-bold text-xs"
                      onClick={() => updateSettings({ bulletinColumns: '1' })}
                    >
                      Single column
                    </Button>
                  </div>
                </div>

                <div className="md:col-span-2 flex items-center justify-between rounded-xl border bg-background px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold">“Wowed Design” flair in preview</p>
                    <p className="text-[11px] text-muted-foreground">
                      Decorative footer in this admin preview only (not on the live Board page).
                    </p>
                  </div>
                  <Switch
                    checked={bulletinShowWowBadge}
                    onCheckedChange={(checked) => updateSettings({ bulletinShowWowBadge: checked })}
                  />
                </div>

                <div className="md:col-span-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground pt-1">
                  <span className="font-semibold text-foreground/80">Active incentives:</span>
                  <span className="rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-xs font-black">
                    {(sortedIncentives || []).filter((i) => i.active !== false).length}
                  </span>
                  <span className="text-xs">Total incentives: {(sortedIncentives || []).length}</span>
                </div>
              </div>
            </div>

            <div className="w-full rounded-2xl border bg-muted/10 p-4">
              {bulletinEnabled ? (
                <LiveScreenPreview
                  href={fullHref}
                  title="Live preview (matches big screen)"
                  viewport="fullscreen"
                  className="max-w-none"
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 opacity-60 border-2 border-dashed rounded-3xl p-6">
                  <Megaphone className="w-10 h-10 text-muted-foreground animate-pulse" />
                  <div>
                    <p className="font-black text-sm uppercase tracking-wider">Bulletin Board Disabled</p>
                    <p className="text-xs text-muted-foreground">Turn on the feature to see the preview.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="w-full rounded-2xl border bg-muted/10 p-4">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                <div className="flex items-start gap-2 min-w-0">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" aria-hidden />
                  <div>
                    <p className="text-sm font-bold">Incentive management</p>
                    <p className="text-xs text-muted-foreground">Create or remove options for points-earning incentives.</p>
                  </div>
                </div>
                <Button
                  type="button"
                  className="font-black h-10 gap-1 rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 uppercase tracking-widest text-xs shrink-0"
                  onClick={() => openModal()}
                >
                  <Plus className="w-4 h-4" /> Add Incentive
                </Button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Quick Add Incentives
                  </h3>
                  <div className="pr-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {PRESET_BULLETIN_INCENTIVES.map((p, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          className="p-3 h-auto flex flex-col items-start gap-1 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900 border text-left whitespace-normal hover:shadow-md transition-all duration-300 active:scale-95 shrink-0"
                          onClick={() => handleQuickAdd(p)}
                        >
                          <div className="flex justify-between items-center w-full">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xl" role="img" aria-label={p.title}>
                                {p.icon}
                              </span>
                              <span className="font-black text-xs leading-tight">{p.title}</span>
                            </div>
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 tracking-wider">
                              +{p.points} PTS
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {p.description}
                          </span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-500" /> Posted Incentives
                  </h3>
                  <div className="border rounded-2xl bg-slate-50/40 dark:bg-slate-900/40">
                    {isLoading ? (
                      <p className="text-center text-sm text-muted-foreground p-8 animate-pulse">
                        Loading posted incentives...
                      </p>
                    ) : sortedIncentives.length > 0 ? (
                      <ul className="p-2 space-y-1">
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
                                : 'bg-white dark:bg-slate-950 hover:border-primary/20 hover:shadow-sm'
                            )}
                          >
                            <div className="flex items-center">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 rounded-lg border-primary/20 bg-background hover:bg-primary/5 text-primary font-semibold"
                                onClick={() => openModal(inc)}
                              >
                                <Edit className="h-3.5 w-3.5" />
                                Edit
                              </Button>
                            </div>
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="text-xl shrink-0" role="img" aria-label="incentive icon">
                                {inc.icon || '🎉'}
                              </span>
                              <div className="flex flex-wrap items-center gap-2 min-w-0">
                                <span className="font-bold text-sm truncate">{inc.title}</span>
                                <span className="text-[11px] font-medium text-muted-foreground truncate border px-2 py-0.5 rounded-lg bg-background">
                                  {inc.category}
                                </span>
                                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-lg">
                                  +{inc.points} PTS
                                </span>
                                <span
                                  className={`text-[10px] px-2 py-0.5 font-bold uppercase tracking-widest rounded-lg ${
                                    inc.active
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                  }`}
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
                                className="h-8 w-8 text-rose-600 dark:text-rose-400 rounded-lg"
                                onClick={() => handleDeleteIncentive(inc.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-center text-sm text-muted-foreground p-12">
                        No custom incentives created yet. Add presets or create custom options above.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Creation / Editing Incentive Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
              {editingIncentive ? <Settings2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
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
                  className="rounded-xl h-10"
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
                  className="rounded-xl h-10"
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
                className="rounded-xl h-10"
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
                  className="rounded-xl h-10"
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
                  className="rounded-xl h-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Quick icon picks</Label>
              <div className="flex flex-wrap gap-1 max-h-[88px] overflow-y-auto rounded-xl border bg-muted/20 p-2">
                {BULLETIN_EMOJI_SUGGESTIONS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    className={cn(
                      'text-lg leading-none size-9 rounded-lg border bg-background/80 hover:bg-primary/10 hover:border-primary/30 transition-colors',
                      icon === em && 'ring-2 ring-primary border-primary',
                    )}
                    onClick={() => setIcon(em)}
                    aria-label={`Use ${em} as icon`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border rounded-2xl p-3 bg-slate-50 dark:bg-slate-900/40">
              <div className="space-y-0.5">
                <p className="text-xs font-bold">Active / Visible on Board</p>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Allows students to view this incentive immediately.
                </p>
              </div>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl h-10 px-4 text-xs font-bold uppercase tracking-widest shrink-0"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-xl h-10 px-5 text-xs font-black uppercase tracking-widest shadow-lg shrink-0"
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
