'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, increment, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, OrphanSelectItem, isOrphanSelectValue, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { OfficeAssistantBanner } from '@/components/office/OfficeAssistantBanner';
import { dollarsParamToCents } from '@/lib/office/officeAssistantView';
import { useReportOfficeAssistantResults } from '@/lib/office/officeAssistantResults';
import {
  filterOfficeBillingAccounts,
  officeBillingListReport,
  officeInvoicesByAccount,
  officeOwedByAccount,
} from '@/lib/office/officeAssistantLists';
import {
  Archive,
  Ban,
  CalendarClock,
  Copy,
  Download,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Printer,
  Wand2,
  AlertCircle,
  ChevronDown,
  Wallet,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useOfficeConfirm } from '@/components/office/useOfficeConfirm';
import { useOfficeUrlSync } from '@/lib/office/useOfficeUrlSync';
import { useOfficeSettings } from '@/lib/office/useOfficeSettings';
import {
  buildOfficeFamilyStatementHtml,
  buildOfficeReceiptHtml,
  openOfficePrintDocument,
} from '@/lib/office/officePrintUtils';
import { ToastAction } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { useOfficeWrite } from '@/lib/office/useOfficeWrite';
import { officeAuditSnapshot } from '@/lib/office/officeAuditLog';
import { formatCents } from '@/lib/office/officeNav';
import {
  addMonthsToIsoDate,
  billingStatusForAccount,
  buildInvoiceReminderMailto,
  defaultDueDateIso,
  downloadCsv,
  isInvoiceDueSoon,
  isInvoiceOverdue,
  parseUsdToCents,
  splitCentsIntoInstallments,
} from '@/lib/office/officeUtils';
import { OfficeSearchInput } from '@/components/office/OfficeSearchInput';
import { OfficeAddressInput } from '@/components/office/OfficeAddressInput';
import { useOfficeEntityNav } from '@/components/office/OfficeEntityNavProvider';
import { OfficeQuickChips } from '@/components/office/OfficeQuickChips';
import { OfficeEmptyState } from '@/components/office/OfficeEmptyState';
import { OfficeLoadingRows } from '@/components/office/OfficeLoadingRows';
import { CreditCard } from 'lucide-react';
import type { OfficeBillingAccount, OfficeFamily, OfficeInvoice, OfficePaymentMethod, OfficeInvoiceStatus } from '@/lib/office/types';
import type { OfficeStudent } from '@/lib/office/types';
import { Checkbox } from '@/components/ui/checkbox';
import {
  autoAllocatePayment,
  invoiceBalanceDueCents,
  invoicePaidCents,
  invoiceRemainingCents,
  isInvoicePayable,
  resolveInvoiceStatusAfterPayment,
  sumPaymentAllocations,
  type OfficePaymentAllocation,
} from '@/lib/office/officeBillingPayments';
import { cn } from '@/lib/utils';

/** Plain words for invoice states ("sent" means the family owes it). */
const INVOICE_STATUS_LABEL: Record<OfficeInvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Unpaid',
  partial: 'Partly paid',
  paid: 'Paid',
  void: 'Cancelled',
};

type OfficeBillingViewProps = {
  schoolId: string;
  students: OfficeStudent[];
  families?: OfficeFamily[];
  studentLabelById: Map<string, string>;
  accounts: OfficeBillingAccount[];
  invoices: OfficeInvoice[];
  isLoading: boolean;
  classNameById?: Map<string, string>;
};

