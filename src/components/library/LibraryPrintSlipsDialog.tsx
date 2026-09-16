'use client';

import { useState, useRef, useMemo } from 'react';
import { Printer, FileText, Layers, Backpack, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { formatDueDate, computeDaysOverdue } from '@/lib/library/libraryPolicy';
import type { LibraryItem } from '@/lib/types';

export function LibraryPrintSlipsDialog({
  isOpen,
  setIsOpen,
  loans = [],
  schoolName = 'School Library',
  getStudentName,
  getClassName,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  loans: LibraryItem[];
  schoolName?: string;
  getStudentName: (id?: string) => string;
  getClassName: (id?: string) => string;
}) {
  const [printFormat, setPrintFormat] = useState<'backpack' | 'slips' | 'table'>('backpack');
  const [filterMode, setFilterMode] = useState<'all' | 'overdue'>('overdue');
  const printAreaRef = useRef<HTMLDivElement>(null);

  const overdueCount = useMemo(() => {
    return loans.filter((l) => computeDaysOverdue(l.dueAt) > 0).length;
  }, [loans]);

  const displayedLoans = useMemo(() => {
    if (filterMode === 'overdue') {
      return loans.filter((l) => computeDaysOverdue(l.dueAt) > 0);
    }
    return loans;
  }, [loans, filterMode]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-h-[92dvh] max-w-4xl overflow-y-auto print:max-h-none print:h-auto print:overflow-visible print:max-w-none print:w-full print:p-0 print:border-none print:shadow-none print:bg-white">
        <DialogHeader className="print:hidden">
          <div className="flex items-center justify-between gap-2 pr-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Printer className="h-5 w-5" />
              </div>
              <DialogTitle>Print Circulation Slips &amp; Reminders</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              {overdueCount > 0 && (
                <Badge variant="destructive" className="font-bold text-xs">
                  {overdueCount} overdue
                </Badge>
              )}
              <Badge variant="secondary" className="font-bold text-xs">
                {loans.length} total loan{loans.length === 1 ? '' : 's'}
              </Badge>
            </div>
          </div>
          <DialogDescription>
            Print friendly backpack notes for families, classroom reminder slips, or circulation rosters.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 print:space-y-0">
          {/* Format & Filter Toolbar */}
          <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-2.5 rounded-2xl border">
            <Tabs
              value={printFormat}
              onValueChange={(v) => setPrintFormat(v as 'backpack' | 'slips' | 'table')}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid w-full grid-cols-3 sm:w-auto">
                <TabsTrigger value="backpack" className="gap-1.5 text-xs">
                  <Backpack className="h-3.5 w-3.5" />
                  <span>Backpack Note</span>
                </TabsTrigger>
                <TabsTrigger value="slips" className="gap-1.5 text-xs">
                  <Layers className="h-3.5 w-3.5" />
                  <span>Classroom Slips</span>
                </TabsTrigger>
                <TabsTrigger value="table" className="gap-1.5 text-xs">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Roster Table</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <span className="text-xs text-muted-foreground font-medium">Filter:</span>
              <Button
                type="button"
                variant={filterMode === 'overdue' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterMode('overdue')}
                className="h-8 text-xs rounded-xl font-bold"
              >
                Overdue Only ({overdueCount})
              </Button>
              <Button
                type="button"
                variant={filterMode === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterMode('all')}
                className="h-8 text-xs rounded-xl font-bold"
              >
                All Loans ({loans.length})
              </Button>
            </div>
          </div>

          {/* Printable Container */}
          <div ref={printAreaRef} className="rounded-2xl border p-4 bg-background print:border-none print:p-0">
            {displayedLoans.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="font-bold text-foreground">No matching loans found.</p>
                <p className="text-xs text-muted-foreground">
                  {filterMode === 'overdue'
                    ? 'All checked out books are currently on time! Select "All Loans" to print reminder slips for other books.'
                    : 'There are no active books checked out right now.'}
                </p>
              </div>
            ) : printFormat === 'backpack' ? (
              /* Backpack Reminder Slips (Warm, Friendly Note for Families) */
              <div className="space-y-4">
                <div className="print:hidden text-xs text-muted-foreground flex items-center justify-between">
                  <span>Preview: friendly 4-up note to slip into student backpacks or folders.</span>
                  <span>{displayedLoans.length} slip{displayedLoans.length === 1 ? '' : 's'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print:grid-cols-2 print:gap-4 print:text-black">
                  {displayedLoans.map((loan) => {
                    const student = getStudentName(loan.checkedOutTo ?? undefined);
                    const homeroom = getClassName(loan.checkedOutTo ?? undefined);
                    const overdueDays = computeDaysOverdue(loan.dueAt);
                    const isOverdue = overdueDays > 0;

                    return (
                      <div
                        key={loan.id}
                        className="rounded-2xl border-2 border-dashed border-primary/30 p-4 bg-primary/[0.02] print:border-black print:bg-white print:break-inside-avoid flex flex-col justify-between min-h-[220px]"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between border-b pb-2">
                            <span className="font-black text-xs uppercase tracking-wider text-primary flex items-center gap-1.5 print:text-black">
                              <Backpack className="h-4 w-4" />
                              {schoolName} · Library Note
                            </span>
                            {isOverdue ? (
                              <Badge variant="destructive" className="text-[10px] font-black uppercase">
                                Overdue
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] font-bold uppercase">
                                Due Soon
                              </Badge>
                            )}
                          </div>

                          <div className="pt-0.5">
                            <p className="font-black text-base text-foreground print:text-black">
                              Hi {student} &amp; Family!
                            </p>
                            {homeroom && (
                              <p className="text-[11px] text-muted-foreground print:text-gray-700">
                                Class / Homeroom: {homeroom}
                              </p>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground print:text-gray-800 leading-snug">
                            Our school library shelves miss this book! Could you please check backpacks, bookshelves, and under beds at home?
                          </p>

                          <div className="rounded-xl bg-background p-2.5 border text-xs space-y-1 print:bg-gray-50 print:border-gray-300">
                            <p className="font-bold text-sm text-foreground print:text-black line-clamp-1">
                              📖 {loan.name}
                            </p>
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground print:text-gray-700 font-mono">
                              <span>Barcode: {loan.upc}</span>
                              <span className={isOverdue ? 'font-bold text-destructive print:text-red-700' : 'text-primary print:text-black'}>
                                {isOverdue
                                  ? `Due: ${formatDueDate(loan.dueAt)} (${overdueDays}d late)`
                                  : `Due: ${formatDueDate(loan.dueAt)}`}
                              </span>
                            </div>
                          </div>
                        </div>

                        <p className="text-[10px] text-muted-foreground print:text-gray-600 pt-2 text-center italic border-t border-dashed mt-2">
                          Please return this book to your teacher or library drop box so classmates can read it next. Thank you!
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : printFormat === 'slips' ? (
              /* Standard Classroom Reminder Slips (4-Up) */
              <div className="space-y-4">
                <div className="print:hidden text-xs text-muted-foreground flex items-center justify-between">
                  <span>Preview: formatted for standard letter paper (4 slips per sheet).</span>
                  <span>{displayedLoans.length} slip{displayedLoans.length === 1 ? '' : 's'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print:grid-cols-2 print:gap-4 print:text-black">
                  {displayedLoans.map((loan) => {
                    const student = getStudentName(loan.checkedOutTo ?? undefined);
                    const homeroom = getClassName(loan.checkedOutTo ?? undefined);
                    const overdueDays = computeDaysOverdue(loan.dueAt);
                    const isOverdue = overdueDays > 0;

                    return (
                      <div
                        key={loan.id}
                        className="rounded-xl border border-dashed border-border p-4 bg-muted/10 print:border-black print:bg-white print:break-inside-avoid flex flex-col justify-between min-h-[180px]"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between border-b pb-1.5">
                            <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground print:text-black">
                              {schoolName} · Library Notice
                            </span>
                            {isOverdue ? (
                              <Badge variant="destructive" className="text-[10px] uppercase font-black">
                                Overdue
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] uppercase">
                                Due Soon
                              </Badge>
                            )}
                          </div>

                          <div className="pt-1">
                            <p className="font-black text-sm text-foreground print:text-black">{student}</p>
                            {homeroom && (
                              <p className="text-xs text-muted-foreground print:text-gray-700">Homeroom: {homeroom}</p>
                            )}
                          </div>

                          <div className="rounded-lg bg-background p-2 border border-border/60 text-xs space-y-0.5 print:bg-gray-50 print:border-gray-300">
                            <p className="font-bold truncate text-foreground print:text-black">{loan.name}</p>
                            <p className="font-mono text-[11px] text-muted-foreground print:text-gray-600">
                              Barcode: {loan.upc}
                            </p>
                            <p className={`text-xs font-semibold ${isOverdue ? 'text-destructive print:text-red-700' : 'text-primary print:text-black'}`}>
                              {isOverdue
                                ? `Was due: ${formatDueDate(loan.dueAt)} (${overdueDays} days late)`
                                : `Due date: ${formatDueDate(loan.dueAt)}`}
                            </p>
                          </div>
                        </div>

                        <p className="text-[10px] text-muted-foreground print:text-gray-600 pt-2 italic text-center">
                          Please return this book to the library drop box or desk to keep your account in good standing!
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Circulation Summary Roster Table */
              <div className="space-y-3">
                <div className="border-b pb-3">
                  <h3 className="font-black text-lg text-foreground print:text-black">{schoolName} — Circulation Roster</h3>
                  <p className="text-xs text-muted-foreground print:text-gray-600">
                    Generated on {new Date().toLocaleDateString()} · {displayedLoans.length} active copies
                  </p>
                </div>

                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 print:bg-gray-100">
                      <th className="p-2 font-bold">Student</th>
                      <th className="p-2 font-bold">Class</th>
                      <th className="p-2 font-bold">Book Title</th>
                      <th className="p-2 font-bold">Barcode</th>
                      <th className="p-2 font-bold">Due Date</th>
                      <th className="p-2 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {displayedLoans.map((loan) => {
                      const student = getStudentName(loan.checkedOutTo ?? undefined);
                      const homeroom = getClassName(loan.checkedOutTo ?? undefined);
                      const overdueDays = computeDaysOverdue(loan.dueAt);
                      const isOverdue = overdueDays > 0;

                      return (
                        <tr key={loan.id} className="hover:bg-muted/20 print:hover:bg-transparent">
                          <td className="p-2 font-semibold">{student}</td>
                          <td className="p-2 text-muted-foreground print:text-black">{homeroom || '—'}</td>
                          <td className="p-2 font-medium">{loan.name}</td>
                          <td className="p-2 font-mono text-[11px] text-muted-foreground print:text-black">
                            {loan.upc}
                          </td>
                          <td className="p-2 font-medium">{formatDueDate(loan.dueAt)}</td>
                          <td className="p-2">
                            {isOverdue ? (
                              <span className="font-bold text-destructive print:text-red-700">
                                {overdueDays}d Late
                              </span>
                            ) : (
                              <span className="text-emerald-600 font-medium">On loan</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4 print:hidden">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
          <Button onClick={handlePrint} className="gap-2 font-bold" disabled={displayedLoans.length === 0}>
            <Printer className="h-4 w-4" />
            Print Now ({displayedLoans.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
