import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ClassroomThemeKitStudio } from './ClassroomThemeKitStudio';

describe('ClassroomThemeKitStudio', () => {
  it('renders theme studio header, batches, and theme options', () => {
    render(<ClassroomThemeKitStudio schoolId="schoolabc" />);

    expect(screen.getByText('Classroom Theme Studio')).toBeDefined();
    expect(screen.getAllByText('Tactile Offset Grid').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Warm Academic Serif').length).toBeGreaterThan(0);
    expect(screen.getByText('Batch 1 · Warm and Tactile')).toBeDefined();
    expect(screen.getByText('Batch 5 · Game On')).toBeDefined();
  });

  it('allows clicking another theme to switch the active design', () => {
    render(<ClassroomThemeKitStudio schoolId="schoolabc" />);

    const candyClayBtn = screen.getByRole('button', { name: /candy clay/i });
    fireEvent.click(candyClayBtn);

    expect(screen.getAllByText(/candy clay/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/11 of 15/i)).toBeDefined();
  });

  it('renders customizer tweak controls and reset button', () => {
    render(<ClassroomThemeKitStudio schoolId="schoolabc" />);

    expect(screen.getByText('Heading Font')).toBeDefined();
    expect(screen.getByText('Body Font')).toBeDefined();
    expect(screen.getByText(/Color Shift/i)).toBeDefined();
    expect(screen.getByText(/Vividness/i)).toBeDefined();
    expect(screen.getByText('Corners')).toBeDefined();
    expect(screen.getByText('Shadows & Depth')).toBeDefined();
    expect(screen.getByRole('button', { name: /reset tweaks/i })).toBeDefined();
  });

  it('toggles dark mode when dark mode checkbox is clicked', () => {
    render(<ClassroomThemeKitStudio schoolId="schoolabc" />);

    const darkCheckboxes = screen.getAllByRole('checkbox', { name: /dark mode/i });
    expect(darkCheckboxes.length).toBeGreaterThan(0);
    expect((darkCheckboxes[0] as HTMLInputElement).checked).toBe(false);

    fireEvent.click(darkCheckboxes[0]);
    expect((darkCheckboxes[0] as HTMLInputElement).checked).toBe(true);
  });
});
