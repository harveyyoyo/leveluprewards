'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, FileText, Printer, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Helper } from '@/components/ui/helper';
import { TabWalkthroughHeaderAction } from '@/components/tabWalkthrough/TabWalkthroughContext';
import { getStudentNickname } from '@/lib/utils';
import type { Category, Class, Coupon, Prize, Student, Teacher } from '@/lib/types';
import {
  couponsForTeacherReport,
  prizesForTeacherReport,
  studentsInTeacherScope,
} from '@/lib/reportsScope';
import { HOMEWORK_REWARD_CATEGORY_PREFIX, homeworkRewardCategoryKey } from '@/lib/homeworkRewards';
import { floorRaffleFullTickets, parseRafflePointsPerTicket } from '@/lib/raffleTickets';

export type ReportKind =
  | 'summary'
  | 'roster'
  | 'balances'
  | 'redemptions'
  | 'coupons'
  | 'prizes'
  | 'classes'
  | 'homework';

type RosterSort = 'class-name' | 'name' | 'points-desc' | 'lifetime-desc';
type CouponStatusFilter = 'all' | 'unused' | 'redeemed' | 'expired';
type PrizeStockFilter = 'all' | 'in-stock' | 'out-of-stock' | 'limited';
type DateRangeFilter = 'all' | 'today' | '7-days' | '30-days' | 'custom';

const DASH = '-';

function classNameForStudent(classId: string | undefined, classes: Class[]): string {
  if (!classId) return DASH;
  return classes.find((c) => c.id === classId)?.name ?? DASH;
}

function teacherNameById(teachers: Teacher[], id: string | undefined): string {
  if (!id) return DASH;
  return teachers.find((t) => t.id === id)?.name ?? DASH;
}

function studentDisplayName(student: Student | undefined): string {
  if (!student) return DASH;
  return `${getStudentNickname(student)} ${student.lastName}`.trim() || student.firstName || DASH;
}

function safePoints(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function formatDateTime(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return DASH;
  return new Date(value).toLocaleString();
}

function formatDate(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return DASH;
  return new Date(value).toLocaleDateString();
}

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function endOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).getTime();
}

function parseDateInput(value: string, boundary: 'start' | 'end'): number | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  return boundary === 'start' ? startOfLocalDay(date) : endOfLocalDay(date);
}

function dateRangeBounds(range: DateRangeFilter, customStart: string, customEnd: string): { start: number | null; end: number | null } {
  const now = new Date();
  if (range === 'today') return { start: startOfLocalDay(now), end: endOfLocalDay(now) };
  if (range === '7-days') return { start: startOfLocalDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)), end: endOfLocalDay(now) };
  if (range === '30-days') return { start: startOfLocalDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)), end: endOfLocalDay(now) };
  if (range === 'custom') return { start: parseDateInput(customStart, 'start'), end: parseDateInput(customEnd, 'end') };
  return { start: null, end: null };
}

function isInDateRange(value: unknown, bounds: { start: number | null; end: number | null }): boolean {
  if (bounds.start == null && bounds.end == null) return true;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return false;
  if (bounds.start != null && value < bounds.start) return false;
  if (bounds.end != null && value > bounds.end) return false;
  return true;
}

