'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Castle, Sparkles, Settings2, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HousesRealmHero, HousesRealmShell } from '@/components/houses/HousesRealmShell';
import { housesRealmHref } from '@/lib/housesRealmUrl';
import { useSettings } from '@/components/providers/SettingsProvider';

const spring = { type: 'spring' as const, stiffness: 280, damping: 26 };

const cards = [
  {
    title: 'Sorting ceremony',
    desc: 'Fullscreen presentation for the whole school.',
    segment: 'ceremony' as const,
    icon: Sparkles,
    accent: 'from-violet-600 to-fuchsia-700',
  },
  {
    title: 'Houses & rosters',
    desc: 'Create houses, assign students, and adjust points.',
    segment: 'manage' as const,
    icon: Settings2,
    accent: 'from-amber-500 to-orange-600',
  },
  {
    title: 'Hall of Fame',
    desc: 'Celebrate top students and house standings.',
    segment: 'hall-of-fame' as const,
    icon: Trophy,
    accent: 'from-sky-500 to-indigo-600',
  },
];

export default function HousesRealmHomePage() {
  const params = useParams();
  const schoolId = String(params.schoolId || '');
  const { settings } = useSettings();

  useEffect(() => {
    document.documentElement.setAttribute('data-houses-realm', '');
    return () => document.documentElement.removeAttribute('data-houses-realm');
  }, []);

  if (!settings.enableHouses) {
    return (
      <HousesRealmShell schoolId={schoolId}>
        <div className="flex min-h-[60vh] items-center justify-center p-8 text-center text-white/70">
          <p>Houses are not enabled for this school. Turn them on in LevelUp Admin first.</p>
        </div>
      </HousesRealmShell>
    );
  }

  return (
    <HousesRealmShell schoolId={schoolId}>
      <HousesRealmHero
        title="Welcome to the Houses"
        subtitle="A dedicated space for houses — ceremonies, rosters, and celebrations. Built for the big screen."
      />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
        className="mx-auto grid max-w-5xl gap-5 px-6 pb-20 sm:grid-cols-3"
      >
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.segment}
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              transition={spring}
            >
              <Link
                href={housesRealmHref(schoolId, card.segment)}
                className="group flex h-full flex-col rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-transform hover:-translate-y-1 hover:border-white/20 hover:bg-white/8"
              >
                <div
                  className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${card.accent} shadow-lg`}
                >
                  <Icon className="h-6 w-6 text-white" aria-hidden />
                </div>
                <h2 className="mb-2 font-serif text-xl font-bold text-white">{card.title}</h2>
                <p className="mb-6 flex-1 text-sm leading-relaxed text-white/55">{card.desc}</p>
                <span className="text-xs font-bold uppercase tracking-widest text-amber-200/80 group-hover:text-amber-100">
                  Open →
                </span>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="flex justify-center pb-16">
        <Button
          asChild
          size="lg"
          className="rounded-full bg-gradient-to-r from-amber-400 to-violet-500 px-8 font-bold text-[#1a0f2e] shadow-xl shadow-violet-900/30 hover:from-amber-300 hover:to-violet-400"
        >
          <Link href={housesRealmHref(schoolId, 'ceremony')}>
            <Castle className="mr-2 h-5 w-5" aria-hidden />
            Launch ceremony
          </Link>
        </Button>
      </div>
    </HousesRealmShell>
  );
}
