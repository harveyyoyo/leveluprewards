'use client';

import { useState } from 'react';
import { Edit, Plus, Trash2, Printer, Gift } from 'lucide-react';
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
import type { StaffAccount, StaffAccountRole } from '@/lib/types';

export function AdminStaffAccountsTab({
  staffAccounts,
  onSave,
  onDelete,
}: {
  staffAccounts: StaffAccount[] | null | undefined;
  onSave: (account: StaffAccount | Omit<StaffAccount, 'id'>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StaffAccount | null>(null);
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<StaffAccountRole>('secretary');
  const [busy, setBusy] = useState(false);

  const openNew = () => {
    setEditing(null);
    setUsername('');
    setPasscode('');
    setDisplayName('');
    setRole('secretary');
    setDialogOpen(true);
  };

  const openEdit = (a: StaffAccount) => {
    setEditing(a);
    setUsername(a.username);
    setPasscode(a.passcode);
    setDisplayName(a.displayName);
    setRole(a.role);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!username.trim() || !passcode.trim() || !displayName.trim()) return;
    setBusy(true);
    try {
      if (editing) {
        await onSave({
          ...editing,
          username: username.trim().toLowerCase(),
          passcode: passcode.trim(),
          displayName: displayName.trim(),
          role,
        });
      } else {
        await onSave({
          username: username.trim().toLowerCase(),
          passcode: passcode.trim(),
          displayName: displayName.trim(),
          role,
        });
      }
      setDialogOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-t-4 border-primary shadow-md">
      <CardHeader className="flex flex-row justify-between items-center py-6">
        <div>
          <Helper content="Limited accounts: coupon printing only, or prize redemption desk only. Share the URL and login separately from teacher accounts.">
            <CardTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-primary" /> Desk staff
            </CardTitle>
          </Helper>
          <CardDescription>
            Secretary: path <code className="text-xs bg-muted px-1 rounded">/secretary</code> · Prize desk:{' '}
            <code className="text-xs bg-muted px-1 rounded">/prize-clerk</code>
          </CardDescription>
        </div>
        <Button onClick={openNew} className="rounded-xl">
          <Plus className="mr-2 h-4 w-4" /> Add account
        </Button>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 h-[calc(100vh-22rem)] max-h-[420px] min-h-[250px] overflow-y-auto pr-1">
          {staffAccounts?.map((a) => (
            <li
              key={a.id}
              className="flex justify-between items-center bg-secondary/20 p-4 rounded-2xl border hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary">
                  {a.role === 'secretary' ? <Printer className="w-5 h-5" /> : <Gift className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-bold">{a.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.role === 'secretary' ? 'Secretary (print coupons)' : 'Prize desk (redeem prizes)'} · user:{' '}
                    <span className="font-mono">{a.username}</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  onClick={() => void onDelete(a.id)}
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
              description="Add a secretary to print coupons, or a prize clerk to run the prize desk without full teacher access."
              action={{ label: 'Add first account', icon: Plus, onClick: openNew }}
            />
          )}
        </ul>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit desk account' : 'New desk account'}</DialogTitle>
              <DialogDescription>Username must be unique for this school. Passcodes are stored like teacher passcodes.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as StaffAccountRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="secretary">Secretary — print coupons only</SelectItem>
                    <SelectItem value="prizeClerk">Prize desk — redeem prizes for students</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sa-user">Login username</Label>
                <Input id="sa-user" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sa-pass">Passcode</Label>
                <Input id="sa-pass" type="text" value={passcode} onChange={(e) => setPasscode(e.target.value)} autoComplete="off" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sa-name">Display name</Label>
                <Input id="sa-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Shown after sign-in" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void handleSubmit()} disabled={busy || !username.trim() || !passcode.trim() || !displayName.trim()}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
