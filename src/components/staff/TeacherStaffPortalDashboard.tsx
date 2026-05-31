'use client';

import { useRouter } from 'next/navigation';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { cn } from '@/lib/utils';
import { TeacherPrinterInner } from '@/app/[schoolId]/teacher/TeacherPrinterInner';
import { StaffPortalChrome } from './StaffPortalChrome';
import { StaffPortalLayoutProvider } from './StaffPortalLayoutContext';
import { staffPortalShellClassName } from './staffPortalNavStyles';

type TeacherStaffPortalDashboardProps = {
  /** Admin opened teacher tools from the staff portal (`/admin?view=teacher`). */
  adminViewingTeacherTools?: boolean;
};

export function TeacherStaffPortalDashboard({
  adminViewingTeacherTools = false,
}: TeacherStaffPortalDashboardProps) {
  const router = useRouter();
  const { schoolId, userName, userId, teacherDocId, logout, loginState } = useAppContext();
  const { settings } = useSettings();
  const sidebar = settings.adminNavLayout === 'sidebar';

  if (!schoolId) return null;

  const displayName =
    userName || (loginState === 'admin' || loginState === 'developer' ? 'Admin' : 'Teacher');
  const validTeacherId = teacherDocId || userId || '';

  const handleLogout = () => {
    if (adminViewingTeacherTools) {
      router.replace(`/${schoolId}/admin`);
      return;
    }
    logout({ staffNavigateTo: 'portal' });
  };

  return (
    <TooltipProvider>
      <div
        className={staffPortalShellClassName(sidebar)}
      >
        <StaffPortalChrome role="teacher" schoolId={schoolId} displayName={displayName} />
        <StaffPortalLayoutProvider sidebar={sidebar}>
          <ErrorBoundary name="TeacherStaffPortal">
            <TeacherPrinterInner
              embedded
              teacherName={displayName}
              teacherId={validTeacherId}
              onLogout={handleLogout}
            />
          </ErrorBoundary>
        </StaffPortalLayoutProvider>
      </div>
    </TooltipProvider>
  );
}
