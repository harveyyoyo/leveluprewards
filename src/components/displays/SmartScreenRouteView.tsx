'use client';

import { useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';
import { SmartScreenDisplay } from '@/components/displays/SmartScreenDisplay';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useSmartScreenDisplayData } from '@/hooks/useSmartScreenDisplayData';
import { buildSmartScreenSettingsSnapshot, readSmartScreenSetting } from '@/lib/smartScreen/smartScreenSettings';
import { useSchoolProfile } from '@/hooks/useSchoolProfile';

const VIEWER_LOGIN_STATES = new Set([
  'teacher',
  'admin',
  'school',
  'developer',
  'secretary',
  'prizeClerk',
  'reports',
  'librarian',
  'houseCoordinator',
]);

export default function SmartScreenRouteView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginState, isInitialized, schoolId } = useAppContext();
  const { settings } = useSettings();
  const { isJewishOrthodox } = useSchoolProfile();
  const screenProfileId = (searchParams.get('screenProfileId') || '').trim();
  const activeScreenProfile = screenProfileId ? settings.smartScreenProfiles?.[screenProfileId] : null;
  const activeProfileSettings = useMemo(
    () => activeScreenProfile?.settings ?? {},
    [activeScreenProfile],
  );

  const screenSettings = useMemo(
    () => buildSmartScreenSettingsSnapshot(settings, activeProfileSettings),
    [settings, activeProfileSettings],
  );

  const configuredZip = (readSmartScreenSetting('smartScreenLocationZip', settings, activeProfileSettings) || '').trim();
  const displayData = useSmartScreenDisplayData(schoolId, configuredZip);

  useEffect(() => {
    if (isInitialized && !VIEWER_LOGIN_STATES.has(loginState)) {
      router.replace('/login');
    }
  }, [isInitialized, loginState, router]);

  if (!schoolId) return null;

  return (
    <SmartScreenDisplay
      schoolId={schoolId}
      schoolSettings={settings}
      screenSettings={screenSettings}
      screenProfileName={activeScreenProfile?.name}
      variant="fullscreen"
      isJewishOrthodox={isJewishOrthodox}
      loading={!isInitialized || !VIEWER_LOGIN_STATES.has(loginState)}
      loadingLabel="Loading Smart Screen..."
      {...displayData}
    />
  );
}
