'use client';

import { useMemo, useState } from 'react';
import { OfficeDashboard } from '@/components/office/OfficeDashboard';
import { useOfficePortalData } from '@/components/office/OfficePortalGate';
import { useOfficeSharedData } from '@/lib/office/useOfficeSharedData';
import { useOfficeTerm } from '@/lib/office/useOfficeTerm';
import { buildOfficeDashboardInsights } from '@/lib/office/officeUtils';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { isPublicSampleSchoolId } from '@/lib/sampleSchools';
import { populateDemoOfficeDataForSchool } from '@/lib/office/populateDemoOfficeData';

export default function OfficeHomePage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { schoolId, isAdmin, loginState } = useAppContext();
  const { gradeEntries, billingAccounts, invoices, isOfficeDataLoading } = useOfficePortalData();
  const shared = useOfficeSharedData(schoolId, true);
  const { term, setTerm, suggestedTerm } = useOfficeTerm(schoolId);
  const [isPopulatingDemoData, setIsPopulatingDemoData] = useState(false);

  const insights = useMemo(
    () => buildOfficeDashboardInsights(shared.students, gradeEntries, invoices, term, billingAccounts),
    [shared.students, gradeEntries, invoices, term, billingAccounts],
  );

  const accountNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of billingAccounts) map.set(a.id, a.familyName);
    return map;
  }, [billingAccounts]);

  if (!schoolId) return null;

  const canPopulateDemoData =
    Boolean(firestore) &&
    isPublicSampleSchoolId(schoolId) &&
    (isAdmin || loginState === 'developer') &&
    !shared.isLoading &&
    !isOfficeDataLoading;

  const handlePopulateDemoData = async () => {
    if (!firestore || !schoolId || isPopulatingDemoData) return;
    const hasExistingOfficeData =
      shared.students.length > 0 ||
      shared.classes.length > 0 ||
      gradeEntries.length > 0 ||
      billingAccounts.length > 0 ||
      invoices.length > 0;
    if (
      hasExistingOfficeData &&
      !confirm('Replace this demo school\'s existing School Office roster, grades, and billing data?')
    ) {
      return;
    }

    setIsPopulatingDemoData(true);
    try {
      const result = await populateDemoOfficeDataForSchool(firestore, schoolId);
      toast({
        title: 'Demo office data populated',
        description: `${result.officeStudents.length} students, ${result.gradeEntries.length} grades, ${result.billingAccounts.length} billing accounts.`,
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not populate demo data',
        description: (e as Error).message,
      });
    } finally {
      setIsPopulatingDemoData(false);
    }
  };

  return (
    <OfficeDashboard
      schoolId={schoolId}
      studentCount={shared.students.length}
      classCount={shared.classes.length}
      insights={insights}
      studentLabelById={shared.studentLabelById}
      accountNameById={accountNameById}
      canPopulateDemoData={canPopulateDemoData}
      isPopulatingDemoData={isPopulatingDemoData}
      onPopulateDemoData={() => void handlePopulateDemoData()}
      activeTerm={term}
      onActiveTermChange={setTerm}
      suggestedTerm={suggestedTerm}
    />
  );
}
