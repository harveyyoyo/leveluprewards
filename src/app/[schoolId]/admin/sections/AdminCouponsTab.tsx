import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Ticket, Search, Trash2, X, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Helper } from '@/components/ui/helper';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Coupon } from '@/lib/types';
import { couponRedemptionLabelForPrint } from '@/lib/couponRedemptionRules';

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

  const filteredAvailable = useMemo(() => {
    return availableCoupons.filter((c) => {
      const matchesSearch = c.code.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === 'all' || c.category === category;
      const matchesTeacher = teacher === 'all' || c.teacher === teacher;
      return matchesSearch && matchesCategory && matchesTeacher;
    });
  }, [availableCoupons, search, category, teacher]);

  const filteredRedeemed = useMemo(() => {
    return redeemedCoupons.filter((c) => {
      const matchesSearch = c.code.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === 'all' || c.category === category;
      const matchesTeacher = teacher === 'all' || c.teacher === teacher;
      return matchesSearch && matchesCategory && matchesTeacher;
    });
  }, [redeemedCoupons, search, category, teacher]);

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
    <Card className="border-t-4 border-primary shadow-md">
      <CardHeader>
        <Helper content="This section shows all coupons that have been generated in the system, separated into those that are still available and those that have already been redeemed by a student.">
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
          <ScrollArea className="h-[calc(100vh-28rem)] min-h-[350px] border rounded-2xl bg-muted/30">
            {filteredAvailable.length >= 1 ? (
              <ul className="p-4 space-y-3">
                {filteredAvailable.map((coupon) => {
                  const scopeLine = couponRedemptionLabelForPrint(coupon);
                  return (
                    <li key={coupon.id} className="p-4 bg-card rounded-xl border shadow-sm group relative">
                      <div className="flex justify-between items-center font-bold">
                        <span className="font-code text-primary text-lg">{coupon.code}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm bg-primary/10 text-primary px-2 py-0.5 rounded-lg">{coupon.value} pts</span>
                          {onDeleteCoupon && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (window.confirm(`Delete coupon ${coupon.code}?`)) onDeleteCoupon(coupon.id);
                              }}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2 space-y-1">
                        <p className="font-semibold text-foreground">
                          {coupon.category} <span className="text-muted-foreground/60 font-normal">/ by</span> {coupon.teacher}
                        </p>
                        <p>Created {new Date(coupon.createdAt).toLocaleDateString()}</p>
                        {(coupon.startsAt || coupon.expiresAt) && (
                          <p className="flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {coupon.startsAt && <>From {new Date(coupon.startsAt).toLocaleDateString()}</>}
                            {coupon.startsAt && coupon.expiresAt && ' · '}
                            {coupon.expiresAt && <>Expires {new Date(coupon.expiresAt).toLocaleDateString()}</>}
                          </p>
                        )}
                        {scopeLine && <p className="text-amber-800 dark:text-amber-400 font-bold mt-1 bg-amber-500/10 px-2 py-0.5 rounded-md inline-block">{scopeLine}</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center space-y-2">
                <Ticket className="w-12 h-12 opacity-20" />
                <p className="text-sm font-medium">No available coupons found.</p>
              </div>
            )}
          </ScrollArea>
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
          <ScrollArea className="h-[calc(100vh-28rem)] min-h-[350px] border rounded-2xl bg-muted/30">
            {filteredRedeemed.length >= 1 ? (
              <ul className="p-4 space-y-3">
                {filteredRedeemed.map((coupon) => (
                  <li key={coupon.id} className="p-4 bg-card/60 rounded-xl border border-dashed shadow-sm opacity-80">
                    <div className="flex justify-between items-center font-bold">
                      <span className="font-code text-muted-foreground line-through">{coupon.code}</span>
                      <span className="text-sm">{coupon.value} pts</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2 space-y-1">
                      <p>
                        {coupon.category} / by {coupon.teacher}
                      </p>
                      <p className="text-foreground font-medium">
                        Used by <span className="font-bold">{getStudentName(String(coupon.usedBy || '')) || 'Unknown'}</span> on{' '}
                        {coupon.usedAt ? new Date(coupon.usedAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center space-y-2">
                <Ticket className="w-12 h-12 opacity-20" />
                <p className="text-sm font-medium">No redeemed coupons found.</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}

