import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RandomStudentPickerModal } from './RandomStudentPickerModal';
import type { Student } from '@/lib/types';

vi.mock('@/hooks/useArcadeSound', () => ({
  useArcadeSound: () => vi.fn(),
}));

describe('RandomStudentPickerModal', () => {
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
});
