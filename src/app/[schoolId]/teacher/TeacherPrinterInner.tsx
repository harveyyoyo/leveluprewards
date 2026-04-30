
'use client';
import { useState, useEffect, useMemo } from 'react';
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
import type { Coupon, Category, Teacher, Student, Class, HistoryItem, Prize, AttendanceSettings, AttendanceLogEntry, AttendanceScheduleSlot, AttendanceRewardRule, CouponRedemptionScope, HomeworkAssignment } from '@/lib/types';
import { ArrowLeft, Printer, Plus, LogIn, LogOut, UserCheck, Award, User, Search, Users, Minus, Gift, Loader2, Trash2, Edit, Filter, Ticket, Clock, ChevronRight, History, FileText, BookOpen, Target } from 'lucide-react';
import { useSettings } from '@/components/providers/SettingsProvider';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Coupon as CouponPreview } from '@/components/Coupon';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useArcadeSound } from '@/hooks/useArcadeSound';

import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import DynamicIcon from '@/components/DynamicIcon';
import { getStudentNickname } from '@/lib/utils';
import { rainbowForNavId, rainbowTripletForNavId } from '@/lib/rainbowNav';
import { globalAnimatedBackdropActive } from '@/lib/animatedBackdrop';
import {
    remainingTeacherBudgetPoints,
    teacherWithBudgetAfterSpend,
    teacherBudgetRemainingPhrase,
    resolveTeacherBudgetPeriod,
} from '@/lib/teacherBudget';
import { Helper } from '@/components/ui/helper';
import { AttendanceSetupWizard } from '@/components/attendance/AttendanceSetupWizard';
import { getReadableErrorMessage } from '@/lib/errorMessage';
import { AdminPrizesTab } from '@/app/[schoolId]/admin/sections/AdminPrizesTab';
import { PrizeModal } from '@/components/PrizeModal';
import {
    COUPONS_PER_PRINT_PAGE,
    COUPON_PRINT_PAGE_SIZE_OPTIONS,
    generateUniqueCouponCodes,
    normalizeCouponPrintPageSize,
    type CouponPrintPageSize,
} from '@/lib/coupon-print';
import { buildRedemptionPrintNote, couponRedemptionLabelForPrint } from '@/lib/couponRedemptionRules';
import { SchoolReportsPanel } from '@/components/reports/SchoolReportsPanel';
import { GoalsManager } from '@/components/goals/GoalsManager';
import { homeworkRewardCategoryKey } from '@/lib/homeworkRewards';
import { studentsInTeacherScope } from '@/lib/reportsScope';

/** Max sheets per run. Bounded for sensible printer jobs and UI. */
const MAX_COUPON_PRINT_SHEETS = 100;


