'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Home,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Wand2,
  ExternalLink,
  UserPlus,
  Loader2,
  Pencil,
  FlaskConical,
  Search,
  ArrowRightLeft,
} from 'lucide-react';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Helper } from '@/components/ui/helper';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { AdminRecordListHeader } from '@/components/admin/AdminRecordListHeader';
import { TabWalkthroughHeaderAction } from '@/components/tabWalkthrough/TabWalkthroughContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { HouseBadge } from '@/components/houses/HouseBadge';
import type { House, Student, Teacher } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useSettings } from '@/components/providers/SettingsProvider';
import {
  seedHouseThemePack,
  syncHousePointsFromStudents,
  assignStudentsToHousesBalanced,
  assignStudentsToHousesRandom,
  listHouses,
} from '@/lib/db';
import { HOUSE_PRESET_THEMES, type HousePresetThemeId } from '@/lib/housePresets';
import { useFirestore } from '@/firebase';

export function AdminHousesTab({
  schoolId,
  houses,
  students,
  teachers,
  onAddHouse,
  onUpdateHouse,
  onDeleteHouse,
  onUpdateStudent,
  onUpdateTeacher,
}: {
  schoolId: string;
  houses: House[] | null | undefined;
  students: Student[] | null | undefined;
  teachers: Teacher[] | null | undefined;
  onAddHouse: (data: Omit<House, 'id' | 'points' | 'lifetimePoints'>) => Promise<House>;
  onUpdateHouse: (house: House) => Promise<void>;
  onDeleteHouse: (houseId: string, houseStudents: Student[]) => Promise<void>;
  onUpdateStudent: (student: Student) => Promise<void> | void;
  onUpdateTeacher: (teacher: Teacher) => Promise<void> | void;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const confirm = useConfirm();
  const { settings, updateSettings } = useSettings();
  const [sampleDialogOpen, setSampleDialogOpen] = useState(false);
  const [sampleThemeId, setSampleThemeId] = useState<HousePresetThemeId>('classic');
  const [sampleAssignStudents, setSampleAssignStudents] = useState(true);
  const [sampleSyncTotals, setSampleSyncTotals] = useState(true);
  const [expandedHouseIds, setExpandedHouseIds] = useState<Set<string>>(new Set());
  const [studentPickByHouse, setStudentPickByHouse] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingHouse, setEditingHouse] = useState<House | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftValue, setDraftValue] = useState('');
  const [draftColor, setDraftColor] = useState('#2563EB');
  const [draftEmoji, setDraftEmoji] = useState('');
  const [draftMotto, setDraftMotto] = useState('');
  const [memberSearch, setMemberSearch] = useState<Record<string, string>>({});
  const [transferStudent, setTransferStudent] = useState<{ student: Student; fromHouseId: string } | null>(null);

  const sortedHouses = useMemo(
    () =>
      [...(houses || [])].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name),
      ),
    [houses],
  );

  const unassignedStudents = useMemo(
    () =>
      (students || [])
        .filter((s) => !s.houseId)
        .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)),
    [students],
  );

  const toggleExpand = (houseId: string) => {
    const next = new Set(expandedHouseIds);
    if (next.has(houseId)) next.delete(houseId);
    else next.add(houseId);
    setExpandedHouseIds(next);
  };

  const openEditor = (house: House | null) => {
    setEditingHouse(house);
    setDraftName(house?.name ?? '');
    setDraftValue(house?.value ?? '');
    setDraftColor(house?.color ?? '#2563EB');
    setDraftEmoji(house?.emoji ?? '');
    setDraftMotto(house?.motto ?? '');
    setEditorOpen(true);
  };

  const saveHouse = async () => {
    const name = draftName.trim();
    if (!name) return;
    setBusy('save');
    try {
      if (editingHouse) {
        await onUpdateHouse({
          ...editingHouse,
          name,
          value: draftValue.trim() || undefined,
          color: draftColor,
          emoji: draftEmoji.trim() || undefined,
          motto: draftMotto.trim() || undefined,
        });
      } else {
        await onAddHouse({
          name,
          value: draftValue.trim() || undefined,
          color: draftColor,
          emoji: draftEmoji.trim() || undefined,
          motto: draftMotto.trim() || undefined,
          sortOrder: sortedHouses.length,
        });
      }
      setEditorOpen(false);
    } finally {
      setBusy(null);
    }
  };

  const runPopulateSample = async () => {
    if (!firestore) return;
    setBusy('sample');
    try {
      const seedResult = await seedHouseThemePack(firestore, schoolId, sortedHouses, sampleThemeId);

      let latestHouses = await listHouses(firestore, schoolId);
      let assigned = 0;
      const unassigned = (students || []).filter((s) => !s.houseId);
      if (sampleAssignStudents && latestHouses.length > 0 && unassigned.length > 0) {
        await assignStudentsToHousesBalanced(
          firestore,
          schoolId,
          unassigned.map((s) => s.id),
          latestHouses,
        );
        assigned = unassigned.length;
      }

      if (sampleSyncTotals && latestHouses.length > 0) {
        latestHouses = await listHouses(firestore, schoolId);
        await syncHousePointsFromStudents(
          firestore,
          schoolId,
          latestHouses,
          students || [],
          'both',
        );
      }

      const parts = [
        `${seedResult.created} house${seedResult.created === 1 ? '' : 's'} added`,
        seedResult.skipped ? `${seedResult.skipped} skipped (already exist)` : null,
        assigned > 0 ? `${assigned} student${assigned === 1 ? '' : 's'} assigned` : null,
        sampleSyncTotals && latestHouses.length > 0 ? 'totals synced' : null,
      ].filter(Boolean);

      toast({
        title: 'Sample houses populated',
        description: parts.join(' · ') || 'Nothing new to add.',
      });
      setSampleDialogOpen(false);
    } catch {
      toast({ variant: 'destructive', title: 'Could not populate sample houses' });
    } finally {
      setBusy(null);
    }
  };

  const runSyncTotals = async () => {
    if (!firestore) return;
    setBusy('sync');
    try {
      await syncHousePointsFromStudents(firestore, schoolId, sortedHouses, students || [], 'both');
      toast({ title: 'Totals synced', description: `Updated points for ${sortedHouses.length} house${sortedHouses.length === 1 ? '' : 's'}.` });
    } catch {
      toast({ variant: 'destructive', title: 'Failed to sync totals' });
    } finally {
      setBusy(null);
    }
  };

  const runBulkAssign = async (mode: 'balanced' | 'random') => {
    if (!firestore || unassignedStudents.length === 0 || sortedHouses.length === 0) return;
    const count = unassignedStudents.length;
    setBusy(`assign-${mode}`);
    try {
      const ids = unassignedStudents.map((s) => s.id);
      if (mode === 'balanced') {
        await assignStudentsToHousesBalanced(firestore, schoolId, ids, sortedHouses);
      } else {
        await assignStudentsToHousesRandom(firestore, schoolId, ids, sortedHouses);
      }
      toast({ title: 'Students assigned', description: `${count} student${count === 1 ? '' : 's'} assigned (${mode}).` });
    } catch {
      toast({ variant: 'destructive', title: 'Failed to assign students' });
    } finally {
      setBusy(null);
    }
  };

  const handleConfirmedDelete = async (house: House, houseStudents: Student[]) => {
    const ok = await confirm({
      title: `Delete "${house.name}"?`,
      description: houseStudents.length > 0
        ? `This will remove the house and unassign ${houseStudents.length} student${houseStudents.length === 1 ? '' : 's'}. This cannot be undone.`
        : 'This will permanently remove the house. This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) {
      await onDeleteHouse(house.id, houseStudents);
      toast({ title: 'House deleted', description: `"${house.name}" has been removed.` });
    }
  };

  const handleTransfer = async (student: Student, toHouseId: string) => {
    await onUpdateStudent({ ...student, houseId: toHouseId });
    const toHouse = sortedHouses.find((h) => h.id === toHouseId);
    toast({
      title: 'Student transferred',
      description: `${student.firstName} ${student.lastName} moved to ${toHouse?.name ?? 'new house'}.`,
    });
    setTransferStudent(null);
  };

  const sortingHref = useMemo(() => {
    const params = new URLSearchParams();
    if (unassignedStudents.length > 0) {
      params.set('studentIds', unassignedStudents.map((s) => s.id).join(','));
    }
    params.set('mode', 'reveal');
    return `/${schoolId}/house-sorting?${params.toString()}`;
  }, [schoolId, unassignedStudents]);

  return (
    <Card className="w-full border-t-4 border-primary shadow-md overflow-hidden">
      <CardHeader className="flex flex-col gap-4 py-6 bg-secondary sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Helper content="School houses: rosters, house parents, point rollups, sorting ceremony, and Hall of Fame standings.">
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5 text-primary" /> Houses
            </CardTitle>
          </Helper>
          <CardDescription>
            Build school spirit with named houses, assignments, and competitive totals.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TabWalkthroughHeaderAction />
          <Button variant="outline" className="rounded-xl" asChild>
            <Link href={sortingHref} target="_blank" rel="noopener noreferrer">
              <Wand2 className="mr-2 h-4 w-4" /> Sorting ceremony
              <ExternalLink className="ml-1.5 h-3.5 w-3.5 opacity-60" />
            </Link>
          </Button>
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={busy !== null}
            onClick={() => setSampleDialogOpen(true)}
          >
            {busy === 'sample' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FlaskConical className="mr-2 h-4 w-4" />
            )}
            Populate sample
          </Button>
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={busy !== null || sortedHouses.length === 0}
            onClick={() => void runSyncTotals()}
          >
            {busy === 'sync' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sync totals
          </Button>
          <Button className="rounded-xl" onClick={() => openEditor(null)}>
            <Plus className="mr-2 h-4 w-4" /> Add house
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-4 rounded-2xl border bg-muted/20 p-4 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Roll up points to houses
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                When teachers award points, house totals update automatically.
              </p>
            </div>
            <Switch
              checked={settings.housesRollupPoints !== false}
              onCheckedChange={(v) => updateSettings({ housesRollupPoints: v })}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Show house on student kiosk
              </Label>
              <p className="text-xs text-muted-foreground mt-1">Badge next to the student name after sign-in.</p>
            </div>
            <Switch
              checked={settings.showHouseOnStudentKiosk !== false}
              onCheckedChange={(v) => updateSettings({ showHouseOnStudentKiosk: v })}
            />
          </div>
        </div>

        {/* House comparison dashboard */}
        {sortedHouses.length > 1 ? (() => {
          const maxPts = Math.max(...sortedHouses.map((h) => h.points ?? 0), 1);
          const totalStudents = (students || []).filter((s) => s.houseId).length;
          const memberCounts = new Map(sortedHouses.map((h) => [h.id, (students || []).filter((s) => s.houseId === h.id).length]));
          const avgMembersPerHouse = totalStudents > 0 ? Math.round(totalStudents / sortedHouses.length) : 0;
          const imbalanceThreshold = Math.max(3, Math.round(avgMembersPerHouse * 0.35));
          const ranked = [...sortedHouses].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));

          return (
            <div className="rounded-2xl border bg-muted/20 p-4 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                House standings
              </p>
              <div className="space-y-2">
                {ranked.map((house, i) => {
                  const pts = house.points ?? 0;
                  const pct = maxPts > 0 ? Math.round((pts / maxPts) * 100) : 0;
                  const members = memberCounts.get(house.id) ?? 0;
                  const perCapita = members > 0 ? Math.round(pts / members) : 0;
                  const imbalanced = Math.abs(members - avgMembersPerHouse) >= imbalanceThreshold;
                  return (
                    <div key={house.id} className="flex items-center gap-3">
                      <span className="w-5 shrink-0 text-xs font-black text-muted-foreground tabular-nums text-center">
                        {i + 1}
                      </span>
                      <HouseBadge house={house} size="sm" className="shrink-0 w-28 justify-center" />
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="w-full bg-muted/40 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: house.color }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span className="font-bold tabular-nums">{pts.toLocaleString()} pts</span>
                          <span className={cn('tabular-nums', imbalanced && 'text-amber-600 dark:text-amber-400 font-bold')}>
                            {members} member{members !== 1 ? 's' : ''} · {perCapita} avg
                            {imbalanced ? ' ⚠' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })() : null}

        {unassignedStudents.length > 0 && sortedHouses.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
            <span className="font-semibold text-amber-900 dark:text-amber-100">
              {unassignedStudents.length} student{unassignedStudents.length === 1 ? '' : 's'} not in a house
            </span>
            <Button
              size="sm"
              variant="secondary"
              className="rounded-lg"
              disabled={busy !== null}
              onClick={() => void runBulkAssign('balanced')}
            >
              Assign balanced
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-lg"
              disabled={busy !== null}
              onClick={() => void runBulkAssign('random')}
            >
              Assign random
            </Button>
          </div>
        ) : null}

        {sortedHouses.length === 0 ? (
          <EmptyState
            icon={Home}
            title="No houses yet"
            description="Add houses manually or load a starter theme pack (Quick demo, Classic virtues, or Yeshiva middot)."
            action={{
              label: 'Populate sample',
              onClick: () => setSampleDialogOpen(true),
              icon: FlaskConical,
            }}
          />
        ) : (
          <ul className="space-y-4 pr-1">
            <AdminRecordListHeader
              gridClassName="grid-cols-[minmax(140px,1fr)_100px_100px_90px_44px_44px]"
              columns={[
                { label: 'House' },
                { label: 'Current' },
                { label: 'Lifetime' },
                { label: 'Members' },
                { label: 'Edit', className: 'text-right' },
                { label: 'Delete', className: 'text-right' },
              ]}
            />
            {sortedHouses.map((house) => {
              const houseStudents = (students || []).filter((s) => s.houseId === house.id);
              const availableStudents = (students || [])
                .filter((s) => s.houseId !== house.id)
                .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
              const selectedStudentId = studentPickByHouse[house.id] || '';
              const isExpanded = expandedHouseIds.has(house.id);
              const parents = (teachers || []).filter((t) =>
                (t.houseParentHouseIds || []).includes(house.id),
              );

              return (
                <li
                  key={house.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-primary/20 bg-secondary/45 transition-all hover:border-primary/40"
                >
                  <div className="grid grid-cols-[minmax(140px,1fr)_100px_100px_90px_44px_44px] items-center gap-3 p-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <HouseBadge house={house} size="sm" />
                      {house.value ? (
                        <span className="truncate text-[10px] font-medium text-muted-foreground">{house.value}</span>
                      ) : null}
                    </div>
                    <div className="text-sm font-bold tabular-nums">{house.points ?? 0}</div>
                    <div className="text-sm font-bold tabular-nums text-muted-foreground">
                      {house.lifetimePoints ?? 0}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-full gap-1.5 rounded-lg border-primary/35 bg-background font-semibold"
                      onClick={() => toggleExpand(house.id)}
                    >
                      {houseStudents.length}
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditor(house)}
                      aria-label={`Edit ${house.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => void handleConfirmedDelete(house, houseStudents)}
                      aria-label={`Delete ${house.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {isExpanded ? (
                    <div className="space-y-4 border-t border-primary/15 bg-background/60 px-4 py-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                          House parents
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {(teachers || []).map((t) => {
                            const isParent = (t.houseParentHouseIds || []).includes(house.id);
                            return (
                              <Badge
                                key={t.id}
                                variant={isParent ? 'default' : 'outline'}
                                className={cn('cursor-pointer rounded-full', isParent && 'bg-primary')}
                                onClick={() => {
                                  const current = t.houseParentHouseIds || [];
                                  const next = isParent
                                    ? current.filter((id) => id !== house.id)
                                    : [...current, house.id];
                                  void onUpdateTeacher({ ...t, houseParentHouseIds: next });
                                }}
                              >
                                {t.name}
                              </Badge>
                            );
                          })}
                        </div>
                        {parents.length === 0 ? (
                          <p className="text-xs text-muted-foreground mt-2">Tap teacher names to assign house parents.</p>
                        ) : null}
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <div className="flex-1 space-y-1">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Add student to {house.name}
                          </Label>
                          <Select
                            value={selectedStudentId}
                            onValueChange={(v) => setStudentPickByHouse((prev) => ({ ...prev, [house.id]: v }))}
                          >
                            <SelectTrigger className="h-9 rounded-lg">
                              <SelectValue placeholder="Choose student…" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableStudents.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.lastName}, {s.firstName}
                                  {s.houseId
                                    ? ` (from ${sortedHouses.find((h) => h.id === s.houseId)?.name ?? 'other'})`
                                    : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          className="rounded-xl shrink-0"
                          disabled={!selectedStudentId}
                          onClick={() => {
                            const s = availableStudents.find((x) => x.id === selectedStudentId);
                            if (!s) return;
                            void onUpdateStudent({ ...s, houseId: house.id });
                            setStudentPickByHouse((prev) => ({ ...prev, [house.id]: '' }));
                          }}
                        >
                          <UserPlus className="mr-2 h-4 w-4" /> Add
                        </Button>
                      </div>

                      {houseStudents.length > 5 ? (
                        <div className="relative group">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                          <Input
                            placeholder="Search members…"
                            value={memberSearch[house.id] ?? ''}
                            onChange={(e) => setMemberSearch((prev) => ({ ...prev, [house.id]: e.target.value }))}
                            className="h-8 rounded-lg pl-8 text-xs"
                          />
                        </div>
                      ) : null}
                      <ul className="space-y-1 max-h-48 overflow-y-auto">
                        {(() => {
                          const searchTerm = (memberSearch[house.id] ?? '').trim().toLowerCase();
                          const filtered = searchTerm
                            ? houseStudents.filter((s) => `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm))
                            : houseStudents;
                          return filtered.length > 0 ? filtered.map((s) => (
                            <li
                              key={s.id}
                              className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm"
                            >
                              <span>
                                {s.lastName}, {s.firstName}
                              </span>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-primary"
                                  onClick={() => setTransferStudent({ student: s, fromHouseId: house.id })}
                                  title="Transfer to another house"
                                >
                                  <ArrowRightLeft className="h-3 w-3 mr-1" /> Transfer
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-muted-foreground"
                                  onClick={() => void onUpdateStudent({ ...s, houseId: '' })}
                                >
                                  Remove
                                </Button>
                              </div>
                            </li>
                          )) : (
                            <li className="text-xs text-muted-foreground py-2">
                              {searchTerm ? 'No matching students.' : 'No students in this house yet.'}
                            </li>
                          );
                        })()}
                      </ul>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <AlertDialog open={sampleDialogOpen} onOpenChange={setSampleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Populate sample houses?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Creates preset houses (skips any that already exist). You can optionally assign students and
                  sync house point totals from current student balances.
                </p>
                <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-foreground">Starter theme</p>
                  {HOUSE_PRESET_THEMES.map((theme) => (
                    <label key={theme.id} className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="houseSampleTheme"
                        checked={sampleThemeId === theme.id}
                        onChange={() => setSampleThemeId(theme.id)}
                        className="accent-violet-600 mt-1"
                      />
                      <span>
                        <span className="font-medium text-foreground">{theme.label}</span>
                        <span className="block text-xs text-muted-foreground">
                          {theme.description} ({theme.houses.length} houses)
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <Checkbox
                    checked={sampleAssignStudents}
                    onCheckedChange={(v) => setSampleAssignStudents(v === true)}
                    className="mt-0.5"
                  />
                  <span>Assign all unassigned students to houses (balanced)</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <Checkbox
                    checked={sampleSyncTotals}
                    onCheckedChange={(v) => setSampleSyncTotals(v === true)}
                    className="mt-0.5"
                  />
                  <span>Sync house totals from student point balances</span>
                </label>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy === 'sample'}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy === 'sample'}
              onClick={(e) => {
                e.preventDefault();
                void runPopulateSample();
              }}
            >
              {busy === 'sample' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Populate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingHouse ? 'Edit house' : 'New house'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="Ember" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Core value</Label>
                <Input value={draftValue} onChange={(e) => setDraftValue(e.target.value)} placeholder="Friendship" />
              </div>
              <div className="space-y-1">
                <Label>Color</Label>
                <Input
                  type="color"
                  value={draftColor}
                  onChange={(e) => setDraftColor(e.target.value)}
                  className="h-10 p-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Emoji</Label>
                <Input value={draftEmoji} onChange={(e) => setDraftEmoji(e.target.value)} placeholder="🤝" />
              </div>
              <div className="space-y-1">
                <Label>Motto</Label>
                <Input value={draftMotto} onChange={(e) => setDraftMotto(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveHouse()} disabled={!draftName.trim() || busy === 'save'}>
              {busy === 'save' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer student dialog */}
      <Dialog open={transferStudent !== null} onOpenChange={(open) => { if (!open) setTransferStudent(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Transfer student</DialogTitle>
          </DialogHeader>
          {transferStudent ? (
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                Move <span className="font-semibold text-foreground">{transferStudent.student.firstName} {transferStudent.student.lastName}</span> to:
              </p>
              <div className="space-y-2">
                {sortedHouses
                  .filter((h) => h.id !== transferStudent.fromHouseId)
                  .map((h) => (
                    <Button
                      key={h.id}
                      variant="outline"
                      className="w-full justify-start gap-2 rounded-xl"
                      onClick={() => void handleTransfer(transferStudent.student, h.id)}
                    >
                      <HouseBadge house={h} size="sm" />
                    </Button>
                  ))}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
