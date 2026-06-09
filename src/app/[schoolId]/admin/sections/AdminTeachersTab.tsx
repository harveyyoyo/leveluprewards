'use client';

import { useEffect, useMemo, useState } from 'react';
import { Book, Building2, ChevronDown, Copy, Edit, FileText, Gift, GraduationCap, Home, IdCard, Minus, Plus, Printer, Trash2, User, UserMinus, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  StaffPortalSectionCard,
  StaffPortalSectionCardContent,
  StaffPortalSectionCardHeader,
  StaffPortalSectionCardTitle,
} from '@/components/staff/StaffPortalSection';
import { StaffPortalTabPanel } from '@/components/staff/StaffPortalTabHeader';
import { StaffPortalTabInfoPopover, staffPortalTabInfoSection } from '@/components/staff/StaffPortalTabInfoPopover';
import { EmptyState } from '@/components/ui/empty-state';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
import { studentsInTeacherScope } from '@/lib/reportsScope';
import { teacherPortalKey } from '@/lib/syncSchoolStaffDirectory';
import { cn, getStudentNickname } from '@/lib/utils';
import { obfuscateField, deobfuscateField } from '@/lib/crypto';
import type { Class, StaffAccount, StaffAccountRole, Student, Teacher } from '@/lib/types';
import type { StaffIdCardSubject } from '@/lib/staff/staffIdCardSubject';
import { allStaffIdCardSubjects } from '@/lib/staff/staffIdCardSubject';
import { isLeadershipPersonnel, leadershipPersonnelLabel } from '@/lib/teacherPersonnelRole';
import { AdminRecordListHeader } from '@/components/admin/AdminRecordListHeader';
import { AdminRecordListScroll } from '@/components/admin/AdminRecordListScroll';
import {
  DESK_STAFF_LIST_GRID_COLS,
  TEACHERS_LIST_GRID_COLS,
  adminRecordListGridCompactGapClassName,
  adminRecordListGridClassName,
  adminRecordListGridStyle,
} from '@/components/admin/adminRecordListGrid';
import { TabWalkthroughHeaderAction } from '@/components/tabWalkthrough/TabWalkthroughContext';

function staffRoleLabel(role: StaffAccountRole) {
  if (role === 'secretary') return 'Coupon printing';
  if (role === 'prizeClerk') return 'Prize desk';
  if (role === 'librarian') return 'Library only';
  if (role === 'office') return 'School Office';
  if (role === 'houseCoordinator') return 'Houses only';
  return 'Reports';
}

