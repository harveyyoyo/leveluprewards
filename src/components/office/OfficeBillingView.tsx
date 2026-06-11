'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSearchParams } from 'next/navigation';
import { Copy, Download, Mail, Pencil, Plus, Trash2, Wand2, Phone, MessageSquare, AlertCircle } from 'lucide-react';
import { useOfficeUrlSync } from '@/lib/office/useOfficeUrlSync';
import { useOfficeSettings } from '@/lib/office/useOfficeSettings';
import { OfficeFamilyStatementButton } from '@/components/office/OfficeFamilyStatement';
import { useToast } from '@/hooks/use-toast';
import { formatCents } from '@/lib/office/officeNav';
import {
  billingStatusForAccount,
  buildInvoiceReminderMailto,
  defaultDueDateIso,
  downloadCsv,
  isInvoiceDueSoon,
  isInvoiceOverdue,
  parseUsdToCents,
} from '@/lib/office/officeUtils';
import { useOfficeWrite } from '@/lib/office/useOfficeWrite';
import { OfficeSearchInput } from '@/components/office/OfficeSearchInput';
import { OfficeQuickChips } from '@/components/office/OfficeQuickChips';
import { OfficeEmptyState } from '@/components/office/OfficeEmptyState';
import { OfficeLoadingRows } from '@/components/office/OfficeLoadingRows';
import { CreditCard } from 'lucide-react';
import type { OfficeBillingAccount, OfficeInvoice, OfficePaymentMethod, OfficeInvoiceStatus } from '@/lib/office/types';
import type { OfficeStudent } from '@/lib/office/types';
import { cn } from '@/lib/utils';

type OfficeBillingViewProps = {
  schoolId: string;
  students: OfficeStudent[];
  studentLabelById: Map<string, string>;
  accounts: OfficeBillingAccount[];
  invoices: OfficeInvoice[];
  isLoading: boolean;
  classNameById?: Map<string, string>;
};

