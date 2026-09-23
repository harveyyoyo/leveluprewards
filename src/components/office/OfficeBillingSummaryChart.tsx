'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { formatCents } from '@/lib/office/officeNav';
import { invoicePaidCents, invoiceRemainingCents } from '@/lib/office/officeBillingPayments';
import type { OfficeInvoice } from '@/lib/office/types';

type OfficeBillingSummaryChartProps = {
  invoices: OfficeInvoice[];
};

const CHART_CONFIG: ChartConfig = {
  collected: { label: 'Collected', color: 'hsl(var(--chart-1, 173 58% 39%))' },
  outstanding: { label: 'Outstanding', color: 'hsl(var(--chart-2, 27 87% 67%))' },
};

export function OfficeBillingSummaryChart({ invoices }: OfficeBillingSummaryChartProps) {
  const data = useMemo(() => {
    const billable = invoices.filter((i) => i.status !== 'void' && i.status !== 'draft');
    const collected = billable.reduce((sum, i) => sum + invoicePaidCents(i), 0);
    const outstanding = billable.reduce((sum, i) => sum + invoiceRemainingCents(i), 0);
    return [{ name: 'This school', collected: collected / 100, outstanding: outstanding / 100 }];
  }, [invoices]);

  const totalCents = useMemo(
    () => invoices.filter((i) => i.status !== 'void' && i.status !== 'draft').reduce((sum, i) => sum + (i.amountCents || 0), 0),
    [invoices],
  );

  if (totalCents === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Money collected vs. owed</p>
      <ChartContainer config={CHART_CONFIG} className="mt-2 h-24 w-full aspect-auto">
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" hide />
          <ChartTooltip
            content={<ChartTooltipContent formatter={(value) => formatCents(Number(value) * 100)} />}
          />
          <Bar dataKey="collected" stackId="a" fill="var(--color-collected)" radius={[6, 0, 0, 6]} />
          <Bar dataKey="outstanding" stackId="a" fill="var(--color-outstanding)" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ChartContainer>
      <div className="mt-1 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--color-collected)' }} />
          Collected: {formatCents(data[0].collected * 100)}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--color-outstanding)' }} />
          Still owed: {formatCents(data[0].outstanding * 100)}
        </span>
      </div>
    </div>
  );
}
