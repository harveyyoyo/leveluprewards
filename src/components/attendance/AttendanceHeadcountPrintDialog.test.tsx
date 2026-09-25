import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { AttendanceHeadcountPrintDialog } from './AttendanceHeadcountPrintDialog';
import type { Student, Class, AttendanceLogEntry } from '@/lib/types';

vi.mock('@/firebase', () => ({
  useFirestore: () => ({}),
  useCollection: () => ({ data: [] }),
  useMemoFirebase: (factory: () => unknown) => factory(),
}));

const students = [
  { id: 's1', firstName: 'Ada', lastName: 'Lovelace', classId: 'c1' },
  { id: 's2', firstName: 'Alan', lastName: 'Turing', classId: 'c1' },
] as unknown as Student[];

const classes = [{ id: 'c1', name: 'Room 1' }] as unknown as Class[];

const logs = [
  { studentId: 's1', signedInAt: Date.now(), pointsAwarded: 5, onTime: true },
] as unknown as AttendanceLogEntry[];

function openDialog() {
  render(
    <AttendanceHeadcountPrintDialog
      schoolId="school1"
      schoolName="Test School"
      students={students}
      classes={classes}
      attendanceLogs={logs}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: /daily headcount/i }));
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

function summaryCardValue(label: string): string {
  const labelEl = screen.getByText(label, { selector: 'span.tracking-wider' });
  const card = labelEl.closest('div.rounded-2xl') as HTMLElement;
  return within(card).getByText(/^\d+$/).textContent || '';
}

describe('AttendanceHeadcountPrintDialog', () => {
  it('computes counts from sign-in logs by default', () => {
    openDialog();

    expect(summaryCardValue('Total')).toBe('2');
    expect(summaryCardValue('On Time')).toBe('1');
    expect(summaryCardValue('Not Present')).toBe('1');

    const row = screen.getByText('Turing, Alan').closest('tr')!;
    const statusButton = within(row).getByTitle(/change this student's status by hand/i);
    expect(within(statusButton).getByText('Absent')).toBeInTheDocument();
  });

  it('lets a staff member correct a student status by hand and updates the totals', () => {
    openDialog();

    const row = screen.getByText('Turing, Alan').closest('tr')!;
    const statusButton = within(row).getByTitle(/change this student's status by hand/i);

    // Starts Absent -> click cycles to On Time
    fireEvent.click(statusButton);
    expect(within(statusButton).getByText('On Time')).toBeInTheDocument();
    expect(within(statusButton).getByText('Edited')).toBeInTheDocument();

    // A manual undo control appears once something has been edited
    expect(screen.getByRole('button', { name: /undo 1 hand-edit/i })).toBeInTheDocument();
  });

  it('remembers hand edits for the day via localStorage', () => {
    openDialog();
    const row = screen.getByText('Turing, Alan').closest('tr')!;
    fireEvent.click(within(row).getByTitle(/change this student's status by hand/i));

    const stored = JSON.parse(
      window.localStorage.getItem(
        Object.keys(window.localStorage).find((k) => k.startsWith('headcountOverrides:school1:'))!
      ) || '{}'
    );
    expect(stored.s2).toBe('on-time');
  });
});
