import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OfficeCommunicationView } from './OfficeCommunicationView';
import type { OfficeClass, OfficeFamily, OfficeStudent } from '@/lib/office/types';

const createOfficeForm = vi.fn();
const upsertOfficeEvent = vi.fn();

vi.mock('@/lib/office/useOfficeWrite', () => ({
  useOfficeWrite: () => ({
    ctx: { firestore: {}, schoolId: 'yeshiva' },
    ready: true,
    createOfficeForm,
    setOfficeFormResponse: vi.fn(),
    deleteOfficeForm: vi.fn(),
    upsertOfficeEvent,
    deleteOfficeEvent: vi.fn(),
  }),
}));

vi.mock('@/lib/office/useOfficeForms', () => ({
  useOfficeForms: () => ({ forms: [], isLoading: false }),
}));

vi.mock('@/lib/office/useOfficeEvents', () => ({
  useOfficeEvents: () => ({ events: [], isLoading: false }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const classes: OfficeClass[] = [
  { id: 'c1', name: 'Shiur Aleph', updatedAt: 0 },
  { id: 'c2', name: 'Shiur Bet', updatedAt: 0 },
];
const students: OfficeStudent[] = [
  { id: 's1', firstName: 'Akiva', lastName: 'Klein', classId: 'c1', familyId: 'f1', updatedAt: 0 },
  { id: 's2', firstName: 'Miriam', lastName: 'Klein', classId: 'c1', familyId: 'f1', updatedAt: 0 },
  { id: 's3', firstName: 'Dovid', lastName: 'Cohen', classId: 'c2', familyId: 'f2', updatedAt: 0 },
];
const families: OfficeFamily[] = [
  { id: 'f1', displayName: 'Klein family', contacts: [{ id: 'c1', name: 'Sarah Klein', role: 'parent', email: 'sarah@x.com' }], updatedAt: 0 },
  { id: 'f2', displayName: 'Cohen family', contacts: [{ id: 'c2', name: 'David Cohen', role: 'parent', email: 'david@x.com' }], updatedAt: 0 },
];

describe('OfficeCommunicationView — Announcements', () => {
  it('collects one email per family for "All families", deduping siblings', () => {
    render(
      <OfficeCommunicationView schoolId="yeshiva" students={students} classes={classes} families={families} isLoading={false} />,
    );

    expect(screen.getByText(/2 email addresses found across 3 students/)).toBeInTheDocument();
  });

  it('narrows to one class’s families when a class is selected', () => {
    render(
      <OfficeCommunicationView schoolId="yeshiva" students={students} classes={classes} families={families} isLoading={false} />,
    );

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Shiur Bet'));

    expect(screen.getByText(/1 email address found across 1 student/)).toBeInTheDocument();
  });
});
