'use client';

import { useRouter } from 'next/navigation';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { cn } from '@/lib/utils';
import { TeacherPrinterInner } from '@/app/[schoolId]/teacher/TeacherPrinterInner';
import { StaffPortalChrome } from './StaffPortalChrome';

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
        className={cn(
          'mx-auto flex h-full min-h-0 min-w-0 w-full flex-col gap-6 p-4 md:p-8',
          sidebar ? 'max-w-[100rem]' : 'max-w-7xl',
        )}
      >
        <StaffPortalChrome role="teacher" schoolId={schoolId} displayName={displayName} />
        <ErrorBoundary name="TeacherStaffPortal">
          <TeacherPrinterInner
            embedded
            teacherName={displayName}
            teacherId={validTeacherId}
            onLogout={handleLogout}
          />
        </ErrorBoundary>
      </div>
    </TooltipProvider>
  );
}
