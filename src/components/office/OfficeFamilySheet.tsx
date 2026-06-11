'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ContentSectionTreeNav } from '@/components/ui/content-section-tree-nav';
import { useToast } from '@/hooks/use-toast';
import { useOfficeWrite } from '@/lib/office/useOfficeWrite';
import { useOfficePortalChrome } from '@/components/office/OfficePortalChrome';
import type {
  OfficeBillingAccount,
  OfficeFamily,
  OfficeFamilyContact,
  OfficeFamilyContactRole,
  OfficeStudent,
} from '@/lib/office/types';
import { safeString } from '@/lib/safeDisplayValue';
import { officePublicHref } from '@/lib/officePublicUrl';
import Link from 'next/link';

const ROLE_OPTIONS: { value: OfficeFamilyContactRole; label: string }[] = [
  { value: 'parent', label: 'Parent' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'other', label: 'Other' },
];

function newContact(): OfficeFamilyContact {
  return {
    id: crypto.randomUUID(),
    name: '',
    role: 'parent',
    relationship: null,
    phone: null,
    email: null,
    isPrimary: false,
    notes: null,
  };
}

type OfficeFamilySheetProps = {
  schoolId: string;
  family: OfficeFamily | null;
  students: OfficeStudent[];
  billingAccount?: OfficeBillingAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function OfficeFamilySheet({
  schoolId,
  family,
  students,
  billingAccount,
  open,
  onOpenChange,
}: OfficeFamilySheetProps) {
  const { toast } = useToast();
  const write = useOfficeWrite(schoolId);
  const { features } = useOfficePortalChrome();
  const [section, setSection] = useState('overview');
  const [busy, setBusy] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [contacts, setContacts] = useState<OfficeFamilyContact[]>([]);
  const [medicalNotes, setMedicalNotes] = useState('');
  const [legalNotes, setLegalNotes] = useState('');
  const [busRoute, setBusRoute] = useState('');
  const [busNotes, setBusNotes] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setDisplayName(family ? safeString(family.displayName) : '');
    setContacts(family?.contacts?.length ? family.contacts : [newContact()]);
    setMedicalNotes(family ? safeString(family.medicalNotes) : '');
    setLegalNotes(family ? safeString(family.legalNotes) : '');
    setBusRoute(family ? safeString(family.busRoute) : '');
    setBusNotes(family ? safeString(family.busNotes) : '');
    setGeneralNotes(family ? safeString(family.generalNotes) : '');
    setSection('overview');
  }, [family, open]);

  const linkedStudents = useMemo(
    () => (family ? students.filter((s) => s.familyId === family.id) : []),
    [family, students],
  );

  const navItems = useMemo(() => {
    const items = [{ id: 'overview', label: 'Overview' }, { id: 'contacts', label: 'Contacts' }];
    if (features.medicalNotes) items.push({ id: 'medical', label: 'Medical' });
    items.push({ id: 'legal', label: 'Legal / custody' });
    if (features.busInfo) items.push({ id: 'bus', label: 'Bus' });
    items.push({ id: 'notes', label: 'Notes' });
    if (billingAccount) items.push({ id: 'billing', label: 'Billing' });
    return items;
  }, [features, billingAccount]);

  const handleSave = async () => {
    if (!write.ctx || !displayName.trim()) {
      toast({ variant: 'destructive', title: 'Family name is required.' });
      return;
    }
    setBusy(true);
    try {
      const cleanedContacts = contacts
        .map((c) => ({
          ...c,
          name: c.name.trim(),
          relationship: safeString(c.relationship) || null,
          phone: safeString(c.phone) || null,
          email: safeString(c.email) || null,
          notes: safeString(c.notes) || null,
        }))
        .filter((c) => c.name);

      await write.upsertOfficeFamily(write.ctx, family?.id ?? null, {
        displayName: displayName.trim(),
        contacts: cleanedContacts,
        medicalNotes: medicalNotes.trim() || null,
        legalNotes: legalNotes.trim() || null,
        busRoute: busRoute.trim() || null,
        busNotes: busNotes.trim() || null,
        generalNotes: generalNotes.trim() || null,
      });
      toast({ title: family ? 'Family profile saved' : 'Family created' });
      onOpenChange(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Save failed', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  if (!features.familyProfiles) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{family ? displayName || 'Family profile' : 'New family profile'}</SheetTitle>
          <SheetDescription>
            Household contacts, medical, bus, and notes — separate from billing balances.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <ContentSectionTreeNav
            items={navItems}
            value={section}
            onValueChange={setSection}
            branchLabel="Sections"
            fullWidth
          />

          {section === 'overview' ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Family / household name</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="rounded-xl" />
              </div>
              {linkedStudents.length > 0 ? (
                <div className="rounded-xl border p-3 text-sm">
                  <p className="text-xs font-bold uppercase text-muted-foreground">Linked students</p>
                  <ul className="mt-2 space-y-1">
                    {linkedStudents.map((s) => (
                      <li key={s.id}>
                        {safeString(s.firstName)} {safeString(s.lastName)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Link students from their profile after saving.</p>
              )}
            </div>
          ) : null}

          {section === 'contacts' ? (
            <div className="space-y-3">
              {contacts.map((c, idx) => (
                <div key={c.id} className="rounded-xl border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Contact {idx + 1}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label="Remove contact"
                      onClick={() => setContacts((prev) => prev.filter((x) => x.id !== c.id))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Name"
                    value={c.name}
                    onChange={(e) =>
                      setContacts((prev) =>
                        prev.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)),
                      )
                    }
                    className="rounded-xl"
                  />
                  <Select
                    value={c.role}
                    onValueChange={(v) =>
                      setContacts((prev) =>
                        prev.map((x) => (x.id === c.id ? { ...x, role: v as OfficeFamilyContactRole } : x)),
                      )
                    }
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Phone"
                    value={c.phone ?? ''}
                    onChange={(e) =>
                      setContacts((prev) =>
                        prev.map((x) => (x.id === c.id ? { ...x, phone: e.target.value } : x)),
                      )
                    }
                    className="rounded-xl"
                  />
                  <Input
                    placeholder="Email"
                    value={c.email ?? ''}
                    onChange={(e) =>
                      setContacts((prev) =>
                        prev.map((x) => (x.id === c.id ? { ...x, email: e.target.value } : x)),
                      )
                    }
                    className="rounded-xl"
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="rounded-xl gap-1"
                onClick={() => setContacts((p) => [...p, newContact()])}
              >
                <Plus className="h-4 w-4" /> Add contact
              </Button>
            </div>
          ) : null}

          {section === 'medical' && features.medicalNotes ? (
            <div className="space-y-2">
              <Label>Medical notes (confidential)</Label>
              <Textarea
                value={medicalNotes}
                onChange={(e) => setMedicalNotes(e.target.value)}
                className="min-h-[120px] rounded-xl"
                placeholder="Allergies, medications, conditions…"
              />
            </div>
          ) : null}

          {section === 'legal' ? (
            <div className="space-y-2">
              <Label>Legal / custody / divorce notes (confidential)</Label>
              <Textarea
                value={legalNotes}
                onChange={(e) => setLegalNotes(e.target.value)}
                className="min-h-[120px] rounded-xl"
                placeholder="Custody arrangements, pickup restrictions…"
              />
            </div>
          ) : null}

          {section === 'bus' && features.busInfo ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Bus route</Label>
                <Input value={busRoute} onChange={(e) => setBusRoute(e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label>Bus notes</Label>
                <Textarea value={busNotes} onChange={(e) => setBusNotes(e.target.value)} className="rounded-xl" />
              </div>
            </div>
          ) : null}

          {section === 'notes' ? (
            <div className="space-y-2">
              <Label>General family notes</Label>
              <Textarea
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                className="min-h-[120px] rounded-xl"
              />
            </div>
          ) : null}

          {section === 'billing' && billingAccount ? (
            <div className="rounded-xl border p-3 text-sm space-y-2">
              <p className="font-semibold">{billingAccount.familyName}</p>
              <p className="text-muted-foreground">
                Balance: ${((billingAccount.balanceCents || 0) / 100).toFixed(2)}
              </p>
              <Button asChild variant="outline" size="sm" className="rounded-lg">
                <Link
                  href={`${officePublicHref(schoolId, 'billing')}?account=${encodeURIComponent(billingAccount.id)}`}
                >
                  Open billing
                </Link>
              </Button>
            </div>
          ) : null}

          <div className="flex gap-2 pt-2 border-t">
            <Button type="button" className="flex-1 rounded-xl" disabled={busy} onClick={() => void handleSave()}>
              {busy ? 'Saving…' : 'Save family'}
            </Button>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
