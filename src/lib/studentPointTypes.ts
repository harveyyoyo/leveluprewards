import type { Student } from '@/lib/types';

export type StudentPointTypeTotal = {
  label: string;
  points: number;
};

function safePoints(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

export function getStudentPointTypeTotals(student: Pick<Student, 'points' | 'lifetimePoints' | 'categoryPoints'>): StudentPointTypeTotal[] {
  const byType = Object.entries(student.categoryPoints || {})
    .map(([label, value]) => ({ label: label.trim() || 'Uncategorized', points: safePoints(value) }))
    .filter((row) => row.points > 0)
    .sort((a, b) => b.points - a.points || a.label.localeCompare(b.label));

  const categorizedTotal = byType.reduce((sum, row) => sum + row.points, 0);
  const lifetimeTotal = safePoints(student.lifetimePoints ?? student.points);
  const uncategorized = Math.max(0, lifetimeTotal - categorizedTotal);

  if (uncategorized > 0) {
    byType.push({ label: categorizedTotal > 0 ? 'Bonus or legacy' : 'Uncategorized', points: uncategorized });
  }

  return byType;
}

export function formatStudentPointTypes(student: Pick<Student, 'points' | 'lifetimePoints' | 'categoryPoints'>, maxItems = 3): string {
  const rows = getStudentPointTypeTotals(student);
  if (rows.length === 0) return 'No point types yet';

  const visible = rows.slice(0, Math.max(1, maxItems));
  const suffix = rows.length > visible.length ? ` +${rows.length - visible.length} more` : '';
  return `${visible.map((row) => `${row.label}: ${row.points.toLocaleString()}`).join(' | ')}${suffix}`;
}
