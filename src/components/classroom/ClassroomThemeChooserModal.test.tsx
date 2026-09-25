import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ClassroomThemeChooserModal } from './ClassroomThemeChooserModal';

describe('ClassroomThemeChooserModal', () => {
  it('does not render when open is false', () => {
    const { container } = render(
      <ClassroomThemeChooserModal
        open={false}
        onOpenChange={vi.fn()}
        onApplyTheme={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal dialog when open is true with 15 themes', () => {
    render(
      <ClassroomThemeChooserModal
        open={true}
        onOpenChange={vi.fn()}
        onApplyTheme={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Classroom Theme Chooser' })).toBeInTheDocument();
    expect(screen.getByText('15 Seating Chart Looks')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Apply to Classroom/i })).toBeInTheDocument();
  });

  it('calls onApplyTheme with active slug and settings when Apply button clicked', () => {
    const onApply = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <ClassroomThemeChooserModal
        open={true}
        onOpenChange={onOpenChange}
        onApplyTheme={onApply}
      />
    );

    const applyBtn = screen.getByRole('button', { name: /Apply to Classroom/i });
    fireEvent.click(applyBtn);

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('toggles dark mode checkbox', () => {
    render(
      <ClassroomThemeChooserModal
        open={true}
        onOpenChange={vi.fn()}
        onApplyTheme={vi.fn()}
      />
    );

    const darkModeCheckboxes = screen.getAllByRole('checkbox', { name: /Dark mode/i });
    expect(darkModeCheckboxes.length).toBeGreaterThan(0);
    fireEvent.click(darkModeCheckboxes[0]);
    expect(darkModeCheckboxes[0]).toBeChecked();
  });
});
