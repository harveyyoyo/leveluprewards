'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import type { StaffIdCardSubject } from '@/lib/staff/staffIdCardSubject';
import { staffIdCardDisplayName } from '@/lib/staff/staffIdCardSubject';
import { StaffIdCard } from './StaffIdCard';

export function StaffIdCardPreviewDialog({
  subject,
  open,
  onOpenChange,
  schoolName,
  schoolLogoUrl,
  appLogoUrl,
  appName,
  appTagline,
  isColorEnabled,
  onPrint,
}: {
  subject: StaffIdCardSubject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolName: string;
  schoolLogoUrl?: string | null;
  appLogoUrl?: string | null;
  appName?: string;
  appTagline?: string;
  isColorEnabled: boolean;
  onPrint: (subject: StaffIdCardSubject) => void;
}) {
  if (!subject) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="!flex flex-col gap-2 overflow-x-hidden pt-12 sm:pt-14">
        <DialogHeader className="shrink-0 space-y-1 pr-8">
          <DialogTitle className="text-lg">Staff ID card preview</DialogTitle>
          <DialogDescription className="text-xs leading-snug">
            {staffIdCardDisplayName(subject)} — same layout as print.
          </DialogDescription>
        </DialogHeader>
        <div className="flex shrink-0 flex-col items-center justify-center overflow-visible px-2 pb-6 pt-2 sm:pb-10 sm:pt-4">
          <div className="student-id-card-screen-preview flex justify-center origin-center scale-[1.1] sm:scale-[1.18]">
            <StaffIdCard
              subject={subject}
              schoolName={schoolName}
              schoolLogoUrl={schoolLogoUrl}
              isColorEnabled={isColorEnabled}
              appLogoUrl={appLogoUrl}
              appName={appName}
              appTagline={appTagline}
            />
          </div>
        </div>
        <DialogFooter className="shrink-0">
          <Button type="button" variant="secondary" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            type="button"
            className="rounded-xl"
            onClick={() => {
              onOpenChange(false);
              requestAnimationFrame(() => onPrint(subject));
            }}
          >
            <Printer className="mr-2 h-4 w-4" aria-hidden />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