export function OfficeBillingView({
  schoolId,
  students,
  studentLabelById,
  accounts,
  invoices,
  isLoading,
  classNameById,
}: OfficeBillingViewProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const write = useOfficeWrite(schoolId);
  const { settings: officeSettings } = useOfficeSettings(schoolId);
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
  const [saveAsDraft, setSaveAsDraft] = useState(false);
  const searchParams = useSearchParams();
  const openedInvoiceFromQuery = useRef(false);
  const [editAccountId, setEditAccountId] = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [accountNotes, setAccountNotes] = useState('');
  const [accountStudentSearch, setAccountStudentSearch] = useState('');
  const [editInvoiceId, setEditInvoiceId] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<OfficeInvoice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<OfficePaymentMethod>('check');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkTargetHomeroom, setBulkTargetHomeroom] = useState('all');
  const [bulkLabel, setBulkLabel] = useState('');
  const [bulkAmount, setBulkAmount] = useState('');
  const [bulkDue, setBulkDue] = useState(defaultDueDateIso());
  const [bulkSaveAsDraft, setBulkSaveAsDraft] = useState(false);

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

  const invoicesByAccount = useMemo(() => {
    const map = new Map<string, OfficeInvoice[]>();
    for (const inv of invoices) {
      const list = map.get(inv.accountId) ?? [];
      list.push(inv);
      map.set(inv.accountId, list);
    }
    for (const [id, list] of map) {
      list.sort((a, b) => (b.dueDate ?? '').localeCompare(a.dueDate ?? ''));
      map.set(id, list);
    }
    return map;
  }, [invoices]);

  const openBalanceCents = useMemo(
    () =>
      invoices
        .filter((i) => i.status === 'sent' || i.status === 'draft' || i.status === 'partial')
        .reduce((sum, i) => sum + Math.max(0, (i.amountCents || 0) - (i.paidAmountCents || 0)), 0),
    [invoices],
  );

  const overdueCount = useMemo(() => invoices.filter((i) => isInvoiceOverdue(i)).length, [invoices]);

  const paidCount = useMemo(() => invoices.filter((i) => i.status === 'paid').length, [invoices]);

  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = accounts;
    if (invoiceFilter === 'overdue') {
      list = list.filter((a) => (invoicesByAccount.get(a.id) ?? []).some((i) => isInvoiceOverdue(i)));
    } else if (invoiceFilter === 'due-soon') {
      list = list.filter((a) => (invoicesByAccount.get(a.id) ?? []).some((i) => isInvoiceDueSoon(i)));
    } else if (invoiceFilter === 'open') {
      list = list.filter(
        (a) =>
          (a.balanceCents || 0) > 0 ||
          (invoicesByAccount.get(a.id) ?? []).some((i) => i.status === 'sent' || i.status === 'draft'),
      );
    }
    if (!q) return list;
    return list.filter((a) => {
      const linked = (a.studentIds ?? []).map((id) => studentLabelById.get(id) ?? '').join(' ');
      return (a.familyName ?? '').toLowerCase().includes(q) || linked.toLowerCase().includes(q);
    });
  }, [accounts, search, studentLabelById, invoiceFilter, invoicesByAccount]);

  const resetAccountForm = () => {
    setFamilyName('');
    setSelectedStudentIds([]);
    setContactEmail('');
    setContactPhone('');
    setAccountNotes('');
    setAccountStudentSearch('');
    setEditAccountId(null);
  };

  useEffect(() => {
    const f = searchParams.get('filter')?.trim();
    if (f === 'due-soon' || f === 'overdue' || f === 'open') {
      setInvoiceFilter(f);
    }
  }, [searchParams]);

  useOfficeUrlSync({
    filter: invoiceFilter === 'all' ? undefined : invoiceFilter,
  });

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
    setAccountNotes(account.notes ?? '');
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
            balanceCents: (account.balanceCents || 0) + cents,
            status: billingStatusForAccount(account.id, nextInvoices, account.status),
            updatedAt: Date.now(),
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
      const message = `Hi ${account.familyName}, this is a reminder that invoice "${inv.label}" ($${((inv.amountCents || 0) / 100).toFixed(2)}) for your student(s) is currently unpaid. Due date: ${inv.dueDate}. Please login or contact the office to clear the balance. Thank you!`;
      
      const collName = channel === 'sms' ? 'sms' : 'whatsapp';
      const ref = doc(collection(firestore, collName));
      await setDoc(ref, {
        to: phone,
        body: message,
        schoolId,
        createdAt: Date.now(),
        status: 'pending',
      });

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
    setBusy(true);
    try {
      const payload = {
        familyName: familyName.trim(),
        studentIds: selectedStudentIds,
        contactEmail: contactEmail.trim() || null,
        contactPhone: contactPhone.trim() || null,
        notes: accountNotes.trim() || null,
        updatedAt: Date.now(),
      };
      if (editAccountId) {
        const existing = accounts.find((a) => a.id === editAccountId);
        await updateDoc(doc(firestore, 'schools', schoolId, 'officeBillingAccounts', editAccountId), {
          ...payload,
          balanceCents: existing?.balanceCents ?? 0,
          status: existing?.status ?? 'active',
        });
        toast({ title: 'Account updated' });
      } else {
        await setDoc(doc(collection(firestore, 'schools', schoolId, 'officeBillingAccounts')), {
          ...payload,
          balanceCents: 0,
          status: 'active',
        });
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
          let balanceCents = account.balanceCents || 0;
          if (existing.status === 'sent') {
            balanceCents = Math.max(0, balanceCents + (cents - (existing.amountCents || 0)));
          } else if (status === 'sent' && existing.status === 'draft') {
            balanceCents += cents;
          }
          await updateDoc(doc(firestore, 'schools', schoolId, 'officeBillingAccounts', existing.accountId), {
            balanceCents,
            status: billingStatusForAccount(existing.accountId, nextInvoices, account.status),
            updatedAt: Date.now(),
          });
        }
        toast({ title: 'Invoice updated' });
      } else {
        const ref = doc(collection(firestore, 'schools', schoolId, 'officeInvoices'));
        const status = saveAsDraft ? 'draft' : 'sent';
        await setDoc(ref, {
          accountId: invoiceAccountId,
          label: invoiceLabel.trim(),
          amountCents: cents,
          dueDate: due,
          status,
          createdAt: Date.now(),
        });
        const account = accounts.find((a) => a.id === invoiceAccountId);
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
            balanceCents: (account.balanceCents || 0) + cents,
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
    if (!firestore || !confirm('Void this invoice? Balance will be adjusted.')) return;
    try {
      await updateDoc(doc(firestore, 'schools', schoolId, 'officeInvoices', inv.id), {
        status: 'void',
      });
      const account = accounts.find((a) => a.id === inv.accountId);
      if (account && (inv.status === 'sent' || inv.status === 'draft')) {
        const nextInvoices = invoices.map((i) =>
          i.id === inv.id ? { ...i, status: 'void' as const } : i,
        );
        await updateDoc(doc(firestore, 'schools', schoolId, 'officeBillingAccounts', inv.accountId), {
          balanceCents: Math.max(0, (account.balanceCents || 0) - (inv.amountCents || 0)),
          status: billingStatusForAccount(inv.accountId, nextInvoices, account.status),
          updatedAt: Date.now(),
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
          balanceCents: (account.balanceCents || 0) + (inv.amountCents || 0),
          status: billingStatusForAccount(inv.accountId, nextInvoices, account.status),
          updatedAt: Date.now(),
        });
      }
      toast({ title: 'Invoice sent', description: 'Balance updated.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not send invoice', description: (e as Error).message });
    }
  };

  const openRecordPayment = (inv: OfficeInvoice) => {
    setPayTarget(inv);
    setPaymentMethod('check');
    setPaymentNote('');
    const remaining = Math.max(0, (inv.amountCents || 0) - (inv.paidAmountCents || 0));
    setPaymentAmount((remaining / 100).toFixed(2));
    setPayOpen(true);
  };

  const markPaid = async (inv: OfficeInvoice, method: OfficePaymentMethod, note: string, amountDollars: string) => {
    if (!write.ctx) return;
    const amountCents = parseUsdToCents(amountDollars);
    if (amountCents == null || amountCents <= 0) {
      toast({ variant: 'destructive', title: 'Enter a valid payment amount.' });
      return;
    }
    const account = accounts.find((a) => a.id === inv.accountId);
    if (!account) {
      toast({ variant: 'destructive', title: 'Billing account not found.' });
      return;
    }
    try {
      await write.recordOfficePayment(write.ctx, {
        account,
        invoice: inv,
        amountCents,
        method,
        note,
      });
      toast({ title: amountCents >= (inv.amountCents || 0) - (inv.paidAmountCents || 0) ? 'Payment recorded' : 'Partial payment recorded' });
      setPayOpen(false);
      setPayTarget(null);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Update failed', description: (e as Error).message });
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
        inv.dueDate,
        inv.status,
        isInvoiceOverdue(inv) ? 'yes' : 'no',
      ]);
    }
    downloadCsv(`billing-${schoolId}.csv`, ['Account', 'Description', 'Amount', 'Due', 'Status', 'Overdue'], rows);
    toast({
      title: 'Exported',
      description:
        visibleIds.size < accounts.length
          ? `${rows.length} invoice rows (current filter).`
          : `${rows.length} invoice rows.`,
    });
  };

  const handleDeleteAccount = async (id: string) => {
    if (!firestore || !confirm('Delete this billing account?')) return;
    try {
      await deleteDoc(doc(firestore, 'schools', schoolId, 'officeBillingAccounts', id));
      toast({ title: 'Account removed' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Delete failed', description: (e as Error).message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground max-w-xl">
          Family accounts and invoices live in the office pillar only. Record check, cash, or transfer payments here;
          online card payments (Stripe) can be added later.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-xl gap-2" onClick={exportBillingCsv} disabled={invoices.length === 0}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" className="rounded-xl gap-2" onClick={openNewAccount}>
            <Plus className="h-4 w-4" />
            New account
          </Button>
          <Button variant="outline" className="rounded-xl gap-2 border-teal-200/80 bg-teal-50/30 text-teal-800 hover:bg-teal-100 hover:text-teal-900 dark:border-teal-900/50 dark:bg-teal-950/20 dark:text-teal-300 dark:hover:bg-teal-900/40" onClick={() => setBulkOpen(true)} disabled={accounts.length === 0}>
            <Wand2 className="h-4 w-4" />
            Bulk invoice
          </Button>
          <Button className="rounded-xl gap-2" onClick={() => openNewInvoice()} disabled={accounts.length === 0}>
            <Plus className="h-4 w-4" />
            New invoice
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <OfficeSearchInput value={search} onChange={setSearch} placeholder="Search family or student…" />
        <div className="flex flex-wrap gap-2">
          {(['all', 'open', 'due-soon', 'overdue'] as const).map((key) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={invoiceFilter === key ? 'default' : 'outline'}
              className="rounded-lg h-9 capitalize"
              onClick={() => setInvoiceFilter(key)}
            >
              {key === 'all' ? 'All accounts' : key === 'due-soon' ? 'Due soon' : key}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <p className="text-xs font-bold uppercase text-muted-foreground">Open invoices</p>
          <p className="text-xl font-bold text-teal-800 dark:text-teal-300">{formatCents(openBalanceCents)}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <p className="text-xs font-bold uppercase text-muted-foreground">Billing accounts</p>
          <p className="text-xl font-bold">{accounts.length}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <p className="text-xs font-bold uppercase text-muted-foreground">Overdue</p>
          <p className="text-xl font-bold text-amber-800 dark:text-amber-300">{overdueCount}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <p className="text-xs font-bold uppercase text-muted-foreground">Paid invoices</p>
          <p className="text-xl font-bold text-emerald-800 dark:text-emerald-300">{paidCount}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {filteredAccounts.length === accounts.length
          ? `${accounts.length} billing ${accounts.length === 1 ? 'account' : 'accounts'}`
          : `${filteredAccounts.length} of ${accounts.length} accounts`}
      </p>

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
            return (
              <article
                key={account.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold">{account.familyName}</h3>
                    <p className="text-sm text-muted-foreground">{linked || 'No students linked'}</p>
                    <p
                      className={cn(
                        'mt-1 text-sm font-semibold',
                        account.status === 'past_due' ? 'text-amber-700' : 'text-teal-800 dark:text-teal-300',
                      )}
                    >
                      Balance: {formatCents(account.balanceCents || 0)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <OfficeFamilyStatementButton
                      account={account}
                      invoices={invoices}
                      studentLabels={(account.studentIds ?? [])
                        .map((id) => studentLabelById.get(id))
                        .filter((x): x is string => Boolean(x))}
                      statementSchoolName={officeSettings?.statementSchoolName}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg text-xs"
                      onClick={() => openNewInvoice(account.id)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Invoice
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditAccount(account)}
                      aria-label="Edit account"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => void handleDeleteAccount(account.id)}
                      aria-label="Delete account"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {acctInvoices.length > 0 ? (
                  <ul className="mt-4 space-y-2 border-t pt-3">
                    {acctInvoices.map((inv) => (
                      <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span>
                          {inv.label} · due {inv.dueDate} · {formatCents(inv.amountCents)}
                        </span>
                        <span className="flex items-center gap-2">
                          {isInvoiceOverdue(inv) ? (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold uppercase text-red-800">
                              Overdue
                            </span>
                          ) : null}
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-semibold uppercase',
                              inv.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : inv.status === 'sent'
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-slate-100 text-slate-600',
                            )}
                          >
                            {inv.status}
                          </span>
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
                          {inv.status !== 'paid' && inv.status !== 'void' ? (
                            <>
                              {isInvoiceOverdue(inv) && account.contactEmail?.trim() ? (
                                <Button asChild type="button" size="sm" variant="outline" className="h-7 rounded-lg gap-1">
                                  <a
                                    href={buildInvoiceReminderMailto({
                                      email: account.contactEmail.trim(),
                                      familyName: account.familyName,
                                      invoiceLabel: inv.label,
                                      amountCents: inv.amountCents,
                                      dueDate: inv.dueDate,
                                    })}
                                  >
                                    <Mail className="h-3 w-3" />
                                    Remind
                                  </a>
                                </Button>
                              ) : null}
                              {inv.status === 'sent' ? (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 rounded-lg gap-1 border-emerald-200 bg-emerald-50/20 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
                                    onClick={() => void handleSendTextAlert(inv, account, 'sms')}
                                    title="Send SMS billing reminder to parents"
                                  >
                                    <Phone className="h-3 w-3" />
                                    SMS
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 rounded-lg gap-1 border-teal-200 bg-teal-50/20 text-teal-800 hover:bg-teal-100 hover:text-teal-950 dark:border-teal-900/50 dark:bg-teal-950/20 dark:text-teal-300 dark:hover:bg-teal-900/40"
                                    onClick={() => void handleSendTextAlert(inv, account, 'whatsapp')}
                                    title="Send WhatsApp billing reminder to parents"
                                  >
                                    <MessageSquare className="h-3 w-3" />
                                    WhatsApp
                                  </Button>
                                </>
                              ) : null}
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 rounded-lg"
                                onClick={() =>
                                  openNewInvoice(account.id, {
                                    ...inv,
                                    label: inv.label,
                                    dueDate: defaultDueDateIso(30),
                                  })
                                }
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              {inv.status === 'draft' || inv.status === 'sent' ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 rounded-lg"
                                  onClick={() => openEditInvoice(inv)}
                                  aria-label="Edit invoice"
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 rounded-lg"
                                onClick={() => openRecordPayment(inv)}
                              >
                                Record payment
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 rounded-lg text-destructive"
                                onClick={() => void voidInvoice(inv)}
                              >
                                Void
                              </Button>
                            </>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">No invoices for this account.</p>
                )}
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
              <Label>Notes (optional)</Label>
              <Input value={accountNotes} onChange={(e) => setAccountNotes(e.target.value)} className="rounded-xl" />
            </div>
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
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.includes(s.id)}
                      onChange={() => toggleStudent(s.id)}
                      className="h-4 w-4 accent-teal-700"
                    />
                    {studentLabelById.get(s.id)}
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

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
          </DialogHeader>
          {payTarget ? (
            <p className="text-sm text-muted-foreground">
              {payTarget.label} · {formatCents(payTarget.amountCents)} total
              {(payTarget.paidAmountCents ?? 0) > 0
                ? ` · ${formatCents((payTarget.paidAmountCents ?? 0))} paid`
                : ''}
            </p>
          ) : null}
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Payment amount (USD)</Label>
              <Input
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
                className="rounded-xl"
              />
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
            <Button
              disabled={busy || !payTarget}
              onClick={() => payTarget && void markPaid(payTarget, paymentMethod, paymentNote, paymentAmount)}
            >
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
                  {!isLoading && invoiceAccountId && accounts.length > 0 && !accounts.some((a) => a.id === invoiceAccountId) ? (
                    <SelectItem value={invoiceAccountId}>Unknown account (deleted)</SelectItem>
                  ) : null}
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
