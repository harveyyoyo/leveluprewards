import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OfficeStudentSheet } from './OfficeStudentSheet';
import type { OfficeStudent } from '@/lib/office/types';

vi.mock('@/firebase', () => ({
  useFirestore: () => ({}),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

function baseStudent(overrides: Partial<OfficeStudent> = {}): OfficeStudent {
  return {
    id: 's1',
    firstName: 'Akiva',
    lastName: 'Klein',
    updatedAt: 0,
    ...overrides,
  };
}

const requiredProps = {
  schoolId: 'yeshiva',
  open: true,
  onOpenChange: vi.fn(),
  gradeEntries: [],
  billingAccounts: [],
  activeTerm: 'Spring 2026',
  classes: [],
  teachers: [],
};

describe('OfficeStudentSheet background details', () => {
  it('view mode: "More" is collapsed by default and reveals an empty state when no background info is set', () => {
    render(<OfficeStudentSheet {...requiredProps} student={baseStudent()} />);

    expect(screen.queryByText(/no background details yet/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^more$/i }));
    expect(screen.getByText(/no background details yet/i)).toBeInTheDocument();
  });

  it('view mode: reveals populated background fields behind "More"', () => {
    const student = baseStudent({
      dateOfBirth: '2015-04-12',
      gender: 'Male',
      address: '123 Main St',
      homeLanguage: 'Yiddish',
      enrollmentDate: '2023-09-01',
      emergencyContactName: 'Sarah Klein',
      emergencyContactPhone: '555-1234',
      medicalNotes: 'Peanut allergy',
    });
    render(<OfficeStudentSheet {...requiredProps} student={student} />);

    fireEvent.click(screen.getByRole('button', { name: /^more$/i }));

    expect(screen.getByText('2015-04-12')).toBeInTheDocument();
    expect(screen.getByText('Sarah Klein')).toBeInTheDocument();
    expect(screen.getByText('Peanut allergy')).toBeInTheDocument();
    expect(screen.queryByText(/no background details yet/i)).not.toBeInTheDocument();
  });

  it('edit mode: background fields are hidden until "More background details" is toggled', () => {
    render(<OfficeStudentSheet {...requiredProps} student={baseStudent()} />);

    fireEvent.click(screen.getByRole('button', { name: /edit student/i }));
    expect(screen.queryByText(/date of birth/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /more background details/i }));
    expect(screen.getByText(/date of birth/i)).toBeInTheDocument();
    expect(screen.getByText(/allergies \/ medical notes/i)).toBeInTheDocument();
  });
});
