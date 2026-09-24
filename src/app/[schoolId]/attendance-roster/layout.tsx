import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Daily headcount - levelUp EDU',
  description: "Today's attendance and headcount roster.",
};

export default function AttendanceRosterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
