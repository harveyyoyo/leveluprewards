import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AttendanceLogEntry, Class, Student } from '@/lib/types';
import { AttendanceTodayBoard } from './AttendanceTodayBoard';

const recordManualAttendance = vi.fn();
const updateAttendanceStatus = vi.fn();
vi.mock('@/lib/db/attendance', () => ({
  recordManualAttendance: (...args: unknown[]) => recordManualAttendance(...args),
  updateAttendanceStatus: (...args: unknown[]) => updateAttendanceStatus(...args),
  getAttendanceConfig: vi.fn(async () => null),
}));

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

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

const classes: Class[] = [
  { id: 'c1', name: 'Room 4', primaryTeacherId: 't1' },
  { id: 'c2', name: 'Room 5', teacherIds: ['t2', 't1'] },
  { id: 'c3', name: 'Room 6', primaryTeacherId: 't9' },
];
const students = [
  { id: 's1', firstName: 'Ava', lastName: 'Stone', classId: 'c1' },
  { id: 's2', firstName: 'Ben', lastName: 'Ortiz', classId: 'c1' },
  { id: 's3', firstName: 'Cleo', lastName: 'Park', classId: 'c2' },
  { id: 's4', firstName: 'Dan', lastName: 'Reed', classId: 'c3' },
] as Student[];

const now = Date.now();
const headline = () =>
  screen.getByText((_, el) => el?.tagName === 'P' && /\d+ of \d+ checked in/.test(el.textContent || ''));
const config = { pointsForSignIn: 2, pointsForOnTime: 3, onTimeWindowMinutes: 5, schedule: [] };

describe('AttendanceTodayBoard', () => {
  beforeEach(() => {
    recordManualAttendance.mockReset().mockResolvedValue({ success: true, pointsAwarded: 5 });
    updateAttendanceStatus.mockReset().mockResolvedValue(undefined);
    toast.mockReset();
    logs = [
      { id: 'l1', studentId: 's1', signedInAt: now, pointsAwarded: 5, onTime: true },
      { id: 'l3', studentId: 's3', signedInAt: now, pointsAwarded: 2, onTime: false, status: 'excused' },
    ];
  });

  it('shows who is in and counts excused separately from late', () => {
    render(<AttendanceTodayBoard schoolId="abc" students={students} classes={classes} attendanceConfig={config} />);
    expect(headline()).toHaveTextContent('2 of 4 checked in');
    expect(screen.getByText('1 excused')).toBeInTheDocument();
    expect(screen.getByText('0 late')).toBeInTheDocument();
    expect(screen.getByText('2 not in yet')).toBeInTheDocument();
  });

  it('only shows a teacher their own and co-taught classes', () => {
    render(
      <AttendanceTodayBoard
        schoolId="abc"
        students={students}
        classes={classes}
        attendanceConfig={config}
        variant="teacher"
        teacherIdScope="t1"
      />,
    );
    expect(screen.getByText('Cleo Park')).toBeInTheDocument();
    expect(screen.queryByText('Dan Reed')).not.toBeInTheDocument();
    expect(headline()).toHaveTextContent('2 of 3 checked in');
  });

  it('marks a student here with the school points', async () => {
    render(<AttendanceTodayBoard schoolId="abc" students={students} classes={classes} attendanceConfig={config} />);
    const row = screen.getByText('Ben Ortiz').closest('li')!;
    fireEvent.click(within(row).getByRole('button', { name: 'Here' }));
    await vi.waitFor(() => expect(recordManualAttendance).toHaveBeenCalled());
    expect(recordManualAttendance.mock.calls[0][2]).toBe('s2');
    expect(recordManualAttendance.mock.calls[0][4]).toMatchObject({ status: 'on-time', points: 5 });
  });

  it('filters to students who are not in yet', () => {
    render(<AttendanceTodayBoard schoolId="abc" students={students} classes={classes} attendanceConfig={config} />);
    fireEvent.click(screen.getByRole('button', { name: /Not in yet/ }));
    expect(screen.getByText('Ben Ortiz')).toBeInTheDocument();
    expect(screen.getByText('Dan Reed')).toBeInTheDocument();
    expect(screen.queryByText('Ava Stone')).not.toBeInTheDocument();
  });

  it('picks classes from one tidy dropdown instead of a row of boxes', () => {
    render(<AttendanceTodayBoard schoolId="abc" students={students} classes={classes} attendanceConfig={config} />);
    expect(screen.getByRole('combobox', { name: 'Class' })).toHaveTextContent('All classes · 4 students');
    expect(screen.queryByRole('group', { name: 'Filter by class' })).not.toBeInTheDocument();
  });
});
