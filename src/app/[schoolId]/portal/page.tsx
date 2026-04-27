
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '@/components/AppProvider';
import { GraduationCap, Printer, Gift, UserCog, Trophy, ChevronRight, Loader2, Home } from 'lucide-react';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from "framer-motion";
import { Button } from '@/components/ui/button';
import { rainbowByIndex } from '@/lib/rainbowNav';
import { globalAnimatedBackdropActive } from '@/lib/animatedBackdrop';

export default function PortalPage() {
    const { loginState, isInitialized, schoolId, isAdmin } = useAppContext();
    const router = useRouter();
    const { settings, updateSettings } = useSettings();
    const playSound = useArcadeSound();
    const [hoveredIndex, setHoveredIndex] = useState<string | null>(null);
    const animBackdrop = globalAnimatedBackdropActive(settings);
    const showPortalLocalDecor = settings.graphicMode === 'graphics' && !animBackdrop;
    const isStaff = loginState === 'teacher' || loginState === 'admin' || loginState === 'developer';
    const isStudentLike = !isStaff && loginState !== 'loggedOut';
    const shouldRedirectStudentLike = isInitialized && isStudentLike && !!schoolId && schoolId !== 'schoolabc';

    useEffect(() => {
        if (shouldRedirectStudentLike) {
            router.replace(`/${schoolId}/student`);
        }
    }, [router, schoolId, shouldRedirectStudentLike]);

    if (!isInitialized) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Button disabled variant="ghost" size="lg" className="text-muted-foreground">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Loading Portal...
                </Button>
            </div>
        );
    }

    // Kiosk/student sessions should not land on the full portal menu.
    // Except for the demo school where we want the full experience visible.
    if (shouldRedirectStudentLike) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Button disabled variant="ghost" size="lg" className="text-muted-foreground">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Opening Student Kiosk...
                </Button>
            </div>
        );
    }

    const portals = [
        ...(isAdmin || schoolId === 'schoolabc' ? [{ id: 'admin', href: `/${schoolId}/admin`, title: 'Admin Portal', description: 'Manage school data and settings.', icon: UserCog }] : []),
        ...(isStaff || schoolId === 'schoolabc'
            ? [{ id: 'print', href: `/${schoolId}/teacher`, title: 'Teacher Portal', description: 'Print coupons or award points directly to students.', icon: Printer }]
            : []),
        { id: 'redeem', href: `/${schoolId}/student`, title: 'Student Kiosk', description: 'Scan your badge to redeem coupon codes and view points.', icon: GraduationCap },
        ...(isStaff && settings.enableStudentPortal ? [{ id: 'student-home', href: `/${schoolId}/student-home`, title: 'Student Home Portal', description: 'Log in from home to check your points and prizes.', icon: Home }] : []),
        { id: 'prize', href: `/${schoolId}/prize`, title: 'Prize Shop', description: 'Spend your points for awesome prizes.', icon: Gift },
        ...(isStaff || schoolId === 'schoolabc'
            ? [{ id: 'fame', href: `/${schoolId}/halloffame`, title: 'Hall of Fame', description: 'View top student point earners.', icon: Trophy }]
            : []),
    ];

    return (
        <div className={cn(
                "min-h-[calc(100vh-5rem)] text-foreground relative font-sans flex flex-col items-center pt-2 sm:pt-6",
                animBackdrop ? "bg-transparent" : "bg-background",
                settings.displayMode === 'app' && 'pb-24',
            )}>
            {showPortalLocalDecor && (
            <div className="pointer-events-none fixed inset-0 opacity-[0.03] z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
            )}

            {showPortalLocalDecor && (
                <>
                    <motion.div
                        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="pointer-events-none fixed -top-20 -right-20 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px] z-0"
                    />
                    <motion.div
                        animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
                        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                        className="pointer-events-none fixed bottom-20 left-20 h-[400px] w-[400px] rounded-full bg-chart-5/10 blur-[120px] z-0"
                    />
                    <motion.div
                        animate={{ x: [0, 20, 0], y: [0, -30, 0] }}
                        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                        className="pointer-events-none fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-chart-2/5 blur-[150px] z-0"
                    />
                </>
            )}

            <main className="relative z-10 w-full max-w-2xl px-4 sm:px-6 flex flex-col justify-start">
                <motion.div
                    initial={{ opacity: 0, y: 48, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    className="mb-8 mt-2 text-center"
                >
                    <h2
                        className="text-5xl font-black tracking-tighter font-headline drop-shadow-md px-6 py-2 inline-block"
                        style={{
                            color: rainbowByIndex(0, settings.colorScheme),
                            textShadow: `0 0 14px ${rainbowByIndex(0, settings.colorScheme)}55, 0 0 28px ${rainbowByIndex(0, settings.colorScheme)}33`,
                        }}
                    >
                        Where to?
                    </h2>
                    {schoolId === 'schoolabc' && !settings.showIntroWizard && (
                        <div className="mt-1">
                            <Button variant="link" onClick={() => {
                                playSound('click');
                                updateSettings({ showIntroWizard: true });
                            }}>
                                Click here to start the wizard
                            </Button>
                        </div>
                    )}
                </motion.div>

                <div className="flex flex-col gap-4">
                    {portals.map((area, index) => {
                        const Icon = area.icon;
                        const rainbowColor = rainbowByIndex(index, settings.colorScheme);
                        return (
                            <Link
                                key={area.id}
                                href={area.href}
                                onClick={() => playSound('click')}
                                className="block group no-underline rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            >
                                <motion.div
                                    initial={{ opacity: 0, x: -50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.5, delay: 0.15 + index * 0.1 }}
                                    onMouseEnter={() => setHoveredIndex(area.id)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                    className={cn(
                                        "relative flex w-full items-center justify-between rounded-2xl border-2 px-6 py-4 md:px-8 md:py-5 text-left transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1",
                                        animBackdrop
                                            ? "border-border/50 bg-card/90 backdrop-blur-md shadow-sm hover:bg-card hover:border-border"
                                            : "border-transparent bg-card/40 backdrop-blur-sm hover:bg-card",
                                    )}
                                >
                                    {/* Fixed Vertical Color Bar - Increased visibility when inactive */}
                                    <div
                                      className={cn(
                                        "absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl transition-all duration-500 shadow-sm",
                                        hoveredIndex === area.id ? "opacity-100" : "opacity-70"
                                      )}
                                      style={{ backgroundColor: rainbowColor }}
                                    />

                                    {/* Left content */}
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all duration-300 border-2 border-border/50 shadow-md",
                                            animBackdrop ? "bg-card/90" : "bg-card/70",
                                            "group-hover:scale-105 group-hover:border-primary/20 group-hover:shadow-lg"
                                        )}>
                                            <Icon className="w-6 h-6 md:w-7 md:h-7" style={{ color: rainbowColor }} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg md:text-xl font-black tracking-tight leading-tight" style={{ color: rainbowColor }}>
                                              {area.title}
                                            </h3>
                                            <p className="text-sm text-muted-foreground mt-1 font-medium leading-normal">{area.description}</p>
                                        </div>
                                    </div>

                                    {/* Right arrow — always visible, darker on hover (touch-friendly) */}
                                    <motion.div animate={{ x: hoveredIndex === area.id ? 0 : -4, opacity: hoveredIndex === area.id ? 1 : 0.4 }} transition={{ duration: 0.2 }}>
                                        <ChevronRight className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
                                    </motion.div>

                                    {/* Background Glow - Increased opacity on hover */}
                                    <AnimatePresence>
                                        {hoveredIndex === area.id && (
                                            <motion.div
                                              initial={{ opacity: 0 }}
                                              animate={{ opacity: 0.08 }}
                                              exit={{ opacity: 0 }}
                                              className="absolute inset-0 rounded-2xl pointer-events-none"
                                              style={{ backgroundColor: rainbowColor }}
                                            />
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            </Link>
                        )
                    })}
                </div>

                <div className="mt-16 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60">beta · {process.env.NEXT_PUBLIC_VERSION || 'beta-1.1.0'}</p>
                </div>
            </main>
        </div>
    );
}