function csvEscape(value: unknown): string {
  const text = value == null ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function reportTitle(kind: ReportKind): string {
  switch (kind) {
    case 'summary':
      return 'Executive summary';
    case 'roster':
      return 'Student roster';
    case 'balances':
      return 'Student balances';
    case 'redemptions':
      return 'Coupon redemptions';
    case 'coupons':
      return 'Coupon inventory';
    case 'prizes':
      return 'Rewards Shop';
    case 'classes':
      return 'Classes overview';
    case 'homework':
      return 'Homework rewards';
  }
}

type ReportOptionsVisibility = {
  rosterSort: boolean;
  dateRange: boolean;
  couponStatus: boolean;
  prizeStock: boolean;
  includeIds: boolean;
  includeDates: boolean;
  includeCategoryColumns: boolean;
};

function reportOptionsVisibility(kind: ReportKind): ReportOptionsVisibility {
  // Keep this as the single source of truth for which filters apply to which report types.
  // If you add a new option control, add it here too so the UI always matches behavior.
  switch (kind) {
    case 'summary':
      return {
        rosterSort: false,
        dateRange: true,
        couponStatus: false,
        prizeStock: false,
        includeIds: false,
        includeDates: false,
        includeCategoryColumns: false,
      };
    case 'roster':
      return {
        rosterSort: true,
        dateRange: true,
        couponStatus: false,
        prizeStock: false,
        includeIds: true,
        includeDates: true,
        includeCategoryColumns: true,
      };
    case 'balances':
      return {
        rosterSort: true,
        dateRange: true,
        couponStatus: false,
        prizeStock: false,
        includeIds: false,
        includeDates: true,
        includeCategoryColumns: true,
      };
    case 'redemptions':
      return {
        rosterSort: false,
        dateRange: true,
        couponStatus: true,
        prizeStock: false,
        includeIds: false,
        includeDates: true,
        includeCategoryColumns: false,
      };
    case 'coupons':
      return {
        rosterSort: false,
        dateRange: true,
        couponStatus: true,
        prizeStock: false,
        includeIds: false,
        includeDates: true,
        includeCategoryColumns: false,
      };
    case 'prizes':
      return {
        rosterSort: false,
        dateRange: false,
        couponStatus: false,
        prizeStock: true,
        includeIds: false,
        includeDates: false,
        includeCategoryColumns: false,
      };
    case 'classes':
      return {
        rosterSort: false,
        dateRange: true,
        couponStatus: false,
        prizeStock: false,
        includeIds: false,
        includeDates: false,
        includeCategoryColumns: false,
      };
    case 'homework':
      return {
        rosterSort: true,
        dateRange: true,
        couponStatus: false,
        prizeStock: false,
        includeIds: false,
        includeDates: false,
        includeCategoryColumns: false,
      };
  }
}

export function SchoolReportsPanel({
  scope,
  schoolName,
  teacherId,
  teacherName,
  students: allStudents,
  classes,
  teachers,
  coupons: allCoupons,
  prizes: allPrizes,
  categories,
  /** School raffle setting; defaults to 25 pts/ticket when omitted (matches app defaults). */
  rafflePointsPerTicket: rafflePointsPerTicketProp,
}: {
  scope: 'school' | 'teacher';
  schoolName: string;
  teacherId?: string;
  teacherName?: string;
  students: Student[];
  classes: Class[];
  teachers: Teacher[];
  coupons: Coupon[];
  prizes: Prize[];
  categories: Category[];
  rafflePointsPerTicket?: number;
}) {
  const { isGeneralRaffle, pointsPerTicket: rafflePtsPerTicket } = useMemo(
    () => parseRafflePointsPerTicket(rafflePointsPerTicketProp ?? 25),
    [rafflePointsPerTicketProp],
  );

  const raffleFullTicketsForStudent = useCallback(
    (s: Student) =>
      isGeneralRaffle ? 1 : floorRaffleFullTickets(safePoints(s.points), rafflePtsPerTicket),
    [isGeneralRaffle, rafflePtsPerTicket],
  );

  const raffleRuleLabel = isGeneralRaffle
    ? 'General raffle (1 entry per student in this list)'
    : `${rafflePtsPerTicket} pts per full raffle ticket`;
  const [reportKind, setReportKind] = useState<ReportKind>('summary');
  const [classFilter, setClassFilter] = useState('all');
  const [rosterSort, setRosterSort] = useState<RosterSort>('class-name');
  const [couponStatus, setCouponStatus] = useState<CouponStatusFilter>('all');
  const [prizeStock, setPrizeStock] = useState<PrizeStockFilter>('all');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [includeIds, setIncludeIds] = useState(true);
  const [includeDates, setIncludeDates] = useState(true);
  const [includeCategoryColumns, setIncludeCategoryColumns] = useState(false);

  const dateBounds = useMemo(
    () => dateRangeBounds(dateRange, customStartDate, customEndDate),
    [dateRange, customStartDate, customEndDate],
  );

  const dateRangeLabel = useMemo(() => {
    if (dateRange === 'all') return 'All dates';
    if (dateRange === 'today') return 'Today';
    if (dateRange === '7-days') return 'Last 7 days';
    if (dateRange === '30-days') return 'Last 30 days';
    const start = customStartDate || 'Any start';
    const end = customEndDate || 'Any end';
    return `${start} to ${end}`;
  }, [dateRange, customStartDate, customEndDate]);

  const scopedStudents = useMemo(() => {
    if (scope === 'school') return allStudents;
    if (!teacherId) return [];
    return studentsInTeacherScope(teacherId, allStudents, classes);
  }, [scope, teacherId, allStudents, classes]);

  const students = useMemo(() => {
    const classFiltered =
      classFilter === 'all'
        ? scopedStudents
        : classFilter === 'unassigned'
          ? scopedStudents.filter((s) => !s.classId)
          : scopedStudents.filter((s) => s.classId === classFilter);
    return classFiltered.filter((student) => isInDateRange(student.createdAt, dateBounds));
  }, [scopedStudents, classFilter, dateBounds]);

  const studentById = useMemo(() => new Map(allStudents.map((s) => [s.id, s])), [allStudents]);

  const couponsInScope = useMemo(
    () =>
      scope === 'school'
        ? allCoupons
        : teacherId
          ? couponsForTeacherReport(teacherId, allCoupons, 'teacher')
          : [],
    [scope, teacherId, allCoupons],
  );

  const coupons = useMemo(() => {
    const now = Date.now();
    return couponsInScope.filter((coupon) => {
      if (couponStatus === 'unused' && coupon.used) return false;
      if (couponStatus === 'redeemed' && !coupon.used) return false;
      if (couponStatus === 'expired' && (!coupon.expiresAt || coupon.expiresAt >= now)) return false;
      const relevantDate = reportKind === 'redemptions' ? coupon.usedAt : coupon.createdAt;
      if (!isInDateRange(relevantDate, dateBounds)) return false;
      return true;
    });
  }, [couponsInScope, couponStatus, dateBounds, reportKind]);

  const prizesInScope = useMemo(() => {
    if (scope === 'school') return allPrizes;
    if (!teacherId) return [];
    return prizesForTeacherReport(teacherId, allPrizes);
  }, [scope, teacherId, allPrizes]);

  const prizes = useMemo(
    () =>
      prizesInScope.filter((prize) => {
        if (prizeStock === 'in-stock') return prize.inStock && (typeof prize.stockCount !== 'number' || prize.stockCount > 0);
        if (prizeStock === 'out-of-stock') return !prize.inStock || prize.stockCount === 0;
        if (prizeStock === 'limited') return prize.inStock && typeof prize.stockCount === 'number';
        return true;
      }),
    [prizesInScope, prizeStock],
  );

  const categoriesInScope = useMemo(() => {
    if (scope === 'school') return categories;
    if (!teacherId) return [];
    return categories.filter((c) => !c.teacherId || c.teacherId === teacherId);
  }, [scope, teacherId, categories]);

  const redeemedCouponsInDateRange = useMemo(
    () => couponsInScope.filter((c) => c.used && isInDateRange(c.usedAt, dateBounds)),
    [couponsInScope, dateBounds],
  );

  const usedCouponsCount = useMemo(() => redeemedCouponsInDateRange.length, [redeemedCouponsInDateRange]);
  const totalCouponValueRedeemed = useMemo(
    () => redeemedCouponsInDateRange.reduce((sum, c) => sum + safePoints(c.value), 0),
    [redeemedCouponsInDateRange],
  );

  const lifetimeIssued = useMemo(
    () => students.reduce((sum, s) => sum + safePoints(s.lifetimePoints ?? s.points), 0),
    [students],
  );

  const totalRaffleFullTickets = useMemo(
    () => students.reduce((sum, s) => sum + raffleFullTicketsForStudent(s), 0),
    [students, raffleFullTicketsForStudent],
  );

  const classesForScope = useMemo(() => {
    if (scope === 'school') return classes;
    if (!teacherId) return [];
    return classes.filter((c) => c.primaryTeacherId === teacherId);
  }, [scope, teacherId, classes]);

  const classOptions = useMemo(() => {
    const classIdsWithStudents = new Set(scopedStudents.map((s) => s.classId).filter(Boolean));
    const allowedClasses = (scope === 'school' ? classes : classesForScope).filter((c) => classIdsWithStudents.has(c.id));
    return [...allowedClasses].sort((a, b) => a.name.localeCompare(b.name));
  }, [scope, classes, classesForScope, scopedStudents]);

  useEffect(() => {
    if (classFilter === 'all' || classFilter === 'unassigned') return;
    if (!classOptions.some((c) => c.id === classFilter)) setClassFilter('all');
  }, [classFilter, classOptions]);

  const rosterRows = useMemo(() => {
    const sorted = [...students].sort((a, b) => {
      if (rosterSort === 'points-desc') return safePoints(b.points) - safePoints(a.points);
      if (rosterSort === 'lifetime-desc') return safePoints(b.lifetimePoints ?? b.points) - safePoints(a.lifetimePoints ?? a.points);
      if (rosterSort === 'name') return studentDisplayName(a).localeCompare(studentDisplayName(b));
      const ca = classNameForStudent(a.classId, classes);
      const cb = classNameForStudent(b.classId, classes);
      if (ca !== cb) return ca.localeCompare(cb);
      return studentDisplayName(a).localeCompare(studentDisplayName(b));
    });
    return sorted.map((s) => ({
      id: s.id,
      name: studentDisplayName(s),
      cls: classNameForStudent(s.classId, classes),
      points: safePoints(s.points),
      lifetime: safePoints(s.lifetimePoints ?? s.points),
      nfc: s.nfcId || DASH,
      createdAt: formatDate(s.createdAt),
      categoryPoints: s.categoryPoints ?? {},
      raffleTickets: raffleFullTicketsForStudent(s),
    }));
  }, [students, classes, rosterSort, raffleFullTicketsForStudent]);

  const couponAgg = useMemo(() => {
    const byCat = new Map<
      string,
      {
        unused: number;
        used: number;
        expired: number;
        valueUnused: number;
        valueUsed: number;
        firstCreatedAt: number | null;
        lastCreatedAt: number | null;
        firstExpiresAt: number | null;
        lastExpiresAt: number | null;
      }
    >();
    const now = Date.now();
    for (const c of coupons) {
      const k = c.category || 'Other';
      const cur = byCat.get(k) ?? {
        unused: 0,
        used: 0,
        expired: 0,
        valueUnused: 0,
        valueUsed: 0,
        firstCreatedAt: null,
        lastCreatedAt: null,
        firstExpiresAt: null,
        lastExpiresAt: null,
      };
      if (typeof c.createdAt === 'number' && Number.isFinite(c.createdAt) && c.createdAt > 0) {
        cur.firstCreatedAt = cur.firstCreatedAt == null ? c.createdAt : Math.min(cur.firstCreatedAt, c.createdAt);
        cur.lastCreatedAt = cur.lastCreatedAt == null ? c.createdAt : Math.max(cur.lastCreatedAt, c.createdAt);
      }
      if (typeof c.expiresAt === 'number' && Number.isFinite(c.expiresAt) && c.expiresAt > 0) {
        cur.firstExpiresAt = cur.firstExpiresAt == null ? c.expiresAt : Math.min(cur.firstExpiresAt, c.expiresAt);
        cur.lastExpiresAt = cur.lastExpiresAt == null ? c.expiresAt : Math.max(cur.lastExpiresAt, c.expiresAt);
      }
      if (c.expiresAt && c.expiresAt < now) cur.expired += 1;
      if (c.used) {
        cur.used += 1;
        cur.valueUsed += safePoints(c.value);
      } else {
        cur.unused += 1;
        cur.valueUnused += safePoints(c.value);
      }
      byCat.set(k, cur);
    }
    return [...byCat.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [coupons]);

  const redemptionRows = useMemo(
    () =>
      coupons
        .filter((c) => c.used)
        .sort((a, b) => safePoints(b.usedAt) - safePoints(a.usedAt))
        .map((c) => {
          const student = c.usedBy ? studentById.get(c.usedBy) : undefined;
          return {
            id: c.id,
            code: c.code || c.id,
            category: c.category || 'Other',
            value: safePoints(c.value),
            teacher: c.teacher || DASH,
            student: studentDisplayName(student),
            usedAt: formatDateTime(c.usedAt),
            createdAt: formatDate(c.createdAt),
          };
        }),
    [coupons, studentById],
  );

  const classRows = useMemo(() => {
    const list = scope === 'school' ? classes : classesForScope;
    return [...list]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((cl) => ({
        id: cl.id,
        name: cl.name,
        primary: teacherNameById(teachers, cl.primaryTeacherId),
        count: students.filter((s) => s.classId === cl.id).length,
        points: students.filter((s) => s.classId === cl.id).reduce((sum, s) => sum + safePoints(s.points), 0),
        lifetime: students.filter((s) => s.classId === cl.id).reduce((sum, s) => sum + safePoints(s.lifetimePoints ?? s.points), 0),
        raffleTickets: students
          .filter((s) => s.classId === cl.id)
          .reduce((sum, s) => sum + raffleFullTicketsForStudent(s), 0),
      }));
  }, [scope, classes, classesForScope, teachers, students, raffleFullTicketsForStudent]);

  const categoryTotals = useMemo(
    () =>
      categoriesInScope
        .map((category) => ({
          id: category.id,
          name: category.name,
          points: students.reduce((sum, student) => sum + safePoints(student.categoryPoints?.[category.name]), 0),
        }))
        .filter((row) => row.points > 0)
        .sort((a, b) => b.points - a.points),
    [categoriesInScope, students],
  );

  /** Reward titles derived from `categoryPoints` keys `Homework: &lt;title&gt;` (same as Homework Rewards payouts). */
  const homeworkColumnTitles = useMemo(() => {
    const titles = new Set<string>();
    for (const s of students) {
      const cp = s.categoryPoints ?? {};
      for (const key of Object.keys(cp)) {
        if (key.startsWith(HOMEWORK_REWARD_CATEGORY_PREFIX)) {
          titles.add(key.slice(HOMEWORK_REWARD_CATEGORY_PREFIX.length));
        }
      }
    }
    return [...titles].sort((a, b) => a.localeCompare(b));
  }, [students]);

  const homeworkRows = useMemo(() => {
    const sorted = [...students].sort((a, b) => {
      if (rosterSort === 'points-desc') return safePoints(b.points) - safePoints(a.points);
      if (rosterSort === 'lifetime-desc') return safePoints(b.lifetimePoints ?? b.points) - safePoints(a.lifetimePoints ?? a.points);
      if (rosterSort === 'name') return studentDisplayName(a).localeCompare(studentDisplayName(b));
      const ca = classNameForStudent(a.classId, classes);
      const cb = classNameForStudent(b.classId, classes);
      if (ca !== cb) return ca.localeCompare(cb);
      return studentDisplayName(a).localeCompare(studentDisplayName(b));
    });
    return sorted.map((s) => {
      const byTitle: Record<string, number> = {};
      let total = 0;
      for (const title of homeworkColumnTitles) {
        const key = homeworkRewardCategoryKey(title);
        const pts = safePoints(s.categoryPoints?.[key]);
        byTitle[title] = pts;
        total += pts;
      }
      return {
        id: s.id,
        name: studentDisplayName(s),
        cls: classNameForStudent(s.classId, classes),
        byTitle,
        total,
      };
    });
  }, [students, classes, rosterSort, homeworkColumnTitles]);

  const homeworkGrandTotal = useMemo(
    () => homeworkRows.reduce((sum, row) => sum + row.total, 0),
    [homeworkRows],
  );

  const scopeLabel =
    scope === 'school'
      ? 'School-wide'
      : teacherName
        ? `Teacher: ${teacherName}`
        : 'My classes & students';

  const selectedClassLabel =
    classFilter === 'all'
      ? 'All classes'
      : classFilter === 'unassigned'
        ? 'Unassigned students'
        : classes.find((c) => c.id === classFilter)?.name ?? 'Selected class';

  const optionsVisibility = useMemo(() => reportOptionsVisibility(reportKind), [reportKind]);

  const previewLine = useMemo(() => {
    const bits: string[] = [];
    bits.push(reportTitle(reportKind));
    bits.push(scopeLabel);
    bits.push(selectedClassLabel);
    if (optionsVisibility.dateRange) bits.push(`Date: ${dateRangeLabel}`);
    if (optionsVisibility.rosterSort) bits.push(`Sort: ${rosterSort.replaceAll('-', ' ')}`);
    if (optionsVisibility.couponStatus) {
      const statusLabel =
        couponStatus === 'all'
          ? 'All coupons'
          : couponStatus === 'unused'
            ? 'Unused only'
            : couponStatus === 'redeemed'
              ? 'Redeemed only'
              : 'Expired only';
      bits.push(`Status: ${statusLabel}`);
    }
    if (optionsVisibility.prizeStock) {
      const stockLabel =
        prizeStock === 'all'
          ? 'All items'
          : prizeStock === 'in-stock'
            ? 'In stock'
            : prizeStock === 'out-of-stock'
              ? 'Out of stock'
              : 'Limited qty';
      bits.push(`Stock: ${stockLabel}`);
    }
    if (optionsVisibility.includeDates) bits.push(includeDates ? 'Dates: on' : 'Dates: off');
    if (optionsVisibility.includeIds) bits.push(includeIds ? 'IDs: on' : 'IDs: off');
    if (optionsVisibility.includeCategoryColumns) bits.push(includeCategoryColumns ? 'Categories: on' : 'Categories: off');
    return bits.join(' • ');
  }, [
    reportKind,
    scopeLabel,
    selectedClassLabel,
    optionsVisibility,
    dateRangeLabel,
    rosterSort,
    couponStatus,
    prizeStock,
    includeDates,
    includeIds,
    includeCategoryColumns,
  ]);

  const [printing, setPrinting] = useState(false);
  const [printReady, setPrintReady] = useState(false);
  const [generatedAt, setGeneratedAt] = useState('');

  const runPrint = useCallback(() => {
    setGeneratedAt(new Date().toLocaleString());
    setPrintReady(false);
    setPrinting(true);
  }, []);

  const handlePrintRootRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setPrintReady(true));
    });
  }, []);

  const runCsvExport = useCallback(() => {
    const baseName = `${(schoolName || 'school').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()}-${reportKind}`;
    const generated = new Date().toISOString().slice(0, 10);
    const meta = [
      ['School', schoolName || 'School'],
      ['Scope', scopeLabel],
      ['Class filter', selectedClassLabel],
      ['Date range', dateRangeLabel],
      ['Raffle (for ticket counts)', raffleRuleLabel],
      ['Generated', new Date().toLocaleString()],
      [],
    ];

    if (reportKind === 'summary') {
      downloadCsv(`${baseName}-${generated}.csv`, [
        ...meta,
        ['Metric', 'Value'],
        ['Students in scope', students.length],
        [scope === 'school' ? 'Classes' : 'My classes', scope === 'school' ? classes.length : classesForScope.length],
        ['Teachers', scope === 'school' ? teachers.length : DASH],
        ['Total current points', students.reduce((sum, s) => sum + safePoints(s.points), 0)],
        ['Total lifetime points', lifetimeIssued],
        ['Coupons redeemed', usedCouponsCount],
        ['Coupon point value redeemed', totalCouponValueRedeemed],
        ['Incentive categories', categoriesInScope.length],
        ['Reward items listed', prizesInScope.length],
        ['Raffle tickets (from current balances)', totalRaffleFullTickets],
      ]);
      return;
    }

    if (reportKind === 'roster' || reportKind === 'balances') {
      const categoryNames = includeCategoryColumns ? categoriesInScope.map((c) => c.name) : [];
      downloadCsv(`${baseName}-${generated}.csv`, [
        ...meta,
        [
          'Student',
          'Class',
          ...(includeDates ? ['Student created'] : []),
          'Current points',
          'Lifetime points',
          'Raffle tickets',
          ...(includeIds ? ['ID / NFC'] : []),
          ...categoryNames,
        ],
        ...rosterRows.map((row) => [
          row.name,
          row.cls,
          ...(includeDates ? [row.createdAt] : []),
          row.points,
          row.lifetime,
          row.raffleTickets,
          ...(includeIds ? [row.nfc] : []),
          ...categoryNames.map((name) => safePoints(row.categoryPoints[name])),
        ]),
      ]);
      return;
    }

    if (reportKind === 'redemptions') {
      downloadCsv(`${baseName}-${generated}.csv`, [
        ...meta,
        ['Redeemed date', ...(includeDates ? ['Created date'] : []), 'Student', 'Category', 'Value', 'Teacher', 'Code'],
        ...redemptionRows.map((row) => [
          row.usedAt,
          ...(includeDates ? [row.createdAt] : []),
          row.student,
          row.category,
          row.value,
          row.teacher,
          row.code,
        ]),
      ]);
      return;
    }

    if (reportKind === 'coupons') {
      downloadCsv(`${baseName}-${generated}.csv`, [
        ...meta,
        [
          'Category',
          ...(includeDates ? ['First created', 'Last created', 'First expiration', 'Last expiration'] : []),
          'Unused count',
          'Redeemed count',
          'Expired count',
          'Unused face value',
          'Redeemed value',
        ],
        ...couponAgg.map(([cat, row]) => [
          cat,
          ...(includeDates
            ? [formatDate(row.firstCreatedAt), formatDate(row.lastCreatedAt), formatDate(row.firstExpiresAt), formatDate(row.lastExpiresAt)]
            : []),
          row.unused,
          row.used,
          row.expired,
          row.valueUnused,
          row.valueUsed,
        ]),
      ]);
      return;
    }

    if (reportKind === 'prizes') {
      downloadCsv(`${baseName}-${generated}.csv`, [
        ...meta,
        ['Prize', 'Cost', 'Stock status', 'Quantity'],
        ...prizes
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((p) => [p.name, safePoints(p.points), p.inStock ? 'In stock' : 'Out of stock', typeof p.stockCount === 'number' ? p.stockCount : 'Unlimited']),
      ]);
      return;
    }

    if (reportKind === 'homework') {
      if (homeworkColumnTitles.length === 0) {
        downloadCsv(`${baseName}-${generated}.csv`, [
          ...meta,
          ['Note', 'No homework reward totals found. Points from the Homework Rewards tab are stored under category keys Homework: <title>.'],
        ]);
        return;
      }
      const colHeaders = homeworkColumnTitles.map((t) => homeworkRewardCategoryKey(t));
      const totalsByTitle = homeworkColumnTitles.map((t) =>
        homeworkRows.reduce((sum, row) => sum + safePoints(row.byTitle[t]), 0),
      );
      downloadCsv(`${baseName}-${generated}.csv`, [
        ...meta,
        ['Student', 'Class', ...colHeaders, 'Total homework pts'],
        ...homeworkRows.map((row) => [
          row.name,
          row.cls,
          ...homeworkColumnTitles.map((t) => safePoints(row.byTitle[t])),
          row.total,
        ]),
        ['TOTAL', '', ...totalsByTitle, homeworkGrandTotal],
      ]);
      return;
    }

    downloadCsv(`${baseName}-${generated}.csv`, [
      ...meta,
      ['Class', 'Primary teacher', 'Students in scope', 'Current points', 'Lifetime points', 'Raffle tickets'],
      ...classRows.map((row) => [row.name, row.primary, row.count, row.points, row.lifetime, row.raffleTickets]),
    ]);
  }, [
    reportKind,
    schoolName,
    scopeLabel,
    selectedClassLabel,
    students,
    scope,
    classes.length,
    classesForScope.length,
    teachers.length,
    lifetimeIssued,
    usedCouponsCount,
    totalCouponValueRedeemed,
    categoriesInScope,
    prizesInScope.length,
    includeCategoryColumns,
    includeDates,
    includeIds,
    dateRangeLabel,
    raffleRuleLabel,
    totalRaffleFullTickets,
    rosterRows,
    redemptionRows,
    couponAgg,
    prizes,
    classRows,
    homeworkColumnTitles,
    homeworkRows,
    homeworkGrandTotal,
  ]);

  useEffect(() => {
    if (!printing) return;
    document.body.classList.add('school-reports-printing');
    return () => {
      document.body.classList.remove('school-reports-printing');
    };
  }, [printing]);

  useEffect(() => {
    if (!printing || !printReady) return;
    let settled = false;

    const done = () => {
      if (settled) return;
      settled = true;
      document.body.classList.remove('school-reports-printing');
      setPrintReady(false);
      setPrinting(false);
    };

    const printTimer = window.setTimeout(() => {
      try {
        window.print();
      } catch {
        done();
      }
    }, 150);
    const fallbackTimer = window.setTimeout(done, 60000);

    window.addEventListener('afterprint', done);
    return () => {
      window.clearTimeout(printTimer);
      window.clearTimeout(fallbackTimer);
      window.removeEventListener('afterprint', done);
    };
  }, [printReady, printing]);

  const SummaryReport = () => (
    <section className="space-y-4">
      <h2 className="text-lg font-bold border-b border-neutral-400 pb-1">Executive summary</h2>
      <table className="w-full border-collapse border border-black text-sm">
        <tbody>
          <tr>
            <td className="border border-black p-2 font-semibold">Students in scope</td>
            <td className="border border-black p-2 text-right">{students.length}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-semibold">{scope === 'school' ? 'Classes' : 'My classes'}</td>
            <td className="border border-black p-2 text-right">{scope === 'school' ? classes.length : classesForScope.length}</td>
          </tr>
          {scope === 'school' ? (
            <tr>
              <td className="border border-black p-2 font-semibold">Teachers</td>
              <td className="border border-black p-2 text-right">{teachers.length}</td>
            </tr>
          ) : null}
          <tr>
            <td className="border border-black p-2 font-semibold">Current points held</td>
            <td className="border border-black p-2 text-right">{students.reduce((sum, s) => sum + safePoints(s.points), 0).toLocaleString()} pts</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-semibold">Total lifetime points</td>
            <td className="border border-black p-2 text-right">{lifetimeIssued.toLocaleString()} pts</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-semibold">Coupons redeemed</td>
            <td className="border border-black p-2 text-right">{usedCouponsCount.toLocaleString()}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-semibold">Coupon point value redeemed</td>
            <td className="border border-black p-2 text-right">{totalCouponValueRedeemed.toLocaleString()} pts</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-semibold">Incentive categories</td>
            <td className="border border-black p-2 text-right">{categoriesInScope.length}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-semibold">Reward items listed</td>
            <td className="border border-black p-2 text-right">{prizesInScope.length}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-semibold">Raffle tickets (current balances)</td>
            <td className="border border-black p-2 text-right">{totalRaffleFullTickets.toLocaleString()}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 text-xs text-neutral-700" colSpan={2}>
              {raffleRuleLabel}
            </td>
          </tr>
        </tbody>
      </table>
      {categoryTotals.length > 0 ? (
        <table className="w-full border-collapse border border-black text-[10pt]">
          <thead>
            <tr className="bg-neutral-100">
              <th className="border border-black p-1.5 text-left">Top category balances</th>
              <th className="border border-black p-1.5 text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            {categoryTotals.slice(0, 8).map((row) => (
              <tr key={row.id}>
                <td className="border border-black p-1.5">{row.name}</td>
                <td className="border border-black p-1.5 text-right">{row.points.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );

  const RosterReport = ({ balancesOnly = false }: { balancesOnly?: boolean }) => (
    <section className="space-y-3">
      <h2 className="text-lg font-bold border-b border-neutral-400 pb-1">{balancesOnly ? 'Student balances' : 'Student roster'}</h2>
      <table className="w-full border-collapse border border-black text-[10pt]">
        <thead>
          <tr className="bg-neutral-100">
            <th className="border border-black p-1.5 text-left">Student</th>
            <th className="border border-black p-1.5 text-left">Class</th>
            {includeDates ? <th className="border border-black p-1.5 text-left">Created</th> : null}
            <th className="border border-black p-1.5 text-right">Points</th>
            <th className="border border-black p-1.5 text-right">Lifetime</th>
            <th className="border border-black p-1.5 text-right">Raffle</th>
            {!balancesOnly && includeIds ? <th className="border border-black p-1.5 text-left">ID / NFC</th> : null}
            {includeCategoryColumns
              ? categoriesInScope.map((category) => (
                  <th key={category.id} className="border border-black p-1.5 text-right">
                    {category.name}
                  </th>
                ))
              : null}
          </tr>
        </thead>
        <tbody>
          {rosterRows.map((row) => (
            <tr key={row.id}>
              <td className="border border-black p-1.5">{row.name}</td>
              <td className="border border-black p-1.5">{row.cls}</td>
              {includeDates ? <td className="border border-black p-1.5">{row.createdAt}</td> : null}
              <td className="border border-black p-1.5 text-right">{row.points.toLocaleString()}</td>
              <td className="border border-black p-1.5 text-right">{row.lifetime.toLocaleString()}</td>
              <td className="border border-black p-1.5 text-right">{row.raffleTickets.toLocaleString()}</td>
              {!balancesOnly && includeIds ? <td className="border border-black p-1.5 font-mono text-[9pt]">{row.nfc}</td> : null}
              {includeCategoryColumns
                ? categoriesInScope.map((category) => (
                    <td key={category.id} className="border border-black p-1.5 text-right">
                      {safePoints(row.categoryPoints[category.name]).toLocaleString()}
                    </td>
                  ))
                : null}
            </tr>
          ))}
        </tbody>
      </table>
      {rosterRows.length === 0 ? <p className="text-sm italic">No students match this report.</p> : null}
      <p className="text-[9pt] text-neutral-800 mt-2 max-w-[7in]">
        Raffle column: {raffleRuleLabel}
        {isGeneralRaffle ? '' : ' (full tickets from current point balances).'}
      </p>
    </section>
  );

  const printNode =
    printing && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={handlePrintRootRef}
            id="school-reports-print-wrapper"
            className="school-reports-print-root bg-white text-black text-[11pt] leading-snug"
          >
            <header className="border-b border-black pb-3 mb-4">
              <h1 className="text-xl font-bold">{schoolName || 'School'} - Reports</h1>
              <p className="text-sm mt-1">{scopeLabel}</p>
              <p className="text-xs text-neutral-700 mt-1">Class filter: {selectedClassLabel}</p>
              <p className="text-xs text-neutral-700 mt-1">Date range: {dateRangeLabel}</p>
              <p className="text-xs text-neutral-700 mt-1">Generated {generatedAt}</p>
            </header>

            {reportKind === 'summary' && <SummaryReport />}
            {reportKind === 'roster' && <RosterReport />}
            {reportKind === 'balances' && <RosterReport balancesOnly />}
            {reportKind === 'redemptions' && (
              <section className="space-y-3">
                <h2 className="text-lg font-bold border-b border-neutral-400 pb-1">Coupon redemptions</h2>
                <table className="w-full border-collapse border border-black text-[10pt]">
                  <thead>
                    <tr className="bg-neutral-100">
                      <th className="border border-black p-1.5 text-left">Redeemed</th>
                      {includeDates ? <th className="border border-black p-1.5 text-left">Created</th> : null}
                      <th className="border border-black p-1.5 text-left">Student</th>
                      <th className="border border-black p-1.5 text-left">Category</th>
                      <th className="border border-black p-1.5 text-right">Value</th>
                      <th className="border border-black p-1.5 text-left">Teacher</th>
                      <th className="border border-black p-1.5 text-left">Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {redemptionRows.map((row) => (
                      <tr key={row.id}>
                        <td className="border border-black p-1.5">{row.usedAt}</td>
                        {includeDates ? <td className="border border-black p-1.5">{row.createdAt}</td> : null}
                        <td className="border border-black p-1.5">{row.student}</td>
                        <td className="border border-black p-1.5">{row.category}</td>
                        <td className="border border-black p-1.5 text-right">{row.value.toLocaleString()}</td>
                        <td className="border border-black p-1.5">{row.teacher}</td>
                        <td className="border border-black p-1.5 font-mono text-[9pt]">{row.code}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {redemptionRows.length === 0 ? <p className="text-sm italic">No redeemed coupons match this report.</p> : null}
              </section>
            )}
            {reportKind === 'coupons' && (
              <section className="space-y-3">
                <h2 className="text-lg font-bold border-b border-neutral-400 pb-1">Coupon inventory</h2>
                <p className="text-sm">
                  Showing {coupons.length} of {couponsInScope.length} coupons in scope.
                </p>
                <table className="w-full border-collapse border border-black text-[10pt]">
                  <thead>
                    <tr className="bg-neutral-100">
                      <th className="border border-black p-1.5 text-left">Category</th>
                      {includeDates ? <th className="border border-black p-1.5 text-left">Created range</th> : null}
                      {includeDates ? <th className="border border-black p-1.5 text-left">Expiration range</th> : null}
                      <th className="border border-black p-1.5 text-right">Unused #</th>
                      <th className="border border-black p-1.5 text-right">Redeemed #</th>
                      <th className="border border-black p-1.5 text-right">Expired #</th>
                      <th className="border border-black p-1.5 text-right">Pts unused</th>
                      <th className="border border-black p-1.5 text-right">Pts redeemed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {couponAgg.map(([cat, v]) => (
                      <tr key={cat}>
                        <td className="border border-black p-1.5">{cat}</td>
                        {includeDates ? (
                          <td className="border border-black p-1.5">
                            {formatDate(v.firstCreatedAt)} to {formatDate(v.lastCreatedAt)}
                          </td>
                        ) : null}
                        {includeDates ? (
                          <td className="border border-black p-1.5">
                            {formatDate(v.firstExpiresAt)} to {formatDate(v.lastExpiresAt)}
                          </td>
                        ) : null}
                        <td className="border border-black p-1.5 text-right">{v.unused}</td>
                        <td className="border border-black p-1.5 text-right">{v.used}</td>
                        <td className="border border-black p-1.5 text-right">{v.expired}</td>
                        <td className="border border-black p-1.5 text-right">{v.valueUnused.toLocaleString()}</td>
                        <td className="border border-black p-1.5 text-right">{v.valueUsed.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {couponAgg.length === 0 ? <p className="text-sm italic">No coupons match this report.</p> : null}
              </section>
            )}
            {reportKind === 'prizes' && (
              <section className="space-y-3">
                <h2 className="text-lg font-bold border-b border-neutral-400 pb-1">Rewards Shop</h2>
                <table className="w-full border-collapse border border-black text-[10pt]">
                  <thead>
                    <tr className="bg-neutral-100">
                      <th className="border border-black p-1.5 text-left">Prize</th>
                      <th className="border border-black p-1.5 text-right">Cost</th>
                      <th className="border border-black p-1.5 text-left">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...prizes].sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
                      <tr key={p.id}>
                        <td className="border border-black p-1.5">{p.name}</td>
                        <td className="border border-black p-1.5 text-right">{safePoints(p.points).toLocaleString()}</td>
                        <td className="border border-black p-1.5">
                          {!p.inStock ? 'Out of stock' : typeof p.stockCount === 'number' ? p.stockCount : 'Unlimited'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {prizes.length === 0 ? <p className="text-sm italic">No reward items match this report.</p> : null}
              </section>
            )}
            {reportKind === 'classes' && (
              <section className="space-y-3">
                <h2 className="text-lg font-bold border-b border-neutral-400 pb-1">Classes overview</h2>
                <table className="w-full border-collapse border border-black text-[10pt]">
                  <thead>
                    <tr className="bg-neutral-100">
                      <th className="border border-black p-1.5 text-left">Class</th>
                      <th className="border border-black p-1.5 text-left">Primary teacher</th>
                      <th className="border border-black p-1.5 text-right">Students</th>
                      <th className="border border-black p-1.5 text-right">Current points</th>
                      <th className="border border-black p-1.5 text-right">Lifetime points</th>
                      <th className="border border-black p-1.5 text-right">Raffle tickets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classRows.map((row) => (
                      <tr key={row.id}>
                        <td className="border border-black p-1.5">{row.name}</td>
                        <td className="border border-black p-1.5">{row.primary}</td>
                        <td className="border border-black p-1.5 text-right">{row.count}</td>
                        <td className="border border-black p-1.5 text-right">{row.points.toLocaleString()}</td>
                        <td className="border border-black p-1.5 text-right">{row.lifetime.toLocaleString()}</td>
                        <td className="border border-black p-1.5 text-right">{row.raffleTickets.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
            {reportKind === 'homework' && (
              <section className="space-y-3">
                <h2 className="text-lg font-bold border-b border-neutral-400 pb-1">Homework rewards</h2>
                <p className="text-[10pt] text-neutral-800 max-w-[7in] leading-snug">
                  Cumulative homework reward points from the Homework Rewards tab (stored per student as{' '}
                  <span className="font-mono">Homework: …</span> balances). Date range here filters which students are included
                  (same as other reports), not the date each point was awarded.
                </p>
                {homeworkColumnTitles.length === 0 ? (
                  <p className="text-sm italic">No homework reward totals in this scope.</p>
                ) : (
                  <table className="w-full border-collapse border border-black text-[9pt]">
                    <thead>
                      <tr className="bg-neutral-100">
                        <th className="border border-black p-1 text-left">Student</th>
                        <th className="border border-black p-1 text-left">Class</th>
                        {homeworkColumnTitles.map((t) => (
                          <th key={t} className="border border-black p-1 text-right max-w-[120px] break-words">
                            {t}
                          </th>
                        ))}
                        <th className="border border-black p-1 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {homeworkRows.map((row) => (
                        <tr key={row.id}>
                          <td className="border border-black p-1">{row.name}</td>
                          <td className="border border-black p-1">{row.cls}</td>
                          {homeworkColumnTitles.map((t) => (
                            <td key={t} className="border border-black p-1 text-right">
                              {safePoints(row.byTitle[t]).toLocaleString()}
                            </td>
                          ))}
                          <td className="border border-black p-1 text-right font-semibold">{row.total.toLocaleString()}</td>
                        </tr>
                      ))}
                      <tr className="bg-neutral-50 font-semibold">
                        <td className="border border-black p-1" colSpan={2}>
                          Total
                        </td>
                        {homeworkColumnTitles.map((t) => (
                          <td key={t} className="border border-black p-1 text-right">
                            {homeworkRows.reduce((sum, r) => sum + safePoints(r.byTitle[t]), 0).toLocaleString()}
                          </td>
                        ))}
                        <td className="border border-black p-1 text-right">{homeworkGrandTotal.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </section>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <Card className="border-t-4 border-primary shadow-md">
        <CardHeader className="py-6 flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <FileText className="text-primary w-6 h-6" aria-hidden />
              Reports
            </CardTitle>
            <CardDescription>
              Printable and exportable summaries for documentation and meetings ({scopeLabel}).
            </CardDescription>
            <p className="text-xs text-muted-foreground mt-2">
              <Helper content="Print opens your browser dialog. CSV downloads the currently selected report with the filters shown here.">
                Print to paper, save as PDF, or export the current report as CSV.
              </Helper>
            </p>
          </div>
          <TabWalkthroughHeaderAction />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_minmax(180px,0.8fr)_auto] lg:items-end">
            <div className="space-y-2">
              <Label htmlFor="report-kind">Report type</Label>
              <Select value={reportKind} onValueChange={(v) => setReportKind(v as ReportKind)}>
                <SelectTrigger id="report-kind" className="rounded-xl h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Executive summary</SelectItem>
                  <SelectItem value="roster">Student roster</SelectItem>
                  <SelectItem value="balances">Student balances</SelectItem>
                  <SelectItem value="redemptions">Coupon redemptions</SelectItem>
                  <SelectItem value="coupons">Coupon inventory</SelectItem>
                  <SelectItem value="prizes">Rewards Shop</SelectItem>
                  <SelectItem value="classes">Classes overview</SelectItem>
                  <SelectItem value="homework">Homework rewards</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-filter">Class filter</Label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger id="class-filter" className="rounded-xl h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All classes</SelectItem>
                  <SelectItem value="unassigned">Unassigned students</SelectItem>
                  {classOptions.map((cl) => (
                    <SelectItem key={cl.id} value={cl.id}>
                      {cl.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" className="rounded-xl gap-2 h-11 shrink-0" onClick={runCsvExport}>
                <Download className="w-4 h-4" aria-hidden />
                CSV
              </Button>
              <Button type="button" className="rounded-xl gap-2 h-11 shrink-0" onClick={runPrint}>
                <Printer className="w-4 h-4" aria-hidden />
                Print / PDF
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground -mt-2">
            <span className="font-semibold text-foreground">Preview:</span> {previewLine}
          </p>

          <div className="rounded-xl border bg-background p-4">
            <div className="flex items-center gap-2 text-sm font-bold mb-4">
              <SlidersHorizontal className="w-4 h-4 text-primary" aria-hidden />
              Options
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {optionsVisibility.rosterSort ? (
                <div className="space-y-2">
                  <Label htmlFor="roster-sort">Student sort</Label>
                  <Select value={rosterSort} onValueChange={(v) => setRosterSort(v as RosterSort)}>
                    <SelectTrigger id="roster-sort" className="rounded-xl h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="class-name">Class, then name</SelectItem>
                      <SelectItem value="name">Student name</SelectItem>
                      <SelectItem value="points-desc">Current points high to low</SelectItem>
                      <SelectItem value="lifetime-desc">Lifetime points high to low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {optionsVisibility.dateRange ? (
                <div className="space-y-2">
                  <Label htmlFor="date-range">Date range</Label>
                  <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangeFilter)}>
                    <SelectTrigger id="date-range" className="rounded-xl h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All dates</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="7-days">Last 7 days</SelectItem>
                      <SelectItem value="30-days">Last 30 days</SelectItem>
                      <SelectItem value="custom">Custom range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {optionsVisibility.couponStatus ? (
                <div className="space-y-2">
                  <Label htmlFor="coupon-status">Coupon status</Label>
                  <Select value={couponStatus} onValueChange={(v) => setCouponStatus(v as CouponStatusFilter)}>
                    <SelectTrigger id="coupon-status" className="rounded-xl h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All coupons</SelectItem>
                      <SelectItem value="unused">Unused only</SelectItem>
                      <SelectItem value="redeemed">Redeemed only</SelectItem>
                      <SelectItem value="expired">Expired only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {optionsVisibility.prizeStock ? (
                <div className="space-y-2">
                  <Label htmlFor="prize-stock">Prize stock</Label>
                  <Select value={prizeStock} onValueChange={(v) => setPrizeStock(v as PrizeStockFilter)}>
                    <SelectTrigger id="prize-stock" className="rounded-xl h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All reward items</SelectItem>
                      <SelectItem value="in-stock">In stock</SelectItem>
                      <SelectItem value="out-of-stock">Out of stock</SelectItem>
                      <SelectItem value="limited">Limited quantity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {optionsVisibility.includeIds || optionsVisibility.includeDates || optionsVisibility.includeCategoryColumns ? (
                <div className="space-y-3 pt-1">
                  {optionsVisibility.includeIds ? (
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={includeIds} onCheckedChange={(checked) => setIncludeIds(checked === true)} />
                      Include student ID / NFC
                    </label>
                  ) : null}
                  {optionsVisibility.includeDates ? (
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={includeDates} onCheckedChange={(checked) => setIncludeDates(checked === true)} />
                      Include date columns
                    </label>
                  ) : null}
                  {optionsVisibility.includeCategoryColumns ? (
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={includeCategoryColumns}
                        onCheckedChange={(checked) => setIncludeCategoryColumns(checked === true)}
                      />
                      Include category columns
                    </label>
                  ) : null}
                </div>
              ) : null}
            </div>
            {optionsVisibility.dateRange && dateRange === 'custom' ? (
              <div className="grid gap-4 md:grid-cols-2 mt-4 max-w-xl">
                <div className="space-y-2">
                  <Label htmlFor="report-start-date">Start date</Label>
                  <Input
                    id="report-start-date"
                    type="date"
                    value={customStartDate}
                    onChange={(event) => setCustomStartDate(event.target.value)}
                    className="rounded-xl h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="report-end-date">End date</Label>
                  <Input
                    id="report-end-date"
                    type="date"
                    value={customEndDate}
                    onChange={(event) => setCustomEndDate(event.target.value)}
                    className="rounded-xl h-10"
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border bg-muted/30 p-4 overflow-x-auto">
            <div className="min-w-[640px] bg-white text-foreground rounded-lg border p-6 shadow-sm">
              <header className="border-b pb-3 mb-4">
                <h2 className="text-lg font-bold">{schoolName || 'School'} - Reports</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {scopeLabel} - {selectedClassLabel}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {reportTitle(reportKind)} preview - {dateRangeLabel}
                </p>
              </header>
              {reportKind === 'summary' && (
                <ul className="grid sm:grid-cols-2 gap-3 text-sm">
                  <li className="flex justify-between border-b border-dashed pb-2">
                    <span>Students in scope</span>
                    <span className="font-bold">{students.length}</span>
                  </li>
                  <li className="flex justify-between border-b border-dashed pb-2">
                    <span>Coupons redeemed</span>
                    <span className="font-bold">{usedCouponsCount}</span>
                  </li>
                  <li className="flex justify-between border-b border-dashed pb-2">
                    <span>Lifetime points</span>
                    <span className="font-bold">{lifetimeIssued.toLocaleString()} pts</span>
                  </li>
                  <li className="flex justify-between border-b border-dashed pb-2">
                    <span>Coupon value redeemed</span>
                    <span className="font-bold">{totalCouponValueRedeemed.toLocaleString()} pts</span>
                  </li>
                  <li className="flex justify-between border-b border-dashed pb-2">
                    <span>Raffle tickets (balances)</span>
                    <span className="font-bold">{totalRaffleFullTickets.toLocaleString()}</span>
                  </li>
                  <li className="text-xs text-muted-foreground col-span-2 -mt-1 pb-2">{raffleRuleLabel}</li>
                </ul>
              )}
              {reportKind === 'roster' && (
                <p className="text-sm text-muted-foreground">
                  {rosterRows.length} student{rosterRows.length === 1 ? '' : 's'} - sorted by {rosterSort.replace('-', ' ')}. Includes raffle
                  ticket counts ({raffleRuleLabel}).
                </p>
              )}
              {reportKind === 'balances' && (
                <p className="text-sm text-muted-foreground">
                  {rosterRows.length} student balance row{rosterRows.length === 1 ? '' : 's'}
                  {includeCategoryColumns ? ` with ${categoriesInScope.length} category column${categoriesInScope.length === 1 ? '' : 's'}` : ''}. Includes raffle
                  tickets ({raffleRuleLabel}).
                </p>
              )}
              {reportKind === 'redemptions' && (
                <p className="text-sm text-muted-foreground">
                  {redemptionRows.length} redeemed coupon{redemptionRows.length === 1 ? '' : 's'} match the current status filter.
                </p>
              )}
              {reportKind === 'coupons' && (
                <p className="text-sm text-muted-foreground">
                  {coupons.length} coupon{coupons.length === 1 ? '' : 's'} - {couponAgg.length} category row{couponAgg.length === 1 ? '' : 's'}.
                </p>
              )}
              {reportKind === 'prizes' && (
                <p className="text-sm text-muted-foreground">
                  {prizes.length} reward item{prizes.length === 1 ? '' : 's'} match the current stock filter.
                </p>
              )}
              {reportKind === 'classes' && (
                <p className="text-sm text-muted-foreground">
                  {classRows.length} class{classRows.length === 1 ? '' : 'es'} with student counts, point totals, and summed raffle tickets.
                </p>
              )}
              {reportKind === 'homework' && (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <Helper content="Uses each student’s running total for category keys named like “Homework:” plus the reward title (same as the Homework Rewards tab). This is cumulative balance per title, not a dated activity log.">
                    <p>
                      {homeworkColumnTitles.length === 0 ? (
                        <>No homework reward buckets yet in this scope.</>
                      ) : (
                        <>
                          <span className="font-semibold text-foreground">{homeworkColumnTitles.length}</span> reward title
                          {homeworkColumnTitles.length === 1 ? '' : 's'},{' '}
                          <span className="font-semibold text-foreground">{homeworkGrandTotal.toLocaleString()}</span> homework pts total across{' '}
                          <span className="font-semibold text-foreground">{homeworkRows.length}</span> student{homeworkRows.length === 1 ? '' : 's'}.
                        </>
                      )}
                    </p>
                  </Helper>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      {printNode}
    </>
  );
}
