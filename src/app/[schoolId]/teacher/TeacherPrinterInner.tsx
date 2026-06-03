'use client';
import { useState, useEffect, useMemo, Fragment, type ReactNode } from 'react';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '@/components/AppProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import type { Coupon, Category, Teacher, Student, Class, House, HistoryItem, Prize, AttendanceSettings, AttendanceLogEntry, AttendanceScheduleSlot, AttendanceRewardRule, CouponRedemptionScope, HomeworkAssignment } from '@/lib/types';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, Printer, Plus, LogIn, LogOut, UserCheck, Award, User, Search, Users, Minus, Gift, Loader2, Trash2, Edit, Filter, Ticket, Clock, History, FileText, BookOpen, Target, X, Dices } from 'lucide-react';
import { useSettings, type Settings } from '@/components/providers/SettingsProvider';
import { PrinterReminderCallout } from '@/components/coupons/PrinterReminderCallout';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Coupon as CouponPreview } from '@/components/coupons/Coupon';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useArcadeSound } from '@/hooks/useArcadeSound';

import { cn } from '@/lib/utils';
import { countPendingTeacherAwards } from '@/lib/pendingTeacherAwards';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StaffPortalNav } from '@/components/staff/StaffPortalNav';
import {
  staffPortalContentWidthClassName,
  staffPortalPageIntroClassName,
} from '@/components/staff/staffPortalNavStyles';
import { StaffPortalLayoutProvider, useStaffPortalLayout } from '@/components/staff/StaffPortalLayoutContext';
import { StaffPortalLayoutToggle } from '@/components/staff/StaffPortalLayoutToggle';
import { StaffPortalShellFrame } from '@/components/staff/StaffPortalShellFrame';
import { TeacherPortalAddMoreMenu } from '@/components/staff/TeacherPortalAddMoreMenu';
import { TeacherPortalTabPane } from '@/components/staff/TeacherPortalTabPane';
import { StaffPortalWelcomeTab } from '@/components/staff/StaffPortalWelcomeTab';
import { staffPortalTabIsValid, staffPortalTeacherPinSideEffects, useStaffPortalTabs } from '@/lib/staffPortal';
import { Switch } from '@/components/ui/switch';

import DynamicIcon from '@/components/DynamicIcon';
import { getStudentNickname } from '@/lib/utils';
import { appearanceVarsForSurface } from '@/lib/appearance';
import { globalAnimatedBackdropActive } from '@/lib/animatedBackdrop';
import {
    remainingTeacherBudgetPoints,
    teacherWithBudgetAfterSpend,
    teacherBudgetRemainingPhrase,
    resolveTeacherBudgetPeriod,
} from '@/lib/teacherBudget';
import { Helper } from '@/components/ui/helper';
import { AttendanceSetupWizard } from '@/components/attendance/AttendanceSetupWizard';
import {
  TabWalkthroughHeaderAction,
  TabWalkthroughProvider,
} from '@/components/tabWalkthrough/TabWalkthroughContext';
import { getReadableErrorMessage } from '@/lib/errorMessage';
import { AdminPrizesTab } from '@/app/[schoolId]/admin/sections/AdminPrizesTab';
import { PrizeModal } from '@/components/prizes/PrizeModal';
import {
    COUPONS_PER_PRINT_PAGE,
    COUPON_PRINT_PAGE_SIZE_OPTIONS,
    generateUniqueCouponCodes,
    normalizeCouponPrintPageSize,
    type CouponPrintPageSize,
} from '@/lib/coupons/couponPrint';
import { buildRedemptionPrintNote, couponRedemptionLabelForPrint } from '@/lib/coupons/couponRedemptionRules';
import { SchoolReportsPanel } from '@/components/reports/SchoolReportsPanel';
import { GoalsManager } from '@/components/goals/GoalsManager';
import { homeworkRewardCategoryKey } from '@/lib/homeworkRewards';
import { studentsInTeacherScope } from '@/lib/reportsScope';
import { isLeadershipPersonnel } from '@/lib/teacherPersonnelRole';
import { AdminRaffleTab } from '@/app/[schoolId]/admin/sections/AdminRaffleTab';
import { AdminHousesTab } from '@/app/[schoolId]/admin/sections/AdminHousesTab';
import { StaffPortalSchoolwideFeatureNotice } from '@/components/staff/StaffPortalSchoolwideFeatureNotice';
import { StaffPointsTab } from '@/components/points/StaffPointsTab';
import { StaffClassroomTab } from '@/components/points/StaffClassroomTab';
import { CategoryModal } from '@/components/admin/CategoryModal';
import { formatStudentPointTypes } from '@/lib/students/studentPointTypes';

/** Max sheets per run. Bounded for sensible printer jobs and UI. */
const MAX_COUPON_PRINT_SHEETS = 100;
const teacherPortalTabContentClassName =
    'mt-0 h-full min-h-0 w-full overflow-y-auto overflow-x-hidden pb-6 pr-1 data-[state=active]:animate-none motion-reduce:animate-none';
function teacherPortalPanelClassName(isWide: boolean) {
  return cn('w-full', staffPortalContentWidthClassName(isWide));
}

function TeacherPortalShell({
  embedded,
  className,
  children,
}: {
  embedded: boolean;
  className?: string;
  children: ReactNode;
}) {
  if (embedded) {
    return (
      <div
        className={cn(
          'relative z-10 mx-auto flex w-full max-w-none flex-1 min-h-0 flex-col gap-6 p-0',
          className,
        )}
      >
        {children}
      </div>
    );
  }

  return <StaffPortalShellFrame className={className}>{children}</StaffPortalShellFrame>;
}


