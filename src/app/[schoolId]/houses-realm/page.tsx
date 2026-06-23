'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { collection } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Castle, Palette, Sparkles, Settings2, Trophy, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HousesRealmHero, HousesRealmShell } from '@/components/houses/HousesRealmShell';
import { housesRealmHref } from '@/lib/housesRealmUrl';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useAppContext } from '@/components/AppProvider';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { resolveHousesRealmTheme } from '@/lib/houses/housesRealmThemes';
import type { House } from '@/lib/types';

const spring = { type: 'spring' as const, stiffness: 280, damping: 26 };

const cards = [
  {
    title: 'Set up',
    desc: 'Pick a theme and let AI build a matching set of houses.',
    segment: 'setup' as const,
    icon: Wand2,
    accent: 'from-violet-600 to-fuchsia-700',
  },
  {
    title: 'Manage',
    desc: 'Create houses, assign students, and adjust points.',
    segment: 'manage' as const,
    icon: Settings2,
    accent: 'from-amber-500 to-orange-600',
  },
  {
    title: 'Ceremony',
    desc: 'Fullscreen sorting presentation for the whole school.',
    segment: 'ceremony' as const,
    icon: Sparkles,
    accent: 'from-sky-500 to-indigo-600',
  },
  {
    title: 'Hall of Fame',
    desc: 'Celebrate top students and house standings.',
    segment: 'hall-of-fame' as const,
    icon: Trophy,
    accent: 'from-emerald-500 to-teal-600',
  },
];

const accentButton = {
  backgroundImage: 'linear-gradient(135deg, var(--hr-accent-from), var(--hr-accent-to))',
  color: 'var(--hr-on-accent)',
} as const;

export default function HousesRealmHomePage() {
  const params = useParams();
  const schoolId = String(params.schoolId || '');
  const firestore = useFirestore();
  const { settings, updateSettings } = useSettings();
  const { loginState } = useAppContext();

  const housesQuery = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'houses') : null),
    [firestore, schoolId],
  );
  const { data: houses } = useCollection<House>(housesQuery);
  const hasHouses = (houses?.length ?? 0) > 0;

  const isStaff =
    loginState === 'admin' || loginState === 'developer' || loginState === 'teacher';
  const activeTheme = resolveHousesRealmTheme(settings.housesRealmTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-houses-realm', '');
    return () => document.documentElement.removeAttribute('data-houses-realm');
  }, []);

  if (!settings.enableHouses) {
    return (
      <HousesRealmShell schoolId={schoolId}>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="max-w-md text-white/70">Houses aren’t turned on for this school yet.</p>
          {isStaff ? (
            <Button
              type="button"
              size="lg"
              onClick={() => updateSettings({ enableHouses: true })}
              className="rounded-full border-0 px-8 font-bold shadow-xl shadow-black/30"
              style={accentButton}
            >
              <Sparkles className="mr-2 h-5 w-5" aria-hidden />
              Enable Houses
            </Button>
          ) : (
            <p className="text-sm text-white/50">Ask an admin to turn Houses on.</p>
          )}
        </div>
      </HousesRealmShell>
    );
  }

  return (
    <HousesRealmShell schoolId={schoolId}>
      <HousesRealmHero
        title={hasHouses ? 'Welcome to the Houses' : 'Let’s build your Houses'}
        subtitle={
          hasHouses
            ? 'A dedicated space for houses — run ceremonies, manage rosters, and celebrate standings.'
            : 'Start by choosing a theme. Type a word and AI designs the look and a full set of houses for your school.'
        }
      >
        {isStaff ? (
          <Button
            asChild
            size="lg"
            className="h-14 rounded-full border-0 px-10 text-base font-bold shadow-xl shadow-black/30 transition-transform hover:-translate-y-0.5"
            style={accentButton}
          >
            <Link href={housesRealmHref(schoolId, 'setup')}>
              <Wand2 className="mr-2 h-5 w-5" aria-hidden />
              Choose a theme
            </Link>
          </Button>
        ) : null}
        {hasHouses ? (
          <Button
            asChild
            variant="outline"
            size="lg"
            className="rounded-full border-white/25 bg-white/5 px-8 font-semibold text-white hover:bg-white/10 hover:text-white"
          >
            <Link href={housesRealmHref(schoolId, 'ceremony')}>
              <Castle className="mr-2 h-5 w-5" aria-hidden />
              Launch ceremony
            </Link>
          </Button>
        ) : null}
      </HousesRealmHero>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
        className="mx-auto grid max-w-5xl gap-5 px-6 sm:grid-cols-2 lg:grid-cols-4"
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
                <span
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: 'var(--hr-accent-text)' }}
                >
                  Open →
                </span>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      {isStaff ? (
        <div className="mx-auto mt-10 flex max-w-5xl justify-center px-6 pb-20">
          <Link
            href={housesRealmHref(schoolId, 'setup')}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/60 transition-colors hover:border-white/20 hover:text-white/90"
          >
            <Palette className="h-3.5 w-3.5" style={{ color: 'var(--hr-accent-text)' }} aria-hidden />
            Theme: <span className="font-bold text-white/80">{activeTheme.label}</span>
            <span className="text-white/40">·</span> Change
          </Link>
        </div>
      ) : (
        <div className="pb-20" />
      )}
    </HousesRealmShell>
  );
}
