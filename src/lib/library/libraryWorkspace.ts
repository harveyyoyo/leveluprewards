import type { LibraryItem } from '@/lib/types';
import { computeDaysOverdue } from '@/lib/library/libraryPolicy';

export interface LibraryLoan {
  id: string;
  itemId: string;
  studentId: string;
  title: string;
  upc: string;
  checkedOutAt: number;
  dueAt: number;
  returnedAt?: number | null;
  renewalCount?: number;
  pointsDelta?: number;
  rewardMode?: string;
}

function matchesCatalogStatus(item: LibraryItem, status: string) {
  if (status === 'all') return true;
  if (status === 'available') {
    return item.status === 'available' && (!item.condition || item.condition === 'good');
  }
  if (status === 'checked_out') return item.status === 'checked_out';
  if (status === 'overdue') {
    return item.status === 'checked_out' && computeDaysOverdue(item.dueAt) > 0;
  }
  return item.condition === status;
}

export function filterLibraryCatalog(items: LibraryItem[], search: string, status: string, borrower: (id?: string) => string) {
  const term = search.trim().toLowerCase();
  return items.filter(item => !item.archived &&
    matchesCatalogStatus(item, status) &&
    (!term || [item.name, item.author, item.upc, item.isbn, item.category, item.shelfLocation, item.copyNumber,
      item.checkedOutTo ? borrower(item.checkedOutTo) : ''].join(' ').toLowerCase().includes(term)))
    .sort((a, b) => a.name.localeCompare(b.name) || a.upc.localeCompare(b.upc));
}

export function libraryCsv(rows: (string | number | null | undefined)[][]): string {
  return '\uFEFF' + rows.map(row => row.map(value => {
    const text = String(value ?? '');
    // Spreadsheet programs must treat imported names as data, never formulas.
    const safe = /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  }).join(',')).join('\r\n');
}

export function downloadLibraryCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const url = URL.createObjectURL(new Blob([libraryCsv(rows)], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function printLibraryLoans(items: LibraryItem[], borrower: (id?: string) => string, className: (id?: string) => string) {
  const popup = window.open('', '_blank', 'width=900,height=700');
  if (!popup) throw new Error('Allow pop-ups to print the loan list.');
  const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
  popup.document.write(`<!doctype html><html><head><title>Library loan list</title><style>body{font:14px system-ui;margin:32px}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:10px;border-bottom:1px solid #ddd}h1{font-size:24px}@media print{button{display:none}thead{display:table-header-group}}</style></head><body><h1>Library loan list</h1><p>${escape(new Date().toLocaleDateString())} · ${items.length} copies</p><button onclick="window.print()">Print</button><table><thead><tr><th>Student</th><th>Class</th><th>Book</th><th>Due date</th></tr></thead><tbody>${items.map(i => `<tr><td>${escape(borrower(i.checkedOutTo ?? undefined))}</td><td>${escape(className(i.checkedOutTo ?? undefined))}</td><td>${escape(i.name)}</td><td>${escape(i.dueAt ? new Date(i.dueAt).toLocaleDateString() : 'No due date')}</td></tr>`).join('')}</tbody></table></body></html>`);
  popup.document.close();
}
