'use client';

import { useEffect, useState, type MutableRefObject } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useAppContext } from '@/components/AppProvider';
import { useOfficePortalData } from '@/components/office/OfficePortalGate';
import { OfficeAiImportSection } from '@/components/office/OfficeAiImportSection';
import { useOfficeSharedData } from '@/lib/office/useOfficeSharedData';

/**
 * The AI import (Settings → Import) as a pop-up, for the Import buttons on Students and Grades:
 * paste or attach anything and the AI works out what's in it. Opened with `openRef.current()`.
 * Staff sign-ins are only imported from Settings.
 */
export function OfficeAiImportDialog({ openRef }: { openRef: MutableRefObject<(() => void) | null> }) {
  const [open, setOpen] = useState(false);
  const { schoolId, userName } = useAppContext();
  const shared = useOfficeSharedData(schoolId, open);
  const { gradeEntries, billingAccounts } = useOfficePortalData();

  useEffect(() => {
    openRef.current = () => setOpen(true);
    return () => {
      openRef.current = null;
    };
  }, [openRef]);

  if (!schoolId) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-2xl p-0">
        <DialogTitle className="sr-only">Import with AI</DialogTitle>
        <OfficeAiImportSection
          schoolId={schoolId}
          classes={shared.classes}
          teachers={shared.teachers}
          students={shared.students}
          gradeEntries={gradeEntries}
          billingAccounts={billingAccounts}
          canImportStaff={false}
          userName={userName}
        />
      </DialogContent>
    </Dialog>
  );
}
