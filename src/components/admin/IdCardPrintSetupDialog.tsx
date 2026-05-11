'use client';

import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/components/providers/SettingsProvider';
import type { Class, Student } from '@/lib/types';
import { Printer } from 'lucide-react';

export function IdCardPrintSetupDialog({
  open,
  onOpenChange,
  students,
  classes,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: Student[];
  classes: Class[];
  onConfirm: (args: { students: Student[]; classes: Class[]; printerType?: 'dtc4500e' }) => void;
}) {
  const { toast } = useToast();
  const { settings } = useSettings();

  const summaryLine = useMemo(() => {
    const n = students.length;
    if (n === 0) return 'No students in this print run.';
    if (n === 1) {
      const s = students[0];
      const name = [s.firstName, s.lastName].filter(Boolean).join(' ') || 'Student';
      return `1 student — ${name}`;
    }
    return `${n} students`;
  }, [students]);

  const handlePrint = () => {
    if (students.length === 0) {
      toast({ variant: 'destructive', title: 'Nothing to print', description: 'There are no students in this run.' });
      return;
    }

    onConfirm({
      students,
      classes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" aria-hidden />
            Print ID cards
          </DialogTitle>
          <DialogDescription>
            Uses the printer and stock chosen in Settings → Basic settings → Printing &amp; Guidance. {summaryLine}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {settings.printerReminderIdCards?.trim() ? (
            <Alert>
              <AlertTitle>School note</AlertTitle>
              <AlertDescription className="text-xs leading-relaxed whitespace-pre-wrap">
                {settings.printerReminderIdCards.trim()}
              </AlertDescription>
            </Alert>
          ) : null}

        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" className="rounded-xl" onClick={handlePrint} disabled={students.length === 0}>
            Continue to print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
