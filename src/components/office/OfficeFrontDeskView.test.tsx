import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OfficeFrontDeskView } from './OfficeFrontDeskView';
import type { OfficeDeskLogEntry, OfficeFamily, OfficeStudent } from '@/lib/office/types';

const createOfficeDeskLog = vi.fn();
const archiveOfficeDeskLog = vi.fn();

vi.mock('@/lib/office/useOfficeWrite', () => ({
  useOfficeWrite: () => ({
    ctx: { firestore: {}, schoolId: 'schoolabc' },
    ready: true,
    createOfficeDeskLog,
    archiveOfficeDeskLog,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/schoolabc/office/front-desk',
}));

const openStudent = vi.fn();
vi.mock('@/components/office/OfficeEntityNavProvider', () => ({
  useOfficeEntityNav: () => ({ openStudent }),
}));

const logHook = vi.fn((..._args: unknown[]) => ({
  entries: [] as OfficeDeskLogEntry[],
  isLoading: false,
  error: null as Error | null,
}));
vi.mock('@/lib/office/useOfficeDeskLog', () => ({
  useOfficeDeskLogForDate: (...args: unknown[]) => logHook(...args),
}));

const students: OfficeStudent[] = [
  { id: 's1', firstName: 'Emily', lastName: 'Collins', classId: 'c1', familyId: 'f1', updatedAt: 0 },
];
const families = new Map<string, OfficeFamily>([
  [
    'f1',
    {
      id: 'f1',
      displayName: 'Collins family',
      contacts: [{ id: 'p1', name: 'Sarah Collins', role: 'parent', relationship: 'Mother' }],
      legalNotes: 'Father may not pick up.',
      updatedAt: 0,
    },
  ],
]);

function renderView() {
  return render(
    <OfficeFrontDeskView
      schoolId="schoolabc"
      students={students}
      classNameById={new Map([['c1', 'Grade 10']])}
      familyById={families}
      isLoading={false}
    />,
  );
}

describe('OfficeFrontDeskView', () => {
  beforeEach(() => {
    createOfficeDeskLog.mockReset();
    logHook.mockReturnValue({ entries: [], isLoading: false, error: null });
  });

  it('lists the day and flags a pickup by someone not on the contact list', () => {
    logHook.mockReturnValue({
      entries: [
        {
          id: 'l1',
          kind: 'early_pickup',
          studentId: 's1',
          date: '2026-09-23',
          time: '13:30',
          reason: 'Appointment',
          pickedUpBy: 'Uncle Joe',
          pickupApproved: false,
          createdAt: 0,
        },
      ],
      isLoading: false,
      error: null,
    });
    renderView();

    expect(screen.getByText('Emily Collins')).toBeInTheDocument();
    expect(screen.getByText('1:30 PM')).toBeInTheDocument();
    expect(screen.getByText(/Picked up by Uncle Joe/)).toBeInTheDocument();
    expect(screen.getByText(/Not on the family's contact list/)).toBeInTheDocument();
  });

  it('shows a calm message while the log is not open on the live site yet', () => {
    logHook.mockReturnValue({ entries: [], isLoading: false, error: new Error('permission-denied') });
    renderView();
    expect(screen.getByText(/front desk log is almost ready/i)).toBeInTheDocument();
  });

  it('asks for a student before saving', async () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: /arrival or pickup/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Save' }));
    expect(createOfficeDeskLog).not.toHaveBeenCalled();
  });

  it('shows the family custody note before an early pickup is saved', async () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: /arrival or pickup/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Early pickup' }));
    fireEvent.change(screen.getByRole('combobox', { name: /student/i }), { target: { value: 'collins' } });
    fireEvent.mouseDown(await screen.findByRole('option', { name: /Emily Collins/ }));

    expect(screen.getByText(/Custody note:/)).toBeInTheDocument();
    expect(screen.getByText(/Father may not pick up/)).toBeInTheDocument();
  });

  it('saves a late arrival with the picked student and a quick reason', async () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: /arrival or pickup/i }));
    fireEvent.change(await screen.findByRole('combobox', { name: /student/i }), { target: { value: 'emi' } });
    fireEvent.mouseDown(await screen.findByRole('option', { name: /Emily Collins/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Bus late' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(createOfficeDeskLog).toHaveBeenCalled());
    expect(createOfficeDeskLog).toHaveBeenCalledTimes(1);
    expect(createOfficeDeskLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ kind: 'late_arrival', studentId: 's1', reason: 'Bus late' }),
      'Emily Collins',
    );
  });
});
