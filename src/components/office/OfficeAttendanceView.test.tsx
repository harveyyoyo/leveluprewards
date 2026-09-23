import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OfficeAttendanceView } from './OfficeAttendanceView';
import type { OfficeClass, OfficeStudent } from '@/lib/office/types';

const bulkSetOfficeAttendance = vi.fn();

vi.mock('@/lib/office/useOfficeWrite', () => ({
  useOfficeWrite: () => ({
    ctx: { firestore: {}, schoolId: 'yeshiva' },
    ready: true,
    bulkSetOfficeAttendance,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const EMPTY_ATTENDANCE: never[] = [];
const attendanceHook = vi.fn(() => ({ entries: EMPTY_ATTENDANCE, isLoading: false, error: null }));
vi.mock('@/lib/office/useOfficeAttendance', () => ({
  useOfficeAttendanceForDate: (...args: unknown[]) => attendanceHook(...args),
}));

const classes: OfficeClass[] = [{ id: 'c1', name: 'Shiur Aleph', updatedAt: 0 }];
const students: OfficeStudent[] = [
  { id: 's1', firstName: 'Akiva', lastName: 'Klein', classId: 'c1', updatedAt: 0 },
  { id: 's2', firstName: 'Miriam', lastName: 'Klein', classId: 'c1', updatedAt: 0 },
];

describe('OfficeAttendanceView', () => {
  it('defaults every student to Present and saves with one click', async () => {
    attendanceHook.mockReturnValue({ entries: EMPTY_ATTENDANCE, isLoading: false, error: null });
    render(<OfficeAttendanceView schoolId="yeshiva" students={students} classes={classes} isLoading={false} />);

    expect(screen.getByText(/2 present · 0 absent · 0 late · 0 excused/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /save attendance/i }));

    expect(bulkSetOfficeAttendance).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        classId: 'c1',
        marks: [
          { studentId: 's1', status: 'present' },
          { studentId: 's2', status: 'present' },
        ],
      }),
    );
  });

  it('marking a student absent updates the summary counts', () => {
    attendanceHook.mockReturnValue({ entries: EMPTY_ATTENDANCE, isLoading: false, error: null });
    render(<OfficeAttendanceView schoolId="yeshiva" students={students} classes={classes} isLoading={false} />);

    const akivaRow = screen.getByText('Akiva Klein').closest('li')!;
    fireEvent.click(within(akivaRow).getByRole('button', { name: 'Absent' }));

    expect(screen.getByText(/1 present · 1 absent · 0 late · 0 excused/)).toBeInTheDocument();
  });

  it('shows a calm message when attendance data is still locked on the live site', () => {
    attendanceHook.mockReturnValue({
      entries: EMPTY_ATTENDANCE,
      isLoading: false,
      error: new Error('permission-denied'),
    });
    render(<OfficeAttendanceView schoolId="yeshiva" students={students} classes={classes} isLoading={false} />);

    expect(screen.getByText(/Attendance isn’t unlocked on the live site yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save attendance/i })).not.toBeInTheDocument();
  });
});
