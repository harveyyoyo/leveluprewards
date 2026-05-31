'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import {
  Activity,
  BarChart3,
  BookOpen,
  CalendarCheck,
  Database,
  Loader2,
  RefreshCw,
  School,
  Ticket,
  Users,
} from 'lucide-react';
import { useFunctions } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { formatActivePillars } from '@/lib/productPillars';
import {
  engagementLabel,
  formatRelativeTime,
  type DeveloperFleetSchoolSummary,
  type DeveloperSchoolUsageDetail,
  type DeveloperUsageInsightsResponse,
} from '@/lib/developer/schoolUsageInsights';
import { DeveloperSchoolHealthCoach } from '@/components/developer/DeveloperSchoolHealthCoach';

function StatTile({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: string | number;
  sub?: string;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border bg-secondary/60 p-3 text-center', className)}>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {sub ? <p className="mt-0.5 text-[10px] text-muted-foreground/80">{sub}</p> : null}
    </div>
  );
}

function CountGrid({ counts, keys }: { counts: Record<string, number>; keys: Array<{ key: string; label: string }> }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {keys.map(({ key, label }) => (
        <StatTile key={key} label={label} value={(counts[key] ?? 0).toLocaleString()} />
      ))}
    </div>
  );
}

function FleetTable({
  fleet,
  selectedId,
  onSelect,
}: {
  fleet: DeveloperFleetSchoolSummary[];
  selectedId: string | null;
  onSelect: (school: DeveloperFleetSchoolSummary) => void;
}) {
  const sorted = useMemo(
    () => [...fleet].sort((a, b) => b.engagementScore - a.engagementScore),
    [fleet],
  );

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-semibold">School</th>
            <th className="px-3 py-2 font-semibold">Engagement</th>
            <th className="px-3 py-2 font-semibold tabular-nums">Students</th>
            <th className="px-3 py-2 font-semibold tabular-nums">Active 30d</th>
            <th className="px-3 py-2 font-semibold tabular-nums">Sign-ins 30d</th>
            <th className="px-3 py-2 font-semibold tabular-nums">Coupons 30d</th>
            <th className="px-3 py-2 font-semibold">Last backup</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const eng = engagementLabel(row.engagementScore);
            const active = selectedId === row.schoolId;
            return (
              <tr
                key={row.schoolId}
                className={cn(
                  'cursor-pointer border-b transition-colors hover:bg-accent/40',
                  active && 'bg-accent/60',
                )}
                onClick={() => onSelect(row)}
              >
                <td className="px-3 py-2.5">
                  <p className="font-mono text-xs font-bold">{row.schoolId}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[180px]">{row.name}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{formatActivePillars(row.pillars)}</p>
                </td>
                <td className="px-3 py-2.5">
                  <Badge variant={eng.variant} className="tabular-nums">
                    {row.engagementScore} · {eng.label}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 tabular-nums">{row.students.count}</td>
                <td className="px-3 py-2.5 tabular-nums">{row.students.activeStudents30d}</td>
                <td className="px-3 py-2.5 tabular-nums">{row.attendance.last30d}</td>
                <td className="px-3 py-2.5 tabular-nums">{row.coupons.usedLast30d}</td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">
                  {formatRelativeTime(row.backup.lastBackupAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SchoolDetailBody({ detail, generatedAt }: { detail: DeveloperSchoolUsageDetail; generatedAt: number }) {
  const inventoryKeys = [
    { key: 'students', label: 'Students' },
    { key: 'classes', label: 'Classes' },
    { key: 'teachers', label: 'Teachers' },
    { key: 'staffAccounts', label: 'Staff accounts' },
    { key: 'categories', label: 'Categories' },
    { key: 'prizes', label: 'Prizes' },
    { key: 'coupons', label: 'Coupons' },
    { key: 'library', label: 'Library titles' },
    { key: 'attendanceLog', label: 'Attendance logs' },
    { key: 'badges', label: 'Badges' },
    { key: 'achievements', label: 'Achievements' },
    { key: 'houses', label: 'Houses' },
    { key: 'homework', label: 'Homework' },
    { key: 'backups', label: 'Backups' },
  ];

  const officeKeys = detail.pillars.payOffice
    ? [
        { key: 'officeStudents', label: 'Office students' },
        { key: 'officeTeachers', label: 'Office teachers' },
        { key: 'officeBillingAccounts', label: 'Billing accounts' },
        { key: 'officeInvoices', label: 'Invoices' },
        { key: 'officeGradeEntries', label: 'Grade entries' },
      ]
    : [];

  const settingsEntries = Object.entries(detail.appSettings).filter(
    ([, v]) => typeof v === 'boolean' || typeof v === 'number' || typeof v === 'string',
  );

  return (
    <Tabs defaultValue="overview" className="mt-4">
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="inventory">Inventory</TabsTrigger>
        <TabsTrigger value="engagement">Engagement</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile
            label="Lifetime points"
            value={detail.students.totalLifetimePoints.toLocaleString()}
          />
          <StatTile
            label="Students w/ balance"
            value={detail.students.studentsWithPoints}
            sub={`of ${detail.students.count}`}
          />
          <StatTile
            label="Coupon points redeemed"
            value={detail.coupons.pointsFromCoupons.toLocaleString()}
            sub={`${detail.coupons.used} used total`}
          />
          <StatTile
            label="Library checked out"
            value={detail.library.checkedOut}
            sub={`of ${detail.library.total} titles`}
          />
        </div>
        <div className="rounded-lg border p-3 text-sm space-y-2">
          <p>
            <span className="font-semibold">Last attendance sign-in:</span>{' '}
            {formatRelativeTime(detail.attendance.lastSignInAt, generatedAt)}
            {detail.attendance.lastSignInAt
              ? ` (${new Date(detail.attendance.lastSignInAt).toLocaleString()})`
              : ''}
          </p>
          <p>
            <span className="font-semibold">School doc updated:</span>{' '}
            {formatRelativeTime(detail.updatedAt, generatedAt)}
          </p>
          <p>
            <span className="font-semibold">Last backup:</span>{' '}
            {formatRelativeTime(detail.backup.lastBackupAt, generatedAt)}
            {detail.backup.lastBackupType ? ` (${detail.backup.lastBackupType})` : ''}
          </p>
          {detail.enabledFeatures.length > 0 ? (
            <p className="flex flex-wrap gap-1 items-center">
              <span className="font-semibold mr-1">Features:</span>
              {detail.enabledFeatures.map((f) => (
                <Badge key={f} variant="outline" className="text-[10px]">
                  {f.replace(/_/g, ' ')}
                </Badge>
              ))}
            </p>
          ) : null}
          {detail.faceEnrollments > 0 ? (
            <p>
              <span className="font-semibold">Face enrollments:</span> {detail.faceEnrollments}
            </p>
          ) : null}
        </div>
      </TabsContent>

      <TabsContent value="inventory" className="space-y-4 pt-4">
        <CountGrid counts={detail.counts} keys={inventoryKeys} />
        {officeKeys.length > 0 ? (
          <>
            <Separator />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">School Office</p>
            <CountGrid counts={detail.counts} keys={officeKeys} />
          </>
        ) : null}
        <Separator />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Staff accounts by role</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(detail.staffByRole).length === 0 ? (
            <span className="text-sm text-muted-foreground">No staff accounts</span>
          ) : (
            Object.entries(detail.staffByRole).map(([role, n]) => (
              <Badge key={role} variant="secondary">
                {role}: {n}
              </Badge>
            ))
          )}
        </div>
      </TabsContent>

      <TabsContent value="engagement" className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <StatTile label="Sign-ins (7d)" value={detail.attendance.last7d} />
          <StatTile label="Sign-ins (30d)" value={detail.attendance.last30d} />
          <StatTile label="Attendance logs (all)" value={detail.attendance.total} />
          <StatTile label="Coupons used (30d)" value={detail.coupons.usedLast30d} />
          <StatTile label="Active students (30d)" value={detail.students.activeStudents30d} />
          <StatTile
            label="Engagement score"
            value={detail.engagementScore}
            sub={engagementLabel(detail.engagementScore).label}
          />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Activity samples up to 40 recently updated students (up to 80 activities each). Use this to see
          whether teachers, kiosk, library, and coupons are actually moving.
        </p>
      </TabsContent>

      <TabsContent value="activity" className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile label="Sampled students" value={detail.activities.sampledStudents} />
          <StatTile label="Activities read" value={detail.activities.totalSampled} />
          <StatTile label="Earn events (30d)" value={detail.activities.earnedLast30d} />
          <StatTile label="Redemptions (30d)" value={detail.activities.redeemedLast30d} />
        </div>
        {detail.activities.byCategory.length > 0 ? (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-right">Count</th>
                  <th className="px-3 py-2 text-right">Net points</th>
                </tr>
              </thead>
              <tbody>
                {detail.activities.byCategory.map((row) => (
                  <tr key={row.label} className="border-b last:border-0">
                    <td className="px-3 py-2 capitalize">{row.label}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.count}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {row.points > 0 ? '+' : ''}
                      {row.points.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent activity (sample)</p>
        <ul className="max-h-64 overflow-y-auto rounded-lg border divide-y text-sm">
          {detail.activities.recentActivities.length === 0 ? (
            <li className="p-4 text-muted-foreground text-center">No activities in sample.</li>
          ) : (
            detail.activities.recentActivities.map((a, i) => (
              <li key={`${a.studentId}-${a.date}-${i}`} className="px-3 py-2">
                <div className="flex justify-between gap-2">
                  <span className="font-medium truncate">{a.studentName}</span>
                  <span
                    className={cn(
                      'shrink-0 tabular-nums font-semibold',
                      a.amount < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400',
                    )}
                  >
                    {a.amount > 0 ? '+' : ''}
                    {a.amount}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{a.desc}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {new Date(a.date).toLocaleString()} · {a.kind}
                </p>
              </li>
            ))
          )}
        </ul>
      </TabsContent>

      <TabsContent value="settings" className="space-y-4 pt-4">
        <p className="text-xs text-muted-foreground">
          Sanitized app settings (passcodes omitted). Boolean and scalar values only.
        </p>
        <ul className="rounded-lg border divide-y text-sm max-h-80 overflow-y-auto">
          {settingsEntries.length === 0 ? (
            <li className="p-4 text-muted-foreground">No scalar settings on file.</li>
          ) : (
            settingsEntries
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, val]) => (
                <li key={key} className="flex justify-between gap-4 px-3 py-2 font-mono text-xs">
                  <span className="text-muted-foreground">{key}</span>
                  <span className="font-semibold text-foreground break-all text-right">
                    {typeof val === 'boolean' ? (val ? 'true' : 'false') : String(val)}
                  </span>
                </li>
              ))
          )}
        </ul>
        {detail.recentSupportSessions.length > 0 ? (
          <>
            <Separator />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Recent developer support sessions
            </p>
            <ul className="text-xs space-y-1 font-mono text-muted-foreground">
              {detail.recentSupportSessions.map((s) => (
                <li key={s.id}>
                  {formatRelativeTime(s.startedAt, generatedAt)} · {s.developerUid?.slice(0, 8) ?? '—'}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </TabsContent>
    </Tabs>
  );
}

export function DeveloperSchoolInsightsPanel({
  focusSchoolId,
  onInspectSchool,
  onFocusSchool,
}: {
  /** When set (e.g. from school list row), opens the detail sheet for that school. */
  focusSchoolId?: string | null;
  onInspectSchool?: (schoolId: string) => void;
  /** Notify parent when user should jump to a school (alerts, AI coach). */
  onFocusSchool?: (schoolId: string) => void;
}) {
  const functions = useFunctions();
  const [fleet, setFleet] = useState<DeveloperFleetSchoolSummary[] | null>(null);
  const [generatedAt, setGeneratedAt] = useState<number | null>(null);
  const [fleetLoading, setFleetLoading] = useState(false);
  const [fleetError, setFleetError] = useState<string | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<DeveloperFleetSchoolSummary | null>(null);
  const [detail, setDetail] = useState<DeveloperSchoolUsageDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const lastFocusHandled = useRef<string | null>(null);

  const loadFleet = useCallback(async () => {
    if (!functions) {
      setFleetError('Cloud Functions unavailable.');
      return;
    }
    setFleetLoading(true);
    setFleetError(null);
    try {
      const fn = httpsCallable<Record<string, never>, DeveloperUsageInsightsResponse>(
        functions,
        'getDeveloperSchoolUsageInsights',
      );
      const res = await fn({});
      if (res.data.mode !== 'fleet') throw new Error('Unexpected response');
      setFleet(res.data.fleet);
      setGeneratedAt(res.data.generatedAt);
    } catch (e: unknown) {
      setFleetError((e as Error)?.message || 'Could not load fleet insights. Deploy getDeveloperSchoolUsageInsights.');
    } finally {
      setFleetLoading(false);
    }
  }, [functions]);

  const loadDetail = useCallback(
    async (schoolId: string) => {
      if (!functions) return;
      setDetailLoading(true);
      setDetail(null);
      try {
        const fn = httpsCallable<{ schoolId: string }, DeveloperUsageInsightsResponse>(
          functions,
          'getDeveloperSchoolUsageInsights',
        );
        const res = await fn({ schoolId });
        if (res.data.mode !== 'detail') throw new Error('Unexpected response');
        setDetail(res.data.detail);
        setGeneratedAt(res.data.generatedAt);
      } catch (e: unknown) {
        setDetail(null);
        setFleetError((e as Error)?.message || `Could not load insights for ${schoolId}.`);
      } finally {
        setDetailLoading(false);
      }
    },
    [functions],
  );

  const openSchool = useCallback(
    (school: DeveloperFleetSchoolSummary) => {
      setSelectedSummary(school);
      setSheetOpen(true);
      onInspectSchool?.(school.schoolId);
      onFocusSchool?.(school.schoolId);
      void loadDetail(school.schoolId);
    },
    [loadDetail, onFocusSchool, onInspectSchool],
  );

  const handleFocusSchoolId = useCallback(
    (schoolId: string) => {
      onFocusSchool?.(schoolId);
      const match = fleet?.find((s) => s.schoolId === schoolId);
      if (match) {
        openSchool(match);
        return;
      }
      lastFocusHandled.current = schoolId;
      setSelectedSummary({
        schoolId,
        name: schoolId,
        updatedAt: null,
        pillars: { payClassroom: true, payAttendance: true, payLibrary: true, payHomework: true, payOffice: false },
        counts: {},
        coupons: { total: 0, used: 0, usedLast30d: 0, pointsFromCoupons: 0 },
        library: { total: 0, checkedOut: 0, available: 0 },
        attendance: { total: 0, last7d: 0, last30d: 0, lastSignInAt: null },
        students: { count: 0, totalLifetimePoints: 0, activeStudents30d: 0, studentsWithPoints: 0 },
        backup: { lastBackupAt: null, lastBackupType: null },
        engagementScore: 0,
      });
      setSheetOpen(true);
      void loadDetail(schoolId);
    },
    [fleet, loadDetail, onFocusSchool, openSchool],
  );

  useEffect(() => {
    void loadFleet();
  }, [loadFleet]);

  useEffect(() => {
    if (!focusSchoolId || focusSchoolId === lastFocusHandled.current) return;
    lastFocusHandled.current = focusSchoolId;
    const match = fleet?.find((s) => s.schoolId === focusSchoolId);
    if (match) {
      openSchool(match);
      return;
    }
    if (!functions) return;
    setSelectedSummary({
      schoolId: focusSchoolId,
      name: focusSchoolId,
      updatedAt: null,
      pillars: { payClassroom: true, payAttendance: true, payLibrary: true, payHomework: true, payOffice: false },
      counts: {},
      coupons: { total: 0, used: 0, usedLast30d: 0, pointsFromCoupons: 0 },
      library: { total: 0, checkedOut: 0, available: 0 },
      attendance: { total: 0, last7d: 0, last30d: 0, lastSignInAt: null },
      students: { count: 0, totalLifetimePoints: 0, activeStudents30d: 0, studentsWithPoints: 0 },
      backup: { lastBackupAt: null, lastBackupType: null },
      engagementScore: 0,
    });
    setSheetOpen(true);
    void loadDetail(focusSchoolId);
    onInspectSchool?.(focusSchoolId);
  }, [focusSchoolId, fleet, functions, loadDetail, onInspectSchool, openSchool]);

  const fleetTotals = useMemo(() => {
    if (!fleet?.length) return null;
    return {
      schools: fleet.length,
      students: fleet.reduce((s, r) => s + r.students.count, 0),
      signIns30d: fleet.reduce((s, r) => s + r.attendance.last30d, 0),
      coupons30d: fleet.reduce((s, r) => s + r.coupons.usedLast30d, 0),
      activeStudents: fleet.reduce((s, r) => s + r.students.activeStudents30d, 0),
    };
  }, [fleet]);

  return (
    <>
      <DeveloperSchoolHealthCoach
        fleet={fleet}
        generatedAt={generatedAt}
        detail={detail}
        onFocusSchool={handleFocusSchoolId}
      />

      <Card className="shadow-md border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <BarChart3 className="h-5 w-5 text-primary" aria-hidden />
                School usage insights
              </CardTitle>
              <CardDescription className="text-pretty mt-1">
                Fleet-wide engagement, inventory, attendance, coupons, library, and sampled activity per school.
                Click a row for the full report.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              disabled={fleetLoading}
              onClick={() => void loadFleet()}
            >
              {fleetLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh fleet
            </Button>
          </div>
          {generatedAt ? (
            <p className="text-xs text-muted-foreground">
              Last updated {new Date(generatedAt).toLocaleString()}
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {fleetTotals ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <StatTile label="Schools" value={fleetTotals.schools} />
              <StatTile label="Students" value={fleetTotals.students.toLocaleString()} />
              <StatTile label="Active students 30d" value={fleetTotals.activeStudents} />
              <StatTile label="Sign-ins 30d" value={fleetTotals.signIns30d} />
              <StatTile label="Coupons 30d" value={fleetTotals.coupons30d} />
            </div>
          ) : null}

          {fleetError ? (
            <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 p-3">
              {fleetError}
            </p>
          ) : null}

          {fleetLoading && !fleet ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : fleet && fleet.length > 0 ? (
            <FleetTable
              fleet={fleet}
              selectedId={selectedSummary?.schoolId ?? null}
              onSelect={openSchool}
            />
          ) : !fleetLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">No schools to analyze.</p>
          ) : null}

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> Roster size
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarCheck className="h-3.5 w-3.5" /> Attendance log
            </span>
            <span className="inline-flex items-center gap-1">
              <Ticket className="h-3.5 w-3.5" /> Coupons
            </span>
            <span className="inline-flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" /> Library
            </span>
            <span className="inline-flex items-center gap-1">
              <Activity className="h-3.5 w-3.5" /> Sampled activities
            </span>
            <span className="inline-flex items-center gap-1">
              <Database className="h-3.5 w-3.5" /> Backups
            </span>
          </div>
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 font-mono text-base">
              <School className="h-5 w-5" />
              {selectedSummary?.schoolId}
            </SheetTitle>
            <SheetDescription>
              {selectedSummary?.name} · {formatActivePillars(selectedSummary?.pillars)}
            </SheetDescription>
          </SheetHeader>
          {detailLoading ? (
            <div className="mt-8 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : detail && generatedAt ? (
            <SchoolDetailBody detail={detail} generatedAt={generatedAt} />
          ) : (
            <p className="mt-8 text-sm text-muted-foreground">Could not load school detail.</p>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
