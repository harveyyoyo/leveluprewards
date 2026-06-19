'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { HousesRealmShell } from '@/components/houses/HousesRealmShell';
import { AdminHouseHallOfFamePanel } from '@/app/[schoolId]/admin/sections/AdminHouseHallOfFamePanel';
import { useSettings } from '@/components/providers/SettingsProvider';

export default function HousesRealmHallOfFamePage() {
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
        <p className="p-8 text-center text-white/70">Houses are not enabled for this school.</p>
      </HousesRealmShell>
    );
  }

  return (
    <HousesRealmShell schoolId={schoolId}>
      <div className="houses-realm-manage mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <AdminHouseHallOfFamePanel schoolId={schoolId} />
      </div>
    </HousesRealmShell>
  );
}
