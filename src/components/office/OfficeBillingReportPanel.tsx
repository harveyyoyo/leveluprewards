'use client';

import { useMemo, useState } from 'react';
import { downloadCsv } from '@/lib/office/officeUtils';
import { formatCents } from '@/lib/office/officeNav';
import { OfficeSearchInput } from '@/components/office/OfficeSearchInput';
import { Button } from '@/components/ui/button';
import { sumPaymentsForAccountYear } from '@/lib/office/officeDb';
import type { OfficeBillingAccount, OfficeInvoice, OfficePayment } from '@/lib/office/types';
import { safeString } from '@/lib/safeDisplayValue';
import { useToast } from '@/hooks/use-toast';

type OfficeBillingReportPanelProps = {
  schoolId: string;
  accounts: OfficeBillingAccount[];
  invoices: OfficeInvoice[];
  payments: OfficePayment[];
  studentLabelById: Map<string, string>;
};

export function OfficeBillingReportPanel({
  schoolId,
  accounts,
  invoices,
  payments,
  studentLabelById,
}: OfficeBillingReportPanelProps) {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts
      .filter((a) => {
        if (!q) return true;
        const linked = a.studentIds.map((id) => studentLabelById.get(id)).join(' ');
        return (
          safeString(a.familyName).toLowerCase().includes(q) ||
          safeString(a.contactEmail).toLowerCase().includes(q) ||
          linked.toLowerCase().includes(q)
        );
      })
      .map((a) => {
        const openInvoices = invoices.filter(
          (i) => i.accountId === a.id && (i.status === 'sent' || i.status === 'partial' || i.status === 'draft'),
        );
        const paidThisYear = sumPaymentsForAccountYear(payments, a.id, year);
        return { account: a, openInvoices, paidThisYear };
      });
  }, [accounts, invoices, payments, query, studentLabelById, year]);

  const exportCsv = () => {
    const data = rows.map(({ account, openInvoices, paidThisYear }) => [
      safeString(account.familyName),
      formatCents(account.balanceCents || 0),
      String(openInvoices.length),
      formatCents(paidThisYear),
      safeString(account.contactEmail),
    ]);
    downloadCsv(`office-billing-report-${schoolId}.csv`, ['Family', 'Balance', 'Open invoices', `Paid ${year}`, 'Email'], data);
    toast({ title: 'Billing report exported' });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <OfficeSearchInput value={query} onChange={setQuery} placeholder="Search families, emails, students…" className="max-w-sm" />
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="billing-report-year">
            Payments year
          </label>
          <input
            id="billing-report-year"
            type="number"
            className="h-9 w-24 rounded-xl border px-2 text-sm"
            value={year}
            onChange={(e) => setYear(Number(e.target.value) || year)}
          />
        </div>
        <Button type="button" variant="outline" className="rounded-xl" onClick={exportCsv}>
          Export CSV
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-white dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs uppercase text-muted-foreground dark:bg-slate-800/50">
              <th className="px-4 py-3">Family</th>
              <th className="px-4 py-3">Balance</th>
              <th className="px-4 py-3">Open</th>
              <th className="px-4 py-3">Paid {year}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ account, openInvoices, paidThisYear }) => (
              <tr key={account.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{account.familyName}</td>
                <td className="px-4 py-3">{formatCents(account.balanceCents || 0)}</td>
                <td className="px-4 py-3">{openInvoices.length}</td>
                <td className="px-4 py-3">{formatCents(paidThisYear)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
