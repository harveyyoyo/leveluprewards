'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { AlertCircle, BookOpen, Clock, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import type { LibraryItem } from '@/lib/types';
import type { LibraryLoan } from '@/lib/library/libraryWorkspace';
import { resolveBookClassification, type LibraryGenreConfig } from '@/lib/library/libraryClassification';

export interface LibraryReportsCardProps {
  items: LibraryItem[];
  loans: LibraryLoan[];
  /** True when the loan-history query itself failed (e.g. a permissions issue) — charts and
   * lists that depend on it show a friendly notice instead of silently rendering as empty. */
  loansUnavailable?: boolean;
  activeLoansCount: number;
  overdueLoansCount: number;
  genreDefinitions?: LibraryGenreConfig[] | null;
}

export function LibraryReportsCard({
  items,
  loans,
  loansUnavailable = false,
  activeLoansCount,
  overdueLoansCount,
  genreDefinitions,
}: LibraryReportsCardProps) {
  const totalCopies = useMemo(() => items.filter((i) => !i.archived).length, [items]);
  const catalogedCount = useMemo(
    () => items.filter((i) => !i.archived && i.labeled && i.shelfLocation).length,
    [items],
  );
  const catalogedPct = totalCopies > 0 ? Math.round((catalogedCount / totalCopies) * 100) : 0;

  const stats = [
    {
      label: 'Circulation (last 200 loans)',
      value: loansUnavailable ? '—' : loans.length.toLocaleString(),
      icon: TrendingUp,
      tone: 'text-primary',
    },
    {
      label: 'Currently Checked Out',
      value: activeLoansCount.toLocaleString(),
      icon: BookOpen,
      tone: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Overdue',
      value: overdueLoansCount.toLocaleString(),
      icon: AlertTriangle,
      tone: overdueLoansCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground',
    },
    {
      label: 'Fully Cataloged',
      value: `${catalogedPct}%`,
      icon: CheckCircle2,
      tone: catalogedPct === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
    },
  ];

  // Checkouts per day, last 14 days.
  const circulationByDay = useMemo(() => {
    const days: { key: string; name: string; count: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ key, name: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), count: 0 });
    }
    const byKey = new Map(days.map((d) => [d.key, d]));
    for (const loan of loans) {
      if (!loan.checkedOutAt) continue;
      const key = new Date(loan.checkedOutAt).toISOString().slice(0, 10);
      const bucket = byKey.get(key);
      if (bucket) bucket.count += 1;
    }
    return days;
  }, [loans]);

  const circulationChartConfig: ChartConfig = {
    count: { label: 'Checkouts', color: 'hsl(var(--primary))' },
  };

  // Circulation broken down by genre, joining each loan back to its catalog item.
  const byGenre = useMemo(() => {
    const itemsById = new Map(items.map((i) => [i.id, i]));
    const counts = new Map<string, { label: string; color: string; count: number }>();
    for (const loan of loans) {
      const item = itemsById.get(loan.itemId);
      const classification = resolveBookClassification(item?.category, genreDefinitions, item?.shelfLocation);
      const key = classification.genre.id;
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, { label: classification.genre.label, color: classification.color, count: 1 });
      }
    }
    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [items, loans, genreDefinitions]);

  const genreChartConfig: ChartConfig = useMemo(
    () => Object.fromEntries(byGenre.map((g) => [g.label, { label: g.label, color: g.color }])),
    [byGenre],
  );

  const topBooks = useMemo(() => {
    const counts = new Map<string, { title: string; count: number }>();
    for (const loan of loans) {
      const existing = counts.get(loan.itemId);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(loan.itemId, { title: loan.title, count: 1 });
      }
    }
    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [loans]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-2xl border bg-card/80 px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <Icon className={cn('h-3.5 w-3.5', stat.tone)} aria-hidden />
                {stat.label}
              </div>
              <p className={cn('mt-1 text-2xl font-black tabular-nums', stat.tone)}>{stat.value}</p>
            </div>
          );
        })}
      </div>

      {loansUnavailable ? (
        <div className="rounded-2xl border border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 p-6 text-center space-y-1">
          <AlertCircle className="mx-auto h-7 w-7 text-amber-600 dark:text-amber-400" />
          <p className="text-sm font-bold text-foreground">Couldn&rsquo;t load circulation history.</p>
          <p className="text-xs text-muted-foreground">
            Your session may not currently have staff access to loan records — try signing in again.
          </p>
        </div>
      ) : (
      <>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-muted/15 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-primary" />
            Circulation — Last 14 Days
          </div>
          {loans.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No circulation activity yet.</p>
          ) : (
            <ChartContainer config={circulationChartConfig} className="h-[min(240px,36vh)] w-full aspect-auto">
              <BarChart data={circulationByDay} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={10} interval={1} />
                <YAxis tickLine={false} axisLine={false} fontSize={10} width={28} allowDecimals={false} />
                <ChartTooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.35 }} content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={600} />
              </BarChart>
            </ChartContainer>
          )}
        </div>

        <div className="rounded-2xl border bg-muted/15 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
            <BookOpen className="h-4 w-4 text-primary" />
            Circulation by Genre
          </div>
          {byGenre.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No circulation activity yet.</p>
          ) : (
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
              <ChartContainer config={genreChartConfig} className="h-[180px] w-full max-w-[200px] mx-auto aspect-square">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={byGenre}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={72}
                    paddingAngle={2}
                    isAnimationActive
                    animationDuration={650}
                  >
                    {byGenre.map((g) => (
                      <Cell key={g.label} fill={g.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="flex-1 min-w-0 space-y-1.5 w-full">
                {byGenre.map((g) => (
                  <div key={g.label} className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-1.5 min-w-0 truncate font-semibold">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                      <span className="truncate">{g.label}</span>
                    </span>
                    <span className="font-black tabular-nums shrink-0">{g.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border bg-muted/15 p-4 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
          <Clock className="h-4 w-4 text-primary" />
          Most Borrowed Books
        </div>
        {topBooks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No circulation activity yet.</p>
        ) : (
          <ol className="space-y-1.5">
            {topBooks.map((b, i) => (
              <li
                key={b.title + i}
                className="flex items-center gap-3 rounded-xl border bg-card/60 px-3 py-2 text-sm"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-black text-xs">
                  {i + 1}
                </span>
                <span className="flex-1 min-w-0 truncate font-semibold">{b.title}</span>
                <span className="shrink-0 font-black tabular-nums text-muted-foreground">
                  {b.count} loan{b.count === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
      </>
      )}
    </div>
  );
}
