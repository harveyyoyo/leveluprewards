import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Attendance - levelUp EDU',
  description: 'Live attendance, bell schedule, room passes, and attendance reports.',
};

export default function AttendanceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