export function OfficeBillingView({
  schoolId,
  students,
  families = [],
  studentLabelById,
  accounts,
  invoices,
  isLoading,
  classNameById,
}: OfficeBillingViewProps) {
  const firestore = useFirestore();
  const write = useOfficeWrite(schoolId);
  const { toast } = useToast();
  const { confirm, confirmDialog } = useOfficeConfirm();
  const { openFamily } = useOfficeEntityNav();
  const { settings: officeSettings } = useOfficeSettings(schoolId);

  const printFamilyStatement = (account: OfficeBillingAccount, studentLabels: string[]) => {
    const html = buildOfficeFamilyStatementHtml({
      account,
      invoices,
      studentLabels,
      schoolLabel: officeSettings?.statementSchoolName?.trim() || 'School Office',
    });
    if (!openOfficePrintDocument(html)) {
      toast({ variant: 'destructive', title: 'Pop-up blocked', description: 'Allow pop-ups to print.' });
    }
  };
  const [accountOpen, setAccountOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [invoiceAccountId, setInvoiceAccountId] = useState('');
  const [invoiceLabel, setInvoiceLabel] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceDue, setInvoiceDue] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'overdue' | 'open' | 'due-soon'>('all');
  const [askLabel, setAskLabel] = useState('');
  const [minOwedCents, setMinOwedCents] = useState<number | null>(null);
  const [maxOwedCents, setMaxOwedCents] = useState<number | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [saveAsDraft, setSaveAsDraft] = useState(false);
  const searchParams = useSearchParams();
  const openedInvoiceFromQuery = useRef(false);
  const [editAccountId, setEditAccountId] = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [accountAddress, setAccountAddress] = useState('');
  // Each family is one line; its bills show when it's opened.
  const [openAccounts, setOpenAccounts] = useState<Set<string>>(() => new Set());
  // The page opens on the totals and a search; every family only on "Show all".
  const [showAllAccounts, setShowAllAccounts] = useState(false);
  const toggleAccount = (id: string) =>
    setOpenAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const familyById = useMemo(() => new Map(families.map((f) => [f.id, f])), [families]);
  const [accountNotes, setAccountNotes] = useState('');
  const [accountStudentSearch, setAccountStudentSearch] = useState('');
  const [discountLabel, setDiscountLabel] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [editInvoiceId, setEditInvoiceId] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [payAccount, setPayAccount] = useState<OfficeBillingAccount | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paySelectedIds, setPaySelectedIds] = useState<string[]>([]);
  const [payAllocations, setPayAllocations] = useState<Record<string, string>>({});
  const [paymentMethod, setPaymentMethod] = useState<OfficePaymentMethod>('check');
  const [paymentNote, setPaymentNote] = useState('');

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkTargetHomeroom, setBulkTargetHomeroom] = useState('all');
  const [bulkLabel, setBulkLabel] = useState('');
  const [bulkAmount, setBulkAmount] = useState('');
  const [bulkDue, setBulkDue] = useState(defaultDueDateIso());
  const [bulkSaveAsDraft, setBulkSaveAsDraft] = useState(false);

  const [planOpen, setPlanOpen] = useState(false);
  const [planAccount, setPlanAccount] = useState<OfficeBillingAccount | null>(null);
  const [planLabel, setPlanLabel] = useState('Tuition');
  const [planTotal, setPlanTotal] = useState('');
  const [planInstallments, setPlanInstallments] = useState('4');
  const [planStartDate, setPlanStartDate] = useState(defaultDueDateIso());

  const homeroomNames = useMemo(() => {
    const set = new Set<string>();
    for (const s of students) {
      const clsName = (s.classId && classNameById?.get(s.classId)) || '';
      if (clsName.trim()) {
        set.add(clsName.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [students, classNameById]);

  const invoiceLabelSuggestions = useMemo(() => {
    const set = new Set(['Tuition', 'Registration', 'Activities', 'Lunch', 'Supplies']);
    for (const inv of invoices) {
      if (inv.label?.trim()) set.add(inv.label.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [invoices]);

  const invoicesByAccount = useMemo(() => officeInvoicesByAccount(invoices), [invoices]);

  const openBalanceCents = useMemo(
    () => invoices.reduce((sum, i) => sum + invoiceBalanceDueCents(i), 0),
    [invoices],
  );

  const overdueCount = useMemo(() => invoices.filter((i) => isInvoiceOverdue(i)).length, [invoices]);

  const dueSoonCount = useMemo(() => invoices.filter((i) => isInvoiceDueSoon(i)).length, [invoices]);

  // What each family still owes (open invoices minus payments), for "owes more/less than" views.
  const owedByAccount = useMemo(() => officeOwedByAccount(invoices), [invoices]);

  const filteredAccounts = useMemo(
    () =>
      filterOfficeBillingAccounts(
        accounts,
        { search, minOwedCents, maxOwedCents, invoiceFilter },
        { owedByAccount, invoicesByAccount, studentLabelById },
      ),
    [accounts, search, studentLabelById, invoiceFilter, invoicesByAccount, minOwedCents, maxOwedCents, owedByAccount]);

  const resetAccountForm = () => {
    setFamilyName('');
    setSelectedStudentIds([]);
    setContactEmail('');
    setContactPhone('');
    setAccountAddress('');
    setAccountNotes('');
    setAccountStudentSearch('');
    setDiscountLabel('');
    setDiscountPercent('');
    setEditAccountId(null);
  };

  useEffect(() => {
    const f = searchParams.get('filter')?.trim();
    if (f === 'due-soon' || f === 'overdue' || f === 'open') {
      setInvoiceFilter(f);
    }
  }, [searchParams]);

  // A list opened from Help → Ask ("families owing more than $100"). Applied once per question.
  const appliedAskAt = useRef<string | null>(null);
  const [reportAskAt, setReportAskAt] = useState<string | null>(null);
  useEffect(() => {
    const askAt = searchParams.get('askAt');
    const ask = searchParams.get('ask')?.trim();
    if (!askAt || !ask || appliedAskAt.current === askAt) return;
    appliedAskAt.current = askAt;
    const f = searchParams.get('filter')?.trim();
    setReportAskAt(askAt);
    setAskLabel(ask);
    setMinOwedCents(dollarsParamToCents(searchParams.get('minOwed')));
    setMaxOwedCents(dollarsParamToCents(searchParams.get('maxOwed')));
    setSearch(searchParams.get('q')?.trim() ?? '');
    setInvoiceFilter(f === 'due-soon' || f === 'overdue' || f === 'open' ? f : 'all');
  }, [searchParams]);

  // Tell the Help chat what this list shows (largest balance first), so it can answer with it.
  useReportOfficeAssistantResults(reportAskAt, !isLoading, () => officeBillingListReport(filteredAccounts, owedByAccount));

  const clearAsk = () => {
    setShowAllAccounts(false);
    setReportAskAt(null);
    setAskLabel('');
    setMinOwedCents(null);
    setMaxOwedCents(null);
    setSearch('');
    setInvoiceFilter('all');
    router.replace(pathname, { scroll: false });
  };

  useOfficeUrlSync({
    filter: invoiceFilter === 'all' ? undefined : invoiceFilter,
  });

  const invoiceAccountDiscount = useMemo(() => {
    const account = accounts.find((a) => a.id === invoiceAccountId);
    return account?.discountPercent ? account : null;
  }, [accounts, invoiceAccountId]);

  const resetInvoiceForm = () => {
    setEditInvoiceId(null);
    setInvoiceLabel('');
    setInvoiceAmount('');
    setInvoiceDue('');
    setSaveAsDraft(false);
  };

  const openNewInvoice = useCallback((accountId?: string, preset?: Partial<OfficeInvoice>) => {
    setEditInvoiceId(null);
    setInvoiceAccountId(accountId ?? accounts[0]?.id ?? '');
    setInvoiceLabel(preset?.label ?? '');
    setInvoiceAmount(preset ? String((preset.amountCents || 0) / 100) : '');
    setInvoiceDue(preset?.dueDate ?? defaultDueDateIso());
    setSaveAsDraft(false);
    setInvoiceOpen(true);
  }, [accounts]);

  const openEditInvoice = (inv: OfficeInvoice) => {
    if (inv.status === 'paid' || inv.status === 'void') return;
    setEditInvoiceId(inv.id);
    setInvoiceAccountId(inv.accountId);
    setInvoiceLabel(inv.label);
    setInvoiceAmount(String((inv.amountCents || 0) / 100));
    setInvoiceDue(inv.dueDate);
    setSaveAsDraft(inv.status === 'draft');
    setInvoiceOpen(true);
  };

  useEffect(() => {
    if (isLoading || openedInvoiceFromQuery.current) return;
    if (searchParams.get('action')?.trim() !== 'new-invoice') return;
    openedInvoiceFromQuery.current = true;
    const accountId = searchParams.get('account')?.trim();
    openNewInvoice(accountId || undefined);
  }, [searchParams, isLoading, accounts.length, openNewInvoice]);

  const openNewAccount = () => {
    resetAccountForm();
    setAccountOpen(true);
  };

  const openEditAccount = (account: OfficeBillingAccount) => {
    setEditAccountId(account.id);
    setFamilyName(account.familyName);
    setSelectedStudentIds(account.studentIds);
    setContactEmail(account.contactEmail ?? '');
    setContactPhone(account.contactPhone ?? '');
    const family = account.familyId ? familyById.get(account.familyId) : undefined;
    setAccountAddress((family ? family.homeAddress : account.mailingAddress)?.trim() ?? '');
    setAccountNotes(account.notes ?? '');
    setDiscountLabel(account.discountLabel ?? '');
    setDiscountPercent(account.discountPercent != null ? String(account.discountPercent) : '');
    setAccountOpen(true);
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleBulkInvoicing = async () => {
    if (!firestore || !bulkLabel.trim() || !bulkAmount) {
      toast({ variant: 'destructive', title: 'Label and amount are required.' });
      return;
    }
    const cents = parseUsdToCents(bulkAmount);
    if (cents == null) {
      toast({ variant: 'destructive', title: 'Enter a valid dollar amount.' });
      return;
    }
    const due = bulkDue || new Date().toISOString().slice(0, 10);
    setBusy(true);

    try {
      const targetClassStudents = students.filter((s) => {
        if (bulkTargetHomeroom === 'all') return true;
        const clsName = (s.classId && classNameById?.get(s.classId)) || '';
        return clsName === bulkTargetHomeroom;
      });

      const studentIdsInTarget = new Set(targetClassStudents.map((s) => s.id));

      const targetAccounts = accounts.filter((a) => {
        if (bulkTargetHomeroom === 'all') return true;
        return (a.studentIds ?? []).some((id) => studentIdsInTarget.has(id));
      });

      if (targetAccounts.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No target accounts found',
          description: 'No billing accounts have students linked in the selected homeroom.',
        });
        setBusy(false);
        return;
      }

      const status: OfficeInvoiceStatus = bulkSaveAsDraft ? 'draft' : 'sent';
      const createdCount = targetAccounts.length;
      let totalAmountCents = createdCount * cents;

      const promises = targetAccounts.map(async (account) => {
        const invoiceRef = doc(collection(firestore, 'schools', schoolId, 'officeInvoices'));
        const invoiceDoc = {
          accountId: account.id,
          label: bulkLabel.trim(),
          amountCents: cents,
          dueDate: due,
          status,
          createdAt: Date.now(),
        };
        await setDoc(invoiceRef, invoiceDoc);

        if (status === 'sent') {
          const nextInvoices: OfficeInvoice[] = [
            ...invoices,
            {
              id: invoiceRef.id,
              ...invoiceDoc,
            },
          ];
          await updateDoc(doc(firestore, 'schools', schoolId, 'officeBillingAccounts', account.id), {
            balanceCents: increment(cents),
            status: billingStatusForAccount(account.id, nextInvoices, account.status),
            updatedAt: Date.now(),
          });
        }
        if (write.ctx) {
          await write.logOfficeChange(write.ctx, {
            entityType: 'officeInvoice',
            entityId: invoiceRef.id,
            action: 'create',
            summary: `Created invoice ${invoiceDoc.label} for ${account.familyName} · ${formatCents(cents)}`,
            after: officeAuditSnapshot(invoiceDoc),
          });
        }
      });

      await Promise.all(promises);

      toast({
        title: 'Bulk invoicing complete',
        description: `Successfully generated ${createdCount} invoices totaling $${(totalAmountCents / 100).toFixed(2)}.`,
      });

      setBulkOpen(false);
      setBulkLabel('');
      setBulkAmount('');
      setBulkDue(defaultDueDateIso());
      setBulkSaveAsDraft(false);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Bulk invoicing failed',
        description: (e as Error).message,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSendTextAlert = async (inv: OfficeInvoice, account: OfficeBillingAccount, channel: 'sms' | 'whatsapp') => {
    const phone = account.contactPhone?.trim();
    if (!phone) {
      toast({
        variant: 'destructive',
        title: 'No phone number',
        description: `Please edit the billing account for the ${account.familyName} family to add a contact phone number first.`,
      });
      return;
    }

    setBusy(true);
    try {
      const message = `Hi ${account.familyName}, this is a reminder that invoice "${inv.label}" (${formatCents(invoiceRemainingCents(inv))} remaining of ${formatCents(inv.amountCents || 0)}) for your student(s) is currently unpaid. Due date: ${inv.dueDate}. Please login or contact the office to clear the balance. Thank you!`;
      
      const collName = channel === 'sms' ? 'sms' : 'whatsapp';
      const ref = doc(collection(firestore, collName));
      await setDoc(ref, {
        to: phone,
        body: message,
        schoolId,
        createdAt: Date.now(),
        status: 'pending',
      });
      if (write.ctx) {
        await write.logOfficeChange(write.ctx, {
          entityType: 'officeInvoice',
          entityId: inv.id,
          action: 'update',
          summary: `Sent ${channel === 'sms' ? 'text' : 'WhatsApp'} reminder for ${inv.label} to ${account.familyName}`,
          after: officeAuditSnapshot({ channel, to: phone }),
        });
      }

      toast({
        title: `${channel === 'sms' ? 'SMS' : 'WhatsApp'} Alert Queued`,
        description: `Reminder successfully queued for dispatch to ${phone}.`,
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Failed to queue alert',
        description: (e as Error).message,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveAccount = async () => {
    if (!firestore || !familyName.trim()) {
      toast({ variant: 'destructive', title: 'Family name is required.' });
      return;
    }
    const parsedDiscountPercent = discountPercent.trim() ? Number.parseFloat(discountPercent.trim()) : null;
    if (
      discountPercent.trim() &&
      (!Number.isFinite(parsedDiscountPercent) || (parsedDiscountPercent as number) < 0 || (parsedDiscountPercent as number) > 100)
    ) {
      toast({ variant: 'destructive', title: 'Discount must be a percent between 0 and 100.' });
      return;
    }
    setBusy(true);
    try {
      const payload = {
        familyName: familyName.trim(),
        studentIds: selectedStudentIds,
        contactEmail: contactEmail.trim() || null,
        contactPhone: contactPhone.trim() || null,
        notes: accountNotes.trim() || null,
        discountLabel: discountLabel.trim() || null,
        discountPercent: parsedDiscountPercent,
        updatedAt: Date.now(),
      };
      if (editAccountId) {
        const existing = accounts.find((a) => a.id === editAccountId);
        // One address per family: a family with a profile keeps it there, so both screens show the same one.
        const family = existing?.familyId ? familyById.get(existing.familyId) : undefined;
        const address = accountAddress.trim() || null;
        if (family && write.ctx && address !== (family.homeAddress?.trim() || null)) {
          const { id: _id, updatedAt: _updatedAt, updatedBy: _updatedBy, ...familyData } = family;
          await write.upsertOfficeFamily(write.ctx, family.id, { ...familyData, homeAddress: address });
        }
        // Balance/status are left alone: they only change through invoices and payments.
        await updateDoc(doc(firestore, 'schools', schoolId, 'officeBillingAccounts', editAccountId), {
          ...payload,
          ...(family ? {} : { mailingAddress: address }),
        });
        if (write.ctx) {
          await write.logOfficeChange(write.ctx, {
            entityType: 'officeBillingAccount',
            entityId: editAccountId,
            action: 'update',
            summary: `Updated billing ${payload.familyName}`,
            before: existing ? officeAuditSnapshot(existing as unknown as Record<string, unknown>) : null,
            after: officeAuditSnapshot({ ...(existing ?? {}), ...payload } as unknown as Record<string, unknown>),
          });
        }
        toast({ title: 'Account updated' });
      } else {
        const ref = doc(collection(firestore, 'schools', schoolId, 'officeBillingAccounts'));
        const created = { ...payload, mailingAddress: accountAddress.trim() || null, balanceCents: 0, status: 'active' as const };
        await setDoc(ref, created);
        if (write.ctx) {
          await write.logOfficeChange(write.ctx, {
            entityType: 'officeBillingAccount',
            entityId: ref.id,
            action: 'create',
            summary: `Created billing ${payload.familyName}`,
            after: officeAuditSnapshot(created as unknown as Record<string, unknown>),
          });
        }
        toast({ title: 'Billing account created' });
      }
      setAccountOpen(false);
      resetAccountForm();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not create account', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveInvoice = async () => {
    if (!firestore || !invoiceAccountId || !invoiceLabel.trim() || !invoiceAmount) {
      toast({ variant: 'destructive', title: 'Account, label, and amount are required.' });
      return;
    }
    const cents = parseUsdToCents(invoiceAmount);
    if (cents == null) {
      toast({ variant: 'destructive', title: 'Enter a valid dollar amount.' });
      return;
    }
    const due = invoiceDue || new Date().toISOString().slice(0, 10);
    setBusy(true);
    try {
      if (editInvoiceId) {
        const existing = invoices.find((i) => i.id === editInvoiceId);
        if (!existing) throw new Error('Invoice not found');
        const status = saveAsDraft ? 'draft' : existing.status === 'draft' && !saveAsDraft ? 'sent' : existing.status;
        await updateDoc(doc(firestore, 'schools', schoolId, 'officeInvoices', editInvoiceId), {
          label: invoiceLabel.trim(),
          amountCents: cents,
          dueDate: due,
          status,
        });
        const account = accounts.find((a) => a.id === existing.accountId);
        if (account) {
          const nextInvoices = invoices.map((i) =>
            i.id === editInvoiceId
              ? { ...i, label: invoiceLabel.trim(), amountCents: cents, dueDate: due, status }
              : i,
          );
          const updatedInvoice = nextInvoices.find((i) => i.id === editInvoiceId)!;
          const oldRemaining = invoiceBalanceDueCents(existing);
          const newRemaining =
            status === 'sent' || status === 'partial'
              ? Math.max(0, cents - invoicePaidCents(existing))
              : 0;
          // A signed change to the balance, applied atomically below — not an absolute value
          // computed from a possibly-stale `account.balanceCents` read.
          let deltaCents = 0;
          if (existing.status === 'sent' || existing.status === 'partial') {
            deltaCents = newRemaining - oldRemaining;
          } else if (status === 'sent' && existing.status === 'draft') {
            deltaCents = cents;
          }
          const resolvedStatus = resolveInvoiceStatusAfterPayment(updatedInvoice, invoicePaidCents(updatedInvoice));
          if (resolvedStatus !== status) {
            await updateDoc(doc(firestore, 'schools', schoolId, 'officeInvoices', editInvoiceId), {
              status: resolvedStatus,
            });
          }
          await updateDoc(doc(firestore, 'schools', schoolId, 'officeBillingAccounts', existing.accountId), {
            balanceCents: increment(deltaCents),
            status: billingStatusForAccount(existing.accountId, nextInvoices, account.status),
            updatedAt: Date.now(),
          });
        }
        if (write.ctx) {
          await write.logOfficeChange(write.ctx, {
            entityType: 'officeInvoice',
            entityId: editInvoiceId,
            action: 'update',
            summary: `Updated invoice ${invoiceLabel.trim()}${
              existing.amountCents !== cents
                ? ` · ${formatCents(existing.amountCents || 0)} → ${formatCents(cents)}`
                : ''
            }`,
            before: officeAuditSnapshot(existing as unknown as Record<string, unknown>),
            after: officeAuditSnapshot({
              ...existing,
              label: invoiceLabel.trim(),
              amountCents: cents,
              dueDate: due,
              status,
            } as unknown as Record<string, unknown>),
          });
        }
        toast({ title: 'Invoice updated' });
      } else {
        const ref = doc(collection(firestore, 'schools', schoolId, 'officeInvoices'));
        const status = saveAsDraft ? 'draft' : 'sent';
        const created = {
          accountId: invoiceAccountId,
          label: invoiceLabel.trim(),
          amountCents: cents,
          dueDate: due,
          status,
          createdAt: Date.now(),
        };
        await setDoc(ref, created);
        const account = accounts.find((a) => a.id === invoiceAccountId);
        if (write.ctx) {
          await write.logOfficeChange(write.ctx, {
            entityType: 'officeInvoice',
            entityId: ref.id,
            action: 'create',
            summary: `Created invoice ${created.label}${account ? ` for ${account.familyName}` : ''} · ${formatCents(cents)}`,
            after: officeAuditSnapshot(created),
          });
        }
        if (account && !saveAsDraft) {
          const nextInvoices: OfficeInvoice[] = [
            ...invoices,
            {
              id: ref.id,
              accountId: invoiceAccountId,
              label: invoiceLabel.trim(),
              amountCents: cents,
              dueDate: due,
              status,
              createdAt: Date.now(),
            },
          ];
          await updateDoc(doc(firestore, 'schools', schoolId, 'officeBillingAccounts', invoiceAccountId), {
            balanceCents: increment(cents),
            status: billingStatusForAccount(invoiceAccountId, nextInvoices, account.status),
            updatedAt: Date.now(),
          });
        }
        toast({ title: saveAsDraft ? 'Draft saved' : 'Invoice created' });
      }
      setInvoiceOpen(false);
      resetInvoiceForm();
    } catch (e) {
      toast({
        variant: 'destructive',
        title: editInvoiceId ? 'Could not update invoice' : 'Could not create invoice',
        description: (e as Error).message,
      });
    } finally {
      setBusy(false);
    }
  };

  const voidInvoice = async (inv: OfficeInvoice) => {
    if (!firestore) return;
    const ok = await confirm({
      title: `Cancel “${inv.label}”?`,
      description: `The ${formatCents(invoiceRemainingCents(inv))} still owed is taken off the family's balance. The invoice stays in their history marked as cancelled.`,
      confirmLabel: 'Cancel invoice',
      cancelLabel: 'Keep it',
      tone: 'caution',
    });
    if (!ok) return;
    try {
      await updateDoc(doc(firestore, 'schools', schoolId, 'officeInvoices', inv.id), {
        status: 'void',
      });
      const account = accounts.find((a) => a.id === inv.accountId);
      const balanceReduction = invoiceBalanceDueCents(inv);
      if (account && balanceReduction > 0) {
        const nextInvoices = invoices.map((i) =>
          i.id === inv.id ? { ...i, status: 'void' as const } : i,
        );
        await updateDoc(doc(firestore, 'schools', schoolId, 'officeBillingAccounts', inv.accountId), {
          balanceCents: increment(-balanceReduction),
          status: billingStatusForAccount(inv.accountId, nextInvoices, account.status),
          updatedAt: Date.now(),
        });
      }
      if (write.ctx) {
        await write.logOfficeChange(write.ctx, {
          entityType: 'officeInvoice',
          entityId: inv.id,
          action: 'update',
          summary: `Voided invoice ${inv.label}${account ? ` for ${account.familyName}` : ''} · ${formatCents(inv.amountCents || 0)}`,
          before: officeAuditSnapshot(inv as unknown as Record<string, unknown>),
          after: officeAuditSnapshot({ ...inv, status: 'void' } as unknown as Record<string, unknown>),
        });
      }
      toast({ title: 'Invoice voided' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not void invoice', description: (e as Error).message });
    }
  };

  const sendDraft = async (inv: OfficeInvoice) => {
    if (!firestore || inv.status !== 'draft') return;
    try {
      await updateDoc(doc(firestore, 'schools', schoolId, 'officeInvoices', inv.id), {
        status: 'sent',
      });
      const account = accounts.find((a) => a.id === inv.accountId);
      if (account) {
        const nextInvoices = invoices.map((i) =>
          i.id === inv.id ? { ...i, status: 'sent' as const } : i,
        );
        await updateDoc(doc(firestore, 'schools', schoolId, 'officeBillingAccounts', inv.accountId), {
          balanceCents: increment(inv.amountCents || 0),
          status: billingStatusForAccount(inv.accountId, nextInvoices, account.status),
          updatedAt: Date.now(),
        });
      }
      if (write.ctx) {
        await write.logOfficeChange(write.ctx, {
          entityType: 'officeInvoice',
          entityId: inv.id,
          action: 'update',
          summary: `Sent draft invoice ${inv.label}${account ? ` to ${account.familyName}` : ''}`,
          before: officeAuditSnapshot(inv as unknown as Record<string, unknown>),
          after: officeAuditSnapshot({ ...inv, status: 'sent' } as unknown as Record<string, unknown>),
        });
      }
      toast({ title: 'Invoice sent', description: 'Balance updated.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not send invoice', description: (e as Error).message });
    }
  };

  const redistributePayAllocations = useCallback(
    (amountStr: string, selectedIds: string[]) => {
      const cents = parseUsdToCents(amountStr);
      if (cents == null || cents <= 0 || selectedIds.length === 0) {
        setPayAllocations({});
        return;
      }
      const allocs = autoAllocatePayment(invoices, cents, new Set(selectedIds));
      const map: Record<string, string> = {};
      for (const row of allocs) {
        map[row.invoiceId] = (row.amountCents / 100).toFixed(2);
      }
      setPayAllocations(map);
    },
    [invoices],
  );

  const openRecordPayment = (account: OfficeBillingAccount, focusInvoice?: OfficeInvoice) => {
    const payable = (invoicesByAccount.get(account.id) ?? []).filter(isInvoicePayable);
    if (payable.length === 0) {
      toast({ variant: 'destructive', title: 'No open invoices', description: 'Send an invoice before recording a payment.' });
      return;
    }
    const selectedIds = payable.map((i) => i.id);
    const defaultCents = focusInvoice
      ? invoiceRemainingCents(focusInvoice)
      : payable.reduce((sum, i) => sum + invoiceRemainingCents(i), 0);
    setPayAccount(account);
    setPaySelectedIds(selectedIds);
    setPaymentAmount(defaultCents > 0 ? (defaultCents / 100).toFixed(2) : '');
    setPaymentMethod('check');
    setPaymentNote('');
    setPayOpen(true);
    if (defaultCents > 0) {
      const allocs = autoAllocatePayment(invoices, defaultCents, new Set(selectedIds));
      const map: Record<string, string> = {};
      for (const row of allocs) {
        map[row.invoiceId] = (row.amountCents / 100).toFixed(2);
      }
      setPayAllocations(map);
    } else {
      setPayAllocations({});
    }
  };

  const openPaymentPlan = (account: OfficeBillingAccount) => {
    setPlanAccount(account);
    setPlanLabel('Tuition');
    setPlanTotal('');
    setPlanInstallments('4');
    setPlanStartDate(defaultDueDateIso());
    setPlanOpen(true);
  };

  const handleCreatePaymentPlan = async () => {
    if (!firestore || !planAccount) return;
    const totalCents = parseUsdToCents(planTotal);
    const count = Number.parseInt(planInstallments, 10);
    if (totalCents == null || totalCents <= 0) {
      toast({ variant: 'destructive', title: 'Enter a valid total amount.' });
      return;
    }
    if (!Number.isFinite(count) || count < 1 || count > 24) {
      toast({ variant: 'destructive', title: 'Number of payments must be between 1 and 24.' });
      return;
    }
    if (!planLabel.trim()) {
      toast({ variant: 'destructive', title: 'Give the plan a label, like "Tuition".' });
      return;
    }
    setBusy(true);
    try {
      const amounts = splitCentsIntoInstallments(totalCents, count);
      const batch = writeBatch(firestore);
      const now = Date.now();
      for (let i = 0; i < count; i += 1) {
        const ref = doc(collection(firestore, 'schools', schoolId, 'officeInvoices'));
        batch.set(ref, {
          accountId: planAccount.id,
          label: `${planLabel.trim()} (${i + 1} of ${count})`,
          amountCents: amounts[i],
          dueDate: addMonthsToIsoDate(planStartDate, i),
          status: 'sent',
          createdAt: now + i,
        });
      }
      batch.update(doc(firestore, 'schools', schoolId, 'officeBillingAccounts', planAccount.id), {
        balanceCents: increment(totalCents),
        updatedAt: now,
      });
      await batch.commit();
      if (write.ctx) {
        await write.logOfficeChange(write.ctx, {
          entityType: 'officeBillingAccount',
          entityId: planAccount.id,
          action: 'update',
          summary: `Created payment plan ${planLabel.trim()} for ${planAccount.familyName} · ${count} × ${formatCents(amounts[0])}`,
          after: officeAuditSnapshot({ label: planLabel.trim(), totalCents, count, amounts, startDate: planStartDate }),
        });
      }
      toast({
        title: 'Payment plan created',
        description: `${count} invoices of ${formatCents(amounts[0])} for ${planAccount.familyName}, one per month starting ${planStartDate}.`,
      });
      setPlanOpen(false);
      setPlanAccount(null);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not create payment plan', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const togglePayInvoice = (invoiceId: string, checked: boolean) => {
    setPaySelectedIds((prev) => {
      const next = checked ? [...prev, invoiceId] : prev.filter((id) => id !== invoiceId);
      redistributePayAllocations(paymentAmount, next);
      return next;
    });
  };

  const recordPayment = async () => {
    if (!firestore || !payAccount) return;
    const paymentCents = parseUsdToCents(paymentAmount);
    if (paymentCents == null || paymentCents <= 0) {
      toast({ variant: 'destructive', title: 'Enter a valid payment amount.' });
      return;
    }
    const allocations: OfficePaymentAllocation[] = [];
    for (const invoiceId of paySelectedIds) {
      const raw = payAllocations[invoiceId]?.trim();
      if (!raw) continue;
      const cents = parseUsdToCents(raw);
      if (cents == null || cents <= 0) continue;
      allocations.push({ invoiceId, amountCents: cents });
    }
    if (allocations.length === 0) {
      toast({ variant: 'destructive', title: 'Apply the payment to at least one invoice.' });
      return;
    }
    if (sumPaymentAllocations(allocations) !== paymentCents) {
      toast({
        variant: 'destructive',
        title: 'Allocation mismatch',
        description: 'The per-invoice amounts must add up to the payment total.',
      });
      return;
    }
    setBusy(true);
    try {
      const batch = writeBatch(firestore);
      const now = Date.now();
      const paymentRef = doc(collection(firestore, 'schools', schoolId, 'officePayments'));
      batch.set(paymentRef, {
        accountId: payAccount.id,
        amountCents: paymentCents,
        method: paymentMethod,
        note: paymentNote.trim() || null,
        allocations,
        createdAt: now,
      });

      // `paidCents`/`balanceCents` are applied as atomic deltas (`increment`) rather than
      // absolute values computed from the locally cached `invoices`/`payAccount` props — two
      // payments landing on the same account/invoice close together would otherwise have the
      // second overwrite the first's effect on these running totals.
      let nextInvoices = [...invoices];
      for (const alloc of allocations) {
        const inv = invoices.find((i) => i.id === alloc.invoiceId);
        if (!inv) continue;
        const newPaid = invoicePaidCents(inv) + alloc.amountCents;
        const status = resolveInvoiceStatusAfterPayment(inv, newPaid);
        batch.update(doc(firestore, 'schools', schoolId, 'officeInvoices', inv.id), {
          paidCents: increment(alloc.amountCents),
          status,
          paidAt: status === 'paid' ? now : inv.paidAt ?? null,
          paymentMethod: status === 'paid' ? paymentMethod : inv.paymentMethod ?? null,
          paymentNote: status === 'paid' && paymentNote.trim() ? paymentNote.trim() : inv.paymentNote ?? null,
        });
        nextInvoices = nextInvoices.map((i) =>
          i.id === inv.id
            ? {
                ...i,
                paidCents: newPaid,
                status,
                paidAt: status === 'paid' ? now : i.paidAt ?? null,
                paymentMethod: status === 'paid' ? paymentMethod : i.paymentMethod ?? null,
              }
            : i,
        );
      }

      batch.update(doc(firestore, 'schools', schoolId, 'officeBillingAccounts', payAccount.id), {
        balanceCents: increment(-paymentCents),
        status: billingStatusForAccount(payAccount.id, nextInvoices, payAccount.status),
        updatedAt: now,
      });

      await batch.commit();

      if (write.ctx) {
        await write.logOfficeChange(write.ctx, {
          entityType: 'officePayment',
          entityId: paymentRef.id,
          action: 'create',
          summary: `Recorded ${paymentMethod} payment of ${formatCents(paymentCents)} from ${payAccount.familyName}`,
          after: officeAuditSnapshot({
            accountId: payAccount.id,
            amountCents: paymentCents,
            method: paymentMethod,
            note: paymentNote.trim() || null,
            allocations: allocations.map((a) => ({
              ...a,
              label: invoices.find((i) => i.id === a.invoiceId)?.label ?? null,
            })),
          }),
        });
      }

      const printReceipt = () => {
        const receiptHtml = buildOfficeReceiptHtml({
          account: payAccount,
          amountCents: paymentCents,
          method: paymentMethod,
          note: paymentNote,
          allocations: allocations.map((a) => ({
            label: invoices.find((i) => i.id === a.invoiceId)?.label ?? 'Payment',
            amountCents: a.amountCents,
          })),
          schoolLabel: officeSettings?.statementSchoolName?.trim() || 'School Office',
          paidAt: now,
        });
        if (!openOfficePrintDocument(receiptHtml)) {
          toast({ variant: 'destructive', title: 'Pop-up blocked', description: 'Allow pop-ups to print.' });
        }
      };

      toast({
        title: 'Payment recorded',
        description:
          allocations.length > 1
            ? `${formatCents(paymentCents)} applied across ${allocations.length} invoices.`
            : `${formatCents(paymentCents)} applied.`,
        action: (
          <ToastAction altText="Print receipt" onClick={printReceipt}>
            Print receipt
          </ToastAction>
        ),
      });

      setPayOpen(false);
      setPayAccount(null);
      setPaymentAmount('');
      setPaySelectedIds([]);
      setPayAllocations({});
    } catch (e) {
      toast({ variant: 'destructive', title: 'Update failed', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const exportBillingCsv = () => {
    const visibleIds = new Set(filteredAccounts.map((a) => a.id));
    const source = invoices.filter((inv) => visibleIds.has(inv.accountId));
    const rows: string[][] = [];
    for (const inv of source) {
      const account = accounts.find((a) => a.id === inv.accountId);
      rows.push([
        account?.familyName ?? '',
        inv.label,
        formatCents(inv.amountCents),
        formatCents(invoiceRemainingCents(inv)),
        inv.dueDate,
        inv.status,
        isInvoiceOverdue(inv) ? 'yes' : 'no',
      ]);
    }
    downloadCsv(`billing-${schoolId}.csv`, ['Account', 'Description', 'Amount', 'Remaining', 'Due', 'Status', 'Overdue'], rows);
    toast({
      title: 'Exported',
      description:
        visibleIds.size < accounts.length
          ? `${rows.length} invoice rows (current filter).`
          : `${rows.length} invoice rows.`,
    });
  };

  const handleDeleteAccount = async (id: string) => {
    const account = accounts.find((a) => a.id === id);
    if (!write.ctx || !account) return;
    const ok = await confirm({
      title: `Remove the ${account.familyName} account?`,
      description: 'It will be hidden from Billing. Its invoices, payments, and history are kept and can still be looked up.',
      confirmLabel: 'Remove account',
      tone: 'caution',
    });
    if (!ok) return;
    try {
      await write.archiveOfficeBillingAccount(write.ctx, account);
      toast({ title: 'Account removed', description: 'Its history is kept in the change history.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Delete failed', description: (e as Error).message });
    }
  };

  return (
    <div className="space-y-3">
      {confirmDialog}
      {askLabel ? <OfficeAssistantBanner label={askLabel} onClear={clearAsk} /> : null}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {filteredAccounts.length === accounts.length
              ? `${accounts.length} family ${accounts.length === 1 ? 'account' : 'accounts'}`
              : `${filteredAccounts.length} of ${accounts.length} family accounts`}
          </span>
          {showAllAccounts || invoiceFilter !== 'all' || search.trim() || minOwedCents != null || maxOwedCents != null ? (
            <button
              type="button"
              className="text-xs font-medium text-teal-800 hover:underline dark:text-teal-300"
              onClick={clearAsk}
            >
              Clear
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" aria-label="More options">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuItem onSelect={openNewAccount}>
                <Plus className="mr-2 h-4 w-4" />
                New family account
              </DropdownMenuItem>
              <DropdownMenuItem disabled={accounts.length === 0} onSelect={() => setBulkOpen(true)}>
                <Wand2 className="mr-2 h-4 w-4" />
                Bill many families at once
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={invoices.length === 0} onSelect={exportBillingCsv}>
                <Download className="mr-2 h-4 w-4" />
                Download spreadsheet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button className="rounded-xl gap-2" onClick={() => openNewInvoice()} disabled={accounts.length === 0}>
            <Plus className="h-4 w-4" />
            New invoice
          </Button>
        </div>
      </div>

      {/* Three numbers that double as filters — tap one to see just those families. */}
      <div className="grid grid-cols-3 gap-2.5">
        {(
          [
            { key: 'open', label: 'Still owed', value: formatCents(openBalanceCents), tone: 'text-slate-900 dark:text-white' },
            { key: 'overdue', label: 'Overdue', value: `${overdueCount} invoice${overdueCount === 1 ? '' : 's'}`, tone: overdueCount > 0 ? 'text-amber-800 dark:text-amber-300' : 'text-slate-900 dark:text-white' },
            { key: 'due-soon', label: 'Due soon', value: `${dueSoonCount} invoice${dueSoonCount === 1 ? '' : 's'}`, tone: 'text-slate-900 dark:text-white' },
          ] as const
        ).map((tile) => (
          <button
            key={tile.key}
            type="button"
            aria-pressed={invoiceFilter === tile.key}
            onClick={() => setInvoiceFilter(invoiceFilter === tile.key ? 'all' : tile.key)}
            className={cn(
              'rounded-2xl bg-white px-4 py-3 text-left shadow-sm ring-1 transition-all hover:shadow-md dark:bg-slate-900/80',
              invoiceFilter === tile.key
                ? 'ring-2 ring-teal-600 dark:ring-teal-400'
                : 'ring-slate-200/70 hover:ring-teal-300/70 dark:ring-slate-800',
            )}
          >
            <span className="block text-xs font-medium text-muted-foreground">{tile.label}</span>
            <span className={cn('mt-0.5 block text-lg font-semibold tabular-nums sm:text-xl', tile.tone)}>{tile.value}</span>
          </button>
        ))}
      </div>

      <OfficeSearchInput value={search} onChange={setSearch} placeholder="Search families or students…" />

      {isLoading ? (
        <OfficeLoadingRows cols={3} />
      ) : accounts.length === 0 ? (
        <OfficeEmptyState
          icon={CreditCard}
          title="No billing accounts yet"
          description="Create a family account and link students to track tuition and fees."
          action={
            <Button className="rounded-xl gap-2" onClick={openNewAccount}>
              <Plus className="h-4 w-4" />
              New account
            </Button>
          }
        />
      ) : !(showAllAccounts || askLabel || invoiceFilter !== 'all' || search.trim() || minOwedCents != null || maxOwedCents != null) ? (
        <p className="text-sm text-muted-foreground">
          Search for a family, or tap a number above to see those families.{' '}
          <button
            type="button"
            onClick={() => setShowAllAccounts(true)}
            className="font-medium text-teal-800 hover:underline dark:text-teal-300"
          >
            Show all {accounts.length} families
          </button>
        </p>
      ) : filteredAccounts.length === 0 ? (
        <OfficeEmptyState title="No accounts match" description="Try a different search or filter." />
      ) : (
        <div className="space-y-4">
          {filteredAccounts.map((account) => {
            const linked = (account.studentIds ?? [])
              .map((id) => studentLabelById.get(id))
              .filter(Boolean)
              .join(', ');
            const acctInvoices = invoicesByAccount.get(account.id) ?? [];
            const isOpen = openAccounts.has(account.id);
            const overdueCount = acctInvoices.filter((i) => isInvoiceOverdue(i)).length;
            return (
              <article
                key={account.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => toggleAccount(account.id)}
                    aria-expanded={isOpen}
                    className="flex min-w-0 flex-1 items-start gap-2 text-left"
                  >
                    <ChevronDown
                      className={cn('mt-1.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform', !isOpen && '-rotate-90')}
                      aria-hidden
                    />
                    <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold">{account.familyName}</h3>
                      {account.discountPercent ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[0.625rem] font-bold uppercase text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                          {account.discountLabel || 'Discount'} · {account.discountPercent}%
                        </span>
                      ) : null}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {linked || 'No students linked'}
                      {acctInvoices.length > 0
                        ? ` · ${acctInvoices.length} ${acctInvoices.length === 1 ? 'bill' : 'bills'}${overdueCount ? `, ${overdueCount} overdue` : ''}`
                        : ''}
                    </span>
                    </span>
                  </button>
                  <div className="flex items-center gap-3">
                    {/* The family's own details: its profile when it has one, otherwise its billing details. */}
                    <button
                      type="button"
                      onClick={() =>
                        account.familyId && familyById.has(account.familyId)
                          ? openFamily(account.familyId)
                          : openEditAccount(account)
                      }
                      className="text-xs font-medium text-teal-800 hover:underline dark:text-teal-300"
                    >
                      Family details
                    </button>
                    <span
                      className={cn(
                        'text-right text-base font-semibold tabular-nums',
                        overdueCount > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-slate-900 dark:text-slate-100',
                      )}
                    >
                      {formatCents(account.balanceCents || 0)}
                    </span>
                    <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg text-xs"
                      onClick={() => openRecordPayment(account)}
                      disabled={(acctInvoices.filter(isInvoicePayable).length ?? 0) === 0}
                    >
                      Record payment
                    </Button>
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          aria-label={`More for ${account.familyName}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52 rounded-xl">
                        <DropdownMenuItem onSelect={() => openNewInvoice(account.id)}>
                          <Plus className="mr-2 h-4 w-4" />
                          New invoice
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => openPaymentPlan(account)}>
                          <CalendarClock className="mr-2 h-4 w-4" />
                          Payment plan
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() =>
                            printFamilyStatement(
                              account,
                              (account.studentIds ?? [])
                                .map((id) => studentLabelById.get(id))
                                .filter((x): x is string => Boolean(x)),
                            )
                          }
                        >
                          <Printer className="mr-2 h-4 w-4" />
                          Print statement
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => openEditAccount(account)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit family details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-amber-800 focus:text-amber-900 dark:text-amber-300"
                          onSelect={() => void handleDeleteAccount(account.id)}
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Remove account
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    </div>
                  </div>
                </div>
                {isOpen && acctInvoices.length > 0 ? (
                  <ul className="mt-3 divide-y border-t dark:divide-slate-800 dark:border-slate-800">
                    {acctInvoices.map((inv) => {
                      // One label per bill: overdue says it all; otherwise its state.
                      const overdue = isInvoiceOverdue(inv);
                      return (
                      <li key={inv.id} className="flex items-center gap-3 py-2 pl-6 text-sm">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{inv.label}</span>
                          <span className="block text-xs text-muted-foreground">
                            Due {inv.dueDate}
                            {invoicePaidCents(inv) > 0 && inv.status !== 'paid'
                              ? ` · ${formatCents(invoiceRemainingCents(inv))} still due`
                              : ''}
                          </span>
                        </span>
                        <span
                          className={cn(
                            'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                            overdue
                              ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
                              : inv.status === 'paid'
                                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                                : inv.status === 'partial'
                                  ? 'bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                          )}
                        >
                          {overdue ? 'Overdue' : (INVOICE_STATUS_LABEL[inv.status] ?? inv.status)}
                        </span>
                        <span className="w-24 shrink-0 text-right font-medium tabular-nums">{formatCents(inv.amountCents)}</span>
                        <span className="flex w-16 shrink-0 items-center justify-end gap-1">
                          {inv.status === 'draft' ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 rounded-lg"
                              onClick={() => void sendDraft(inv)}
                            >
                              Send
                            </Button>
                          ) : null}
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-lg"
                                aria-label={`More for ${inv.label}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-xl">
                              {isInvoicePayable(inv) && inv.status !== 'draft' ? (
                                <DropdownMenuItem onSelect={() => openRecordPayment(account, inv)}>
                                  <Wallet className="mr-2 h-4 w-4" />
                                  Record payment for this bill
                                </DropdownMenuItem>
                              ) : null}
                              {inv.status === 'sent' || inv.status === 'partial' ? (
                                <>
                                  {account.contactEmail?.trim() ? (
                                    <DropdownMenuItem asChild>
                                      <a
                                        href={buildInvoiceReminderMailto({
                                          email: account.contactEmail.trim(),
                                          familyName: account.familyName,
                                          invoiceLabel: inv.label,
                                          amountCents: invoiceRemainingCents(inv),
                                          dueDate: inv.dueDate,
                                        })}
                                      >
                                        <Mail className="mr-2 h-4 w-4" />
                                        Email a reminder
                                      </a>
                                    </DropdownMenuItem>
                                  ) : null}
                                  <DropdownMenuItem onSelect={() => void handleSendTextAlert(inv, account, 'sms')}>
                                    <Phone className="mr-2 h-4 w-4" />
                                    Text a reminder
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => void handleSendTextAlert(inv, account, 'whatsapp')}>
                                    <MessageSquare className="mr-2 h-4 w-4" />
                                    WhatsApp a reminder
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              ) : null}
                              {inv.status === 'draft' || inv.status === 'sent' || inv.status === 'partial' ? (
                                <DropdownMenuItem onSelect={() => openEditInvoice(inv)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit invoice
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuItem
                                onSelect={() =>
                                  openNewInvoice(account.id, {
                                    ...inv,
                                    label: inv.label,
                                    dueDate: defaultDueDateIso(30),
                                  })
                                }
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Copy as a new invoice
                              </DropdownMenuItem>
                              {isInvoicePayable(inv) ? (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-amber-800 focus:text-amber-900 dark:text-amber-300"
                                    onSelect={() => void voidInvoice(inv)}
                                  >
                                    <Ban className="mr-2 h-4 w-4" />
                                    Cancel this invoice
                                  </DropdownMenuItem>
                                </>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </span>
                      </li>
                      );
                    })}
                  </ul>
                ) : isOpen ? (
                  <p className="mt-3 pl-6 text-xs text-muted-foreground">No invoices for this account.</p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      <Dialog
        open={accountOpen}
        onOpenChange={(open) => {
          setAccountOpen(open);
          if (!open) resetAccountForm();
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editAccountId ? 'Edit billing account' : 'New billing account'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Family / payer name</Label>
              <Input value={familyName} onChange={(e) => setFamilyName(e.target.value)} className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="office-billing-address">Address</Label>
              <OfficeAddressInput id="office-billing-address" value={accountAddress} onChange={setAccountAddress} />
              {editAccountId && familyById.has(accounts.find((a) => a.id === editAccountId)?.familyId ?? '') ? (
                <p className="text-xs text-muted-foreground">The same address as on the family profile — changing it here changes it there too.</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input value={accountNotes} onChange={(e) => setAccountNotes(e.target.value)} className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Discount / scholarship (optional)</Label>
                <Input
                  value={discountLabel}
                  onChange={(e) => setDiscountLabel(e.target.value)}
                  placeholder="e.g. Sibling discount"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Percent off</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  placeholder="e.g. 20"
                  className="rounded-xl"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Shown as a reminder when you create an invoice for this family — it never changes an invoice amount by itself.
            </p>
            <div className="space-y-2">
              <Label>Link students</Label>
              <OfficeSearchInput
                value={accountStudentSearch}
                onChange={setAccountStudentSearch}
                placeholder="Filter students…"
                className="max-w-full"
              />
              <div className="max-h-40 overflow-y-auto rounded-xl border p-2 space-y-1">
                {students
                  .filter((s) => {
                    const q = accountStudentSearch.trim().toLowerCase();
                    if (!q) return true;
                    return (studentLabelById.get(s.id) ?? '').toLowerCase().includes(q);
                  })
                  .map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 text-sm rounded-lg px-2 py-1.5 cursor-pointer hover:bg-muted/40"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.includes(s.id)}
                      onChange={() => toggleStudent(s.id)}
                      className="h-4 w-4 accent-teal-700"
                    />
                    <span className="flex-1">{studentLabelById.get(s.id)}</span>
                  </label>
                  ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccountOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveAccount()} disabled={busy}>
              {editAccountId ? 'Save changes' : 'Create account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={payOpen}
        onOpenChange={(open) => {
          setPayOpen(open);
          if (!open) {
            setPayAccount(null);
            setPaymentAmount('');
            setPaySelectedIds([]);
            setPayAllocations({});
          }
        }}
      >
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
          </DialogHeader>
          {payAccount ? (
            <p className="text-sm text-muted-foreground">
              {payAccount.familyName} · balance {formatCents(payAccount.balanceCents || 0)}
            </p>
          ) : null}
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Payment amount (USD)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={paymentAmount}
                onChange={(e) => {
                  const next = e.target.value;
                  setPaymentAmount(next);
                  redistributePayAllocations(next, paySelectedIds);
                }}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Apply to invoices</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 rounded-lg text-xs"
                  onClick={() => redistributePayAllocations(paymentAmount, paySelectedIds)}
                >
                  Fill oldest first
                </Button>
              </div>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border p-2">
                {(payAccount ? (invoicesByAccount.get(payAccount.id) ?? []).filter(isInvoicePayable) : []).map(
                  (inv) => (
                    <div key={inv.id} className="flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5">
                      <Checkbox
                        checked={paySelectedIds.includes(inv.id)}
                        onCheckedChange={(checked) => togglePayInvoice(inv.id, checked === true)}
                        aria-label={`Apply payment to ${inv.label}`}
                      />
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="truncate font-medium">{inv.label}</p>
                        <p className="text-xs text-muted-foreground">
                          Due {inv.dueDate} · {formatCents(invoiceRemainingCents(inv))} remaining
                        </p>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        disabled={!paySelectedIds.includes(inv.id)}
                        value={payAllocations[inv.id] ?? ''}
                        onChange={(e) =>
                          setPayAllocations((prev) => ({ ...prev, [inv.id]: e.target.value }))
                        }
                        className="h-8 w-24 rounded-lg text-sm"
                        aria-label={`Amount for ${inv.label}`}
                      />
                    </div>
                  ),
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Allocated:{' '}
                {formatCents(
                  Object.entries(payAllocations)
                    .filter(([id]) => paySelectedIds.includes(id))
                    .reduce((sum, [, raw]) => sum + (parseUsdToCents(raw) ?? 0), 0),
                )}{' '}
                of {formatCents(parseUsdToCents(paymentAmount) ?? 0)}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Payment method</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as OfficePaymentMethod)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card (manual)</SelectItem>
                  <SelectItem value="transfer">Bank transfer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Input
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Check #1042, paid in office…"
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>
              Cancel
            </Button>
            <Button disabled={busy || !payAccount} onClick={() => void recordPayment()}>
              Record payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={invoiceOpen}
        onOpenChange={(open) => {
          setInvoiceOpen(open);
          if (!open) resetInvoiceForm();
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editInvoiceId ? 'Edit invoice' : 'New invoice'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Account</Label>
              <Select value={invoiceAccountId} onValueChange={setInvoiceAccountId} disabled={!!editInvoiceId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Choose account" />
                </SelectTrigger>
                <SelectContent>
                  <OrphanSelectItem
                    value={invoiceAccountId}
                    entityName="account"
                    show={!isLoading && isOrphanSelectValue(invoiceAccountId, accounts, { requireNonEmptyOptions: true })}
                  />
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.familyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={invoiceLabel} onChange={(e) => setInvoiceLabel(e.target.value)} placeholder="Tuition Q1" className="rounded-xl" />
              <OfficeQuickChips
                options={invoiceLabelSuggestions.slice(0, 6)}
                value={invoiceLabel}
                onSelect={setInvoiceLabel}
              />
            </div>
            {!editInvoiceId ? (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={saveAsDraft}
                  onChange={(e) => setSaveAsDraft(e.target.checked)}
                  className="h-4 w-4 accent-teal-700"
                />
                Save as draft (won&apos;t add to balance until sent)
              </label>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Amount (USD)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Due date</Label>
                <Input type="date" value={invoiceDue} onChange={(e) => setInvoiceDue(e.target.value)} className="rounded-xl" />
              </div>
            </div>
            {invoiceAccountDiscount ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                <span>
                  {invoiceAccountDiscount.discountLabel || 'Discount'} on file: {invoiceAccountDiscount.discountPercent}% off
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-lg bg-white text-xs dark:bg-transparent"
                  onClick={() => {
                    const cents = parseUsdToCents(invoiceAmount);
                    if (cents == null) return;
                    const discounted = Math.round(cents * (1 - (invoiceAccountDiscount.discountPercent ?? 0) / 100));
                    setInvoiceAmount((discounted / 100).toFixed(2));
                  }}
                >
                  Apply discount
                </Button>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveInvoice()} disabled={busy}>
              {editInvoiceId ? 'Save changes' : 'Create invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={planOpen}
        onOpenChange={(open) => {
          setPlanOpen(open);
          if (!open) setPlanAccount(null);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Set up a payment plan</DialogTitle>
          </DialogHeader>
          {planAccount ? (
            <p className="text-sm text-muted-foreground">
              Splits a total into equal monthly invoices for {planAccount.familyName}. No online charging — these are
              regular invoices families still pay by check, cash, or transfer.
            </p>
          ) : null}
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input value={planLabel} onChange={(e) => setPlanLabel(e.target.value)} className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Total amount (USD)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={planTotal}
                  onChange={(e) => setPlanTotal(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Number of payments</Label>
                <Input
                  type="number"
                  min={1}
                  max={24}
                  value={planInstallments}
                  onChange={(e) => setPlanInstallments(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>First due date</Label>
              <Input
                type="date"
                value={planStartDate}
                onChange={(e) => setPlanStartDate(e.target.value)}
                className="rounded-xl"
              />
            </div>
            {planTotal && planInstallments ? (
              <p className="text-xs text-muted-foreground">
                {planInstallments} payments of about{' '}
                {(() => {
                  const cents = parseUsdToCents(planTotal);
                  const count = Number.parseInt(planInstallments, 10);
                  if (cents == null || !Number.isFinite(count) || count < 1) return '—';
                  return formatCents(splitCentsIntoInstallments(cents, count)[0]);
                })()}
                , one per month.
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreatePaymentPlan()} disabled={busy}>
              Create payment plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={bulkOpen}
        onOpenChange={(open) => {
          setBulkOpen(open);
          if (!open) {
            setBulkLabel('');
            setBulkAmount('');
            setBulkDue(defaultDueDateIso());
            setBulkSaveAsDraft(false);
          }
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-800 dark:text-teal-300">
              <Wand2 className="h-5 w-5" />
              Bulk Invoice Wizard
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Target Homeroom / Class</Label>
              <Select value={bulkTargetHomeroom} onValueChange={setBulkTargetHomeroom}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts (Direct)</SelectItem>
                  {homeroomNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      Homeroom: {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Invoices will be batch generated for each billing account linked to students in the selected class.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Invoice Description / Label</Label>
              <Input
                value={bulkLabel}
                onChange={(e) => setBulkLabel(e.target.value)}
                placeholder="Field Trip Fee, Tech Levy, etc."
                className="rounded-xl"
              />
              <OfficeQuickChips
                options={invoiceLabelSuggestions.slice(0, 6)}
                value={bulkLabel}
                onSelect={setBulkLabel}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <input
                type="checkbox"
                checked={bulkSaveAsDraft}
                onChange={(e) => setBulkSaveAsDraft(e.target.checked)}
                className="h-4 w-4 accent-teal-700"
              />
              Save as draft (won&apos;t apply to family balances immediately)
            </label>

            <div className="grid grid-cols-2 gap-3 mt-1">
              <div className="space-y-2">
                <Label>Amount (USD)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={bulkAmount}
                  onChange={(e) => setBulkAmount(e.target.value)}
                  placeholder="25.00"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={bulkDue}
                  onChange={(e) => setBulkDue(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setBulkOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-teal-700 hover:bg-teal-800 text-white dark:bg-teal-600 dark:hover:bg-teal-700"
              onClick={() => void handleBulkInvoicing()}
              disabled={busy || !bulkLabel.trim() || !bulkAmount}
            >
              Generate Invoices
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
