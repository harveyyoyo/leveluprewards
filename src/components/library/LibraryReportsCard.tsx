'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import {
  AlertCircle,
  BookOpen,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Download,
  Printer,
  Star,
  Users,
  Tag,
  ChevronDown,
} from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { LibraryItem, LibraryBookReview } from '@/lib/types';
import { downloadLibraryCsv, printLibraryTable, type LibraryLoan } from '@/lib/library/libraryWorkspace';
import type { LibraryGenreConfig } from '@/lib/library/libraryClassification';
import {
  LIBRARY_ANALYTICS_RANGES,
  averageReturnedLoanDays,
  catalogHealth,
  checkoutsByDay,
  filterLoansInRange,
  formatLoanDate,
  genreCirculation,
  loansCsvRows,
  overdueCsvRows,
  overdueReportRows,
  processingCsvRows,
  processingReportRows,
  reviewSnapshot,
  topBooksCsvRows,
  topBorrowedTitles,
  topBorrowers,
  topReadersCsvRows,
  type LibraryAnalyticsRangeDays,
} from '@/lib/library/libraryAnalytics';
import { staggerContainer, staggerItem } from '@/lib/animation';

export interface LibraryReportsCardProps {
  items: LibraryItem[];
  loans: LibraryLoan[];
  loansUnavailable?: boolean;
  loansLoading?: boolean;
  reviews?: LibraryBookReview[] | null;
  reviewsUnavailable?: boolean;
  genreDefinitions?: LibraryGenreConfig[] | null;
  getStudentName: (id?: string) => string;
  getClassName: (id?: string) => string;
  onViewOverdue?: () => void;
}

