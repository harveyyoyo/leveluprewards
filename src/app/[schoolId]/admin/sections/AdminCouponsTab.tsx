import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Ticket, Search, Trash2, X, ChevronsUpDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Helper } from '@/components/ui/helper';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminRecordListHeader } from '@/components/admin/AdminRecordListHeader';
import type { Coupon } from '@/lib/types';
import { couponRedemptionLabelForPrint } from '@/lib/couponRedemptionRules';

type CouponGroup = {
  key: string;
  category: string;
  teacher: string;
  value: number;
  scopeLine: string;
  count: number;
  latestAt: number;
  codesSample: string[];
};

const GROUP_PAGE_SIZE = 30;
const CODES_SAMPLE_SIZE = 12;

export function AdminCouponsTab({
  availableCoupons,
  redeemedCoupons,
  getStudentName,
  onDeleteCoupon,
  onPurgeRedeemed,
  schoolId,
}: {
  availableCoupons: Coupon[];
  redeemedCoupons: Coupon[];
  getStudentName: (id?: string) => string;
  onDeleteCoupon?: (id: string) => Promise<void>;
  onPurgeRedeemed?: () => Promise<void>;
  schoolId: string;
}) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [teacher, setTeacher] = useState('all');
  const [isPurging, setIsPurging] = useState(false);
  const [availableGroupsPage, setAvailableGroupsPage] = useState(1);
  const [redeemedGroupsPage, setRedeemedGroupsPage] = useState(1);
  const [expandedAvailableGroupKey, setExpandedAvailableGroupKey] = useState<string | null>(null);
  const [expandedRedeemedGroupKey, setExpandedRedeemedGroupKey] = useState<string | null>(null);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    [...availableCoupons, ...redeemedCoupons].forEach((c) => {
      if (c.category) cats.add(c.category);
    });
    return Array.from(cats).sort();
  }, [availableCoupons, redeemedCoupons]);

  const teachers = useMemo(() => {
    const ts = new Set<string>();
    [...availableCoupons, ...redeemedCoupons].forEach((c) => {
      if (c.teacher) ts.add(c.teacher);
    });
    return Array.from(ts).sort();
  }, [availableCoupons, redeemedCoupons]);

  const normalizedSearch = search.trim().toLowerCase();
  const isCodeSearch = normalizedSearch.length > 0;

  const filteredAvailable = useMemo(() => {
    return availableCoupons.filter((c) => {
      const matchesSearch = normalizedSearch.length === 0 || c.code.toLowerCase().includes(normalizedSearch);
      const matchesCategory = category === 'all' || c.category === category;
      const matchesTeacher = teacher === 'all' || c.teacher === teacher;
      return matchesSearch && matchesCategory && matchesTeacher;
    });
  }, [availableCoupons, normalizedSearch, category, teacher]);

  const filteredRedeemed = useMemo(() => {
    return redeemedCoupons.filter((c) => {
      const matchesSearch = normalizedSearch.length === 0 || c.code.toLowerCase().includes(normalizedSearch);
      const matchesCategory = category === 'all' || c.category === category;
      const matchesTeacher = teacher === 'all' || c.teacher === teacher;
      return matchesSearch && matchesCategory && matchesTeacher;
    });
  }, [redeemedCoupons, normalizedSearch, category, teacher]);

  const availableGroups = useMemo(() => {
    const groups = new Map<string, CouponGroup>();

    for (const c of filteredAvailable) {
      const scopeLine = couponRedemptionLabelForPrint(c) || '';
      const gCategory = c.category || 'Uncategorized';
      const gTeacher = c.teacher || 'Unknown';
      const key = `${gCategory}__${gTeacher}__${c.value}__${scopeLine}`;
      const createdAt = typeof c.createdAt === 'number' ? c.createdAt : new Date(c.createdAt).getTime();

      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, {
          key,
          category: gCategory,
          teacher: gTeacher,
          value: c.value,
          scopeLine,
          count: 1,
          latestAt: Number.isFinite(createdAt) ? createdAt : 0,
          codesSample: [c.code].filter(Boolean).slice(0, CODES_SAMPLE_SIZE),
        });
        continue;
      }

      existing.count += 1;
      if (Number.isFinite(createdAt)) existing.latestAt = Math.max(existing.latestAt, createdAt);
      if (existing.codesSample.length < CODES_SAMPLE_SIZE && c.code) existing.codesSample.push(c.code);
    }

    return Array.from(groups.values()).sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      if (a.teacher !== b.teacher) return a.teacher.localeCompare(b.teacher);
      if (a.value !== b.value) return b.value - a.value;
      return b.latestAt - a.latestAt;
    });
  }, [filteredAvailable]);

  const redeemedGroups = useMemo(() => {
    const groups = new Map<string, CouponGroup>();

    for (const c of filteredRedeemed) {
      const scopeLine = couponRedemptionLabelForPrint(c) || '';
      const gCategory = c.category || 'Uncategorized';
      const gTeacher = c.teacher || 'Unknown';
      const key = `${gCategory}__${gTeacher}__${c.value}__${scopeLine}`;
      const usedAtRaw = c.usedAt ?? c.createdAt;
      const usedAt = typeof usedAtRaw === 'number' ? usedAtRaw : new Date(usedAtRaw).getTime();

      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, {
          key,
          category: gCategory,
          teacher: gTeacher,
          value: c.value,
          scopeLine,
          count: 1,
          latestAt: Number.isFinite(usedAt) ? usedAt : 0,
          codesSample: [c.code].filter(Boolean).slice(0, CODES_SAMPLE_SIZE),
        });
        continue;
      }

      existing.count += 1;
      if (Number.isFinite(usedAt)) existing.latestAt = Math.max(existing.latestAt, usedAt);
      if (existing.codesSample.length < CODES_SAMPLE_SIZE && c.code) existing.codesSample.push(c.code);
    }

    return Array.from(groups.values()).sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      if (a.teacher !== b.teacher) return a.teacher.localeCompare(b.teacher);
      if (a.value !== b.value) return b.value - a.value;
      return b.latestAt - a.latestAt;
    });
  }, [filteredRedeemed]);

  const handlePurge = async () => {
    if (!onPurgeRedeemed) return;
    if (!window.confirm(`Are you sure you want to permanently delete all ${redeemedCoupons.length} redeemed coupons? This cannot be undone.`)) return;
    setIsPurging(true);
    try {
      await onPurgeRedeemed();
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <Card className="w-full border-t-4 border-primary shadow-md overflow-hidden">
      <CardHeader>
        <Helper content="This section lists coupons generated for this school: still available, and already redeemed by a student.">
          <CardTitle className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-destructive" /> Coupon Management
          </CardTitle>
        </Helper>
        <CardDescription>
          View all available and redeemed coupons in the system. To print coupons please go to the{' '}
          <Link href={`/${schoolId}/teacher`} className="text-primary hover:underline font-bold">
            Faculty Portal
          </Link>.
        </CardDescription>
      </CardHeader>

      <div className="px-6 pb-4 flex flex-wrap gap-4 items-end border-b">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-wider">Search Code</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Enter coupon code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl h-11"
            />
          </div>
        </div>
        <div className="w-full sm:w-48">
          <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-wider">Category</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="rounded-xl h-11">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-48">
          <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-wider">Teacher</label>
          <Select value={teacher} onValueChange={setTeacher}>
            <SelectTrigger className="rounded-xl h-11">
              <SelectValue placeholder="All Teachers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teachers</SelectItem>
              {teachers.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(search || category !== 'all' || teacher !== 'all') && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSearch('');
              setCategory('all');
              setTeacher('all');
              setAvailableGroupsPage(1);
              setRedeemedGroupsPage(1);
              setExpandedAvailableGroupKey(null);
              setExpandedRedeemedGroupKey(null);
            }}
            className="rounded-xl h-11 w-11"
            title="Clear filters"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <CardContent className="grid md:grid-cols-2 gap-6 pt-6">
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <h3 className="text-lg font-black tracking-tight">Available ({filteredAvailable.length})</h3>
            {filteredAvailable.length !== availableCoupons.length && (
              <span className="text-[10px] font-bold text-muted-foreground uppercase pb-1">Filtered from {availableCoupons.length}</span>
            )}
          </div>
          <div className="rounded-2xl border bg-muted/30">
            {filteredAvailable.length >= 1 ? (
              <div className="p-2 space-y-2">
                {!isCodeSearch && (
                  <div className="px-2 pt-1">
                    <div className="text-[11px] font-bold text-muted-foreground">
                      Consolidated view. Showing grouped summaries (not every coupon).
                    </div>
                    <div className="text-[10px] text-muted-foreground/80">
                      Tip: type part of a code to switch to exact coupon results.
                    </div>
                  </div>
                )}

                {isCodeSearch ? (
                  <ul className="space-y-1">
                    <AdminRecordListHeader
                      gridClassName="grid-cols-[44px_minmax(110px,150px)_minmax(180px,1fr)]"
                      columns={[
                        { label: 'Delete' },
                        { label: 'Coupon Code' },
                        { label: 'Value, Category, Teacher & Date' },
                      ]}
                    />
                    {filteredAvailable.slice(0, 200).map((coupon) => {
                      const scopeLine = couponRedemptionLabelForPrint(coupon);
                      return (
                        <li
                          key={coupon.id}
                          className="flex items-center gap-3 p-2 bg-card rounded-xl border shadow-sm group hover:bg-muted/50 transition-colors"
                        >
                          {onDeleteCoupon && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (window.confirm(`Delete coupon ${coupon.code}?`)) onDeleteCoupon(coupon.id);
                              }}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                              title="Delete coupon"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {!onDeleteCoupon && <div className="h-8 w-8 shrink-0" />}
                          <div className="flex-1 min-w-0 flex items-center gap-3">
                            <span className="font-code text-primary text-sm font-bold shrink-0">{coupon.code}</span>
                            <div className="flex flex-wrap items-center gap-2 min-w-0">
                              <span className="text-[11px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-lg shrink-0">
                                {coupon.value} pts
                              </span>
                              <span className="text-[11px] font-medium text-muted-foreground truncate border px-2 py-0.5 rounded-lg bg-background">
                                {coupon.category} <span className="text-muted-foreground/60">by</span> {coupon.teacher}
                              </span>
                              {scopeLine && (
                                <span
                                  className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg truncate max-w-[120px]"
                                  title={scopeLine}
                                >
                                  {scopeLine}
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">
                                {new Date(coupon.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                    {filteredAvailable.length > 200 && (
                      <div className="px-2 py-2 text-[10px] font-bold text-muted-foreground uppercase">
                        Showing first 200 results. Refine the code search to narrow down.
                      </div>
                    )}
                  </ul>
                ) : (
                  <div className="space-y-2">
                    <AdminRecordListHeader
                      gridClassName="grid-cols-[minmax(140px,1fr)_minmax(120px,160px)_minmax(90px,120px)_minmax(80px,110px)_minmax(90px,120px)]"
                      columns={[
                        { label: 'Category & Scope' },
                        { label: 'Teacher' },
                        { label: 'Value' },
                        { label: 'Count' },
                        { label: 'Latest' },
                      ]}
                    />

                    {availableGroups
                      .slice((availableGroupsPage - 1) * GROUP_PAGE_SIZE, availableGroupsPage * GROUP_PAGE_SIZE)
                      .map((g) => {
                        const isExpanded = expandedAvailableGroupKey === g.key;
                        return (
                          <div key={g.key} className="bg-card rounded-xl border shadow-sm overflow-hidden">
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedAvailableGroupKey((prev) => (prev === g.key ? null : g.key));
                              }}
                              className="w-full p-3 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors text-left"
                              title="Expand group"
                            >
                              <div className="min-w-0 flex-1 grid grid-cols-[minmax(140px,1fr)_minmax(120px,160px)_minmax(90px,120px)_minmax(80px,110px)_minmax(90px,120px)] gap-3 items-center">
                                <div className="min-w-0">
                                  <div className="font-bold text-sm truncate">{g.category}</div>
                                  {g.scopeLine ? (
                                    <div
                                      className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400 truncate"
                                      title={g.scopeLine}
                                    >
                                      {g.scopeLine}
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-muted-foreground truncate">No restrictions</div>
                                  )}
                                </div>
                                <div className="text-sm font-medium text-muted-foreground truncate">{g.teacher}</div>
                                <div className="text-[11px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-lg w-fit">
                                  {g.value} pts
                                </div>
                                <div className="text-sm font-black">{g.count}</div>
                                <div className="text-[11px] text-muted-foreground">
                                  {g.latestAt ? new Date(g.latestAt).toLocaleDateString() : '—'}
                                </div>
                              </div>
                              <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
                            </button>

                            {isExpanded && (
                              <div className="border-t bg-muted/20 p-3 space-y-2">
                                <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                  Sample codes ({Math.min(g.codesSample.length, CODES_SAMPLE_SIZE)} of {g.count})
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {g.codesSample.map((code) => (
                                    <span key={code} className="font-code text-[11px] font-bold px-2 py-1 rounded-lg border bg-background">
                                      {code}
                                    </span>
                                  ))}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  To find a specific coupon, search by code above.
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                    {availableGroups.length > GROUP_PAGE_SIZE && (
                      <div className="flex items-center justify-between px-2 py-1">
                        <div className="text-[10px] text-muted-foreground">
                          Page {availableGroupsPage} of {Math.max(1, Math.ceil(availableGroups.length / GROUP_PAGE_SIZE))}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg h-8 text-[10px] font-bold uppercase"
                            disabled={availableGroupsPage <= 1}
                            onClick={() => {
                              setAvailableGroupsPage((p) => Math.max(1, p - 1));
                              setExpandedAvailableGroupKey(null);
                            }}
                          >
                            Prev
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg h-8 text-[10px] font-bold uppercase"
                            disabled={availableGroupsPage >= Math.ceil(availableGroups.length / GROUP_PAGE_SIZE)}
                            onClick={() => {
                              setAvailableGroupsPage((p) => Math.min(Math.ceil(availableGroups.length / GROUP_PAGE_SIZE), p + 1));
                              setExpandedAvailableGroupKey(null);
                            }}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center space-y-2">
                <Ticket className="w-12 h-12 opacity-20" />
                <p className="text-sm font-medium">No available coupons found.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <h3 className="text-lg font-black tracking-tight">Redeemed ({filteredRedeemed.length})</h3>
            <div className="flex items-center gap-3">
              {filteredRedeemed.length !== redeemedCoupons.length && (
                <span className="text-[10px] font-bold text-muted-foreground uppercase pb-1">Filtered from {redeemedCoupons.length}</span>
              )}
              {redeemedCoupons.length > 0 && onPurgeRedeemed && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handlePurge}
                  disabled={isPurging}
                  className="rounded-xl h-8 font-bold text-[10px] uppercase tracking-wider"
                >
                  <Trash2 className="w-3 h-3 mr-1.5" /> Purge All
                </Button>
              )}
            </div>
          </div>
          <div className="rounded-2xl border bg-muted/30">
            {filteredRedeemed.length >= 1 ? (
              <div className="p-2 space-y-2">
                {!isCodeSearch && (
                  <div className="px-2 pt-1">
                    <div className="text-[11px] font-bold text-muted-foreground">
                      Consolidated view. Showing grouped summaries (not every coupon).
                    </div>
                    <div className="text-[10px] text-muted-foreground/80">
                      Tip: search by code above to locate a specific redemption.
                    </div>
                  </div>
                )}

                {isCodeSearch ? (
                  <ul className="space-y-1">
                    <AdminRecordListHeader
                      gridClassName="grid-cols-[44px_minmax(110px,150px)_minmax(180px,1fr)]"
                      columns={[
                        { label: 'Status' },
                        { label: 'Coupon Code' },
                        { label: 'Redeemed By, Value & Date' },
                      ]}
                    />
                    {filteredRedeemed.slice(0, 200).map((coupon) => (
                      <li
                        key={coupon.id}
                        className="flex items-center gap-3 p-2 bg-card/60 rounded-xl border border-dashed shadow-sm opacity-80 hover:bg-muted/50 transition-colors"
                      >
                        <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Ticket className="size-4 text-muted-foreground/40" />
                        </div>
                        <div className="flex-1 min-w-0 flex items-center gap-3">
                          <span className="font-code text-muted-foreground text-sm font-bold shrink-0 line-through decoration-muted-foreground/40">
                            {coupon.code}
                          </span>
                          <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <span className="text-[11px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-lg shrink-0">
                              {coupon.value} pts
                            </span>
                            <span className="text-[11px] font-bold text-foreground truncate border px-2 py-0.5 rounded-lg bg-background">
                              Used by {getStudentName(String(coupon.usedBy || '')) || 'Unknown'}
                            </span>
                            <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">
                              {coupon.usedAt ? new Date(coupon.usedAt).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                    {filteredRedeemed.length > 200 && (
                      <div className="px-2 py-2 text-[10px] font-bold text-muted-foreground uppercase">
                        Showing first 200 results. Refine the code search to narrow down.
                      </div>
                    )}
                  </ul>
                ) : (
                  <div className="space-y-2">
                    <AdminRecordListHeader
                      gridClassName="grid-cols-[minmax(140px,1fr)_minmax(120px,160px)_minmax(90px,120px)_minmax(80px,110px)_minmax(90px,120px)]"
                      columns={[
                        { label: 'Category & Scope' },
                        { label: 'Teacher' },
                        { label: 'Value' },
                        { label: 'Count' },
                        { label: 'Latest' },
                      ]}
                    />

                    {redeemedGroups
                      .slice((redeemedGroupsPage - 1) * GROUP_PAGE_SIZE, redeemedGroupsPage * GROUP_PAGE_SIZE)
                      .map((g) => {
                        const isExpanded = expandedRedeemedGroupKey === g.key;
                        return (
                          <div key={g.key} className="bg-card/70 rounded-xl border border-dashed shadow-sm overflow-hidden">
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedRedeemedGroupKey((prev) => (prev === g.key ? null : g.key));
                              }}
                              className="w-full p-3 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors text-left"
                              title="Expand group"
                            >
                              <div className="min-w-0 flex-1 grid grid-cols-[minmax(140px,1fr)_minmax(120px,160px)_minmax(90px,120px)_minmax(80px,110px)_minmax(90px,120px)] gap-3 items-center">
                                <div className="min-w-0">
                                  <div className="font-bold text-sm truncate">{g.category}</div>
                                  {g.scopeLine ? (
                                    <div
                                      className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400 truncate"
                                      title={g.scopeLine}
                                    >
                                      {g.scopeLine}
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-muted-foreground truncate">No restrictions</div>
                                  )}
                                </div>
                                <div className="text-sm font-medium text-muted-foreground truncate">{g.teacher}</div>
                                <div className="text-[11px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-lg w-fit">
                                  {g.value} pts
                                </div>
                                <div className="text-sm font-black">{g.count}</div>
                                <div className="text-[11px] text-muted-foreground">
                                  {g.latestAt ? new Date(g.latestAt).toLocaleDateString() : '—'}
                                </div>
                              </div>
                              <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
                            </button>

                            {isExpanded && (
                              <div className="border-t bg-muted/20 p-3 space-y-2">
                                <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                  Sample codes ({Math.min(g.codesSample.length, CODES_SAMPLE_SIZE)} of {g.count})
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {g.codesSample.map((code) => (
                                    <span key={code} className="font-code text-[11px] font-bold px-2 py-1 rounded-lg border bg-background">
                                      {code}
                                    </span>
                                  ))}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  To find a specific coupon, search by code above.
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                    {redeemedGroups.length > GROUP_PAGE_SIZE && (
                      <div className="flex items-center justify-between px-2 py-1">
                        <div className="text-[10px] text-muted-foreground">
                          Page {redeemedGroupsPage} of {Math.max(1, Math.ceil(redeemedGroups.length / GROUP_PAGE_SIZE))}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg h-8 text-[10px] font-bold uppercase"
                            disabled={redeemedGroupsPage <= 1}
                            onClick={() => {
                              setRedeemedGroupsPage((p) => Math.max(1, p - 1));
                              setExpandedRedeemedGroupKey(null);
                            }}
                          >
                            Prev
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg h-8 text-[10px] font-bold uppercase"
                            disabled={redeemedGroupsPage >= Math.ceil(redeemedGroups.length / GROUP_PAGE_SIZE)}
                            onClick={() => {
                              setRedeemedGroupsPage((p) =>
                                Math.min(Math.ceil(redeemedGroups.length / GROUP_PAGE_SIZE), p + 1),
                              );
                              setExpandedRedeemedGroupKey(null);
                            }}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center space-y-2">
                <Ticket className="w-12 h-12 opacity-20" />
                <p className="text-sm font-medium">No redeemed coupons found.</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

