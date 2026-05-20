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
import type { Class, Prize, Student } from '@/lib/types';
import { resolveIdCardPrintJobOptions } from '@/lib/idCardPrintCatalog';
import { Printer } from 'lucide-react';

type StudentPrintConfirm = (args: { students: Student[]; classes: Class[]; printerType?: 'dtc4500e' }) => void;
type PrizePrintConfirm = (args: { prizes: Prize[]; printerType?: 'dtc4500e' }) => void;

type IdCardPrintSetupDialogProps =
  | {
      variant?: 'student';
      open: boolean;
      onOpenChange: (open: boolean) => void;
      students: Student[];
      classes: Class[];
      onConfirm: StudentPrintConfirm;
    }
  | {
      variant: 'prize';
      open: boolean;
      onOpenChange: (open: boolean) => void;
      prizes: Prize[];
      onConfirm: PrizePrintConfirm;
    };

export function IdCardPrintSetupDialog(props: IdCardPrintSetupDialogProps) {
  const { open, onOpenChange } = props;
  const { toast } = useToast();
  const { settings } = useSettings();

  const summaryLine = useMemo(() => {
    if (props.variant === 'prize') {
      const n = props.prizes.length;
      if (n === 0) return 'No prize cards in this print run.';
      if (n === 1) return `1 prize card — ${props.prizes[0].name}`;
      return `${n} prize cards`;
    }
    const n = props.students.length;
    if (n === 0) return 'No students in this print run.';
    if (n === 1) {
      const s = props.students[0];
      const name = [s.firstName, s.lastName].filter(Boolean).join(' ') || 'Student';
      return `1 student — ${name}`;
    }
    return `${n} students`;
  }, [props]);

  const itemCount = props.variant === 'prize' ? props.prizes.length : props.students.length;

  const handlePrint = () => {
    if (itemCount === 0) {
      toast({
        variant: 'destructive',
        title: 'Nothing to print',
        description: props.variant === 'prize' ? 'There are no prize cards in this run.' : 'There are no students in this run.',
      });
      return;
    }

    const printerOptions = resolveIdCardPrintJobOptions(settings);
    if (props.variant === 'prize') {
      props.onConfirm({ prizes: props.prizes, ...printerOptions });
    } else {
      props.onConfirm({ students: props.students, classes: props.classes, ...printerOptions });
    }
  };

  const title = props.variant === 'prize' ? 'Print prize cards' : 'Print ID cards';
  const cardLabel = props.variant === 'prize' ? 'prize shelf cards' : 'ID cards';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" aria-hidden />
            {title}
          </DialogTitle>
          <DialogDescription>
            These {cardLabel} use the printer profile and stock selected under Settings → Printing &amp;
            guidance. {summaryLine}
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
          <Button type="button" className="rounded-xl" onClick={handlePrint} disabled={itemCount === 0}>
            Continue to print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