export function LibraryReportsCard({
  items,
  loans,
  loansUnavailable = false,
  loansLoading = false,
  reviews,
  reviewsUnavailable = false,
  genreDefinitions,
  getStudentName,
  getClassName,
  onViewOverdue,
}: LibraryReportsCardProps) {
  const { toast } = useToast();
  const [rangeDays, setRangeDays] = useState<LibraryAnalyticsRangeDays>(14);

  const rangedLoans = useMemo(() => filterLoansInRange(loans, rangeDays), [loans, rangeDays]);
  const chartDays = rangeDays ?? 30;
  const circulationByDay = useMemo(() => checkoutsByDay(rangedLoans, chartDays), [rangedLoans, chartDays]);
  const byGenre = useMemo(
    () => genreCirculation(rangedLoans, items, genreDefinitions),
    [rangedLoans, items, genreDefinitions],
  );
  const topBooks = useMemo(() => topBorrowedTitles(rangedLoans, 10), [rangedLoans]);
  const readers = useMemo(
    () => topBorrowers(rangedLoans, getStudentName, getClassName, 10),
    [rangedLoans, getStudentName, getClassName],
  );
  const health = useMemo(() => catalogHealth(items), [items]);
  const overdueRows = useMemo(
    () => overdueReportRows(items, getStudentName, getClassName),
    [items, getStudentName, getClassName],
  );
  const processingRows = useMemo(() => processingReportRows(items), [items]);
  const avgLoanDays = useMemo(() => averageReturnedLoanDays(rangedLoans), [rangedLoans]);
  const ratings = useMemo(() => {
    const itemIds = new Set(items.map((item) => item.id));
    const scoped = (reviews ?? []).filter((review) => !review.itemId || itemIds.has(review.itemId));
    return reviewSnapshot(scoped);
  }, [reviews, items]);

  const circulationChartConfig: ChartConfig = {
    count: { label: 'Checkouts', color: 'hsl(var(--primary))' },
  };
  const genreChartConfig: ChartConfig = useMemo(
    () => Object.fromEntries(byGenre.map((g) => [g.label, { label: g.label, color: g.color }])),
    [byGenre],
  );

  const rangeLabel = LIBRARY_ANALYTICS_RANGES.find((range) => range.days === rangeDays)?.label ?? '14 days';

  const stats = [
    {
      label: `Checkouts (${rangeLabel.toLowerCase()})`,
      value: loansUnavailable ? '—' : rangedLoans.length.toLocaleString(),
      icon: TrendingUp,
      tone: 'text-primary',
    },
    {
      label: 'Out right now',
      value: health.checkedOut.toLocaleString(),
      icon: BookOpen,
      tone: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Overdue',
      value: health.overdue.toLocaleString(),
      icon: AlertTriangle,
      tone: health.overdue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground',
    },
    {
      label: 'Ready on the shelf',
      value: `${health.catalogedPct}%`,
      icon: CheckCircle2,
      tone: health.catalogedPct === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Typical days out',
      value: avgLoanDays == null || loansUnavailable ? '—' : `${avgLoanDays}`,
      icon: Clock,
      tone: 'text-muted-foreground',
    },
    {
      label: 'Student stars',
      value: reviewsUnavailable ? '—' : ratings.average == null ? '—' : `${ratings.average}`,
      icon: Star,
      tone: 'text-amber-600 dark:text-amber-400',
    },
  ];

  const runExport = (fn: () => void) => {
    try {
      fn();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not save or print that list',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Time range">
          {LIBRARY_ANALYTICS_RANGES.map((range) => (
            <Button
              key={String(range.days)}
              type="button"
              size="sm"
              variant={rangeDays === range.days ? 'default' : 'outline'}
              className="h-8 rounded-full px-3 text-xs font-bold"
              onClick={() => setRangeDays(range.days)}
            >
              {range.label}
            </Button>
          ))}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl text-xs font-semibold">
              <Download className="h-3.5 w-3.5" />
              Download &amp; print
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              className="gap-2 text-xs"
              disabled={overdueRows.length === 0}
              onClick={() =>
                runExport(() =>
                  printLibraryTable(
                    'Overdue books',
                    ['Student', 'Class', 'Book', 'Due date', 'Days late'],
                    overdueRows.map((row) => [
                      row.studentName,
                      row.className,
                      row.title,
                      formatLoanDate(row.dueAt),
                      String(row.daysLate),
                    ]),
                  ),
                )
              }
            >
              <Printer className="h-4 w-4 text-primary" />
              Print overdue list
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2 text-xs"
              disabled={overdueRows.length === 0}
              onClick={() => runExport(() => downloadLibraryCsv('library-overdue.csv', overdueCsvRows(overdueRows)))}
            >
              <Download className="h-4 w-4 text-primary" />
              Download overdue
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 text-xs"
              disabled={loansUnavailable || rangedLoans.length === 0}
              onClick={() =>
                runExport(() => downloadLibraryCsv('library-checkouts.csv', loansCsvRows(rangedLoans, getStudentName, getClassName)))
              }
            >
              <Download className="h-4 w-4 text-primary" />
              Download checkouts
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2 text-xs"
              disabled={topBooks.length === 0}
              onClick={() => runExport(() => downloadLibraryCsv('library-popular-books.csv', topBooksCsvRows(topBooks)))}
            >
              <Download className="h-4 w-4 text-primary" />
              Download popular books
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2 text-xs"
              disabled={readers.length === 0}
              onClick={() => runExport(() => downloadLibraryCsv('library-top-readers.csv', topReadersCsvRows(readers)))}
            >
              <Download className="h-4 w-4 text-primary" />
              Download top readers
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2 text-xs"
              disabled={processingRows.length === 0}
              onClick={() =>
                runExport(() => downloadLibraryCsv('library-needs-stickers.csv', processingCsvRows(processingRows)))
              }
            >
              <Download className="h-4 w-4 text-primary" />
              Download unfinished copies
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <motion.div
        key={String(rangeDays)}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              variants={staggerItem}
              className="rounded-2xl border bg-card/80 px-4 py-3 shadow-sm"
            >
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <Icon className={cn('h-3.5 w-3.5', stat.tone)} aria-hidden />
                {stat.label}
              </div>
              <p className={cn('mt-1 text-2xl font-black tabular-nums', stat.tone)}>{stat.value}</p>
            </motion.div>
          );
        })}
      </motion.div>

      {loansLoading ? (
        <p className="text-center text-sm text-muted-foreground">Loading checkout history…</p>
      ) : null}

      {loansUnavailable ? (
        <div className="rounded-2xl border border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 p-6 text-center space-y-1">
          <AlertCircle className="mx-auto h-7 w-7 text-amber-600 dark:text-amber-400" />
          <p className="text-sm font-bold text-foreground">Couldn&rsquo;t load checkout history.</p>
          <p className="text-xs text-muted-foreground">
            Sign in again, then open Reports. Overdue books below still use what is on the shelf right now.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border bg-muted/15 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-primary" />
              Checkouts — {rangeDays == null ? 'last 30 days' : rangeLabel.toLowerCase()}
            </div>
            {rangedLoans.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No checkouts in this window yet.</p>
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
              Checkouts by genre
            </div>
            {byGenre.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No checkouts in this window yet.</p>
            ) : (
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                <ChartContainer config={genreChartConfig} className="mx-auto aspect-square h-[180px] w-full max-w-[200px]">
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
                <div className="w-full min-w-0 flex-1 space-y-1.5">
                  {byGenre.map((g) => (
                    <div key={g.label} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex min-w-0 items-center gap-1.5 truncate font-semibold">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: g.color }} />
                        <span className="truncate">{g.label}</span>
                      </span>
                      <span className="shrink-0 font-black tabular-nums">{g.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-2xl border bg-muted/15 p-4 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-rose-500" />
            Overdue right now
          </div>
          {onViewOverdue && overdueRows.length > 0 ? (
            <Button type="button" variant="ghost" size="sm" className="h-8 rounded-xl text-xs font-bold" onClick={onViewOverdue}>
              Open in Catalog
            </Button>
          ) : null}
        </div>
        {overdueRows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No overdue books. Nice work.</p>
        ) : (
          <ol className="space-y-1.5">
            {overdueRows.slice(0, 12).map((row) => (
              <li key={row.itemId} className="flex items-center gap-3 rounded-xl border bg-card/60 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{row.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {row.studentName}
                    {row.className ? ` · ${row.className}` : ''}
                  </span>
                </span>
                <Badge variant="destructive" className="shrink-0 font-black tabular-nums">
                  {row.daysLate}d late
                </Badge>
              </li>
            ))}
          </ol>
        )}
        {overdueRows.length > 12 ? (
          <p className="text-center text-xs text-muted-foreground">
            Showing 12 of {overdueRows.length}. Print or download for the full list.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-muted/15 p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
            <Clock className="h-4 w-4 text-primary" />
            Most borrowed
          </div>
          {topBooks.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No checkouts in this window yet.</p>
          ) : (
            <ol className="space-y-1.5">
              {topBooks.map((book, i) => (
                <li key={book.itemId + book.title} className="flex items-center gap-3 rounded-xl border bg-card/60 px-3 py-2 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{book.title}</span>
                  <span className="shrink-0 font-black tabular-nums text-muted-foreground">
                    {book.count} {book.count === 1 ? 'time' : 'times'}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="rounded-2xl border bg-muted/15 p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
            <Users className="h-4 w-4 text-primary" />
            Top readers
          </div>
          {readers.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No checkouts in this window yet.</p>
          ) : (
            <ol className="space-y-1.5">
              {readers.map((reader, i) => (
                <li key={reader.studentId} className="flex items-center gap-3 rounded-xl border bg-card/60 px-3 py-2 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="block truncate font-semibold">{reader.name}</span>
                    {reader.className ? (
                      <span className="block truncate text-xs text-muted-foreground">{reader.className}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 font-black tabular-nums text-muted-foreground">
                    {reader.count}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-muted/15 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
            <Star className="h-4 w-4 text-amber-500" />
            How students rated books
          </div>
          {reviewsUnavailable ? (
            <p className="py-4 text-sm text-muted-foreground">Student ratings are not available right now.</p>
          ) : ratings.ratedCount === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No star ratings yet. Students can rate a book after they return it.
            </p>
          ) : (
            <p className="text-sm leading-relaxed">
              Average <span className="font-black">{ratings.average}</span> stars from{' '}
              <span className="font-black">{ratings.ratedCount}</span>{' '}
              {ratings.ratedCount === 1 ? 'rating' : 'ratings'}
              {ratings.fiveStar > 0 ? ` · ${ratings.fiveStar} five-star` : ''}
              {ratings.unreadCount > 0
                ? ` · ${ratings.unreadCount} said they did not get a chance to read it`
                : ''}
              .
            </p>
          )}
        </div>

        <div className="rounded-2xl border bg-muted/15 p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
            <Tag className="h-4 w-4 text-primary" />
            Copies still needing a sticker or shelf
          </div>
          {processingRows.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">Every copy has a sticker and a shelf spot.</p>
          ) : (
            <ul className="space-y-1.5">
              {processingRows.slice(0, 8).map((row) => (
                <li key={row.itemId} className="rounded-xl border bg-card/60 px-3 py-2 text-sm">
                  <span className="block truncate font-semibold">{row.title}</span>
                  <span className="block text-xs text-muted-foreground">{row.reason}</span>
                </li>
              ))}
            </ul>
          )}
          {processingRows.length > 8 ? (
            <p className="text-xs text-muted-foreground">
              Showing 8 of {processingRows.length}. Download the full list from the menu above.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
