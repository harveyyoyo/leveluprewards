import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LibraryStudentNamePicker } from './LibraryStudentNamePicker';
import type { Student } from '@/lib/types';

vi.mock('@/components/providers/SettingsProvider', () => ({
  useSettings: () => ({
    settings: {
      libraryStudentNameDisplayMode: 'preferred_full',
      libraryStudentThemeDisplay: 'emoji_and_color',
      enableStudentThemes: true,
    },
  }),
}));

const mockStudents: Student[] = [
  {
    id: 'stu-1',
    firstName: 'Alex',
    lastName: 'Johnson',
    nfcId: 'CARD101',
    points: 50,
  },
  {
    id: 'stu-2',
    firstName: 'Alexander',
    lastName: 'Smith',
    nickname: 'Xander',
    nfcId: 'CARD102',
    points: 120,
  },
  {
    id: 'stu-3',
    firstName: 'Sarah',
    lastName: 'Connor',
    nfcId: 'CARD103',
    points: 80,
  },
];

describe('LibraryStudentNamePicker', () => {
  it('renders input with placeholder', () => {
    render(
      <LibraryStudentNamePicker
        students={mockStudents}
        onSelect={vi.fn()}
        variant="kiosk"
      />,
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Type your name/i)).toBeInTheDocument();
  });

  it('shows matching popup when student types name', () => {
    render(
      <LibraryStudentNamePicker
        students={mockStudents}
        onSelect={vi.fn()}
        variant="kiosk"
      />,
    );

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'alex' } });

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Alex Johnson')).toBeInTheDocument();
    expect(screen.getByText('Xander Smith')).toBeInTheDocument();
    expect(screen.getByText('(Alexander)')).toBeInTheDocument();
    expect(screen.queryByText('Sarah Connor')).not.toBeInTheDocument();
  });

  it('finds student by nickname', () => {
    render(
      <LibraryStudentNamePicker
        students={mockStudents}
        onSelect={vi.fn()}
        variant="kiosk"
      />,
    );

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'xander' } });

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Xander Smith')).toBeInTheDocument();
    expect(screen.getByText('(Alexander)')).toBeInTheDocument();
  });

  it('invokes onSelect when clicked', () => {
    const handleSelect = vi.fn();
    render(
      <LibraryStudentNamePicker
        students={mockStudents}
        onSelect={handleSelect}
        variant="kiosk"
        clearOnSelect
      />,
    );

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'sarah' } });

    const option = screen.getByText('Sarah Connor');
    fireEvent.click(option);

    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'stu-3',
        firstName: 'Sarah',
        lastName: 'Connor',
      }),
    );
  });

  it('navigates with arrow keys and selects with Enter', () => {
    const handleSelect = vi.fn();
    render(
      <LibraryStudentNamePicker
        students={mockStudents}
        onSelect={handleSelect}
        variant="kiosk"
      />,
    );

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'alex' } });

    // Arrow down to move to second match (Alexander Smith)
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'stu-2',
        firstName: 'Alexander',
      }),
    );
  });
});