function TeacherHomeworkTab({ schoolId, teacherId, students, classes }: { schoolId: string; teacherId: string; students: Student[]; classes: Class[] }) {
    const { addHomeworkAssignment, deleteHomeworkAssignment, awardPointsToMultipleStudents } = useAppContext();
    const { toast } = useToast();
    const firestore = useFirestore();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newReward, setNewReward] = useState({ title: '', description: '', points: 10, classId: 'all' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [filterClassId, setFilterClassId] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('defaultClassId') || 'all';
        }
        return 'all';
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [isAwarding, setIsAwarding] = useState<string | null>(null);

    const assignmentsQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'homework') : null, [firestore, schoolId]);
    const { data: assignments, isLoading: assignmentsLoading } = useCollection<HomeworkAssignment>(assignmentsQuery);

    const myAssignments = useMemo(() => assignments?.filter(a => a.teacherId === teacherId) || [], [assignments, teacherId]);
    const filteredStudents = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        return students.filter((student) => {
            const classMatch = filterClassId === 'all' || student.classId === filterClassId;
            if (!classMatch) return false;
            if (!normalizedSearch) return true;

            const fullName = `${getStudentNickname(student)} ${student.lastName}`.toLowerCase();
            return fullName.includes(normalizedSearch) ||
                student.id.toLowerCase().includes(normalizedSearch) ||
                (student.nfcId && student.nfcId.toLowerCase().includes(normalizedSearch));
        });
    }, [students, filterClassId, searchTerm]);

    const toggleStudent = (studentId: string) => {
        setSelectedStudentIds((prev) => prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]);
    };

    const toggleAllVisibleStudents = () => {
        const visibleIds = filteredStudents.map((student) => student.id);
        const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedStudentIds.includes(id));
        setSelectedStudentIds((prev) => {
            if (allVisibleSelected) return prev.filter((id) => !visibleIds.includes(id));
            return Array.from(new Set([...prev, ...visibleIds]));
        });
    };

    const handleCreateReward = async () => {
        if (!newReward.title) return;
        setIsSubmitting(true);
        try {
            await addHomeworkAssignment({
                ...newReward,
                teacherId,
                createdAt: Date.now(),
                points: Number(newReward.points)
            } as any);
            setIsCreateModalOpen(false);
            setNewReward({ title: '', description: '', points: 10, classId: 'all' });
            toast({ title: 'Homework reward saved' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Failed to save homework reward', description: (e as Error).message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteReward = async (id: string) => {
        if (!confirm('Delete this homework reward?')) return;
        try {
            await deleteHomeworkAssignment(id);
            toast({ title: 'Homework reward deleted' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Failed to delete homework reward', description: (e as Error).message });
        }
    };

    const handleAwardReward = async (reward: HomeworkAssignment, targetIds = selectedStudentIds) => {
        const points = Number(reward.points);
        const eligibleIds = targetIds.filter((studentId) => {
            if (reward.classId === 'all' || !reward.classId) return true;
            return students.find((student) => student.id === studentId)?.classId === reward.classId;
        });
        if (!eligibleIds.length) {
            toast({ variant: 'destructive', title: 'No students selected', description: 'Choose students who should receive this homework reward.' });
            return;
        }
        if (!Number.isFinite(points) || points <= 0) {
            toast({ variant: 'destructive', title: 'Invalid points', description: 'Homework rewards need a positive point value.' });
            return;
        }

        setIsAwarding(reward.id);
        try {
            const result = await awardPointsToMultipleStudents(eligibleIds, points, homeworkRewardCategoryKey(reward.title));
            if (result.success) {
                toast({ title: 'Homework reward awarded', description: `Awarded ${points} points to ${result.count} student(s).` });
                setSelectedStudentIds((prev) => prev.filter((id) => !eligibleIds.includes(id)));
            } else {
                toast({ variant: 'destructive', title: 'Could not award reward', description: result.message });
            }
        } finally {
            setIsAwarding(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h3 className="text-lg font-black flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Homework Rewards
                    </h3>
                    <p className="text-sm text-muted-foreground font-medium">Give quick points for completed homework without adding anything to the student portal.</p>
                </div>
                <TabWalkthroughHeaderAction />
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="Search name or ID..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="h-11 w-full sm:w-64 rounded-xl pl-9 transition-all bg-slate-50"
                        />
                    </div>
                    <Select value={filterClassId} onValueChange={(val) => { setFilterClassId(val); localStorage.setItem('defaultClassId', val); }}>
                        <SelectTrigger className="h-11 w-full sm:w-52 rounded-xl font-bold">
                            <SelectValue placeholder="All classes" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Classes</SelectItem>
                            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" className="h-11 rounded-xl font-black uppercase tracking-widest text-xs" onClick={toggleAllVisibleStudents}>
                        {filteredStudents.length > 0 && filteredStudents.every((student) => selectedStudentIds.includes(student.id)) ? 'Deselect visible' : 'Select visible'}
                    </Button>
                </div>
                <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                    <DialogTrigger asChild>
                        <Button className="rounded-xl font-black uppercase tracking-widest gap-2">
                            <Plus className="w-4 h-4" />
                            New Reward
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Homework Reward</DialogTitle>
                            <DialogDescription>Save a quick reward teachers can award after checking work.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Reward Name</Label>
                                <Input value={newReward.title} onChange={e => setNewReward({ ...newReward, title: e.target.value })} placeholder="e.g. Homework Complete" />
                            </div>
                            <div className="space-y-2">
                                <Label>Note</Label>
                                <Input value={newReward.description} onChange={e => setNewReward({ ...newReward, description: e.target.value })} placeholder="Optional teacher note" />
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Points</Label>
                                    <Input type="number" min={1} value={newReward.points} onChange={e => setNewReward({ ...newReward, points: Number(e.target.value) })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Limit to Class</Label>
                                    <Select value={newReward.classId} onValueChange={v => setNewReward({ ...newReward, classId: v })}>
                                    <SelectTrigger>
                                            <SelectValue placeholder="All Classes" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Classes</SelectItem>
                                        {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreateReward} disabled={isSubmitting || !newReward.title} className="w-full h-12 rounded-xl font-black uppercase tracking-widest">
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Reward'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="border-dashed">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-black">Students to Reward</CardTitle>
                    <CardDescription>{selectedStudentIds.length} selected</CardDescription>
                </CardHeader>
                <CardContent>
                    {filteredStudents.length > 0 ? (
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredStudents.map((student) => {
                                const checked = selectedStudentIds.includes(student.id);
                                return (
                                    <button
                                        type="button"
                                        key={student.id}
                                        onClick={() => toggleStudent(student.id)}
                                        className={cn(
                                            "flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors",
                                            checked ? "border-primary bg-primary/5" : "hover:bg-muted/60"
                                        )}
                                    >
                                        <span>
                                            <span className="block text-sm font-black">{getStudentNickname(student)}</span>
                                            <span className="block text-[11px] font-bold text-muted-foreground">
                                                {student.classId ? (classes.find((c) => c.id === student.classId)?.name || 'Unassigned') : 'Unassigned'}
                                            </span>
                                        </span>
                                        <Checkbox checked={checked} aria-label={`Select ${getStudentNickname(student)}`} />
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="py-8 text-center text-sm font-bold text-muted-foreground">No students found for this class.</p>
                    )}
                </CardContent>
            </Card>

            {assignmentsLoading ? (
                <div className="grid gap-4 md:grid-cols-2">
                    {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}
                </div>
            ) : myAssignments.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {myAssignments.map(assignment => (
                        <Card key={assignment.id} className="border-t-4 border-primary">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg font-black">{assignment.title}</CardTitle>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteReward(assignment.id)} className="text-destructive hover:bg-destructive/10">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                                <CardDescription className="font-medium line-clamp-2">{assignment.description || 'No description provided.'}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="outline" className="font-black bg-primary/5 border-primary/20">{assignment.points} pts</Badge>
                                    <Badge variant="outline" className="font-bold">
                                        {assignment.classId === 'all' ? 'All Classes' : (classes.find(c => c.id === assignment.classId)?.name || 'Class Unknown')}
                                    </Badge>
                                </div>
                                <Button
                                    className="w-full rounded-xl font-black uppercase tracking-widest text-xs gap-2"
                                    onClick={() => handleAwardReward(assignment)}
                                    disabled={isAwarding === assignment.id || selectedStudentIds.length === 0}
                                >
                                    {isAwarding === assignment.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                                    Award Selected
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-40 bg-muted/20 rounded-3xl border-2 border-dashed">
                    <BookOpen className="w-16 h-16 text-slate-300" />
                    <p className="text-sm font-bold uppercase tracking-widest">No homework rewards saved yet</p>
                </div>
            )}
        </div>
    );
}

function TeacherClassesTab({
    teacherId,
    classes,
    isGraphic,
}: {
    teacherId: string;
    classes: Class[];
    isGraphic: boolean;
}) {
    const { addClass, updateClass } = useAppContext();
    const { toast } = useToast();
    const confirm = useConfirm();
    const [isCreateClassDialogOpen, setIsCreateClassDialogOpen] = useState(false);
    const [newClassName, setNewClassName] = useState('');
    const [isClaimDialogOpen, setIsClaimDialogOpen] = useState(false);
    const [isBusy, setIsBusy] = useState(false);

    const myClasses = useMemo(() => classes.filter((c) => c.primaryTeacherId === teacherId), [classes, teacherId]);
    const unassignedClasses = useMemo(() => classes.filter((c) => !c.primaryTeacherId), [classes]);

    const handleCreateClass = async () => {
        if (!newClassName.trim()) return;
        setIsBusy(true);
        try {
            await addClass({ name: newClassName.trim(), primaryTeacherId: teacherId });
            toast({ title: 'Class created', description: `"${newClassName}" has been created and assigned to you.` });
            setIsCreateClassDialogOpen(false);
            setNewClassName('');
        } catch (e) {
            toast({ variant: 'destructive', title: 'Failed to create class', description: (e as Error).message });
        } finally {
            setIsBusy(false);
        }
    };

    const handleClaimClass = async (classId: string) => {
        const cls = classes.find((c) => c.id === classId);
        if (!cls) return;
        setIsBusy(true);
        try {
            await updateClass({ ...cls, primaryTeacherId: teacherId });
            toast({ title: 'Class claimed', description: `You are now the primary teacher for "${cls.name}".` });
            setIsClaimDialogOpen(false);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Failed to claim class', description: (e as Error).message });
        } finally {
            setIsBusy(false);
        }
    };

    const handleUnlinkClass = async (cls: Class) => {
        const ok = await confirm({
            title: `Unlink from ${cls.name}?`,
            description:
                "You will no longer be the primary teacher for this class. Students will remain in the class but won't show on your roster unless directly linked.",
            confirmLabel: 'Unlink',
            destructive: true,
        });
        if (!ok) return;
        setIsBusy(true);
        try {
            await updateClass({ ...cls, primaryTeacherId: '' });
            toast({ title: 'Class unlinked' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Failed to unlink class', description: (e as Error).message });
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 items-center">
            <Card
                className={cn(
                    'w-full max-w-7xl border-t-8 transition-all duration-500 hover:shadow-2xl',
                    isGraphic
                        ? 'bg-card/60 backdrop-blur-2xl border-chart-1 shadow-[0_20px_50px_rgba(0,0,0,0.1)]'
                        : 'bg-white border-chart-1 shadow-lg',
                )}
            >
                <CardHeader className="p-4 md:p-6 pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-3">
                            <div
                                className={cn(
                                    'p-2 rounded-xl',
                                    isGraphic ? 'bg-chart-1/20 text-chart-1' : 'bg-primary/10 text-primary',
                                )}
                            >
                                <BookOpen className="w-6 h-6" />
                            </div>
                            Classes
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <TabWalkthroughHeaderAction />
                        <div className="flex items-center gap-2">
                            <TabWalkthroughHeaderAction />
                            <Button variant="outline" className="rounded-xl gap-2 h-10 px-4" onClick={() => setIsCreateClassDialogOpen(true)}>
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">New Class</span>
                            </Button>
                        </div>
                    </div>
                    </div>
                    <CardDescription className={isGraphic ? 'text-muted-foreground/80' : ''}>
                        Manage the classes you teach. Students in your classes are automatically added to your attendance and prize lists.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0">
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {myClasses.map((c) => (
                            <div
                                key={c.id}
                                className={cn(
                                    'flex items-center justify-between p-3 rounded-2xl border group transition-all hover:border-chart-1/50',
                                    isGraphic ? 'bg-background/40 border-white/10' : 'bg-muted/30',
                                )}
                            >
                                <span className="font-bold truncate px-1">{c.name}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => void handleUnlinkClass(c)}
                                    disabled={isBusy}
                                >
                                    <LogOut className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                        {unassignedClasses.length > 0 && (
                            <Button
                                variant="ghost"
                                className={cn(
                                    'h-auto p-3 border-2 border-dashed rounded-2xl flex flex-row items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-chart-1/50 transition-all',
                                    isGraphic ? 'border-white/10' : 'border-muted',
                                )}
                                onClick={() => setIsClaimDialogOpen(true)}
                            >
                                <Users className="w-5 h-5" />
                                <span className="text-xs font-bold uppercase tracking-wider">Claim Class</span>
                            </Button>
                        )}
                        {myClasses.length === 0 && unassignedClasses.length === 0 && (
                            <div className="col-span-full py-4 text-center text-sm text-muted-foreground italic">
                                No classes assigned. Create a new class or ask an admin to assign one to you.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isCreateClassDialogOpen} onOpenChange={setIsCreateClassDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create New Class</DialogTitle>
                        <DialogDescription>Enter a name for the new class. You will be assigned as the primary teacher.</DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center space-x-2 py-4">
                        <div className="grid flex-1 gap-2">
                            <Label htmlFor="className" className="sr-only">
                                Class Name
                            </Label>
                            <Input
                                id="className"
                                placeholder="e.g. Grade 5B"
                                value={newClassName}
                                onChange={(e) => setNewClassName(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter className="sm:justify-end">
                        <Button type="button" variant="secondary" onClick={() => setIsCreateClassDialogOpen(false)} disabled={isBusy}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            className="bg-chart-1 hover:bg-chart-1/90"
                            onClick={handleCreateClass}
                            disabled={isBusy || !newClassName.trim()}
                        >
                            {isBusy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                            Create Class
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isClaimDialogOpen} onOpenChange={setIsClaimDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Claim Unassigned Class</DialogTitle>
                        <DialogDescription>Choose an existing class to claim as yours.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-3 py-4 max-h-[300px] overflow-y-auto">
                        {unassignedClasses.map((c) => (
                            <Button
                                key={c.id}
                                variant="outline"
                                className="justify-between h-12 px-4 rounded-xl hover:border-chart-1/50 hover:bg-chart-1/5"
                                onClick={() => handleClaimClass(c.id)}
                                disabled={isBusy}
                            >
                                <span className="font-bold">{c.name}</span>
                                <Plus className="w-4 h-4 text-muted-foreground" />
                            </Button>
                        ))}
                    </div>
                    <DialogFooter className="sm:justify-start">
                        <Button type="button" variant="secondary" onClick={() => setIsClaimDialogOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function TeacherRosterTab({
    teacherId,
    allStudents,
    rosterStudents,
    classes,
    isGraphic,
}: {
    teacherId: string;
    allStudents: Student[];
    rosterStudents: Student[];
    classes: Class[];
    isGraphic: boolean;
}) {
    const { updateStudent } = useAppContext();
    const { toast } = useToast();
    const [search, setSearch] = useState('');
    const [busyStudentId, setBusyStudentId] = useState<string | null>(null);

    const classMap = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);
    const classIdsForTeacher = useMemo(
        () => new Set(classes.filter((c) => c.primaryTeacherId === teacherId).map((c) => c.id)),
        [classes, teacherId],
    );
    const normalizedSearch = search.trim().toLowerCase();

    const matchesSearch = (student: Student) => {
        if (!normalizedSearch) return true;
        return `${getStudentNickname(student)} ${student.lastName} ${student.nfcId || student.id}`.toLowerCase().includes(normalizedSearch);
    };

    const sortedStudents = (list: Student[]) =>
        list
            .filter(matchesSearch)
            .slice()
            .sort((a, b) => {
                const ln = a.lastName.localeCompare(b.lastName);
                if (ln !== 0) return ln;
                return getStudentNickname(a).localeCompare(getStudentNickname(b));
            });

    const roster = sortedStudents(rosterStudents);
    const addable = sortedStudents(allStudents.filter((s) => !(s.teacherIds || []).includes(teacherId)));

    const setTeacherLink = async (student: Student, linked: boolean) => {
        const current = student.teacherIds || [];
        const next = linked
            ? Array.from(new Set([...current, teacherId]))
            : current.filter((id) => id !== teacherId);
        setBusyStudentId(student.id);
        try {
            await updateStudent({ ...student, teacherIds: next });
            toast({ title: linked ? 'Student added to your roster' : 'Student removed from your roster' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Roster update failed', description: getReadableErrorMessage(e, 'Could not update this student.') });
        } finally {
            setBusyStudentId(null);
        }
    };

    const renderClassLabel = (student: Student) => {
        const cls = student.classId ? classMap.get(student.classId) : undefined;
        const classOwned = !!student.classId && classIdsForTeacher.has(student.classId);
        return `${cls?.name || 'Unassigned'}${classOwned ? ' · class roster' : ''}`;
    };

    const renderStudentInfo = (student: Student) => {
        const hasParentContact = !!(student.parentEmail?.trim() || student.parentPhone?.trim());
        const hasStudentContact = !!(student.studentEmail?.trim() || student.studentPhone?.trim());
        const pointTypeLine = formatStudentPointTypes(student, 5);

        return (
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="min-w-0 font-bold leading-tight sm:truncate">
                        {getStudentNickname(student)} {student.lastName}
                    </p>
                    <Badge variant="secondary" className="shrink-0 font-black tabular-nums">
                        {(student.points || 0).toLocaleString()} pts
                    </Badge>
                    {typeof student.lifetimePoints === 'number' ? (
                        <span className="text-[11px] font-semibold text-muted-foreground">
                            Lifetime {student.lifetimePoints.toLocaleString()}
                        </span>
                    ) : null}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {renderClassLabel(student)}
                    <span className="mx-1.5 text-border">|</span>
                    ID {student.nfcId || student.id}
                    {student.birthday ? (
                        <>
                            <span className="mx-1.5 text-border">|</span>
                            Birthday {student.birthday}
                        </>
                    ) : null}
                    {hasParentContact || hasStudentContact ? (
                        <>
                            <span className="mx-1.5 text-border">|</span>
                            Contact: {[hasParentContact ? 'parent' : '', hasStudentContact ? 'student' : ''].filter(Boolean).join(', ')}
                        </>
                    ) : null}
                </p>
                <p
                    className={cn(
                        'mt-0.5 truncate text-xs',
                        pointTypeLine === 'No point types yet' ? 'text-muted-foreground/75' : 'text-foreground/75',
                    )}
                    title={pointTypeLine}
                >
                    <span className="font-semibold text-muted-foreground">Types:</span> {pointTypeLine}
                </p>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-6 items-center">
            <Card className={cn(
                "w-full max-w-7xl border-t-8 transition-all duration-500 hover:shadow-2xl",
                isGraphic ? 'bg-card/60 backdrop-blur-2xl border-chart-4 shadow-[0_20px_50px_rgba(0,0,0,0.1)]' : 'bg-white border-chart-4 shadow-lg'
            )}>
                <CardHeader className="p-4 md:p-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <CardTitle className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-xl", isGraphic ? 'bg-chart-4/20 text-chart-4' : 'bg-primary/10 text-primary')}>
                            <Users className="w-6 h-6" />
                        </div>
                        Students
                    </CardTitle>
                    <TabWalkthroughHeaderAction />
                    <CardDescription className={isGraphic ? 'text-muted-foreground/80' : ''}>
                        Add or remove the direct student links for your teacher account. Students in classes you teach stay visible through that class.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-4 md:p-6 space-y-6">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search students..."
                            className={cn("h-11 rounded-xl pl-9", isGraphic ? 'bg-foreground/5 border-white/10' : 'bg-slate-50')}
                        />
                    </div>

                    <div className="grid gap-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">On my roster ({roster.length})</Label>
                            <ScrollArea className={cn("h-[calc(100vh-24rem)] max-h-[420px] min-h-[300px] rounded-2xl border p-3", isGraphic ? 'bg-foreground/5 border-white/10' : 'bg-muted/20')}>
                                <div className="space-y-2 pr-3">
                                    {roster.map((student) => {
                                        const directlyLinked = (student.teacherIds || []).includes(teacherId);
                                        return (
                                            <div key={student.id} className="flex items-center justify-between gap-3 rounded-xl border bg-background/70 p-3">
                                                {renderStudentInfo(student)}
                                                {directlyLinked ? (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="h-9 shrink-0 gap-2 rounded-xl text-destructive hover:bg-destructive/10"
                                                        disabled={busyStudentId === student.id}
                                                        onClick={() => void setTeacherLink(student, false)}
                                                    >
                                                        <Minus className="h-4 w-4" />
                                                        Remove
                                                    </Button>
                                                ) : (
                                                    <Badge variant="outline" className="shrink-0">Class</Badge>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {roster.length === 0 ? (
                                        <p className="py-10 text-center text-sm font-bold text-muted-foreground">No matching students on your roster.</p>
                                    ) : null}
                                </div>
                            </ScrollArea>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Add students ({addable.length})</Label>
                            <ScrollArea className={cn("h-[calc(100vh-24rem)] max-h-[420px] min-h-[300px] rounded-2xl border p-3", isGraphic ? 'bg-foreground/5 border-white/10' : 'bg-muted/20')}>
                                <div className="space-y-2 pr-3">
                                    {addable.map((student) => (
                                        <div key={student.id} className="flex items-center justify-between gap-3 rounded-xl border bg-background/70 p-3">
                                            {renderStudentInfo(student)}
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-9 shrink-0 gap-2 rounded-xl"
                                                disabled={busyStudentId === student.id}
                                                onClick={() => void setTeacherLink(student, true)}
                                            >
                                                <Plus className="h-4 w-4" />
                                                Add
                                            </Button>
                                        </div>
                                    ))}
                                    {addable.length === 0 ? (
                                        <p className="py-10 text-center text-sm font-bold text-muted-foreground">No matching students to add.</p>
                                    ) : null}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function RecentRedemptions({ schoolId, students, classes, teacherId }: { schoolId: string; students: Student[], classes: Class[], teacherId: string }) {
    const [redemptions, setRedemptions] = useState<(HistoryItem & { id: string; studentId: string; studentName: string; studentClass: string })[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterType, setFilterType] = useState<'all' | 'me'>('all');
    const firestore = useFirestore();
    const { togglePrizeFulfillment } = useAppContext();
    const { toast } = useToast();

    const classMap = useMemo(() => new Map(classes.map(c => [c.id, c.name])), [classes]);
    const getClassName = (classId: string) => classMap.get(classId) || 'Unassigned';

    const handleFulfillmentToggle = async (studentId: string, activityId: string, fulfilled: boolean) => {
        try {
            await togglePrizeFulfillment(studentId, activityId, fulfilled);
            setRedemptions(prev => prev.map(r =>
                r.id === activityId ? { ...r, fulfilled } : r
            ));
        } catch (e) {
            toast({
                variant: 'destructive',
                title: 'Update failed',
                description: (e as Error).message || 'Could not update fulfillment status.'
            });
        }
    };

    useEffect(() => {
        if (!students || !schoolId || !firestore) {
            setIsLoading(false);
            return;
        }

        const fetchRedemptions = async () => {
            setIsLoading(true);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 30); // Show last 30 days

            const allRedemptions: (HistoryItem & { id: string, studentId: string, studentName: string; studentClass: string })[] = [];

            // Fetch in batches of 40 to speed up loading and prevent sequential blocking
            const batchSize = 40;
            for (let i = 0; i < students.length; i += batchSize) {
                const batch = students.slice(i, i + batchSize);
                await Promise.all(batch.map(async (student) => {
                    const activitiesRef = collection(firestore, `schools/${schoolId}/students/${student.id}/activities`);
                    const q = query(activitiesRef, where('date', '>=', sevenDaysAgo.getTime()));

                    try {
                        const querySnapshot = await getDocs(q);
                        querySnapshot.forEach(doc => {
                            const activity = doc.data() as HistoryItem;
                            if (activity.desc.startsWith('Redeemed:')) {
                                allRedemptions.push({
                                    studentId: student.id,
                                    studentName: `${student.firstName} ${student.lastName}`,
                                    studentClass: classMap.get(student.classId || '') || 'Unassigned',
                                    ...activity,
                                    id: doc.id,
                                });
                            }
                        });
                    } catch (e) {
                        console.error(`Could not fetch activities for student ${student.id}`, e);
                    }
                }));
            }

            setRedemptions(allRedemptions.sort((a, b) => b.date - a.date));
            setIsLoading(false);
        };

        fetchRedemptions();
    }, [students, schoolId, firestore, classMap]);

    const filteredRedemptions = useMemo(() => {
        if (filterType === 'all') return redemptions;
        return redemptions.filter(r => r.teacherId === teacherId);
    }, [redemptions, filterType, teacherId]);

    return (
        <Card className="md:col-span-2 border-t-8 border-chart-3 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-xl font-black">
                        <Gift className="w-6 h-6 text-chart-3" />
                      Reward Redemptions
                    </CardTitle>
                    <CardDescription className="font-medium">
                        Student purchases that need to be delivered.
                    </CardDescription>
                </div>
                <div className="flex flex-col items-end gap-2">
                <TabWalkthroughHeaderAction />
                <Tabs value={filterType} onValueChange={(v: any) => setFilterType(v)} className="w-[200px]">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="all" className="text-xs font-bold">All</TabsTrigger>
                        <TabsTrigger value="me" className="text-xs font-bold">Mine</TabsTrigger>
                    </TabsList>
                </Tabs>
                </div>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-96">
                    {isLoading ? (
                        <div className="space-y-4 pr-4">
                            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                        </div>
                    ) : filteredRedemptions.length > 0 ? (
                        <ul className="space-y-3 pr-4">
                            {filteredRedemptions.map((item) => (
                                <li key={item.id} className={cn(
                                    "group flex justify-between items-center bg-white dark:bg-slate-900/50 p-4 rounded-2xl border transition-all hover:shadow-md",
                                    item.fulfilled ? "border-slate-100 opacity-60" : "border-chart-3/20 shadow-sm"
                                )}>
                                    <div className="flex items-center gap-4">
                                        <Checkbox
                                            id={`fulfilled-${item.id}`}
                                            checked={item.fulfilled}
                                            onCheckedChange={(checked) => handleFulfillmentToggle(item.studentId, item.id, !!checked)}
                                            className="w-6 h-6 rounded-lg data-[state=checked]:bg-chart-3 data-[state=checked]:border-chart-3"
                                        />
                                        <div>
                                            <p className="font-black text-slate-800 dark:text-slate-200 leading-none mb-1">
                                                {item.desc.replace('Redeemed: ', '')}
                                            </p>
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                                {item.studentName} <span className="opacity-40">|</span> {item.studentClass}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <Badge variant="outline" className="font-black text-primary bg-primary/10 border-primary/20 mb-1">
                                            {item.amount} pts
                                        </Badge>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase opacity-40">
                                            {new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric' })} @ {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-40">
                            <Gift className="w-16 h-16 text-slate-300" />
                            <p className="text-sm font-bold uppercase tracking-widest">No redemptions found</p>
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

function TeacherPrizeManager({
    schoolId,
    teacherId,
    teachers,
}: {
    schoolId: string;
    teacherId: string;
    teachers: Teacher[] | null | undefined;
}) {
    const firestore = useFirestore();
    const { addPrize, updatePrize, deletePrize } = useAppContext();
    const [isNewPrizeModalOpen, setIsNewPrizeModalOpen] = useState(false);

    const prizesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'prizes') : null, [firestore, schoolId]);
    const { data: prizes, isLoading: prizesLoading } = useCollection<Prize>(prizesQuery);

    const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'classes') : null, [firestore, schoolId]);
    const { data: classes, isLoading: classesLoading } = useCollection<Class>(classesQuery);

    const currentTeacher = teachers?.find((t) => t.id === teacherId);
    const teachersForPrizeModal = currentTeacher ? [currentTeacher] : [];

    if (prizesLoading || classesLoading) {
        return (
            <div className="space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
            </div>
        );
    }

    return (
        <>
            <AdminPrizesTab
                mode="teacher"
                teacherId={teacherId}
                schoolId={schoolId}
                prizes={prizes}
                teachers={null}
                classes={classes}
                onCreatePrize={(p) => addPrize(p)}
                onUpdatePrize={(p) => updatePrize(p)}
                onDeletePrize={(id) => deletePrize(id)}
                onOpenSimpleNewPrize={() => setIsNewPrizeModalOpen(true)}
            />
            <PrizeModal
                isOpen={isNewPrizeModalOpen}
                setIsOpen={setIsNewPrizeModalOpen}
                prize={null}
                teachers={teachersForPrizeModal}
                allClasses={classes || []}
                creatorTeacherId={teacherId}
            />
        </>
    );
}

function MyCoupons({ schoolId, teacherId, teacherName, students }: { schoolId: string; teacherId: string; teacherName: string; students: Student[] }) {
    const firestore = useFirestore();
    const couponsQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'coupons') : null, [firestore, schoolId]);
    const { data: coupons, isLoading } = useCollection<Coupon>(couponsQuery);
  
    const getStudentName = (studentId?: string) => {
      if (!studentId) return 'N/A';
      const student = students?.find(s => s.id === studentId);
      return student ? `${getStudentNickname(student)} ${student.lastName}` : `ID: ${studentId}`;
    };
  
    const myCoupons = useMemo(() => {
      if (!coupons) return [];
      return coupons
        .filter((c) => (c.createdByTeacherId ? c.createdByTeacherId === teacherId : c.teacher === teacherName))
        .sort((a, b) => b.createdAt - a.createdAt);
    }, [coupons, teacherId, teacherName]);
  
    const available = myCoupons.filter(c => !c.used);
    const redeemed = myCoupons.filter(c => c.used);
  
    return (
      <Card className="md:col-span-2 border-t-8 border-primary shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl font-black">
              <Ticket className="w-6 h-6 text-primary" />
              My Generated Coupons
            </CardTitle>
            <CardDescription className="font-medium">
              Coupons you have created, separated by availability.
            </CardDescription>
          </div>
          <TabWalkthroughHeaderAction />
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-base font-bold text-foreground/80 uppercase tracking-widest pl-1">Available ({available.length})</h3>
            <ScrollArea className="h-72 border border-border/60 rounded-xl bg-background/50 backdrop-blur-sm">
              {isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading coupons...</div> : available.length > 0 ? (
                <ul className="p-3 space-y-2">
                  {available.map((coupon) => {
                    const scopeLine = couponRedemptionLabelForPrint(coupon);
                    return (
                    <li key={coupon.id} className="p-4 bg-card rounded-xl border border-border/40 shadow-sm transition-all hover:shadow-md hover:border-primary/20 group">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-xs font-black bg-primary/10 text-primary px-2.5 py-1 rounded-md tracking-wider group-hover:bg-primary/20 transition-colors uppercase">{coupon.code}</span>
                        <span className="font-bold text-foreground">{coupon.value} pts</span>
                      </div>
                      <div className="text-[11px] font-medium text-muted-foreground mt-3 flex items-center justify-between">
                        <p className="bg-muted px-2 py-0.5 rounded-sm">{coupon.category}</p>
                        <p className="opacity-70">{new Date(coupon.createdAt).toLocaleDateString()}</p>
                      </div>
                      {(coupon.startsAt || coupon.expiresAt) && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {coupon.startsAt && <>Starts {new Date(coupon.startsAt).toLocaleDateString()}</>}
                          {coupon.startsAt && coupon.expiresAt && ' · '}
                          {coupon.expiresAt && <>Ends {new Date(coupon.expiresAt).toLocaleDateString()}</>}
                        </p>
                      )}
                      {scopeLine && (
                        <p className="text-[10px] text-amber-700 dark:text-amber-400/90 mt-1 font-medium">
                          {scopeLine}
                        </p>
                      )}
                    </li>
                  );})}
                </ul>
              ) : <p className="p-8 text-center text-sm text-muted-foreground font-medium italic">No available coupons created by you.</p>}
            </ScrollArea>
          </div>
          <div className="space-y-4">
            <h3 className="text-base font-bold text-foreground/60 uppercase tracking-widest pl-1">Redeemed ({redeemed.length})</h3>
            <ScrollArea className="h-72 border border-border/40 rounded-xl bg-background/40">
              {isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading coupons...</div> : redeemed.length > 0 ? (
                <ul className="p-3 space-y-2">
                  {redeemed.map(coupon => (
                    <li key={coupon.id} className="p-4 bg-card/60 rounded-xl border border-dashed border-border/60 grayscale-[0.5] opacity-70">
                      <div className="flex justify-between items-center grayscale">
                        <span className="font-mono text-xs font-black bg-muted text-muted-foreground px-2.5 py-1 rounded-md tracking-wider line-through uppercase">{coupon.code}</span>
                        <span className="font-bold text-muted-foreground">{coupon.value} pts</span>
                      </div>
                      <div className="text-[11px] font-medium text-muted-foreground mt-3">
                        <div className="flex justify-between items-center mb-1">
                           <span className="bg-muted/50 px-1.5 py-0.5 rounded-sm">{coupon.category}</span>
                           <span className="opacity-70">{coupon.usedAt ? new Date(coupon.usedAt).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <p className="text-[10px] font-bold text-foreground/60">Using as: {coupon.usedBy ? getStudentName(coupon.usedBy) : 'Unknown'}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <p className="p-8 text-center text-sm text-muted-foreground font-medium italic">No redeemed coupons yet.</p>}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    );
  }

function TeacherAttendancePanel({
    teacherId,
    classes,
    periods,
    categories,
    getConfig,
    saveConfig,
    loadLog,
}: {
    teacherId: string;
    classes: Class[];
    periods: AttendanceScheduleSlot[];
    categories: Category[];
    getConfig: (teacherId: string) => Promise<AttendanceSettings | null>;
    saveConfig: (teacherId: string, settings: AttendanceSettings) => Promise<void>;
    loadLog: (teacherId: string, limitCount?: number) => Promise<AttendanceLogEntry[]>;
}) {
    const { schoolId, addClass, updateClass } = useAppContext();
    const { toast } = useToast();
    const [config, setConfig] = useState<AttendanceSettings | null>(null);
    const [log, setLog] = useState<AttendanceLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [logLoading, setLogLoading] = useState(false);
    const [claimingClassId, setClaimingClassId] = useState<string | null>(null);

    const [isAddClassOpen, setIsAddClassOpen] = useState(false);
    const [newClassName, setNewClassName] = useState('');

    const dayOptions = [
        { key: 'all', label: 'All days' },
        { key: 'mon', label: 'Monday' },
        { key: 'tue', label: 'Tuesday' },
        { key: 'wed', label: 'Wednesday' },
        { key: 'thu', label: 'Thursday' },
        { key: 'fri', label: 'Friday' },
        { key: 'sat', label: 'Saturday' },
        { key: 'sun', label: 'Sunday' },
    ] as const;

    const getDayKeyFromDate = (d: Date): string => {
        const map = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        return map[d.getDay()] ?? 'mon';
    };

    const [attendanceDayKey, setAttendanceDayKey] = useState<string>(() => getDayKeyFromDate(new Date()));

    useEffect(() => {
        if (!schoolId || !teacherId) return;
        let cancelled = false;
        setLoading(true);
        getConfig(teacherId)
            .then((c) => {
                if (cancelled) return;
                if (c) {
                    setConfig(c);
                } else {
                    // Default starter config for new teachers
                    setConfig({
                        pointsForSignIn: 1,
                        pointsForOnTime: 5,
                        onTimeWindowMinutes: 5,
                        schedule: [],
                        teacherId,
                    });
                }
            })
            .catch((e) => {
                if (cancelled) return;
                console.error('Failed to load teacher attendance config', e);
                toast({
                    variant: 'destructive',
                    title: 'Attendance settings unavailable',
                    description: getReadableErrorMessage(e, 'Check Firestore rules for teacher attendance config access.'),
                });
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [schoolId, teacherId, getConfig, toast]);

    const handleSave = async () => {
        if (!config) return;
        setSaving(true);
        try {
            await saveConfig(teacherId, { ...config, teacherId });
            toast({ title: 'Attendance settings saved' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Failed to save', description: getReadableErrorMessage(e, 'Could not save attendance settings.') });
        } finally {
            setSaving(false);
        }
    };

    const refreshLog = async () => {
        setLogLoading(true);
        try {
            const entries = await loadLog(teacherId, 50);
            setLog(entries);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Failed to load log', description: getReadableErrorMessage(e, 'Could not load attendance log.') });
        } finally {
            setLogLoading(false);
        }
    };

    // --- All hook calls MUST stay above the conditional early return below ---
    const firestore = useFirestore();
    const rewardsQuery = useMemoFirebase(
        () => (schoolId && teacherId ? collection(firestore, 'schools', schoolId, 'teachers', teacherId, 'attendanceRewards') : null),
        [firestore, schoolId, teacherId]
    );

    if (loading || !config) {
        return <Skeleton className="h-40 w-full rounded-2xl" />;
    }

    const handleAddClass = async () => {
        if (!newClassName.trim()) return;
        try {
            await addClass({ name: newClassName.trim(), primaryTeacherId: teacherId });
            setNewClassName('');
            setIsAddClassOpen(false);
            toast({ title: 'Class created' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Failed to create class', description: (e as Error).message });
        }
    };

    const myClasses = (classes || []).filter((c) => c.primaryTeacherId === teacherId);
    const claimableClasses = (classes || []).filter((c) => !c.primaryTeacherId);
    const punctualityCategory = categories.find(c => c.name?.toLowerCase() === 'punctuality');

    const setEnabledForClass = (classId: string, enabled: boolean) => {
        const prev = config.enabledClassIds;
        // undefined means "all my classes"
        const base = prev ?? myClasses.map((c) => c.id);
        const next = enabled ? Array.from(new Set([...base, classId])) : base.filter((id) => id !== classId);
        const allIds = new Set(myClasses.map((c) => c.id));
        const nextFiltered = next.filter((id) => allIds.has(id));
        setConfig({
            ...config,
            enabledClassIds: nextFiltered.length === myClasses.length ? undefined : nextFiltered,
        });
    };

    const isClassEnabled = (classId: string) => {
        if (!myClasses.length) return false;
        if (!config.enabledClassIds || config.enabledClassIds.length === 0) return true; // all my classes
        return config.enabledClassIds.includes(classId);
    };

    const formatHHmmToAmPm = (hhmm: string): string => {
        const s = (hhmm || '').trim();
        const m = s.match(/^(\d{1,2}):(\d{2})$/);
        if (!m) return s;
        let h = Number(m[1]);
        const mins = m[2];
        if (Number.isNaN(h)) return s;
        const ap = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        if (h === 0) h = 12;
        return `${h}:${mins} ${ap}`;
    };

    const getAssignedSlotId = (classId: string): string => {
        const byDay = config.classPeriodAssignmentsByDay;
        const dayMap = byDay?.[attendanceDayKey];
        if (dayMap && Object.prototype.hasOwnProperty.call(dayMap, classId)) {
            return dayMap[classId] || '__none__';
        }

        // If not explicitly set for this day, allow "all days" fallback.
        if (attendanceDayKey !== 'all') {
            const allMap = byDay?.['all'];
            if (allMap && Object.prototype.hasOwnProperty.call(allMap, classId)) {
                return allMap[classId] || '__none__';
            }
        }

        return config.classPeriodAssignments?.[classId] || '__none__';
    };

    const setClassPeriodForDay = (classId: string, slotId: string) => {
        const nextByDay: Record<string, Record<string, string>> = { ...(config.classPeriodAssignmentsByDay || {}) };
        const nextDayMap: Record<string, string> = { ...(nextByDay[attendanceDayKey] || {}) };

        // Store "__none__" so this day/class explicitly overrides legacy mappings.
        if (!slotId || slotId === '__none__') nextDayMap[classId] = '__none__';
        else nextDayMap[classId] = slotId;

        nextByDay[attendanceDayKey] = nextDayMap;
        setConfig({
            ...config,
            classPeriodAssignmentsByDay: Object.keys(nextByDay).length ? nextByDay : undefined,
        });
    };
    const selectedCategory = categories.find((c) => c.id === config.categoryId);

    const applyToClass = async (classId: string) => {
        if (!schoolId || !teacherId || !updateClass) return;
        const target = (classes || []).find((c) => c.id === classId);
        if (!target) return;
        if (target.primaryTeacherId === teacherId) return;

        setClaimingClassId(classId);
        try {
            await updateClass({ ...target, primaryTeacherId: teacherId });
            toast({ title: 'Class claimed' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Failed to claim class', description: e?.message || String(e) });
        } finally {
            setClaimingClassId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">My classes</Label>
                    <p className="text-sm text-muted-foreground">Create classes you teach, then assign periods per day (your class order can change by day).</p>
                </div>
                <Dialog open={isAddClassOpen} onOpenChange={setIsAddClassOpen}>
                    <DialogTrigger asChild>
                        <Button type="button" variant="outline" className="rounded-xl h-10 font-bold">
                            <Plus className="w-4 h-4 mr-2" />
                            New Class
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black">Create Class</DialogTitle>
                            <DialogDescription>Add a class for your roster (e.g. "Period 1 - Science").</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2 py-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">Class name</Label>
                            <Input value={newClassName} onChange={(e) => setNewClassName(e.target.value)} className="h-12 rounded-xl" placeholder="Period 1 - Science" />
                        </div>
                        <DialogFooter>
                            <Button onClick={handleAddClass} className="w-full h-12 rounded-2xl font-black uppercase tracking-widest">
                                Create
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            {claimableClasses.length > 0 && (
                <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">Apply to a class</Label>
                    <p className="text-sm text-muted-foreground">
                        Claim an unassigned class so attendance rewards will apply to it.
                    </p>
                    <div className="space-y-2">
                        {claimableClasses.map((c) => (
                            <div
                                key={c.id}
                                className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border bg-background/30"
                            >
                                <div className="min-w-[180px]">
                                    <p className="font-bold">{c.name}</p>
                                    <p className="text-xs text-muted-foreground">Unassigned</p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={claimingClassId === c.id}
                                    onClick={() => applyToClass(c.id)}
                                    className="rounded-xl h-10 font-bold"
                                >
                                    {claimingClassId === c.id ? 'Applying...' : 'Apply'}
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-3">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">Which classes use this?</Label>
                {myClasses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No classes yet. Create a class below (or ask an admin to create one for you).
                    </p>
                ) : (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="att-all-my-classes"
                                checked={!config.enabledClassIds || config.enabledClassIds.length === 0}
                                onCheckedChange={(checked) => {
                                    setConfig({ ...config, enabledClassIds: checked ? undefined : myClasses.map((c) => c.id) });
                                }}
                            />
                            <Label htmlFor="att-all-my-classes" className="cursor-pointer font-semibold">
                                All my classes
                            </Label>
                        </div>
                        {!!config.enabledClassIds?.length && (
                            <div className="flex flex-wrap gap-3 pt-1">
                                {myClasses.map((c) => (
                                    <div key={c.id} className="flex items-center gap-2">
                                        <Checkbox
                                            id={`att-class-${c.id}`}
                                            checked={isClassEnabled(c.id)}
                                            onCheckedChange={(checked) => setEnabledForClass(c.id, !!checked)}
                                        />
                                        <Label htmlFor={`att-class-${c.id}`} className="cursor-pointer text-sm">
                                            {c.name}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {myClasses.length > 0 && (
                <div className="space-y-3">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">Assign periods to classes</Label>
                    <p className="text-sm text-muted-foreground">
                        Pick which period time applies to each class for the selected day. This controls "on time" for that class.
                    </p>

                    <div className="flex flex-wrap items-end gap-3 pt-1">
                        <div className="space-y-1">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">Day</Label>
                            <Select value={attendanceDayKey} onValueChange={setAttendanceDayKey}>
                                <SelectTrigger className="h-10 w-[190px] rounded-xl">
                                    <SelectValue placeholder="Select day..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {dayOptions.map((d) => (
                                        <SelectItem key={d.key} value={d.key}>
                                            {d.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {myClasses.map((c) => (
                            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border bg-background/30">
                                <div className="min-w-[180px]">
                                    <p className="font-bold">{c.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {isClassEnabled(c.id) ? 'Attendance enabled' : 'Attendance disabled'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id={`att-enable-${c.id}`}
                                            checked={isClassEnabled(c.id)}
                                            onCheckedChange={(checked) => setEnabledForClass(c.id, !!checked)}
                                        />
                                        <Label htmlFor={`att-enable-${c.id}`} className="text-sm cursor-pointer">
                                            Enabled
                                        </Label>
                                    </div>
                                    <Select
                                        value={getAssignedSlotId(c.id)}
                                        onValueChange={(v) => setClassPeriodForDay(c.id, v)}
                                        disabled={(periods || []).length === 0}
                                    >
                                        <SelectTrigger className="h-10 w-[220px] rounded-xl">
                                            <SelectValue placeholder="Assign a period..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">No period assigned</SelectItem>
                                            {(periods || []).map((slot) => (
                                                <SelectItem key={slot.id} value={slot.id}>
                                                    {slot.label} ({formatHHmmToAmPm(slot.startTime)}-{formatHHmmToAmPm(slot.endTime)})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">Points per sign-in</Label>
                    <Input
                        type="number"
                        min={0}
                        value={config.pointsForSignIn}
                        onChange={(e) => setConfig({ ...config, pointsForSignIn: parseInt(e.target.value, 10) || 0 })}
                        className="h-11 rounded-xl font-black"
                    />
                </div>
                <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">On-time bonus</Label>
                    <Input
                        type="number"
                        min={0}
                        value={config.pointsForOnTime}
                        onChange={(e) => setConfig({ ...config, pointsForOnTime: parseInt(e.target.value, 10) || 0 })}
                        className="h-11 rounded-xl font-black"
                    />
                </div>
                <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">On-time window (min)</Label>
                    <Input
                        type="number"
                        min={1}
                        max={120}
                        value={config.onTimeWindowMinutes}
                        onChange={(e) => setConfig({ ...config, onTimeWindowMinutes: parseInt(e.target.value, 10) || 15 })}
                        className="h-11 rounded-xl font-black"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">Universal periods</Label>
                {(periods || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No periods have been created yet. Ask an admin to create periods in Admin, then Attendance.
                    </p>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        Period times are managed by Admin and shared by all teachers.
                    </p>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">Attendance category (optional)</Label>
                    <Select
                        value={config.categoryId || '__none__'}
                        onValueChange={(v) => setConfig({ ...config, categoryId: v === '__none__' ? undefined : v })}
                    >
                        <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue placeholder="General points" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__none__">General points</SelectItem>
                            {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {selectedCategory && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                            Points will count toward <span className="font-semibold">{selectedCategory.name}</span>.
                        </p>
                    )}
                </div>
                <div className="flex items-end">
                    <Button onClick={handleSave} disabled={saving} className="w-full h-11 rounded-xl font-black uppercase tracking-widest">
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Settings
                    </Button>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1 flex items-center gap-2">
                        Recent sign-ins
                    </Label>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={refreshLog}
                        disabled={logLoading}
                        className="h-8 rounded-lg text-xs font-bold"
                    >
                        {logLoading && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                        Refresh
                    </Button>
                </div>
                <ScrollArea className="h-40 border rounded-2xl bg-background/40">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b text-left">
                                <th className="py-1 px-2 font-bold">Student</th>
                                <th className="py-1 px-2 font-bold">Time</th>
                                <th className="py-1 px-2 font-bold">Pts</th>
                            </tr>
                        </thead>
                        <tbody>
                            {log.map((entry) => (
                                <tr key={entry.id ?? entry.signedInAt} className="border-b border-border/40">
                                    <td className="py-1 px-2">{entry.studentName || entry.studentId}</td>
                                    <td className="py-1 px-2 text-muted-foreground">
                                        {new Date(entry.signedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="py-1 px-2">+{entry.pointsAwarded}</td>
                                </tr>
                            ))}
                            {log.length === 0 && !logLoading && (
                                <tr>
                                    <td colSpan={3} className="py-4 text-center text-muted-foreground">
                                        No sign-ins yet for your classes.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </ScrollArea>
            </div>
        </div>
    );
}

function TeacherAttendanceRewardsPanel({
  teacherId,
  classes,
  periods,
  categories,
}: {
  teacherId: string;
  classes: Class[];
  periods: AttendanceScheduleSlot[];
  categories: Category[];
}) {
  const firestore = useFirestore();
  const { schoolId, addCategory } = useAppContext();
  const { toast } = useToast();
  const confirm = useConfirm();

  // Teacher chooses from classes created in the school (admin-managed list).
  // Memoize so the fallback `[]` doesn't churn the identity and retrigger
  // the `selectedClassId` auto-pick effect below on every render.
  const availableClasses = useMemo(() => classes || [], [classes]);
  const punctualityCategory = categories.find((c) => (c.name || '').toLowerCase() === 'punctuality');

  const rewardsQuery = useMemoFirebase(
    () => (schoolId && teacherId ? collection(firestore, 'schools', schoolId, 'teachers', teacherId, 'attendanceRewards') : null),
    [firestore, schoolId, teacherId]
  );
  const { data: rules, isLoading } = useCollection<AttendanceRewardRule>(rewardsQuery);

  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [periodMode, setPeriodMode] = useState<'universal' | 'custom'>('universal');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [customLabel, setCustomLabel] = useState('Custom Period');
  const [customStart, setCustomStart] = useState('08:00');
  const [customEnd, setCustomEnd] = useState('08:45');

  const [pointsForSignIn, setPointsForSignIn] = useState('1');
  const [pointsForOnTime, setPointsForOnTime] = useState('5');
  const [onTimeWindowMinutes, setOnTimeWindowMinutes] = useState('5');
  const [categoryId, setCategoryId] = useState<string>(punctualityCategory?.id || '__none__');
  const [saving, setSaving] = useState(false);

  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('Punctuality');
  const [newCategoryPoints, setNewCategoryPoints] = useState('5');

  useEffect(() => {
    if (!selectedClassId && availableClasses.length) setSelectedClassId(availableClasses[0].id);
  }, [selectedClassId, availableClasses]);

  useEffect(() => {
    if (!selectedPeriodId && (periods || []).length) setSelectedPeriodId(periods[0].id);
  }, [selectedPeriodId, periods]);

  useEffect(() => {
    if (punctualityCategory?.id && categoryId === '__none__') setCategoryId(punctualityCategory.id);
  }, [punctualityCategory?.id, categoryId]);

  const handleAddAttendanceCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({ variant: 'destructive', title: 'Category name required' });
      return;
    }
    const pts = parseInt(newCategoryPoints, 10);
    if (!Number.isFinite(pts) || pts <= 0) {
      toast({ variant: 'destructive', title: 'Points must be positive' });
      return;
    }
    if (!addCategory) return;
    try {
      const { pickDistinctCategoryColor } = await import('@/lib/utils');
      const created = await addCategory({
        name: newCategoryName.trim(),
        points: pts,
        teacherId,
        color: pickDistinctCategoryColor((categories || []).map((c) => c.color)),
      });
      if (created?.id) {
        setCategoryId(created.id);
        setIsAddCategoryOpen(false);
        toast({ title: 'Category created' });
      }
    } catch (e: any) {
      const msg = e?.message || String(e);
      const code = e?.code ? ` (${e.code})` : '';
      console.error('Attendance category create failed', e);
      toast({ variant: 'destructive', title: `Failed to create category${code}`, description: msg });
    }
  };

  const createRule = async () => {
    if (!schoolId || !teacherId) return;
    if (!selectedClassId) return toast({ variant: 'destructive', title: 'Choose a class' });
    if (periodMode === 'universal' && !selectedPeriodId) return toast({ variant: 'destructive', title: 'Choose a period' });
    if (periodMode === 'custom' && (!customLabel.trim() || !customStart.trim() || !customEnd.trim())) {
      return toast({ variant: 'destructive', title: 'Custom period needs label + times' });
    }

    setSaving(true);
    try {
      const selectedClass = availableClasses.find((c) => c.id === selectedClassId);
      const className = selectedClass?.name;
      const id = `ar_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const rule: AttendanceRewardRule = {
        id,
        teacherId,
        classId: selectedClassId,
        className,
        pointsForSignIn: parseInt(pointsForSignIn, 10) || 0,
        pointsForOnTime: parseInt(pointsForOnTime, 10) || 0,
        onTimeWindowMinutes: parseInt(onTimeWindowMinutes, 10) || 3,
        enabled: true,
        createdAt: Date.now(),
      };

      // Firestore rejects `undefined` values; only include optional fields when set.
      const payload: AttendanceRewardRule = {
        ...rule,
        ...(periodMode === 'universal' && selectedPeriodId ? { periodId: selectedPeriodId } : {}),
        ...(periodMode === 'custom'
          ? { customPeriod: { label: customLabel.trim(), startTime: customStart.trim(), endTime: customEnd.trim() } }
          : {}),
        ...(categoryId && categoryId !== '__none__' ? { categoryId } : {}),
      };
      await setDoc(doc(firestore, 'schools', schoolId, 'teachers', teacherId, 'attendanceRewards', id), payload);
      toast({ title: 'Attendance reward created' });
      // Keep selections so teacher can quickly create another rule.
    } catch (e: any) {
      const msg = e?.message || String(e);
      const code = e?.code ? ` (${e.code})` : '';
      console.error('Attendance reward save failed', e);
      toast({ variant: 'destructive', title: `Failed to save${code}`, description: msg });
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    if (!schoolId || !teacherId) return;
    await updateDoc(doc(firestore, 'schools', schoolId, 'teachers', teacherId, 'attendanceRewards', ruleId), { enabled });
  };

  const deleteRule = async (ruleId: string) => {
    if (!schoolId || !teacherId) return;
    const ok = await confirm({
      title: 'Delete this attendance reward?',
      description: 'Future attendance will no longer earn points from this rule. Past awards already issued stay with students.',
      confirmLabel: 'Delete reward',
      destructive: true,
    });
    if (!ok) return;
    await deleteDoc(doc(firestore, 'schools', schoolId, 'teachers', teacherId, 'attendanceRewards', ruleId));
  };

  const describePeriod = (r: AttendanceRewardRule) => {
    if (r.customPeriod) return `${r.customPeriod.label} (${r.customPeriod.startTime}-${r.customPeriod.endTime})`;
    const p = (periods || []).find((x) => x.id === r.periodId);
    return p ? `${p.label} (${p.startTime}-${p.endTime})` : 'Unknown period';
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">Create attendance rule</Label>
        <p className="text-sm text-muted-foreground">Choose one class and one period, then set the points students earn when they check in.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">Class</Label>
          <Select value={selectedClassId || '__none__'} onValueChange={setSelectedClassId}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Choose class..." />
            </SelectTrigger>
            <SelectContent>
              {availableClasses.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
              {availableClasses.length === 0 && <SelectItem value="__none__" disabled>No classes yet</SelectItem>}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">Period</Label>
          <Tabs value={periodMode} onValueChange={(v) => setPeriodMode(v as 'universal' | 'custom')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-xl">
              <TabsTrigger value="universal" className="rounded-lg text-xs font-bold">From Admin</TabsTrigger>
              <TabsTrigger value="custom" className="rounded-lg text-xs font-bold">Custom</TabsTrigger>
            </TabsList>
            <TabsContent value="universal" className="pt-3">
              <Select value={selectedPeriodId || '__none__'} onValueChange={setSelectedPeriodId} disabled={(periods || []).length === 0}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder={(periods || []).length ? 'Choose period...' : 'No periods created yet'} />
                </SelectTrigger>
                <SelectContent>
                  {(periods || []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.label} ({p.startTime}-{p.endTime})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TabsContent>
            <TabsContent value="custom" className="pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} className="h-11 rounded-xl" placeholder="Label" />
                <Input value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-11 rounded-xl font-mono" placeholder="08:00" />
                <Input value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-11 rounded-xl font-mono" placeholder="08:45" />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">Points</Label>
          <Input type="number" min={0} value={pointsForSignIn} onChange={(e) => setPointsForSignIn(e.target.value)} className="h-11 rounded-xl font-black" />
        </div>
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">On-time bonus</Label>
          <Input type="number" min={0} value={pointsForOnTime} onChange={(e) => setPointsForOnTime(e.target.value)} className="h-11 rounded-xl font-black" />
        </div>
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">On-time window (min)</Label>
          <Input type="number" min={1} max={120} value={onTimeWindowMinutes} onChange={(e) => setOnTimeWindowMinutes(e.target.value)} className="h-11 rounded-xl font-black" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">Category</Label>
          <div className="flex items-center gap-2">
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Punctuality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="icon" className="h-11 w-11 rounded-xl">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black">New Attendance Category</DialogTitle>
                  <DialogDescription>Create a category (defaults to "Punctuality").</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">Name</Label>
                    <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="h-12 rounded-xl" placeholder="Punctuality" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">Default points</Label>
                    <Input type="number" value={newCategoryPoints} onChange={(e) => setNewCategoryPoints(e.target.value)} className="h-12 rounded-xl font-black" />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddAttendanceCategory} className="w-full h-12 rounded-2xl font-black uppercase tracking-widest">
                    Create Category
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          {!punctualityCategory && (
            <p className="text-[11px] text-muted-foreground mt-1">Create a category named "Punctuality" to make it the default.</p>
          )}
        </div>
        <div className="flex items-end">
          <Button onClick={createRule} disabled={saving} className="w-full h-11 rounded-xl font-black uppercase tracking-widest">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Create reward
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">My rewards</Label>
        {isLoading ? (
          <Skeleton className="h-24 w-full rounded-2xl" />
        ) : (rules || []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No attendance rules yet. Create one above, then test a student sign-in during that period.</p>
        ) : (
        <ScrollArea className="h-[calc(100vh-32rem)]">
          <div className="space-y-2">
            {(rules || []).slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border bg-background/30">
                <div className="min-w-[240px]">
                  <p className="font-bold">{r.className || availableClasses.find(c => c.id === r.classId)?.name || r.classId}</p>
                  <p className="text-xs text-muted-foreground">{describePeriod(r)} | +{r.pointsForSignIn} (+{r.pointsForOnTime} on time)</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={!!r.enabled} onCheckedChange={(v) => toggleRule(r.id, !!v)} />
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Enabled</span>
                  </div>
                  <Button variant="ghost" size="icon" className="text-red-600" onClick={() => deleteRule(r.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        )}
      </div>
    </div>
    );
}

export function TeacherPrinterInner({
    teacherName,
    teacherId,
    onLogout,
    secretaryMode = false,
    /** Render inside unified `/admin` staff shell (no duplicate page header). */
    embedded = false,
}: {
    teacherName: string;
    teacherId: string;
    onLogout: () => void;
    secretaryMode?: boolean;
    embedded?: boolean;
}) {
    if (embedded) {
        return (
            <TeacherPrinterInnerBody
                teacherName={teacherName}
                teacherId={teacherId}
                onLogout={onLogout}
                secretaryMode={secretaryMode}
                embedded
            />
        );
    }

    return (
        <StaffPortalLayoutProvider>
            <TeacherPrinterInnerBody
                teacherName={teacherName}
                teacherId={teacherId}
                onLogout={onLogout}
                secretaryMode={secretaryMode}
                embedded={false}
            />
        </StaffPortalLayoutProvider>
    );
}

function TeacherPrinterInnerBody({
    teacherName,
    teacherId,
    onLogout,
    secretaryMode = false,
    embedded = false,
}: {
    teacherName: string;
    teacherId: string;
    onLogout: () => void;
    secretaryMode?: boolean;
    embedded?: boolean;
}) {
    const {
        updateTeacher,
        updateStudent,
        deleteCategory,
        schoolId,
        addPrize,
        updatePrize,
        deletePrize,
        getTeacherAttendanceConfig,
        setTeacherAttendanceConfig,
        listTeacherAttendanceLog,
        isAdmin,
        isTeacher,
        addHouse,
        updateHouse,
        deleteHouse,
    } = useAppContext();
    const confirm = useConfirm();
    const { toast } = useToast();
    const firestore = useFirestore();
    const { settings, updateSettings } = useSettings();

    const teachersQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'teachers') : null, [firestore, schoolId]);
    const { data: teachers, isLoading: teachersLoading } = useCollection<Teacher>(teachersQuery);
    const currentTeacher = teachers?.find(t => t.id === teacherId);
    /** Admin and leadership staff can act on the whole school while keeping teacher tabs/tools. */
    const schoolWideTeacherScope = secretaryMode || isAdmin || isLeadershipPersonnel(currentTeacher);
    const isGraphic = settings.graphicMode === 'graphics';
    const animBackdrop = globalAnimatedBackdropActive(settings);
    const playSound = useArcadeSound();

    const staffPortalRole = secretaryMode ? 'secretary' : 'teacher';
    const { isWide } = useStaffPortalLayout();
    const { mainTabs, addMoreTabs, allTabValues, defaultTab } = useStaffPortalTabs({
        role: staffPortalRole,
        settings,
        pinnedAddOnValues: settings.teacherPinnedAddOnTabs || [],
        mainTabOrder: settings.teacherMainTabOrder,
    });

    const teacherTabEnabled = useMemo(
        () => (tabId: string) => allTabValues.includes(tabId),
        [allTabValues],
    );

    const [activeTeacherTab, setActiveTeacherTab] = useState(defaultTab);
    const [pendingTeacherAwardCount, setPendingTeacherAwardCount] = useState(0);

    const toggleTeacherPinnedAddOn = (tabValue: string, pinned: boolean) => {
        const now = settings.teacherPinnedAddOnTabs || [];
        if (pinned) {
            if (!allTabValues.includes(tabValue)) return;
            const next = [...new Set([...now, tabValue])];
            updateSettings({
                teacherPinnedAddOnTabs: next,
                ...staffPortalTeacherPinSideEffects(tabValue, true),
            });
            setActiveTeacherTab(tabValue);
            return;
        }
        updateSettings({ teacherPinnedAddOnTabs: now.filter((v) => v !== tabValue) });
        if (activeTeacherTab === tabValue) setActiveTeacherTab(defaultTab);
    };

    const teacherPinnedAddOnSet = useMemo(
        () => new Set(settings.teacherPinnedAddOnTabs || []),
        [settings.teacherPinnedAddOnTabs],
    );

    const resolvedTeacherTab = useMemo(() => {
        if (secretaryMode) return 'coupons';
        return staffPortalTabIsValid(activeTeacherTab, allTabValues) ? activeTeacherTab : defaultTab;
    }, [secretaryMode, activeTeacherTab, allTabValues, defaultTab]);

    useEffect(() => {
        if (!schoolId || secretaryMode) {
            setPendingTeacherAwardCount(0);
            return;
        }
        const refresh = () => setPendingTeacherAwardCount(countPendingTeacherAwards(schoolId));
        refresh();
        const onVis = () => {
            if (document.visibilityState === 'visible') refresh();
        };
        if (typeof window !== 'undefined') {
            window.addEventListener('online', refresh);
            window.addEventListener('arcade-pending-teacher-awards', refresh);
            document.addEventListener('visibilitychange', onVis);
            return () => {
                window.removeEventListener('online', refresh);
                window.removeEventListener('arcade-pending-teacher-awards', refresh);
                document.removeEventListener('visibilitychange', onVis);
            };
        }
        return undefined;
    }, [schoolId, secretaryMode]);

    const categoriesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'categories') : null, [firestore, schoolId]);
    const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);

    const studentsQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'students') : null, [firestore, schoolId]);
    const { data: students, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);

    const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'classes') : null, [firestore, schoolId]);
    const { data: classes, isLoading: classesLoading } = useCollection<Class>(classesQuery);

    const housesQuery = useMemoFirebase(
        () => (schoolId && settings.enableHouses ? collection(firestore, 'schools', schoolId, 'houses') : null),
        [firestore, schoolId, settings.enableHouses],
    );
    const { data: houses, isLoading: housesLoading } = useCollection<House>(housesQuery);

    const periodsQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'periods') : null, [firestore, schoolId]);
    const { data: periods, isLoading: periodsLoading } = useCollection<AttendanceScheduleSlot>(periodsQuery);

    const studentsForTeacherActions = useMemo(() => {
        if (schoolWideTeacherScope) return students ?? [];
        if (!teacherId) return students ?? [];
        return studentsInTeacherScope(teacherId, students ?? [], classes ?? []);
    }, [schoolWideTeacherScope, teacherId, students, classes]);

    /** Class filters and coupon class lists: students’ classes plus classes this teacher owns as primary. */
    const classesForTeacherUi = useMemo(() => {
        if (secretaryMode) return classes ?? [];
        if (schoolWideTeacherScope) {
            const cls = classes ?? [];
            return cls.slice().sort((a, b) => a.name.localeCompare(b.name));
        }
        const cls = classes ?? [];
        const fromStudents = new Set(
            studentsForTeacherActions.map((s) => s.classId).filter((id): id is string => Boolean(id)),
        );
        return cls
            .filter((c) => fromStudents.has(c.id) || c.primaryTeacherId === teacherId)
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [secretaryMode, schoolWideTeacherScope, classes, studentsForTeacherActions, teacherId]);

    const schoolDocRef = useMemoFirebase(
        () => (schoolId && firestore ? doc(firestore, 'schools', schoolId) : null),
        [firestore, schoolId],
    );
    const { data: schoolDocData } = useDoc<{ name?: string }>(schoolDocRef);

    const couponsQuery = useMemoFirebase(() => (schoolId ? collection(firestore, 'schools', schoolId, 'coupons') : null), [firestore, schoolId]);
    const { data: coupons } = useCollection<Coupon>(couponsQuery);

    const prizesQuery = useMemoFirebase(() => (schoolId ? collection(firestore, 'schools', schoolId, 'prizes') : null), [firestore, schoolId]);
    const { data: prizes } = useCollection<Prize>(prizesQuery);

    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const managerTeacherId = currentTeacher?.id;

    const handleOpenCategoryModal = (category: Category | null) => {
        setEditingCategory(category);
        setIsCategoryModalOpen(true);
    };

    const isLoading = secretaryMode
        ? categoriesLoading
        : categoriesLoading ||
          studentsLoading ||
          classesLoading ||
          periodsLoading ||
          teachersLoading ||
          (settings.enableHouses && housesLoading);
    const teacherAccent = 'hsl(var(--primary))';

    const { teacherDocId, userId } = useAppContext();

    // Wait until the teachers collection has emitted at least once (`teachers` becomes an array).
    // Otherwise students can finish loading first and we briefly show this card while `currentTeacher` is still unresolved.
    const teacherProfileReady = teachers !== null && !teachersLoading;
    if (isTeacher && !isAdmin && !secretaryMode && !currentTeacher && teacherProfileReady && !studentsLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px] p-6">
                <Card className="w-full max-w-md border-t-8 border-destructive shadow-2xl">
                    <CardHeader className="text-center">
                        <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <UserCheck className="w-8 h-8" />
                        </div>
                        <CardTitle className="text-xl font-bold">Profile Linking Error</CardTitle>
                        <CardDescription>
                            Your staff account is not correctly linked to a teacher profile in this school. 
                            This prevents your students from appearing in your roster.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-xl text-xs font-mono break-all space-y-1">
                            <p><span className="text-muted-foreground">School:</span> {schoolId}</p>
                            <p><span className="text-muted-foreground">User ID:</span> {userId}</p>
                            <p><span className="text-muted-foreground">Teacher ID:</span> {teacherId}</p>
                            <p><span className="text-muted-foreground">Context Doc ID:</span> {teacherDocId || 'none'}</p>
                        </div>
                        <Button variant="outline" className="w-full rounded-xl" onClick={onLogout}>
                            Logout and Try Again
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div
                className={cn(
                    'bg-background transition-colors duration-500 relative overflow-x-hidden font-sans flex min-h-0 flex-col',
                    embedded ? 'flex-1 w-full' : 'min-h-screen',
                )}
                style={
                    embedded
                        ? undefined
                        : (appearanceVarsForSurface(settings, 'print') as React.CSSProperties)
                }
            >
                {/* Local orbs/noise only when global animated backdrop is off */}
                {!embedded && isGraphic && !animBackdrop && (
                    <>
                        <div className="pointer-events-none fixed inset-0 opacity-[0.03] z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
                        <div className="pointer-events-none fixed -top-24 -left-24 h-[500px] w-[500px] rounded-full bg-chart-1/10 blur-[120px] z-0 animate-pulse-slow" />
                        <div className="pointer-events-none fixed top-1/2 -right-24 h-[600px] w-[600px] rounded-full bg-chart-2/10 blur-[140px] z-0" />
                        <div className="pointer-events-none fixed -bottom-24 left-1/4 h-[400px] w-[400px] rounded-full bg-chart-3/10 blur-[100px] z-0" />
                    </>
                )}

                <TeacherPortalShell
                    embedded={embedded}
                    className={cn('relative z-10', settings.displayMode === 'app' && !embedded && 'pb-24')}
                >
                    {pendingTeacherAwardCount > 0 && !secretaryMode ? (
                        <div
                            role="status"
                            className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
                        >
                            <strong className="font-bold">Offline awards pending:</strong>{' '}
                            {pendingTeacherAwardCount} batch{pendingTeacherAwardCount === 1 ? '' : 'es'} will sync when you are online.
                        </div>
                    ) : null}
                    {!embedded ? (
                    <div
                      className={cn(
                        'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
                        staffPortalPageIntroClassName(isWide),
                      )}
                    >
                        <Helper content={secretaryMode ? 'Generate coupon sheets for teachers to hand out. You cannot award points or edit prizes from here.' : 'Use Points to print coupon sheets from school categories, or open Manually Add or Deduct Points for direct changes without a printed coupon. Prizes, attendance, and reports are also here.'}>
                            <div>
                                <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                                    {secretaryMode ? 'Secretary — coupon printing' : 'Teacher portal'}
                                </h2>
                                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                    {secretaryMode
                                        ? 'Print coupon batches from your school\'s point categories.'
                                        : 'Points, classes, prizes, and reports — pick a tab to get started.'}
                                </p>
                                {teacherName ? (
                                    <p className="text-sm text-muted-foreground mt-1">
                                        <span className="font-medium text-foreground/80">{teacherName}</span>
                                        {settings.enableTeacherBudgets && currentTeacher?.monthlyBudget !== undefined ? (
                                            <>
                                                {' '}
                                                |{' '}
                                                {(remainingTeacherBudgetPoints(currentTeacher) ?? 0).toLocaleString()} pts remaining{' '}
                                                {teacherBudgetRemainingPhrase(resolveTeacherBudgetPeriod(currentTeacher))}
                                            </>
                                        ) : null}
                                    </p>
                                ) : null}
                            </div>
                        </Helper>
                        <div className="flex flex-wrap gap-2 shrink-0 sm:self-start justify-end items-center">
                            <StaffPortalLayoutToggle />
                            {secretaryMode && (
                                <Button variant="outline" onClick={onLogout} className="gap-2 rounded-lg h-10">
                                    <LogOut className="w-4 h-4" />
                                    <span className="hidden sm:inline">Log out</span>
                                </Button>
                            )}
                        </div>
                    </div>
                    ) : settings.enableTeacherBudgets && currentTeacher?.monthlyBudget !== undefined ? (
                        <p className="text-sm text-muted-foreground">
                            {(remainingTeacherBudgetPoints(currentTeacher) ?? 0).toLocaleString()} pts remaining{' '}
                            {teacherBudgetRemainingPhrase(resolveTeacherBudgetPeriod(currentTeacher))}
                        </p>
                    ) : null}

                    <div className="flex min-h-0 w-full flex-1 flex-col">
                        <Tabs
                            value={resolvedTeacherTab}
                            onValueChange={(v) => {
                                if (!secretaryMode) setActiveTeacherTab(v);
                            }}
                            className="flex min-h-0 w-full flex-1 flex-col gap-6 lg:flex-row lg:items-start"
                        >
                        {!secretaryMode ? (
                            <StaffPortalNav
                                role="teacher"
                                activeTab={resolvedTeacherTab}
                                onTabChange={setActiveTeacherTab}
                                mainTabs={mainTabs}
                                addMoreTabs={addMoreTabs}
                                onAddTab={(value) => toggleTeacherPinnedAddOn(value, true)}
                                removableTabValues={teacherPinnedAddOnSet}
                                onRemoveTab={(value) => toggleTeacherPinnedAddOn(value, false)}
                                className="lg:w-60 lg:shrink-0"
                                addMoreMenu={
                                    <TeacherPortalAddMoreMenu
                                        tabs={addMoreTabs}
                                        onAddTab={(value) => toggleTeacherPinnedAddOn(value, true)}
                                    />
                                }
                            />
                        ) : null}

                            <div className="min-h-0 min-w-0 w-full flex-1">
                            <TabWalkthroughProvider
                                scope="teacher"
                                tabId={resolvedTeacherTab}
                            >
                            {teacherTabEnabled('welcome') && !secretaryMode && (
                            <TeacherPortalTabPane tabId="welcome" activeTab={resolvedTeacherTab} className={teacherPortalTabContentClassName}>
                                <div className={teacherPortalPanelClassName(isWide)}>
                                <StaffPortalWelcomeTab
                                    role="teacher"
                                    settings={settings}
                                    onGoToTab={setActiveTeacherTab}
                                    displayName={teacherName}
                                />
                                </div>
                            </TeacherPortalTabPane>
                            )}

                            {teacherTabEnabled('coupons') && (
                            <TeacherPortalTabPane tabId="coupons" activeTab={resolvedTeacherTab} className={teacherPortalTabContentClassName}>
                                <div className={teacherPortalPanelClassName(isWide)}>
                                <CategoryModal
                                    isOpen={isCategoryModalOpen}
                                    setIsOpen={setIsCategoryModalOpen}
                                    category={editingCategory}
                                    defaultTeacherId={schoolWideTeacherScope ? undefined : managerTeacherId}
                                />
                                <StaffPointsTab
                                    variant="teacher"
                                    schoolId={schoolId!}
                                    categories={categories}
                                    teachers={teachers}
                                    classes={classes}
                                    students={studentsForTeacherActions}
                                    printOnly={secretaryMode}
                                    managerTeacherId={managerTeacherId}
                                    schoolWideAccess={schoolWideTeacherScope && !secretaryMode}
                                    issuerDisplayName={teacherName}
                                    isGraphic={isGraphic}
                                    printAccentColor={teacherAccent}
                                    className={teacherPortalPanelClassName(isWide)}
                                    onAddCategory={!secretaryMode ? () => handleOpenCategoryModal(null) : undefined}
                                    onEditCategory={!secretaryMode ? (c) => handleOpenCategoryModal(c) : undefined}
                                    onDeleteCategory={
                                        schoolWideTeacherScope
                                            ? async (id) => {
                                                  const cat = (categories || []).find((c) => c.id === id);
                                                  const ok = await confirm({
                                                      title: cat ? `Delete category "${cat.name}"?` : 'Delete this category?',
                                                      description:
                                                          'Past activity entries that referenced this category will keep their label but you won\'t be able to award with it anymore.',
                                                      confirmLabel: 'Delete category',
                                                      destructive: true,
                                                  });
                                                  if (!ok) return;
                                                  await deleteCategory(id);
                                              }
                                            : async (id) => {
                                                  const cat = (categories || []).find((c) => c.id === id);
                                                  if (!cat || !managerTeacherId || cat.teacherId !== managerTeacherId) return;
                                                  const ok = await confirm({
                                                      title: `Delete category "${cat.name}"?`,
                                                      description:
                                                          'Past activity entries that referenced this category will keep their label but you won\'t be able to award with it anymore.',
                                                      confirmLabel: 'Delete category',
                                                      destructive: true,
                                                  });
                                                  if (!ok) return;
                                                  await deleteCategory(id);
                                              }
                                    }
                                    manualBudgetOptions={
                                        isAdmin
                                            ? undefined
                                            : {
                                                  isAdmin: false,
                                                  currentTeacher: currentTeacher ?? null,
                                                  onBudgetSpend: async (totalCost) => {
                                                      if (!currentTeacher) return;
                                                      const next =
                                                          currentTeacher.monthlyBudget !== undefined
                                                              ? teacherWithBudgetAfterSpend(currentTeacher, totalCost)
                                                              : {
                                                                    ...currentTeacher,
                                                                    spentThisMonth: (currentTeacher.spentThisMonth || 0) + totalCost,
                                                                };
                                                      await updateTeacher(next);
                                                  },
                                              }
                                    }
                                    teacherBudget={
                                        !secretaryMode && !isAdmin
                                            ? {
                                                  currentTeacher: currentTeacher ?? null,
                                                  onBudgetSpend: async (totalCost) => {
                                                      if (!currentTeacher) return;
                                                      const next =
                                                          currentTeacher.monthlyBudget !== undefined
                                                              ? teacherWithBudgetAfterSpend(currentTeacher, totalCost)
                                                              : {
                                                                    ...currentTeacher,
                                                                    spentThisMonth: (currentTeacher.spentThisMonth || 0) + totalCost,
                                                                };
                                                      await updateTeacher(next);
                                                  },
                                              }
                                            : undefined
                                    }
                                />
                                </div>
                            </TeacherPortalTabPane>
                            )}

                            {teacherTabEnabled('classroom') && (
                            <TeacherPortalTabPane tabId="classroom" activeTab={resolvedTeacherTab} className={teacherPortalTabContentClassName}>
                                <div className={teacherPortalPanelClassName(isWide)}>
                                <StaffClassroomTab
                                    variant="teacher"
                                    schoolId={schoolId!}
                                    categories={categories}
                                    classes={classes}
                                    students={studentsForTeacherActions}
                                    managerTeacherId={managerTeacherId}
                                    schoolWideAccess={schoolWideTeacherScope && !secretaryMode}
                                    isGraphic={isGraphic}
                                    manualAccentColor={teacherAccent}
                                    className={teacherPortalPanelClassName(isWide)}
                                    manualBudgetOptions={
                                        isAdmin
                                            ? undefined
                                            : {
                                                  isAdmin: false,
                                                  currentTeacher: currentTeacher ?? null,
                                                  onBudgetSpend: async (totalCost) => {
                                                      if (!currentTeacher) return;
                                                      const next =
                                                          currentTeacher.monthlyBudget !== undefined
                                                              ? teacherWithBudgetAfterSpend(currentTeacher, totalCost)
                                                              : {
                                                                    ...currentTeacher,
                                                                    spentThisMonth: (currentTeacher.spentThisMonth || 0) + totalCost,
                                                                };
                                                      await updateTeacher(next);
                                                  },
                                              }
                                    }
                                />
                                </div>
                            </TeacherPortalTabPane>
                            )}

                            {teacherTabEnabled('generated-coupons') && (
                            <TeacherPortalTabPane tabId="generated-coupons" activeTab={resolvedTeacherTab} className={teacherPortalTabContentClassName}>
                                <div className={teacherPortalPanelClassName(isWide)}>
                                    <MyCoupons
                                        schoolId={schoolId!}
                                        teacherId={teacherId}
                                        teacherName={teacherName}
                                        students={studentsForTeacherActions}
                                    />
                                </div>
                            </TeacherPortalTabPane>
                            )}


                            <TeacherPortalTabPane tabId="roster" activeTab={resolvedTeacherTab} className={teacherPortalTabContentClassName}>
                                <div className={teacherPortalPanelClassName(isWide)}>
                                    <TeacherRosterTab
                                        teacherId={teacherId}
                                        allStudents={students || []}
                                        rosterStudents={studentsForTeacherActions}
                                        classes={classes || []}
                                        isGraphic={isGraphic}
                                    />
                                </div>
                            </TeacherPortalTabPane>

                            <TeacherPortalTabPane tabId="classes" activeTab={resolvedTeacherTab} className={teacherPortalTabContentClassName}>
                                <div className={teacherPortalPanelClassName(isWide)}>
                                    <TeacherClassesTab
                                        teacherId={teacherId}
                                        classes={classes || []}
                                        isGraphic={isGraphic}
                                    />
                                </div>
                            </TeacherPortalTabPane>

                            {teacherTabEnabled('attendance') && (
                            <TeacherPortalTabPane tabId="attendance" activeTab={resolvedTeacherTab} className={teacherPortalTabContentClassName}>
                                <div className={teacherPortalPanelClassName(isWide)}>
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/30 px-4 py-3 mb-6">
                                    <p className="text-sm text-muted-foreground max-w-prose">
                                        New setup takes one rule: class, period, points. Use the walkthrough for a quick test.
                                    </p>
                                    <TabWalkthroughHeaderAction />
                                    <AttendanceSetupWizard variant="teacher" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <Card className={cn(
                                        "md:col-span-2 border-t-8 transition-all duration-500 hover:shadow-2xl",
                                        isGraphic
                                            ? 'bg-card/60 backdrop-blur-2xl border-primary shadow-[0_20px_50px_rgba(0,0,0,0.1)]'
                                            : 'bg-white border-primary shadow-lg'
                                    )}>
                                        <CardHeader className="p-4 md:p-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                            <div>
                                                <CardTitle className="flex items-center gap-3">
                                                    <div className={cn("p-2 rounded-xl", isGraphic ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary')}>
                                                        <Clock className="w-6 h-6" />
                                                    </div>
                                                    Attendance Rewards
                                                </CardTitle>
                                                <CardDescription className={isGraphic ? 'text-muted-foreground/80' : ''}>
                                                    Create the rules that award attendance points during active class periods.
                                                </CardDescription>
                                            </div>
                                            <TabWalkthroughHeaderAction />
                                        </CardHeader>
                                        <CardContent className="p-4 md:p-6">
                                            <TeacherAttendanceRewardsPanel
                                                teacherId={teacherId}
                                                classes={classes || []}
                                                periods={periods || []}
                                                categories={categories || []}
                                            />
                                        </CardContent>
                                    </Card>
                                </div>
                                </div>
                            </TeacherPortalTabPane>
                            )}

                            <TeacherPortalTabPane tabId="prizes" activeTab={resolvedTeacherTab} className={teacherPortalTabContentClassName}>
                                <div className={teacherPortalPanelClassName(isWide)}>
                                <div className="grid grid-cols-1 gap-8">
                                    <div className="w-full">
                                        <TeacherPrizeManager schoolId={schoolId!} teacherId={teacherId} teachers={teachers} />
                                    </div>
                                </div>
                                </div>
                            </TeacherPortalTabPane>

                            <TeacherPortalTabPane tabId="redemptions" activeTab={resolvedTeacherTab} className={teacherPortalTabContentClassName}>
                                <div className={teacherPortalPanelClassName(isWide)}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <RecentRedemptions schoolId={schoolId!} students={studentsForTeacherActions} classes={classes || []} teacherId={teacherId} />
                                </div>
                                </div>
                            </TeacherPortalTabPane>

                            <TeacherPortalTabPane tabId="reports" activeTab={resolvedTeacherTab} className={teacherPortalTabContentClassName}>
                                <div className={teacherPortalPanelClassName(isWide)}>
                                    <div className="w-full">
                                        <SchoolReportsPanel
                                            scope="teacher"
                                            schoolName={schoolDocData?.name?.trim() || 'School'}
                                            teacherId={teacherId}
                                            teacherName={teacherName}
                                            students={studentsForTeacherActions}
                                            classes={classes || []}
                                            teachers={teachers || []}
                                            coupons={coupons || []}
                                            prizes={prizes || []}
                                            categories={categories || []}
                                            rafflePointsPerTicket={settings.rafflePointsPerTicket}
                                        />
                                    </div>
                                </div>
                                </TeacherPortalTabPane>

                            {teacherTabEnabled('raffle') && (
                                <TeacherPortalTabPane tabId="raffle" activeTab={resolvedTeacherTab} className={teacherPortalTabContentClassName}>
                                    <div className={teacherPortalPanelClassName(isWide)}>
                                        <AdminRaffleTab
                                            schoolId={schoolId!}
                                            students={studentsForTeacherActions}
                                            canEditSettings={!secretaryMode}
                                            operatorName={teacherName || undefined}
                                        />
                                    </div>
                                </TeacherPortalTabPane>
                            )}

                                {teacherTabEnabled('goals') && (
                                    <TeacherPortalTabPane tabId="goals" activeTab={resolvedTeacherTab} className={teacherPortalTabContentClassName}>
                                        <div className={teacherPortalPanelClassName(isWide)}>
                                            <GoalsManager
                                                schoolId={schoolId!}
                                                variant="teacher"
                                                teacherId={teacherId}
                                                secretaryMode={schoolWideTeacherScope}
                                                students={studentsForTeacherActions}
                                                classes={classesForTeacherUi}
                                                categories={categories ?? []}
                                                prizes={prizes ?? []}
                                                isGraphic={isGraphic}
                                            />
                                        </div>
                                    </TeacherPortalTabPane>
                                )}

                            {teacherTabEnabled('homework') && (
                                <TeacherPortalTabPane tabId="homework" activeTab={resolvedTeacherTab} className={teacherPortalTabContentClassName}>
                                <div className={teacherPortalPanelClassName(isWide)}>
                                    <TeacherHomeworkTab schoolId={schoolId!} teacherId={teacherId} students={studentsForTeacherActions} classes={classesForTeacherUi} />
                                </div>
                            </TeacherPortalTabPane>
                            )}

                            {teacherTabEnabled('houses') && (
                                <TeacherPortalTabPane tabId="houses" activeTab={resolvedTeacherTab} className={teacherPortalTabContentClassName}>
                                    <div className={teacherPortalPanelClassName(isWide)}>
                                        <StaffPortalSchoolwideFeatureNotice activeTab="houses" />
                                        <AdminHousesTab
                                            schoolId={schoolId!}
                                            houses={houses}
                                            students={students}
                                            teachers={teachers}
                                            onAddHouse={addHouse}
                                            onUpdateHouse={updateHouse}
                                            onDeleteHouse={async (id, houseStudents) => {
                                                const house = (houses || []).find((h) => h.id === id);
                                                const ok = await confirm({
                                                    title: house ? `Delete house "${house.name}"?` : 'Delete this house?',
                                                    description:
                                                        houseStudents.length > 0
                                                            ? `${houseStudents.length} student(s) will be unassigned from this house.`
                                                            : 'No students are assigned to this house.',
                                                    confirmLabel: 'Delete house',
                                                    destructive: true,
                                                });
                                                if (!ok) return;
                                                await deleteHouse(id, houseStudents);
                                            }}
                                            onUpdateStudent={updateStudent}
                                            onUpdateTeacher={updateTeacher}
                                        />
                                    </div>
                                </TeacherPortalTabPane>
                            )}

                            </TabWalkthroughProvider>
                            </div>
                        </Tabs>
                    </div>
                </TeacherPortalShell>
            </div>
        </TooltipProvider>
    );
}
