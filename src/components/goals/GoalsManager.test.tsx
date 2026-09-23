import { act, fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { Student } from '@/lib/types';

const fixtures = vi.hoisted(() => ({
  goals: [{ id: 'goal', title: 'Kindness target', type: 'personal', studentId: 'student', targetPoints: 50, status: 'active', createdAt: 1, description: 'Old description', bonusPointsReward: 5, categoryId: 'kind' }],
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
const categories = [{ id: 'kind', name: 'Kindness' }] as never[];
const prizes: [] = [];
function openGoal(title: RegExp = /Kindness target/) {
  fireEvent.click(screen.getByRole('button', { name: title }));
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
  it('keeps category and start-date rules out of a student wishlist goal', async () => {
    const original = fixtures.goals[0];
    fixtures.goals[0] = { ...original, type: 'prize_savings', ...{ categoryId: 'old-category', startDate: 1 } };
    try {
      await act(async () => { showGoals(); });
      openGoal(); fireEvent.click(screen.getByRole('button', { name: 'Edit goal' }));
      expect(screen.getByLabelText('Who is this for?')).toHaveTextContent('One student');
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
  it('shows goals to students by default and can hide one', async () => {
    await act(async () => { showGoals(); });
    openGoal(); fireEvent.click(screen.getByRole('button', { name: 'Edit goal' }));
    const box = screen.getByRole('checkbox', { name: 'Show on student page' });
    expect(box).toBeChecked();
    fireEvent.click(box);
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(updateGoal).toHaveBeenCalledWith(fixtures.db, 'school', 'goal', expect.objectContaining({ hiddenFromStudents: true })));
  });
  it('raises the target of a finished goal and makes it current again', async () => {
    const original = fixtures.goals[0];
    fixtures.goals[0] = { ...original, status: 'completed', ...{ completedAt: 5, completedProgress: 50 } };
    try {
      await act(async () => { showGoals(); });
      fireEvent.click(screen.getByRole('button', { name: /Finished/ }));
      openGoal(); fireEvent.click(screen.getByRole('button', { name: 'Raise target' }));
      expect(screen.getByLabelText('New target points')).toHaveValue('100');
      fireEvent.change(screen.getByLabelText('New target points'), { target: { value: '40' } });
      fireEvent.click(screen.getAllByRole('button', { name: 'Raise target' }).at(-1)!);
      expect(updateGoal).not.toHaveBeenCalled();
      fireEvent.change(screen.getByLabelText('New target points'), { target: { value: '100' } });
      fireEvent.click(screen.getAllByRole('button', { name: 'Raise target' }).at(-1)!);
      await waitFor(() => expect(updateGoal).toHaveBeenCalledWith(fixtures.db, 'school', 'goal', expect.objectContaining({
        status: 'active', targetPoints: 100, targetRaises: 1,
        clearFields: expect.arrayContaining(['completedAt', 'completedProgress']),
      })));
    } finally { fixtures.goals[0] = original; }
  });
  it('names a goal from its target and category, with no title box', async () => {
    await act(async () => { showGoals(); });
    openGoal(); fireEvent.click(screen.getByRole('button', { name: 'Edit goal' }));
    expect(screen.queryByLabelText(/^Title/)).not.toBeInTheDocument();
    expect(screen.getByText('50 Kindness points')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(updateGoal).toHaveBeenCalledWith(fixtures.db, 'school', 'goal', expect.objectContaining({ title: '50 Kindness points' })));
  });
  it('treats a higher target on a finished goal, saved through Edit, as a raise', async () => {
    const original = fixtures.goals[0];
    fixtures.goals[0] = { ...original, status: 'completed', ...{ completedAt: 5, completedProgress: 50 } };
    try {
      await act(async () => { showGoals(); });
      fireEvent.click(screen.getByRole('button', { name: /Finished/ }));
      openGoal(); fireEvent.click(screen.getByRole('button', { name: 'Edit goal' }));
      fireEvent.change(screen.getByLabelText('Target points'), { target: { value: '90' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
      await waitFor(() => expect(updateGoal).toHaveBeenCalledWith(fixtures.db, 'school', 'goal', expect.objectContaining({
        status: 'active', targetPoints: 90, targetRaises: 1,
        clearFields: expect.arrayContaining(['completedAt', 'completedProgress', 'almostThereNotifiedAt']),
      })));
    } finally { fixtures.goals[0] = original; }
  });
  it('requires a category for a points goal', async () => {
    const original = fixtures.goals[0];
    fixtures.goals[0] = { ...original, ...{ categoryId: undefined as unknown as string } };
    try {
      await act(async () => { showGoals(); });
      openGoal(); fireEvent.click(screen.getByRole('button', { name: 'Edit goal' }));
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
      expect(updateGoal).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    } finally { fixtures.goals[0] = original; }
  });
  it('names a points goal after its prize and saves how the prize is given', async () => {
    const original = fixtures.goals[0];
    fixtures.goals[0] = { ...original, ...{ prizeId: 'lunch', prizeReward: 'free' } };
    const rewards = [{ id: 'lunch', name: 'Lunch with Teacher', points: 1200 }] as never[];
    try {
      await act(async () => {
        render(<GoalsManager schoolId="school" variant="admin" students={students} classes={classes} categories={categories} prizes={rewards} />);
      });
      openGoal(); fireEvent.click(screen.getByRole('button', { name: 'Edit goal' }));
      expect(screen.queryByLabelText(/^Title/)).not.toBeInTheDocument();
      expect(screen.getByLabelText('How do they get the prize?')).toHaveTextContent('Give it to them free when they finish');
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
      await waitFor(() => expect(updateGoal).toHaveBeenCalledWith(fixtures.db, 'school', 'goal', expect.objectContaining({
        type: 'personal', title: 'Earn Lunch with Teacher', prizeId: 'lunch', prizeReward: 'free', categoryId: 'kind',
      })));
    } finally { fixtures.goals[0] = original; }
  });
  it('names a savings goal after its reward instead of asking for a title', async () => {
    const original = fixtures.goals[0];
    fixtures.goals[0] = { ...original, type: 'prize_savings', ...{ prizeId: 'lunch', title: 'Old name' } };
    const rewards = [{ id: 'lunch', name: 'Lunch with Teacher', points: 1200 }] as never[];
    try {
      await act(async () => {
        render(<GoalsManager schoolId="school" variant="admin" students={students} classes={classes} categories={categories} prizes={rewards} />);
      });
      openGoal(/Old name/); fireEvent.click(screen.getByRole('button', { name: 'Edit goal' }));
      expect(screen.queryByLabelText(/^Title/)).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
      await waitFor(() => expect(updateGoal).toHaveBeenCalledWith(fixtures.db, 'school', 'goal', expect.objectContaining({ title: 'Save for Lunch with Teacher' })));
    } finally { fixtures.goals[0] = original; }
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
    expect(screen.queryByLabelText(/^Title/)).not.toBeInTheDocument();
    expect(screen.getByText(/Alex Sample/)).toBeInTheDocument();
    openGoal(); fireEvent.click(screen.getByRole('button', { name: 'Edit goal' }));
    fireEvent.change(screen.getByLabelText('Target points'), { target: { value: '80' } });
    fireEvent.change(screen.getByLabelText('Description (optional)'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Bonus on completion (optional)'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(updateGoal).toHaveBeenCalledWith(fixtures.db, 'school', 'goal', expect.objectContaining({ title: '80 Kindness points', clearFields: expect.arrayContaining(['description', 'bonusPointsReward']) })));
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
