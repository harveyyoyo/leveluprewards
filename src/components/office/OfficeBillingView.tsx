'use client';

import { useMemo, useState } from 'react';
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
import { Download, Pencil, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCents } from '@/lib/office/officeNav';
import { billingStatusForAccount, downloadCsv, isInvoiceOverdue } from '@/lib/office/officeUtils';
import { OfficeSearchInput } from '@/components/office/OfficeSearchInput';
import type { OfficeBillingAccount, OfficeInvoice } from '@/lib/office/types';
import type { Student } from '@/lib/types';
import { cn } from '@/lib/utils';

type OfficeBillingViewProps = {
  schoolId: string;
  students: Student[];
  studentLabelById: Map<string, string>;
  accounts: OfficeBillingAccount[];
  invoices: OfficeInvoice[];
  isLoading: boolean;
};

export function OfficeBillingView({
  schoolId,
  students,
  studentLabelById,
  accounts,
  invoices,
  isLoading,
}: OfficeBillingViewProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
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
  const [editAccountId, setEditAccountId] = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [accountNotes, setAccountNotes] = useState('');

  const invoicesByAccount = useMemo(() => {
    const map = new Map<string, OfficeInvoice[]>();
    for (const inv of invoices) {
      const list = map.get(inv.accountId) ?? [];
      list.push(inv);
      map.set(inv.accountId, list);
    }
    return map;
  }, [invoices]);

  const openBalanceCents = useMemo(
    () =>
      invoices
        .filter((i) => i.status === 'sent' || i.status === 'draft')
        .reduce((sum, i) => sum + (i.amountCents || 0), 0),
    [invoices],
  );

  const overdueCount = useMemo(() => invoices.filter((i) => isInvoiceOverdue(i)).length, [invoices]);

  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((a) => {
      const linked = a.studentIds.map((id) => studentLabelById.get(id) ?? '').join(' ');
      return a.familyName.toLowerCase().includes(q) || linked.toLowerCase().includes(q);
    });
  }, [accounts, search, studentLabelById]);

  const resetAccountForm = () => {
    setFamilyName('');
    setSelectedStudentIds([]);
    setContactEmail('');
    setContactPhone('');
    setAccountNotes('');
    setEditAccountId(null);
  };

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
    const cents = Math.round(parseFloat(invoiceAmount) * 100);
    if (!Number.isFinite(cents) || cents < 0) {
      toast({ variant: 'destructive', title: 'Enter a valid dollar amount.' });
      return;
    }
    setBusy(true);
    try {
      const ref = doc(collection(firestore, 'schools', schoolId, 'officeInvoices'));
      await setDoc(ref, {
        accountId: invoiceAccountId,
        label: invoiceLabel.trim(),
        amountCents: cents,
        dueDate: invoiceDue || new Date().toISOString().slice(0, 10),
        status: 'sent',
        createdAt: Date.now(),
      });
      const account = accounts.find((a) => a.id === invoiceAccountId);
      if (account) {
        const due = invoiceDue || new Date().toISOString().slice(0, 10);
        const nextInvoices: OfficeInvoice[] = [
          ...invoices,
          {
            id: ref.id,
            accountId: invoiceAccountId,
            label: invoiceLabel.trim(),
            amountCents: cents,
            dueDate: due,
            status: 'sent',
            createdAt: Date.now(),
          },
        ];
        await updateDoc(doc(firestore, 'schools', schoolId, 'officeBillingAccounts', invoiceAccountId), {
          balanceCents: (account.balanceCents || 0) + cents,
          status: billingStatusForAccount(invoiceAccountId, nextInvoices, account.status),
          updatedAt: Date.now(),
        });
      }
      toast({ title: 'Invoice created' });
      setInvoiceOpen(false);
      setInvoiceLabel('');
      setInvoiceAmount('');
      setInvoiceDue('');
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not create invoice', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const markPaid = async (inv: OfficeInvoice) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, 'schools', schoolId, 'officeInvoices', inv.id), {
        status: 'paid',
        paidAt: Date.now(),
      });
      const account = accounts.find((a) => a.id === inv.accountId);
      if (account) {
        const nextInvoices = invoices.map((i) =>
          i.id === inv.id ? { ...i, status: 'paid' as const, paidAt: Date.now() } : i,
        );
        await updateDoc(doc(firestore, 'schools', schoolId, 'officeBillingAccounts', inv.accountId), {
          balanceCents: Math.max(0, (account.balanceCents || 0) - inv.amountCents),
          status: billingStatusForAccount(inv.accountId, nextInvoices, account.status),
          updatedAt: Date.now(),
        });
      }
      toast({ title: 'Marked as paid' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Update failed', description: (e as Error).message });
    }
  };

  const exportBillingCsv = () => {
    const rows: string[][] = [];
    for (const inv of invoices) {
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
    toast({ title: 'Exported', description: `${rows.length} invoice rows.` });
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
          Family accounts and invoices live in the office pillar only. Tuition and fees are tracked here.
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
          <Button className="rounded-xl gap-2" onClick={() => setInvoiceOpen(true)} disabled={accounts.length === 0}>
            <Plus className="h-4 w-4" />
            New invoice
          </Button>
        </div>
      </div>

      <OfficeSearchInput value={search} onChange={setSearch} placeholder="Search family or student…" />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <p className="text-xs font-bold uppercase text-muted-foreground">Open invoices</p>
          <p className="text-2xl font-bold text-teal-800 dark:text-teal-300">{formatCents(openBalanceCents)}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <p className="text-xs font-bold uppercase text-muted-foreground">Billing accounts</p>
          <p className="text-2xl font-bold">{accounts.length}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <p className="text-xs font-bold uppercase text-muted-foreground">Overdue</p>
          <p className="text-2xl font-bold text-amber-800 dark:text-amber-300">{overdueCount}</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading billing…</p>
      ) : accounts.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No billing accounts yet. Create a family account to get started.
        </p>
      ) : filteredAccounts.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No accounts match your search.
        </p>
      ) : (
        <div className="space-y-4">
          {filteredAccounts.map((account) => {
            const linked = account.studentIds
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
                  <div className="flex gap-1">
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
                          {inv.status !== 'paid' && inv.status !== 'void' ? (
                            <Button type="button" size="sm" variant="outline" className="h-7 rounded-lg" onClick={() => void markPaid(inv)}>
                              Mark paid
                            </Button>
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
              <div className="max-h-40 overflow-y-auto rounded-xl border p-2 space-y-1">
                {students.map((s) => (
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

      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>New invoice</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Account</Label>
              <Select value={invoiceAccountId} onValueChange={setInvoiceAccountId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Choose account" />
                </SelectTrigger>
                <SelectContent>
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
            </div>
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
              Create invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
