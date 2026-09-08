import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { RandomStudentPickerModal } from './RandomStudentPickerModal';
import type { Student } from '@/lib/types';

vi.mock('@/hooks/useArcadeSound', () => ({
  useArcadeSound: () => vi.fn(),
}));

describe('RandomStudentPickerModal', () => {
  afterEach(() => vi.useRealTimers());
  const mockStudents: Student[] = [
    {
      id: 'student-1',
      firstName: 'Maya',
      lastName: 'Lin',
      points: 120,
      classId: 'c1',
      nfcId: 'nfc-1',
      createdAt: Date.now(),
    },
    {
      id: 'student-2',
      firstName: 'Leo',
      lastName: 'Chen',
      points: 85,
      classId: 'c1',
      nfcId: 'nfc-1',
      createdAt: Date.now(),
    },
  ];

  it('renders correctly when open with title', () => {
    render(
      <RandomStudentPickerModal
        isOpen={true}
        onClose={vi.fn()}
        students={mockStudents}
        onAward={vi.fn()}
      />,
    );

    expect(screen.getByText('Random Student Picker')).toBeDefined();
  });

  it('does not render content when closed', () => {
    render(
      <RandomStudentPickerModal
        isOpen={false}
        onClose={vi.fn()}
        students={mockStudents}
        onAward={vi.fn()}
      />,
    );

    expect(screen.queryByText('Random Student Picker')).toBeNull();
  });

  it('finishes a spin, reports failed awards, and allows another pick', async () => {
    vi.useFakeTimers();
    const onAward = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    render(<RandomStudentPickerModal isOpen onClose={vi.fn()} students={mockStudents} onAward={onAward} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(screen.getByText('Congratulations!')).toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '+1 pts' })));
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save points');
    expect(screen.queryByText('Points Awarded Successfully!')).toBeNull();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '+1 pts' })));
    expect(onAward).toHaveBeenCalledWith(expect.stringMatching(/^student-/), 1, expect.any(String));
    expect(screen.getByText('Points Awarded Successfully!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pick Another' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(screen.getByText('Congratulations!')).toBeInTheDocument();
  });

  it('starts a fresh spin after closing mid-spin and reopening', async () => {
    vi.useFakeTimers();
    const props = { onClose: vi.fn(), students: mockStudents, onAward: vi.fn() };
    const view = render(<RandomStudentPickerModal {...props} isOpen />);
    view.rerender(<RandomStudentPickerModal {...props} isOpen={false} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    view.rerender(<RandomStudentPickerModal {...props} isOpen />);
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(screen.getByText('Congratulations!')).toBeInTheDocument();
  });
});