function TeacherHomeworkTab({ schoolId, teacherId, students, classes }: { schoolId: string; teacherId: string; students: Student[]; classes: Class[] }) {
    const { addHomeworkAssignment, deleteHomeworkAssignment, awardPointsToMultipleStudents } = useAppContext();
    const { toast } = useToast();
    const firestore = useFirestore();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newReward, setNewReward] = useState({ title: '', description: '', points: 10, classId: 'all' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [filterClassId, setFilterClassId] = useState('all');
    const [isAwarding, setIsAwarding] = useState<string | null>(null);

    const assignmentsQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'homework') : null, [firestore, schoolId]);
    const { data: assignments, isLoading: assignmentsLoading } = useCollection<HomeworkAssignment>(assignmentsQuery);

    const myAssignments = useMemo(() => assignments?.filter(a => a.teacherId === teacherId) || [], [assignments, teacherId]);
    const filteredStudents = useMemo(() => {
        return students.filter((student) => filterClassId === 'all' || student.classId === filterClassId);
    }, [students, filterClassId]);

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
            toast({ variant: 'destructive', title: 'Error', description: (e as Error).message });
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
            toast({ variant: 'destructive', title: 'Error', description: (e as Error).message });
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
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Select value={filterClassId} onValueChange={setFilterClassId}>
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

    return (
        <div className="flex justify-center">
            <Card className={cn(
                "w-full max-w-6xl border-t-8 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1",
                isGraphic ? 'bg-card/60 backdrop-blur-2xl border-chart-4 shadow-[0_20px_50px_rgba(0,0,0,0.1)]' : 'bg-white border-chart-4 shadow-lg'
            )}>
                <CardHeader className="p-4 md:p-6">
                    <CardTitle className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-xl", isGraphic ? 'bg-chart-4/20 text-chart-4' : 'bg-primary/10 text-primary')}>
                            <Users className="w-6 h-6" />
                        </div>
                        My Students
                    </CardTitle>
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

                    <div className="grid gap-6 lg:grid-cols-2">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">On my roster ({roster.length})</Label>
                            <ScrollArea className={cn("h-[420px] rounded-2xl border p-3", isGraphic ? 'bg-foreground/5 border-white/10' : 'bg-muted/20')}>
                                <div className="space-y-2 pr-3">
                                    {roster.map((student) => {
                                        const directlyLinked = (student.teacherIds || []).includes(teacherId);
                                        return (
                                            <div key={student.id} className="flex items-center justify-between gap-3 rounded-xl border bg-background/70 p-3">
                                                <div className="min-w-0">
                                                    <p className="truncate font-bold">{getStudentNickname(student)} {student.lastName}</p>
                                                    <p className="text-xs text-muted-foreground">{renderClassLabel(student)}</p>
                                                </div>
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
                            <ScrollArea className={cn("h-[420px] rounded-2xl border p-3", isGraphic ? 'bg-foreground/5 border-white/10' : 'bg-muted/20')}>
                                <div className="space-y-2 pr-3">
                                    {addable.map((student) => (
                                        <div key={student.id} className="flex items-center justify-between gap-3 rounded-xl border bg-background/70 p-3">
                                            <div className="min-w-0">
                                                <p className="truncate font-bold">{getStudentNickname(student)} {student.lastName}</p>
                                                <p className="text-xs text-muted-foreground">{renderClassLabel(student)}</p>
                                            </div>
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
                        Prize Redemptions
                    </CardTitle>
                    <CardDescription className="font-medium">
                        Student purchases that need to be delivered.
                    </CardDescription>
                </div>
                <Tabs value={filterType} onValueChange={(v: any) => setFilterType(v)} className="w-[200px]">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="all" className="text-xs font-bold">All</TabsTrigger>
                        <TabsTrigger value="me" className="text-xs font-bold">Mine</TabsTrigger>
                    </TabsList>
                </Tabs>
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
                                                {item.studentName} <span className="opacity-40">â€¢</span> {item.studentClass}
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
                            <DialogDescription>Add a class for your roster (e.g. â€œPeriod 1 â€“ Scienceâ€).</DialogDescription>
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
                        Pick which period time applies to each class for the selected day. This controls â€œon timeâ€ for that class.
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
                                                    {slot.label} ({formatHHmmToAmPm(slot.startTime)}â€“{formatHHmmToAmPm(slot.endTime)})
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
                        No periods have been created yet. Ask an admin to create periods in Admin â†’ Attendance.
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
      const created = await addCategory({ name: newCategoryName.trim(), points: pts, teacherId });
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
    if (r.customPeriod) return `${r.customPeriod.label} (${r.customPeriod.startTime}â€“${r.customPeriod.endTime})`;
    const p = (periods || []).find((x) => x.id === r.periodId);
    return p ? `${p.label} (${p.startTime}â€“${p.endTime})` : 'Unknown period';
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
                    <SelectItem key={p.id} value={p.id}>{p.label} ({p.startTime}â€“{p.endTime})</SelectItem>
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
                  <DialogDescription>Create a category (defaults to â€œPunctualityâ€).</DialogDescription>
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
            <p className="text-[11px] text-muted-foreground mt-1">Create a category named â€œPunctualityâ€ to make it the default.</p>
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
          <div className="space-y-2">
            {(rules || []).slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border bg-background/30">
                <div className="min-w-[240px]">
                  <p className="font-bold">{r.className || availableClasses.find(c => c.id === r.classId)?.name || r.classId}</p>
                  <p className="text-xs text-muted-foreground">{describePeriod(r)} â€¢ +{r.pointsForSignIn} (+{r.pointsForOnTime} on time)</p>
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
        )}
      </div>
    </div>
  );
}

export function TeacherPrinterInner({ teacherName, teacherId, onLogout, secretaryMode = false }: { teacherName: string, teacherId: string, onLogout: () => void, secretaryMode?: boolean }) {
    const { updateTeacher, addCoupons, setCouponsToPrint, addCategory, schoolId, awardPointsToMultipleStudents, deductPointsFromMultipleStudents, addPrize, updatePrize, deletePrize, getTeacherAttendanceConfig, setTeacherAttendanceConfig, listTeacherAttendanceLog, categories: globalCategories } = useAppContext();
    const { toast } = useToast();
    const firestore = useFirestore();
    const { settings, isFeatureAllowed } = useSettings();
    const isGraphic = settings.graphicMode === 'graphics';
    const animBackdrop = globalAnimatedBackdropActive(settings);
    const playSound = useArcadeSound();

    const categoriesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'categories') : null, [firestore, schoolId]);
    const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);

    const studentsQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'students') : null, [firestore, schoolId]);
    const { data: students, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);

    const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'classes') : null, [firestore, schoolId]);
    const { data: classes, isLoading: classesLoading } = useCollection<Class>(classesQuery);

    const periodsQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'periods') : null, [firestore, schoolId]);
    const { data: periods, isLoading: periodsLoading } = useCollection<AttendanceScheduleSlot>(periodsQuery);

    const teachersQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'teachers') : null, [firestore, schoolId]);
    const { data: teachers } = useCollection<Teacher>(teachersQuery);
    const currentTeacher = teachers?.find(t => t.id === teacherId);

    const studentsForTeacherActions = useMemo(() => {
        if (secretaryMode) return students ?? [];
        if (!teacherId) return students ?? [];
        return studentsInTeacherScope(teacherId, students ?? [], classes ?? []);
    }, [secretaryMode, teacherId, students, classes]);

    /** Class filters and coupon class lists: students’ classes plus classes this teacher owns as primary. */
    const classesForTeacherUi = useMemo(() => {
        if (secretaryMode) return classes ?? [];
        const cls = classes ?? [];
        const fromStudents = new Set(
            studentsForTeacherActions.map((s) => s.classId).filter((id): id is string => Boolean(id)),
        );
        return cls
            .filter((c) => fromStudents.has(c.id) || c.primaryTeacherId === teacherId)
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [secretaryMode, classes, studentsForTeacherActions, teacherId]);

    const schoolDocRef = useMemoFirebase(
        () => (schoolId && firestore ? doc(firestore, 'schools', schoolId) : null),
        [firestore, schoolId],
    );
    const { data: schoolDocData } = useDoc<{ name?: string }>(schoolDocRef);

    const couponsQuery = useMemoFirebase(() => (schoolId ? collection(firestore, 'schools', schoolId, 'coupons') : null), [firestore, schoolId]);
    const { data: coupons } = useCollection<Coupon>(couponsQuery);

    const prizesQuery = useMemoFirebase(() => (schoolId ? collection(firestore, 'schools', schoolId, 'prizes') : null), [firestore, schoolId]);
    const { data: prizes } = useCollection<Prize>(prizesQuery);

    // State for coupon printing
    const [printCategoryId, setPrintCategoryId] = useState('');
    const [printValue, setPrintValue] = useState('10');
    const [printStartsOn, setPrintStartsOn] = useState(''); // yyyy-mm-dd, optional â€” coupon valid from start of this day
    const [printExpiresOn, setPrintExpiresOn] = useState(''); // yyyy-mm-dd
    const [printSheetCount, setPrintSheetCount] = useState('1');
    const [printCouponsPerPage, setPrintCouponsPerPage] = useState<CouponPrintPageSize>(COUPONS_PER_PRINT_PAGE);
    const [printRedemptionScope, setPrintRedemptionScope] = useState<CouponRedemptionScope>(() =>
        secretaryMode ? 'school' : 'creator',
    );
    const [printScopeClassIds, setPrintScopeClassIds] = useState<string[]>([]);
    const [printScopeTeacherIds, setPrintScopeTeacherIds] = useState<string[]>([]);
    const [isPrintCategoryDialogOpen, setIsPrintCategoryDialogOpen] = useState(false);
    const [newPrintCategoryName, setNewPrintCategoryName] = useState('');
    const [newPrintCategoryPoints, setNewPrintCategoryPoints] = useState('10');

    // State for direct/bulk awarding
    const [awardMode, setAwardMode] = useState<'award' | 'deduct'>('award');
    const [studentSearch, setStudentSearch] = useState('');
    const [filterClassId, setFilterClassId] = useState('all');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [awardCategoryId, setAwardCategoryId] = useState('');
    const [awardValue, setAwardValue] = useState('10');
    const [awardReason, setAwardReason] = useState('');

    useEffect(() => {
        if (categories && categories.length > 0) {
            if (!printCategoryId) setPrintCategoryId(categories[0].id);
            if (!awardCategoryId) setAwardCategoryId(categories[0].id);
        }
    }, [categories, printCategoryId, awardCategoryId]);

    useEffect(() => {
        const category = categories?.find(c => c.id === printCategoryId);
        if (category) {
            setPrintValue(category.points.toString());
        }
    }, [printCategoryId, categories]);

    useEffect(() => {
        const category = categories?.find(c => c.id === awardCategoryId);
        if (category) {
            setAwardValue(category.points.toString());
        }
    }, [awardCategoryId, categories]);

    useEffect(() => {
        if (secretaryMode) return;
        if (printRedemptionScope === 'school' || printRedemptionScope === 'teachers') {
            setPrintRedemptionScope('creator');
        }
    }, [secretaryMode, printRedemptionScope]);

    useEffect(() => {
        if (filterClassId === 'all') return;
        if (!classesForTeacherUi.some((c) => c.id === filterClassId)) {
            setFilterClassId('all');
        }
    }, [filterClassId, classesForTeacherUi]);

    useEffect(() => {
        const allowed = new Set(studentsForTeacherActions.map((s) => s.id));
        setSelectedStudentIds((prev) => prev.filter((id) => allowed.has(id)));
    }, [studentsForTeacherActions]);

    useEffect(() => {
        if (secretaryMode) return;
        const valid = new Set(classesForTeacherUi.map((c) => c.id));
        setPrintScopeClassIds((prev) => prev.filter((id) => valid.has(id)));
    }, [secretaryMode, classesForTeacherUi]);

    const handleCreatePrintCategory = async () => {
        if (!newPrintCategoryName || !newPrintCategoryPoints) {
            playSound('error');
            toast({
                variant: 'destructive',
                title: 'Missing Information',
                description: 'Please provide a name and point value for the category.',
            });
            return;
        }
        const points = parseInt(newPrintCategoryPoints);
        if (isNaN(points) || points <= 0) {
            playSound('error');
            toast({
                variant: 'destructive',
                title: 'Invalid Points',
                description: 'Points must be a positive number.',
            });
            return;
        }
        const newCategory = await addCategory({ name: newPrintCategoryName, points, teacherId: currentTeacher?.id });
        if (newCategory) {
            setPrintCategoryId(newCategory.id);
        }
        setNewPrintCategoryName('');
        setNewPrintCategoryPoints('10');
        setIsPrintCategoryDialogOpen(false);
        playSound('success');
        toast({ title: 'Category Added' });
    };

    const localTodayYmd = () => {
        const t = new Date();
        return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    };

    const computeStartsAt = () => {
        if (!printStartsOn) return undefined;
        const date = new Date(printStartsOn + 'T00:00:00');
        if (Number.isNaN(date.getTime())) return undefined;
        return date.getTime();
    };

    const computeExpiresAt = () => {
        if (!printExpiresOn) return undefined;
        if (printExpiresOn < localTodayYmd()) return undefined;
        const date = new Date(printExpiresOn + 'T23:59:59');
        if (Number.isNaN(date.getTime())) return undefined;
        return date.getTime();
    };

    const handlePrintSheet = async () => {
        const value = parseInt(printValue);
        const sheets = parseInt(printSheetCount, 10);
        if (!teacherName) {
            playSound('error');
            toast({ variant: 'destructive', title: 'An error occurred. Please log in again.' });
            return;
        }
        if (!value || value <= 0) {
            playSound('error');
            toast({
                variant: 'destructive',
                title: 'Invalid Value',
                description: 'Coupon value must be a positive number.',
            });
            return;
        }
        if (isNaN(sheets) || sheets < 1 || sheets > MAX_COUPON_PRINT_SHEETS) {
            playSound('error');
            toast({
                variant: 'destructive',
                title: 'Invalid sheet count',
                description: `Enter between 1 and ${MAX_COUPON_PRINT_SHEETS} sheets (${printCouponsPerPage} coupons per sheet).`,
            });
            return;
        }
        const couponCount = sheets * printCouponsPerPage;
        const selectedCategory = categories?.find(c => c.id === printCategoryId);
        if (!selectedCategory) {
            playSound('error');
            toast({
                variant: 'destructive',
                title: 'Category Not Found',
                description: 'Please select a valid category.',
            });
            return;
        }

        const totalCost = value * couponCount;
        if (!secretaryMode && settings.enableTeacherBudgets && currentTeacher && currentTeacher.monthlyBudget !== undefined) {
            const remaining = remainingTeacherBudgetPoints(currentTeacher);
            if (remaining !== null && totalCost > remaining) {
                const phrase = teacherBudgetRemainingPhrase(resolveTeacherBudgetPeriod(currentTeacher));
                playSound('error');
                toast({
                    variant: 'destructive',
                    title: 'Budget Exceeded',
                    description: `Generating these coupons requires ${totalCost} pts, but you only have ${remaining.toLocaleString()} pts remaining ${phrase}.`,
                });
                return;
            }
        }

        if (printExpiresOn && printExpiresOn < localTodayYmd()) {
            playSound('error');
            toast({
                variant: 'destructive',
                title: 'Invalid expiration',
                description: 'Expiration date cannot be before today (the day you print).',
            });
            return;
        }

        if (printStartsOn && printExpiresOn && printStartsOn > printExpiresOn) {
            playSound('error');
            toast({
                variant: 'destructive',
                title: 'Invalid date range',
                description: 'Valid-from date cannot be after the expiration date.',
            });
            return;
        }

        if (!secretaryMode) {
            if (printRedemptionScope === 'classes' && printScopeClassIds.length === 0) {
                playSound('error');
                toast({
                    variant: 'destructive',
                    title: 'Select classes',
                    description: 'Choose at least one class, or switch redemption to “Only my students”.',
                });
                return;
            }
            if (printRedemptionScope === 'creator' && !currentTeacher?.id) {
                playSound('error');
                toast({
                    variant: 'destructive',
                    title: 'Profile not ready',
                    description: 'Wait for your teacher profile to load, then try again.',
                });
                return;
            }
        }

        const startsAt = computeStartsAt();
        const expiresAt = computeExpiresAt();
        if (startsAt !== undefined && expiresAt !== undefined && startsAt >= expiresAt) {
            playSound('error');
            toast({
                variant: 'destructive',
                title: 'Invalid date range',
                description: 'The coupon must begin before it expires (same calendar day is OK).',
            });
            return;
        }

        const codes = generateUniqueCouponCodes(couponCount);
        const scopeExtra: Partial<Pick<Coupon, 'redemptionScope' | 'allowedClassIds' | 'allowedTeacherIds'>> =
            secretaryMode
                ? {}
                : printRedemptionScope === 'classes'
                    ? { redemptionScope: 'classes', allowedClassIds: [...printScopeClassIds] }
                    : { redemptionScope: 'creator' };

        const redemptionPrintNote =
            secretaryMode
                ? undefined
                : buildRedemptionPrintNote({
                    scope: printRedemptionScope,
                    issuingTeacherDisplayName: teacherName,
                    classNamesInOrder: (classes || [])
                        .filter((c) => printScopeClassIds.includes(c.id))
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((c) => c.name),
                    teacherNamesInOrder: (teachers || [])
                        .filter((t) => printScopeTeacherIds.includes(t.id))
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((t) => t.name),
                });

        const couponsToCreate: Coupon[] = codes.map((code) => ({
            id: code,
            code,
            value: value,
            category: selectedCategory.name,
            teacher: teacherName,
            used: false,
            createdAt: Date.now(),
            color: selectedCategory.color,
            ...(!secretaryMode && currentTeacher?.id ? { createdByTeacherId: currentTeacher.id } : {}),
            ...scopeExtra,
            ...(redemptionPrintNote ? { redemptionPrintNote } : {}),
            ...(startsAt !== undefined ? { startsAt } : {}),
            ...(expiresAt ? { expiresAt } : {}),
        }));
        await addCoupons(couponsToCreate);
        if (!secretaryMode && settings.enableTeacherBudgets && currentTeacher) {
            const next =
                currentTeacher.monthlyBudget !== undefined
                    ? teacherWithBudgetAfterSpend(currentTeacher, totalCost)
                    : { ...currentTeacher, spentThisMonth: (currentTeacher.spentThisMonth || 0) + totalCost };
            await updateTeacher(next);
        }
        setCouponsToPrint(couponsToCreate, { couponsPerPage: printCouponsPerPage });
    };

    const handleAwardPoints = async () => {
        const points = parseInt(awardValue);
        if (selectedStudentIds.length === 0) {
            playSound('error');
            toast({ variant: 'destructive', title: 'No students selected.' });
            return;
        }
        const selectedCategory = categories?.find(c => c.id === awardCategoryId);
        if (!selectedCategory) {
            playSound('error');
            toast({ variant: 'destructive', title: 'Please select a category.' });
            return;
        }
        if (isNaN(points) || points <= 0) {
            playSound('error');
            toast({ variant: 'destructive', title: 'Points must be a positive number.' });
            return;
        }

        if (!secretaryMode && teacherId) {
            const allowed = new Set(studentsForTeacherActions.map((s) => s.id));
            if (selectedStudentIds.some((id) => !allowed.has(id))) {
                playSound('error');
                toast({
                    variant: 'destructive',
                    title: 'Invalid selection',
                    description: 'You can only award points to students on your roster.',
                });
                return;
            }
        }

        const totalCost = points * selectedStudentIds.length;
        if (settings.enableTeacherBudgets && currentTeacher && currentTeacher.monthlyBudget !== undefined) {
            const remainingPts = remainingTeacherBudgetPoints(currentTeacher);
            if (remainingPts !== null && totalCost > remainingPts) {
                const phrase = teacherBudgetRemainingPhrase(resolveTeacherBudgetPeriod(currentTeacher));
                playSound('error');
                toast({
                    variant: 'destructive',
                    title: 'Budget Exceeded',
                    description: `Awarding requires ${totalCost} pts, but you only have ${remainingPts.toLocaleString()} pts remaining ${phrase}.`,
                });
                return;
            }
        }

        const result = await awardPointsToMultipleStudents(selectedStudentIds, points, selectedCategory.name);

        if (result.success) {
            if (settings.enableTeacherBudgets && currentTeacher) {
                const next =
                    currentTeacher.monthlyBudget !== undefined
                        ? teacherWithBudgetAfterSpend(currentTeacher, totalCost)
                        : { ...currentTeacher, spentThisMonth: (currentTeacher.spentThisMonth || 0) + totalCost };
                await updateTeacher(next);
            }
            playSound('success');
            toast({ title: 'Points Awarded!', description: `Awarded ${points} points to ${result.count} student(s).` });
            setSelectedStudentIds([]);
            if (categories && categories.length > 0) {
                setAwardValue(categories[0].points.toString());
            }
        } else {
            playSound('error');
            toast({ variant: 'destructive', title: 'Failed to award points', description: result.message });
        }
    };

    const handleDeductPoints = async () => {
        const points = parseInt(awardValue);
        if (selectedStudentIds.length === 0) {
            playSound('error');
            toast({ variant: 'destructive', title: 'No students selected.' });
            return;
        }
        if (!awardReason.trim()) {
            playSound('error');
            toast({ variant: 'destructive', title: 'A reason is required for deductions.' });
            return;
        }
        if (isNaN(points) || points <= 0) {
            playSound('error');
            toast({ variant: 'destructive', title: 'Points to deduct must be a positive number.' });
            return;
        }

        if (!secretaryMode && teacherId) {
            const allowed = new Set(studentsForTeacherActions.map((s) => s.id));
            if (selectedStudentIds.some((id) => !allowed.has(id))) {
                playSound('error');
                toast({
                    variant: 'destructive',
                    title: 'Invalid selection',
                    description: 'You can only deduct points from students on your roster.',
                });
                return;
            }
        }

        const result = await deductPointsFromMultipleStudents(selectedStudentIds, points, awardReason);

        if (result.success) {
            playSound('swoosh');
            toast({ title: 'Points Deducted!', description: `Deducted ${points} points from ${result.count} student(s).` });
            setSelectedStudentIds([]);
            setAwardReason('');
        } else {
            playSound('error');
            toast({ variant: 'destructive', title: 'Failed to deduct points', description: result.message });
        }
    };

    const selectedCategoryForPreview = categories?.find(c => c.id === printCategoryId);
    const redemptionPreviewNote =
        secretaryMode
            ? undefined
            : buildRedemptionPrintNote({
                scope: printRedemptionScope,
                issuingTeacherDisplayName: teacherName,
                classNamesInOrder: (classes || [])
                    .filter((c) => printScopeClassIds.includes(c.id))
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((c) => c.name),
                teacherNamesInOrder: (teachers || [])
                    .filter((t) => printScopeTeacherIds.includes(t.id))
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((t) => t.name),
            });
    const previewCoupon: Coupon = {
        id: 'PREVIEW',
        code: '123456',
        value: parseInt(printValue) || 0,
        category: selectedCategoryForPreview?.name || 'Category',
        teacher: teacherName,
        used: false,
        createdAt: Date.now(),
        color: selectedCategoryForPreview?.color,
        ...(currentTeacher?.id && !secretaryMode ? { createdByTeacherId: currentTeacher.id } : {}),
        ...(secretaryMode
            ? {}
            : printRedemptionScope === 'classes'
                ? { redemptionScope: 'classes' as const, allowedClassIds: [...printScopeClassIds] }
                : { redemptionScope: 'creator' as const }),
        ...(redemptionPreviewNote ? { redemptionPrintNote: redemptionPreviewNote } : {}),
        ...(computeStartsAt() !== undefined ? { startsAt: computeStartsAt() } : {}),
        expiresAt: computeExpiresAt(),
    };

    const filteredCategories = useMemo(() => {
        const list = categories?.filter(c => !c.teacherId || (currentTeacher && c.teacherId === currentTeacher.id)) || [];
        if (secretaryMode) {
            return list.filter(c => !c.teacherId);
        }
        return list;
    }, [categories, currentTeacher, secretaryMode]);

    const filteredStudents = useMemo(() => {
        return studentsForTeacherActions.filter((s) => {
            const computedName = `${getStudentNickname(s)} ${s.lastName}`.toLowerCase();
            const nameMatch = computedName.includes(studentSearch.toLowerCase());
            const classMatch = filterClassId === 'all' || s.classId === filterClassId;
            return nameMatch && classMatch;
        }).sort((a, b) => a.lastName.localeCompare(b.lastName));
    }, [studentsForTeacherActions, studentSearch, filterClassId]);

    useEffect(() => {
        if (filteredStudents.length === 1) {
            setSelectedStudentIds([filteredStudents[0].id]);
        }
    }, [filteredStudents]);

    const toggleSelectAll = () => {
        if (selectedStudentIds.length === filteredStudents.length) {
            setSelectedStudentIds([]);
        } else {
            setSelectedStudentIds(filteredStudents.map(s => s.id));
        }
    };

    const handleStudentSelect = (studentId: string, isSelected: boolean) => {
        if (isSelected) {
            setSelectedStudentIds(prev => [...prev, studentId]);
        } else {
            setSelectedStudentIds(prev => prev.filter(id => id !== studentId));
        }
    };


    const isLoading = secretaryMode
        ? categoriesLoading
        : categoriesLoading || studentsLoading || classesLoading || periodsLoading;
    const teacherAccent = rainbowForNavId('print', settings.colorScheme);
    const teacherAccentTriplet = rainbowTripletForNavId('print', settings.colorScheme);

    return (
        <TooltipProvider>
            <div className="min-h-screen transition-colors duration-500 relative overflow-hidden font-sans"
            style={{
              // Make existing chart/primary-based styling match the Teacher button color.
              ['--primary' as any]: teacherAccentTriplet,
              ['--chart-1' as any]: teacherAccentTriplet,
              ['--chart-2' as any]: teacherAccentTriplet,
              ['--chart-3' as any]: teacherAccentTriplet,
              ['--chart-4' as any]: teacherAccentTriplet,
              ['--chart-5' as any]: teacherAccentTriplet,
              ['--ring' as any]: teacherAccentTriplet,
            } as React.CSSProperties}
            >
                {/* Local orbs/noise only when global animated backdrop is off */}
                {isGraphic && !animBackdrop && (
                    <>
                        <div className="pointer-events-none fixed inset-0 opacity-[0.03] z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
                        <div className="pointer-events-none fixed -top-24 -left-24 h-[500px] w-[500px] rounded-full bg-chart-1/10 blur-[120px] z-0 animate-pulse-slow" />
                        <div className="pointer-events-none fixed top-1/2 -right-24 h-[600px] w-[600px] rounded-full bg-chart-2/10 blur-[140px] z-0" />
                        <div className="pointer-events-none fixed -bottom-24 left-1/4 h-[400px] w-[400px] rounded-full bg-chart-3/10 blur-[100px] z-0" />
                    </>
                )}

                <div
                    className={cn(
                        'space-y-6 max-w-full mx-auto p-4 md:p-8 relative z-10',
                        settings.displayMode === 'app' && 'pb-24'
                    )}
                >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <Helper content={secretaryMode ? 'Generate coupon sheets for teachers to hand out. You cannot award points or edit prizes from here.' : 'Print coupons, award points, manage prizes, and take attendance from one place.'}>
                            <h2 className="text-2xl font-bold tracking-tight" style={{ color: teacherAccent }}>
                                {secretaryMode ? 'Secretary - coupon printing' : 'Teacher Portal'}
                            </h2>
                            <p className="text-muted-foreground">
                                {secretaryMode
                                    ? 'Create printable coupon batches using the school\'s incentive categories.'
                                    : 'Generate coupon sheets or award points directly to your students.'}
                            </p>
                            {teacherName ? (
                                <p className="text-sm text-muted-foreground mt-1">
                                    <span className="font-medium text-foreground/80">{teacherName}</span>
                                    {settings.enableTeacherBudgets && currentTeacher?.monthlyBudget !== undefined ? (
                                        <>
                                            {' '}
                                            Â·{' '}
                                            {(remainingTeacherBudgetPoints(currentTeacher) ?? 0).toLocaleString()} pts remaining{' '}
                                            {teacherBudgetRemainingPhrase(resolveTeacherBudgetPeriod(currentTeacher))}
                                        </>
                                    ) : null}
                                </p>
                            ) : null}
                        </Helper>
                        <Button variant="outline" onClick={onLogout} className="gap-2 rounded-lg h-10 shrink-0 sm:self-start">
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">{secretaryMode ? 'Log out' : 'Switch Teacher'}</span>
                        </Button>
                    </div>

                    <Tabs defaultValue="coupons" className="space-y-6 w-full">
                        {!secretaryMode && (
                        <div className="flex overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 justify-center">
                            <TabsList
                                className="bg-muted/50 p-1.5 rounded-2xl inline-flex w-max border shadow-sm sm:mx-auto"
                                style={{ ['--teacher-accent' as any]: teacherAccent }}
                            >
                                <TabsTrigger
                                    value="coupons"
                                    className="rounded-xl px-3 py-2 font-bold text-sm flex items-center gap-1.5 text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-[color:var(--teacher-accent)]"
                                >
                                    <Ticket className="w-4 h-4 shrink-0 opacity-80" />
                                    Coupons
                                </TabsTrigger>
                                <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground/45 pointer-events-none" aria-hidden />
                                <TabsTrigger
                                    value="award"
                                    className="rounded-xl px-3 py-2 font-bold text-sm flex items-center gap-1.5 text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-[color:var(--teacher-accent)]"
                                >
                                    <Award className="w-4 h-4 shrink-0 opacity-80" />
                                    Points
                                </TabsTrigger>
                                <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground/45 pointer-events-none" aria-hidden />
                                <TabsTrigger
                                    value="roster"
                                    className="rounded-xl px-3 py-2 font-bold text-sm flex items-center gap-1.5 text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-[color:var(--teacher-accent)]"
                                >
                                    <Users className="w-4 h-4 shrink-0 opacity-80" />
                                    Students
                                </TabsTrigger>
                                {settings.enableAttendance && (
                                  <>
                                    <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground/45 pointer-events-none" aria-hidden />
                                    <TabsTrigger
                                        value="attendance"
                                        className="rounded-xl px-3 py-2 font-bold text-sm flex items-center gap-1.5 text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-[color:var(--teacher-accent)]"
                                    >
                                        <Clock className="w-4 h-4 shrink-0 opacity-80" />
                                        Attendance
                                    </TabsTrigger>
                                  </>
                                )}
                                <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground/45 pointer-events-none" aria-hidden />
                                <TabsTrigger
                                    value="prizes"
                                    className="rounded-xl px-3 py-2 font-bold text-sm flex items-center gap-1.5 text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-[color:var(--teacher-accent)]"
                                >
                                    <Gift className="w-4 h-4 shrink-0 opacity-80" />
                                    Prizes
                                </TabsTrigger>
                                <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground/45 pointer-events-none" aria-hidden />
                                <TabsTrigger
                                    value="redemptions"
                                    className="rounded-xl px-3 py-2 font-bold text-sm flex items-center gap-1.5 text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-[color:var(--teacher-accent)]"
                                >
                                    <History className="w-4 h-4 shrink-0 opacity-80" />
                                    Redemptions
                                </TabsTrigger>
                                <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground/45 pointer-events-none" aria-hidden />
                                <TabsTrigger
                                    value="reports"
                                    className="rounded-xl px-3 py-2 font-bold text-sm flex items-center gap-1.5 text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-[color:var(--teacher-accent)]"
                                >
                                    <FileText className="w-4 h-4 shrink-0 opacity-80" />
                                    Reports
                                </TabsTrigger>
                                {settings.enableGoals && isFeatureAllowed('enableGoals') && (
                                    <>
                                        <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground/45 pointer-events-none" aria-hidden />
                                        <TabsTrigger
                                            value="goals"
                                            className="rounded-xl px-3 py-2 font-bold text-sm flex items-center gap-1.5 text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-[color:var(--teacher-accent)]"
                                        >
                                            <Target className="w-4 h-4 shrink-0 opacity-80" />
                                            Goals
                                        </TabsTrigger>
                                    </>
                                )}
                                {settings.enableHomework && (
                                    <>
                                        <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground/45 pointer-events-none" aria-hidden />
                                        <TabsTrigger
                                            value="homework"
                                            className="rounded-xl px-3 py-2 font-bold text-sm flex items-center gap-1.5 text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-[color:var(--teacher-accent)]"
                                        >
                                            <BookOpen className="w-4 h-4 shrink-0 opacity-80" />
                                            Homework Rewards
                                        </TabsTrigger>
                                    </>
                                )}
                            </TabsList>
                        </div>
                        )}

                            <TabsContent value="coupons" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex justify-center">

                        <Card className={cn(
                            "w-full max-w-6xl border-t-8 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1",
                            isGraphic
                                ? 'bg-card/60 backdrop-blur-2xl border-chart-1 shadow-[0_20px_50px_rgba(0,0,0,0.1)]'
                                : 'bg-white border-chart-1 shadow-lg'
                        )}>
                            <CardHeader className="p-4 md:p-6">
                                <CardTitle className="flex items-center gap-3">
                                    <div className={cn("p-2 rounded-xl", isGraphic ? 'bg-chart-1/20 text-chart-1' : 'bg-primary/10 text-primary')}>
                                        <Printer className="w-6 h-6" />
                                    </div>
                                    Print Coupons
                                </CardTitle>
                                <CardDescription className={isGraphic ? 'text-muted-foreground/80' : ''}>
                                    Choose 10 or 30 coupons per letter page. Set sheets to mass-print; each cell matches the selected layout.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 md:p-6">
                                                    <div className="flex flex-col lg:flex-row gap-8 items-start">
                                        <div className="flex-1 w-full space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                                <div className="space-y-2 md:col-span-1">
                                                    <Label className={cn("text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1", isGraphic ? 'text-muted-foreground' : 'text-slate-500')}>Incentive Category</Label>
                                                    <div className="flex items-center gap-2">
                                                        <Select value={printCategoryId} onValueChange={setPrintCategoryId}>
                                                            <SelectTrigger className={cn("rounded-xl h-12 transition-all", isGraphic ? 'bg-foreground/5 border-white/10 hover:bg-foreground/10 text-foreground' : 'bg-slate-50 border-slate-200')}>
                                                                <SelectValue placeholder="Select..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {filteredCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                        {!secretaryMode && (
                                                        <Dialog open={isPrintCategoryDialogOpen} onOpenChange={setIsPrintCategoryDialogOpen}>
                                                            <DialogTrigger asChild>
                                                                <Button variant="outline" size="icon" className={cn("h-12 w-12 rounded-xl shrink-0 transition-all", isGraphic ? 'bg-foreground/5 border-white/10 hover:bg-white/10 text-white' : 'bg-slate-50 border-slate-200')}>
                                                                    <Plus className="h-4 w-4" />
                                                                </Button>
                                                            </DialogTrigger>
                <DialogContent className={cn(isGraphic ? 'bg-card/90 backdrop-blur-2xl text-foreground border-white/10' : 'bg-white')}>
                                                                <DialogHeader>
                                                                    <DialogTitle className="text-2xl font-black">Add Category</DialogTitle>
                                                                    <DialogDescription>Create a new quick-selection category for rewards.</DialogDescription>
                                                                </DialogHeader>
                                                                <div className="grid gap-6 py-6">
                                                                    <div className="space-y-2">
                                                                        <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">Name</Label>
                                                                        <Input id="name" value={newPrintCategoryName} onChange={e => setNewPrintCategoryName(e.target.value)} className={cn("h-12 rounded-xl", isGraphic ? 'bg-foreground/5 border-white/10' : 'bg-slate-50')} placeholder="e.g. Extra Recess" />
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label htmlFor="pts" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">Default Points</Label>
                                                                        <Input id="pts" type="number" value={newPrintCategoryPoints} onChange={e => setNewPrintCategoryPoints(e.target.value)} className={cn("h-12 rounded-xl font-bold", isGraphic ? 'bg-foreground/5 border-white/10' : 'bg-slate-50')} />
                                                                    </div>
                                                                </div>
                                                                <DialogFooter>
                                                                    <Button onClick={handleCreatePrintCategory} className="rounded-2xl h-12 w-full font-black uppercase tracking-widest">Create Category</Button>
                                                                </DialogFooter>
                                                            </DialogContent>
                                                        </Dialog>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="space-y-2 md:col-span-1">
                                                    <Label className={cn("text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1", isGraphic ? 'text-muted-foreground' : 'text-slate-500')}>Point Value</Label>
                                                    <Input type="number" value={printValue} onChange={(e) => setPrintValue(e.target.value)} className={cn("h-12 rounded-xl text-lg font-black transition-all", isGraphic ? 'bg-foreground/5 border-white/10 text-foreground focus:ring-chart-1/20' : 'bg-slate-50 border-slate-200')} />
                                                </div>
                                                <div className="space-y-2 md:col-span-1">
                                                    <Label className={cn("text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1", isGraphic ? 'text-muted-foreground' : 'text-slate-500')}>
                                                        Coupons per page
                                                    </Label>
                                                    <Select
                                                        value={String(printCouponsPerPage)}
                                                        onValueChange={(value) => setPrintCouponsPerPage(normalizeCouponPrintPageSize(Number(value)))}
                                                    >
                                                        <SelectTrigger className={cn("h-12 rounded-xl text-lg font-black transition-all", isGraphic ? 'bg-foreground/5 border-white/10 text-foreground focus:ring-chart-1/20' : 'bg-slate-50 border-slate-200')}>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {COUPON_PRINT_PAGE_SIZE_OPTIONS.map((size) => (
                                                                <SelectItem key={size} value={String(size)}>
                                                                    {size} per page
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2 md:col-span-1">
                                                    <Label className={cn("text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1", isGraphic ? 'text-muted-foreground' : 'text-slate-500')}>
                                                        Sheets
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        max={MAX_COUPON_PRINT_SHEETS}
                                                        value={printSheetCount}
                                                        onChange={(e) => setPrintSheetCount(e.target.value)}
                                                        className={cn("h-12 rounded-xl text-lg font-black transition-all", isGraphic ? 'bg-foreground/5 border-white/10 text-foreground focus:ring-chart-1/20' : 'bg-slate-50 border-slate-200')}
                                                    />
                                                    <p className="text-[11px] text-muted-foreground px-0.5">
                                                        Total: {(parseInt(printSheetCount, 10) || 0) * printCouponsPerPage} coupons
                                                        {settings.enableTeacherBudgets && currentTeacher?.monthlyBudget !== undefined && parseInt(printValue, 10) > 0
                                                            ? ` Â· ${((parseInt(printSheetCount, 10) || 0) * printCouponsPerPage * (parseInt(printValue, 10) || 0)).toLocaleString()} pts from budget`
                                                            : null}
                                                    </p>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className={cn("text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1", isGraphic ? 'text-muted-foreground' : 'text-slate-500')}>Valid from (optional)</Label>
                                                    <Input
                                                        type="date"
                                                        value={printStartsOn}
                                                        onChange={(e) => setPrintStartsOn(e.target.value)}
                                                        className={cn("h-12 rounded-xl text-xs font-bold tracking-widest", isGraphic ? 'bg-foreground/5 border-white/10 text-foreground' : 'bg-slate-50 border-slate-200')}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className={cn("text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1", isGraphic ? 'text-muted-foreground' : 'text-slate-500')}>Expiration (optional)</Label>
                                                    <Input
                                                        type="date"
                                                        min={localTodayYmd()}
                                                        value={printExpiresOn}
                                                        onChange={(e) => setPrintExpiresOn(e.target.value)}
                                                        className={cn("h-12 rounded-xl text-xs font-bold tracking-widest", isGraphic ? 'bg-foreground/5 border-white/10 text-foreground' : 'bg-slate-50 border-slate-200')}
                                                    />
                                                </div>
                                            </div>

                                            {!secretaryMode && (
                                            <div className={cn('rounded-2xl border p-4 space-y-4', isGraphic ? 'border-white/10 bg-foreground/5' : 'border-border/60 bg-muted/10')}>
                                                <Label className={cn('text-xs font-semibold uppercase tracking-wide ml-0.5', isGraphic ? 'text-muted-foreground' : 'text-muted-foreground')}>
                                                    Who can redeem these codes
                                                </Label>
                                                <RadioGroup
                                                    value={printRedemptionScope}
                                                    onValueChange={(v) => setPrintRedemptionScope(v as CouponRedemptionScope)}
                                                    className="grid gap-3 sm:grid-cols-2"
                                                >
                                                    <div className={cn('flex items-start gap-2 rounded-xl border p-3', isGraphic ? 'border-white/10 bg-card/40' : 'bg-background/80')}>
                                                        <RadioGroupItem value="creator" id="crs-creator" className="mt-1" />
                                                        <label htmlFor="crs-creator" className="text-sm leading-snug cursor-pointer">
                                                            <span className="font-bold">Only my students</span>
                                                            <span className={cn('block text-xs mt-0.5', isGraphic ? 'text-muted-foreground' : 'text-muted-foreground')}>
                                                                Students on your roster (by class primary teacher or explicit assignment) can redeem.
                                                            </span>
                                                        </label>
                                                    </div>
                                                    <div className={cn('flex items-start gap-2 rounded-xl border p-3', isGraphic ? 'border-white/10 bg-card/40' : 'bg-background/80')}>
                                                        <RadioGroupItem value="classes" id="crs-classes" className="mt-1" />
                                                        <label htmlFor="crs-classes" className="text-sm leading-snug cursor-pointer">
                                                            <span className="font-bold">Selected classes</span>
                                                            <span className={cn('block text-xs mt-0.5', isGraphic ? 'text-muted-foreground' : 'text-muted-foreground')}>
                                                                Only students in the classes you pick below (your classes and roster).
                                                            </span>
                                                        </label>
                                                    </div>
                                                </RadioGroup>
                                                {printRedemptionScope === 'classes' && (
                                                    <div className="space-y-2">
                                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Classes</p>
                                                        <ScrollArea className={cn('h-40 rounded-xl border p-2', isGraphic ? 'border-white/10 bg-card/30' : 'bg-background')}>
                                                            <div className="space-y-2 pr-3">
                                                                {classesForTeacherUi.map((cl) => (
                                                                    <label key={cl.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                                                        <Checkbox
                                                                            checked={printScopeClassIds.includes(cl.id)}
                                                                            onCheckedChange={(ch: boolean | 'indeterminate') =>
                                                                                setPrintScopeClassIds((prev) =>
                                                                                    ch === true ? [...prev, cl.id] : prev.filter((id) => id !== cl.id)
                                                                                )
                                                                            }
                                                                        />
                                                                        <span>{cl.name}</span>
                                                                    </label>
                                                                ))}
                                                                {classesForTeacherUi.length === 0 && (
                                                                    <p className="text-xs text-muted-foreground px-1 py-2">
                                                                        No classes linked to you yet. Claim a class under Attendance or ask an admin to set a primary teacher.
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </ScrollArea>
                                                    </div>
                                                )}
                                            </div>
                                            )}

                                            <Button
                                                onClick={handlePrintSheet}
                                                className={cn(
                                                    "w-full font-black text-lg uppercase tracking-widest h-16 rounded-2xl shadow-xl transition-all active:scale-95 group",
                                                    'text-white'
                                                )}
                                                style={{ backgroundColor: teacherAccent }}
                                            >
                                                <Printer className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                                                Generate & print
                                            </Button>
                                        </div>

                                        <div className="w-full lg:w-80 lg:sticky lg:top-8 shrink-0">
                                            <div className={cn(
                                                'rounded-2xl border p-6 flex flex-col items-center shadow-sm',
                                                isGraphic ? 'bg-card/40 border-white/10' : 'bg-slate-50/50 border-slate-200'
                                            )}>
                                                <p className="text-[10px] font-bold uppercase tracking-widest mb-6 text-muted-foreground opacity-70">
                                                    Print Preview
                                                </p>
                                                <div
                                                    className={cn(
                                                        'coupon-print-preview-shell coupon-print-match-wrapper rounded-2xl border shadow-2xl',
                                                        isGraphic ? 'border-white/10 bg-foreground/5' : 'border-border/40 bg-slate-100/80'
                                                    )}
                                                >
                                                    <CouponPreview coupon={previewCoupon} schoolId={schoolId} />
                                                </div>
                                                <p className="text-[10px] text-muted-foreground mt-6 text-center italic opacity-60">
                                                    Each cell on the printed sheet matches this layout.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                            </CardContent>
                        </Card>
                                </div>

                                <div className="mt-8">
                                  <MyCoupons schoolId={schoolId!} teacherId={teacherId} teacherName={teacherName} students={studentsForTeacherActions} />
                                </div>
                            </TabsContent>

                            <TabsContent value="award" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex justify-center">
                                  <Card className={cn(
                                    "w-full max-w-6xl border-t-8 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1",
                                    isGraphic ? 'bg-card/60 backdrop-blur-2xl border-chart-2 shadow-[0_20px_50px_rgba(0,0,0,0.1)]' : 'bg-white border-chart-2 shadow-lg'
                                  )}>
                                    <CardHeader className="p-4 md:p-6">
                                      <CardTitle className="flex items-center gap-3">
                                        <div className={cn("p-2 rounded-xl", isGraphic ? 'bg-chart-2/20 text-chart-2' : 'bg-primary/10 text-primary')}>
                                          <Award className="w-6 h-6" />
                                        </div>
                                        Award / Deduct Points
                                      </CardTitle>
                                      <CardDescription className={isGraphic ? 'text-muted-foreground/80' : ''}>
                                        Select students on your roster and apply points instantly.
                                      </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-4 md:p-6 space-y-6">
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="grid w-[260px] grid-cols-2 rounded-xl border bg-muted/20 p-1">
                                          <Button
                                            type="button"
                                            variant={awardMode === 'award' ? 'default' : 'ghost'}
                                            className="h-9 rounded-lg text-xs font-black uppercase tracking-widest"
                                            onClick={() => setAwardMode('award')}
                                            style={awardMode === 'award' ? { backgroundColor: teacherAccent, color: '#fff' } : undefined}
                                          >
                                            Award
                                          </Button>
                                          <Button
                                            type="button"
                                            variant={awardMode === 'deduct' ? 'default' : 'ghost'}
                                            className="h-9 rounded-lg text-xs font-black uppercase tracking-widest"
                                            onClick={() => setAwardMode('deduct')}
                                            style={awardMode === 'deduct' ? { backgroundColor: teacherAccent, color: '#fff' } : undefined}
                                          >
                                            Deduct
                                          </Button>
                                        </div>
                                        <Button variant="outline" onClick={toggleSelectAll} className="rounded-xl">
                                          {selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0 ? 'Deselect All' : 'Select All'}
                                        </Button>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="relative group">
                                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                          <Input
                                            placeholder="Search name..."
                                            value={studentSearch}
                                            onChange={e => setStudentSearch(e.target.value)}
                                            className={cn("h-11 rounded-xl pl-9 transition-all", isGraphic ? 'bg-foreground/5 border-white/10' : 'bg-slate-50')}
                                          />
                                        </div>
                                        <Select value={filterClassId} onValueChange={setFilterClassId}>
                                          <SelectTrigger className={cn("h-11 rounded-xl transition-all", isGraphic ? 'bg-foreground/5 border-white/10' : 'bg-slate-50')}>
                                            <SelectValue placeholder="All Classes" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="all">All Classes</SelectItem>
                                            {classesForTeacherUi.map((c) => (
                                              <SelectItem key={c.id} value={c.id}>
                                                {c.name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <Select value={awardCategoryId} onValueChange={setAwardCategoryId}>
                                          <SelectTrigger className={cn("h-11 rounded-xl", isGraphic ? 'bg-foreground/5 border-white/10' : 'bg-slate-50')}>
                                            <SelectValue placeholder="Category" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {filteredCategories.map((c) => (
                                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <Input
                                          type="number"
                                          value={awardValue}
                                          onChange={(e) => setAwardValue(e.target.value)}
                                          className={cn("h-11 rounded-xl font-black", isGraphic ? 'bg-foreground/5 border-white/10' : 'bg-slate-50')}
                                          placeholder="Points"
                                        />
                                        {awardMode === 'deduct' ? (
                                          <Input
                                            value={awardReason}
                                            onChange={(e) => setAwardReason(e.target.value)}
                                            className={cn("h-11 rounded-xl", isGraphic ? 'bg-foreground/5 border-white/10' : 'bg-slate-50')}
                                            placeholder="Reason"
                                          />
                                        ) : (
                                          <div className="h-11" />
                                        )}
                                      </div>

                                      <Button
                                        onClick={awardMode === 'award' ? handleAwardPoints : handleDeductPoints}
                                        className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-white"
                                        style={{ backgroundColor: teacherAccent }}
                                      >
                                        {awardMode === 'award' ? 'Award Points' : 'Deduct Points'}
                                      </Button>

                                      <div className="rounded-2xl border bg-muted/20">
                                        <ScrollArea className="h-[360px] w-full">
                                          <ul className="p-3 space-y-2">
                                            {filteredStudents.map((s) => {
                                              const checked = selectedStudentIds.includes(s.id);
                                              return (
                                                <li key={s.id} className={cn("flex items-center justify-between gap-3 p-3 rounded-xl border bg-background/60", checked && "border-primary/30")}>
                                                  <div className="flex items-center gap-3">
                                                    <Checkbox
                                                      checked={checked}
                                                      onCheckedChange={(v) => handleStudentSelect(s.id, !!v)}
                                                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                    />
                                                    <div>
                                                      <p className="font-bold">{getStudentNickname(s)} {s.lastName}</p>
                                                      <p className="text-xs text-muted-foreground">{s.classId ? (classes?.find(c => c.id === s.classId)?.name || 'Unassigned') : 'Unassigned'}</p>
                                                    </div>
                                                  </div>
                                                  <span className="text-xs font-bold text-muted-foreground">{(s.points || 0).toLocaleString()} pts</span>
                                                </li>
                                              );
                                            })}
                                            {filteredStudents.length === 0 && (
                                              <li className="text-center text-sm text-muted-foreground py-10">No students found.</li>
                                            )}
                                          </ul>
                                        </ScrollArea>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>
                            </TabsContent>

                            <TabsContent value="roster" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <TeacherRosterTab
                                    teacherId={teacherId}
                                    allStudents={students || []}
                                    rosterStudents={studentsForTeacherActions}
                                    classes={classes || []}
                                    isGraphic={isGraphic}
                                />
                            </TabsContent>

                            {settings.enableAttendance && (
                            <TabsContent value="attendance" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/30 px-4 py-3 mb-6">
                                    <p className="text-sm text-muted-foreground max-w-prose">
                                        New setup takes one rule: class, period, points. Use the walkthrough for a quick test.
                                    </p>
                                    <AttendanceSetupWizard variant="teacher" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <Card className={cn(
                                        "md:col-span-2 border-t-8 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1",
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
                                        </CardHeader>
                                        <CardContent className="p-4 md:p-6">
                                            <TeacherAttendanceRewardsPanel
                                                teacherId={teacherId}
                                                classes={classes || []}
                                                periods={periods || []}
                                                categories={globalCategories || categories || []}
                                            />
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>
                            )}

                            <TabsContent value="prizes" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="grid grid-cols-1 gap-8">
                                    <div className="w-full">
                                        <TeacherPrizeManager schoolId={schoolId!} teacherId={teacherId} teachers={teachers} />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="redemptions" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <RecentRedemptions schoolId={schoolId!} students={studentsForTeacherActions} classes={classes || []} teacherId={teacherId} />
                                </div>
                            </TabsContent>

                            <TabsContent value="reports" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex justify-center w-full">
                                    <div className="w-full max-w-4xl">
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
                                            categories={globalCategories || categories || []}
                                        />
                                    </div>
                                </div>
                                </TabsContent>

                                {settings.enableGoals && isFeatureAllowed('enableGoals') && (
                                    <TabsContent value="goals" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="max-w-6xl mx-auto">
                                            <GoalsManager
                                                schoolId={schoolId!}
                                                variant="teacher"
                                                teacherId={teacherId}
                                                secretaryMode={secretaryMode}
                                                students={studentsForTeacherActions}
                                                classes={classesForTeacherUi}
                                                categories={categories ?? []}
                                                prizes={prizes ?? []}
                                                isGraphic={isGraphic}
                                            />
                                        </div>
                                    </TabsContent>
                                )}

                            {settings.enableHomework && (
                                <TabsContent value="homework" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="max-w-6xl mx-auto">
                                    <TeacherHomeworkTab schoolId={schoolId!} teacherId={teacherId} students={studentsForTeacherActions} classes={classesForTeacherUi} />
                                </div>
                            </TabsContent>
                            )}

                    </Tabs>
                </div>

            </div>
        </TooltipProvider>
    );
}
