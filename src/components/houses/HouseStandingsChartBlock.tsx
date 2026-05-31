'use client';

import { useMemo } from 'react';
import { BarChart3, LineChart, PieChart, Rows3 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart as RechartsPieChart,
  XAxis,
  YAxis,
} from 'recharts';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { HouseBadge } from '@/components/houses/HouseBadge';
import { buildHouseStandingsRows, type HouseStandingsRow } from '@/lib/houses/houseStandings';
import type { House, Student } from '@/lib/types';

export type HouseStandingsChartFormat = 'bars' | 'columns' | 'line' | 'pie';

const FORMAT_OPTIONS: {
  id: HouseStandingsChartFormat;
  label: string;
  icon: typeof BarChart3;
}[] = [
  { id: 'bars', label: 'Inline bars (in table)', icon: Rows3 },
  { id: 'columns', label: 'Column chart', icon: BarChart3 },
  { id: 'line', label: 'Line chart', icon: LineChart },
  { id: 'pie', label: 'Share (pie)', icon: PieChart },
];

type Props = {
  houses: House[];
  students: Student[];
  format: HouseStandingsChartFormat;
  onFormatChange: (format: HouseStandingsChartFormat) => void;
};

export function HouseStandingsChartBlock({ houses, students, format, onFormatChange }: Props) {
  const rows = useMemo(() => buildHouseStandingsRows(houses, students), [houses, students]);
  const totalPts = useMemo(() => rows.reduce((sum, r) => sum + r.points, 0), [rows]);

  const chartData = useMemo(
    () =>
      rows.map((r) => ({
        id: r.id,
        name: r.chartLabel,
        points: r.points,
        fill: r.house.color,
      })),
    [rows],
  );

  const chartConfig = useMemo(() => {
    const cfg: ChartConfig = { points: { label: 'Points', color: 'hsl(var(--primary))' } };
    for (const r of rows) cfg[r.id] = { label: r.house.name, color: r.house.color };
    return cfg;
  }, [rows]);

  if (houses.length < 2 || format === 'bars') return null;

  return (
    <div className="rounded-2xl border bg-muted/15 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Standings chart</p>
        <div className="flex items-center gap-2">
          <Label htmlFor="house-chart-format" className="sr-only">
            Chart format
          </Label>
          <Select value={format} onValueChange={(v) => onFormatChange(v as HouseStandingsChartFormat)}>
            <SelectTrigger id="house-chart-format" className="h-8 w-[10.5rem] rounded-lg text-xs font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMAT_OPTIONS.filter((o) => o.id !== 'bars').map((opt) => {
                const Icon = opt.icon;
                return (
                  <SelectItem key={opt.id} value={opt.id}>
                    <span className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 opacity-70" aria-hidden />
                      {opt.label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {format === 'columns' ? (
        <ChartContainer config={chartConfig} className="h-[min(280px,40vh)] w-full aspect-auto">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis dataKey="name" tickLine={false} axisLine={false} angle={-35} textAnchor="end" height={56} interval={0} fontSize={10} />
            <YAxis tickLine={false} axisLine={false} fontSize={10} width={40} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="points" radius={[6, 6, 0, 0]}>
              {chartData.map((entry) => (
                <Cell key={entry.id} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      ) : null}

      {format === 'line' ? (
        <ChartContainer config={chartConfig} className="h-[min(260px,38vh)] w-full aspect-auto">
          <RechartsLineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis dataKey="name" tickLine={false} axisLine={false} angle={-35} textAnchor="end" height={56} interval={0} fontSize={10} />
            <YAxis tickLine={false} axisLine={false} fontSize={10} width={40} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="points"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={({ cx, cy, index }) => {
                const fill = chartData[index]?.fill ?? 'hsl(var(--primary))';
                return (
                  <circle
                    key={index}
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill={fill}
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{ r: 7 }}
            />
          </RechartsLineChart>
        </ChartContainer>
      ) : null}

      {format === 'pie' ? (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
          <ChartContainer config={chartConfig} className="h-[220px] w-full max-w-[260px] mx-auto aspect-square">
            <RechartsPieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="name" />} />
              <Pie
                data={chartData}
                dataKey="points"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={44}
                outerRadius={80}
                paddingAngle={2}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.id} fill={entry.fill} stroke="hsl(var(--background))" strokeWidth={1} />
                ))}
              </Pie>
            </RechartsPieChart>
          </ChartContainer>
          <ul className="flex-1 space-y-1 text-xs max-h-[220px] overflow-y-auto w-full">
            {rows.map((r) => {
              const pct = totalPts > 0 ? Math.round((r.points / totalPts) * 100) : 0;
              return (
                <li key={r.id} className="flex items-center justify-between gap-2">
                  <HouseBadge house={r.house} size="sm" className="max-w-[8rem] truncate" />
                  <span className="tabular-nums font-bold text-muted-foreground shrink-0">
                    {pct}% · {r.points.toLocaleString()}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export { FORMAT_OPTIONS as HOUSE_STANDINGS_FORMAT_OPTIONS };
