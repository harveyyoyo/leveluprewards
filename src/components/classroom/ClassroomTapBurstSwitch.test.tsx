import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ClassroomTapBurstSwitch } from './ClassroomTapBurstSwitch';

describe('ClassroomTapBurstSwitch', () => {
  it('uses one compact Instant Award / Open Menu row', () => {
    const onChange = vi.fn();
    render(<ClassroomTapBurstSwitch mode="one-tap" onChange={onChange} defaultPoints={5} />);

    expect(screen.getByText(/desk click action/i)).toBeDefined();
    expect(screen.getByRole('radio', { name: /instant award/i }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: /open menu/i }).getAttribute('aria-checked')).toBe('false');
    expect(screen.getByText(/right click opens the menu/i)).toBeDefined();
    expect(screen.queryByText(/^award points right away$/i)).toBeNull();
    expect(screen.queryByText(/^pick the award after you tap$/i)).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: /open menu/i }));
    expect(onChange).toHaveBeenCalledWith('show-menu');
  });
});
