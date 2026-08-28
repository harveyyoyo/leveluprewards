'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { LayoutGrid, Monitor, Settings2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClassroomRealmHero, ClassroomRealmShell } from '@/components/classroom/ClassroomRealmShell';
import { classroomRealmHref, classroomRealmManageHref } from '@/lib/classroomRealmUrl';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useAppContext } from '@/components/AppProvider';
import { isClassroomPillarOn } from '@/lib/productPillars';
import { CLASSROOM_SEATING_SECTION_LABEL, CLASSROOM_TAB_LABEL } from '@/lib/classroom/classroomTabSections';

const spring = { type: 'spring' as const, stiffness: 280, damping: 26 };

const cards = [
  {
    title: 'Set up',
    desc: 'Turn on Classroom, pick a look, and configure quick awards for your classes.',
    segment: 'setup' as const,
    icon: Settings2,
    accent: 'from-indigo-600 to-violet-700',
  },
  {
    title: 'Manage',
    desc: 'Seating charts, behavior notes, room display, and raffle drawings.',
    segment: 'manage' as const,
    icon: Sparkles,
    accent: 'from-violet-500 to-fuchsia-600',
  },
  {
    title: CLASSROOM_SEATING_SECTION_LABEL,
    desc: 'Fullscreen live awards monitor for your projector or smart board.',
    segment: 'live' as const,
    icon: LayoutGrid,
    accent: 'from-sky-500 to-indigo-600',
  },
  {
    title: 'Class screen',
    desc: 'Student-facing mirror of the live chart — no behavior notes.',
    segment: 'class-screen' as const,
    icon: Monitor,
    accent: 'from-emerald-500 to-teal-600',
  },
] as const;

const accentButton = {
  backgroundImage: 'linear-gradient(135deg, var(--cr-accent-from), var(--cr-accent-to))',
  color: 'var(--cr-on-accent)',
} as const;

export default function ClassroomRealmHomePage() {
  const params = useParams();
  const schoolId = String(params.schoolId || '');
  const { settings, updateSettings } = useSettings();
  const { loginState } = useAppContext();
  const classroomOn = isClassroomPillarOn(settings);

  const isStaff =
    loginState === 'admin' || loginState === 'developer' || loginState === 'teacher';

  useEffect(() => {
    document.documentElement.setAttribute('data-classroom-realm', '');
    return () => document.documentElement.removeAttribute('data-classroom-realm');
  }, []);

  if (!classroomOn) {
    return (
      <ClassroomRealmShell schoolId={schoolId}>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="max-w-md text-white/70">
            {CLASSROOM_TAB_LABEL} isn&apos;t turned on for this school yet.
          </p>
          {isStaff && loginState === 'admin' ? (
            <Button
              type="button"
              size="lg"
              onClick={() => updateSettings({ payClassroom: true })}
              className="rounded-full border-0 px-8 font-bold shadow-xl shadow-black/30"
              style={accentButton}
            >
              <Sparkles className="mr-2 h-5 w-5" aria-hidden />
              Enable Classroom
            </Button>
          ) : (
            <p className="text-sm text-white/50">Ask an admin to turn Classroom on.</p>
          )}
        </div>
      </ClassroomRealmShell>
    );
  }

  return (
    <ClassroomRealmShell schoolId={schoolId}>
      <ClassroomRealmHero
        title="Your classroom command center"
        subtitle="A dedicated space for seating charts, quick awards, behavior notes, and live class screens — built for teaching."
      >
        {isStaff ? (
          <Button
            asChild
            size="lg"
            className="h-14 rounded-full border-0 px-10 text-base font-bold shadow-xl shadow-black/30 transition-transform hover:-translate-y-0.5"
            style={accentButton}
          >
            <Link href={classroomRealmHref(schoolId, 'setup')}>
              <Settings2 className="mr-2 h-5 w-5" aria-hidden />
              Run setup
            </Link>
          </Button>
        ) : null}
        <Button
          asChild
          variant="outline"
          size="lg"
          className="rounded-full border-white/25 bg-white/5 px-8 font-semibold text-white hover:bg-white/10 hover:text-white"
        >
          <Link href={classroomRealmHref(schoolId, 'live')}>
            <LayoutGrid className="mr-2 h-5 w-5" aria-hidden />
            Launch live monitor
          </Link>
        </Button>
      </ClassroomRealmHero>

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
                href={
                  card.segment === 'manage'
                    ? classroomRealmManageHref(schoolId, 'seating')
                    : classroomRealmHref(schoolId, card.segment)
                }
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
                  style={{ color: 'var(--cr-accent-text)' }}
                >
                  Open →
                </span>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="pb-20" />
    </ClassroomRealmShell>
  );
}
