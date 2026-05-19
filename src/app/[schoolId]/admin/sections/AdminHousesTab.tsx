'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Home,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RefreshCw,
  Wand2,
  ExternalLink,
  UserPlus,
  Loader2,
  Pencil,
} from 'lucide-react';
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
import { HouseBadge } from '@/components/houses/HouseBadge';
import type { House, Student, Teacher } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useSettings } from '@/components/providers/SettingsProvider';
import {
  seedRcaHousePresets,
  syncHousePointsFromStudents,
  assignStudentsToHousesBalanced,
  assignStudentsToHousesRandom,
} from '@/lib/db';
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
  const { settings, updateSettings } = useSettings();
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

  const runSeedRca = async () => {
    if (!firestore) return;
    setBusy('rca');
    try {
      await seedRcaHousePresets(firestore, schoolId, sortedHouses);
    } finally {
      setBusy(null);
    }
  };

  const runSyncTotals = async () => {
    if (!firestore) return;
    setBusy('sync');
    try {
      await syncHousePointsFromStudents(firestore, schoolId, sortedHouses, students || [], 'both');
    } finally {
      setBusy(null);
    }
  };

  const runBulkAssign = async (mode: 'balanced' | 'random') => {
    if (!firestore || unassignedStudents.length === 0 || sortedHouses.length === 0) return;
    setBusy(`assign-${mode}`);
    try {
      const ids = unassignedStudents.map((s) => s.id);
      if (mode === 'balanced') {
        await assignStudentsToHousesBalanced(firestore, schoolId, ids, sortedHouses);
      } else {
        await assignStudentsToHousesRandom(firestore, schoolId, ids, sortedHouses);
      }
    } finally {
      setBusy(null);
    }
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
    <Card className="w-full border-t-4 border-violet-500 shadow-md overflow-hidden">
      <CardHeader className="flex flex-col gap-4 py-6 bg-secondary sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Helper content="RCA-style houses: rosters, house parents, point rollups, sorting ceremony, and Hall of Fame standings.">
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5 text-violet-600" /> Houses
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
            onClick={() => void runSeedRca()}
          >
            {busy === 'rca' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            RCA preset (8)
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
            description="Add houses manually or load the RCA preset pack to get started."
            action={{
              label: 'Load RCA preset',
              onClick: () => void runSeedRca(),
              icon: Sparkles,
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
                  className="flex flex-col overflow-hidden rounded-2xl border border-violet-500/20 bg-secondary/45 transition-all hover:border-violet-500/40"
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
                      className="h-8 w-full gap-1.5 rounded-lg border-violet-500/35 bg-background font-semibold"
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
                      onClick={() => void onDeleteHouse(house.id, houseStudents)}
                      aria-label={`Delete ${house.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {isExpanded ? (
                    <div className="space-y-4 border-t border-violet-500/15 bg-background/60 px-4 py-4">
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
                                className={cn('cursor-pointer rounded-full', isParent && 'bg-violet-600')}
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
                          <p className="text-xs text-muted-foreground mt-2">Tap faculty names to assign house parents.</p>
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

                      <ul className="space-y-1 max-h-48 overflow-y-auto">
                        {houseStudents.map((s) => (
                          <li
                            key={s.id}
                            className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm"
                          >
                            <span>
                              {s.lastName}, {s.firstName}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-muted-foreground"
                              onClick={() => void onUpdateStudent({ ...s, houseId: '' })}
                            >
                              Remove
                            </Button>
                          </li>
                        ))}
                        {houseStudents.length === 0 ? (
                          <li className="text-xs text-muted-foreground py-2">No students in this house yet.</li>
                        ) : null}
                      </ul>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingHouse ? 'Edit house' : 'New house'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="Amistad" />
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
    </Card>
  );
}
