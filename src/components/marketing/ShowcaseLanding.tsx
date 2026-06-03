'use client';

import React, { useState, useEffect, useLayoutEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  ArrowRight,
  BarChart3,
  Gift,
  HandHeart,
  ScanLine,
  School,
  Users,
  Sparkles,
  Zap,
  CheckCircle2,
  RefreshCw,
  Printer,
  ChevronRight,
  Flame,
  Award,
  ArrowUpRight,
} from 'lucide-react';
import Logo from '@/components/logos/Logo';
import { HomeLandingLogo } from '@/components/logos/HomeLandingLogo';
import {
  APP_NAME,
  APP_TAGLINE,
  getContactFormHref,
  LEVELUP_BRAND_PRIMARY_HEX,
  SITE_LEGAL_UMBRELLA,
} from '@/lib/appBranding';

const APP_LOGIN_HREF = '/login';
const SPLASH_SESSION_KEY = 'levelup:showcaseSplashSeen';
const INTRO_HOLD_MS = 2800;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
}

function readIntroSeen(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.sessionStorage.getItem(SPLASH_SESSION_KEY) === '1';
  } catch {
    return true;
  }
}

function writeIntroSeen(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
  } catch {
    // ignore
  }
}

const WORKFLOW = [
  {
    step: '01',
    title: 'Recognize',
    body: 'Staff award points for kindness, effort, and PBIS goals — from a phone, kiosk, or classroom screen.',
    icon: HandHeart,
    color: 'from-emerald-500/20 to-emerald-500/5',
    iconColor: 'text-emerald-600',
  },
  {
    step: '02',
    title: 'Reflect',
    body: 'Students see balances, levels, and streaks update in real time so progress feels tangible, not abstract.',
    icon: BarChart3,
    color: 'from-sky-500/20 to-sky-500/5',
    iconColor: 'text-sky-600',
  },
  {
    step: '03',
    title: 'Redeem',
    body: 'School-defined rewards — privileges, supplies, experiences — with inventory and limits you control.',
    icon: Gift,
    color: 'from-amber-500/20 to-amber-500/5',
    iconColor: 'text-amber-600',
  },
] as const;

const AUDIENCES = [
  { role: 'Teachers', detail: 'Fast coupons, class views, and reports without extra spreadsheets.', highlight: 'Save hours weekly' },
  { role: 'Students', detail: 'Kiosk check-in, hall of fame, and a shop that matches your school culture.', highlight: 'Instant gamification' },
  { role: 'Office & leaders', detail: 'Rosters, billing, exports, and school-wide settings in one place.', highlight: 'Complete school control' },
] as const;

interface TickerEvent {
  id: string;
  time: string;
  text: string;
  type: 'earn' | 'redeem' | 'info' | 'levelup' | 'error';
}

