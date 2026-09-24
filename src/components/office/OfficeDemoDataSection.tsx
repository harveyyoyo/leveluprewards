'use client';

import { useState } from 'react';
import { FlaskConical, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFirestore } from '@/firebase';
import { useAuthFetch } from '@/lib/authFetch';
import { useAppContext } from '@/components/AppProvider';
import { useToast } from '@/hooks/use-toast';
import { useOfficeConfirm } from '@/components/office/useOfficeConfirm';
import { useOfficePortalData } from '@/components/office/OfficePortalGate';
import { useOfficeSharedData } from '@/lib/office/useOfficeSharedData';
import { isPublicSampleSchoolId } from '@/lib/sampleSchools';
import { addDemoFamiliesToSchool, populateDemoOfficeDataForSchool } from '@/lib/office/populateDemoOfficeData';
import { useOfficeBusRoutes } from '@/lib/office/useOfficeTransport';

/** Settings → Demo school tools. Only shown on the built-in demo schools, to admins/developers. */
export function OfficeDemoDataSection({ schoolId }: { schoolId: string }) {
  const firestore = useFirestore();
  const authFetch = useAuthFetch();
  const { isAdmin, loginState, userName } = useAppContext();
  const { toast } = useToast();
  const { confirm, confirmDialog } = useOfficeConfirm();
  const { gradeEntries, billingAccounts, invoices, isOfficeDataLoading } = useOfficePortalData();
  const shared = useOfficeSharedData(schoolId, true);
  const { routes } = useOfficeBusRoutes(schoolId);
  const [busy, setBusy] = useState(false);

  const allowed = isPublicSampleSchoolId(schoolId) && (isAdmin || loginState === 'developer');
  if (!allowed || !firestore) return null;

  const ready = !shared.isLoading && !isOfficeDataLoading;
  const studentsWithoutFamily = shared.students.filter((s) => !s.familyId).length;

  const loadDemoData = async () => {
    const hasData =
      shared.students.length > 0 ||
      shared.classes.length > 0 ||
      gradeEntries.length > 0 ||
      billingAccounts.length > 0 ||
      invoices.length > 0 ||
      routes.length > 0;
    if (hasData) {
      const ok = await confirm({
        title: 'Replace all demo school data?',
        description:
          'Students, classes, families, grades, and billing in this demo school are replaced with fresh sample data. Existing bus routes are hidden, but past bus runs stay in history. This only works on demo schools.',
        confirmLabel: 'Replace with sample data',
        tone: 'caution',
      });
      if (!ok) return;
    }
    setBusy(true);
    try {
      const transportResponse = await authFetch('/api/office/transport', {
        method: 'POST',
        body: JSON.stringify({ schoolId, action: 'reset' }),
      });
      if (!transportResponse.ok) {
        const detail = (await transportResponse.json().catch(() => ({}))) as { error?: string };
        throw new Error(detail.error || 'Could not clear demo bus data.');
      }
      const result = await populateDemoOfficeDataForSchool(firestore, schoolId);
      toast({
        title: 'Sample data loaded',
        description: `${result.officeStudents.length} students, ${result.officeFamilies.length} families, ${result.billingAccounts.length} billing accounts.`,
      });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not load sample data', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const addFamilies = async () => {
    setBusy(true);
    try {
      const result = await addDemoFamiliesToSchool(firestore, schoolId, {
        students: shared.students,
        families: shared.families,
        billingAccounts,
        changedBy: userName,
      });
      toast({
        title: 'Demo families added',
        description: `${result.familiesAdded} families, ${result.studentsLinked} students linked.`,
      });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not add demo families', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-dashed bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      {confirmDialog}
      <h2 className="flex items-center gap-2 text-base font-bold">
        <FlaskConical className="h-4 w-4 text-teal-700" aria-hidden />
        Demo school
      </h2>
      <p className="mt-1 max-w-xl text-xs text-muted-foreground">
        Sample data for trying things out. You only see this on demo schools.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {studentsWithoutFamily > 0 ? (
          <Button
            type="button"
            variant="outline"
            className="gap-2 rounded-xl"
            disabled={!ready || busy}
            onClick={() => void addFamilies()}
          >
            <Users className="h-4 w-4" />
            Add demo families ({studentsWithoutFamily} students)
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="gap-2 rounded-xl"
          disabled={!ready || busy}
          onClick={() => void loadDemoData()}
        >
          <RefreshCw className={busy ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          {busy ? 'Working…' : 'Load fresh sample data'}
        </Button>
      </div>
    </section>
  );
}
