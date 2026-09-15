import type { LibraryItem } from '@/lib/types';
import { computeDaysOverdue } from '@/lib/library/libraryPolicy';
import { resolveBookClassification, type LibraryGenreConfig } from '@/lib/library/libraryClassification';

export interface LibraryLoan {
  id: string;
  itemId: string;
  studentId: string;
  title: string;
  upc: string;
  libraryLocationId?: string | null;
  checkedOutAt: number;
  dueAt: number;
  returnedAt?: number | null;
  renewalCount?: number;
  pointsDelta?: number;
  rewardMode?: string;
}

/** True when a copy is on the shelf but not finished (no sticker and/or no shelf spot). */
export function libraryCopyNeedsProcessing(item: Pick<LibraryItem, 'labeled' | 'shelfLocation'>): boolean {
  return !item.labeled || !item.shelfLocation?.trim();
}

export function libraryCopyProcessingReason(item: Pick<LibraryItem, 'labeled' | 'shelfLocation'>): string {
  const missingLabel = !item.labeled;
  const missingShelf = !item.shelfLocation?.trim();
  if (missingLabel && missingShelf) {
    return 'Print a barcode sticker, scan it at the Librarian desk, and add a shelf location.';
  }
  if (missingLabel) {
    return 'Print a barcode sticker, then scan it at the Librarian desk to officially catalog this copy.';
  }
  return 'Add a shelf location so it can be found.';
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

export function filterLibraryCatalog(
  items: LibraryItem[],
  search: string,
  status: string,
  borrower: (id?: string) => string,
  genreDefinitions?: LibraryGenreConfig[] | null,
) {
  const term = search.trim().toLowerCase();
  return items.filter(item => !item.archived &&
    matchesCatalogStatus(item, status) &&
    (!term || [item.name, item.author, item.upc, item.isbn, item.category, item.shelfLocation, item.copyNumber,
      resolveBookClassification(item.category, genreDefinitions, item.shelfLocation).genre.label,
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
  printLibraryTable(
    'Library loan list',
    ['Student', 'Class', 'Book', 'Due date'],
    items.map((i) => [
      borrower(i.checkedOutTo ?? undefined),
      className(i.checkedOutTo ?? undefined),
      i.name,
      i.dueAt ? new Date(i.dueAt).toLocaleDateString() : 'No due date',
    ]),
  );
}

export function printLibraryTable(title: string, headers: string[], rows: string[][]) {
  const popup = window.open('', '_blank', 'width=900,height=700');
  if (!popup) throw new Error('Allow pop-ups to print this list.');
  const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
  popup.document.write(
    `<!doctype html><html><head><title>${escape(title)}</title><style>body{font:14px system-ui;margin:32px}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:10px;border-bottom:1px solid #ddd}h1{font-size:24px}@media print{button{display:none}thead{display:table-header-group}}</style></head><body><h1>${escape(title)}</h1><p>${escape(new Date().toLocaleDateString())} · ${rows.length} ${rows.length === 1 ? 'row' : 'rows'}</p><button onclick="window.print()">Print</button><table><thead><tr>${headers.map((h) => `<th>${escape(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escape(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`,
  );
  popup.document.close();
}
