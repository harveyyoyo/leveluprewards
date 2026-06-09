'use client';

import { useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AreaChart as AreaChartIcon,
  BarChart3,
  BarChartHorizontal,
  Circle,
  Gauge,
  Hexagon,
  LineChart,
  PieChart,
  Thermometer,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart as RechartsPieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
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
import { buildHouseStandingsRows } from '@/lib/houses/houseStandings';
import type { House, Student } from '@/lib/types';

export const HOUSE_STANDINGS_CHART_FORMATS = [
  'bars',
  'columns',
  'horizontal',
  'line',
  'area',
  'pie',
  'donut',
  'radar',
  'radial',
  'thermometer',
] as const;

export type HouseStandingsChartFormat = (typeof HOUSE_STANDINGS_CHART_FORMATS)[number];

export type HouseStandingsChartDataPoint = {
  id: string;
  name: string;
  points: number;
  fill: string;
};

const FORMAT_OPTIONS: {
  id: HouseStandingsChartFormat;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: 'columns', label: 'Column chart', icon: BarChart3 },
  { id: 'horizontal', label: 'Horizontal bars', icon: BarChartHorizontal },
  { id: 'line', label: 'Line chart', icon: LineChart },
  { id: 'area', label: 'Area chart', icon: AreaChartIcon },
  { id: 'pie', label: 'Pie chart', icon: PieChart },
  { id: 'donut', label: 'Donut chart', icon: Circle },
  { id: 'radar', label: 'Radar chart', icon: Hexagon },
  { id: 'radial', label: 'Radial bars', icon: Gauge },
  { id: 'thermometer', label: 'Thermometer', icon: Thermometer },
];

const CHART_MARGIN = { top: 8, right: 8, left: 0, bottom: 48 };
const HORIZONTAL_MARGIN = { top: 8, right: 12, left: 4, bottom: 8 };

const tooltipContent = (
  <ChartTooltipContent nameKey="id" labelKey="name" indicator="dot" />
);

const pieTooltipContent = (
  <ChartTooltipContent hideLabel nameKey="id" indicator="dot" />
);

export function isHouseStandingsChartFormat(value: string): value is HouseStandingsChartFormat {
  return (HOUSE_STANDINGS_CHART_FORMATS as readonly string[]).includes(value);
}

export function normalizeHouseStandingsChartFormat(
  value: string | undefined | null,
): HouseStandingsChartFormat {
  if (value === 'bars') return 'columns';
  if (value && isHouseStandingsChartFormat(value)) return value;
  return 'columns';
}

function HouseStandingsChartLegend({
  rows,
  totalPts,
}: {
  rows: ReturnType<typeof buildHouseStandingsRows>;
  totalPts: number;
}) {
  return (
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
  );
}

