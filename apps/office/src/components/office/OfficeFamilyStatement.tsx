'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  buildOfficeFamilyStatementHtml,
  openOfficePrintDocument,
} from '@/lib/office/officePrintUtils';
import type { OfficeBillingAccount, OfficeInvoice } from '@/lib/office/types';
import { useToast } from '@/hooks/use-toast';

type OfficeFamilyStatementProps = {
  account: OfficeBillingAccount;
  invoices: OfficeInvoice[];
  studentLabels: string[];
  schoolLabel?: string;
  statementSchoolName?: string | null;
};

export function OfficeFamilyStatementButton({
  account,
  invoices,
  studentLabels,
  schoolLabel,
  statementSchoolName,
}: OfficeFamilyStatementProps) {
  const { toast } = useToast();

  const printStatement = () => {
    const html = buildOfficeFamilyStatementHtml({
      account,
      invoices,
      studentLabels,
      schoolLabel: statementSchoolName?.trim() || schoolLabel?.trim() || 'School Office',
    });
    if (!openOfficePrintDocument(html)) {
      toast({ variant: 'destructive', title: 'Pop-up blocked', description: 'Allow pop-ups to print.' });
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 rounded-lg gap-1 text-xs"
      onClick={printStatement}
    >
      <Printer className="h-3.5 w-3.5" />
      Statement
    </Button>
  );
}
