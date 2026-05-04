'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import {
  Megaphone,
  Plus,
  Edit,
  Trash2,
  Sparkles,
  CheckCircle2,
  Image as ImageIcon,
  Tag,
  Star,
  Palette,
  Eye,
  Settings2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Helper } from '@/components/ui/helper';
import { useToast } from '@/hooks/use-toast';

export interface BulletinBoardIncentive {
  id: string;
  title: string;
  description: string;
  points: number;
  icon: string;
  category: string;
  active: boolean;
}

const PRESET_INCENTIVES = [
  {
    title: 'Perfect Attendance',
    description: 'No absences or tardies this month.',
    points: 100,
    icon: '📅',
    category: 'Attendance',
  },
  {
    title: 'Homework Hero',
    description: 'Submit all homework assignments fully complete.',
    points: 50,
    icon: '📚',
    category: 'Homework',
  },
  {
    title: 'Good Citizen',
    description: 'Help a peer in need or show outstanding kindness.',
    points: 120,
    icon: '🤝',
    category: 'Classroom',
  },
  {
    title: 'Participation Star',
    description: 'Actively participate and ask questions in class.',
    points: 40,
    icon: '🙋',
    category: 'Engagement',
  },
  {
    title: 'Hallway Helper',
    description: 'Help clean up the hallway or maintain the school grounds.',
    points: 80,
    icon: '🧹',
    category: 'Service',
  },
  {
    title: 'Math Whiz',
    description: 'Complete extra credit problems or show growth in math.',
    points: 75,
    icon: '🔢',
    category: 'Academics',
  },
];

