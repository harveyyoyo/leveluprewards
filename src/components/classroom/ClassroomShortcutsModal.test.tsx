import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ClassroomShortcutsModal, ClassroomShortcutsTrigger } from './ClassroomShortcutsModal';

describe('ClassroomShortcutsModal', () => {
  it('opens a two-column shortcuts list with status dots', () => {
    const onOpenChange = vi.fn();
    render(
      <>
        <ClassroomShortcutsTrigger onOpen={() => onOpenChange(true)} />
        <ClassroomShortcutsModal open onOpenChange={onOpenChange} tapPoints={5} />
      </>,
    );

    expect(screen.getByRole('button', { name: /^shortcuts$/i })).toBeDefined();
    const dialog = screen.getByRole('dialog', { name: /shortcuts/i });
    expect(within(dialog).getByText('Instant award: +5 now')).toBeDefined();
    expect(within(dialog).getByText('Left click')).toBeDefined();
    expect(within(dialog).getByText('Open menu')).toBeDefined();
    expect(within(dialog).getByText('Right click')).toBeDefined();
    expect(within(dialog).getByText('Positive note')).toBeDefined();
    expect(within(dialog).getByText('Hold P')).toBeDefined();
    expect(within(dialog).getByText('Incident')).toBeDefined();
    expect(within(dialog).getByText('Hold I')).toBeDefined();
    expect(within(dialog).getByText('Warning')).toBeDefined();
    expect(within(dialog).getByText('Hold W')).toBeDefined();
    expect(within(dialog).getByText('Highlight')).toBeDefined();
    expect(within(dialog).getByText('Hold H')).toBeDefined();
    expect(within(dialog).getByText('Choose note type')).toBeDefined();
    expect(within(dialog).getByText('Shift')).toBeDefined();
    expect(within(dialog).queryByText('Undo last award')).toBeNull();
    expect(within(dialog).queryByText('Ctrl+Z')).toBeNull();
    expect(within(dialog).queryByText('Ctrl+U')).toBeNull();
    expect(within(dialog).getByText(/status indicators/i)).toBeDefined();
    expect(within(dialog).getByText('Present:')).toBeDefined();
    expect(within(dialog).getByText('Not signed in:')).toBeDefined();
    expect(within(dialog).getByText('Hall Pass:')).toBeDefined();
    expect(within(dialog).getByText('Pass Out')).toBeDefined();

    fireEvent.click(within(dialog).getByRole('button', { name: /close shortcuts/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('lets the teacher pin the cheat sheet by the desk', () => {
    const onShowOnScreenChange = vi.fn();
    render(
      <ClassroomShortcutsModal
        open
        onOpenChange={vi.fn()}
        showOnScreen={false}
        onShowOnScreenChange={onShowOnScreenChange}
      />,
    );

    fireEvent.click(screen.getByRole('switch', { name: /by teacher desk/i }));
    expect(onShowOnScreenChange).toHaveBeenCalledWith(true);
  });

  it('closes when Escape is pressed', () => {
    const onOpenChange = vi.fn();
    render(<ClassroomShortcutsModal open onOpenChange={onOpenChange} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
