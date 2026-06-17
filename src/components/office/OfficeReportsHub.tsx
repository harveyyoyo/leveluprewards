'use client';

import { useMemo, useState } from 'react';
import { ContentSectionTreeNav } from '@/components/ui/content-section-tree-nav';
import { OfficeGradeReportView } from '@/components/office/OfficeGradeReportView';
import { OfficeBillingReportPanel } from '@/components/office/OfficeBillingReportPanel';
import { OfficeRosterReportPanel } from '@/components/office/OfficeRosterReportPanel';
import { OfficeAuditLogPanel } from '@/components/office/OfficeAuditLogPanel';
import { useOfficePortalChrome } from '@/components/office/OfficePortalChrome';
import { useOfficePortalData } from '@/components/office/OfficePortalGate';
import { useOfficeSharedData } from '@/lib/office/useOfficeSharedData';
import type { OfficeAuditLogEntry, OfficePayment } from '@/lib/office/types';

type OfficeReportsHubProps = {
  schoolId: string;
  schoolName?: string;
  auditEntries: OfficeAuditLogEntry[];
  payments: OfficePayment[];
};

export function OfficeReportsHub({
  schoolId,
  schoolName,
  auditEntries,
  payments,
}: OfficeReportsHubProps) {
  const { marksLabels, features } = useOfficePortalChrome();
  const { gradeEntries, billingAccounts, invoices } = useOfficePortalData();
  const shared = useOfficeSharedData(schoolId, true);
  const [section, setSection] = useState('marks');

  const navItems = useMemo(
    () => [
      { id: 'marks', label: marksLabels.section },
      { id: 'billing', label: 'Billing' },
      { id: 'roster', label: 'Roster' },
      ...(features.auditLog ? [{ id: 'audit', label: 'Change log' }] : []),
    ],
    [marksLabels.section, features.auditLog],
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground max-w-2xl">
        Filtered views and exports for {marksLabels.plural}, billing, roster, and change history.
      </p>

      <ContentSectionTreeNav
        items={navItems}
        value={section}
        onValueChange={setSection}
        branchLabel="Report type"
        fullWidth
      />

      {section === 'marks' ? (
        <OfficeGradeReportView
          schoolId={schoolId}
          schoolName={schoolName}
          entries={gradeEntries}
          studentLabelById={shared.studentLabelById}
          classNameById={shared.classNameById}
        />
      ) : null}

      {section === 'billing' ? (
        <OfficeBillingReportPanel
          schoolId={schoolId}
          accounts={billingAccounts}
          invoices={invoices}
          payments={payments}
          studentLabelById={shared.studentLabelById}
        />
      ) : null}

      {section === 'roster' ? (
        <OfficeRosterReportPanel
          schoolId={schoolId}
          students={shared.students}
          families={shared.families}
          classes={shared.classes}
          teachers={shared.teachers}
          classNameById={shared.classNameById}
          teacherNameById={shared.teacherNameById}
        />
      ) : null}

      {section === 'audit' && features.auditLog ? (
        <OfficeAuditLogPanel entries={auditEntries} />
      ) : null}
    </div>
  );
}
