import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ClassroomScreenPairModal } from './ClassroomScreenPairModal';

describe('ClassroomScreenPairModal', () => {
  it('renders correctly when open with the class name and pair guides', () => {
    render(
      <ClassroomScreenPairModal
        isOpen={true}
        onClose={vi.fn()}
        schoolId="demo-school"
        classId="grade-4a"
        classNameLabel="Grade 4A - Homeroom"
      />,
    );

    expect(screen.getByText('Pair Classroom Screen')).toBeDefined();
    expect(screen.getByText(/Project "Grade 4A - Homeroom" onto your interactive whiteboard/)).toBeDefined();
    expect(screen.getByText('Student Mirror (Clean)')).toBeDefined();
    expect(screen.getByText('Interactive Board (Teacher)')).toBeDefined();
    expect(screen.getByText('SMART / Promethean')).toBeDefined();
    expect(screen.getByText('Apple TV / AirPlay')).toBeDefined();
    expect(screen.getByText('Classroom iPad / Tablet')).toBeDefined();
  });

  it('does not render content when closed', () => {
    render(
      <ClassroomScreenPairModal
        isOpen={false}
        onClose={vi.fn()}
        schoolId="demo-school"
        classId="grade-4a"
        classNameLabel="Grade 4A - Homeroom"
      />,
    );

    expect(screen.queryByText('Pair Classroom Screen')).toBeNull();
  });

  it('keeps the teacher scope in both mirror and interactive links', () => {
    render(<ClassroomScreenPairModal isOpen onClose={vi.fn()} schoolId="demo-school" classId="grade-4a" classNameLabel="Grade 4A" scope="teacher-1" />);
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toContain('/classroom-screen?classId=grade-4a&scope=teacher-1');
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Interactive Board (Teacher)' }), { button: 0, ctrlKey: false });
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toContain('/classroom-realm/live?classId=grade-4a&scope=teacher-1');
  });
});