function HouseStandingsThermometerView({
  rows,
  maxPts,
}: {
  rows: ReturnType<typeof buildHouseStandingsRows>;
  maxPts: number;
}) {
  const scaleMax = Math.max(maxPts, 1);

  return (
    <div
      className="flex flex-wrap items-end justify-center gap-4 sm:gap-6 py-2 min-h-[220px]"
      role="img"
      aria-label="House standings thermometers ranked by points"
    >
      {rows.map((row) => {
        const fillPct = Math.round((row.points / scaleMax) * 100);
        const color = row.house.color;
        return (
          <div
            key={row.id}
            className="flex flex-col items-center gap-1.5 w-[4.25rem] sm:w-[4.75rem]"
            title={`${row.house.name}: ${row.points.toLocaleString()} points`}
          >
            <span className="text-[10px] font-bold tabular-nums text-foreground">
              {row.points.toLocaleString()}
            </span>
            <div className="flex flex-col items-center h-[min(200px,32vh)] w-full">
              <div className="relative flex-1 w-9 rounded-t-full border-2 border-border/70 bg-muted/20 overflow-hidden shadow-inner">
                <div
                  className="absolute inset-x-0 bottom-0 transition-all duration-700 ease-out"
                  style={{
                    height: `${fillPct}%`,
                    backgroundColor: color,
                    boxShadow: `0 0 12px ${color}55`,
                  }}
                />
                <div
                  className="pointer-events-none absolute inset-x-1 top-2 bottom-2 rounded-t-full opacity-30"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 45%, transparent 100%)',
                  }}
                />
              </div>
              <div
                className="relative -mt-3 h-11 w-11 shrink-0 rounded-full border-2 border-border/70 shadow-md"
                style={{ backgroundColor: color }}
                aria-hidden
              >
                <div
                  className="absolute inset-1 rounded-full opacity-35"
                  style={{
                    background:
                      'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.55) 0%, transparent 55%)',
                  }}
                />
              </div>
            </div>
            <HouseBadge house={row.house} size="sm" className="max-w-full truncate text-center" />
            <span className="text-[9px] tabular-nums text-muted-foreground font-semibold">
              #{row.rank}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ColoredBarCells({ data }: { data: HouseStandingsChartDataPoint[] }) {
  return (
    <>
      {data.map((entry) => (
        <Cell key={entry.id} fill={entry.fill} />
      ))}
    </>
  );
}

type ChartBodyProps = {
  format: HouseStandingsChartFormat;
  chartData: HouseStandingsChartDataPoint[];
  chartConfig: ChartConfig;
  rows: ReturnType<typeof buildHouseStandingsRows>;
  totalPts: number;
  maxPts: number;
};

function HouseStandingsChartBody({
  format,
  chartData,
  chartConfig,
  rows,
  totalPts,
  maxPts,
}: ChartBodyProps) {
  const resolvedFormat = format === 'bars' ? 'columns' : format;

  if (resolvedFormat === 'columns') {
    return (
      <ChartContainer config={chartConfig} className="h-[min(280px,40vh)] w-full aspect-auto">
        <BarChart data={chartData} margin={CHART_MARGIN}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            angle={-35}
            textAnchor="end"
            height={56}
            interval={0}
            fontSize={10}
          />
          <YAxis tickLine={false} axisLine={false} fontSize={10} width={40} />
          <ChartTooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.35 }} content={tooltipContent} />
          <Bar dataKey="points" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={600}>
            <ColoredBarCells data={chartData} />
          </Bar>
        </BarChart>
      </ChartContainer>
    );
  }

  if (resolvedFormat === 'horizontal') {
    return (
      <ChartContainer config={chartConfig} className="h-[min(320px,45vh)] w-full aspect-auto">
        <BarChart data={chartData} layout="vertical" margin={HORIZONTAL_MARGIN}>
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis type="number" tickLine={false} axisLine={false} fontSize={10} />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            width={88}
            fontSize={10}
          />
          <ChartTooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.35 }} content={tooltipContent} />
          <Bar dataKey="points" radius={[0, 6, 6, 0]} isAnimationActive animationDuration={600}>
            <ColoredBarCells data={chartData} />
          </Bar>
        </BarChart>
      </ChartContainer>
    );
  }

  if (resolvedFormat === 'line') {
    return (
      <ChartContainer config={chartConfig} className="h-[min(260px,38vh)] w-full aspect-auto">
        <RechartsLineChart data={chartData} margin={CHART_MARGIN}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            angle={-35}
            textAnchor="end"
            height={56}
            interval={0}
            fontSize={10}
          />
          <YAxis tickLine={false} axisLine={false} fontSize={10} width={40} />
          <ChartTooltip
            cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '4 4' }}
            content={tooltipContent}
          />
          <Line
            type="monotone"
            dataKey="points"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            isAnimationActive
            animationDuration={700}
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
            activeDot={{ r: 7, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
          />
        </RechartsLineChart>
      </ChartContainer>
    );
  }

  if (resolvedFormat === 'area') {
    return (
      <ChartContainer config={chartConfig} className="h-[min(260px,38vh)] w-full aspect-auto">
        <AreaChart data={chartData} margin={CHART_MARGIN}>
          <defs>
            <linearGradient id="house-area-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            angle={-35}
            textAnchor="end"
            height={56}
            interval={0}
            fontSize={10}
          />
          <YAxis tickLine={false} axisLine={false} fontSize={10} width={40} />
          <ChartTooltip
            cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '4 4' }}
            content={tooltipContent}
          />
          <Area
            type="monotone"
            dataKey="points"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#house-area-fill)"
            isAnimationActive
            animationDuration={700}
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
            activeDot={{ r: 7, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
          />
        </AreaChart>
      </ChartContainer>
    );
  }

  if (resolvedFormat === 'pie' || resolvedFormat === 'donut') {
    const innerRadius = resolvedFormat === 'donut' ? 44 : 0;
    return (
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        <ChartContainer config={chartConfig} className="h-[220px] w-full max-w-[260px] mx-auto aspect-square">
          <RechartsPieChart>
            <ChartTooltip content={pieTooltipContent} />
            <Pie
              data={chartData}
              dataKey="points"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={80}
              paddingAngle={resolvedFormat === 'donut' ? 2 : 1}
              isAnimationActive
              animationDuration={650}
            >
              <ColoredBarCells data={chartData} />
            </Pie>
          </RechartsPieChart>
        </ChartContainer>
        <HouseStandingsChartLegend rows={rows} totalPts={totalPts} />
      </div>
    );
  }

  if (resolvedFormat === 'radar') {
    const radarMax = Math.max(maxPts, 1);
    return (
      <ChartContainer config={chartConfig} className="h-[min(280px,42vh)] w-full max-w-lg mx-auto aspect-square">
        <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="72%">
          <PolarGrid strokeDasharray="3 3" />
          <PolarAngleAxis dataKey="name" tickLine={false} fontSize={10} />
          <PolarRadiusAxis
            angle={90}
            domain={[0, radarMax]}
            tickLine={false}
            axisLine={false}
            fontSize={9}
            tickCount={4}
          />
          <ChartTooltip content={tooltipContent} />
          <Radar
            name="Points"
            dataKey="points"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.22}
            strokeWidth={2}
            isAnimationActive
            animationDuration={650}
          />
        </RadarChart>
      </ChartContainer>
    );
  }

  if (resolvedFormat === 'radial') {
    return (
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        <ChartContainer config={chartConfig} className="h-[240px] w-full max-w-[280px] mx-auto aspect-square">
          <RadialBarChart
            data={chartData}
            innerRadius="22%"
            outerRadius="90%"
            startAngle={90}
            endAngle={-270}
          >
            <ChartTooltip content={pieTooltipContent} />
            <PolarAngleAxis type="number" tick={false} axisLine={false} />
            <RadialBar
              dataKey="points"
              background={{ fill: 'hsl(var(--muted))' }}
              cornerRadius={4}
              isAnimationActive
              animationDuration={650}
            >
              <ColoredBarCells data={chartData} />
            </RadialBar>
          </RadialBarChart>
        </ChartContainer>
        <HouseStandingsChartLegend rows={rows} totalPts={totalPts} />
      </div>
    );
  }

  if (resolvedFormat === 'thermometer') {
    return <HouseStandingsThermometerView rows={rows} maxPts={maxPts} />;
  }

  return null;
}

