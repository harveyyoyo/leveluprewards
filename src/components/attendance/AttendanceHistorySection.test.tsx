import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { AttendanceLogEntry, Class, Student } from '@/lib/types';
import { recentSchoolDays } from '@/lib/attendance/attendanceStatus';
import { AttendanceHistorySection } from './AttendanceHistorySection';

let logs: AttendanceLogEntry[] = [];
vi.mock('@/firebase', () => ({
  useFirestore: () => ({}),
  useMemoFirebase: (factory: () => unknown) => factory(),
  useCollection: () => ({ data: logs, isLoading: false }),
}));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  orderBy: vi.fn(() => ({})),
}));

const classes: Class[] = [{ id: 'c1', name: 'Room 4' }];
const students = [
  { id: 'amy', firstName: 'Amy', lastName: 'Lo', classId: 'c1' },
  { id: 'ben', firstName: 'Ben', lastName: 'Ng', classId: 'c1' },
] as Student[];

describe('AttendanceHistorySection', () => {
  it('lists who did not check in on a day', () => {
    logs = [{ id: 'l1', studentId: 'amy', studentName: 'Amy Lo', signedInAt: Date.now(), pointsAwarded: 6, onTime: true }];
    render(<AttendanceHistorySection schoolId="abc" students={students} classes={classes} />);
    expect(screen.getByText('1/2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /Did not check in · 1/ }));
    expect(screen.getByText('Ben Ng')).toBeInTheDocument();
    expect(screen.queryByText('Amy Lo')).not.toBeInTheDocument();
  });

  it('flags students who miss a lot in Patterns', () => {
    const days = recentSchoolDays(new Date(), 10);
    logs = days.flatMap((d, i) => {
      const at = d.startMs + 8 * 3600_000;
      const out: AttendanceLogEntry[] = [{ studentId: 'amy', signedInAt: at, pointsAwarded: 6, onTime: true }];
      if (i % 2 === 0) out.push({ studentId: 'ben', signedInAt: at, pointsAwarded: 1, onTime: false });
      return out;
    });
    render(<AttendanceHistorySection schoolId="abc" students={students} classes={classes} />);
    fireEvent.click(screen.getByRole('tab', { name: /Patterns/ }));
    expect(screen.getByText('75%')).toBeInTheDocument(); // average of 100% and 50%
    expect(screen.getByLabelText('Needs attention')).toBeInTheDocument();
    expect(screen.getByText('5 missed')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Check-ins for each day/ })).toBeInTheDocument();
  });
});
