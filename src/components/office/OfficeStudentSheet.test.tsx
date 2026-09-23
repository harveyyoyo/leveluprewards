import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OfficeStudentSheet } from './OfficeStudentSheet';
import type { OfficeFamily, OfficeStudent } from '@/lib/office/types';

const updateOfficeStudent = vi.fn();
const archiveOfficeStudentBatch = vi.fn();

vi.mock('@/lib/office/useOfficeWrite', () => ({
  useOfficeWrite: () => ({
    ctx: { firestore: {}, schoolId: 'yeshiva' },
    ready: true,
    updateOfficeStudent,
    archiveOfficeStudentBatch,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/lib/authFetch', () => ({
  useAuthFetch: () => vi.fn(),
}));

vi.mock('@/components/office/OfficePortalChrome', () => ({
  useOfficePortalChrome: () => ({
    features: {
      familyProfiles: true,
      studentPhotos: true,
      busInfo: true,
      medicalNotes: true,
      aiHelp: true,
      auditLog: true,
    },
  }),
}));

vi.mock('@/lib/office/useOfficeDeskLog', () => ({
  useOfficeDeskLogForStudent: () => ({ entries: [], isLoading: false, error: null }),
}));

vi.mock('@/lib/office/useOfficeHistoryNames', () => ({
  useOfficeHistoryNames: () => () => undefined,
}));

vi.mock('@/lib/office/useOfficeEntityHistory', () => ({
  useOfficeEntityHistory: () => ({
    entries: [
      { id: 'h1', entityType: 'officeStudent', entityId: 's1', action: 'update', summary: 'Updated student Akiva Klein', changedAt: 1700000000000, changedBy: 'Front Office' },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/lib/office/useOfficeAttendance', () => ({
  useOfficeAttendanceForStudent: () => ({ entries: [], isLoading: false }),
  useOfficeAttendanceForDate: () => ({ entries: [], isLoading: false }),
}));

vi.mock('@/lib/office/useOfficeStudentDocuments', () => ({
  useOfficeStudentDocuments: () => ({ documents: [], isLoading: false }),
}));

const openFamily = vi.fn();
vi.mock('@/components/office/OfficeEntityNavProvider', () => ({
  useOfficeEntityNav: () => ({
    openStudent: vi.fn(),
    openTeacher: vi.fn(),
    openClass: vi.fn(),
    openFamily,
    closeAll: vi.fn(),
    selectedStudentId: null,
    selectedTeacherId: null,
    selectedClassId: null,
  }),
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

describe('OfficeStudentSheet', () => {
  it('view mode: shows a status badge for non-active students', () => {
    render(<OfficeStudentSheet {...requiredProps} student={baseStudent({ status: 'withdrawn' })} />);
    expect(screen.getByText('Withdrawn')).toBeInTheDocument();
  });

  it('view mode: shows a medical warning badge when the linked family has a medical note', () => {
    const families: OfficeFamily[] = [
      { id: 'fam1', displayName: 'Klein family', contacts: [], medicalNotes: 'Peanut allergy', updatedAt: 0 },
    ];
    render(
      <OfficeStudentSheet
        {...requiredProps}
        student={baseStudent({ familyId: 'fam1' })}
        families={families}
      />,
    );
    expect(screen.getByText('Medical')).toBeInTheDocument();
  });

  it('view mode: lists siblings sharing the same family', () => {
    const families: OfficeFamily[] = [
      { id: 'fam1', displayName: 'Klein family', contacts: [], updatedAt: 0 },
    ];
    const sibling = baseStudent({ id: 's2', firstName: 'Miriam', familyId: 'fam1' });
    render(
      <OfficeStudentSheet
        {...requiredProps}
        student={baseStudent({ familyId: 'fam1' })}
        families={families}
        allStudents={[baseStudent({ familyId: 'fam1' }), sibling]}
      />,
    );
    expect(screen.getByText('Miriam Klein')).toBeInTheDocument();
  });

  it('view mode: "More" reveals tags and history behind a toggle', () => {
    render(<OfficeStudentSheet {...requiredProps} student={baseStudent({ tags: ['scholarship'] })} />);

    expect(screen.queryByText('scholarship')).not.toBeInTheDocument();
    expect(screen.queryByText(/updated student akiva klein/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /more \(tags, documents & history\)/i }));

    expect(screen.getByText('scholarship')).toBeInTheDocument();
    expect(screen.queryByText(/updated student akiva klein/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^history$/i }));

    expect(screen.getByText(/updated student akiva klein/i)).toBeInTheDocument();
  });

  it('edit mode: saving calls updateOfficeStudent with status and tags', () => {
    render(<OfficeStudentSheet {...requiredProps} student={baseStudent()} />);

    fireEvent.click(screen.getByRole('button', { name: /edit student/i }));
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(updateOfficeStudent).toHaveBeenCalledWith(
      expect.anything(),
      's1',
      expect.objectContaining({ status: 'active', tags: null }),
      expect.any(String),
    );
  });
});
