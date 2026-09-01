'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BookOpenCheck, LayoutGrid, Monitor, Palette, Sparkles, Tv } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClassroomRealmHero, ClassroomRealmShell } from '@/components/classroom/ClassroomRealmShell';
import {
  CLASSROOM_REALM_ACCENT_BUTTON,
  ClassroomRealmPanel,
} from '@/components/classroom/ClassroomRealmChrome';
import { ClassroomRealmThemePicker } from '@/components/classroom/ClassroomRealmThemePicker';
import { classroomRealmHref, classroomRealmManageHref } from '@/lib/classroomRealmUrl';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useAppContext } from '@/components/AppProvider';
import { isClassroomPillarOn } from '@/lib/productPillars';
import { canAccessHallOfFameRoute } from '@/lib/hallOfFameAccess';
import {
  resolveClassroomRealmTheme,
  type ClassroomRealmThemeId,
} from '@/lib/classroom/classroomRealmThemes';
import { CLASSROOM_TAB_LABEL } from '@/lib/classroom/classroomTabSections';

const spring = { type: 'spring' as const, stiffness: 280, damping: 26 };

const featured = [
  {
    title: 'Live monitor',
    desc: 'Fullscreen awards on your projector or smart board. Tap a student, give points, keep teaching.',
    href: (schoolId: string) => classroomRealmHref(schoolId, 'live'),
    icon: LayoutGrid,
  },
  {
    title: 'Class screen',
    desc: 'The student-facing mirror — seating and points only, no behavior notes.',
    href: (schoolId: string) => classroomRealmHref(schoolId, 'class-screen'),
    icon: Tv,
  },
] as const;

const tools = [
  {
    title: 'Awards & seating',
    desc: 'Charts, quick awards, and live settings.',
    href: (schoolId: string) => classroomRealmManageHref(schoolId, 'seating'),
    icon: Monitor,
  },
  {
    title: 'Behavior',
    desc: 'Notes and timeline for the class.',
    href: (schoolId: string) => classroomRealmManageHref(schoolId, 'behavior'),
    icon: BookOpenCheck,
  },
  {
    title: 'More setup',
    desc: 'Seating wizard and extra classroom options.',
    href: (schoolId: string) => classroomRealmHref(schoolId, 'setup'),
    icon: Palette,
  },
] as const;

export default function ClassroomRealmHomePage() {
  const params = useParams();
  const schoolId = String(params.schoolId || '');
  const { settings, updateSettings } = useSettings();
  const { loginState } = useAppContext();
  const classroomOn = isClassroomPillarOn(settings);
  const theme = resolveClassroomRealmTheme(settings.classroomRealmTheme);

  const isStaff = canAccessHallOfFameRoute(loginState);

  function selectTheme(id: ClassroomRealmThemeId) {
    updateSettings({ classroomRealmTheme: id });
  }

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
              style={CLASSROOM_REALM_ACCENT_BUTTON}
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
        title="Ready for class"
        subtitle="Launch the live board, mirror it for students, then manage seating and notes — all in one teaching space."
      >
        <Button
          asChild
          size="lg"
          className="h-14 rounded-full border-0 px-10 text-base font-bold shadow-xl shadow-black/30 transition-transform hover:-translate-y-0.5"
          style={CLASSROOM_REALM_ACCENT_BUTTON}
        >
          <Link href={classroomRealmHref(schoolId, 'live')}>
            <LayoutGrid className="mr-2 h-5 w-5" aria-hidden />
            Launch live monitor
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="lg"
          className="rounded-full border-white/25 bg-white/5 px-8 font-semibold text-white hover:bg-white/10 hover:text-white"
        >
          <Link href={classroomRealmHref(schoolId, 'class-screen')}>
            <Tv className="mr-2 h-5 w-5" aria-hidden />
            Open class screen
          </Link>
        </Button>
      </ClassroomRealmHero>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="mx-auto mb-8 flex max-w-5xl flex-wrap items-center justify-center gap-3 px-6 text-xs font-semibold text-white/55"
      >
        <a
          href="#change-look"
          className="rounded-full border border-white/15 bg-white/8 px-3 py-1 hover:border-white/30"
          style={{ color: 'var(--cr-accent-text)' }}
        >
          {theme.icon} {theme.label} · Change look
        </a>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
        className="mx-auto grid max-w-5xl gap-5 px-6 lg:grid-cols-2"
      >
        {featured.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              transition={spring}
            >
              <Link
                href={card.href(schoolId)}
                className="group flex h-full flex-col rounded-3xl border border-white/12 bg-white/[0.06] p-7 backdrop-blur-md transition-transform hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.09]"
              >
                <div
                  className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
                  style={CLASSROOM_REALM_ACCENT_BUTTON}
                >
                  <Icon className="h-7 w-7" aria-hidden />
                </div>
                <h2 className="mb-2 font-serif text-2xl font-bold text-white">{card.title}</h2>
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

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.12 } } }}
        className="mx-auto mt-5 grid max-w-5xl gap-4 px-6 sm:grid-cols-3"
      >
        {tools.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
              transition={spring}
            >
              <Link
                href={card.href(schoolId)}
                className="group flex h-full flex-col rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md transition-transform hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.07]"
              >
                <Icon className="mb-3 h-5 w-5" style={{ color: 'var(--cr-accent-text)' }} aria-hidden />
                <h2 className="mb-1 font-serif text-lg font-bold text-white">{card.title}</h2>
                <p className="text-sm leading-relaxed text-white/50">{card.desc}</p>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.section
        id="change-look"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.16 }}
        className="mx-auto mt-8 max-w-5xl scroll-mt-8 px-6"
      >
        <ClassroomRealmPanel>
          <div className="mb-5">
            <h2 className="font-serif text-2xl font-bold text-white">Change the classroom look</h2>
            <p className="mt-1 text-sm text-white/55">
              Tap a card. The background and colors update right away for everyone in Classroom.
            </p>
          </div>
          {isStaff ? (
            <ClassroomRealmThemePicker value={theme.id} onSelect={selectTheme} />
          ) : (
            <p className="text-sm text-white/50">Staff sign-in is required to change the look.</p>
          )}
        </ClassroomRealmPanel>
      </motion.section>

      <div className="pb-24" />
    </ClassroomRealmShell>
  );
}
