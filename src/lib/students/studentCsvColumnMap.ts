/** Column keys supported when mapping an arbitrary student roster CSV. */
export type StudentCsvMappedField =
  | 'skip'
  | 'firstName'
  | 'lastName'
  | 'className'
  | 'middleName'
  | 'nickname'
  | 'birthday'
  | 'parentEmail'
  | 'parentPhone'
  | 'studentEmail'
  | 'studentPhone';

export function detectDelimiter(headerLine: string): ',' | ';' {
  const commas = (headerLine.match(/,/g) || []).length;
  const semis = (headerLine.match(/;/g) || []).length;
  return semis > commas ? ';' : ',';
}

export function splitCsvLine(line: string, delimiter: ',' | ';'): string[] {
  const parts: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQ = !inQ;
      continue;
    }
    if (!inQ && ch === delimiter) {
      parts.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  parts.push(cur.trim());
  return parts.map((v) => v.replace(/^"|"$/g, '').trim());
}

export function parseStudentCsvToMatrix(text: string): { delimiter: ',' | ';'; rows: string[][] } {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim() !== '');
  if (lines.length === 0) return { delimiter: ',', rows: [] };
  const delimiter = detectDelimiter(lines[0]);
  const rows = lines.map((l) => splitCsvLine(l, delimiter));
  return { delimiter, rows };
}

const HEADER_ORDER: StudentCsvMappedField[] = [
  'firstName',
  'lastName',
  'className',
  'middleName',
  'nickname',
  'birthday',
  'parentEmail',
  'parentPhone',
  'studentEmail',
  'studentPhone',
];

/** Build CSV text understood by `uploadStudents` (header row + comma-separated). */
export function buildCanonicalStudentCsvFromMapping(
  rows: string[][],
  columnMap: StudentCsvMappedField[],
): string {
  if (rows.length === 0) return '';
  const header = [
    'First Name',
    'Last Name',
    'Class Name',
    'Middle Name',
    'Nickname',
    'Birthday',
    'Parent Email',
    'Parent Phone',
    'Student Email',
    'Student Phone',
  ];
  const out: string[][] = [header];
  const idx = (field: StudentCsvMappedField) => columnMap.indexOf(field);

  const esc = (v: string) => {
    if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
    return v;
  };

  for (let r = 1; r < rows.length; r++) {
    const src = rows[r];
    if (!src.some((c) => c.trim())) continue;
    const line: string[] = [];
    for (const field of HEADER_ORDER) {
      const i = idx(field);
      const raw = i >= 0 && i < src.length ? src[i] : '';
      line.push(raw.trim());
    }
    out.push(line);
  }

  return out.map((cells) => cells.map(esc).join(',')).join('\n');
}

/** Guess initial column mapping from header labels. */
export function guessStudentCsvColumnMap(headers: string[]): StudentCsvMappedField[] {
  const lower = headers.map((h) => h.toLowerCase().replace(/\s+/g, ' ').trim());
  const map: StudentCsvMappedField[] = lower.map(() => 'skip');

  const setFirst = (pred: (h: string) => boolean, field: StudentCsvMappedField) => {
    const i = lower.findIndex(pred);
    if (i >= 0) map[i] = field;
  };

  setFirst((h) => h === 'first name' || h === 'firstname' || h === 'first' || h.includes('first name'), 'firstName');
  setFirst((h) => h === 'last name' || h === 'lastname' || h === 'last' || h.includes('last name'), 'lastName');
  setFirst((h) => h.includes('class') || h.includes('homeroom') || h.includes('section'), 'className');
  setFirst((h) => h.includes('middle'), 'middleName');
  setFirst((h) => h.includes('nick') || h.includes('preferred'), 'nickname');
  setFirst((h) => h.includes('birth') || h === 'dob', 'birthday');
  setFirst((h) => h.includes('parent') && h.includes('email'), 'parentEmail');
  setFirst((h) => h.includes('parent') && (h.includes('phone') || h.includes('mobile')), 'parentPhone');
  setFirst((h) => h.includes('student') && h.includes('email'), 'studentEmail');
  setFirst((h) => h.includes('student') && h.includes('phone'), 'studentPhone');

  return map;
}
