'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { RotateCcw, Trophy, XCircle, Sparkles, Loader2 } from 'lucide-react';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { LEVELUP_BRAND_PRIMARY_HEX } from '@/lib/appBranding';

interface BonusSpinWheelModalProps {
    isOpen: boolean;
    achievement: any;
    onWon: (wonAmount: number) => Promise<void>;
    primaryColor?: string;
}

export function BonusSpinWheelModal({
    isOpen,
    achievement,
    onWon,
    primaryColor = LEVELUP_BRAND_PRIMARY_HEX,
}: BonusSpinWheelModalProps) {
    const [isSpinning, setIsSpinning] = useState(false);
    const [result, setResult] = useState<number | null>(null);
    const [hasSpun, setHasSpun] = useState(false);
    const controls = useAnimation();
    const playSound = useArcadeSound();
    const spinTo = useRef(0);

    const segments = useMemo(() => {
        const raw = achievement?.wheelSegments;
        if (
            Array.isArray(raw) &&
            raw.length === 6 &&
            raw.every((s: unknown) => typeof s === 'number' && Number.isFinite(s))
        ) {
            return raw as number[];
        }
        const base = Number(achievement?.bonusPoints) || 10;
        return [
            Math.floor(base * 0.5),
            base,
            Math.floor(base * 1.5),
            base * 2,
            Math.floor(base * 2.5),
            base * 3,
        ];
    }, [achievement]);

    // Distinct background colors for the 6 segments (using CSS hex colors for easy SVG fill)
    const segmentColors = [
        '#f59e0b', // amber-500
        '#10b981', // emerald-500
        '#3b82f6', // blue-500
        '#8b5cf6', // purple-500
        '#ef4444', // red-500
        '#6366f1'  // indigo-500
    ];

    useEffect(() => {
        if (isOpen && !hasSpun && achievement) {
            setHasSpun(true);
            // Trigger automatic spin
            setTimeout(() => {
                handleSpin();
            }, 1000);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, hasSpun, achievement]);

    const handleSpin = async () => {
        if (isSpinning || result) return;

        setIsSpinning(true);
        playSound('click');

        // Pick a random segment
        const segmentIndex = Math.floor(Math.random() * segments.length);
        const wonAmount = segments[segmentIndex];

        // Center rotation angle on the chosen segment
        const sliceAngle = 360 / segments.length;
        const targetOffset = segmentIndex * sliceAngle + sliceAngle / 2;

        // Base rotation: 5 full circles
        const targetRotation = 1800 + (360 - targetOffset);
        spinTo.current = targetRotation;

        await controls.start({
            rotate: targetRotation,
            transition: {
                duration: 4.5,
                ease: [0.33, 1, 0.68, 1], // Cubic-bezier slow down deceleration
            }
        });

        setIsSpinning(false);
        setResult(wonAmount);
        playSound('success');

        // Allow reading the prize, then close/callback
        setTimeout(async () => {
            await onWon(wonAmount);
        }, 3000);
    };

    // Calculate SVG Pie Slices
    const svgPaths = useMemo(() => {
        const paths: string[] = [];
        const radius = 120;
        const center = 120;
        const angle = (2 * Math.PI) / segments.length;

        for (let i = 0; i < segments.length; i++) {
            const startAngle = i * angle;
            const endAngle = (i + 1) * angle;

            const x1 = center + radius * Math.sin(startAngle);
            const y1 = center - radius * Math.cos(startAngle);
            const x2 = center + radius * Math.sin(endAngle);
            const y2 = center - radius * Math.cos(endAngle);

            const d = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
            paths.push(d);
        }
        return paths;
    }, [segments]);

    return (
        <Dialog open={isOpen} onOpenChange={() => {}}>
            <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-md border border-border/60 shadow-2xl p-6 rounded-3xl overflow-hidden text-center flex flex-col items-center justify-center space-y-6">
                <DialogHeader className="w-full">
                    <DialogTitle className="text-2xl font-black tracking-tight uppercase italic flex items-center justify-center gap-2 text-primary">
                        <Sparkles className="w-6 h-6 animate-pulse" /> Bonus Spin Wheel <Sparkles className="w-6 h-6 animate-pulse" />
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground text-sm font-medium">
                        You unlocked <span className="font-bold text-foreground">{achievement?.name || 'Milestone'}</span>! Spinning for your bonus...
                    </DialogDescription>
                </DialogHeader>

                <div className="relative w-64 h-64 my-4 flex items-center justify-center">
                    {/* Pointer */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 w-8 h-8 text-primary">
                        <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[24px] border-t-primary drop-shadow-md" />
                    </div>

                    {/* Wheel Container */}
                    <motion.div
                        animate={controls}
                        className="w-full h-full rounded-full border-8 border-card/80 shadow-2xl relative overflow-hidden bg-muted flex items-center justify-center select-none"
                        style={{
                            boxShadow: `0 0 40px ${primaryColor}44, inset 0 0 20px rgba(0,0,0,0.2)`
                        }}
                    >
                        {/* SVG rendered wheel segments */}
                        <svg width="240" height="240" className="absolute inset-0">
                            {svgPaths.map((path, idx) => (
                                <g key={idx}>
                                    <path d={path} fill={segmentColors[idx % segmentColors.length]} />
                                    {/* Text placed at the angle midpoint */}
                                    <text
                                        x="120"
                                        y="45"
                                        fill="#ffffff"
                                        fontWeight="900"
                                        fontSize="16px"
                                        textAnchor="middle"
                                        transform={`rotate(${(idx * 60) + 30}, 120, 120)`}
                                        style={{ filter: 'drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.7))' }}
                                    >
                                        +{segments[idx]} PTS
                                    </text>
                                </g>
                            ))}
                        </svg>

                        {/* Center point */}
                        <div className="absolute w-12 h-12 rounded-full bg-card/90 shadow-lg z-10 flex items-center justify-center border-4 border-border">
                            <div className="w-4 h-4 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }} />
                        </div>
                    </motion.div>

                    {/* Glow effects upon winning */}
                    <AnimatePresence>
                        {result !== null && (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1.2, opacity: 1 }}
                                className="absolute inset-0 -z-10 pointer-events-none"
                            >
                                <div className="w-full h-full rounded-full bg-emerald-500/30 blur-3xl animate-pulse" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Status and Action indicator */}
                <div className="w-full space-y-4 pt-2">
                    {isSpinning && (
                        <div className="text-lg font-black tracking-widest text-primary flex items-center justify-center gap-2 animate-pulse">
                            <Loader2 className="w-6 h-6 animate-spin" /> SPINNING...
                        </div>
                    )}

                    {result !== null && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center gap-1"
                        >
                            <span className="text-emerald-500 font-black text-2xl uppercase italic animate-bounce flex items-center gap-2">
                                <Trophy className="w-7 h-7" /> WON +{result} PTS! <Trophy className="w-7 h-7" />
                            </span>
                            <span className="text-xs text-muted-foreground font-semibold">
                                Adding points to balance automatically...
                            </span>
                        </motion.div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
