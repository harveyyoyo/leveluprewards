'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCents } from '@/lib/office/officeNav';
import { isInvoiceOpen } from '@/lib/office/officeUtils';
import type { OfficeBillingAccount, OfficeInvoice, OfficeStudent } from '@/lib/office/types';

type OfficeFamilyStatementProps = {
  account: OfficeBillingAccount;
  invoices: OfficeInvoice[];
  studentLabels: string[];
  schoolLabel?: string;
  statementSchoolName?: string | null;
};

export function OfficeFamilyStatementButton({
  account,
  invoices,
  studentLabels,
  schoolLabel,
  statementSchoolName,
}: OfficeFamilyStatementProps) {
  const printStatement = () => {
    const acctInvoices = invoices
      .filter((i) => i.accountId === account.id)
      .slice()
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const openTotal = acctInvoices
      .filter(isInvoiceOpen)
      .reduce((sum, i) => sum + (i.amountCents || 0), 0);
    const rows = acctInvoices
      .map(
        (inv) => `
      <tr>
        <td>${escapeHtml(inv.label)}</td>
        <td>${escapeHtml(inv.dueDate)}</td>
        <td>${escapeHtml(inv.status)}</td>
        <td style="text-align:right">${formatCents(inv.amountCents)}</td>
      </tr>`,
      )
      .join('');
    const html = `<!DOCTYPE html><html><head><title>Statement — ${escapeHtml(account.familyName)}</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 24px; color: #0f172a; }
        h1 { font-size: 1.25rem; margin: 0 0 4px; }
        .muted { color: #64748b; font-size: 0.875rem; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 0.875rem; }
        th, td { border-bottom: 1px solid #e2e8f0; padding: 8px 4px; text-align: left; }
        th { font-size: 0.75rem; text-transform: uppercase; color: #64748b; }
        .total { margin-top: 16px; font-weight: 700; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <p class="muted">${escapeHtml(statementSchoolName?.trim() || schoolLabel?.trim() || 'School Office')}</p>
      <h1>Billing statement — ${escapeHtml(account.familyName)}</h1>
      <p class="muted">Students: ${escapeHtml(studentLabels.join(', ') || '—')}</p>
      ${account.contactEmail ? `<p class="muted">${escapeHtml(account.contactEmail)}</p>` : ''}
      <table><thead><tr><th>Description</th><th>Due</th><th>Status</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="total">Open balance: ${formatCents(openTotal)}</p>
      <p class="muted">Printed ${new Date().toLocaleString()}</p>
      </body></html>`;
    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 rounded-lg gap-1 text-xs"
      onClick={printStatement}
    >
      <Printer className="h-3.5 w-3.5" />
      Statement
    </Button>
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
