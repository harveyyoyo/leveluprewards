import { formatCents } from '@/lib/office/officeNav';
import { invoiceBalanceDueCents, invoicePaidCents, invoiceRemainingCents } from '@/lib/office/officeBillingPayments';
import type { OfficeBillingAccount, OfficeInvoice } from '@/lib/office/types';

export function escapeOfficePrintHtml(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function openOfficePrintDocument(html: string): boolean {
  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
  return true;
}

const OFFICE_PRINT_STYLES = `
  body { font-family: system-ui, sans-serif; padding: 24px; color: #0f172a; }
  h1 { font-size: 1.25rem; margin: 0 0 4px; }
  h2 { font-size: 1rem; margin: 1rem 0 0.5rem; }
  .muted { color: #64748b; font-size: 0.875rem; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 0.875rem; }
  th, td { border-bottom: 1px solid #e2e8f0; padding: 8px 4px; text-align: left; }
  th { font-size: 0.75rem; text-transform: uppercase; color: #64748b; }
  .total { margin-top: 16px; font-weight: 700; }
  .section { break-inside: avoid; margin-top: 1rem; }
  @media print { body { padding: 0; } }
`;

export function buildOfficeFamilyStatementHtml(params: {
  account: OfficeBillingAccount;
  invoices: OfficeInvoice[];
  studentLabels: string[];
  schoolLabel: string;
}): string {
  const acctInvoices = params.invoices
    .filter((i) => i.accountId === params.account.id)
    .slice()
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
  const openTotal = acctInvoices.reduce((sum, i) => sum + invoiceBalanceDueCents(i), 0);
  const rows = acctInvoices
    .map(
      (inv) => `
      <tr>
        <td>${escapeOfficePrintHtml(inv.label)}</td>
        <td>${escapeOfficePrintHtml(inv.dueDate)}</td>
        <td>${escapeOfficePrintHtml(inv.status)}</td>
        <td style="text-align:right">${formatCents(inv.amountCents)}</td>
        <td style="text-align:right">${formatCents(invoicePaidCents(inv))}</td>
        <td style="text-align:right">${formatCents(invoiceRemainingCents(inv))}</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html><html><head><title>Statement — ${escapeOfficePrintHtml(params.account.familyName)}</title>
    <style>${OFFICE_PRINT_STYLES}</style></head><body>
    <p class="muted">${escapeOfficePrintHtml(params.schoolLabel)}</p>
    <h1>Billing statement — ${escapeOfficePrintHtml(params.account.familyName)}</h1>
    <p class="muted">Students: ${escapeOfficePrintHtml(params.studentLabels.join(', ') || '—')}</p>
    ${params.account.contactEmail ? `<p class="muted">${escapeOfficePrintHtml(params.account.contactEmail)}</p>` : ''}
    <table><thead><tr><th>Description</th><th>Due</th><th>Status</th><th>Amount</th><th>Paid</th><th>Remaining</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="total">Open balance: ${formatCents(openTotal)}</p>
    <p class="muted">Printed ${new Date().toLocaleString()}</p>
    </body></html>`;
}

export function buildOfficeDocumentShell(params: {
  title: string;
  schoolLabel: string;
  subtitle?: string;
  bodyHtml: string;
}): string {
  return `<!DOCTYPE html><html><head><title>${escapeOfficePrintHtml(params.title)}</title>
    <style>${OFFICE_PRINT_STYLES}</style></head><body>
    <p class="muted">${escapeOfficePrintHtml(params.schoolLabel)}</p>
    <h1>${escapeOfficePrintHtml(params.title)}</h1>
    ${params.subtitle ? `<p class="muted">${escapeOfficePrintHtml(params.subtitle)}</p>` : ''}
    ${params.bodyHtml}
    <p class="muted" style="margin-top:16px">Printed ${new Date().toLocaleString()}</p>
    </body></html>`;
}
