'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection } from 'firebase/firestore';
import { Building2, Copy, Pencil, Plus, Trash2, UserPlus, X } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { addStaffAccount, deleteStaffAccount, updateStaffAccount } from '@/lib/db/staffAccounts';
import { hasVerifiedOfficeFirestoreAccess } from '@/lib/office/officeAccess';
import { saveOfficeSettings } from '@/lib/office/officeSettingsDoc';
import { useOfficeSettings } from '@/lib/office/useOfficeSettings';
import { compareOfficeTermLabels, getSuggestedTermLabel } from '@/lib/office/officeUtils';
import { defaultOfficeFeatureFlags } from '@/lib/office/officeTerminology';
import type { OfficeFeatureFlags } from '@/lib/office/types';
import { Switch } from '@/components/ui/switch';
import { useOfficePortalData } from '@/components/office/OfficePortalGate';
import { OfficeWorkingTermSelect } from '@/components/office/OfficeWorkingTermSelect';
import { OfficeAiImportSection } from '@/components/office/OfficeAiImportSection';
import { useOfficeSharedData } from '@/lib/office/useOfficeSharedData';
import { officeAbsoluteHref } from '@/lib/officePublicUrl';
import { syncSchoolStaffDirectory } from '@/lib/syncSchoolStaffDirectory';
import type { StaffAccount } from '@/lib/types';
import { OfficeLoadingRows } from '@/components/office/OfficeLoadingRows';

function isOfficeStaffAccount(account: StaffAccount): boolean {
  const roles = account.roles?.length ? account.roles : [account.role];
  return roles.includes('office');
}

type OfficeSettingsViewProps = {
  schoolId: string;
  schoolName?: string;
};