function StaffRoleIcon({ role }: { role: StaffAccountRole }) {
  if (role === 'secretary') return <Printer className="w-5 h-5" />;
  if (role === 'prizeClerk') return <Gift className="w-5 h-5" />;
  if (role === 'librarian') return <Book className="w-5 h-5" />;
  if (role === 'office') return <Building2 className="w-5 h-5" />;
  if (role === 'houseCoordinator') return <Home className="w-5 h-5" />;
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
  onAddLeadership,
  onEditTeacher,
  onDeleteTeacher,
  onUpdateStudent,
  onUpdateClass,
  onSaveStaffAccount,
  onDeleteStaffAccount,
  onPreviewStaffIdCard,
  onOpenStaffIdPrintSetup,
}: {
  teachers: Teacher[] | null | undefined;
  staffAccounts: StaffAccount[] | null | undefined;
  students?: Student[] | null | undefined;
  classes?: Class[] | null | undefined;
  schoolId: string;
  onAddTeacher: () => void;
  onAddLeadership: () => void;
  onEditTeacher: (t: Teacher) => void;
  onDeleteTeacher: (teacherId: string) => void;
  onUpdateStudent: (student: Student) => Promise<void>;
  onUpdateClass?: (updatedClass: Class) => Promise<void>;
  onSaveStaffAccount: (account: StaffAccount | Omit<StaffAccount, 'id'>) => Promise<void>;
  onDeleteStaffAccount: (accountId: string) => Promise<void>;
  onPreviewStaffIdCard?: (subject: StaffIdCardSubject) => void;
  onOpenStaffIdPrintSetup?: (subjects: StaffIdCardSubject[]) => void;
}) {
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
  const [rosterBusyKey, setRosterBusyKey] = useState('');
  const [copiedKey, setCopiedKey] = useState('');
  const [origin, setOrigin] = useState('');
  const [studentSearchTerms, setStudentSearchTerms] = useState<Record<string, string>>({});
  const [expandedClassesTeacherId, setExpandedClassesTeacherId] = useState('');
  const [expandedStudentsTeacherId, setExpandedStudentsTeacherId] = useState('');

  const teachersListGridStyle = adminRecordListGridStyle(TEACHERS_LIST_GRID_COLS);
  const deskStaffListGridStyle = adminRecordListGridStyle(DESK_STAFF_LIST_GRID_COLS);

  const classroomTeachers = useMemo(
    () => (teachers ?? []).filter((t) => !isLeadershipPersonnel(t)),
    [teachers],
  );
  const leadershipStaff = useMemo(
    () => (teachers ?? []).filter((t) => isLeadershipPersonnel(t)),
    [teachers],
  );

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

  const assignStudentToTeacher = async (student: Student, teacherId: string) => {
    const current = student.teacherIds || [];
    if (current.includes(teacherId)) return;
    const busyKey = `${teacherId}:${student.id}`;
    setRosterBusyKey(busyKey);
    try {
      await onUpdateStudent({ ...student, teacherIds: [...current, teacherId] });
    } finally {
      setRosterBusyKey('');
    }
  };

  const removeStudentFromTeacher = async (student: Student, teacherId: string) => {
    const current = student.teacherIds || [];
    if (!current.includes(teacherId)) return;
    const busyKey = `${teacherId}:${student.id}`;
    setRosterBusyKey(busyKey);
    try {
      await onUpdateStudent({ ...student, teacherIds: current.filter((id) => id !== teacherId) });
    } finally {
      setRosterBusyKey('');
    }
  };

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
      size="icon"
      className="h-7 w-7 shrink-0 rounded-md"
      title={copiedKey === key ? 'Copied' : 'Copy personal sign-in link'}
      aria-label={copiedKey === key ? 'Copied link' : 'Copy sign-in link'}
      onClick={() => void copyStaffPortalUrl(key)}
    >
      <Copy className="h-3.5 w-3.5" />
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
    setEmail(deobfuscateField(account.email) || '');
    setPhone(deobfuscateField(account.phone) || '');
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
          ? { ...editing, username: cleanUsername, passcode: cleanPasscode, displayName: cleanDisplayName, role: primaryRole, roles: cleanRoles, email: obfuscateField(email), phone: obfuscateField(phone) }
          : { username: cleanUsername, passcode: cleanPasscode, displayName: cleanDisplayName, role: primaryRole, roles: cleanRoles, email: obfuscateField(email), phone: obfuscateField(phone) },
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
    <StaffPortalTabPanel
      tabValue="teachers"
      trailing={
          <div className="flex flex-wrap items-center gap-2">
            <TabWalkthroughHeaderAction />
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={allStaffIdCardSubjects(teachers, staffAccounts).length === 0}
              onClick={() => onOpenStaffIdPrintSetup?.(allStaffIdCardSubjects(teachers, staffAccounts))}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print all staff ID cards
            </Button>
            <Button onClick={openNewDeskStaff} variant="outline" className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" /> Add desk staff
            </Button>
            <Button onClick={onAddLeadership} variant="outline" className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" /> Add principal / division head
            </Button>
            <Button onClick={onAddTeacher} className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" /> Add teacher
            </Button>
          </div>
        }
    >
    <StaffPortalSectionCard className="w-full min-w-0">
      <StaffPortalSectionCardContent className="min-w-0 space-y-6 px-3 pb-4 sm:px-4">
        <section className="space-y-3">
          <div className="flex items-center gap-1.5">
            <h3 className="font-bold">Classroom teachers</h3>
            <StaffPortalTabInfoPopover
              sections={[staffPortalTabInfoSection('Homeroom and classroom teachers. Expand Classes or Students on a row to manage scope.')]}
              ariaLabel="About classroom teachers"
            />
          </div>
          <AdminRecordListScroll>
          <ul className="space-y-2">
            {classroomTeachers.length > 0 ? (
              <AdminRecordListHeader
                gridColumns={TEACHERS_LIST_GRID_COLS}
                columns={[
                  { label: 'Edit' },
                  { label: 'Name' },
                  { label: 'Login' },
                  { label: 'Cls', className: 'text-center' },
                  { label: 'Std', className: 'text-center' },
                  { label: 'Act', className: 'text-right' },
                ]}
              />
            ) : null}
            {classroomTeachers.map((t) => {
              const rows = scopedStudentsByTeacher.get(t.id) ?? [];
              const managedClasses = (classes || []).filter((c) => c.primaryTeacherId === t.id);
              return (
              <li
                key={t.id}
                className="rounded-2xl border bg-secondary/20 transition-colors hover:border-purple-200"
              >
                <div
                  className={cn(
                    'items-center px-2 py-1.5',
                    adminRecordListGridClassName,
                    adminRecordListGridCompactGapClassName,
                  )}
                  style={teachersListGridStyle}
                >
                  <div className="flex items-center">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-md border-primary/20 bg-background hover:bg-primary/5 text-primary"
                      onClick={() => onEditTeacher(t)}
                      title="Edit teacher"
                      aria-label="Edit teacher"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="truncate text-sm font-bold">{t.name}</div>
                  <div
                    className="truncate text-[10px] text-muted-foreground"
                    title={`User: ${t.username} · Pass: ${t.passcode}`}
                  >
                    <span className="font-code text-foreground">{t.username}</span>
                    <span className="px-0.5 text-border">·</span>
                    <span className="font-code text-foreground">{t.passcode}</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 w-full min-w-0 justify-between gap-0.5 rounded-md px-1 text-[10px] font-semibold"
                      onClick={() => {
                        setExpandedClassesTeacherId((current) => (current === t.id ? '' : t.id));
                        setExpandedStudentsTeacherId('');
                      }}
                      title="Manage classes"
                    >
                      <span className="truncate">{managedClasses.length}</span>
                      <ChevronDown
                        className={cn(
                          'h-3.5 w-3.5 shrink-0 transition-transform',
                          expandedClassesTeacherId === t.id && 'rotate-180',
                        )}
                      />
                    </Button>
                  </div>
                  <div className="flex items-center justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 w-full min-w-0 justify-between gap-0.5 rounded-md px-1 text-[10px] font-semibold"
                      onClick={() => {
                        setExpandedStudentsTeacherId((current) => (current === t.id ? '' : t.id));
                        setExpandedClassesTeacherId('');
                      }}
                      title="Manage linked students"
                    >
                      <span className="truncate">{rows.length}</span>
                      <ChevronDown
                        className={cn(
                          'h-3.5 w-3.5 shrink-0 transition-transform',
                          expandedStudentsTeacherId === t.id && 'rotate-180',
                        )}
                      />
                    </Button>
                  </div>
                  <div className="flex items-center justify-end gap-0.5">
                    {renderCopyLinkButton(teacherPortalKey(t))}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-ring hover:bg-ring/10"
                      onClick={() => onPreviewStaffIdCard?.({ kind: 'teacher', teacher: t })}
                      title="Preview staff ID card"
                      aria-label="Preview staff ID card"
                    >
                      <IdCard className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-destructive hover:bg-destructive/10"
                      onClick={() => onDeleteTeacher(t.id)}
                      title="Delete teacher"
                      aria-label="Delete teacher"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>


                {expandedClassesTeacherId === t.id ? (
                  <div className="border-t border-border/60 bg-background/40">
                    <div className="px-4 pb-3 pt-0 space-y-4">
                      {managedClasses.length === 0 ? (
                        <p className="text-xs text-muted-foreground leading-relaxed pt-2">
                          This teacher is not assigned to any classes yet. Assign a class below.
                        </p>
                      ) : (
                        <ul className="max-h-44 overflow-y-auto space-y-1 rounded-xl border border-border/50 bg-background/80 p-2 text-sm mt-2">
                          {managedClasses.map((c) => (
                            <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 hover:bg-muted/40">
                              <span className="min-w-0">
                                <span className="block truncate font-medium text-foreground">{c.name}</span>
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 shrink-0 gap-1 text-destructive hover:bg-destructive/10"
                                onClick={async () => {
                                  if (!onUpdateClass) return;
                                  await onUpdateClass({ ...c, primaryTeacherId: '' });
                                }}
                              >
                                <Minus className="h-3.5 w-3.5" />
                                Remove
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assign to class</p>
                        <ul className="max-h-36 overflow-y-auto space-y-1 rounded-xl border border-border/50 bg-background/80 p-2 text-sm">
                          {(classes || [])
                            .filter((c) => c.primaryTeacherId !== t.id)
                            .map((c) => (
                              <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 hover:bg-muted/40">
                                <span className="min-w-0">
                                  <span className="block truncate font-medium text-foreground">{c.name}</span>
                                  <span className="block text-xs text-muted-foreground">
                                    {c.primaryTeacherId ? `Current: ${teachers?.find(te => te.id === c.primaryTeacherId)?.name || 'Unknown'}` : 'Unassigned'}
                                  </span>
                                </span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 shrink-0 gap-1"
                                  onClick={async () => {
                                    if (!onUpdateClass) return;
                                    await onUpdateClass({ ...c, primaryTeacherId: t.id });
                                  }}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Assign
                                </Button>
                              </li>
                            ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : null}

                {expandedStudentsTeacherId === t.id ? (
                <div className="border-t border-border/60 bg-background/40">
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
                          const directlyLinked = s.teacherIds?.includes(t.id) ?? false;
                          return (
                            <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 hover:bg-muted/40">
                              <span className="min-w-0">
                                <span className="block truncate font-medium text-foreground">{studentRowLabel(s)}</span>
                                <span className="block text-xs text-muted-foreground">
                                  {cls || 'Unassigned'} {directlyLinked ? '· directly linked' : '· class roster'}
                                </span>
                              </span>
                              {directlyLinked ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 shrink-0 gap-1 text-destructive hover:bg-destructive/10"
                                  disabled={rosterBusyKey === `${t.id}:${s.id}`}
                                  onClick={() => void removeStudentFromTeacher(s, t.id)}
                                >
                                  <UserMinus className="h-3.5 w-3.5" />
                                  Remove
                                </Button>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    <div className="mt-3 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Add students directly</p>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Search..."
                            className="h-7 w-32 text-xs px-2 rounded-lg"
                            value={studentSearchTerms[t.id] || ''}
                            onChange={(e) =>
                              setStudentSearchTerms((prev) => ({ ...prev, [t.id]: e.target.value }))
                            }
                          />
                          {(studentSearchTerms[t.id] || '').trim() && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="h-7 text-xs px-2 rounded-lg shrink-0"
                              onClick={async () => {
                                const q = (studentSearchTerms[t.id] || '').toLowerCase().trim();
                                const unassigned = (students || [])
                                  .filter((s) => !(s.teacherIds || []).includes(t.id))
                                  .filter((s) => {
                                    if (!q) return true;
                                    return (
                                      s.firstName.toLowerCase().includes(q) ||
                                      s.lastName.toLowerCase().includes(q) ||
                                      (s.nickname && s.nickname.toLowerCase().includes(q))
                                    );
                                  });
                                const busyKey = `bulk:${t.id}`;
                                setRosterBusyKey(busyKey);
                                try {
                                  for (const s of unassigned) {
                                    await assignStudentToTeacher(s, t.id);
                                  }
                                } finally {
                                  setRosterBusyKey('');
                                }
                              }}
                              disabled={rosterBusyKey.startsWith('bulk:')}
                            >
                              Add all filtered
                            </Button>
                          )}
                        </div>
                      </div>
                      <ul className="max-h-36 overflow-y-auto space-y-1 rounded-xl border border-border/50 bg-background/80 p-2 text-sm">
                        {(students || [])
                          .filter((s) => !(s.teacherIds || []).includes(t.id))
                          .filter((s) => {
                            const query = (studentSearchTerms[t.id] || '').toLowerCase().trim();
                            if (!query) return true;
                            return (
                              s.firstName.toLowerCase().includes(query) ||
                              s.lastName.toLowerCase().includes(query) ||
                              (s.nickname && s.nickname.toLowerCase().includes(query))
                            );
                          })
                          .slice()
                          .sort(studentSortKey)
                          .map((s) => {
                            const cls = s.classId ? classNameById.get(s.classId) : undefined;
                            return (
                              <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 hover:bg-muted/40">
                                <span className="min-w-0">
                                  <span className="block truncate font-medium text-foreground">{studentRowLabel(s)}</span>
                                  <span className="block text-xs text-muted-foreground">{cls || 'Unassigned'}</span>
                                </span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 shrink-0 gap-1"
                                  disabled={rosterBusyKey === `${t.id}:${s.id}`}
                                  onClick={() => void assignStudentToTeacher(s, t.id)}
                                >
                                  <UserPlus className="h-3.5 w-3.5" />
                                  Add
                                </Button>
                              </li>
                            );
                          })}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : null}
            </li>
            );
          })}
          {classroomTeachers.length === 0 && (
            <EmptyState
              icon={User}
              title="No classroom teachers yet"
              description="Add teachers so each one gets their own portal to award points and redeem coupons with students."
              action={{ label: 'Add your first teacher', icon: Plus, onClick: onAddTeacher }}
            />
          )}
          </ul>
          </AdminRecordListScroll>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-1.5">
            <h3 className="font-bold">Principals & division heads</h3>
            <StaffPortalTabInfoPopover
              sections={[staffPortalTabInfoSection('Principals and division heads sign in through the staff portal with school-wide student and category access.')]}
              ariaLabel="About principals and division heads"
            />
          </div>
          <AdminRecordListScroll>
          <ul className="space-y-2">
            {leadershipStaff.length > 0 ? (
              <AdminRecordListHeader
                gridColumns={DESK_STAFF_LIST_GRID_COLS}
                columns={[
                  { label: 'Edit' },
                  { label: 'Name' },
                  { label: 'Login' },
                  { label: 'Act', className: 'text-right' },
                ]}
              />
            ) : null}
            {leadershipStaff.map((t) => (
              <li
                key={t.id}
                className={cn(
                  'items-center rounded-xl border bg-secondary/20 px-2 py-1.5 transition-colors hover:border-amber-200/80',
                  adminRecordListGridCompactGapClassName,
                  adminRecordListGridClassName,
                )}
                style={deskStaffListGridStyle}
              >
                <div className="flex items-center">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-md border-primary/20 bg-background hover:bg-primary/5 text-primary"
                    onClick={() => onEditTeacher(t)}
                    title="Edit leadership staff"
                    aria-label="Edit leadership staff"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-bold">{t.name}</span>
                    <span className="block truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {leadershipPersonnelLabel(t.personnelRole || 'principal')}
                    </span>
                  </div>
                </div>
                <div
                  className="truncate text-[10px] text-muted-foreground"
                  title={`User: ${t.username} · Pass: ${t.passcode}`}
                >
                  <span className="font-code text-foreground">{t.username}</span>
                  <span className="px-0.5 text-border">·</span>
                  <span className="font-code text-foreground">{t.passcode}</span>
                </div>
                <div className="flex items-center justify-end gap-0.5">
                  {renderCopyLinkButton(teacherPortalKey(t))}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-ring hover:bg-ring/10"
                    onClick={() => onPreviewStaffIdCard?.({ kind: 'teacher', teacher: t })}
                    title="Preview staff ID card"
                    aria-label="Preview staff ID card"
                  >
                    <IdCard className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-destructive hover:bg-destructive/10"
                    onClick={() => onDeleteTeacher(t.id)}
                    title="Delete leadership staff"
                    aria-label="Delete leadership staff"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
            {leadershipStaff.length === 0 && (
              <EmptyState
                icon={GraduationCap}
                title="No principals or division heads yet"
                description="Add school leadership so they can review behavior, award points, and support teachers across the whole school."
                action={{ label: 'Add principal / division head', icon: Plus, onClick: onAddLeadership }}
              />
            )}
          </ul>
          </AdminRecordListScroll>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-1.5">
            <h3 className="font-bold">Desk staff</h3>
            <StaffPortalTabInfoPopover
              sections={[staffPortalTabInfoSection('Limited accounts for coupon sheets, prize redemption, houses, office, library, or reports.')]}
              ariaLabel="About desk staff"
            />
          </div>
          <AdminRecordListScroll>
          <ul className="space-y-2">
            {staffAccounts && staffAccounts.length > 0 ? (
              <AdminRecordListHeader
                gridColumns={DESK_STAFF_LIST_GRID_COLS}
                columns={[
                  { label: 'Edit' },
                  { label: 'Name' },
                  { label: 'Login' },
                  { label: 'Act', className: 'text-right' },
                ]}
              />
            ) : null}
            {staffAccounts?.map((account) => (
              <li
                key={account.id}
                className={cn(
                  'items-center rounded-xl border bg-secondary/20 px-2 py-1.5 transition-colors hover:border-primary/30',
                  adminRecordListGridCompactGapClassName,
                  adminRecordListGridClassName,
                )}
                style={deskStaffListGridStyle}
              >
                <div className="flex items-center">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-md border-primary/20 bg-background hover:bg-primary/5 text-primary"
                    onClick={() => openEditDeskStaff(account)}
                    title="Edit staff"
                    aria-label="Edit staff"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex min-w-0 items-center gap-3">
                  <div className="w-8 h-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <StaffRoleIcon role={account.role} />
                  </div>
                  <span className="truncate text-sm font-bold">{account.displayName}</span>
                </div>
                <div
                  className="truncate text-[10px] text-muted-foreground"
                  title={`${(account.roles?.length ? account.roles : [account.role]).map(staffRoleLabel).join(', ')} · ${account.username} · ${account.passcode}`}
                >
                  <span className="truncate">{(account.roles?.length ? account.roles : [account.role]).map(staffRoleLabel).join(', ')}</span>
                  <span className="px-0.5 text-border">·</span>
                  <span className="font-code text-foreground">{account.username}</span>
                  <span className="px-0.5 text-border">·</span>
                  <span className="font-code text-foreground">{account.passcode}</span>
                </div>
                <div className="flex items-center justify-end gap-0.5">
                  {renderCopyLinkButton(`${account.role}:${account.id}`)}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-ring hover:bg-ring/10"
                    onClick={() => onPreviewStaffIdCard?.({ kind: 'staffAccount', account })}
                    title="Preview staff ID card"
                    aria-label="Preview staff ID card"
                  >
                    <IdCard className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-destructive hover:bg-destructive/10"
                    onClick={() => void onDeleteStaffAccount(account.id)}
                    title="Delete staff"
                    aria-label="Delete staff"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
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
          </AdminRecordListScroll>
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
                    ['librarian', 'Library catalog & checkouts'],
                    ['houseCoordinator', 'Houses only'],
                    ['reports', 'Reports'],
                    ['office', 'School Office (grades & billing)'],
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
      </StaffPortalSectionCardContent>
    </StaffPortalSectionCard>
    </StaffPortalTabPanel>
  );
}
