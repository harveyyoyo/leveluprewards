'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { collection } from 'firebase/firestore';
import { motion } from 'framer-motion';
import {
  Castle,
  ExternalLink,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { useToast } from '@/hooks/use-toast';
import { useHousesSound } from '@/hooks/useHousesSound';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useSchoolMetadataDocRef } from '@/hooks/useSchoolMetadataDocRef';
import { HousesBackdrop } from './HousesBackdrop';
import { HousesHeaderBar, type HousesHeaderTab } from './HousesHeaderBar';
import { HousesTeamCenterStage } from './HousesTeamCenterStage';
import { HousesInteractiveGuide } from './HousesInteractiveGuide';
import { HouseQuickAwardDialog } from './HouseQuickAwardDialog';
import { HouseEditorDialog } from './HouseEditorDialog';
import { HouseSetupWizardDialog } from './HouseSetupWizardDialog';
import { HousesSettingsDialog } from './HousesSettingsDialog';
import { AdminHousesManage } from '@/app/[schoolId]/admin/sections/AdminHousesManage';
import { AdminHouseHallOfFamePanel } from '@/app/[schoolId]/admin/sections/AdminHouseHallOfFamePanel';
import { HouseSortingCeremony } from './HouseSortingCeremony';
import { Button } from '@/components/ui/button';
import { housesRealmHref } from '@/lib/housesRealmUrl';
import { housesRealmThemeVars, resolveHousesRealmTheme, type HousesRealmThemeId } from '@/lib/houses/housesRealmThemes';
import {
  seedHouseThemePack,
  syncHousePointsFromStudents,
  assignStudentsToHousesBalanced,
  assignStudentsToHousesRandom,
  listHouses,
} from '@/lib/db';
import type { HousePresetThemeId } from '@/lib/houses/housePresets';
import type { House, Student, Teacher } from '@/lib/types';

const TAB_IDS: HousesHeaderTab[] = ['teams', 'rosters', 'ceremony', 'hall-of-fame', 'settings'];
const spring = { type: 'spring' as const, stiffness: 280, damping: 28 };

export interface HousesWorkspaceProps {
  schoolId?: string;
  initialTab?: HousesHeaderTab;
}