export function OfficeSettingsView({ schoolId, schoolName }: OfficeSettingsViewProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { loginState, isAdmin, isOffice, userName } = useAppContext();
  const { settings, isLoading: settingsLoading } = useOfficeSettings(schoolId);
  const { gradeEntries, billingAccounts } = useOfficePortalData();
  const suggestedTerm = getSuggestedTermLabel();

  const roleVerified = hasVerifiedOfficeFirestoreAccess({ loginState, isAdmin, isOffice, schoolId });
  const shared = useOfficeSharedData(schoolId, roleVerified);
  const canManageStaff = roleVerified && (isAdmin || isOffice);

  const staffQuery = useMemoFirebase(
    () =>
      roleVerified && firestore
        ? collection(firestore, 'schools', schoolId, 'staffAccounts')
        : null,
    [firestore, schoolId, roleVerified],
  );
  const { data: staffRaw, isLoading: staffLoading } = useCollection<StaffAccount>(staffQuery);

  const officeStaff = useMemo(
    () => (staffRaw ?? []).filter(isOfficeStaffAccount).sort((a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? '')),
    [staffRaw],
  );

  const [defaultTerm, setDefaultTerm] = useState('');
  const [statementName, setStatementName] = useState('');
  const [schoolTerms, setSchoolTerms] = useState<string[]>([]);
  const [newTermName, setNewTermName] = useState('');
  const [prefsBusy, setPrefsBusy] = useState(false);
  const [useMarksTerminology, setUseMarksTerminology] = useState(false);
  const [features, setFeatures] = useState<Required<OfficeFeatureFlags>>(defaultOfficeFeatureFlags());

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StaffAccount | null>(null);
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [staffBusy, setStaffBusy] = useState(false);
  const [copiedId, setCopiedId] = useState('');

  useEffect(() => {
    setDefaultTerm(settings?.defaultActiveTerm?.trim() || '');
    setStatementName(settings?.statementSchoolName?.trim() || schoolName?.trim() || '');
    setSchoolTerms(
      (settings?.configuredTerms ?? []).map((t) => t.trim()).filter(Boolean).sort(compareOfficeTermLabels),
    );
    setUseMarksTerminology(settings?.useMarksTerminology === true);
    setFeatures({ ...defaultOfficeFeatureFlags(), ...(settings?.features ?? {}) });
  }, [settings, schoolName]);

  const addSchoolTerm = () => {
    const next = newTermName.trim();
    if (!next) return;
    if (schoolTerms.some((t) => t.toLowerCase() === next.toLowerCase())) {
      toast({ variant: 'destructive', title: 'That term is already listed.' });
      return;
    }
    setSchoolTerms((prev) => [...prev, next].sort(compareOfficeTermLabels));
    setNewTermName('');
  };

  const removeSchoolTerm = (term: string) => {
    setSchoolTerms((prev) => prev.filter((t) => t !== term));
  };

  const signInUrl =
    typeof window !== 'undefined' ? officeAbsoluteHref(schoolId) : `/${schoolId}/office`;

  const copySignInLink = async (accountId: string) => {
    await navigator.clipboard.writeText(signInUrl);
    setCopiedId(accountId);
    toast({ title: 'Sign-in link copied', description: 'Share with office staff for this school.' });
    window.setTimeout(() => setCopiedId((c) => (c === accountId ? '' : c)), 1500);
  };

  const handleSavePrefs = async () => {
    if (!firestore) return;
    setPrefsBusy(true);
    try {
      await saveOfficeSettings(
        firestore,
        schoolId,
        {
          defaultActiveTerm: defaultTerm.trim() || null,
          statementSchoolName: statementName.trim() || null,
          configuredTerms: schoolTerms.length ? schoolTerms : null,
          useMarksTerminology,
          features,
        },
        userName,
      );
      toast({ title: 'Office settings saved' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not save settings', description: (e as Error).message });
    } finally {
      setPrefsBusy(false);
    }
  };

  const openNewStaff = () => {
    setEditing(null);
    setUsername('');
    setPasscode('');
    setDisplayName('');
    setDialogOpen(true);
  };

  const openEditStaff = (account: StaffAccount) => {
    setEditing(account);
    setUsername(account.username);
    setPasscode(account.passcode);
    setDisplayName(account.displayName);
    setDialogOpen(true);
  };

  const handleSaveStaff = async () => {
    if (!firestore || !canManageStaff) return;
    const cleanUsername = username.trim().toLowerCase();
    const cleanPasscode = passcode.trim();
    const cleanDisplayName = displayName.trim();
    if (!cleanUsername || !cleanPasscode || !cleanDisplayName) {
      toast({ variant: 'destructive', title: 'Name, username, and passcode are required.' });
      return;
    }
    const taken = (staffRaw ?? []).some(
      (a) => a.id !== editing?.id && (a.username ?? '').trim().toLowerCase() === cleanUsername,
    );
    if (taken) {
      toast({ variant: 'destructive', title: 'That username is already in use.' });
      return;
    }

    setStaffBusy(true);
    try {
      if (editing) {
        const updated: StaffAccount = {
          ...editing,
          username: cleanUsername,
          passcode: cleanPasscode,
          displayName: cleanDisplayName,
          role: 'office',
          roles: ['office'],
        };
        await updateStaffAccount(firestore, schoolId, updated);
        const merged = (staffRaw ?? []).map((row) => (row.id === updated.id ? updated : row));
        void syncSchoolStaffDirectory(firestore, schoolId, [], merged).catch(() => undefined);
        toast({ title: 'Office staff updated' });
      } else {
        const created = await addStaffAccount(firestore, schoolId, {
          username: cleanUsername,
          passcode: cleanPasscode,
          displayName: cleanDisplayName,
          role: 'office',
          roles: ['office'],
        });
        void syncSchoolStaffDirectory(firestore, schoolId, [], [...(staffRaw ?? []), created]).catch(
          () => undefined,
        );
        toast({ title: 'Office staff account created' });
      }
      setDialogOpen(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not save account', description: (e as Error).message });
    } finally {
      setStaffBusy(false);
    }
  };

  const handleDeleteStaff = async (account: StaffAccount) => {
    if (!firestore || !canManageStaff) return;
    if (!confirm(`Remove ${account.displayName}? They will no longer be able to sign in to School Office.`)) return;
    try {
      await deleteStaffAccount(firestore, schoolId, account.id);
      const merged = (staffRaw ?? []).filter((a) => a.id !== account.id);
      void syncSchoolStaffDirectory(firestore, schoolId, [], merged).catch(() => undefined);
      toast({ title: 'Account removed' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Delete failed', description: (e as Error).message });
    }
  };

  if (settingsLoading || staffLoading) {
    return <OfficeLoadingRows cols={2} rows={4} />;
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground max-w-2xl">
        School-wide defaults for grades and billing, plus desk accounts for front-office staff to sign in here.
      </p>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Building2 className="h-4 w-4 text-teal-700" />
          Office preferences
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          The default term is suggested for new staff. Statement name appears on printed family billing statements.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 max-w-2xl">
          <div className="space-y-2">
            <OfficeWorkingTermSelect
              label="Default term"
              layout="stacked"
              value={defaultTerm || suggestedTerm}
              onValueChange={setDefaultTerm}
              gradeEntries={gradeEntries}
              schoolDefaultTerm={settings?.defaultActiveTerm}
              id="office-settings-default-term"
              triggerClassName="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>Name on billing statements</Label>
            <Input
              value={statementName}
              onChange={(e) => setStatementName(e.target.value)}
              placeholder={schoolName ?? 'Your school'}
              className="rounded-xl"
            />
          </div>
        </div>

        <div className="mt-4 space-y-2 max-w-2xl">
          <Label>School terms</Label>
          <p className="text-xs text-muted-foreground">
            Add term names here (e.g. Fall 2026, Summer 2026). They appear in working-term dropdowns on Home and
            Grades. A term also appears automatically once you save a grade for that term.
          </p>
          <div className="flex flex-wrap gap-2">
            {schoolTerms.map((term) => (
              <span
                key={term}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium dark:border-slate-700 dark:bg-slate-800"
              >
                {term}
                <button
                  type="button"
                  className="rounded-full p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700"
                  aria-label={`Remove ${term}`}
                  onClick={() => removeSchoolTerm(term)}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              value={newTermName}
              onChange={(e) => setNewTermName(e.target.value)}
              placeholder={suggestedTerm}
              className="max-w-xs rounded-xl"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSchoolTerm();
                }
              }}
            />
            <Button type="button" variant="outline" className="rounded-xl" onClick={addSchoolTerm}>
              Add term
            </Button>
          </div>
        </div>

        <div className="mt-6 space-y-4 max-w-2xl border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="office-use-marks" className="text-sm font-semibold">
                Use &quot;Marks&quot; instead of &quot;Grades&quot;
              </Label>
              <p className="text-xs text-muted-foreground">
                Updates nav labels, reports, and copy across School Office.
              </p>
            </div>
            <Switch
              id="office-use-marks"
              checked={useMarksTerminology}
              onCheckedChange={setUseMarksTerminology}
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold">Feature sections</p>
            {(
              [
                ['familyProfiles', 'Family profiles', 'Household contacts, grandparents, and family notes'],
                ['studentPhotos', 'Student photos', 'Upload student pictures on roster profiles'],
                ['busInfo', 'Bus & transport', 'Bus route fields on families and students'],
                ['medicalNotes', 'Medical notes', 'Confidential medical section on family profiles'],
                ['aiHelp', 'AI help button', 'Floating assistant in the Office header'],
                ['auditLog', 'Change history', 'Append-only audit log for Office record changes'],
              ] as const
            ).map(([key, title, description]) => (
              <div key={key} className="flex items-center justify-between gap-4 rounded-xl border p-3">
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <Switch
                  checked={features[key]}
                  onCheckedChange={(checked) => setFeatures((prev) => ({ ...prev, [key]: checked }))}
                  aria-label={title}
                />
              </div>
            ))}
          </div>
        </div>

        <Button
          type="button"
          className="mt-4 rounded-xl"
          disabled={prefsBusy}
          onClick={() => void handleSavePrefs()}
        >
          {prefsBusy ? 'Saving…' : 'Save preferences'}
        </Button>
      </section>

      {roleVerified ? (
        <OfficeAiImportSection
          schoolId={schoolId}
          classes={shared.classes}
          teachers={shared.teachers}
          students={shared.students}
          gradeEntries={gradeEntries}
          billingAccounts={billingAccounts}
          canImportStaff={canManageStaff}
          userName={userName}
        />
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-teal-700" />
              Office staff accounts
            </h2>
            <p className="mt-1 text-xs text-muted-foreground max-w-xl">
              Each person gets a username and passcode for School Office sign-in. They only access grades and billing.
              {isAdmin ? ' School admins can also manage all desk staff from Admin → Teachers.' : null}
            </p>
          </div>
          {canManageStaff ? (
            <Button type="button" className="rounded-xl gap-2" onClick={openNewStaff}>
              <Plus className="h-4 w-4" />
              Add office staff
            </Button>
          ) : null}
        </div>

        <div className="mt-3 rounded-xl border border-dashed border-teal-200/80 bg-teal-50/40 px-4 py-3 text-sm dark:border-teal-900/50 dark:bg-teal-950/20">
          <p className="font-medium text-teal-900 dark:text-teal-100">Office sign-in page</p>
          <p className="mt-1 break-all text-xs text-muted-foreground">{signInUrl}</p>
          {canManageStaff ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 h-8 rounded-lg gap-1.5"
              onClick={() => void copySignInLink('page')}
            >
              <Copy className="h-3.5 w-3.5" />
              {copiedId === 'page' ? 'Copied' : 'Copy link'}
            </Button>
          ) : null}
        </div>

        {staffLoading ? (
          <OfficeLoadingRows cols={2} rows={2} />
        ) : officeStaff.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No office staff accounts yet. Add one so your team can sign in without using the school admin passcode.
          </p>
        ) : (
          <ul className="mt-4 divide-y rounded-xl border border-slate-100 dark:border-slate-800">
            {officeStaff.map((account) => (
              <li key={account.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">{account.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    Username: <span className="font-mono">{account.username}</span>
                  </p>
                </div>
                {canManageStaff ? (
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg gap-1"
                      onClick={() => void copySignInLink(account.id)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copiedId === account.id ? 'Copied' : 'Link'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditStaff(account)}
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => void handleDeleteStaff(account)}
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit office staff' : 'New office staff account'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Display name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Mrs. Cohen"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="office"
                className="rounded-xl"
                autoCapitalize="off"
              />
            </div>
            <div className="space-y-2">
              <Label>Passcode</Label>
              <Input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-xl" disabled={staffBusy} onClick={() => void handleSaveStaff()}>
              {staffBusy ? 'Saving…' : editing ? 'Save changes' : 'Create account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