export function ShowcaseLanding() {
  const [showIntro, setShowIntro] = useState(false);

  useLayoutEffect(() => {
    if (prefersReducedMotion() || readIntroSeen()) return;
    setShowIntro(true);
    const t = window.setTimeout(() => {
      writeIntroSeen();
      setShowIntro(false);
    }, INTRO_HOLD_MS);
    return () => window.clearTimeout(t);
  }, []);

  const replayIntro = () => {
    try {
      window.sessionStorage.removeItem(SPLASH_SESSION_KEY);
    } catch {
      // ignore
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setShowIntro(true);
    window.setTimeout(() => {
      writeIntroSeen();
      setShowIntro(false);
    }, INTRO_HOLD_MS);
  };

  // Simulator States
  const [points, setPoints] = useState(120);
  const [level, setLevel] = useState(4);
  const [streak, setStreak] = useState(5);
  const [levelUpMessage, setLevelUpMessage] = useState<string | null>(null);
  const [events, setEvents] = useState<TickerEvent[]>([
    { id: '1', time: '10:15 AM', text: 'Earned 10 credits for Participation 🤝', type: 'earn' },
    { id: '2', time: 'Yesterday', text: 'Earned 20 credits for Perfect Attendance 📅', type: 'earn' },
    { id: '3', time: '2 days ago', text: 'Joined Oakridge School PBIS program 🎉', type: 'info' },
  ]);

  // Audio simulation state (clicks)
  const playClickSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      // Audio context blocked or not supported
    }
  };

  const playLevelUpSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      // Simple arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.06, audioCtx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + idx * 0.08 + 0.25);
        osc.start(audioCtx.currentTime + idx * 0.08);
        osc.stop(audioCtx.currentTime + idx * 0.08 + 0.25);
      });
    } catch (e) {
      // Audio context blocked
    }
  };

  // Add event helper
  const addEvent = (text: string, type: TickerEvent['type']) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setEvents((prev) => [
      { id: String(Date.now()), time, text, type },
      ...prev.slice(0, 4),
    ]);
  };

  // Award Points Handler
  const handleAwardPoints = (amount: number, category: string) => {
    playClickSound();
    
    // Confetti burst from bottom-right (simulating teacher handheld device)
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { x: 0.8, y: 0.8 },
      colors: ['#102a45', '#c9a227', '#5c6f55', '#38bdf8', '#a855f7'],
    });

    const newPoints = points + amount;
    setPoints(newPoints);
    addEvent(`Earned ${amount} credits for ${category}! ✨`, 'earn');

    // Level up check
    if (newPoints >= 150 && level === 4) {
      setTimeout(() => {
        setLevel(5);
        setLevelUpMessage('🎉 LEVEL UP! Jordan reached Level 5: Campus Champion! 👑');
        addEvent('🎉 LEVEL UP! Jordan reached Level 5!', 'levelup');
        playLevelUpSound();
        
        // Huge confetti celebration
        const duration = 2.5 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval = setInterval(function() {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

          const particleCount = 50 * (timeLeft / duration);
          confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
          confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
      }, 300);
    }
  };

  // Redeem Reward Handler
  const handleRedeem = (cost: number, itemName: string) => {
    if (points >= cost) {
      playClickSound();
      confetti({
        particleCount: 20,
        spread: 30,
        origin: { x: 0.2, y: 0.7 },
        colors: ['#c9a227', '#e5cc97', '#ffffff'],
      });

      setPoints((prev) => prev - cost);
      addEvent(`Redeemed ${itemName} for ${cost} credits! 🎟️`, 'redeem');
    } else {
      addEvent(`❌ Need ${cost - points} more credits for ${itemName}`, 'error');
    }
  };

  // Reset Simulator
  const handleResetSimulator = () => {
    playClickSound();
    setPoints(120);
    setLevel(4);
    setLevelUpMessage(null);
    setEvents([
      { id: '1', time: '10:15 AM', text: 'Earned 10 credits for Participation 🤝', type: 'earn' },
      { id: '2', time: 'Yesterday', text: 'Earned 20 credits for Perfect Attendance 📅', type: 'earn' },
      { id: '3', time: '2 days ago', text: 'Joined Oakridge School PBIS program 🎉', type: 'info' },
    ]);
  };

  return (
    <div className="min-h-screen bg-[#fcfaf6] text-[#1a2e42] selection:bg-[#c9a227]/30 selection:text-[#102a45] font-sans antialiased overflow-x-hidden">
      {/* Editorial paper background texture */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.35] z-0"
        style={{
          backgroundImage: `repeating-linear-gradient(
            transparent,
            transparent 27px,
            rgba(26, 46, 66, 0.05) 27px,
            rgba(26, 46, 66, 0.05) 28px
          )`,
        }}
      />

      {/* Decorative floating blurred gradient shapes */}
      <div className="absolute top-[10%] right-[-10%] w-[50vw] h-[50vw] max-w-[600px] rounded-full bg-gradient-to-tr from-sky-200/40 to-amber-200/30 blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-[40%] left-[-15%] w-[45vw] h-[45vw] max-w-[500px] rounded-full bg-gradient-to-br from-emerald-100/40 to-sky-100/30 blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-[10%] right-[-5%] w-[40vw] h-[40vw] max-w-[450px] rounded-full bg-gradient-to-tr from-purple-100/30 to-amber-100/40 blur-[110px] pointer-events-none -z-10" />

      {/* STICKY GLASSMORPHIC HEADER */}
      <motion.header
        initial={showIntro ? { y: 0, opacity: 1 } : { y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="sticky top-0 z-50 w-full border-b border-[#1a2e42]/10 bg-[#fcfaf6]/85 backdrop-blur-md transition-shadow hover:shadow-sm"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <Link href="/" className="flex items-center gap-3 outline-none group">
            <motion.div 
              whileHover={{ rotate: 8, scale: 1.05 }}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#102a45] to-[#1f4974] p-0.5 shadow-md shadow-[#102a45]/15"
            >
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#fcfaf6]">
                <Logo className="h-6 w-6 text-[#102a45]" />
              </div>
            </motion.div>
            <div className="leading-tight">
              <span className="block font-bold tracking-tight text-[#102a45] text-base md:text-lg">
                levelUp <span className="text-[#c9a227] font-semibold text-xs uppercase ml-1 px-1.5 py-0.5 bg-[#c9a227]/10 rounded">EDU</span>
              </span>
              <span className="hidden sm:block text-[10px] uppercase font-bold tracking-widest text-[#1a2e42]/50">
                {APP_NAME} Rewards
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#1a2e42]/80">
            <a href="#features" className="relative group py-1 transition-colors hover:text-[#102a45]">
              Features
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#c9a227] transition-all duration-300 group-hover:w-full" />
            </a>
            <a href="#simulator" className="relative group py-1 transition-colors hover:text-[#102a45] flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-[#c9a227] animate-pulse" />
              Try Live Demo
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#c9a227] transition-all duration-300 group-hover:w-full" />
            </a>
            <Link href="/flyers" className="relative group py-1 transition-colors hover:text-[#102a45] flex items-center gap-1">
              <Printer className="h-3.5 w-3.5" />
              Printable Flyers
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#c9a227] transition-all duration-300 group-hover:w-full" />
            </Link>
            <a href="#audiences" className="relative group py-1 transition-colors hover:text-[#102a45]">
              Who We Serve
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#c9a227] transition-all duration-300 group-hover:w-full" />
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href={APP_LOGIN_HREF}
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-[#102a45] to-[#1e446d] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-[#102a45]/15 transition-all duration-300 hover:brightness-110 hover:shadow-lg hover:shadow-[#102a45]/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="mr-1.5">Sign In</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <button
              type="button"
              onClick={replayIntro}
              className="hidden sm:inline-flex text-xs font-semibold text-[#1a2e42]/70 underline decoration-[#c9a227] decoration-2 underline-offset-4 transition-colors hover:text-[#102a45]"
            >
              Replay intro
            </button>
          </div>
        </div>
      </motion.header>

      <main className="relative z-10">
        {/* HERO SECTION — Modern editorial layout with 3D elements */}
        <section className="relative mx-auto max-w-6xl px-6 py-16 lg:py-24">
          <AnimatePresence mode="wait">
            {showIntro ? (
              <motion.div
                key="hero-intro"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="flex min-h-[min(78vh,720px)] flex-col items-center justify-center py-8"
              >
                <div className="w-full max-w-xl rounded-3xl border border-[#102a45]/15 bg-[#fcfaf6] px-6 py-10 shadow-2xl shadow-[#102a45]/10 sm:px-10 sm:py-14">
                  <HomeLandingLogo linkToLogin={false} size="intro" />
                </div>
                <div className="mt-8 max-w-md text-center">
                  <p className="text-lg font-semibold tracking-tight text-[#102a45]">
                    {APP_NAME}
                  </p>
                  <p className="mt-1 text-sm text-[#1a2e42]/70">{APP_TAGLINE}</p>
                  <p className="mt-6">
                    <Link
                      href={APP_LOGIN_HREF}
                      className="text-sm font-semibold text-[#102a45] underline decoration-[#c9a227] decoration-2 underline-offset-4 transition-colors hover:text-[#0f1f2e]"
                    >
                      Click here to login
                    </Link>
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="hero-main"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center"
              >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, delay: 0.08 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-[#5c6f55]/20 bg-[#5c6f55]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#5c6f55] shadow-sm">
              <Zap className="h-3.5 w-3.5 fill-current" />
              PBIS &amp; School Rewards Redefined
            </div>
            
            <h1
              className="mt-6 text-balance font-serif text-[2.85rem] font-bold leading-[1.06] tracking-tight text-[#102a45] sm:text-6xl"
              style={{ fontFamily: 'Fraunces, Georgia, serif' }}
            >
              An elevated,{' '}
              <span className="italic text-[#5c6c50] relative">
                more positive
                <span className="absolute bottom-1 left-0 w-full h-1 bg-[#c9a227]/30 rounded-full" />
              </span>{' '}
              school climate.
            </h1>
            
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#1a2e42]/85 font-medium">
              Bring your positive behavior systems into the modern era. {APP_NAME} replaces paper logs with digital moments of celebration, equity, and shared pride—turning everyday achievements into a cohesive, gamified experience that students love and teachers actually have time to run.
            </p>
            
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <Link
                href={APP_LOGIN_HREF}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#102a45] to-[#1e446d] px-8 py-4 font-bold text-white shadow-xl shadow-[#102a45]/20 hover:brightness-110 hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 text-center"
              >
                Go to Sign-In Portal
                <ArrowRight className="h-5 w-5" aria-hidden />
              </Link>
              
              <a
                href="#simulator"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-[#102a45]/20 hover:border-[#102a45] bg-[#fcfaf6]/50 hover:bg-[#fcfaf6] px-8 py-4 font-bold text-[#102a45] transition-all duration-300 text-center"
              >
                Try Interactive Demo
              </a>
            </div>

            <p className="mt-3 text-xs text-[#1a2e42]/50 flex items-center gap-1.5 justify-center sm:justify-start">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              No setup costs. No complicated teacher training required.
            </p>
          </motion.div>

          {/* Floating Premium Visual Mockups */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.9, delay: 0.3 }}
            className="relative mx-auto w-full max-w-md lg:max-w-none flex justify-center py-10"
          >
            {/* Soft decorative background glow behind images */}
            <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-[#c9a227]/12 filter blur-[40px] animate-pulse pointer-events-none" />

            <div className="relative w-full">
              {/* Primary mockup */}
              <motion.figure 
                whileHover={{ rotate: 0, scale: 1.03, y: -5 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="relative z-10 rotate-[-2.5deg] rounded-2xl border border-[#1a2e42]/15 bg-white/80 p-4 shadow-[12px_16px_36px_rgba(26,46,66,0.12)] backdrop-blur-md cursor-pointer"
              >
                <div className="overflow-hidden rounded-xl bg-[#e8e4dc] border border-[#1a2e42]/10">
                  <Image
                    src="/marketing/screenshots/kiosk-welcome.png"
                    alt="Student welcome screen with points and level"
                    width={640}
                    height={400}
                    className="w-full object-cover"
                    priority
                  />
                </div>
                <figcaption className="mt-3 text-center text-xs font-bold text-[#1a2e42]/60 flex items-center justify-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  Kiosk View: Tap card or enter ID to view credits
                </figcaption>
              </motion.figure>

              {/* Overlapping secondary mockup */}
              <motion.figure 
                whileHover={{ rotate: 0, scale: 1.05, y: -8 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="absolute -bottom-10 -right-6 z-20 w-[80%] rotate-[3.5deg] rounded-2xl border border-[#1a2e42]/15 bg-white/95 p-3.5 shadow-[16px_20px_48px_rgba(201,162,39,0.18)] cursor-pointer"
              >
                <div className="overflow-hidden rounded-xl bg-[#e8e4dc] border border-[#1a2e42]/10">
                  <Image
                    src="/marketing/screenshots/kiosk-rewards-shop.png"
                    alt="School rewards shop"
                    width={520}
                    height={340}
                    className="w-full object-cover"
                  />
                </div>
                <figcaption className="mt-3 text-center text-[11px] font-bold text-[#c9a227]">
                  Define custom rewards &amp; privileges
                </figcaption>
              </motion.figure>
            </div>
          </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* TRUST BANNER / STATEMENT */}
        <section className="border-y border-[#1a2e42]/10 bg-gradient-to-r from-[#102a45] to-[#1a3a5a] py-14 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(201,162,39,0.12),transparent)]" />
          <div className="mx-auto max-w-4xl px-6 text-center relative z-10">
            <blockquote className="space-y-4">
              <p
                className="text-2xl font-medium leading-relaxed sm:text-3xl italic font-serif text-[#fdfbf7]"
                style={{ fontFamily: 'Fraunces, Georgia, serif' }}
              >
                &ldquo;When students can visualize their milestones and level progress in real time, positive behaviors click. Staff spend less time managing worksheets, and more time celebrating growth.&rdquo;
              </p>
              <cite className="block mt-4 not-italic text-sm font-semibold tracking-wider uppercase text-[#e5cc97]">
                — The PBIS Strategy team at LevelUp
              </cite>
            </blockquote>
          </div>
        </section>

        {/* WORKFLOW / PROCESS STEPS */}
        <section id="features" className="mx-auto max-w-6xl px-6 py-24 scroll-mt-10">
          <div className="text-center max-w-2xl mx-auto">
            <h2
              className="text-4xl font-bold text-[#102a45] sm:text-5xl"
              style={{ fontFamily: 'Fraunces, Georgia, serif' }}
            >
              How it fits your school day
            </h2>
            <p className="mt-4 text-[#1a2e42]/75 font-medium">
              We streamlined positive behavior support into three simple loops that save teachers time and delight kids.
            </p>
          </div>
          
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {WORKFLOW.map(({ step, title, body, icon: Icon, color, iconColor }, index) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                whileHover={{ y: -6 }}
                className="relative rounded-3xl border border-[#1a2e42]/10 bg-white/50 p-8 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:shadow-md"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className={`p-4 rounded-2xl bg-gradient-to-tr ${color} ${iconColor} border border-[#1a2e42]/5`}>
                    <Icon className="h-6 w-6" strokeWidth={2} />
                  </div>
                  <span className="text-4xl font-black text-[#1a2e42]/10 tracking-widest font-serif">{step}</span>
                </div>
                
                <h3 className="text-2xl font-bold text-[#102a45]">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#1a2e42]/75 font-medium">{body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* INTERACTIVE LIVE SIMULATOR SECTION */}
        <section id="simulator" className="bg-gradient-to-b from-[#fcfaf6] to-[#f4f0e8] py-24 border-y border-[#1a2e42]/10 relative scroll-mt-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(56,189,248,0.06),transparent_40%)]" />
          
          <div className="mx-auto max-w-6xl px-6 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#c9a227]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#c9a227]">
                <Sparkles className="h-3.5 w-3.5 fill-current animate-spin" style={{ animationDuration: '6s' }} />
                Interactive Sandbox
              </div>
              <h2
                className="mt-4 text-4xl font-bold text-[#102a45] sm:text-5xl"
                style={{ fontFamily: 'Fraunces, Georgia, serif' }}
              >
                Try the LevelUp magic live
              </h2>
              <p className="mt-4 text-base text-[#1a2e42]/80 font-medium">
                Act as a **Teacher** to reward credits or as a **Student** at the digital kiosk to redeem items. Watch levels, streaks, and real-time logs update in real time with authentic feedback!
              </p>
            </div>

            {/* LEVEL UP NOTIFICATION BANNER */}
            <AnimatePresence>
              {levelUpMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-[#c9a227] text-slate-950 font-bold text-center shadow-lg border-2 border-white/30 flex items-center justify-center gap-3 relative z-30"
                >
                  <Award className="h-6 w-6 animate-bounce" />
                  <span className="text-sm md:text-base tracking-wide font-serif">{levelUpMessage}</span>
                  <button 
                    onClick={() => setLevelUpMessage(null)}
                    className="ml-4 text-xs px-2.5 py-1 rounded-lg bg-black/10 hover:bg-black/20 border border-black/10 transition-colors uppercase font-bold"
                  >
                    Awesome
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* SIMULATOR GRID CONTROLLER */}
            <div className="grid gap-10 lg:grid-cols-12 items-stretch">
              
              {/* LEFT COLUMN: THE STUDENT KIOSK PROFILE PREVIEW (8 COLS) */}
              <div className="lg:col-span-7 flex flex-col justify-between rounded-3xl border border-[#1a2e42]/15 bg-white p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#c9a227]/5 rounded-bl-[100px] pointer-events-none" />
                
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between pb-5 border-b border-[#1a2e42]/10">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#102a45] to-[#1e446d] font-black text-white text-xl shadow-md border border-white/20">
                        JS
                        <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 border-2 border-white">
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-[#102a45]">Jordan Smith</h4>
                        <p className="text-xs text-[#1a2e42]/60 font-medium">Student ID: #9048 • Oakridge Middle</p>
                      </div>
                    </div>
                    
                    {/* Streak flame */}
                    <div className="flex items-center gap-1 bg-[#c9a227]/10 px-3 py-1.5 rounded-xl border border-[#c9a227]/25 text-[#102a45] font-black text-xs shadow-sm animate-pulse">
                      <Flame className="h-4 w-4 fill-current text-amber-500" />
                      <span>{streak}-Day Streak</span>
                    </div>
                  </div>

                  {/* Dynamic Points Display */}
                  <div className="py-8 text-center relative">
                    <span className="text-xs uppercase font-bold tracking-widest text-[#1a2e42]/50 block">Current Balance</span>
                    
                    <motion.div 
                      key={points}
                      initial={{ scale: 0.85, color: '#c9a227' }}
                      animate={{ scale: 1, color: '#102a45' }}
                      className="text-7xl md:text-8xl font-black font-serif my-2 tracking-tight flex items-center justify-center gap-1"
                    >
                      {points}
                      <span className="text-xl md:text-2xl font-sans font-bold text-[#1a2e42]/55 uppercase tracking-wide">credits</span>
                    </motion.div>

                    {/* Level Progress Bar */}
                    <div className="max-w-md mx-auto mt-4 px-4">
                      <div className="flex justify-between items-center text-xs font-semibold text-[#1a2e42]/70 mb-1.5">
                        <span className="flex items-center gap-1 font-bold text-[#102a45]">
                          <Award className="h-4 w-4 text-[#c9a227]" />
                          Level {level} ({level === 4 ? 'Rising Star' : 'Campus Champion 👑'})
                        </span>
                        <span className="font-bold text-[#1a2e42]/50">{points} / {level === 4 ? '150' : '250'} credits</span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-[#f4f0e8] overflow-hidden border border-[#1a2e42]/10 p-[1.5px]">
                        <motion.div 
                          className="h-full rounded-full bg-gradient-to-r from-[#102a45] via-[#1e446d] to-[#c9a227]"
                          animate={{ width: `${Math.min(100, (points / (level === 4 ? 150 : 250)) * 100)}%` }}
                          transition={{ type: 'spring', stiffness: 80 }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Miniature Student Shop checkout */}
                <div className="pt-6 border-t border-[#1a2e42]/10">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-sm font-bold text-[#102a45] uppercase tracking-wider flex items-center gap-1.5">
                      <Gift className="h-4 w-4 text-[#5c6f55]" />
                      Redeem Rewards (Student Kiosk)
                    </h5>
                    <span className="text-[10px] text-slate-400 font-medium">Click to claim item</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <button
                      onClick={() => handleRedeem(50, 'School Store Coupon')}
                      className={`group relative overflow-hidden rounded-2xl border text-left p-3.5 transition-all duration-300 ${
                        points >= 50 
                          ? 'border-[#c9a227]/40 bg-[#c9a227]/5 hover:bg-[#c9a227]/10 hover:border-[#c9a227] hover:scale-[1.02]' 
                          : 'border-[#1a2e42]/10 bg-slate-50 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <span className="absolute -top-1 -right-1 text-slate-200 group-hover:text-[#c9a227]/20 transition-colors font-serif font-black text-3xl">50</span>
                      <span className="block text-xs font-bold text-[#102a45]">School Store Coupon</span>
                      <span className="block text-[11px] text-[#c9a227] font-extrabold mt-1">50 credits</span>
                    </button>

                    <button
                      onClick={() => handleRedeem(80, 'Homework Pass')}
                      className={`group relative overflow-hidden rounded-2xl border text-left p-3.5 transition-all duration-300 ${
                        points >= 80 
                          ? 'border-[#5c6f55]/40 bg-[#5c6f55]/5 hover:bg-[#5c6f55]/10 hover:border-[#5c6f55] hover:scale-[1.02]' 
                          : 'border-[#1a2e42]/10 bg-slate-50 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <span className="absolute -top-1 -right-1 text-slate-200 group-hover:text-[#5c6f55]/20 transition-colors font-serif font-black text-3xl">80</span>
                      <span className="block text-xs font-bold text-[#102a45]">Homework Pass</span>
                      <span className="block text-[11px] text-[#5c6f55] font-extrabold mt-1">80 credits</span>
                    </button>

                    <button
                      onClick={() => handleRedeem(100, 'Lunch w/ Principal')}
                      className={`group relative overflow-hidden rounded-2xl border text-left p-3.5 transition-all duration-300 ${
                        points >= 100 
                          ? 'border-[#1a2e42]/30 bg-[#102a45]/5 hover:bg-[#102a45]/10 hover:border-[#102a45] hover:scale-[1.02]' 
                          : 'border-[#1a2e42]/10 bg-slate-50 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <span className="absolute -top-1 -right-1 text-slate-200 group-hover:text-[#102a45]/10 transition-colors font-serif font-black text-3xl">100</span>
                      <span className="block text-xs font-bold text-[#102a45]">Lunch with Principal</span>
                      <span className="block text-[11px] text-[#102a45] font-extrabold mt-1">100 credits</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: CONTROLLERS & EVENT TICKER LOG (5 COLS) */}
              <div className="lg:col-span-5 flex flex-col gap-6 justify-between">
                
                {/* Teacher Action Console */}
                <div className="rounded-3xl border border-[#1a2e42]/15 bg-white p-6 shadow-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h5 className="text-sm font-bold text-[#102a45] uppercase tracking-wider flex items-center gap-1.5">
                      <HandHeart className="h-4 w-4 text-[#c9a227]" />
                      Teacher Reward Station
                    </h5>
                    <button 
                      onClick={handleResetSimulator}
                      title="Reset Sandbox"
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#1a2e42]/65 hover:text-[#102a45] transition-colors border border-[#1a2e42]/10"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <p className="text-xs text-[#1a2e42]/70 mb-4 leading-relaxed font-medium">
                    Award credits instantly for positive behaviors. Click to simulate barcode scan or portal click:
                  </p>

                  <div className="grid gap-3 grid-cols-2">
                    <button
                      onClick={() => handleAwardPoints(10, 'Kindness')}
                      className="group flex flex-col items-center justify-center p-3 rounded-2xl border border-emerald-500/20 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-500 text-center transition-all duration-300 hover:scale-[1.03]"
                    >
                      <span className="text-lg font-black text-emerald-600">+10 Credits</span>
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#1a2e42]/60 mt-0.5">Kindness</span>
                    </button>

                    <button
                      onClick={() => handleAwardPoints(10, 'Participation')}
                      className="group flex flex-col items-center justify-center p-3 rounded-2xl border border-sky-500/20 bg-sky-50/40 hover:bg-sky-50 hover:border-sky-500 text-center transition-all duration-300 hover:scale-[1.03]"
                    >
                      <span className="text-lg font-black text-sky-600">+10 Credits</span>
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#1a2e42]/60 mt-0.5">Participation</span>
                    </button>

                    <button
                      onClick={() => handleAwardPoints(15, 'Integrity')}
                      className="group flex flex-col items-center justify-center p-3 rounded-2xl border border-amber-500/20 bg-amber-50/40 hover:bg-amber-50 hover:border-amber-500 text-center transition-all duration-300 hover:scale-[1.03]"
                    >
                      <span className="text-lg font-black text-[#c9a227]">+15 Credits</span>
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#1a2e42]/60 mt-0.5">Integrity</span>
                    </button>

                    <button
                      onClick={() => handleAwardPoints(15, 'Helpful Hand')}
                      className="group flex flex-col items-center justify-center p-3 rounded-2xl border border-purple-500/20 bg-purple-50/40 hover:bg-purple-50 hover:border-purple-500 text-center transition-all duration-300 hover:scale-[1.03]"
                    >
                      <span className="text-lg font-black text-purple-600">+15 Credits</span>
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#1a2e42]/60 mt-0.5">Helpful Hand</span>
                    </button>
                  </div>
                </div>

                {/* Sandbox Log Ticker */}
                <div className="rounded-3xl border border-[#1a2e42]/15 bg-[#102a45] p-5 shadow-lg text-[#fcfaf6] flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="h-2 w-2 rounded-full bg-[#c9a227] animate-ping" />
                    <h5 className="text-xs font-black uppercase tracking-widest text-[#e5cc97]">Real-Time Activity Feed</h5>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[190px] pr-1">
                    <AnimatePresence initial={false}>
                      {events.map((event) => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, x: 20, height: 0 }}
                          animate={{ opacity: 1, x: 0, height: 'auto' }}
                          exit={{ opacity: 0, x: -20, height: 0 }}
                          className={`p-2.5 rounded-xl border text-[11px] font-semibold leading-relaxed flex items-start justify-between gap-3 ${
                            event.type === 'earn'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                              : event.type === 'redeem'
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-200'
                              : event.type === 'levelup'
                              ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300 font-extrabold'
                              : event.type === 'error'
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                              : 'bg-white/5 border-white/10 text-slate-300'
                          }`}
                        >
                          <span className="flex-1">{event.text}</span>
                          <span className="text-[9px] uppercase tracking-wider opacity-60 shrink-0 font-bold mt-0.5">{event.time}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </section>

        {/* DIGITAL MOTIVATION ENGINE & STUDENT AGENCY SECTION */}
        <section className="bg-white py-24 border-b border-[#1a2e42]/10 scroll-mt-10">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              
              {/* Student Motivation Info */}
              <motion.div
                initial={{ opacity: 0, x: -35 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-emerald-800 shadow-sm mb-5">
                  <Award className="h-3.5 w-3.5" />
                  Digital Motivation Engine
                </div>
                
                <h2
                  className="text-4xl font-bold text-[#102a45] sm:text-5xl"
                  style={{ fontFamily: 'Fraunces, Georgia, serif' }}
                >
                  Transform school culture with gamified student agency
                </h2>
                
                <p className="mt-6 text-base leading-relaxed text-[#1a2e42]/80 font-medium">
                  Motivate students from the inside out. {APP_NAME} provides each student with a personal, interactive portal where they can monitor their point balance, track leveling progress, view earned badges, and redeem school rewards—easily accessible from any Chromebook, tablet, or lobby kiosk.
                </p>

                <ul className="mt-8 space-y-3.5">
                  <li className="flex items-center gap-3 text-sm font-semibold text-[#1a2e42]/95">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    Daily point streaks and automatic level-ups to drive excitement
                  </li>
                  <li className="flex items-center gap-3 text-sm font-semibold text-[#1a2e42]/95">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    Integrated Hall of Fame and school-wide House competitions
                  </li>
                  <li className="flex items-center gap-3 text-sm font-semibold text-[#1a2e42]/95">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    Student-led rewards shop with automated inventory tracking
                  </li>
                </ul>

                <div className="mt-10">
                  <a
                    href="#simulator"
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-4 font-bold text-white shadow-xl shadow-emerald-500/20 hover:brightness-110 hover:shadow-2xl hover:scale-[1.03] transition-all duration-300"
                  >
                    Try Kiosk Simulator
                    <ArrowUpRight className="h-4.5 w-4.5" />
                  </a>
                </div>
              </motion.div>

              {/* Beautiful Student Portal Preview Frame */}
              <motion.div
                initial={{ opacity: 0, x: 35 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="relative flex justify-center py-5"
              >
                {/* Glow backdrop */}
                <div className="absolute top-[20%] right-[20%] w-[65%] h-[65%] rounded-full bg-emerald-200/20 filter blur-[45px] animate-pulse pointer-events-none" />

                <motion.div 
                  whileHover={{ rotate: 1.5, scale: 1.02 }}
                  transition={{ type: 'spring', stiffness: 260 }}
                  className="w-full max-w-md rounded-3xl border border-[#1a2e42]/10 bg-slate-50 p-4 shadow-xl cursor-pointer"
                >
                  <div className="overflow-hidden rounded-2xl border border-[#1a2e42]/10 shadow-inner bg-slate-900 aspect-[3/4] relative flex items-center justify-center">
                    <Image
                      src="/marketing_student_portal_preview.png?v=3"
                      alt="Student Dashboard Portal Preview"
                      fill
                      className="object-cover object-top"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent flex flex-col justify-end p-6">
                      <div className="bg-slate-900/90 backdrop-blur border border-white/10 rounded-2xl p-4 shadow-lg text-white">
                        <span className="text-[9px] uppercase tracking-widest font-black text-teal-400">STUDENT PORTAL</span>
                        <h6 className="text-sm font-bold mt-0.5">Personalized Student Dashboard</h6>
                        <p className="text-[10px] text-slate-400 mt-1">Live point tracking, streak metrics, and custom theme presets.</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

            </div>
          </div>
        </section>

        {/* FEATURE 1: CLASSROOM MANAGEMENT (Image Left, Text Right) */}
        <section id="classroom" className="bg-[#fcfaf6] py-24 border-b border-[#1a2e42]/10 scroll-mt-10">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              
              {/* Classroom Screenshot Frame */}
              <motion.div
                initial={{ opacity: 0, x: -35 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="relative flex justify-center py-5 order-last lg:order-first"
              >
                <div className="absolute top-[20%] left-[20%] w-[65%] h-[65%] rounded-full bg-[#102a45]/5 filter blur-[45px] animate-pulse pointer-events-none" />
                <motion.div 
                  whileHover={{ rotate: -1, scale: 1.015 }}
                  transition={{ type: 'spring', stiffness: 260 }}
                  className="w-full max-w-2xl rounded-3xl border border-[#1a2e42]/10 bg-white p-4 shadow-xl cursor-pointer"
                >
                  <div className="overflow-hidden rounded-2xl border border-[#1a2e42]/10 shadow-inner bg-slate-900 aspect-video relative">
                    <Image
                      src="/marketing/screenshots/admin-attendance.png?v=3"
                      alt="Classroom Management and live seating grid display preview"
                      fill
                      className="object-cover object-top"
                    />
                  </div>
                </motion.div>
              </motion.div>

              {/* Classroom Details */}
              <motion.div
                initial={{ opacity: 0, x: 35 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-teal-800 shadow-sm mb-5">
                  <Users className="h-3.5 w-3.5" />
                  Classroom Management
                </div>
                
                <h2
                  className="text-4xl font-bold text-[#102a45] sm:text-5xl font-serif"
                  style={{ fontFamily: 'Fraunces, Georgia, serif' }}
                >
                  Streamlined tools for classroom climate
                </h2>
                
                <p className="mt-6 text-base leading-relaxed text-[#1a2e42]/80 font-medium">
                  Give teachers positive classroom structures that save time and keep students focused. LevelUp integrates seat-based classroom rewards, behavior tracking notes, live activity timelines, and an interactive Projector Display Mode that makes collective point goals visible and exciting to the whole room.
                </p>

                <ul className="mt-8 space-y-3.5">
                  <li className="flex items-center gap-3 text-sm font-semibold text-[#1a2e42]/95">
                    <CheckCircle2 className="h-5 w-5 text-teal-600 shrink-0" />
                    Live seating layouts with quick drag-and-drop homeroom assignment
                  </li>
                  <li className="flex items-center gap-3 text-sm font-semibold text-[#1a2e42]/95">
                    <CheckCircle2 className="h-5 w-5 text-teal-600 shrink-0" />
                    Teacher behavior timelines for positive reinforcement logs
                  </li>
                  <li className="flex items-center gap-3 text-sm font-semibold text-[#1a2e42]/95">
                    <CheckCircle2 className="h-5 w-5 text-teal-600 shrink-0" />
                    Interactive classroom display boards for projector displays
                  </li>
                </ul>

                <div className="mt-10">
                  <a
                    href="#simulator"
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#102a45] to-[#1d426d] px-6 py-4 font-bold text-white shadow-xl shadow-slate-900/10 hover:brightness-110 hover:shadow-2xl hover:scale-[1.03] transition-all duration-300"
                  >
                    Try Classroom Tools
                    <ArrowUpRight className="h-4.5 w-4.5" />
                  </a>
                </div>
              </motion.div>

            </div>
          </div>
        </section>

        {/* FEATURE 2: HOUSE COMPETITIONS (Image Right, Text Left) */}
        <section id="houses" className="bg-white py-24 border-b border-[#1a2e42]/10 scroll-mt-10">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              
              {/* House Details */}
              <motion.div
                initial={{ opacity: 0, x: -35 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-emerald-800 shadow-sm mb-5">
                  <School className="h-3.5 w-3.5" />
                  School-Wide Houses
                </div>
                
                <h2
                  className="text-4xl font-bold text-[#102a45] sm:text-5xl font-serif"
                  style={{ fontFamily: 'Fraunces, Georgia, serif' }}
                >
                  Foster deep belonging with House scoreboards
                </h2>
                
                <p className="mt-6 text-base leading-relaxed text-[#1a2e42]/80 font-medium">
                  Unify your building through healthy collaboration and school pride. LevelUp automatically aggregates individual student classroom points into team scores, creating interactive House leaderboards that keep student rivalry positive, supportive, and active all year.
                </p>

                <ul className="mt-8 space-y-3.5">
                  <li className="flex items-center gap-3 text-sm font-semibold text-[#1a2e42]/95">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    Live House scoring compiled automatically from individual student awards
                  </li>
                  <li className="flex items-center gap-3 text-sm font-semibold text-[#1a2e42]/95">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    Custom team profiles, background theme colors, and House crests
                  </li>
                  <li className="flex items-center gap-3 text-sm font-semibold text-[#1a2e42]/95">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    Public scoreboard rotation layouts ready for cafeteria hallways and TVs
                  </li>
                </ul>

                <div className="mt-10">
                  <Link
                    href={getContactFormHref()}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-4 font-bold text-white shadow-xl shadow-emerald-500/20 hover:brightness-110 hover:shadow-2xl hover:scale-[1.03] transition-all duration-300"
                  >
                    Setup House System
                    <ArrowUpRight className="h-4.5 w-4.5" />
                  </Link>
                </div>
              </motion.div>

              {/* House Screenshot Frame */}
              <motion.div
                initial={{ opacity: 0, x: 35 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="relative flex justify-center py-5"
              >
                <div className="absolute top-[20%] right-[20%] w-[65%] h-[65%] rounded-full bg-emerald-200/20 filter blur-[45px] animate-pulse pointer-events-none" />
                <motion.div 
                  whileHover={{ rotate: 1, scale: 1.015 }}
                  transition={{ type: 'spring', stiffness: 260 }}
                  className="w-full max-w-2xl rounded-3xl border border-[#1a2e42]/10 bg-slate-50 p-4 shadow-xl cursor-pointer"
                >
                  <div className="overflow-hidden rounded-2xl border border-[#1a2e42]/10 shadow-inner bg-slate-900 aspect-video relative">
                    <Image
                      src="/marketing/screenshots/admin-houses.png?v=3"
                      alt="House points administrative scoreboard preview"
                      fill
                      className="object-cover object-top"
                    />
                  </div>
                </motion.div>
              </motion.div>

            </div>
          </div>
        </section>

        {/* FEATURE 3: AUTOMATED RAFFLES (Image Left, Text Right) */}
        <section id="raffles" className="bg-[#fcfaf6] py-24 border-b border-[#1a2e42]/10 scroll-mt-10">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              
              {/* Raffle Screenshot Frame */}
              <motion.div
                initial={{ opacity: 0, x: -35 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="relative flex justify-center py-5 order-last lg:order-first"
              >
                <div className="absolute top-[20%] left-[20%] w-[65%] h-[65%] rounded-full bg-amber-200/20 filter blur-[45px] animate-pulse pointer-events-none" />
                <motion.div 
                  whileHover={{ rotate: -1, scale: 1.015 }}
                  transition={{ type: 'spring', stiffness: 260 }}
                  className="w-full max-w-2xl rounded-3xl border border-[#1a2e42]/10 bg-white p-4 shadow-xl cursor-pointer"
                >
                  <div className="overflow-hidden rounded-2xl border border-[#1a2e42]/10 shadow-inner bg-slate-900 aspect-video relative">
                    <Image
                      src="/marketing/screenshots/teacher-raffle.png?v=3"
                      alt="Raffle drawings dashboard preview"
                      fill
                      className="object-cover object-top"
                    />
                  </div>
                </motion.div>
              </motion.div>

              {/* Raffle Details */}
              <motion.div
                initial={{ opacity: 0, x: 35 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-amber-800 shadow-sm mb-5">
                  <Award className="h-3.5 w-3.5" />
                  Automated Raffles
                </div>
                
                <h2
                  className="text-4xl font-bold text-[#102a45] sm:text-5xl font-serif"
                  style={{ fontFamily: 'Fraunces, Georgia, serif' }}
                >
                  Electric drawings that students rally behind
                </h2>
                
                <p className="mt-6 text-base leading-relaxed text-[#1a2e42]/80 font-medium">
                  Bring exciting shared moments to assemblies. LevelUp allows students to buy entry tickets using points directly from their dashboard kiosks. The system manages the drawing process transparently, ensuring fairness, audit-ready balance tracking, and classroom-wide hype.
                </p>

                <ul className="mt-8 space-y-3.5">
                  <li className="flex items-center gap-3 text-sm font-semibold text-[#1a2e42]/95">
                    <CheckCircle2 className="h-5 w-5 text-amber-600 shrink-0" />
                    Automatic ticket pooling and point balance validation limits
                  </li>
                  <li className="flex items-center gap-3 text-sm font-semibold text-[#1a2e42]/95">
                    <CheckCircle2 className="h-5 w-5 text-amber-600 shrink-0" />
                    Interactive raffle drum animation interfaces to draw names live on screens
                  </li>
                  <li className="flex items-center gap-3 text-sm font-semibold text-[#1a2e42]/95">
                    <CheckCircle2 className="h-5 w-5 text-amber-600 shrink-0" />
                    Digital claim checklists and ticket entry receipts for school store leads
                  </li>
                </ul>

                <div className="mt-10">
                  <Link
                    href={getContactFormHref()}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-500 px-6 py-4 font-bold text-white shadow-xl shadow-amber-500/20 hover:brightness-110 hover:shadow-2xl hover:scale-[1.03] transition-all duration-300"
                  >
                    Schedule a Raffle Demo
                    <ArrowUpRight className="h-4.5 w-4.5" />
                  </Link>
                </div>
              </motion.div>

            </div>
          </div>
        </section>

        {/* FEATURE 4: AI ID CARD THEME DESIGNER (Image Right, Text Left) */}
        <section id="id-designer" className="bg-white py-24 border-b border-[#1a2e42]/10 scroll-mt-10">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              
              {/* ID Designer Details */}
              <motion.div
                initial={{ opacity: 0, x: -35 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-purple-800 shadow-sm mb-5">
                  <Sparkles className="h-3.5 w-3.5" />
                  ID Card Designer
                </div>
                
                <h2
                  className="text-4xl font-bold text-[#102a45] sm:text-5xl font-serif"
                  style={{ fontFamily: 'Fraunces, Georgia, serif' }}
                >
                  Print-ready student ID badges designed in seconds
                </h2>
                
                <p className="mt-6 text-base leading-relaxed text-[#1a2e42]/80 font-medium">
                  Style your student identity cards instantly with simple text prompt suggestions. Adjust visual color presets, configure audio arcade sounds, and instantly export standard sheet layouts complete with individual secure scannable barcodes.
                </p>

                <ul className="mt-8 space-y-3.5">
                  <li className="flex items-center gap-3 text-sm font-semibold text-[#1a2e42]/95">
                    <CheckCircle2 className="h-5 w-5 text-purple-600 shrink-0" />
                    Prompt-based color palette builder with instant interactive preview cards
                  </li>
                  <li className="flex items-center gap-3 text-sm font-semibold text-[#1a2e42]/95">
                    <CheckCircle2 className="h-5 w-5 text-purple-600 shrink-0" />
                    Secure scannable barcodes compatible with standard school scanner lasers
                  </li>
                  <li className="flex items-center gap-3 text-sm font-semibold text-[#1a2e42]/95">
                    <CheckCircle2 className="h-5 w-5 text-purple-600 shrink-0" />
                    Print-to-PDF grid systems matching Avery or custom adhesive sheets
                  </li>
                </ul>

                <div className="mt-10">
                  <Link
                    href={getContactFormHref()}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-500 px-6 py-4 font-bold text-white shadow-xl shadow-purple-500/20 hover:brightness-110 hover:shadow-2xl hover:scale-[1.03] transition-all duration-300"
                  >
                    Custom Identity Tools
                    <ArrowUpRight className="h-4.5 w-4.5" />
                  </Link>
                </div>
              </motion.div>

              {/* ID Designer Screenshot Frame */}
              <motion.div
                initial={{ opacity: 0, x: 35 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="relative flex justify-center py-5"
              >
                <div className="absolute top-[20%] right-[20%] w-[65%] h-[65%] rounded-full bg-purple-200/20 filter blur-[45px] animate-pulse pointer-events-none" />
                <motion.div 
                  whileHover={{ rotate: 1, scale: 1.015 }}
                  transition={{ type: 'spring', stiffness: 260 }}
                  className="w-full max-w-2xl rounded-3xl border border-[#1a2e42]/10 bg-slate-50 p-4 shadow-xl cursor-pointer"
                >
                  <div className="overflow-hidden rounded-2xl border border-[#1a2e42]/10 shadow-inner bg-slate-900 aspect-video relative">
                    <Image
                      src="/marketing/screenshots/admin-theme-designer.png?v=3"
                      alt="Administrative theme designer and ID cards customizer preview"
                      fill
                      className="object-cover object-center"
                    />
                  </div>
                </motion.div>
              </motion.div>

            </div>
          </div>
        </section>

        {/* FEATURE 5: COMPLIANCE & ANALYTICS (Image Left, Text Right) */}
        <section id="analytics" className="bg-[#fcfaf6] py-24 border-b border-[#1a2e42]/10 scroll-mt-10">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              
              {/* Analytics Screenshot Frame */}
              <motion.div
                initial={{ opacity: 0, x: -35 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="relative flex justify-center py-5 order-last lg:order-first"
              >
                <div className="absolute top-[20%] left-[20%] w-[65%] h-[65%] rounded-full bg-sky-200/20 filter blur-[45px] animate-pulse pointer-events-none" />
                <motion.div 
                  whileHover={{ rotate: -1, scale: 1.015 }}
                  transition={{ type: 'spring', stiffness: 260 }}
                  className="w-full max-w-2xl rounded-3xl border border-[#1a2e42]/10 bg-white p-4 shadow-xl cursor-pointer"
                >
                  <div className="overflow-hidden rounded-2xl border border-[#1a2e42]/10 shadow-inner bg-slate-900 aspect-video relative">
                    <Image
                      src="/marketing/screenshots/admin-stats.png?v=3"
                      alt="Administrative statistics and reports console preview"
                      fill
                      className="object-cover object-top"
                    />
                  </div>
                </motion.div>
              </motion.div>

              {/* Analytics Details */}
              <motion.div
                initial={{ opacity: 0, x: 35 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-sky-800 shadow-sm mb-5">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Compliance &amp; Analytics
                </div>
                
                <h2
                  className="text-4xl font-bold text-[#102a45] sm:text-5xl font-serif"
                  style={{ fontFamily: 'Fraunces, Georgia, serif' }}
                >
                  Audit-ready statistics &amp; equity tracking
                </h2>
                
                <p className="mt-6 text-base leading-relaxed text-[#1a2e42]/80 font-medium">
                  Stay 100% compliant while building a positive environment. LevelUp provides executive administrators with real-time audit logs of all transaction balances, homeroom distribution analyses, top teacher recognizers, and instant CSV roster backup exports.
                </p>

                <ul className="mt-8 space-y-3.5">
                  <li className="flex items-center gap-3 text-sm font-semibold text-[#1a2e42]/95">
                    <CheckCircle2 className="h-5 w-5 text-sky-600 shrink-0" />
                    Points recognition reports filtered by grade level, category, and teacher
                  </li>
                  <li className="flex items-center gap-3 text-sm font-semibold text-[#1a2e42]/95">
                    <CheckCircle2 className="h-5 w-5 text-sky-600 shrink-0" />
                    Equity analytics that highlight grade cohorts with lower recognition levels
                  </li>
                  <li className="flex items-center gap-3 text-sm font-semibold text-[#1a2e42]/95">
                    <CheckCircle2 className="h-5 w-5 text-sky-600 shrink-0" />
                    Billing billing logs, prize store invoices, and transparent student ledgers
                  </li>
                </ul>

                <div className="mt-10">
                  <Link
                    href={getContactFormHref()}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-500 px-6 py-4 font-bold text-white shadow-xl shadow-sky-500/20 hover:brightness-110 hover:shadow-2xl hover:scale-[1.03] transition-all duration-300"
                  >
                    Request Administrative Demo
                    <ArrowUpRight className="h-4.5 w-4.5" />
                  </Link>
                </div>
              </motion.div>

            </div>
          </div>
        </section>

        {/* AUDIENCES / WHO IT SERVES */}
        <section id="audiences" className="mx-auto max-w-6xl px-6 py-24 scroll-mt-10">
          <div className="flex items-center gap-2 text-[#5c6f55] justify-center sm:justify-start">
            <Users className="h-5 w-5" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-[0.18em]">Targeted Roles</span>
          </div>
          
          <h2
            className="mt-4 text-3xl font-bold text-[#102a45] sm:text-4xl text-center sm:text-left"
            style={{ fontFamily: 'Fraunces, Georgia, serif' }}
          >
            Empower every layer of your school community
          </h2>

          <ul className="mt-12 divide-y divide-[#1a2e42]/10 border-y border-[#1a2e42]/10">
            {AUDIENCES.map(({ role, detail, highlight }, index) => (
              <motion.li
                key={role}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="grid gap-3 py-8 sm:grid-cols-[12rem_1fr_12rem] sm:items-center sm:gap-8 group hover:bg-[#102a45]/[0.01] px-4 rounded-xl transition-colors duration-200"
              >
                <span className="text-xl font-bold text-[#102a45]">{role}</span>
                <span className="text-sm font-medium text-[#1a2e42]/80 leading-relaxed">{detail}</span>
                <span className="inline-flex sm:justify-end">
                  <span className="rounded-full bg-[#c9a227]/10 border border-[#c9a227]/20 px-3 py-1 text-xs font-bold text-[#102a45] group-hover:bg-[#c9a227] group-hover:text-white transition-colors">
                    {highlight}
                  </span>
                </span>
              </motion.li>
            ))}
          </ul>
        </section>

        {/* FINAL LOGIN CALL-TO-ACTION */}
        <section className="mx-auto max-w-5xl px-6 pb-28">
          <motion.div 
            whileHover={{ scale: 1.005 }}
            className="rounded-3xl bg-gradient-to-r from-[#102a45] to-[#1e446d] px-8 py-14 text-center text-white sm:px-16 sm:text-left sm:flex sm:items-center sm:justify-between sm:gap-12 shadow-2xl relative overflow-hidden border-2 border-white/10"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(201,162,39,0.14),transparent_50%)] pointer-events-none" />
            
            <div className="relative z-10 max-w-xl">
              <h2
                className="text-3xl font-bold sm:text-4xl text-[#fdfbf7]"
                style={{ fontFamily: 'Fraunces, Georgia, serif' }}
              >
                Ready to launch your school portal?
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300 font-medium">
                Log in with your administrator token or specific school credentials. Need custom branding for your district? Get in touch with our partnerships desk.
              </p>
            </div>
            
            <Link
              href={APP_LOGIN_HREF}
              className="mt-8 inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#c9a227] to-[#d4ad2f] px-8 py-4 font-bold text-[#102a45] shadow-xl shadow-[#c9a227]/20 hover:brightness-110 hover:scale-[1.03] transition-all duration-300 sm:mt-0 w-full sm:w-auto"
            >
              Access Sign-In Portal
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
          </motion.div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#1a2e42]/10 bg-[#f4f0e8] py-14 text-[#1a2e42]/80 relative z-10">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-8 pb-10 border-b border-[#1a2e42]/10">
            <div>
              <div className="flex items-center gap-2 font-bold text-[#102a45] text-lg">
                <Logo className="h-6 w-6" />
                <span>levelUp EDU</span>
              </div>
              <p className="mt-3 text-xs max-w-xs text-slate-500 leading-relaxed font-medium">
                Gamified positive school environment support, designed to reinforce student actions, reduce administrative overhead, and drive parent alignment.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-x-12 gap-y-6 text-sm font-semibold">
              <div className="flex flex-col gap-2.5">
                <span className="text-xs uppercase font-extrabold tracking-widest text-[#102a45]">Navigation</span>
                <a href="#features" className="hover:text-[#102a45] transition-colors">Features</a>
                <a href="#simulator" className="hover:text-[#102a45] transition-colors">Simulator Sandbox</a>
                <Link href="/flyers" className="hover:text-[#102a45] transition-colors">Printable Flyers</Link>
              </div>

              <div className="flex flex-col gap-2.5">
                <span className="text-xs uppercase font-extrabold tracking-widest text-[#102a45]">Company &amp; Legal</span>
                <Link href={getContactFormHref()} className="hover:text-[#102a45] transition-colors">Contact Partnerships</Link>
                <Link href="/privacy" className="hover:text-[#102a45] transition-colors">Privacy Policy</Link>
                <Link href="/terms" className="hover:text-[#102a45] transition-colors">Terms of Service</Link>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[10px] text-slate-400 max-w-2xl leading-relaxed">
              {SITE_LEGAL_UMBRELLA}
            </p>
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
              © {new Date().getFullYear()} levelUp EDU. All rights reserved.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
