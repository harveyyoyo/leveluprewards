'use client';

import { useMemo, useState } from 'react';
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
import type { StaffIdCardSubject } from '@/lib/staff/staffIdCardSubject';
import { staffIdCardDisplayName } from '@/lib/staff/staffIdCardSubject';
import { resolveIdCardPrintJobOptions } from '@/lib/idCardPrintCatalog';
import { Printer } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type CornerStyle = 'rounded' | 'rectangular';
type StudentPrintConfirm = (args: { students: Student[]; classes: Class[]; printerType?: 'dtc4500e'; cornerStyle?: CornerStyle }) => void;
type PrizePrintConfirm = (args: { prizes: Prize[]; printerType?: 'dtc4500e'; cornerStyle?: CornerStyle }) => void;
type StaffPrintConfirm = (args: { subjects: StaffIdCardSubject[]; printerType?: 'dtc4500e'; cornerStyle?: CornerStyle }) => void;

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
    }
  | {
      variant: 'staff';
      open: boolean;
      onOpenChange: (open: boolean) => void;
      subjects: StaffIdCardSubject[];
      onConfirm: StaffPrintConfirm;
    };

export function IdCardPrintSetupDialog(props: IdCardPrintSetupDialogProps) {
  const { open, onOpenChange } = props;
  const { toast } = useToast();
  const { settings } = useSettings();
  const [cornerStyle, setCornerStyle] = useState<CornerStyle>(settings.idCardCornerStyle ?? 'rounded');

  const summaryLine = useMemo(() => {
    if (props.variant === 'prize') {
      const n = props.prizes.length;
      if (n === 0) return 'No prize cards in this print run.';
      if (n === 1) return `1 prize card — ${props.prizes[0].name}`;
      return `${n} prize cards`;
    }
    if (props.variant === 'staff') {
      const n = props.subjects.length;
      if (n === 0) return 'No staff cards in this print run.';
      if (n === 1) return `1 staff card — ${staffIdCardDisplayName(props.subjects[0])}`;
      return `${n} staff ID cards`;
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

  const itemCount =
    props.variant === 'prize'
      ? props.prizes.length
      : props.variant === 'staff'
        ? props.subjects.length
        : props.students.length;

  const handlePrint = () => {
    if (itemCount === 0) {
      toast({
        variant: 'destructive',
        title: 'Nothing to print',
        description:
          props.variant === 'prize'
            ? 'There are no prize cards in this run.'
            : props.variant === 'staff'
              ? 'There are no staff ID cards in this run.'
              : 'There are no students in this run.',
      });
      return;
    }

    const printerOptions = resolveIdCardPrintJobOptions(settings);
    if (props.variant === 'prize') {
      props.onConfirm({ prizes: props.prizes, cornerStyle, ...printerOptions });
    } else if (props.variant === 'staff') {
      props.onConfirm({ subjects: props.subjects, cornerStyle, ...printerOptions });
    } else {
      props.onConfirm({ students: props.students, classes: props.classes, cornerStyle, ...printerOptions });
    }
  };

  const title =
    props.variant === 'prize'
      ? 'Print prize cards'
      : props.variant === 'staff'
        ? 'Print staff ID cards'
        : 'Print ID cards';
  const cardLabel =
    props.variant === 'prize'
      ? 'prize shelf cards'
      : props.variant === 'staff'
        ? 'staff ID cards'
        : 'ID cards';

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
          <div className="space-y-2">
            <Label htmlFor="id-card-print-corners" className="text-[11px] font-semibold">
              Card corners
            </Label>
            <Select value={cornerStyle} onValueChange={(v) => setCornerStyle(v === 'rectangular' ? 'rectangular' : 'rounded')}>
              <SelectTrigger id="id-card-print-corners" className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rounded">Rounded (ID card look)</SelectItem>
                <SelectItem value="rectangular">Rectangular (easier to cut)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground leading-snug">
              This only affects this print run.
            </p>
          </div>

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
