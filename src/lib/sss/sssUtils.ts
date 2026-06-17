import type { SssStudent } from '@/lib/sss/types';

function namePart(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function getSssStudentLabel(student: Pick<SssStudent, 'firstName' | 'lastName' | 'nickname'>): string {
  return namePart(student.nickname) || namePart(student.firstName);
}

export function getSssStudentFullName(student: Pick<SssStudent, 'firstName' | 'lastName' | 'nickname'>): string {
  const label = getSssStudentLabel(student);
  const last = namePart(student.lastName);
  if (label && last) return `${label} ${last}`;
  return label || last;
}

export function sssStudentMatchesQuery(student: SssStudent, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    getSssStudentFullName(student),
    student.sourceSchool,
    student.dateOfBirth,
    student.homeAddress,
    student.parent1Name,
    student.parent2Name,
    student.email1,
    student.email2,
    student.notes,
    ...(student.contacts ?? []).flatMap((c) => [c.label, c.phone]),
    ...(student.providers ?? []).flatMap((p) => [p.name, p.hours != null ? String(p.hours) : '']),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

function downloadCsv(filename: string, headers: string[], rows: string[][]): void {
  const escape = (cell: string) => {
    const v = cell.replace(/"/g, '""');
    return /[",\n]/.test(v) ? `"${v}"` : v;
  };
  const lines = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportSssStudentsCsv(schoolId: string, students: SssStudent[]): void {
  const rows = students.map((s) => [
    s.lastName,
    s.firstName,
    s.sourceSchool ?? '',
    s.providers?.[0]?.name ?? '',
    s.providers?.[0]?.hours != null ? String(s.providers[0].hours) : '',
    s.providers?.[1]?.name ?? '',
    s.providers?.[1]?.hours != null ? String(s.providers[1].hours) : '',
    s.providers?.[2]?.name ?? '',
    s.providers?.[2]?.hours != null ? String(s.providers[2].hours) : '',
    s.dateOfBirth ?? '',
    s.homeAddress ?? '',
    s.parent1Name ?? '',
    s.parent2Name ?? '',
    s.email1 ?? '',
    s.email2 ?? '',
    s.contacts?.[0]?.label ?? '',
    s.contacts?.[0]?.phone ?? '',
    s.contacts?.[1]?.label ?? '',
    s.contacts?.[1]?.phone ?? '',
    s.contacts?.[2]?.label ?? '',
    s.contacts?.[2]?.phone ?? '',
  ]);
  downloadCsv(`student-special-services-${schoolId}.csv`, [
    'Last Name', 'First Name', 'School', 'Provider 1', 'Hours', 'Provider 2', 'Hours',
    'Provider 3', 'Hours', 'DOB', 'Home Address', 'Parent 1', 'Parent 2', 'Email 1',
    'Email 2', 'Contact 1', 'Phone 1', 'Contact 2', 'Phone 2', 'Contact 3', 'Phone 3',
  ], rows);
}
