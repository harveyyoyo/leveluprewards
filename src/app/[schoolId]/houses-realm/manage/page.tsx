'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { LayoutGrid, Settings, Trophy, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HousesRealmShell } from '@/components/houses/HousesRealmShell';
import { AdminHousesManage, type AdminHousesSection } from '@/app/[schoolId]/admin/sections/AdminHousesManage';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { collection } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { House, Student, Teacher } from '@/lib/types';

const MANAGE_TABS: { id: AdminHousesSection; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'rosters', label: 'Rosters', icon: Users },
  { id: 'setup', label: 'Settings', icon: Settings },
  { id: 'hallOfFame', label: 'Hall of Fame', icon: Trophy },
];

export default function HousesRealmManagePage() {
  const params = useParams();
  const schoolId = String(params.schoolId || '');
  const firestore = useFirestore();
  const { settings } = useSettings();
  const confirm = useConfirm();
  const {
    loginState,
    addHouse,
    updateHouse,
    deleteHouse,
    updateStudent,
    updateTeacher,
  } = useAppContext();
  const [activeTab, setActiveTab] = useState<AdminHousesSection>('overview');

  const housesQuery = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'houses') : null),
    [firestore, schoolId],
  );
  const studentsQuery = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'students') : null),
    [firestore, schoolId],
  );
  const teachersQuery = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'teachers') : null),
    [firestore, schoolId],
  );

  const { data: houses } = useCollection<House>(housesQuery);
  const { data: students } = useCollection<Student>(studentsQuery);
  const { data: teachers } = useCollection<Teacher>(teachersQuery);

  useEffect(() => {
    document.documentElement.setAttribute('data-houses-realm', '');
    return () => document.documentElement.removeAttribute('data-houses-realm');
  }, []);

  const staffOk =
    loginState === 'admin' ||
    loginState === 'developer' ||
    loginState === 'teacher' ||
    loginState === 'houseCoordinator';

  if (!settings.enableHouses) {
    return (
      <HousesRealmShell schoolId={schoolId}>
        <p className="p-8 text-center text-white/70">Houses are not enabled for this school.</p>
      </HousesRealmShell>
    );
  }

  if (!staffOk) {
    return (
      <HousesRealmShell schoolId={schoolId}>
        <p className="p-8 text-center text-white/70">Staff sign-in is required to manage houses.</p>
      </HousesRealmShell>
    );
  }

  return (
    <HousesRealmShell schoolId={schoolId}>
      {/* Top-level section tabs */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-black/30 backdrop-blur-md">
        <div className="mx-auto max-w-6xl flex gap-0 overflow-x-auto px-4 sm:px-6">
          {MANAGE_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-3.5 text-sm font-semibold transition-colors',
                  active
                    ? 'text-white'
                    : 'border-transparent text-white/50 hover:text-white/80',
                )}
                style={active ? { borderBottomColor: 'var(--hr-accent-text)' } : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="houses-realm-manage mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <AdminHousesManage
          schoolId={schoolId}
          houses={houses}
          students={students}
          teachers={teachers}
          onAddHouse={addHouse}
          onUpdateHouse={updateHouse}
          onDeleteHouse={async (id, houseStudents) => {
            const house = (houses || []).find((h) => h.id === id);
            const ok = await confirm({
              title: house ? `Delete house "${house.name}"?` : 'Delete this house?',
              description:
                houseStudents.length > 0
                  ? `${houseStudents.length} student(s) will be unassigned from this house.`
                  : 'No students are assigned to this house.',
              confirmLabel: 'Delete house',
              destructive: true,
            });
            if (!ok) return;
            await deleteHouse(id, houseStudents);
          }}
          onUpdateStudent={updateStudent}
          onUpdateTeacher={updateTeacher}
          section={activeTab}
          onSectionChange={setActiveTab}
        />
      </div>
    </HousesRealmShell>
  );
}
