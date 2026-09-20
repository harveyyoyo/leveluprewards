import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ClassroomLiveCheatsheetDesk, ClassroomLiveCheatsheetTrigger } from './ClassroomLiveCheatsheet';

describe('ClassroomLiveCheatsheet', () => {
  it('pins three shortcut rows beside the teacher desk', () => {
    render(<ClassroomLiveCheatsheetDesk open tapPoints={5} onHide={vi.fn()} />);

    expect(screen.getByText(/^shortcuts$/i)).toBeDefined();
    expect(screen.getByText('+5')).toBeDefined();
    expect(screen.getByText(/right-click menu/i)).toBeDefined();
    expect(screen.queryByText('Ctrl+Z')).toBeNull();
    expect(screen.queryByText('Ctrl+U')).toBeNull();
    expect(screen.getByText('P')).toBeDefined();
    expect(screen.getByText('Alt')).toBeDefined();
  });

  it('lets the teacher hide the sheet and recall it from the header pill', () => {
    const onHide = vi.fn();
    const onShow = vi.fn();
    render(
      <>
        <ClassroomLiveCheatsheetTrigger visible={false} onShow={onShow} />
        <ClassroomLiveCheatsheetDesk open tapPoints={5} onHide={onHide} />
      </>,
    );

    fireEvent.click(screen.getByRole('button', { name: /hide/i }));
    expect(onHide).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /^cheatsheet$/i }));
    expect(onShow).toHaveBeenCalledTimes(1);
  });
});