const PRESET_THEMES = [
  {
    id: 'default',
    name: 'Classic Neutral',
    className: 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100',
  },
  {
    id: 'neon_gold',
    name: 'Neon Gold',
    className: 'bg-gradient-to-br from-amber-500/10 via-amber-600/10 to-transparent border-amber-500/40 text-amber-900 dark:text-amber-100',
  },
  {
    id: 'hyper_gradient',
    name: 'Hyper Gradient',
    className: 'bg-gradient-to-tr from-indigo-500/15 via-purple-500/15 to-pink-500/15 border-purple-500/40 text-indigo-900 dark:text-indigo-100',
  },
  {
    id: 'electric',
    name: 'Electric Azure',
    className: 'bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-transparent border-cyan-400/40 text-cyan-900 dark:text-cyan-100',
  },
  {
    id: 'glassmorphic',
    name: 'Glassmorphic Ultra',
    className: 'bg-white/40 dark:bg-slate-950/40 backdrop-blur-md border-white/20 dark:border-white/10 text-slate-800 dark:text-slate-200',
  },
];

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
  const { data: incentives, isLoading } = useCollection<BulletinBoardIncentive>(incentivesQuery);

  // States for Modals and creation/editing
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncentive, setEditingIncentive] = useState<BulletinBoardIncentive | null>(null);

  // New/Editing incentive fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(50);
  const [icon, setIcon] = useState('🎉');
  const [category, setCategory] = useState('Attendance');
  const [active, setActive] = useState(true);

  // Bulletin Board customizations
  const bulletinEnabled = settings.bulletinEnabled ?? true;
  const bulletinTitle = settings.bulletinTitle || 'School Bulletin Board';
  const bulletinTheme = settings.bulletinTheme || 'default';

  // Toggle create/edit modal
  const openModal = (incentive?: BulletinBoardIncentive) => {
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
  const handleQuickAdd = async (preset: typeof PRESET_INCENTIVES[0]) => {
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

  const currentTheme = PRESET_THEMES.find((t) => t.id === bulletinTheme) || PRESET_THEMES[0];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Left Pane: Config & List */}
      <div className="xl:col-span-2 space-y-6">
        <Card className="border-t-4 border-primary shadow-lg backdrop-blur-md">
          <CardHeader>
            <Helper content="Manage options and incentives on the Bulletin Board. Enable the feature, change visual settings, and create custom incentives to earn points.">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-indigo-500" />
                  Bulletin Board Settings & Design
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">Enable Feature</span>
                  <Switch
                    checked={bulletinEnabled}
                    onCheckedChange={(checked) => updateSettings({ bulletinEnabled: checked })}
                  />
                </div>
              </CardTitle>
            </Helper>
            <CardDescription>
              Configure the overall visual layout and title of the school-wide bulletin board.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bulletinTitle">Bulletin Board Title</Label>
                <Input
                  id="bulletinTitle"
                  value={bulletinTitle}
                  onChange={(e) => updateSettings({ bulletinTitle: e.target.value })}
                  placeholder="e.g., Monthly Challenges"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bulletinTheme">Board Theme / Visual Styling</Label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {PRESET_THEMES.map((theme) => (
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
            </div>
          </CardContent>
        </Card>

        {/* Incentives List & Quick Add */}
        <Card className="border-t-4 border-primary shadow-lg backdrop-blur-sm">
          <CardHeader className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Incentive Management
              </CardTitle>
              <CardDescription>Create or remove options for points-earning incentives.</CardDescription>
            </div>
            <Button
              type="button"
              className="font-black h-10 gap-1 rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 uppercase tracking-widest text-xs"
              onClick={() => openModal()}
            >
              <Plus className="w-4 h-4" /> Add Incentive
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quick Add Presets Section */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Quick Add Incentives
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {PRESET_INCENTIVES.map((p, idx) => (
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

            {/* Existing Incentives Listing */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-500" /> Posted Incentives
              </h3>
              <ScrollArea className="h-[400px] border rounded-2xl bg-slate-50/40 dark:bg-slate-900/40">
                {isLoading ? (
                  <p className="text-center text-sm text-muted-foreground p-8 animate-pulse">
                    Loading posted incentives...
                  </p>
                ) : incentives && incentives.length > 0 ? (
                  <ul className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {incentives.map((inc) => (
                      <li
                        key={inc.id}
                        className="p-4 bg-white dark:bg-slate-950 rounded-2xl border flex flex-col justify-between hover:shadow-md hover:border-primary/40 transition-all duration-300"
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl" role="img" aria-label="incentive icon">
                                {inc.icon || '🎉'}
                              </span>
                              <div>
                                <h4 className="font-bold text-sm leading-tight">{inc.title}</h4>
                                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                                  {inc.category}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-full shrink-0">
                              +{inc.points} PTS
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {inc.description}
                          </p>
                        </div>
                        <div className="flex justify-between items-center border-t mt-4 pt-3">
                          <span
                            className={`text-[10px] px-2 py-0.5 font-bold uppercase tracking-widest rounded-full ${
                              inc.active
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                            }`}
                          >
                            {inc.active ? 'Active' : 'Inactive'}
                          </span>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="w-8 h-8 p-0 rounded-full text-blue-600 dark:text-blue-400"
                              onClick={() => openModal(inc)}
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="w-8 h-8 p-0 rounded-full text-rose-600 dark:text-rose-400"
                              onClick={() => handleDeleteIncentive(inc.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-center text-sm text-muted-foreground p-12">
                    No custom incentives created yet. Add presets or create custom options above.
                  </p>
                )}
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Pane: Premium Theme Interactive Preview */}
      <div className="space-y-4">
        <Card className="border-t-4 border-emerald-500 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-500" /> Interactive Live Preview
            </CardTitle>
            <CardDescription>
              This is how students will view the bulletin board on their portal/kiosk.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bulletinEnabled ? (
              <div
                className={`p-5 rounded-3xl border-2 shadow-xl relative min-h-[450px] flex flex-col justify-between transition-all duration-500 select-none ${currentTheme.className}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-3 border-b border-black/10 dark:border-white/10 pb-4 mb-4">
                    <div className="flex items-center gap-2">
                      {schoolLogoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={schoolLogoUrl}
                          alt="School Logo"
                          className="w-10 h-10 object-contain rounded-xl bg-white/30 backdrop-blur-md p-1 shadow-md shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 backdrop-blur-md border border-white/20 flex items-center justify-center font-black text-indigo-700 dark:text-indigo-300 shadow-md shrink-0">
                          🏫
                        </div>
                      )}
                      <div>
                        <h4 className="font-black text-base md:text-lg tracking-wide leading-tight">
                          {bulletinTitle}
                        </h4>
                        <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                          Complete items to claim points!
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {incentives && incentives.filter((i) => i.active).length > 0 ? (
                      incentives
                        .filter((i) => i.active)
                        .slice(0, 3)
                        .map((inc) => (
                          <div
                            key={inc.id}
                            className="p-3 bg-white/40 dark:bg-black/20 backdrop-blur-md rounded-2xl border border-white/20 dark:border-white/10 flex items-center justify-between gap-2 shadow-sm transition-all duration-300 hover:scale-[1.02]"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-2xl" role="img" aria-label="incentive">
                                {inc.icon || '🎯'}
                              </span>
                              <div>
                                <h5 className="font-bold text-xs md:text-sm leading-tight">{inc.title}</h5>
                                <p className="text-[10px] opacity-70 leading-relaxed mt-0.5">{inc.description}</p>
                              </div>
                            </div>
                            <span className="text-xs font-black bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 px-2.5 py-1 rounded-full shrink-0 border border-emerald-500/30">
                              +{inc.points} PTS
                            </span>
                          </div>
                        ))
                    ) : (
                      <div className="text-center py-10 opacity-70 flex flex-col items-center justify-center gap-2">
                        <ImageIcon className="w-8 h-8 opacity-40 animate-pulse" />
                        <span className="text-xs font-bold">No active incentives to preview</span>
                      </div>
                    )}
                    {incentives && incentives.filter((i) => i.active).length > 3 && (
                      <p className="text-[10px] text-center font-bold opacity-60 uppercase tracking-widest pt-2">
                        + {incentives.filter((i) => i.active).length - 3} more items
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[10px] opacity-70">
                  <span className="font-black tracking-widest uppercase">Premium Display</span>
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    Wowed Design
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 opacity-60 border-2 border-dashed rounded-3xl p-6">
                <Megaphone className="w-10 h-10 text-muted-foreground animate-pulse" />
                <div>
                  <p className="font-black text-sm uppercase tracking-wider">Bulletin Board Disabled</p>
                  <p className="text-xs text-muted-foreground">Turn on the feature to see the preview.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
    </div>
  );
}
