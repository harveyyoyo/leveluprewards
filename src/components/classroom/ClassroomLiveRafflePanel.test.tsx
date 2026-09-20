import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClassroomLiveRafflePanel } from './ClassroomLiveRafflePanel';

vi.mock('@/app/[schoolId]/admin/sections/AdminRaffleTab', () => ({
  AdminRaffleTab: () => (
    <div>
      <button type="button">Spin Reels</button>
      <button type="button">Spin Wheel</button>
    </div>
  ),
}));

describe('ClassroomLiveRafflePanel', () => {
  it('opens a high-energy raffle drawer with Rules and help, not a frozen-wheel banner', () => {
    render(
      <ClassroomLiveRafflePanel
        open
        onClose={vi.fn()}
        schoolId="schoolabc"
        students={[]}
        classes={[]}
        canEditSettings
      />,
    );

    expect(screen.getByText(/classroom raffle/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /rules/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /animation help/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /spin reels/i })).toBeDefined();
    expect(screen.queryByText(/wheel or reels look frozen/i)).toBeNull();
  });
});
