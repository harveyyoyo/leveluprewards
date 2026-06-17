import type { SssContact, SssProvider, SssStudent } from '@/lib/sss/types';

export type ParsedSssSpreadsheetRow = {
  firstName: string;
  lastName: string;
  nickname: string | null;
  sourceSchool: string | null;
  dateOfBirth: string | null;
  homeAddress: string | null;
  parent1Name: string | null;
  parent2Name: string | null;
  email1: string | null;
  email2: string | null;
  contacts: SssContact[];
  providers: SssProvider[];
};

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += ch;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ',') {
      cells.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, '');
}

function headerIndex(headers: string[], aliases: string[]): number {
  const norm = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const i = norm.indexOf(alias);
    if (i >= 0) return i;
  }
  return -1;
}

function cell(cells: string[], index: number): string {
  return index < 0 ? '' : (cells[index] ?? '').trim();
}

function parseHours(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function splitFirstNameNickname(raw: string): { firstName: string; nickname: string | null } {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (match) return { firstName: match[1].trim(), nickname: match[2].trim() || null };
  return { firstName: trimmed, nickname: null };
}

function providerPairs(headers: string[]): { nameIdx: number; hoursIdx: number }[] {
  const norm = headers.map(normalizeHeader);
  const providerIndices = norm.map((h, i) => (/^provider\d+$/.test(h) ? i : -1)).filter((i) => i >= 0);
  const hoursIndices = norm.map((h, i) => (h === 'hours' ? i : -1)).filter((i) => i >= 0);
  return providerIndices.map((nameIdx, pi) => ({ nameIdx, hoursIdx: hoursIndices[pi] ?? -1 }));
}

function rowFromCells(cells: string[], headers: string[], rowNum: number) {
  const iLast = headerIndex(headers, ['lastname', 'last']);
  const iFirst = headerIndex(headers, ['firstname', 'first']);
  const iSchool = headerIndex(headers, ['school']);
  const iDob = headerIndex(headers, ['dob', 'dateofbirth']);
  const iAddress = headerIndex(headers, ['homeaddress', 'address']);
  const iP1 = headerIndex(headers, ['parent1']);
  const iP2 = headerIndex(headers, ['parent2']);
  const iEmail1 = headerIndex(headers, ['email1']);
  const iEmail2 = headerIndex(headers, ['email2']);
  if (iFirst < 0 || iLast < 0) {
    return { row: null, error: 'Missing required columns: First Name and Last Name.' };
  }
  const lastName = cell(cells, iLast);
  const firstRaw = cell(cells, iFirst);
  if (!firstRaw && !lastName) return { row: null };
  if (!firstRaw || !lastName) {
    return { row: null, error: `Row ${rowNum}: first and last name are required.` };
  }
  const { firstName, nickname } = splitFirstNameNickname(firstRaw);
  const providers: SssProvider[] = [];
  for (const { nameIdx, hoursIdx } of providerPairs(headers)) {
    const name = cell(cells, nameIdx);
    if (!name) continue;
    providers.push({ name, hours: hoursIdx >= 0 ? parseHours(cell(cells, hoursIdx)) : null });
  }
  const contacts: SssContact[] = [];
  for (let n = 1; n <= 3; n++) {
    const label = cell(cells, headerIndex(headers, [`contact${n}`]));
    const phone = cell(cells, headerIndex(headers, [`phone${n}`]));
    if (label || phone) contacts.push({ label: label || null, phone: phone || null });
  }
  return {
    row: {
      firstName,
      lastName,
      nickname,
      sourceSchool: cell(cells, iSchool) || null,
      dateOfBirth: cell(cells, iDob) || null,
      homeAddress: cell(cells, iAddress) || null,
      parent1Name: cell(cells, iP1) || null,
      parent2Name: cell(cells, iP2) || null,
      email1: cell(cells, iEmail1) || null,
      email2: cell(cells, iEmail2) || null,
      contacts,
      providers,
    } as ParsedSssSpreadsheetRow,
  };
}

export function parseSssSpreadsheetCsv(text: string): { rows: ParsedSssSpreadsheetRow[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return { rows: [], errors: ['Spreadsheet needs a header row and at least one data row.'] };
  }
  const headers = parseCsvLine(lines[0]);
  const rows: ParsedSssSpreadsheetRow[] = [];
  const errors: string[] = [];
  for (let li = 1; li < lines.length; li++) {
    const { row, error } = rowFromCells(parseCsvLine(lines[li]), headers, li + 1);
    if (error) errors.push(error);
    if (row) rows.push(row);
  }
  return { rows, errors };
}

export function parseSssSpreadsheetObjects(records: Record<string, unknown>[]) {
  if (records.length === 0) return { rows: [], errors: ['Spreadsheet is empty.'] };
  const headers = Object.keys(records[0] ?? {});
  const rows: ParsedSssSpreadsheetRow[] = [];
  const errors: string[] = [];
  records.forEach((record, index) => {
    const cells = headers.map((h) => String(record[h] ?? '').trim());
    const { row, error } = rowFromCells(cells, headers, index + 2);
    if (error) errors.push(error);
    if (row) rows.push(row);
  });
  return { rows, errors };
}

export function filterSssRowsBySchool(rows: ParsedSssSpreadsheetRow[], schoolFilter: string) {
  const q = schoolFilter.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => (r.sourceSchool ?? '').toLowerCase().includes(q));
}

export function uniqueSssSourceSchools(rows: ParsedSssSpreadsheetRow[]): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    const s = row.sourceSchool?.trim();
    if (s) set.add(s);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function sssRowToFirestorePayload(row: ParsedSssSpreadsheetRow, updatedAt: number): Omit<SssStudent, 'id'> {
  return {
    firstName: row.firstName,
    lastName: row.lastName,
    nickname: row.nickname,
    sourceSchool: row.sourceSchool,
    dateOfBirth: row.dateOfBirth,
    homeAddress: row.homeAddress,
    parent1Name: row.parent1Name,
    parent2Name: row.parent2Name,
    email1: row.email1,
    email2: row.email2,
    contacts: row.contacts.length ? row.contacts : null,
    providers: row.providers.length ? row.providers : null,
    notes: null,
    updatedAt,
  };
}
