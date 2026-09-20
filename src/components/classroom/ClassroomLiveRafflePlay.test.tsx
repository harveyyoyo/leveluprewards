import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ClassroomLiveRafflePlay } from './ClassroomLiveRafflePlay';

describe('ClassroomLiveRafflePlay', () => {
  it('puts spin cards first and hides rules and entries until opened', () => {
    const onSpinReels = vi.fn();
    const onSpinWheel = vi.fn();
    const onRulesOpenChange = vi.fn();
    const onEntriesOpenChange = vi.fn();

    render(
      <ClassroomLiveRafflePlay
        eligibleCount={17}
        onTimeCount={14}
        attendanceAvailable
        poolScope="eligible"
        onPoolScopeChange={vi.fn()}
        statusText="17 Eligible • 1 Entry Each • Deduct: OFF"
        rulesOpen={false}
        onRulesOpenChange={onRulesOpenChange}
        rulesPanel={<p>Points per ticket</p>}
        entriesCount={17}
        entriesOpen={false}
        onEntriesOpenChange={onEntriesOpenChange}
        entriesPanel={<p>Ada Lovelace</p>}
        onSpinReels={onSpinReels}
        onSpinWheel={onSpinWheel}
        canSpin
        projectorOn={false}
        onProjectorOnChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /spin reels/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /spin reels/i }).className).toContain('classroom-light-ink');
    expect(screen.getByRole('button', { name: /spin wheel/i })).toBeDefined();
    expect(screen.getByRole('switch', { name: /show on projector/i })).toBeDefined();
    const status = screen.getByText((content, element) =>
      element?.tagName === 'P' && (element.textContent || '').replace(/\s+/g, ' ').trim() === '17 Eligible • 1 Entry Each • Deduct: OFF',
    );
    expect(status.className).toContain('whitespace-normal');
    expect(screen.getByRole('radio', { name: 'All Qualified (17)' })).toBeDefined();
    expect(screen.getByRole('radio', { name: 'On-Time Only (14)' })).toBeDefined();
    expect(screen.queryByText('Points per ticket')).toBeNull();
    expect(screen.queryByText('Ada Lovelace')).toBeNull();
    expect(screen.queryByText(/wheel or reels look frozen/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /spin reels/i }));
    expect(onSpinReels).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /advanced pool rules/i }));
    expect(onRulesOpenChange).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole('button', { name: /preview 17 entries/i }));
    expect(onEntriesOpenChange).toHaveBeenCalledWith(true);
  });
});
