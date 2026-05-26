export type ParsedOfficeStudentRow = {
  firstName: string;
  lastName: string;
  nickname: string | null;
  className: string | null;
  teacherName: string | null;
  notes: string | null;
};

export type ParsedOfficeGradeRow = {
  studentName: string;
  termLabel: string;
  subject: string;
  letterGrade: string | null;
  numericGrade: number | null;
  notes: string | null;
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
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
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

export function parseOfficeStudentsCsv(text: string): { rows: ParsedOfficeStudentRow[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const errors: string[] = [];
  if (lines.length < 2) {
    return { rows: [], errors: ['CSV needs a header row and at least one data row.'] };
  }
  const headers = parseCsvLine(lines[0]);
  const iFirst = headerIndex(headers, ['first', 'firstname', 'first name']);
  const iLast = headerIndex(headers, ['last', 'lastname', 'last name']);
  const iNick = headerIndex(headers, ['nickname', 'nick']);
  const iClass = headerIndex(headers, ['class', 'classname', 'class name']);
  const iTeacher = headerIndex(headers, ['teacher', 'teachername']);
  const iNotes = headerIndex(headers, ['notes', 'note']);
  if (iFirst < 0 || iLast < 0) {
    return { rows: [], errors: ['Missing required columns: First and Last (or First name / Last name).'] };
  }
  const rows: ParsedOfficeStudentRow[] = [];
  for (let li = 1; li < lines.length; li++) {
    const cells = parseCsvLine(lines[li]);
    const firstName = cells[iFirst]?.trim() ?? '';
    const lastName = cells[iLast]?.trim() ?? '';
    if (!firstName && !lastName) continue;
    if (!firstName || !lastName) {
      errors.push(`Row ${li + 1}: first and last name are required.`);
      continue;
    }
    rows.push({
      firstName,
      lastName,
      nickname: iNick >= 0 ? cells[iNick]?.trim() || null : null,
      className: iClass >= 0 ? cells[iClass]?.trim() || null : null,
      teacherName: iTeacher >= 0 ? cells[iTeacher]?.trim() || null : null,
      notes: iNotes >= 0 ? cells[iNotes]?.trim() || null : null,
    });
  }
  return { rows, errors };
}

export function parseOfficeGradesCsv(text: string): { rows: ParsedOfficeGradeRow[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const errors: string[] = [];
  if (lines.length < 2) {
    return { rows: [], errors: ['CSV needs a header row and at least one data row.'] };
  }
  const headers = parseCsvLine(lines[0]);
  const iStudent = headerIndex(headers, ['student', 'studentname', 'name']);
  const iTerm = headerIndex(headers, ['term', 'termlabel']);
  const iSubject = headerIndex(headers, ['subject']);
  const iLetter = headerIndex(headers, ['letter', 'lettergrade', 'grade']);
  const iPercent = headerIndex(headers, ['percent', 'numeric', 'numericgrade', '%']);
  const iNotes = headerIndex(headers, ['notes', 'note']);
  if (iStudent < 0 || iTerm < 0 || iSubject < 0) {
    return { rows: [], errors: ['Missing required columns: Student, Term, and Subject.'] };
  }
  const rows: ParsedOfficeGradeRow[] = [];
  for (let li = 1; li < lines.length; li++) {
    const cells = parseCsvLine(lines[li]);
    const studentName = cells[iStudent]?.trim() ?? '';
    const termLabel = cells[iTerm]?.trim() ?? '';
    const subject = cells[iSubject]?.trim() ?? '';
    if (!studentName && !subject) continue;
    if (!studentName || !termLabel || !subject) {
      errors.push(`Row ${li + 1}: student, term, and subject are required.`);
      continue;
    }
    const pctRaw = iPercent >= 0 ? cells[iPercent]?.trim() : '';
    let numericGrade: number | null = null;
    if (pctRaw) {
      const n = Number(pctRaw.replace('%', ''));
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        errors.push(`Row ${li + 1}: invalid percent "${pctRaw}".`);
        continue;
      }
      numericGrade = n;
    }
    rows.push({
      studentName,
      termLabel,
      subject,
      letterGrade: iLetter >= 0 ? cells[iLetter]?.trim() || null : null,
      numericGrade,
      notes: iNotes >= 0 ? cells[iNotes]?.trim() || null : null,
    });
  }
  return { rows, errors };
}
