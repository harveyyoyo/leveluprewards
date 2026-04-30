'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Copy, Edit, FileText, Gift, Plus, Printer, Trash2, User } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Helper } from '@/components/ui/helper';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFirestore } from '@/firebase';
import { studentsInTeacherScope } from '@/lib/reportsScope';
import { cn, getStudentNickname } from '@/lib/utils';
import { encryptField, decryptField } from '@/lib/crypto';
import type { Class, StaffAccount, StaffAccountRole, Student, Teacher } from '@/lib/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

function normalizePortalKeyPart(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '');
}

function teacherPortalKey(teacher: Teacher) {
  const usernameKey = normalizePortalKeyPart(teacher.username || '');
  return `teacher:${usernameKey || teacher.id}`;
}

function staffRoleLabel(role: StaffAccountRole) {
  if (role === 'secretary') return 'Coupon printing';
  if (role === 'prizeClerk') return 'Prize desk';
  return 'Reports';
}

function StaffRoleIcon({ role }: { role: StaffAccountRole }) {
  if (role === 'secretary') return <Printer className="w-5 h-5" />;
  if (role === 'prizeClerk') return <Gift className="w-5 h-5" />;
  return <FileText className="w-5 h-5" />;
}

function studentSortKey(a: Student, b: Student) {
  const ln = a.lastName.localeCompare(b.lastName);
  if (ln !== 0) return ln;
  return getStudentNickname(a).localeCompare(getStudentNickname(b));
}

function studentRowLabel(s: Student) {
  return `${getStudentNickname(s)} ${s.lastName}`.trim();
}

