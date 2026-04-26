
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, limit } from 'firebase/firestore';
import { StudentScanner, type StudentFoundMeta } from '@/components/StudentScanner';
import { FaceMismatchBanner } from '@/components/FaceMismatchBanner';
import { getReadableErrorMessage } from '@/lib/errorMessage';
import { runMotor as runVendingMotor, isConnected as motorIsConnected } from '@/lib/vendingMotor';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Student, Prize, HistoryItem } from '@/lib/types';
import { format } from 'date-fns';
import {
    Gift,
    LogOut,
    ShoppingBag,
    ChevronRight,
    Clock,
    ShoppingBasket,
    Plus,
    Minus,
    Loader2
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import DynamicIcon from '@/components/DynamicIcon';
import { cn, getStudentNickname, getContrastColor } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from '@/components/providers/SettingsProvider';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { GoogleFontLoader } from '@/components/GoogleFontLoader';
import { useActiveStudentSession } from '@/hooks/useActiveStudentSession';


function ConfirmRedemptionDialog({
    student,
    prize,
    isOpen,
    onOpenChange,
    onConfirm
}: {
    student: Student | null,
    prize: Prize | null,
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    onConfirm: (quantity: number) => void
}) {
    const [quantity, setQuantity] = useState(1);
    const playSound = useArcadeSound();

    useEffect(() => {
        if (isOpen) {
            setQuantity(1);
        }
    }, [isOpen]);

    if (!prize || !student) return null;

    const studentPoints = typeof student.points === 'number' ? student.points : 0;
    const prizePoints = typeof prize.points === 'number' ? prize.points : 0;
    const totalCost = prizePoints * quantity;
    const canAfford = studentPoints >= totalCost;
    const remainingPoints = studentPoints - totalCost;

    const handleQuantityChange = (amount: number) => {
        const newQuantity = Math.max(1, quantity + amount);
        setQuantity(newQuantity);
        playSound('click');
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
                    <AlertDialogDescription>
                        You are redeeming <span className="font-bold">{prize.name}</span>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4 space-y-4">
                    <div className="flex items-center justify-center gap-4">
                        <Button variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={() => handleQuantityChange(-1)} disabled={quantity <= 1}>
                            <Minus className="w-5 h-5" />
                        </Button>
                        <div className="text-4xl font-bold w-20 text-center">{quantity}</div>
                        <Button variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={() => handleQuantityChange(1)} disabled={student.points < prize.points * (quantity + 1)}>
                            <Plus className="w-5 h-5" />
                        </Button>
                    </div>
                    <div className="text-sm space-y-1 bg-secondary p-3 rounded-lg">
                        <div className="flex justify-between"><span>Total Cost:</span> <span className="font-bold">{totalCost.toLocaleString()} pts</span></div>
                        <div className={`flex justify-between ${!canAfford ? 'text-destructive' : ''}`}><span>Your balance after:</span> <span className="font-bold">{remainingPoints.toLocaleString()} pts</span></div>
                    </div>
                    {!canAfford && <p className="text-sm text-destructive font-bold text-center">You don't have enough points for this quantity.</p>}
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => onOpenChange(false)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onConfirm(quantity)} disabled={!canAfford}>
                        Confirm
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function PrizeActivityList({ schoolId, studentId }: { schoolId: string; studentId: string }) {
    const firestore = useFirestore();
    const activitiesQuery = useMemoFirebase(() => {
        if (!schoolId || !studentId) return null;
        return query(
            collection(firestore, `schools/${schoolId}/students/${studentId}/activities`),
            orderBy('date', 'desc'),
            limit(20)
        );
    }, [firestore, schoolId, studentId]);
    const { data: history, isLoading } = useCollection<HistoryItem>(activitiesQuery);

    if (isLoading) {
        return <div className="py-4 text-center text-sm text-muted-foreground">Loading history...</div>;
    }

    return (
        <ScrollArea className="h-[400px] w-full pr-4">
            <ul className="space-y-3">
                {history && history.length > 0 ? (
                    history.map((item, index) => (
                        <li key={index} className="bg-background/50 rounded-xl p-3 border border-border/40 transition-all hover:bg-background/80">
                            <div className="flex justify-between items-start mb-1">
                                <p className="font-bold text-sm text-foreground truncate">{item.desc}</p>
                                <Badge variant={item.amount > 0 ? 'default' : 'secondary'} className={cn("text-[10px] h-5 px-1.5", item.amount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>
                                    {item.amount > 0 ? `+${item.amount}` : item.amount} pts
                                </Badge>
                            </div>
                            {item.date ? (
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    {(() => {
                                        try {
                                            return format(new Date(item.date), 'MMM d, h:mm a');
                                        } catch (e) {
                                            return 'Date unknown';
                                        }
                                    })()}
                                </p>
                            ) : (
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-30">Date unknown</p>
                            )}
                        </li>
                    ))
                ) : (
                    <p className="text-center text-muted-foreground italic py-4 text-sm font-medium">No recent activity.</p>
                )}
            </ul>
        </ScrollArea>
    );
}

function PrizeDashboard({
    studentId,
    onDone,
}: {
    studentId: string;
    onDone: () => void;
}) {
    const { schoolId, redeemPrize, printPrizeTickets } = useAppContext();
    const firestore = useFirestore();
    const { toast } = useToast();
    const playSound = useArcadeSound();
    const [hoveredPrize, setHoveredPrize] = useState<string | null>(null);
    const { settings } = useSettings();
    const [confirmingPrize, setConfirmingPrize] = useState<Prize | null>(null);
    const [ticketData, setTicketData] = useState<{
        activityId: string;
        ticketNo: string;
        redeemedAt: number;
        studentId: string;
        studentName: string;
        studentNickname?: string;
        prizeName: string;
        prizeIcon?: string;
        quantity: number;
        totalCost: number;
    } | null>(null);

    const studentDocRef = useMemoFirebase(() => schoolId ? doc(firestore, 'schools', schoolId, 'students', studentId) : null, [firestore, schoolId, studentId]);
    const { data: student, isLoading: studentLoading } = useDoc<Student>(studentDocRef);

    const prizesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'prizes') : null, [firestore, schoolId]);
    const { data: prizes, isLoading: prizesLoading } = useCollection<Prize>(prizesQuery);

    const handlePrintTicket = useCallback(() => {
        if (!ticketData || !schoolId) return;
        setTicketData(null);
        const qty = Math.max(1, Math.floor(Number(ticketData.quantity)) || 1);
        const baseNo = ticketData.ticketNo.replace(/\D/g, '').slice(-6) || String(ticketData.redeemedAt).slice(-6);
        const perUnitCost =
            qty > 0 && typeof ticketData.totalCost === 'number'
                ? Math.round(ticketData.totalCost / qty)
                : undefined;
        const sheets = Array.from({ length: qty }, (_, i) => ({
            activityId: ticketData.activityId,
            ticketNo: qty > 1 ? `${baseNo}-${i + 1}` : baseNo,
            redeemedAt: ticketData.redeemedAt,
            studentId: ticketData.studentId,
            studentName: ticketData.studentName,
            studentNickname: ticketData.studentNickname,
            prizeName: ticketData.prizeName,
            prizeIcon: ticketData.prizeIcon,
            quantity: 1,
            totalCost: perUnitCost,
        }));
        printPrizeTickets(sheets);
    }, [ticketData, schoolId, printPrizeTickets]);

    const handleRedeemReward = async (prize: Prize, quantity: number) => {
        if (!student) return;
        setConfirmingPrize(null);
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            playSound('error');
            toast({
                variant: 'destructive',
                title: 'No connection',
                description: 'Connect to the internet, then try redeeming again.',
                duration: 8000,
            });
            return;
        }
        try {
            const result = await redeemPrize(student.id, prize, quantity);
            if (!result.success) {
                throw new Error(result.message || 'An error occurred during redemption.');
            }

            const { activityId, redeemedAt, totalCost } = result;

            playSound('redeem');
            toast({
                title: 'Reward Redeemed!',
                description: `Successfully redeemed ${prize.name}${quantity > 1 ? ` (x${quantity})` : ''}.`,
            });

            if (prize.vendingMotor?.enabled) {
                if (!motorIsConnected()) {
                    toast({
                        variant: 'destructive',
                        title: 'Motor not connected',
                        description:
                            'This prize is configured to dispense from the vending machine, but no USB serial port is connected.',
                        duration: 8000,
                    });
                } else {
                    for (let i = 0; i < quantity; i++) {
                        try {
                            await runVendingMotor(prize.vendingMotor);
                        } catch (motorErr) {
                            console.error('Vending motor dispense failed:', motorErr);
                            toast({
                                variant: 'destructive',
                                title: 'Motor error',
                                description: getReadableErrorMessage(motorErr, 'The vending motor failed mid-dispense.'),
                                duration: 8000,
                            });
                            break;
                        }
                    }
                }
            }
            if (prize.offerPrintTicketOnRedeem === true && activityId && redeemedAt && typeof totalCost === 'number') {
                const ticketNo = String(redeemedAt).slice(-6);
                const displayFirst = getStudentNickname(student);
                const legalFirst = (student.firstName || '').trim();
                const nick = student.nickname?.trim();
                setTicketData({
                    activityId,
                    ticketNo,
                    redeemedAt,
                    studentId: student.id,
                    studentName: `${displayFirst} ${student.lastName}`.trim(),
                    studentNickname:
                        nick && legalFirst && displayFirst.trim() !== legalFirst ? legalFirst : undefined,
                    prizeName: prize.name,
                    prizeIcon: prize.icon || 'Gift',
                    quantity,
                    totalCost,
                });
            }
        } catch (error: unknown) {
            console.error('Redemption error:', error);
            playSound('error');
            toast({
                variant: 'destructive',
                title: 'Redemption Failed',
                description: getReadableErrorMessage(error, 'An error occurred during redemption.'),
                duration: 8000,
            });
        }
    };

    if (studentLoading || prizesLoading || !student) {
        return (
            <div className="space-y-6 animate-pulse p-8">
                <Skeleton className="h-32 w-full rounded-3xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-3xl" />)}
                </div>
            </div>
        );
    }

    const visiblePrizes = (prizes || [])
        .filter(p => {
            if (!p.inStock) return false;
            const teacherMatch = !p.teacherId || (student.teacherIds || []).includes(p.teacherId);
            const classMatch = !p.classId || student.classId === p.classId;
            return teacherMatch && classMatch;
        })
        .sort((a, b) => (a.points || 0) - (b.points || 0));

    const fontScale = student.theme?.fontScale ?? 1;
    const themeBg = student.theme?.background || 'transparent';
    const computedThemeText = student.theme?.text || (getContrastColor(student.theme?.background || student.theme?.cardBackground || student.theme?.primary || '#0ea5e9') === 'black' ? '#020617' : '#ffffff');

    return (
        <TooltipProvider>
            <div
                className={cn("min-h-screen relative overflow-hidden font-sans flex flex-col items-center", settings.displayMode === 'app' && 'pb-24', (!student || !student.theme) ? "bg-background text-foreground" : "")}
                style={(student && student.theme) ? {
                    '--theme-bg': themeBg,
                    '--theme-text': computedThemeText,
                    '--theme-primary': student.theme.primary || 'hsl(var(--primary))',
                    '--theme-card': student.theme.cardBackground || 'hsl(var(--card))',
                    '--theme-accent': student.theme.accent || 'hsl(var(--accent))',
                    background: student.theme.backgroundStyle || `radial-gradient(circle at top left, ${student.theme.primary || 'hsl(var(--primary))'}22 0, transparent 45%), radial-gradient(circle at bottom right, ${student.theme.accent || 'hsl(var(--accent))'}22 0, ${student.theme.background || 'transparent'} 55%)`,
                    color: 'var(--theme-text)',
                    fontFamily: student.theme.fontFamily || 'inherit',
                    fontSize: fontScale !== 1 ? `${fontScale}em` : undefined,
                } as React.CSSProperties : {}}
            >
                {student.theme?.fontFamily && <GoogleFontLoader fontFamily={student.theme.fontFamily} />}

                {/* Noise and theme emoji overlay */}
                <div className="pointer-events-none fixed inset-0 opacity-[0.03] z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
                {student.theme?.emoji && (
                    <div className="pointer-events-none fixed inset-0 flex items-center justify-center z-0 opacity-5">
                        <span className="text-[220px] leading-none">
                            {student.theme.emoji}
                        </span>
                    </div>
                )}

                <main className="relative z-10 w-full max-w-full px-8">
                    <Card
                        className={cn("border-t-8 shadow-2xl mt-12 mb-24 backdrop-blur-md", !student.theme ? "border-chart-3 bg-card/80" : "bg-card/40")}
                        style={student.theme ? { backgroundColor: 'var(--theme-card)', color: 'var(--theme-text)', borderColor: 'var(--theme-primary)' } : undefined}
                    >
                        <CardContent className="p-6 md:p-8">
                            {/* Header */}
                            <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-16">
                                <div className="text-center md:text-left">
                                    <h2 className="text-5xl font-black tracking-tighter font-headline drop-shadow-sm mb-4 flex items-center justify-center md:justify-start gap-4">
                                        {student.theme?.emoji ? (
                                            <span
                                                className="text-6xl leading-none"
                                                style={{ filter: student.theme?.primary ? `drop-shadow(0 0 10px ${student.theme.primary}) drop-shadow(0 0 20px ${student.theme.primary})` : undefined }}
                                            >
                                                {student.theme.emoji}
                                            </span>
                                        ) : (
                                            <ShoppingBag className="w-12 h-12 text-primary" />
                                        )}
                                        <span style={{ color: student.theme ? 'var(--theme-primary)' : 'hsl(var(--primary))' }}>Prize Shop</span>
                                    </h2>
                                    <p className="text-sm font-bold uppercase tracking-[0.3em]" style={{ color: student.theme ? 'var(--theme-text)' : undefined, opacity: 0.7 }}>
                                        Redeem your points for rewards
                                    </p>
                                </div>
                                <div
                                    className="backdrop-blur-md border-2 rounded-3xl p-6 px-10 text-center shadow-xl"
                                    style={student.theme ? {
                                        backgroundColor: 'var(--theme-card)',
                                        borderColor: 'var(--theme-primary)'
                                    } : {
                                        backgroundColor: 'hsl(var(--card) / 0.8)',
                                        borderColor: 'hsl(var(--primary) / 0.2)'
                                    }}
                                >
                                    <p className="text-xs font-black uppercase tracking-[0.2em] mb-1" style={{ color: student.theme ? 'var(--theme-text)' : undefined, opacity: 0.7 }}>
                                        {student.firstName} {student.lastName}
                                    </p>
                                    {student.nickname?.trim() ? (
                                        <p className="text-[10px] font-black uppercase tracking-[0.25em] -mt-1 mb-2" style={{ color: student.theme ? 'var(--theme-text)' : undefined, opacity: 0.65 }}>
                                            {student.nickname.trim()}
                                        </p>
                                    ) : null}
                                    <p className="text-4xl font-black tracking-tighter" style={{ color: student.theme ? 'var(--theme-primary)' : 'hsl(var(--primary))' }}>{(student.points || 0).toLocaleString()} <span className="text-sm font-bold uppercase tracking-widest ml-1" style={{ color: student.theme ? 'var(--theme-primary)' : 'hsl(var(--primary) / 0.6)', opacity: 0.6 }}>pts</span></p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10">
                                {/* Prizes Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 h-fit">
                                    {visiblePrizes.length === 0 ? (
                                        <div className="col-span-full py-20 text-center bg-card/30 backdrop-blur-sm rounded-3xl border-2 border-dashed border-border">
                                            <ShoppingBasket className="w-20 h-20 mx-auto text-muted-foreground/30 mb-6" />
                                            <p className="font-black text-2xl text-muted-foreground">The shop is empty</p>
                                            <p className="text-sm text-muted-foreground/60 font-medium mt-2 uppercase tracking-widest">Check back soon for new rewards!</p>
                                        </div>
                                    ) : (
                                        visiblePrizes.map((prize: Prize, index) => {
                                            const canAfford = student.points >= prize.points;
                                            const isHovered = hoveredPrize === prize.id;

                                            return (
                                                <motion.div
                                                    key={prize.id}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    onMouseEnter={() => setHoveredPrize(prize.id)}
                                                    onMouseLeave={() => setHoveredPrize(null)}
                                                    className={cn(
                                                        "group relative flex flex-col items-center justify-between text-center p-8 rounded-3xl border-2 border-transparent transition-all duration-300 backdrop-blur-sm",
                                                        canAfford ? "hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1" : "opacity-60 grayscale cursor-not-allowed"
                                                    )}
                                                    style={student.theme ? {
                                                        backgroundColor: canAfford ? 'var(--theme-card)' : 'transparent',
                                                        borderColor: (isHovered && canAfford) ? 'var(--theme-primary)' : 'transparent'
                                                    } : {
                                                        backgroundColor: canAfford ? 'hsl(var(--card) / 0.4)' : 'hsl(var(--card) / 0.1)'
                                                    }}
                                                >
                                                    {/* SVG Border Draw Animation */}
                                                    {isHovered && canAfford && (
                                                        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible rounded-3xl z-20">
                                                            <motion.rect
                                                                initial={{ pathLength: 0 }}
                                                                animate={{ pathLength: 1 }}
                                                                transition={{ duration: 0.6 }}
                                                                width="100%"
                                                                height="100%"
                                                                rx="24"
                                                                className="stroke-primary stroke-[3px] fill-none"
                                                            />
                                                        </svg>
                                                    )}

                                                    <div className={cn(
                                                        "w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-500 bg-gradient-to-br",
                                                        canAfford ? "group-hover:scale-110 group-hover:rotate-6" : ""
                                                    )}
                                                        style={student.theme ? {
                                                            backgroundColor: canAfford ? 'var(--theme-bg)' : 'transparent',
                                                            color: canAfford ? 'var(--theme-primary)' : 'var(--theme-text)'
                                                        } : {
                                                            backgroundImage: canAfford
                                                                ? 'linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--chart-3) / 0.3))'
                                                                : 'linear-gradient(135deg, hsl(var(--muted) / 0.6), hsl(var(--muted) / 0.8))',
                                                            color: canAfford ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'
                                                        }}
                                                    >
                                                        <DynamicIcon name={prize.icon || 'Gift'} className="w-10 h-10" />
                                                    </div>

                                                    <div className="mb-6">
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <h3 className="font-black text-xl text-foreground tracking-tight line-clamp-1 cursor-help">
                                                                    {prize.name}
                                                                </h3>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top" align="center">
                                                                <p className="max-w-xs break-words text-sm font-semibold">
                                                                    {prize.name}
                                                                </p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                        <div className="mt-3 flex items-center justify-center gap-2">
                                                            <Badge
                                                                className="font-black text-base px-4 py-1 rounded-xl text-white"
                                                                style={student.theme ? { backgroundColor: 'var(--theme-primary)' } : { backgroundColor: 'hsl(var(--primary))' }}
                                                            >
                                                                {(prize.points || 0).toLocaleString()} pts
                                                            </Badge>
                                                        </div>
                                                    </div>

                                                    <Button
                                                        onClick={() => setConfirmingPrize(prize)}
                                                        disabled={!canAfford}
                                                        className={cn(
                                                            "w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg text-white"
                                                        )}
                                                        style={student.theme && canAfford ? { backgroundColor: 'var(--theme-primary)' } : canAfford ? { backgroundColor: 'hsl(var(--primary))' } : { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
                                                    >
                                                        <Gift className="mr-2 w-4 h-4" /> Redeem Now
                                                    </Button>

                                                    <AnimatePresence>
                                                        {isHovered && canAfford && (
                                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.05 }} exit={{ opacity: 0 }} className="absolute inset-0 rounded-3xl pointer-events-none bg-primary" />
                                                        )}
                                                    </AnimatePresence>
                                                </motion.div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Sidebar */}
                                <div className="space-y-6">
                                    <Card
                                        className="backdrop-blur-sm border-2 rounded-3xl overflow-hidden shadow-xl"
                                        style={student.theme ? { backgroundColor: 'var(--theme-card)', borderColor: 'var(--theme-bg)' } : { backgroundColor: 'hsl(var(--card) / 0.4)', borderColor: 'hsl(var(--border) / 0.5)' }}
                                    >
                                        <CardHeader className="border-b py-6 px-8" style={student.theme ? { backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-bg)' } : { backgroundColor: 'hsl(var(--primary) / 0.05)', borderColor: 'hsl(var(--border) / 0.5)' }}>
                                            <CardTitle className="text-sm font-black uppercase tracking-[0.3em] flex items-center gap-3" style={student.theme ? { color: 'var(--theme-primary)' } : { color: 'hsl(var(--primary))' }}>
                                                <Clock className="w-5 h-5" style={student.theme ? { color: 'var(--theme-primary)' } : { color: 'hsl(var(--chart-3))' }} /> Recent Activity
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-6">
                                            <PrizeActivityList schoolId={schoolId!} studentId={student.id} />
                                        </CardContent>
                                    </Card>

                                    <Button
                                        variant="outline"
                                        className="w-full h-16 rounded-3xl border-2 font-black uppercase tracking-widest text-xs transition-all group"
                                        onClick={onDone}
                                        style={student.theme ? {
                                            borderColor: 'var(--theme-text)',
                                            color: 'var(--theme-text)',
                                            backgroundColor: 'transparent'
                                        } : {
                                            borderColor: 'hsl(var(--rose-200))',
                                            color: 'hsl(var(--rose-600))'
                                        }}
                                    >
                                        <LogOut className="mr-2 w-5 h-5 transition-transform group-hover:-translate-x-1" /> Log Out & Finish
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </main>
                <ConfirmRedemptionDialog
                    isOpen={!!confirmingPrize}
                    onOpenChange={(open) => {
                        if (!open) setConfirmingPrize(null);
                    }}
                    student={student}
                    prize={confirmingPrize}
                    onConfirm={(quantity) => {
                        const p = confirmingPrize;
                        if (p) void handleRedeemReward(p, quantity);
                    }}
                />
                <AlertDialog open={!!ticketData} onOpenChange={(open) => { if (!open) setTicketData(null); }}>
                    <AlertDialogContent className="no-print">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Print redeem ticket?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Print a ticket for <span className="font-bold">{ticketData?.prizeName}</span>{ticketData && ticketData.quantity > 1 ? ` (x${ticketData.quantity})` : ''}.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:justify-end sm:space-x-0">
                            <AlertDialogCancel onClick={() => setTicketData(null)}>No Thanks</AlertDialogCancel>
                            <AlertDialogAction className="w-full sm:w-auto" onClick={handlePrintTicket}>Print Ticket</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </TooltipProvider>
    );
}
export default function PrizePage() {
    const { loginState, isInitialized } = useAppContext();
    const { settings } = useSettings();

    const { activeStudentId, setActiveStudentId, handleDone, loginMeta, setLoginMeta } = useActiveStudentSession();

    const onScannerStudent = useCallback(
        (id: string, meta?: StudentFoundMeta) => {
            setActiveStudentId(id);
            if (meta?.source === 'face') {
                setLoginMeta({ source: 'face', confidence: meta.confidence });
            } else {
                setLoginMeta(null);
            }
        },
        [setActiveStudentId, setLoginMeta],
    );

    if (!isInitialized || !['student', 'teacher', 'admin', 'school', 'developer'].includes(loginState)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Button disabled variant="ghost" size="lg" className="text-muted-foreground">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Loading Kiosk...
                </Button>
            </div>
        );
    }

    if (activeStudentId) {
        return (
            <>
                {loginMeta?.source === 'face' && (
                    <FaceMismatchBanner
                        studentId={activeStudentId}
                        confidence={loginMeta.confidence}
                        onResolved={handleDone}
                    />
                )}
                <PrizeDashboard studentId={activeStudentId} onDone={handleDone} />
            </>
        );
    }

    return (
        <TooltipProvider>
            <div className={cn("min-h-[80vh] flex flex-col items-center justify-center", settings.displayMode === 'app' && 'pb-24')}>
                <StudentScanner
                    onStudentFound={onScannerStudent}
                    title="Prize Redemption"
                    description="Choose how to identify the student below."
                    icon={<Gift className="w-10 h-10 text-chart-3" />}
                />
            </div>
        </TooltipProvider>
    );
}
