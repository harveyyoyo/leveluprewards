
'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Sparkles, Trophy, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WelcomeOverlayProps {
  studentName: string;
  points: number;
  photoUrl?: string;
  theme?: {
    primary?: string;
    text?: string;
    background?: string;
    emoji?: string;
  };
  onClose: () => void;
  playSound?: (name: string) => void;
}

export const WelcomeOverlay: React.FC<WelcomeOverlayProps> = ({
  studentName,
  points,
  photoUrl,
  theme,
  onClose,
  playSound,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (playSound) playSound('redeem');
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 500); // Wait for exit animation
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose, playSound]);

  const primaryColor = theme?.primary || 'hsl(var(--primary))';
  const textColor = theme?.text || 'white';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
        >
          {/* Animated Background */}
          <motion.div 
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-xl"
          />

          {/* Confetti-like particles */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: Math.random() * 100 - 50 + '%', 
                  y: '110%',
                  rotate: 0,
                  opacity: 1
                }}
                animate={{ 
                  y: '-10%',
                  rotate: 360,
                  opacity: 0
                }}
                transition={{ 
                  duration: 2 + Math.random() * 2, 
                  repeat: Infinity,
                  delay: Math.random() * 2,
                  ease: "easeOut"
                }}
                className="absolute w-4 h-4"
                style={{ 
                  backgroundColor: i % 3 === 0 ? primaryColor : i % 3 === 1 ? '#fbbf24' : '#60a5fa',
                  borderRadius: i % 2 === 0 ? '50%' : '2px'
                }}
              />
            ))}
          </div>

          {/* Main Content */}
          <motion.div
            initial={{ y: 50, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -50, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 20, stiffness: 100 }}
            className="relative z-10 flex flex-col items-center text-center p-8 max-w-md w-full"
          >
            {/* Profile Picture / Avatar */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="relative mb-6"
            >
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-2xl bg-slate-800 flex items-center justify-center">
                {photoUrl ? (
                  <img src={photoUrl} alt={studentName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-white">
                    {studentName.charAt(0)}
                  </span>
                )}
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-2 border-2 border-dashed border-amber-400 rounded-full opacity-50"
              />
              <div className="absolute -bottom-2 -right-2 bg-amber-400 text-black p-2 rounded-full shadow-lg">
                <Trophy size={20} />
              </div>
            </motion.div>

            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight"
            >
              WELCOME BACK!
            </motion.h1>
            
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-2xl md:text-3xl font-bold text-amber-400 mb-6 flex items-center gap-2"
            >
              {studentName} {theme?.emoji && <span>{theme.emoji}</span>}
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 w-full shadow-[0_0_30px_rgba(251,191,36,0.1)]"
            >
              <p className="text-white/70 text-sm font-bold uppercase tracking-widest mb-1">Your Balance</p>
              <div className="flex items-center justify-center gap-2">
                <Ticket className="text-amber-400 w-8 h-8 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                <span className="text-5xl font-black text-white drop-shadow-md">
                  {points.toLocaleString()}
                </span>
                <span className="text-white/60 font-bold text-xl">PTS</span>
              </div>
            </motion.div>

            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              onClick={() => setIsVisible(false)}
              className="mt-8 px-8 py-3 rounded-full bg-white text-black font-black uppercase tracking-widest hover:bg-amber-400 transition-colors shadow-xl"
            >
              Let's Go!
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