export function AdminTeachersTab({
  teachers,
  staffAccounts,
  students,
  classes,
  schoolId,
  onAddTeacher,
  onEditTeacher,
  onDeleteTeacher,
  onSaveStaffAccount,
  onDeleteStaffAccount,
}: {
  teachers: Teacher[] | null | undefined;
  staffAccounts: StaffAccount[] | null | undefined;
  students?: Student[] | null | undefined;
  classes?: Class[] | null | undefined;
  schoolId: string;
  onAddTeacher: () => void;
  onEditTeacher: (t: Teacher) => void;
  onDeleteTeacher: (teacherId: string) => void;
  onSaveStaffAccount: (account: StaffAccount | Omit<StaffAccount, 'id'>) => Promise<void>;
  onDeleteStaffAccount: (accountId: string) => Promise<void>;
}) {
  const firestore = useFirestore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StaffAccount | null>(null);
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<StaffAccountRole>('secretary');
  const [roles, setRoles] = useState<StaffAccountRole[]>(['secretary']);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const classNameById = useMemo(() => {
    const list = classes ?? [];
    return new Map(list.map((c) => [c.id, c.name]));
  }, [classes]);

  const scopedStudentsByTeacher = useMemo(() => {
    const st = students ?? [];
    const cls = classes ?? [];
    const list = teachers ?? [];
    const map = new Map<string, Student[]>();
    for (const t of list) {
      const scoped = studentsInTeacherScope(t.id, st, cls).slice().sort(studentSortKey);
      map.set(t.id, scoped);
    }
    return map;
  }, [teachers, students, classes]);

  useEffect(() => {
    if (!schoolId) return;
    if (!teachers || !staffAccounts) return;

    const syncDirectory = async () => {
      const expected = new Map<string, Record<string, unknown>>();

      for (const teacher of teachers) {
        const username = (teacher.username || teacher.id).trim();
        const key = teacherPortalKey(teacher);
        if (!teacher.name?.trim() || !username) continue;
        expected.set(key, {
          id: key,
          sourceId: teacher.id,
          type: 'teacher',
          label: teacher.name.trim(),
          username,
          updatedAt: Date.now(),
        });
      }

      for (const account of staffAccounts) {
        const username = account.username.trim().toLowerCase();
        const label = account.displayName.trim();
        const accountRoles = account.roles?.length ? account.roles : [account.role];
        if (!username || !label) continue;
        expected.set(`${account.role}:${account.id}`, {
          id: `${account.role}:${account.id}`,
          sourceId: account.id,
          type: account.role,
          roles: accountRoles,
          label,
          username,
          updatedAt: Date.now(),
        });
      }

      await setDoc(
        doc(firestore, 'schoolPublic', schoolId),
        {
          active: true,
          staffDirectory: Array.from(expected.values()),
          staffDirectoryUpdatedAt: Date.now(),
          updatedAt: Date.now(),
        },
        { merge: true },
      );
    };

    void syncDirectory().catch(() => {
      // Best effort: staff can still use manually copied links once rules/data are in sync.
    });
  }, [firestore, schoolId, staffAccounts, teachers]);

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

  const renderCopyLinkButton = (key: string) => (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 shrink-0 gap-1"
      title="Copy personal sign-in link"
      onClick={() => void copyStaffPortalUrl(key)}
    >
      <Copy className="h-3.5 w-3.5" />
      {copiedKey === key ? 'Copied' : 'Link'}
    </Button>
  );

  const openNewDeskStaff = () => {
    setEditing(null);
    setUsername('');
    setPasscode('');
    setDisplayName('');
    setRole('secretary');
    setRoles(['secretary']);
    setEmail('');
    setPhone('');
    setError('');
    setDialogOpen(true);
  };

  const openEditDeskStaff = (account: StaffAccount) => {
    setEditing(account);
    setUsername(account.username);
    setPasscode(account.passcode);
    setDisplayName(account.displayName);
    setRole(account.role);
    setRoles(account.roles?.length ? account.roles : [account.role]);
    setEmail(decryptField(account.email) || '');
    setPhone(decryptField(account.phone) || '');
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
      const cleanRoles = roles.length ? roles : [role];
      const primaryRole = cleanRoles[0];
      await onSaveStaffAccount(
        editing
          ? { ...editing, username: cleanUsername, passcode: cleanPasscode, displayName: cleanDisplayName, role: primaryRole, roles: cleanRoles, email: encryptField(email), phone: encryptField(phone) }
          : { username: cleanUsername, passcode: cleanPasscode, displayName: cleanDisplayName, role: primaryRole, roles: cleanRoles, email: encryptField(email), phone: encryptField(phone) },
      );
      setDialogOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const toggleRole = (nextRole: StaffAccountRole) => {
    setRoles((current) => {
      const next = current.includes(nextRole)
        ? current.filter((item) => item !== nextRole)
        : [...current, nextRole];
      const clean = next.length ? next : [nextRole];
      setRole(clean[0]);
      return clean;
    });
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
          <CardDescription>Teachers can issue rewards. Desk staff get limited coupon, prize, or reports access.</CardDescription>
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
            <p className="text-sm text-muted-foreground">
              Full classroom staff who can print coupons and award points. Expand &quot;Linked students&quot; to see who is in
              each teacher&apos;s scope (class primary teacher or explicit assignment on the student).
            </p>
          </div>
          <ul className="space-y-2 max-h-[min(520px,70vh)] overflow-y-auto pr-1">
          {teachers?.map((t) => {
            const rows = scopedStudentsByTeacher.get(t.id) ?? [];
            return (
            <li
              key={t.id}
              className="bg-secondary/20 rounded-2xl border hover:border-purple-200 transition-colors overflow-hidden"
            >
              <div className="flex justify-between items-center gap-3 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="w-10 h-10 shrink-0 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-700">
                    {t.name[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      User: <span className="font-code">{t.username}</span> | Pass: <span className="font-code">{t.passcode}</span>
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  {renderCopyLinkButton(teacherPortalKey(t))}
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
              </div>
              <Collapsible className="border-t border-border/60 bg-background/40">
                <CollapsibleTrigger
                  className={cn(
                    'group flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm font-medium text-muted-foreground',
                    'hover:bg-muted/50 hover:text-foreground transition-colors',
                    'data-[state=open]:bg-muted/30',
                  )}
                >
                  <span>
                    Linked students
                    <span className="ml-1.5 tabular-nums text-foreground">({rows.length})</span>
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-3 pt-0">
                    {rows.length === 0 ? (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        No students in this teacher&apos;s scope yet. Set them as the primary teacher on a class, or add
                        this teacher on the student record.
                      </p>
                    ) : (
                      <ul className="max-h-44 overflow-y-auto space-y-1 rounded-xl border border-border/50 bg-background/80 p-2 text-sm">
                        {rows.map((s) => {
                          const cls = s.classId ? classNameById.get(s.classId) : undefined;
                          return (
                            <li key={s.id} className="flex items-baseline justify-between gap-2">
                              <span className="min-w-0 truncate font-medium text-foreground">{studentRowLabel(s)}</span>
                              {cls ? (
                                <span className="shrink-0 text-xs text-muted-foreground">{cls}</span>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </li>
            );
          })}
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
            <p className="text-sm text-muted-foreground">Limited accounts for coupon sheets, prize redemption, or reports.</p>
          </div>
          <ul className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {staffAccounts?.map((account) => (
              <li
                key={account.id}
                className="flex justify-between items-center gap-3 bg-secondary/20 p-4 rounded-2xl border hover:border-primary/30 transition-colors"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="w-10 h-10 shrink-0 rounded-full bg-primary/15 flex items-center justify-center text-primary">
                    <StaffRoleIcon role={account.role} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold">{account.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {(account.roles?.length ? account.roles : [account.role]).map(staffRoleLabel).join(', ')} | User:{' '}
                      <span className="font-code">{account.username}</span> | Pass:{' '}
                      <span className="font-code">{account.passcode}</span>
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  {renderCopyLinkButton(`${account.role}:${account.id}`)}
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
                <Label>Abilities</Label>
                <div className="grid gap-2 rounded-xl border p-3">
                  {([
                    ['secretary', 'Coupon printing'],
                    ['prizeClerk', 'Prize desk redemption'],
                    ['reports', 'Reports'],
                  ] as const).map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={roles.includes(value)}
                        onChange={() => toggleRole(value)}
                        className="h-4 w-4 accent-primary"
                      />
                      {label}
                    </label>
                  ))}
                </div>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="staff-email">Email (Optional)</Label>
                  <Input
                    id="staff-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="staff@school.edu"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff-phone">Phone (Optional)</Label>
                  <Input
                    id="staff-phone"
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="555-0123"
                  />
                </div>
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