type Props = {
  houses: House[];
  students: Student[];
  format: HouseStandingsChartFormat;
  onFormatChange: (format: HouseStandingsChartFormat) => void;
};

export function HouseStandingsChartBlock({ houses, students, format, onFormatChange }: Props) {
  const rows = useMemo(() => buildHouseStandingsRows(houses, students), [houses, students]);
  const totalPts = useMemo(() => rows.reduce((sum, r) => sum + r.points, 0), [rows]);
  const maxPts = useMemo(() => rows.reduce((max, r) => Math.max(max, r.points), 0), [rows]);

  const chartData = useMemo<HouseStandingsChartDataPoint[]>(
    () =>
      rows.map((r) => ({
        id: r.id,
        name: r.chartLabel,
        points: r.points,
        fill: `var(--color-${r.id})`,
      })),
    [rows],
  );

  const chartConfig = useMemo(() => {
    const cfg: ChartConfig = {
      points: { label: 'Points', color: 'hsl(var(--primary))' },
    };
    for (const r of rows) {
      cfg[r.id] = { label: r.house.name, color: r.house.color };
    }
    return cfg;
  }, [rows]);

  if (houses.length < 2) return null;

  return (
    <div className="rounded-2xl border bg-muted/15 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Standings chart</p>
        <div className="flex items-center gap-2">
          <Label htmlFor="house-chart-format" className="sr-only">
            Chart format
          </Label>
          <Select value={format} onValueChange={(v) => onFormatChange(v as HouseStandingsChartFormat)}>
            <SelectTrigger id="house-chart-format" className="h-8 w-[12.5rem] rounded-lg text-xs font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMAT_OPTIONS.map((opt) => {
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

      <HouseStandingsChartBody
        format={format}
        chartData={chartData}
        chartConfig={chartConfig}
        rows={rows}
        totalPts={totalPts}
        maxPts={maxPts}
      />
    </div>
  );
}

export { FORMAT_OPTIONS as HOUSE_STANDINGS_FORMAT_OPTIONS };
