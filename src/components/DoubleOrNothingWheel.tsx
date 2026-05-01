'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { RotateCcw, Trophy, XCircle, Sparkles, Loader2 } from 'lucide-react';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { cn } from '@/lib/utils';

interface DoubleOrNothingWheelProps {
    prizeName: string;
    onResult: (result: 'double' | 'nothing') => void;
    onCancel: () => void;
    primaryColor?: string;
}

export function DoubleOrNothingWheel({ prizeName, onResult, onCancel, primaryColor = '#0ea5e9' }: DoubleOrNothingWheelProps) {
    const [isSpinning, setIsSpinning] = useState(false);
    const [result, setResult] = useState<'double' | 'nothing' | null>(null);
    const controls = useAnimation();
    const playSound = useArcadeSound();
    
    const spinTo = useRef(0);

    const handleSpin = async () => {
        if (isSpinning || result) return;
        
        setIsSpinning(true);
        playSound('click');
        
        // Randomly decide result: 50/50
        const isWin = Math.random() > 0.5;
        
        // Calculate rotation
        // Base rotation: 5 full circles (360 * 5 = 1800)
        // Win is 0-180 degrees, Loss is 180-360 degrees
        // Let's make Win centered at 90 and Loss at 270
        const targetRotation = 1800 + (isWin ? 90 : 270) + (Math.random() * 60 - 30);
        spinTo.current = targetRotation;

        await controls.start({
            rotate: targetRotation,
            transition: { 
                duration: 4, 
                ease: [0.45, 0.05, 0.55, 0.95] // Custom cubic-bezier for smooth deceleration
            }
        });

        setIsSpinning(false);
        setResult(isWin ? 'double' : 'nothing');
        
        if (isWin) {
            playSound('success');
        } else {
            playSound('error');
        }

        // Wait a moment then trigger callback
        setTimeout(() => {
            onResult(isWin ? 'double' : 'nothing');
        }, 2000);
    };

    return (
        <div className="flex flex-col items-center justify-center p-6 space-y-8">
            <div className="text-center space-y-2">
                <h3 className="text-2xl font-black tracking-tight text-foreground uppercase italic">Double or Nothing!</h3>
                <p className="text-sm text-muted-foreground">
                    Win another <span className="font-bold text-foreground">{prizeName}</span> or lose it all!
                </p>
            </div>

            <div className="relative w-64 h-64">
                {/* Pointer */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 w-8 h-8 text-primary">
                    <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[24px] border-t-primary drop-shadow-md" />
                </div>

                {/* Wheel Container */}
                <motion.div
                    animate={controls}
                    className="w-full h-full rounded-full border-8 border-card shadow-2xl relative overflow-hidden bg-muted flex items-center justify-center"
                    style={{ 
                        boxShadow: `0 0 40px ${primaryColor}44, inset 0 0 20px rgba(0,0,0,0.2)`,
                        borderColor: result === 'double' ? '#10b981' : result === 'nothing' ? '#ef4444' : 'var(--card)'
                    }}
                >
                    {/* Background segments */}
                    <div className="absolute inset-0 flex">
                        <div className="flex-1 bg-gradient-to-br from-emerald-400 to-emerald-600 border-r-4 border-card/20 flex items-center justify-center">
                            <div className="rotate-90 flex flex-col items-center">
                                <Trophy className="w-12 h-12 text-white/90 mb-2" />
                                <span className="text-white font-black text-xl uppercase tracking-tighter">DOUBLE</span>
                            </div>
                        </div>
                        <div className="flex-1 bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center">
                            <div className="rotate-[-90deg] flex flex-col items-center">
                                <XCircle className="w-12 h-12 text-white/90 mb-2" />
                                <span className="text-white font-black text-xl uppercase tracking-tighter">NOTHING</span>
                            </div>
                        </div>
                    </div>

                    {/* Center point */}
                    <div className="absolute w-12 h-12 rounded-full bg-card shadow-lg z-10 flex items-center justify-center border-4 border-muted">
                        <div className="w-4 h-4 rounded-full bg-primary animate-pulse" style={{ backgroundColor: primaryColor }} />
                    </div>
                </motion.div>

                {/* Glow effects */}
                <AnimatePresence>
                    {result === 'double' && (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1.2, opacity: 1 }}
                            className="absolute inset-0 -z-10 pointer-events-none"
                        >
                            <div className="w-full h-full rounded-full bg-emerald-500/30 blur-3xl animate-pulse" />
                        </motion.div>
                    )}
                    {result === 'nothing' && (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1.2, opacity: 1 }}
                            className="absolute inset-0 -z-10 pointer-events-none"
                        >
                            <div className="w-full h-full rounded-full bg-rose-500/30 blur-3xl animate-pulse" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="w-full space-y-4 pt-4">
                <Button
                    onClick={handleSpin}
                    disabled={isSpinning || !!result}
                    className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-lg shadow-xl relative overflow-hidden group"
                    style={{ backgroundColor: primaryColor }}
                >
                    <span className="relative z-10 flex items-center gap-2">
                        {isSpinning ? (
                            <>
                                <Loader2 className="w-6 h-6 animate-spin" /> SPINNING...
                            </>
                        ) : result ? (
                            'FINISHING...'
                        ) : (
                            <>
                                <RotateCcw className="w-6 h-6 group-hover:rotate-180 transition-transform duration-500" /> SPIN TO WIN!
                            </>
                        )}
                    </span>
                    <motion.div
                        className="absolute inset-0 bg-white/20"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    />
                </Button>

                {!isSpinning && !result && (
                    <Button
                        variant="ghost"
                        onClick={onCancel}
                        className="w-full font-bold text-muted-foreground hover:text-foreground"
                    >
                        No thanks, I'll keep my prize
                    </Button>
                )}
            </div>
            
            {result === 'double' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-emerald-500 font-black text-xl uppercase italic animate-bounce"
                >
                    <Sparkles className="w-6 h-6" /> YOU WON! <Sparkles className="w-6 h-6" />
                </motion.div>
            )}
            
            {result === 'nothing' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-rose-500 font-black text-xl uppercase italic"
                >
                    BETTER LUCK NEXT TIME!
                </motion.div>
            )}
        </div>
    );
}
