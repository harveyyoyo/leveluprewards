'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Home,
  Plus,
  RefreshCw,
  Wand2,
  ExternalLink,
  Loader2,
  FlaskConical,
  Sparkles,
  MoreHorizontal,
  LayoutGrid,
  Users,
  Settings,
  Trophy,
  Search,
} from 'lucide-react';
import { HouseSetupWizard } from '@/app/[schoolId]/admin/sections/HouseSetupWizard';
import { ContentSectionTreeNav } from '@/components/ui/content-section-tree-nav';
import { AdminHouseHallOfFamePanel } from '@/app/[schoolId]/admin/sections/AdminHouseHallOfFamePanel';
import {
  housePointsSourceSettingsPatch,
  isHouseStudentPointsRollupEnabled,
  resolveHousePointsSource,
} from '@/lib/houses/housePointsSettings';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { Button } from '@/components/ui/button';
import {
  StaffPortalSectionCard,
  StaffPortalSectionCardContent,
  StaffPortalSectionCardHeader,
  StaffPortalSectionCardTitle,
} from '@/components/staff/StaffPortalSection';
import { Helper } from '@/components/ui/helper';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
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
import {
  HouseStandingsChartBlock,
  normalizeHouseStandingsChartFormat,
} from '@/components/houses/HouseStandingsChartBlock';
import { HouseIdeasPanel } from '@/components/houses/HouseIdeasPanel';
import { AdminHousesStatsStrip } from '@/components/houses/admin/AdminHousesStatsStrip';
import { AdminHousesOverviewGrid } from '@/components/houses/admin/AdminHousesOverviewGrid';
import { AdminHouseRosterCard } from '@/components/houses/admin/AdminHouseRosterCard';
import { buildHouseStandingsRows } from '@/lib/houses/houseStandings';
import type { House, Student, Teacher } from '@/lib/types';
import { useSettings } from '@/components/providers/SettingsProvider';
import {
  seedHouseThemePack,
  syncHousePointsFromStudents,
  assignStudentsToHousesBalanced,
  assignStudentsToHousesRandom,
  listHouses,
} from '@/lib/db';
import { HOUSE_PRESET_THEMES, type HousePresetThemeId } from '@/lib/houses/housePresets';
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
  const [mainSection, setMainSection] = useState<'overview' | 'rosters' | 'setup' | 'hallOfFame'>('overview');
  const [houseSearch, setHouseSearch] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [pointsAdjustHouse, setPointsAdjustHouse] = useState<House | null>(null);
  const [draftCurrentPts, setDraftCurrentPts] = useState('0');
  const [draftLifetimePts, setDraftLifetimePts] = useState('0');

  const housePointsSource = resolveHousePointsSource(settings);
  const studentPointsRollup = isHouseStudentPointsRollupEnabled(settings);

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

  const sortingHref = `/${schoolId}/house-sorting`;

  const standingsRows = useMemo(
    () => buildHouseStandingsRows(sortedHouses, students ?? []),
    [sortedHouses, students],
  );

  const chartFormat = normalizeHouseStandingsChartFormat(settings.houseStandingsChartFormat);

  const assignedStudentCount = useMemo(
    () => (students ?? []).filter((s) => Boolean(s.houseId)).length,
    [students],
  );

  const leaderHouse = standingsRows[0]?.house ?? null;

  const filteredStandingsRows = useMemo(() => {
    const q = houseSearch.trim().toLowerCase();
    if (!q) return standingsRows;
    return standingsRows.filter(
      (r) =>
        r.house.name.toLowerCase().includes(q) ||
        (r.house.value?.toLowerCase().includes(q) ?? false) ||
        (r.house.motto?.toLowerCase().includes(q) ?? false),
    );
  }, [standingsRows, houseSearch]);

  const goToHouseRoster = (houseId: string) => {
    setMainSection('rosters');
    setExpandedHouseIds(new Set([houseId]));
  };

  const openPointsAdjust = (house: House) => {
    setPointsAdjustHouse(house);
    setDraftCurrentPts(String(house.points ?? 0));
    setDraftLifetimePts(String(house.lifetimePoints ?? 0));
  };

  const savePointsAdjust = async () => {
    if (!pointsAdjustHouse) return;
    const points = Math.max(0, parseInt(draftCurrentPts, 10) || 0);
    const lifetimePoints = Math.max(points, parseInt(draftLifetimePts, 10) || 0);
    setBusy('points');
    try {
      await onUpdateHouse({ ...pointsAdjustHouse, points, lifetimePoints });
      toast({ title: 'House points updated', description: `${pointsAdjustHouse.name}: ${points.toLocaleString()} current · ${lifetimePoints.toLocaleString()} lifetime.` });
      setPointsAdjustHouse(null);
    } catch {
      toast({ variant: 'destructive', title: 'Could not update house points' });
    } finally {
      setBusy(null);
    }
  };

  const nudgeHousePoints = async (house: House, deltaCurrent: number, deltaLifetime: number) => {
    setBusy(`nudge-${house.id}`);
    try {
      const points = Math.max(0, (house.points ?? 0) + deltaCurrent);
      const lifetimePoints = Math.max(0, (house.lifetimePoints ?? 0) + deltaLifetime);
      await onUpdateHouse({ ...house, points, lifetimePoints });
    } catch {
      toast({ variant: 'destructive', title: 'Could not adjust points' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <StaffPortalSectionCard className="w-full overflow-hidden">
      <StaffPortalSectionCardHeader className="flex flex-col gap-4 py-6 bg-secondary sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1 min-w-0">
          <Helper content="School houses: standings overview, rosters, settings, and Hall of Fame TV display.">
            <StaffPortalSectionCardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5 text-primary" /> Houses
            </StaffPortalSectionCardTitle>
          </Helper>
          <p className="text-sm text-muted-foreground max-w-xl">
            Track team standings, manage rosters, and configure how house points sync with student rewards.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TabWalkthroughHeaderAction />
          <Button
            variant="default"
            className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0"
            onClick={() => setWizardOpen(true)}
          >
            <Sparkles className="mr-2 h-4 w-4" /> Setup wizard
          </Button>
          <Button className="rounded-xl" onClick={() => openEditor(null)}>
            <Plus className="mr-2 h-4 w-4" /> Add house
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl" aria-label="More house actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem asChild>
                <Link href={sortingHref} target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                  <Wand2 className="mr-2 h-4 w-4" />
                  Sorting ceremony
                  <ExternalLink className="ml-auto h-3.5 w-3.5 opacity-50" />
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem disabled={busy !== null} onClick={() => setSampleDialogOpen(true)}>
                <FlaskConical className="mr-2 h-4 w-4" />
                Populate sample
              </DropdownMenuItem>
              {sortedHouses.length > 0 ? (
                <DropdownMenuItem disabled={busy !== null} onClick={() => void runSyncTotals()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync from students
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setMainSection('setup')}>
                <Settings className="mr-2 h-4 w-4" />
                House settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </StaffPortalSectionCardHeader>

      <StaffPortalSectionCardContent className="space-y-6">
        <ContentSectionTreeNav
          branchLabel="Houses"
          fullWidth
          items={[
            { id: 'overview', label: 'Overview', icon: LayoutGrid },
            { id: 'rosters', label: 'Rosters', icon: Users, badge: sortedHouses.length || undefined },
            { id: 'setup', label: 'Setup', icon: Settings },
            { id: 'hallOfFame', label: 'Hall of Fame', icon: Trophy },
          ]}
          value={mainSection}
          onValueChange={(id) => setMainSection(id as typeof mainSection)}
          className="bg-muted/50 p-1.5 rounded-2xl border"
        />

        {mainSection === 'hallOfFame' ? (
          <AdminHouseHallOfFamePanel schoolId={schoolId} />
        ) : null}

        {mainSection === 'overview' && sortedHouses.length > 0 ? (
          <div className="space-y-6">
            <AdminHousesStatsStrip
              houseCount={sortedHouses.length}
              assignedCount={assignedStudentCount}
              unassignedCount={unassignedStudents.length}
              leader={leaderHouse}
            />
            {sortedHouses.length > 1 ? (
              <HouseStandingsChartBlock
                houses={sortedHouses}
                students={students ?? []}
                format={chartFormat}
                onFormatChange={(format) => updateSettings({ houseStandingsChartFormat: format })}
              />
            ) : null}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Ranked standings
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs"
                  onClick={() => setMainSection('rosters')}
                >
                  Manage all rosters
                </Button>
              </div>
              <AdminHousesOverviewGrid rows={standingsRows} onManageHouse={goToHouseRoster} />
            </div>
          </div>
        ) : null}

        {mainSection === 'overview' && sortedHouses.length === 0 ? (
          <EmptyState
            icon={Home}
            title="No houses yet"
            description="Run the setup wizard for a guided start, or load a sample theme pack."
            action={{
              label: 'Setup wizard',
              onClick: () => setWizardOpen(true),
              icon: Sparkles,
            }}
            secondaryAction={{
              label: 'Populate sample',
              onClick: () => setSampleDialogOpen(true),
              icon: FlaskConical,
            }}
          />
        ) : null}

        {mainSection === 'rosters' ? (
          <div className="space-y-4">
            {unassignedStudents.length > 0 && sortedHouses.length > 0 ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                  {unassignedStudents.length} student{unassignedStudents.length === 1 ? '' : 's'} not assigned to a
                  house
                </p>
                <div className="flex flex-wrap gap-2">
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
              </div>
            ) : null}

            {sortedHouses.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No houses to roster"
                description="Add houses first, then assign students from each team card."
                action={{
                  label: 'Setup wizard',
                  onClick: () => setWizardOpen(true),
                  icon: Sparkles,
                }}
              />
            ) : (
              <>
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search houses…"
                    value={houseSearch}
                    onChange={(e) => setHouseSearch(e.target.value)}
                    className="h-10 rounded-xl pl-9"
                  />
                </div>
                {filteredStandingsRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No houses match your search.</p>
                ) : (
                  <ul className="space-y-4">
                    {filteredStandingsRows.map((row) => {
                      const house = row.house;
                      const houseStudents = (students || []).filter((s) => s.houseId === house.id);
                      const availableStudents = (students || [])
                        .filter((s) => s.houseId !== house.id)
                        .sort(
                          (a, b) =>
                            a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName),
                        );

                      return (
                        <li key={house.id}>
                          <AdminHouseRosterCard
                            row={row}
                            house={house}
                            houseStudents={houseStudents}
                            availableStudents={availableStudents}
                            allHouses={sortedHouses}
                            teachers={teachers ?? []}
                            manualPoints={housePointsSource === 'manual'}
                            busy={busy}
                            isExpanded={expandedHouseIds.has(house.id)}
                            selectedStudentId={studentPickByHouse[house.id] || ''}
                            memberSearch={memberSearch[house.id] ?? ''}
                            onToggleExpand={() => toggleExpand(house.id)}
                            onSelectStudent={(v) =>
                              setStudentPickByHouse((prev) => ({ ...prev, [house.id]: v }))
                            }
                            onMemberSearch={(v) =>
                              setMemberSearch((prev) => ({ ...prev, [house.id]: v }))
                            }
                            onAddStudent={(s) => {
                              void onUpdateStudent({ ...s, houseId: house.id });
                              setStudentPickByHouse((prev) => ({ ...prev, [house.id]: '' }));
                            }}
                            onEdit={() => openEditor(house)}
                            onDelete={() => void handleConfirmedDelete(house, houseStudents)}
                            onOpenPoints={() => openPointsAdjust(house)}
                            onNudgePoints={(dc, dl) => void nudgeHousePoints(house, dc, dl)}
                            onTransfer={(s) => setTransferStudent({ student: s, fromHouseId: house.id })}
                            onRemoveStudent={(s) => void onUpdateStudent({ ...s, houseId: '' })}
                            onToggleHouseParent={(t, isParent) => {
                              const current = t.houseParentHouseIds || [];
                              const next = isParent
                                ? current.filter((id) => id !== house.id)
                                : [...current, house.id];
                              void onUpdateTeacher({ ...t, houseParentHouseIds: next });
                            }}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </div>
        ) : null}

        {mainSection === 'setup' ? (
          <div className="space-y-6">
            <div className="space-y-4 rounded-2xl border bg-muted/20 p-4 md:p-5">
              <p className="text-sm font-bold text-foreground">House settings</p>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Link house totals to student rewards
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {studentPointsRollup
                      ? "On: house scores follow students' LevelUp points. Use Sync from students if totals look wrong."
                      : 'Off: adjust house points manually on each roster card (+/-). Student wallets stay separate.'}
                  </p>
                </div>
                <Switch
                  checked={studentPointsRollup}
                  onCheckedChange={(checked) =>
                    updateSettings(housePointsSourceSettingsPatch(checked ? 'studentRollup' : 'manual'))
                  }
                  aria-label="Link house totals to student rewards"
                />
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-4">
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

            <HouseIdeasPanel
              linkedToStudentRewards={studentPointsRollup}
              hasHouses={sortedHouses.length > 0}
              unassignedCount={unassignedStudents.length}
              sortingHref={sortingHref}
              onSetupWizard={() => setWizardOpen(true)}
              onPopulateSample={() => setSampleDialogOpen(true)}
              onHallOfFame={() => setMainSection('hallOfFame')}
              onSync={sortedHouses.length > 0 ? () => void runSyncTotals() : undefined}
              syncBusy={busy === 'sync'}
            />
          </div>
        ) : null}
      </StaffPortalSectionCardContent>

      <HouseSetupWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        schoolId={schoolId}
        houses={sortedHouses}
        students={students ?? []}
        updateSettings={updateSettings}
      />

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
      <Dialog open={pointsAdjustHouse !== null} onOpenChange={(open) => { if (!open) setPointsAdjustHouse(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>House points</DialogTitle>
          </DialogHeader>
          {pointsAdjustHouse ? (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2">
                <HouseBadge house={pointsAdjustHouse} size="sm" />
                <p className="text-sm font-semibold">{pointsAdjustHouse.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Current points</Label>
                  <Input
                    type="number"
                    min={0}
                    value={draftCurrentPts}
                    onChange={(e) => setDraftCurrentPts(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Lifetime points</Label>
                  <Input
                    type="number"
                    min={0}
                    value={draftLifetimePts}
                    onChange={(e) => setDraftLifetimePts(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                These scores are for house standings only and do not change student LevelUp balances. Lifetime should be
                at least the current total.
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPointsAdjustHouse(null)}>
              Cancel
            </Button>
            <Button onClick={() => void savePointsAdjust()} disabled={busy === 'points'}>
              {busy === 'points' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </StaffPortalSectionCard>
  );
}
