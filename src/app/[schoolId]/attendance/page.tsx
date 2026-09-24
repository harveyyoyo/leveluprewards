import { Suspense } from 'react';
import { AttendanceWorkspace } from '@/components/attendance/AttendanceWorkspace';

/** Full-screen Attendance workspace. useSearchParams() inside needs a Suspense boundary. */
export default function AttendancePage() {
  return (
    <Suspense fallback={null}>
      <AttendanceWorkspace />
    </Suspense>
  );
}