export function HousesWorkspace({
  schoolId: propSchoolId,
  initialTab = 'teams',
}: HousesWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { schoolId: contextSchoolId, loginState, addHouse, updateHouse, deleteHouse, updateStudent, updateTeacher } = useAppContext();
  const schoolId = propSchoolId || contextSchoolId || '';
  const firestore = useFirestore();
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();
  const confirm = useConfirm();
  const { playUi } = useHousesSound();

  const isStaff =
    loginState === 'admin' ||
    loginState === 'developer' ||
    loginState === 'teacher' ||
    loginState === 'houseCoordinator';

  // Active theme variables injection
  const currentTheme = resolveHousesRealmTheme(settings.housesRealmTheme);
  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute('data-houses-realm', '');
    el.setAttribute('data-hr-tone', currentTheme.tone);
    const vars = housesRealmThemeVars(currentTheme);
    for (const [key, value] of Object.entries(vars)) {
      el.style.setProperty(key, value);
    }
    return () => {
      el.removeAttribute('data-houses-realm');
      el.removeAttribute('data-hr-tone');
      for (const key of Object.keys(vars)) {
        el.style.removeProperty(key);
      }
    };
  }, [currentTheme]);

  // School metadata for name
  const schoolDocRef = useSchoolMetadataDocRef();
  const { data: schoolData } = useDoc<{ name?: string }>(schoolDocRef);
  const schoolName = schoolData?.name?.trim() || schoolId || 'School';

  // Firestore Subscriptions
  const housesQuery = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'houses') : null),
    [firestore, schoolId],
  );
  const studentsQuery = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'students') : null),
    [firestore, schoolId],
  );
  // Teachers are staff-only in Firestore rules. School passcode sessions must not
  // subscribe here — that surfaces a permission-denied banner.
  const teachersQuery = useMemoFirebase(
    () =>
      firestore && schoolId && isStaff
        ? collection(firestore, 'schools', schoolId, 'teachers')
        : null,
    [firestore, schoolId, isStaff],
  );

  const { data: rawHouses } = useCollection<House>(housesQuery);
  const { data: rawStudents } = useCollection<Student>(studentsQuery);
  const { data: rawTeachers } = useCollection<Teacher>(teachersQuery);

  const houses = useMemo(
    () =>
      [...(rawHouses || [])].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name),
      ),
    [rawHouses],
  );
  const students = useMemo(() => rawStudents || [], [rawStudents]);
  const teachers = useMemo(() => rawTeachers || [], [rawTeachers]);

  // Dialog States
  const [quickAwardHouse, setQuickAwardHouse] = useState<House | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingHouse, setEditingHouse] = useState<House | null>(null);
  const [setupWizardOpen, setSetupWizardOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(() => initialTab === 'settings');
  const [guideOpen, setGuideOpen] = useState(false);

  // Full-screen section tabs — URL (?tool=) is the source of truth; pendingTab is optimistic UI.
  const rawTabParam =
    (searchParams.get('tool') || searchParams.get('tab'))?.trim().toLowerCase() as
      | HousesHeaderTab
      | undefined;
  const tabFromUrl = useMemo((): HousesHeaderTab => {
    if (rawTabParam && TAB_IDS.includes(rawTabParam) && rawTabParam !== 'settings') {
      return rawTabParam;
    }
    return 'teams';
  }, [rawTabParam]);
  const [pendingTab, setPendingTab] = useState<HousesHeaderTab | null>(null);
  const activeTab = pendingTab ?? tabFromUrl;

  const resolveDefaultOpeningTab = useCallback((): HousesHeaderTab => {
    const preferred = settings.housesDefaultOpeningTab;
    if (preferred && TAB_IDS.includes(preferred) && preferred !== 'settings') {
      return preferred;
    }
    return 'teams';
  }, [settings.housesDefaultOpeningTab]);

  const writeTabToUrl = useCallback(
    (nextTab: HousesHeaderTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('tab');
      if (nextTab === 'teams') {
        params.delete('tool');
      } else {
        params.set('tool', nextTab);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const openTab = useCallback(
    (nextTab: HousesHeaderTab) => {
      playUi('click');
      if (nextTab === 'settings') {
        setSettingsOpen(true);
        return;
      }
      setPendingTab(nextTab);
      writeTabToUrl(nextTab);
    },
    [playUi, writeTabToUrl],
  );

  // Clear optimistic tab once the URL catches up (also covers back/forward).
  useEffect(() => {
    if (rawTabParam === 'settings') {
      setSettingsOpen(true);
      setPendingTab(null);
      return;
    }
    if (pendingTab && tabFromUrl === pendingTab) {
      setPendingTab(null);
    }
  }, [tabFromUrl, pendingTab, rawTabParam]);

  // First visit with no ?tool=: honor initialTab / school default opening tab.
  const didApplyDefaultTab = useRef(false);
  useEffect(() => {
    if (didApplyDefaultTab.current) return;
    didApplyDefaultTab.current = true;
    if (rawTabParam) return;
    if (initialTab === 'settings') {
      setSettingsOpen(true);
      return;
    }
    const preferred =
      TAB_IDS.includes(initialTab) && initialTab !== 'settings'
        ? initialTab
        : resolveDefaultOpeningTab();
    if (preferred !== 'teams') {
      setPendingTab(preferred);
      writeTabToUrl(preferred);
    }
    // Mount-only defaulting
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quick Action Handlers
  const handleAwardPoints = async (house: House, delta: number, reason?: string) => {
    const currentPoints = house.points ?? 0;
    const currentLifetime = house.lifetimePoints ?? currentPoints;
    const nextPoints = Math.max(0, currentPoints + delta);
    const nextLifetime = delta > 0 ? currentLifetime + delta : currentLifetime;

    await updateHouse({
      ...house,
      points: nextPoints,
      lifetimePoints: nextLifetime,
    });

    toast({
      title: delta > 0 ? `Awarded ${delta} pts to ${house.name}!` : `Deducted ${Math.abs(delta)} pts from ${house.name}`,
      description: reason ? `Reason: ${reason}` : `New team total: ${nextPoints.toLocaleString()} pts`,
    });
  };

  const handleSaveHouse = async (data: {
    id?: string;
    name: string;
    value?: string;
    color: string;
    emoji?: string;
    motto?: string;
  }) => {
    if (data.id) {
      const existing = houses.find((h) => h.id === data.id);
      if (!existing) return;
      await updateHouse({
        ...existing,
        name: data.name,
        value: data.value,
        color: data.color,
        emoji: data.emoji,
        motto: data.motto,
      });
      toast({ title: 'House updated', description: `Saved changes to ${data.name}.` });
    } else {
      await addHouse({
        name: data.name,
        value: data.value,
        color: data.color,
        emoji: data.emoji,
        motto: data.motto,
        sortOrder: houses.length,
      });
      toast({ title: 'House created!', description: `${data.name} has joined the competition.` });
    }
  };

  const handleDeleteHouse = async (house: House) => {
    const houseStudents = students.filter((s) => s.houseId === house.id);
    const ok = await confirm({
      title: `Delete "${house.name}"?`,
      description:
        houseStudents.length > 0
          ? `${houseStudents.length} student(s) will be unassigned from this house.`
          : 'This will remove the house.',
      confirmLabel: 'Delete house',
      destructive: true,
    });
    if (!ok) return;

    await deleteHouse(house.id, houseStudents);
    toast({ title: 'House deleted', description: `"${house.name}" was removed.` });
  };

  const handleApplyPreset = async (presetId: HousePresetThemeId, assignStudents: boolean) => {
    if (!firestore) return;
    await seedHouseThemePack(firestore, schoolId, houses, presetId);

    const latestHouses = await listHouses(firestore, schoolId);
    const unassigned = students.filter((s) => !s.houseId);
    if (assignStudents && latestHouses.length > 0 && unassigned.length > 0) {
      await assignStudentsToHousesBalanced(
        firestore,
        schoolId,
        unassigned.map((s) => s.id),
        latestHouses,
        students,
      );
    }
  };

  const handleApplyAiResult = async (data: {
    realmTheme: HousesRealmThemeId;
    houses: { name: string; value: string; color: string; emoji: string; motto: string }[];
    assignStudents: boolean;
  }) => {
    if (!firestore) return;
    updateSettings({ housesRealmTheme: data.realmTheme });

    for (let i = 0; i < data.houses.length; i++) {
      const h = data.houses[i];
      await addHouse({
        name: h.name,
        value: h.value || undefined,
        color: h.color || '#2563EB',
        emoji: h.emoji || undefined,
        motto: h.motto || undefined,
        sortOrder: houses.length + i,
      });
    }

    if (data.assignStudents) {
      const latestHouses = await listHouses(firestore, schoolId);
      const unassigned = students.filter((s) => !s.houseId);
      if (latestHouses.length > 0 && unassigned.length > 0) {
        await assignStudentsToHousesBalanced(
          firestore,
          schoolId,
          unassigned.map((s) => s.id),
          latestHouses,
          students,
        );
      }
    }
  };

  const handleBulkAssign = async (mode: 'balanced' | 'random') => {
    if (!firestore || houses.length === 0) return;
    const unassigned = students.filter((s) => !s.houseId);
    if (unassigned.length === 0) return;

    const ids = unassigned.map((s) => s.id);
    if (mode === 'balanced') {
      await assignStudentsToHousesBalanced(firestore, schoolId, ids, houses, students);
    } else {
      await assignStudentsToHousesRandom(firestore, schoolId, ids, houses);
    }

    toast({
      title: 'Students sorted!',
      description: `Sorted ${ids.length} student${ids.length === 1 ? '' : 's'} (${mode}).`,
    });
  };

  const handleSyncTotals = async () => {
    if (!firestore || houses.length === 0) return;
    await syncHousePointsFromStudents(firestore, schoolId, houses, students, 'both');
    toast({
      title: 'Totals synced',
      description: `Updated points for ${houses.length} house teams from student records.`,
    });
  };

  const handleResetAllHouses = async () => {
    if (houses.length === 0) return;
    await Promise.all(
      houses.map((house) => {
        const houseStudents = students.filter((s) => s.houseId === house.id);
        return deleteHouse(house.id, houseStudents);
      }),
    );
    toast({ title: 'Houses reset', description: 'All house teams have been removed.' });
    openTab('teams');
  };

  if (!settings.enableHouses) {
    return (
      <div className="relative min-h-dvh flex flex-col items-center justify-center p-6 text-center hr-fg">
        <HousesBackdrop />
        <div className="relative z-10 max-w-md space-y-4 rounded-3xl border hr-panel backdrop-blur-xl p-8 shadow-2xl">
          <Castle className="mx-auto h-12 w-12 opacity-50" />
          <h2 className="text-xl font-bold">Houses Not Enabled</h2>
          <p className="text-sm hr-muted">
            Houses are currently disabled for this school. Enable them in settings to view house teams and run competitions.
          </p>
          {isStaff ? (
            <Button
              type="button"
              onClick={() => updateSettings({ enableHouses: true })}
              className="rounded-full font-bold px-6"
              style={{
                backgroundImage:
                  'linear-gradient(135deg, var(--hr-accent-from, #fbbf24), var(--hr-accent-to, #7c3aed))',
                color: 'var(--hr-on-accent, #1a0f2e)',
              }}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Enable Houses
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="houses-realm-root relative min-h-dvh flex flex-col overflow-x-hidden transition-colors">
      <HousesBackdrop />

      <HousesHeaderBar
        schoolId={schoolId}
        schoolName={schoolName}
        activeTab={activeTab}
        onNavigate={openTab}
        onHome={() => openTab('teams')}
        onOpenAddHouse={() => {
          setEditingHouse(null);
          setEditorOpen(true);
        }}
        onOpenSetupWizard={() => setSetupWizardOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenGuide={() => setGuideOpen(true)}
        isStaff={isStaff}
      />

      {/* Full-screen section for the active top tab */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0, transition: spring }}
          className="min-h-full"
        >
          {activeTab === 'teams' ? (
            <main className="relative z-10 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
              <HousesTeamCenterStage
                houses={houses}
                students={students}
                onOpenQuickAward={(house) => setQuickAwardHouse(house)}
                onOpenEditHouse={(house) => {
                  setEditingHouse(house);
                  setEditorOpen(true);
                }}
                onOpenSetupWizard={() => setSetupWizardOpen(true)}
                onOpenRostersTab={() => openTab('rosters')}
                onSyncTotals={handleSyncTotals}
                onBulkAssign={handleBulkAssign}
                isStaff={isStaff}
              />
            </main>
          ) : null}

          {activeTab === 'rosters' ? (
            <main className="relative z-10 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold hr-fg tracking-tight">House Rosters</h2>
                  <p className="text-sm hr-muted mt-1">Assign students and teachers to each house team.</p>
                </div>
              </div>
              <div className="houses-realm-manage">
                <AdminHousesManage
                  schoolId={schoolId}
                  houses={houses}
                  students={students}
                  teachers={teachers}
                  onAddHouse={addHouse}
                  onUpdateHouse={updateHouse}
                  onDeleteHouse={deleteHouse}
                  onUpdateStudent={updateStudent}
                  onUpdateTeacher={updateTeacher}
                  section="rosters"
                />
              </div>
            </main>
          ) : null}

          {activeTab === 'ceremony' ? (
            <main className="relative z-10 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col min-h-[calc(100dvh-5.5rem)]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold hr-fg tracking-tight">Sorting Ceremony</h2>
                  <p className="text-sm hr-muted mt-1">
                    Sort students into houses with music and celebration. Open fullscreen for assembly.
                  </p>
                </div>
                <Button
                  asChild
                  size="sm"
                  className="h-9 rounded-full px-4 text-xs font-bold"
                  style={{
                    backgroundImage:
                      'linear-gradient(135deg, var(--hr-accent-from, #fbbf24), var(--hr-accent-to, #7c3aed))',
                    color: 'var(--hr-on-accent, #1a0f2e)',
                  }}
                >
                  <Link href={housesRealmHref(schoolId, 'ceremony')} target="_blank">
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    Fullscreen
                  </Link>
                </Button>
              </div>
              <div className="flex-1 rounded-2xl border hr-panel overflow-hidden min-h-[min(70vh,640px)] shadow-xl">
                <HouseSortingCeremony />
              </div>
            </main>
          ) : null}

          {activeTab === 'hall-of-fame' ? (
            <main className="relative z-10 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold hr-fg tracking-tight flex items-center gap-2">
                    <Trophy className="h-7 w-7 text-amber-400" />
                    Hall of Fame
                  </h2>
                  <p className="text-sm hr-muted mt-1">
                    Celebrate top students, house points, and school spirit records.
                  </p>
                </div>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-9 rounded-full hr-border hr-soft px-4 text-xs font-bold hr-fg hover:opacity-90"
                >
                  <Link href={`/${schoolId}/hall-of-fame`} target="_blank">
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    Public Display
                  </Link>
                </Button>
              </div>
              <div className="houses-realm-manage space-y-4">
                <AdminHouseHallOfFamePanel schoolId={schoolId} />
              </div>
            </main>
          ) : null}
        </motion.div>
      </div>

      <HousesInteractiveGuide
        open={guideOpen}
        onOpenChange={setGuideOpen}
        onNavigateTab={openTab}
        onOpenSetupWizard={() => setSetupWizardOpen(true)}
        onOpenAddHouse={() => {
          setEditingHouse(null);
          setEditorOpen(true);
        }}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* DIALOGS */}
      <HouseQuickAwardDialog
        open={Boolean(quickAwardHouse)}
        onOpenChange={(open) => !open && setQuickAwardHouse(null)}
        house={quickAwardHouse}
        onAward={handleAwardPoints}
      />

      <HouseEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        house={editingHouse}
        onSave={handleSaveHouse}
        onDelete={handleDeleteHouse}
        assignedStudentsCount={editingHouse ? students.filter((s) => s.houseId === editingHouse.id).length : 0}
      />

      <HouseSetupWizardDialog
        open={setupWizardOpen}
        onOpenChange={setSetupWizardOpen}
        schoolId={schoolId}
        onApplyPreset={handleApplyPreset}
        onApplyAiResult={handleApplyAiResult}
        unassignedCount={students.filter((s) => !s.houseId).length}
      />

      <HousesSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onResetHouses={handleResetAllHouses}
        hasHouses={houses.length > 0}
      />
    </div>
  );
}
