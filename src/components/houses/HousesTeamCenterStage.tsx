'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Castle,
  Crown,
  Edit,
  ExternalLink,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trophy,
  UserCheck,
  UserMinus,
  Users,
  Wand2,
  BarChart3,
  LayoutGrid,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { HouseBadge } from './HouseBadge';
import {
  HouseStandingsChartBlock,
  normalizeHouseStandingsChartFormat,
  type HouseStandingsChartFormat,
} from './HouseStandingsChartBlock';
import { buildHouseStandingsRows, type HouseStandingsRow } from '@/lib/houses/houseStandings';
import type { House, Student } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useHousesSound } from '@/hooks/useHousesSound';
import { useSettings } from '@/components/providers/SettingsProvider';

export interface HousesTeamCenterStageProps {
  houses: House[];
  students: Student[];
  onOpenQuickAward: (house: House) => void;
  onOpenEditHouse: (house: House | null) => void;
  onOpenSetupWizard: () => void;
  onOpenRostersTab: (filterHouseId?: string) => void;
  onSyncTotals?: () => Promise<void>;
  onBulkAssign?: (mode: 'balanced' | 'random') => Promise<void>;
  isStaff?: boolean;
}

export function HousesTeamCenterStage({
  houses,
  students,
  onOpenQuickAward,
  onOpenEditHouse,
  onOpenSetupWizard,
  onOpenRostersTab,
  onSyncTotals,
  onBulkAssign,
  isStaff = true,
}: HousesTeamCenterStageProps) {
  const { playUi } = useHousesSound();
  const { settings, updateSettings } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  // Default to standings chart when unset; only 'cards' forces the card grid.
  const viewMode = settings.housesTeamsViewMode === 'cards' ? 'cards' : 'chart';
  const chartFormat = normalizeHouseStandingsChartFormat(settings.houseStandingsChartFormat);
  const showMotto = settings.housesShowMotto !== false;
  const showValue = settings.housesShowValue !== false;
  const [syncing, setSyncing] = useState(false);
  const [sorting, setSorting] = useState(false);

  const setViewMode = (mode: 'cards' | 'chart') => {
    updateSettings({ housesTeamsViewMode: mode });
  };

  const setChartFormat = (format: HouseStandingsChartFormat) => {
    updateSettings({ houseStandingsChartFormat: format });
  };

  // Calculate standings rows
  const standingsRows = useMemo(
    () => buildHouseStandingsRows(houses, students),
    [houses, students],
  );

  // Map student members by house
  const membersByHouse = useMemo(() => {
    const map = new Map<string, Student[]>();
    for (const s of students) {
      if (!s.houseId) continue;
      const list = map.get(s.houseId) ?? [];
      list.push(s);
      map.set(s.houseId, list);
    }
    return map;
  }, [students]);

  const unassignedStudents = useMemo(
    () => students.filter((s) => !s.houseId),
    [students],
  );
  const unassignedCount = unassignedStudents.length;

  const assignedCount = students.length - unassignedStudents.length;
  const leaderHouse = standingsRows[0]?.house ?? null;

  // Filter standings rows based on search
  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return standingsRows;

    return standingsRows.filter((row) => {
      const matchHouse =
        row.house.name.toLowerCase().includes(q) ||
        (row.house.motto && row.house.motto.toLowerCase().includes(q)) ||
        (row.house.value && row.house.value.toLowerCase().includes(q));

      if (matchHouse) return true;

      // Also check if any student member matches the search
      const members = membersByHouse.get(row.house.id) ?? [];
      return members.some(
        (s) =>
          s.firstName?.toLowerCase().includes(q) ||
          s.lastName?.toLowerCase().includes(q),
      );
    });
  }, [standingsRows, searchQuery, membersByHouse]);

  const handleSync = async () => {
    if (!onSyncTotals || syncing) return;
    setSyncing(true);
    playUi('click');
    try {
      await onSyncTotals();
      playUi('success');
    } finally {
      setSyncing(false);
    }
  };

  const handleAutoSort = async (mode: 'balanced' | 'random') => {
    if (!onBulkAssign || sorting) return;
    setSorting(true);
    playUi('classroom_award');
    try {
      await onBulkAssign(mode);
      playUi('success');
    } finally {
      setSorting(false);
    }
  };

  const setViewModeWithSound = (mode: 'cards' | 'chart') => {
    if (mode === viewMode) return;
    playUi('click');
    setViewMode(mode);
  };

  const setChartFormatWithSound = (format: HouseStandingsChartFormat) => {
    if (format === chartFormat) return;
    playUi('click');
    setChartFormat(format);
  };

  // If there are no houses configured yet, show a welcoming center onboarding state
  if (houses.length === 0) {
    return (
      <div className="mx-auto max-w-4xl py-12 px-4 sm:px-6 text-center animate-in fade-in duration-300">
        <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-3xl shadow-2xl border hr-border bg-gradient-to-br from-amber-400/20 via-violet-600/30 to-purple-900/40 backdrop-blur-xl">
          <Castle className="h-12 w-12 text-amber-300" />
          <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow-md">
            ✨
          </span>
        </div>

        <h2 className="mt-6 font-serif text-3xl sm:text-5xl font-bold hr-fg tracking-tight">
          Welcome to the Houses
        </h2>
        <p className="mt-3 max-w-lg mx-auto text-sm sm:text-base hr-muted leading-relaxed">
          Create house teams for your school to inspire teamwork, spirit competitions, and friendly rivalry.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Button
            type="button"
            size="lg"
            onClick={() => {
              playUi('click');
              onOpenSetupWizard();
            }}
            className="h-12 rounded-full px-8 font-bold text-sm shadow-xl transition-transform hover:-translate-y-0.5"
            style={{
              backgroundImage:
                'linear-gradient(135deg, var(--hr-accent-from, #fbbf24), var(--hr-accent-to, #7c3aed))',
              color: 'var(--hr-on-accent, #1a0f2e)',
            }}
          >
            <Wand2 className="mr-2 h-5 w-5" />
            <span>Setup with AI or Starter Packs</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => {
              playUi('click');
              onOpenEditHouse(null);
            }}
            className="h-12 rounded-full hr-border hr-soft px-8 font-bold text-sm hr-fg"
          >
            <Plus className="mr-2 h-5 w-5" />
            <span>Create Custom House</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. TOP STATS STRIP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Houses */}
        <div className="rounded-2xl border hr-border hr-soft backdrop-blur-md p-3.5 sm:p-4 shadow-sm flex items-center gap-3">
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30">
            <Castle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider hr-muted">House Teams</p>
            <p className="text-xl sm:text-2xl font-black hr-fg tabular-nums">{houses.length}</p>
          </div>
        </div>

        {/* Assigned Students */}
        <div className="rounded-2xl border hr-border hr-soft backdrop-blur-md p-3.5 sm:p-4 shadow-sm flex items-center gap-3">
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <UserCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider hr-muted">In a House</p>
            <p className="text-xl sm:text-2xl font-black hr-fg tabular-nums">{assignedCount}</p>
          </div>
        </div>

        {/* Unassigned Students */}
        <div className="rounded-2xl border hr-border hr-soft backdrop-blur-md p-3.5 sm:p-4 shadow-sm flex items-center gap-3">
          <div
            className={cn(
              'flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl border',
              unassignedCount > 0
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'hr-soft hr-muted hr-border',
            )}
          >
            <UserMinus className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider hr-muted">Unassigned</p>
            <div className="flex items-center gap-2">
              <p className="text-xl sm:text-2xl font-black hr-fg tabular-nums">{unassignedCount}</p>
              {unassignedCount > 0 && isStaff ? (
                <button
                  type="button"
                  onClick={() => void handleAutoSort('balanced')}
                  disabled={sorting}
                  className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 hover:bg-amber-400/30 transition-colors"
                >
                  Sort
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Current Leader */}
        <div className="rounded-2xl border hr-border hr-soft backdrop-blur-md p-3.5 sm:p-4 shadow-sm flex items-center gap-3">
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Trophy className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider hr-muted">Current Leader</p>
            {leaderHouse ? (
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-base sm:text-lg">{leaderHouse.emoji || '👑'}</span>
                <span className="font-bold text-sm sm:text-base hr-fg truncate">{leaderHouse.name}</span>
              </div>
            ) : (
              <p className="text-sm font-bold hr-muted">—</p>
            )}
          </div>
        </div>
      </div>

      {/* 2. SEARCH & ACTION TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border hr-border hr-chrome backdrop-blur-md p-3 sm:p-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 hr-muted" />
          <Input
            placeholder="Search houses or student names..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 hr-soft hr-border hr-fg placeholder:opacity-50 h-9 rounded-xl text-xs sm:text-sm focus:opacity-100"
          />
        </div>

        {/* Action buttons & View toggles */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
          {onSyncTotals && isStaff ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={syncing}
              onClick={() => void handleSync()}
              className="h-9 rounded-xl hr-border hr-soft text-xs hr-muted"
              title="Sync house points from student points"
            >
              <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', syncing && 'animate-spin')} />
              <span>Sync Totals</span>
            </Button>
          ) : null}

          {/* View Mode Toggle: Cards vs Standings Chart */}
          <div className="flex rounded-xl hr-soft-strong p-0.5 border hr-border">
            <button
              type="button"
              onClick={() => setViewModeWithSound('cards')}
              title="Cards Grid View"
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors',
                viewMode === 'cards'
                  ? 'hr-soft-strong hr-fg shadow-xs'
                  : 'hr-nav-idle hr-muted',
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Teams</span>
            </button>
            <button
              type="button"
              onClick={() => setViewModeWithSound('chart')}
              title="Standings Chart View"
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors',
                viewMode === 'chart'
                  ? 'hr-soft-strong hr-fg shadow-xs'
                  : 'hr-nav-idle hr-muted',
              )}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Standings</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. CENTERPIECE: HOUSE TEAMS (CARDS VIEW) */}
      {viewMode === 'cards' ? (
        filteredRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed hr-border p-12 text-center hr-soft">
            <Castle className="mx-auto h-10 w-10 hr-muted" />
            <p className="mt-3 text-sm font-bold hr-fg">No houses found</p>
            <p className="text-xs hr-muted mt-1">No houses or students matched &ldquo;{searchQuery}&rdquo;</p>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.05 } },
            }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6"
          >
            {filteredRows.map((row) => {
              const { house, rank, points, members } = row;
              const isFirst = rank === 1;
              const isSecond = rank === 2;
              const isThird = rank === 3;
              const houseMembers = membersByHouse.get(house.id) ?? [];

              return (
                <motion.div
                  key={house.id}
                  variants={{
                    hidden: { opacity: 0, y: 15 },
                    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
                  }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className={cn(
                    'group relative flex flex-col justify-between overflow-hidden rounded-3xl border hr-panel backdrop-blur-xl p-5 sm:p-6 shadow-xl transition-all',
                    isFirst && 'border-amber-400/40 ring-1 ring-amber-400/30 shadow-amber-950/20',
                  )}
                  style={{
                    boxShadow: `0 10px 30px -10px ${house.color}30`,
                  }}
                >
                  {/* Top Ambient Glow in House Color */}
                  <div
                    className="pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full opacity-25 blur-2xl"
                    style={{ backgroundColor: house.color }}
                  />

                  <div>
                    {/* Header Row: Rank Badge & Edit Button */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {/* Rank Badge */}
                        <span
                          className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-full text-xs font-black shadow-xs',
                            isFirst
                              ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                              : isSecond
                                ? 'bg-slate-300 text-slate-950 ring-1 ring-white/50'
                                : isThird
                                  ? 'bg-amber-700 hr-fg'
                                  : 'bg-white/10 hr-muted',
                          )}
                        >
                          {isFirst ? <Crown className="h-3.5 w-3.5" /> : `#${rank}`}
                        </span>

                        {isFirst ? (
                          <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300 border border-amber-400/30">
                            1st Place
                          </span>
                        ) : null}
                      </div>

                      {isStaff ? (
                        <button
                          type="button"
                          onClick={() => {
                            playUi('click');
                            onOpenEditHouse(house);
                          }}
                          title="Edit House Details"
                          className="opacity-70 hover:opacity-100 p-1.5 rounded-lg hover:bg-white/10 hr-nav-idle hr-muted transition-colors"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>

                    {/* House Centerpiece: Giant Crest & Team Name */}
                    <div className="mt-4 flex items-center gap-4">
                      <div
                        className="relative flex h-16 w-16 sm:h-18 sm:w-18 shrink-0 items-center justify-center rounded-2xl text-3xl sm:text-4xl shadow-xl border-2 transition-transform group-hover:scale-105"
                        style={{
                          backgroundColor: `${house.color}25`,
                          borderColor: `${house.color}75`,
                          boxShadow: `0 0 20px ${house.color}40`,
                        }}
                      >
                        <span>{house.emoji || '🛡️'}</span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-serif text-xl sm:text-2xl font-bold hr-fg tracking-tight truncate">
                          {house.name}
                        </h3>

                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {showValue && house.value ? (
                            <span
                              className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider hr-fg"
                              style={{ backgroundColor: `${house.color}60` }}
                            >
                              {house.value}
                            </span>
                          ) : null}

                          <span className="inline-flex items-center gap-1 text-xs font-semibold hr-muted">
                            <Users className="h-3 w-3" />
                            <span>{members} {members === 1 ? 'student' : 'students'}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Motto */}
                    {showMotto && house.motto ? (
                      <p className="mt-3 text-xs hr-muted italic line-clamp-1 border-l-2 pl-2 hr-border">
                        &ldquo;{house.motto}&rdquo;
                      </p>
                    ) : null}

                    {/* Big Bold Point Score */}
                    <div className="mt-5 rounded-2xl border hr-border hr-soft p-3.5 flex items-baseline justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider hr-muted">
                        Score
                      </span>
                      <div className="text-right">
                        <span className="text-2xl sm:text-3xl font-black hr-fg tabular-nums tracking-tight">
                          {points.toLocaleString()}
                        </span>
                        <span className="text-xs font-bold hr-muted ml-1">pts</span>
                        {house.lifetimePoints && house.lifetimePoints !== points ? (
                          <p className="text-[10px] hr-muted tabular-nums">
                            {house.lifetimePoints.toLocaleString()} lifetime
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {/* Member Avatars Preview */}
                    {houseMembers.length > 0 ? (
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex -space-x-1.5 overflow-hidden">
                          {houseMembers.slice(0, 5).map((m) => (
                            <div
                              key={m.id}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-900 bg-slate-800 text-[10px] font-bold hr-fg shadow-xs"
                              title={`${m.firstName} ${m.lastName}`}
                            >
                              {m.firstName?.[0] || 'S'}
                            </div>
                          ))}
                          {houseMembers.length > 5 ? (
                            <div className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-900 bg-slate-700 text-[9px] font-bold hr-muted">
                              +{houseMembers.length - 5}
                            </div>
                          ) : null}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            playUi('click');
                            onOpenRostersTab(house.id);
                          }}
                          className="text-[11px] font-bold hr-muted hr-nav-idle transition-colors"
                        >
                          View Roster →
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {/* Card Bottom: Quick Actions Bar */}
                  {isStaff ? (
                    <div className="mt-5 pt-4 border-t hr-border flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          playUi('click');
                          onOpenQuickAward(house);
                        }}
                        className="flex-1 rounded-xl text-xs font-bold shadow-md transition-transform hover:-translate-y-0.5"
                        style={{
                          backgroundColor: house.color,
                          color: '#ffffff',
                        }}
                      >
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                        <span>Award Points</span>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          playUi('click');
                          onOpenRostersTab(house.id);
                        }}
                        className="rounded-xl hr-border hr-soft text-xs font-semibold hr-fg"
                      >
                        <span>Members</span>
                      </Button>
                    </div>
                  ) : null}
                </motion.div>
              );
            })}
          </motion.div>
        )
      ) : (
        /* Standings Chart View */
        <div className="rounded-3xl border hr-panel backdrop-blur-xl p-4 sm:p-6 shadow-xl">
          <h3 className="font-serif text-xl font-bold hr-fg mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            <span>House Standings Leaderboard</span>
          </h3>
          <HouseStandingsChartBlock
            houses={houses}
            students={students}
            format={chartFormat}
            onFormatChange={setChartFormatWithSound}
          />
        </div>
      )}
    </div>
  );
}
