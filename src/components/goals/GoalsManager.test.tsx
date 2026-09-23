import { act, fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { Student } from '@/lib/types';

const fixtures = vi.hoisted(() => ({
  goals: [{ id: 'goal', title: 'Kindness target', type: 'personal', studentId: 'student', targetPoints: 50, status: 'active', createdAt: 1, description: 'Old description', bonusPointsReward: 5 }],
  db: {},
}));
vi.mock('@/firebase', () => ({
  useFirestore: () => fixtures.db,
  useMemoFirebase: () => null,
  useCollection: () => ({ data: fixtures.goals, isLoading: false }),
}));
vi.mock('@/lib/db', () => ({ addGoal: vi.fn(), updateGoal: vi.fn(), deleteGoal: vi.fn() }));
vi.mock('@/lib/goalsProgress', () => ({ computeGoalProgress: vi.fn(async () => 20), syncGoalsForStudent: vi.fn(async () => []) }));
vi.mock('@/components/providers/SettingsProvider', () => ({ useSettings: () => ({ settings: { goalsOptions: {} }, updateSettings: vi.fn() }) }));
vi.mock('@/components/providers/AuthProvider', () => ({ useAuth: () => ({ userId: 'admin-one', userName: 'Alex Admin', teacherDocId: null, isAdmin: true }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/components/tabWalkthrough/TabWalkthroughContext', () => ({ TabWalkthroughHeaderAction: () => null }));
vi.mock('@/components/staff/StaffPortalTabHeader', () => ({ StaffPortalTabPanel: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

import { GoalsManager } from './GoalsManager';
import { updateGoal, deleteGoal } from '@/lib/db';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const students = [{ id: 'student', firstName: 'Alex', lastName: 'Sample' }] as Student[];
const classes: [] = [];
const categories: [] = [];
const prizes: [] = [];
function openGoal() {
  fireEvent.click(screen.getByRole('button', { name: /Kindness target/ }));
}
function showGoals() {
  return render(<GoalsManager schoolId="school" variant="admin" students={students} classes={classes} categories={categories} prizes={prizes} />);
}

describe('Goals manager', () => {
  it('lets an admin see and manage another assigner’s unshared goal', async () => {
    const original = fixtures.goals[0];
    fixtures.goals[0] = { ...original, ...{ assignedByStaffId: 'teacher:other', assignedByName: 'Other Teacher', staffVisibility: 'creator' } };
    try {
      await act(async () => { showGoals(); });
      expect(screen.getByText('Kindness target')).toBeInTheDocument();
      openGoal(); expect(screen.getByText(/Assigned by: Other Teacher/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Edit goal' })).toBeInTheDocument();
    } finally { fixtures.goals[0] = original; }
  });
  it('keeps the assigner when editing a shared goal', async () => {
    const original = fixtures.goals[0];
    fixtures.goals[0] = { ...original, ...{ assignedByStaffId: 'admin:admin-one', assignedByName: 'Original Admin Name', assignedByRole: 'admin', staffVisibility: 'all' } };
    try {
      await act(async () => { showGoals(); });
      openGoal(); fireEvent.click(screen.getByRole('button', { name: 'Edit goal' }));
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
      await waitFor(() => expect(updateGoal).toHaveBeenCalledWith(fixtures.db, 'school', 'goal', expect.objectContaining({ assignedByStaffId: 'admin:admin-one', assignedByName: 'Original Admin Name', staffVisibility: 'all' })));
    } finally { fixtures.goals[0] = original; }
  });
  it('keeps unused category and start-date rules out of a savings goal', async () => {
    const original = fixtures.goals[0];
    fixtures.goals[0] = { ...original, type: 'prize_savings', ...{ categoryId: 'old-category', startDate: 1 } };
    try {
      await act(async () => { showGoals(); });
      openGoal(); fireEvent.click(screen.getByRole('button', { name: 'Edit goal' }));
      expect(screen.getByLabelText('Who is this for?')).toHaveTextContent('One student');
      expect(screen.getByLabelText('What are they working toward?')).toHaveTextContent('Save points for a prize');
      expect(screen.queryByLabelText('Start date (optional)')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Which category counts?')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
      await waitFor(() => expect(updateGoal).toHaveBeenCalledWith(fixtures.db, 'school', 'goal', expect.objectContaining({
        type: 'prize_savings',
        categoryId: undefined,
        startDate: undefined,
        clearFields: expect.arrayContaining(['categoryId', 'startDate']),
      })));
    } finally {
      fixtures.goals[0] = original;
    }
  });
  it('rejects an end date before the start date', async () => {
    await act(async () => { showGoals(); });
    openGoal(); fireEvent.click(screen.getByRole('button', { name: 'Edit goal' }));
    fireEvent.change(screen.getByLabelText('Start date (optional)'), { target: { value: '2026-10-10' } });
    fireEvent.change(screen.getByLabelText('End date (optional)'), { target: { value: '2026-10-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(updateGoal).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
  it('opens existing details and saves edits while clearing optional values', async () => {
    await act(async () => { showGoals(); });
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
    expect(screen.getByText(/Alex Sample/)).toBeInTheDocument();
    openGoal(); fireEvent.click(screen.getByRole('button', { name: 'Edit goal' }));
    expect(screen.getByLabelText('Title')).toHaveValue('Kindness target');
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New target' } });
    fireEvent.change(screen.getByLabelText('Description (optional)'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Bonus on completion (optional)'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(updateGoal).toHaveBeenCalledWith(fixtures.db, 'school', 'goal', expect.objectContaining({ title: 'New target', clearFields: expect.arrayContaining(['description', 'bonusPointsReward']) })));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('does not delete a goal until the warning is confirmed', async () => {
    await act(async () => { showGoals(); });
    openGoal(); fireEvent.click(screen.getByRole('button', { name: 'Delete goal' }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(deleteGoal).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Keep it' }));
    expect(deleteGoal).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete goal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deleteGoal).toHaveBeenCalledWith(fixtures.db, 'school', 'goal'));
  });
});
