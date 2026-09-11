'use client';

import { useState, useRef } from 'react';
import { Printer, FileText, CheckSquare, Layers, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { formatDueDate, computeDaysOverdue } from '@/lib/library/libraryPolicy';
import type { LibraryItem, Student, Class } from '@/lib/types';

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
  const [printFormat, setPrintFormat] = useState<'slips' | 'table'>('slips');
  const printAreaRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-h-[92dvh] max-w-4xl overflow-y-auto">
        <DialogHeader className="print:hidden">
          <div className="flex items-center justify-between gap-2 pr-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Printer className="h-5 w-5" />
              </div>
              <DialogTitle>Print Circulation Slips &amp; Reports</DialogTitle>
            </div>
            <Badge variant="secondary" className="font-bold">
              {loans.length} active loan{loans.length === 1 ? '' : 's'}
            </Badge>
          </div>
          <DialogDescription>
            Generate 4-up classroom reminder slips or a printable circulation roster without popup blockers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 print:space-y-0">
          <Tabs
            value={printFormat}
            onValueChange={v => setPrintFormat(v as 'slips' | 'table')}
            className="print:hidden"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="slips" className="gap-2">
                <Layers className="h-4 w-4" />
                Classroom Reminder Slips (4-Up)
              </TabsTrigger>
              <TabsTrigger value="table" className="gap-2">
                <FileText className="h-4 w-4" />
                Circulation Summary Roster
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Printable Container */}
          <div ref={printAreaRef} className="rounded-2xl border p-4 bg-background print:border-none print:p-0">
            {printFormat === 'slips' ? (
              <div className="space-y-4">
                <div className="print:hidden text-xs text-muted-foreground flex items-center justify-between">
                  <span>Preview: formatted for standard letter paper (4 slips per sheet).</span>
                  <span>{loans.length} slip{loans.length === 1 ? '' : 's'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print:grid-cols-2 print:gap-4 print:text-black">
                  {loans.map(loan => {
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
              <div className="space-y-3">
                <div className="border-b pb-3">
                  <h3 className="font-black text-lg text-foreground print:text-black">{schoolName} — Circulation Roster</h3>
                  <p className="text-xs text-muted-foreground print:text-gray-600">
                    Generated on {new Date().toLocaleDateString()} · {loans.length} active copies
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
                    {loans.map(loan => {
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
          <Button onClick={handlePrint} className="gap-2 font-bold">
            <Printer className="h-4 w-4" />
            Print Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
