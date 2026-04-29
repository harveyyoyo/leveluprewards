'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Helper } from '@/components/ui/helper';
import { getStudentNickname } from '@/lib/utils';
import type { Category, Class, Coupon, Prize, Student, Teacher } from '@/lib/types';
import {
  couponsForTeacherReport,
  prizesForTeacherReport,
  studentsInTeacherScope,
} from '@/lib/reportsScope';

export type ReportKind = 'summary' | 'roster' | 'coupons' | 'prizes' | 'classes';

function classNameForStudent(classId: string | undefined, classes: Class[]): string {
  if (!classId) return '—';
  return classes.find((c) => c.id === classId)?.name ?? '—';
}

function teacherNameById(teachers: Teacher[], id: string | undefined): string {
  if (!id) return '—';
  return teachers.find((t) => t.id === id)?.name ?? '—';
}

export function SchoolReportsPanel({
  scope,
  schoolName,
  teacherId,
  teacherName,
  students: allStudents,
  classes,
  teachers,
  coupons: allCoupons,
  prizes: allPrizes,
  categories,
}: {
  scope: 'school' | 'teacher';
  schoolName: string;
  teacherId?: string;
  teacherName?: string;
  students: Student[];
  classes: Class[];
  teachers: Teacher[];
  coupons: Coupon[];
  prizes: Prize[];
  categories: Category[];
}) {
  const [reportKind, setReportKind] = useState<ReportKind>('summary');

  const students = useMemo(() => {
    if (scope === 'school') return allStudents;
    if (!teacherId) return [];
    return studentsInTeacherScope(teacherId, allStudents, classes);
  }, [scope, teacherId, allStudents, classes]);

  const coupons = useMemo(
    () =>
      scope === 'school'
        ? allCoupons
        : teacherId
          ? couponsForTeacherReport(teacherId, allCoupons, 'teacher')
          : [],
    [scope, teacherId, allCoupons],
  );

  const prizes = useMemo(() => {
    if (scope === 'school') return allPrizes;
    if (!teacherId) return [];
    return prizesForTeacherReport(teacherId, allPrizes);
  }, [scope, teacherId, allPrizes]);

  const categoriesInScope = useMemo(() => {
    if (scope === 'school') return categories;
    if (!teacherId) return [];
    return categories.filter((c) => !c.teacherId || c.teacherId === teacherId);
  }, [scope, teacherId, categories]);

  const usedCouponsCount = useMemo(() => coupons.filter((c) => c.used).length, [coupons]);
  const totalCouponValueRedeemed = useMemo(
    () => coupons.filter((c) => c.used).reduce((sum, c) => sum + c.value, 0),
    [coupons],
  );

  const lifetimeIssued = useMemo(
    () => students.reduce((sum, s) => sum + (s.lifetimePoints ?? s.points ?? 0), 0),
    [students],
  );

  const rosterRows = useMemo(() => {
    const sorted = [...students].sort((a, b) => {
      const ca = classNameForStudent(a.classId, classes);
      const cb = classNameForStudent(b.classId, classes);
      if (ca !== cb) return ca.localeCompare(cb);
      return `${getStudentNickname(a)} ${a.lastName}`.localeCompare(`${getStudentNickname(b)} ${b.lastName}`);
    });
    return sorted.map((s) => ({
      id: s.id,
      name: `${getStudentNickname(s)} ${s.lastName}`.trim(),
      cls: classNameForStudent(s.classId, classes),
      points: s.points ?? 0,
      lifetime: s.lifetimePoints ?? s.points ?? 0,
      nfc: s.nfcId || '—',
    }));
  }, [students, classes]);

  const couponAgg = useMemo(() => {
    const byCat = new Map<string, { unused: number; used: number; valueUnused: number; valueUsed: number }>();
    for (const c of coupons) {
      const k = c.category || 'Other';
      const cur = byCat.get(k) ?? { unused: 0, used: 0, valueUnused: 0, valueUsed: 0 };
      if (c.used) {
        cur.used += 1;
        cur.valueUsed += c.value;
      } else {
        cur.unused += 1;
        cur.valueUnused += c.value;
      }
      byCat.set(k, cur);
    }
    return [...byCat.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [coupons]);

  const classesForScope = useMemo(() => {
    if (scope === 'school') return classes;
    if (!teacherId) return [];
    return classes.filter((c) => c.primaryTeacherId === teacherId);
  }, [scope, teacherId, classes]);

  const classRows = useMemo(() => {
    const list = scope === 'school' ? classes : classesForScope;
    return [...list]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((cl) => ({
        id: cl.id,
        name: cl.name,
        primary: teacherNameById(teachers, cl.primaryTeacherId),
        count: students.filter((s) => s.classId === cl.id).length,
      }));
  }, [scope, classes, classesForScope, teachers, students]);

  const scopeLabel =
    scope === 'school'
      ? 'School-wide'
      : teacherName
        ? `Teacher: ${teacherName}`
        : 'My classes & students';

  const [printing, setPrinting] = useState(false);
  const [generatedAt, setGeneratedAt] = useState('');

  const runPrint = useCallback(() => {
    setGeneratedAt(new Date().toLocaleString());
    setPrinting(true);
  }, []);

  useEffect(() => {
    if (!printing) return;
    document.body.classList.add('school-reports-printing');
    const timer = window.setTimeout(() => window.print(), 150);
    const done = () => {
      document.body.classList.remove('school-reports-printing');
      setPrinting(false);
    };
    window.addEventListener('afterprint', done);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('afterprint', done);
      document.body.classList.remove('school-reports-printing');
    };
  }, [printing]);

  const printNode =
    printing && typeof document !== 'undefined'
      ? createPortal(
          <div
            id="school-reports-print-wrapper"
            className="school-reports-print-root bg-white text-black text-[11pt] leading-snug"
          >
            <header className="border-b border-black pb-3 mb-4">
              <h1 className="text-xl font-bold">{schoolName || 'School'} — Reports</h1>
              <p className="text-sm mt-1">{scopeLabel}</p>
              <p className="text-xs text-neutral-700 mt-2">Generated {generatedAt}</p>
            </header>

            {reportKind === 'summary' && (
              <section className="space-y-4">
                <h2 className="text-lg font-bold border-b border-neutral-400 pb-1">Executive summary</h2>
                <table className="w-full border-collapse border border-black text-sm">
                  <tbody>
                    <tr>
                      <td className="border border-black p-2 font-semibold">Students in scope</td>
                      <td className="border border-black p-2 text-right">{students.length}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-semibold">
                        {scope === 'school' ? 'Classes' : 'My classes'}
                      </td>
                      <td className="border border-black p-2 text-right">
                        {scope === 'school' ? classes.length : classesForScope.length}
                      </td>
                    </tr>
                    {scope === 'school' ? (
                      <tr>
                        <td className="border border-black p-2 font-semibold">Teachers</td>
                        <td className="border border-black p-2 text-right">{teachers.length}</td>
                      </tr>
                    ) : null}
                    <tr>
                      <td className="border border-black p-2 font-semibold">Total lifetime points (issued, in scope)</td>
                      <td className="border border-black p-2 text-right">{lifetimeIssued.toLocaleString()} pts</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-semibold">Coupons redeemed (in scope)</td>
                      <td className="border border-black p-2 text-right">{usedCouponsCount.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-semibold">Coupon point value redeemed</td>
                      <td className="border border-black p-2 text-right">{totalCouponValueRedeemed.toLocaleString()} pts</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-semibold">Incentive categories</td>
                      <td className="border border-black p-2 text-right">{categoriesInScope.length}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-semibold">Prizes listed (in scope)</td>
                      <td className="border border-black p-2 text-right">{prizes.length}</td>
                    </tr>
                  </tbody>
                </table>
              </section>
            )}

            {reportKind === 'roster' && (
              <section className="space-y-3">
                <h2 className="text-lg font-bold border-b border-neutral-400 pb-1">Student roster</h2>
                <table className="w-full border-collapse border border-black text-[10pt]">
                  <thead>
                    <tr className="bg-neutral-100">
                      <th className="border border-black p-1.5 text-left">Student</th>
                      <th className="border border-black p-1.5 text-left">Class</th>
                      <th className="border border-black p-1.5 text-right">Points</th>
                      <th className="border border-black p-1.5 text-right">Lifetime</th>
                      <th className="border border-black p-1.5 text-left">ID / NFC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rosterRows.map((row) => (
                      <tr key={row.id}>
                        <td className="border border-black p-1.5">{row.name}</td>
                        <td className="border border-black p-1.5">{row.cls}</td>
                        <td className="border border-black p-1.5 text-right">{row.points}</td>
                        <td className="border border-black p-1.5 text-right">{row.lifetime}</td>
                        <td className="border border-black p-1.5 font-mono text-[9pt]">{row.nfc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rosterRows.length === 0 ? <p className="text-sm italic">No students in this scope.</p> : null}
              </section>
            )}

            {reportKind === 'coupons' && (
              <section className="space-y-3">
                <h2 className="text-lg font-bold border-b border-neutral-400 pb-1">Coupon inventory</h2>
                <p className="text-sm">
                  Total coupons in scope: {coupons.length} ({coupons.filter((c) => !c.used).length} unused,{' '}
                  {usedCouponsCount} redeemed).
                </p>
                <table className="w-full border-collapse border border-black text-[10pt]">
                  <thead>
                    <tr className="bg-neutral-100">
                      <th className="border border-black p-1.5 text-left">Category</th>
                      <th className="border border-black p-1.5 text-right">Unused #</th>
                      <th className="border border-black p-1.5 text-right">Redeemed #</th>
                      <th className="border border-black p-1.5 text-right">Pts (unused face value)</th>
                      <th className="border border-black p-1.5 text-right">Pts redeemed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {couponAgg.map(([cat, v]) => (
                      <tr key={cat}>
                        <td className="border border-black p-1.5">{cat}</td>
                        <td className="border border-black p-1.5 text-right">{v.unused}</td>
                        <td className="border border-black p-1.5 text-right">{v.used}</td>
                        <td className="border border-black p-1.5 text-right">{v.valueUnused.toLocaleString()}</td>
                        <td className="border border-black p-1.5 text-right">{v.valueUsed.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {couponAgg.length === 0 ? <p className="text-sm italic">No coupons in this scope.</p> : null}
              </section>
            )}

            {reportKind === 'prizes' && (
              <section className="space-y-3">
                <h2 className="text-lg font-bold border-b border-neutral-400 pb-1">Prize catalog</h2>
                <table className="w-full border-collapse border border-black text-[10pt]">
                  <thead>
                    <tr className="bg-neutral-100">
                      <th className="border border-black p-1.5 text-left">Prize</th>
                      <th className="border border-black p-1.5 text-right">Cost (pts)</th>
                      <th className="border border-black p-1.5 text-left">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...prizes]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((p) => (
                        <tr key={p.id}>
                          <td className="border border-black p-1.5">{p.name}</td>
                          <td className="border border-black p-1.5 text-right">{p.points}</td>
                          <td className="border border-black p-1.5">
                            {!p.inStock ? 'Out of stock' : typeof p.stockCount === 'number' ? p.stockCount : 'Unlimited'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {prizes.length === 0 ? <p className="text-sm italic">No prizes in this scope.</p> : null}
              </section>
            )}

            {reportKind === 'classes' && (
              <section className="space-y-3">
                <h2 className="text-lg font-bold border-b border-neutral-400 pb-1">Classes overview</h2>
                <table className="w-full border-collapse border border-black text-[10pt]">
                  <thead>
                    <tr className="bg-neutral-100">
                      <th className="border border-black p-1.5 text-left">Class</th>
                      <th className="border border-black p-1.5 text-left">Primary teacher</th>
                      <th className="border border-black p-1.5 text-right">Students (in scope)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classRows.map((row) => (
                      <tr key={row.id}>
                        <td className="border border-black p-1.5">{row.name}</td>
                        <td className="border border-black p-1.5">{row.primary}</td>
                        <td className="border border-black p-1.5 text-right">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {scope === 'teacher' ? (
                  <p className="text-xs text-neutral-600 mt-2">
                    Student counts include only students assigned to you or your classes.
                  </p>
                ) : null}
              </section>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <Card className="border-t-4 border-primary shadow-md">
        <CardHeader className="py-6">
          <CardTitle className="text-2xl flex items-center gap-2">
            <FileText className="text-primary w-6 h-6" aria-hidden />
            Reports
          </CardTitle>
          <CardDescription>
            Printable summaries for documentation and meetings ({scopeLabel}). Choose a report below, then use Print / PDF.
          </CardDescription>
          <p className="text-xs text-muted-foreground mt-2">
            <Helper content="Opens your browser print dialog — you can print to paper or choose Save as PDF.">
              Tip: Save as PDF from the print dialog for a digital copy.
            </Helper>
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="space-y-2 flex-1 max-w-md">
              <Label htmlFor="report-kind">Report type</Label>
              <Select value={reportKind} onValueChange={(v) => setReportKind(v as ReportKind)}>
                <SelectTrigger id="report-kind" className="rounded-xl h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Executive summary</SelectItem>
                  <SelectItem value="roster">Student roster</SelectItem>
                  <SelectItem value="coupons">Coupon inventory</SelectItem>
                  <SelectItem value="prizes">Prize catalog</SelectItem>
                  <SelectItem value="classes">Classes overview</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="button" className="rounded-xl gap-2 h-11 shrink-0" onClick={runPrint}>
              <Printer className="w-4 h-4" aria-hidden />
              Print / PDF
            </Button>
          </div>

          {/* Screen preview (mirrors print layout) */}
          <div className="rounded-xl border bg-muted/30 p-4 overflow-x-auto">
            <div className="min-w-[640px] bg-white text-foreground rounded-lg border p-6 shadow-sm">
              <header className="border-b pb-3 mb-4">
                <h2 className="text-lg font-bold">{schoolName || 'School'} — Reports</h2>
                <p className="text-sm text-muted-foreground mt-1">{scopeLabel}</p>
                <p className="text-xs text-muted-foreground mt-2">Preview — use Print / PDF for a clean copy</p>
              </header>
              {reportKind === 'summary' && (
                <ul className="grid sm:grid-cols-2 gap-3 text-sm">
                  <li className="flex justify-between border-b border-dashed pb-2">
                    <span>Students in scope</span>
                    <span className="font-bold">{students.length}</span>
                  </li>
                  <li className="flex justify-between border-b border-dashed pb-2">
                    <span>Coupons redeemed</span>
                    <span className="font-bold">{usedCouponsCount}</span>
                  </li>
                  <li className="flex justify-between border-b border-dashed pb-2">
                    <span>Lifetime points (in scope)</span>
                    <span className="font-bold">{lifetimeIssued.toLocaleString()} pts</span>
                  </li>
                  <li className="flex justify-between border-b border-dashed pb-2">
                    <span>Coupon value redeemed</span>
                    <span className="font-bold">{totalCouponValueRedeemed.toLocaleString()} pts</span>
                  </li>
                </ul>
              )}
              {reportKind === 'roster' && (
                <p className="text-sm text-muted-foreground">
                  {rosterRows.length} student{rosterRows.length === 1 ? '' : 's'} — full table in printout.
                </p>
              )}
              {reportKind === 'coupons' && (
                <p className="text-sm text-muted-foreground">
                  {coupons.length} coupon{coupons.length === 1 ? '' : 's'} — breakdown by category in printout.
                </p>
              )}
              {reportKind === 'prizes' && (
                <p className="text-sm text-muted-foreground">
                  {prizes.length} prize{prizes.length === 1 ? '' : 's'} — full list in printout.
                </p>
              )}
              {reportKind === 'classes' && (
                <p className="text-sm text-muted-foreground">
                  {classRows.length} class{classRows.length === 1 ? '' : 'es'} — details in printout.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      {printNode}
    </>
  );
}
