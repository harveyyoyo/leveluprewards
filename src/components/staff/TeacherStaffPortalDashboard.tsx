'use client';

import { TooltipProvider } from '@/components/ui/tooltip';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TeacherPrinterInner } from '@/app/[schoolId]/teacher/TeacherPrinterInner';
import { StaffPortalChrome } from './StaffPortalChrome';
import { StaffPortalDocumentTitle } from './StaffPortalDocumentTitle';
import { StaffPortalLayoutProvider } from './StaffPortalLayoutContext';
import { StaffPortalShellFrame } from './StaffPortalShellFrame';
import { StaffPortalContentWidth } from './StaffPortalContentWidth';

type TeacherStaffPortalDashboardProps = {
  /** Admin opened teacher tools from the staff portal (`/admin?view=teacher`). */
  adminViewingTeacherTools?: boolean;
};

export function TeacherStaffPortalDashboard({
  adminViewingTeacherTools = false,
}: TeacherStaffPortalDashboardProps) {
  const router = useRouter();
  const { schoolId, userName, userId, teacherDocId, logout, loginState } = useAppContext();

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

  const pageTitle = adminViewingTeacherTools ? 'Teacher tools' : 'Teacher portal';

  return (
    <TooltipProvider>
      <StaffPortalDocumentTitle title={pageTitle} />
      <StaffPortalLayoutProvider>
        <StaffPortalShellFrame>
          <StaffPortalContentWidth className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-5">
          <StaffPortalChrome
            role="teacher"
            schoolId={schoolId}
            displayName={displayName}
            title={adminViewingTeacherTools ? 'Teacher tools' : undefined}
            subtitle={
              adminViewingTeacherTools
                ? 'Previewing what teachers see. Signed in as school admin.'
                : undefined
            }
          />
          <ErrorBoundary name="TeacherStaffPortal">
            <TeacherPrinterInner
              embedded
              teacherName={displayName}
              teacherId={validTeacherId}
              onLogout={handleLogout}
            />
          </ErrorBoundary>
          </StaffPortalContentWidth>
        </StaffPortalShellFrame>
      </StaffPortalLayoutProvider>
    </TooltipProvider>
  );
}
