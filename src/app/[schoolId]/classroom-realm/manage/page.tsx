'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { BookOpenCheck, Dices, LayoutGrid, Monitor } from 'lucide-react';
import { ClassroomRealmShell } from '@/components/classroom/ClassroomRealmShell';
import { ClassroomRealmPageHeader } from '@/components/classroom/ClassroomRealmChrome';
import { StaffClassroomTab } from '@/components/points/StaffClassroomTab';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useClassroomRealmRoster } from '@/hooks/useClassroomRealmRoster';
import { isClassroomPillarOn } from '@/lib/productPillars';
import { parseClassroomRealmManageSection, classroomRealmManageHref } from '@/lib/classroomRealmUrl';
import {
  buildClassroomSections,
  CLASSROOM_SECTION_LABELS,
  type ClassroomTabSection,
} from '@/lib/classroom/classroomTabSections';
import { cn } from '@/lib/utils';

const SECTION_ICONS: Record<ClassroomTabSection, typeof LayoutGrid> = {
  seating: LayoutGrid,
  behavior: BookOpenCheck,
  'room-display': Monitor,
  raffle: Dices,
};

export default function ClassroomRealmManagePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const schoolId = String(params.schoolId || '');
  const initialSection = parseClassroomRealmManageSection(searchParams?.get('section')) ?? 'seating';

  const { settings } = useSettings();
  const classroomOn = isClassroomPillarOn(settings);
  const roster = useClassroomRealmRoster(schoolId, { includeCategories: true });
  const sections = buildClassroomSections(settings, roster.variant);

  if (!classroomOn) {
    return (
      <ClassroomRealmShell schoolId={schoolId}>
        <p className="p-8 text-center text-white/70">Classroom is not enabled for this school.</p>
      </ClassroomRealmShell>
    );
  }

  if (!roster.staffOk || !roster.canReadRoster) {
    return (
      <ClassroomRealmShell schoolId={schoolId}>
        <p className="p-8 text-center text-white/70">
          Sign in as teacher or admin to manage classroom.
        </p>
      </ClassroomRealmShell>
    );
  }

  const SectionIcon = SECTION_ICONS[initialSection];

  return (
    <ClassroomRealmShell schoolId={schoolId}>
      <div className="classroom-realm-manage mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <ClassroomRealmPageHeader
          eyebrow="Manage"
          title={CLASSROOM_SECTION_LABELS[initialSection]}
          subtitle="Seating, notes, room display, and raffle — the tools you use between live sessions."
          icon={SectionIcon}
        />

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="mb-5 flex gap-2 overflow-x-auto pb-1 lg:hidden"
          aria-label="Classroom manage sections"
        >
          {sections.map((section) => {
            const Icon = SECTION_ICONS[section];
            const active = section === initialSection;
            return (
              <Link
                key={section}
                href={classroomRealmManageHref(schoolId, section)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold',
                  active
                    ? 'border-white/30 bg-white/12 text-white'
                    : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white',
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {CLASSROOM_SECTION_LABELS[section]}
              </Link>
            );
          })}
        </motion.div>

        <StaffClassroomTab
          variant={roster.variant}
          realmMode
          schoolId={schoolId}
          categories={roster.categories}
          classes={roster.classes}
          students={roster.students}
          managerTeacherId={roster.managerTeacherId}
          schoolWideAccess={roster.schoolWide}
          initialSection={initialSection}
          canEditRaffleSettings={roster.loginState === 'admin' || roster.loginState === 'developer'}
        />
      </div>
    </ClassroomRealmShell>
  );
}
