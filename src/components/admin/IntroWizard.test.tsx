import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IntroWizard } from './IntroWizard';

const mockUpdateSettings = vi.fn();
let mockActiveTourId: string | null = 'welcome';

vi.mock('next/navigation', () => ({
  usePathname: () => '/portal',
}));

vi.mock('@/components/providers/SettingsProvider', () => ({
  useSettings: () => ({
    settings: {
      activeTourId: mockActiveTourId,
    },
    updateSettings: mockUpdateSettings,
  }),
}));

describe('IntroWizard Quick Tour & Advanced Transition', () => {
  beforeEach(() => {
    mockActiveTourId = 'welcome';
    mockUpdateSettings.mockClear();
    window.localStorage.clear();
  });

  it('steps through the quick tour and shows "See Advanced Features ✨" on the last step', () => {
    render(<IntroWizard />);

    // Step 1
    expect(screen.getByText(/Welcome to LevelUp/i)).toBeInTheDocument();
    const startButton = screen.getByRole('button', { name: /start walkthrough/i });
    fireEvent.click(startButton);

    const clickNext = () => {
      const nextButtons = screen.getAllByRole('button', { name: /next/i });
      fireEvent.click(nextButtons[nextButtons.length - 1]);
    };

    // Step 2
    expect(screen.getByText(/Your Main Dashboard/i)).toBeInTheDocument();
    clickNext();

    // Step 3
    expect(screen.getAllByText(/Admin Setup/i).length).toBeGreaterThan(0);
    clickNext();

    // Step 4
    expect(screen.getAllByText(/Teacher Tools/i).length).toBeGreaterThan(0);
    clickNext();

    // Step 5
    expect(screen.getAllByText(/Student Kiosk/i).length).toBeGreaterThan(0);
    clickNext();

    // Step 6: Quick Tour Complete!
    expect(screen.getAllByText(/Quick Tour Complete!/i).length).toBeGreaterThan(0);

    // Verify both "Finish" and "See Advanced Features ✨" buttons are present
    const finishButtons = screen.getAllByRole('button', { name: /finish/i });
    expect(finishButtons.length).toBeGreaterThan(0);

    const advancedButtons = screen.getAllByRole('button', { name: /See Advanced Features/i });
    expect(advancedButtons.length).toBeGreaterThan(0);

    // Clicking "See Advanced Features ✨" calls updateSettings to transition to 'features'
    fireEvent.click(advancedButtons[advancedButtons.length - 1]);
    expect(mockUpdateSettings).toHaveBeenCalledWith({ activeTourId: null });
  });

  it('steps through all advanced features steps without blocking navigation', () => {
    mockActiveTourId = 'features';
    render(<IntroWizard />);

    // Step 1: Intro
    expect(screen.getByText(/Advanced Features Tour/i)).toBeInTheDocument();
    const startButton = screen.getByRole('button', { name: /start walkthrough/i });
    fireEvent.click(startButton);

    const clickNext = () => {
      const nextButtons = screen.getAllByRole('button', { name: /next/i });
      fireEvent.click(nextButtons[nextButtons.length - 1]);
    };

    // Step 2: Houses
    expect(screen.getAllByText(/School Houses & Teams/i).length).toBeGreaterThan(0);
    clickNext();

    // Step 3: Goals
    expect(screen.getAllByText(/Savings Goals & Wishlists/i).length).toBeGreaterThan(0);
    clickNext();

    // Step 4: Library
    expect(screen.getAllByText(/School Library & Book Lending/i).length).toBeGreaterThan(0);
    clickNext();

    // Step 5: Displays
    expect(screen.getAllByText(/Hallway TVs & Big Screens/i).length).toBeGreaterThan(0);
    clickNext();

    // Step 6: Home Portal
    expect(screen.getAllByText(/Home Access for Families/i).length).toBeGreaterThan(0);
    clickNext();

    // Step 7: Classroom
    expect(screen.getAllByText(/Classroom Seating & Quick Praise/i).length).toBeGreaterThan(0);
    clickNext();

    // Step 8: Badges
    expect(screen.getAllByText(/Custom Student Badges & Cards/i).length).toBeGreaterThan(0);
    clickNext();

    // Step 9: Finish
    expect(screen.getAllByText(/You're Ready to Roll!/i).length).toBeGreaterThan(0);
    const finishButtons = screen.getAllByRole('button', { name: /finish/i });
    expect(finishButtons.length).toBeGreaterThan(0);
    fireEvent.click(finishButtons[finishButtons.length - 1]);
    expect(mockUpdateSettings).toHaveBeenCalledWith({ activeTourId: null });
  });
});
