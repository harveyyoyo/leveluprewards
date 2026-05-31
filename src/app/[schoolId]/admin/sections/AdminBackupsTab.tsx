'use client';

import { Database, Download, Plus, Upload } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  StaffPortalSectionCard,
  StaffPortalSectionCardContent,
  StaffPortalSectionCardHeader,
  StaffPortalSectionCardTitle,
} from '@/components/staff/StaffPortalSection';
import { Helper } from '@/components/ui/helper';
import { TabWalkthroughHeaderAction } from '@/components/tabWalkthrough/TabWalkthroughContext';
import type { BackupInfo } from '@/lib/types';

export function AdminBackupsTab({
  backups,
  onCreateBackup,
  onDownloadBackup,
  onRestoreFromBackup,
}: {
  backups: BackupInfo[] | null | undefined;
  onCreateBackup: () => void;
  onDownloadBackup: (backupId: string) => void;
  onRestoreFromBackup: (backupId: string) => void;
}) {
  return (
    <StaffPortalSectionCard className="w-full overflow-hidden">
      <StaffPortalSectionCardHeader className="flex flex-row justify-between items-center py-6">
        <div>
          <Helper content="Create and restore full data snapshots of your school. This is a critical tool for data safety and recovery.">
            <StaffPortalSectionCardTitle className="flex items-center gap-2">
              <Database className="text-primary w-5 h-5" /> System Backups
            </StaffPortalSectionCardTitle>
          </Helper>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TabWalkthroughHeaderAction />
          <Button onClick={onCreateBackup} className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" /> Create Snapshot
          </Button>
        </div>
      </StaffPortalSectionCardHeader>
      <StaffPortalSectionCardContent className="p-6">
        <div>
          <ul className="space-y-2.5 pr-4">
            {(backups || [])
              .slice()
              .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
              .map((b) => (
                <li
                  key={b.id}
                  className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-secondary/20 p-4 rounded-2xl border group transition-all hover:bg-background"
                >
                  <div className="flex items-center gap-4 flex-grow">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Database className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-code text-sm font-bold">{b.createdAt ? new Date(b.createdAt).toLocaleString() : 'Unknown date'}</p>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                        {b.totalDocs} documents •{' '}
                        <span className="text-primary">{b.type || 'manual'}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 self-end sm:self-center">
                    <Button
                      size="icon"
                      variant="outline"
                      className="rounded-full h-10 w-10 shadow-sm"
                      onClick={() => onDownloadBackup(b.id)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="outline"
                          className="rounded-full h-10 w-10 shadow-sm hover:border-destructive/20 hover:bg-destructive/10"
                        >
                          <Upload className="h-4 w-4 text-primary" />
                        </Button>
                      </AlertDialogTrigger>
            <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-2xl font-bold">Restore snapshot?</AlertDialogTitle>
                          <AlertDialogDescription className="text-base text-balance mt-2">
                            This will <span className="font-bold text-destructive">OVERWRITE all current school data</span> with the state from{' '}
                            {b.createdAt ? new Date(b.createdAt).toLocaleString() : 'unknown date'}. Keep another backup
                            first—you typically reverse this only by restoring a different snapshot.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-6">
                          <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onRestoreFromBackup(b.id)}
                            className="rounded-full bg-primary hover:bg-primary/90"
                          >
                            Restore Data
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              ))}
          </ul>
        </div>
      </StaffPortalSectionCardContent>
    </StaffPortalSectionCard>
  );
}

