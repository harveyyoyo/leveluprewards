'use client';

import { useEffect, useState } from 'react';
import { Copy, Edit, Gift, Plus, Printer, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Helper } from '@/components/ui/helper';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { StaffAccount, StaffAccountRole, Teacher } from '@/lib/types';

export function AdminTeachersTab({
  teachers,
  staffAccounts,
  schoolId,
  onAddTeacher,
  onEditTeacher,
  onDeleteTeacher,
  onSaveStaffAccount,
  onDeleteStaffAccount,
}: {
  teachers: Teacher[] | null | undefined;
  staffAccounts: StaffAccount[] | null | undefined;
  schoolId: string;
  onAddTeacher: () => void;
  onEditTeacher: (t: Teacher) => void;
  onDeleteTeacher: (teacherId: string) => void;
  onSaveStaffAccount: (account: StaffAccount | Omit<StaffAccount, 'id'>) => Promise<void>;
  onDeleteStaffAccount: (accountId: string) => Promise<void>;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StaffAccount | null>(null);
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<StaffAccountRole>('secretary');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const getStaffPortalUrl = (key: string) => {
    const path = `/${schoolId}/teacher?account=${encodeURIComponent(key)}`;
    return `${origin}${path}`;
  };

  const copyStaffPortalUrl = async (key: string) => {
    const url = getStaffPortalUrl(key);
    await navigator.clipboard.writeText(url);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey((current) => (current === key ? '' : current)), 1500);
  };

  const renderPersonalLink = (key: string) => {
    const link = getStaffPortalUrl(key);
    return (
      <div className="mt-2 flex max-w-full flex-col gap-1 sm:flex-row sm:items-center">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground sm:w-24">
          Personal link
        </Label>
        <div className="flex min-w-0 flex-1 gap-1">
          <Input readOnly value={link} className="h-8 min-w-0 flex-1 truncate font-mono text-xs" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 gap-1"
            onClick={() => void copyStaffPortalUrl(key)}
          >
            <Copy className="h-3.5 w-3.5" />
            {copiedKey === key ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>
    );
  };

  const openNewDeskStaff = () => {
    setEditing(null);
    setUsername('');
    setPasscode('');
    setDisplayName('');
    setRole('secretary');
    setError('');
    setDialogOpen(true);
  };

  const openEditDeskStaff = (account: StaffAccount) => {
    setEditing(account);
    setUsername(account.username);
    setPasscode(account.passcode);
    setDisplayName(account.displayName);
    setRole(account.role);
    setError('');
    setDialogOpen(true);
  };

  const handleSaveDeskStaff = async () => {
    const cleanUsername = username.trim().toLowerCase();
    const cleanPasscode = passcode.trim();
    const cleanDisplayName = displayName.trim();
    if (!cleanUsername || !cleanPasscode || !cleanDisplayName) return;

    const usernameTaken = (staffAccounts || []).some(
      (account) => account.id !== editing?.id && account.username.trim().toLowerCase() === cleanUsername,
    );
    if (usernameTaken) {
      setError('That username is already used by another staff account.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await onSaveStaffAccount(
        editing
          ? { ...editing, username: cleanUsername, passcode: cleanPasscode, displayName: cleanDisplayName, role }
          : { username: cleanUsername, passcode: cleanPasscode, displayName: cleanDisplayName, role },
      );
      setDialogOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-t-4 border-primary shadow-md">
      <CardHeader className="flex flex-row justify-between items-center py-6">
        <div>
          <Helper content="Manage teachers and limited desk accounts for this school.">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-destructive" /> Staff
            </CardTitle>
          </Helper>
          <CardDescription>Teachers can issue rewards. Desk staff get limited coupon-printing or prize-desk access.</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openNewDeskStaff} variant="outline" className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" /> Add desk staff
          </Button>
          <Button onClick={onAddTeacher} className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" /> Add teacher
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        <section className="space-y-3">
          <div>
            <h3 className="font-bold">Teachers</h3>
            <p className="text-sm text-muted-foreground">Full classroom staff who can print coupons and award points.</p>
          </div>
          <ul className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
          {teachers?.map((t) => (
            <li
              key={t.id}
              className="flex flex-col gap-3 bg-secondary/20 p-4 rounded-2xl border hover:border-purple-200 transition-colors md:flex-row md:justify-between md:items-start"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-700">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="font-bold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      User: <span className="font-code">{t.username}</span> | Pass: <span className="font-code">{t.passcode}</span>
                    </p>
                  </div>
                </div>
                {renderPersonalLink(`teacher:${t.id}`)}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEditTeacher(t)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  onClick={() => onDeleteTeacher(t.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
          {(!teachers || teachers.length === 0) && (
            <EmptyState
              icon={User}
              title="No teachers yet"
              description="Add teachers so each one gets their own portal to award points and redeem coupons with students."
              action={{ label: 'Add your first teacher', icon: Plus, onClick: onAddTeacher }}
            />
          )}
          </ul>
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="font-bold">Desk staff</h3>
            <p className="text-sm text-muted-foreground">Limited accounts for coupon sheets or prize redemption stations.</p>
          </div>
          <ul className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {staffAccounts?.map((account) => (
              <li
                key={account.id}
                className="flex flex-col gap-3 bg-secondary/20 p-4 rounded-2xl border hover:border-primary/30 transition-colors md:flex-row md:justify-between md:items-start"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary">
                      {account.role === 'secretary' ? <Printer className="w-5 h-5" /> : <Gift className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-bold">{account.displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        {account.role === 'secretary' ? 'Coupon printing' : 'Prize desk'} | User:{' '}
                        <span className="font-code">{account.username}</span> | Pass:{' '}
                        <span className="font-code">{account.passcode}</span>
                      </p>
                    </div>
                  </div>
                  {renderPersonalLink(`${account.role}:${account.id}`)}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDeskStaff(account)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => void onDeleteStaffAccount(account.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
            {(!staffAccounts || staffAccounts.length === 0) && (
              <EmptyState
                icon={Printer}
                title="No desk staff yet"
                description="Add a limited account for someone who should not have full teacher access."
                action={{ label: 'Add desk staff', icon: Plus, onClick: openNewDeskStaff }}
              />
            )}
          </ul>
        </section>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit desk staff' : 'Add desk staff'}</DialogTitle>
              <DialogDescription>Choose the limited access this person should have for the school.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label>Access</Label>
                <Select value={role} onValueChange={(value) => setRole(value as StaffAccountRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="secretary">Coupon printing only</SelectItem>
                    <SelectItem value="prizeClerk">Prize desk redemption</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-display-name">Name</Label>
                <Input
                  id="staff-display-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Shown after sign-in"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-username">Username</Label>
                <Input
                  id="staff-username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-passcode">Passcode</Label>
                <Input
                  id="staff-passcode"
                  type="text"
                  value={passcode}
                  onChange={(event) => setPasscode(event.target.value)}
                  autoComplete="off"
                  className="font-mono"
                />
              </div>
              {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => void handleSaveDeskStaff()}
                disabled={busy || !username.trim() || !passcode.trim() || !displayName.trim()}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
