import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IntroWizard } from './IntroWizard';

const mockUpdateSettings = vi.fn();
let mockActiveTourId: string | null = 'welcome';
let mockPathname: string = '/portal';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
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
    mockPathname = '/portal';
    mockUpdateSettings.mockClear();
    window.localStorage.clear();
  });

  it('steps through the quick tour and shows "See Advanced Features ✨" on the last step', () => {
    render(<IntroWizard />);

    // Step 1
    expect(screen.getAllByText(/Welcome to LevelUp/i).length).toBeGreaterThan(0);
    const startButton = screen.getByRole('button', { name: /start walkthrough/i });
    fireEvent.click(startButton);

    const clickNext = () => {
      const nextButtons = screen.getAllByRole('button', { name: /next/i });
      fireEvent.click(nextButtons[nextButtons.length - 1]);
    };

    // Step 2
    expect(screen.getAllByText(/Your Main Dashboard/i).length).toBeGreaterThan(0);
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
  }, 15000);

  it('steps through all advanced features steps without blocking navigation', () => {
    mockActiveTourId = 'features';
    render(<IntroWizard />);

    // Step 1: Intro
    expect(screen.getAllByText(/Advanced Features Tour/i).length).toBeGreaterThan(0);
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
  }, 15000);

  it('steps through the library quick tour and transitions to advanced library tools', () => {
    mockActiveTourId = 'library';
    mockPathname = '/library';
    render(<IntroWizard />);

    // Step 1: Library Welcome
    expect(screen.getAllByText(/Welcome to Your Library/i).length).toBeGreaterThan(0);
    const startButton = screen.getByRole('button', { name: /start walkthrough/i });
    fireEvent.click(startButton);

    const clickNext = () => {
      const nextButtons = screen.getAllByRole('button', { name: /next/i });
      fireEvent.click(nextButtons[nextButtons.length - 1]);
    };

    // Step 2: Librarian Desk
    expect(screen.getAllByText(/Librarian Desk/i).length).toBeGreaterThan(0);
    clickNext();

    // Step 3: Book Catalog
    expect(screen.getAllByText(/Book Catalog/i).length).toBeGreaterThan(0);
    clickNext();

    // Step 4: Student Kiosk
    expect(screen.getAllByText(/Student Kiosk/i).length).toBeGreaterThan(0);
    clickNext();

    // Step 5: Quick Tour Complete!
    expect(screen.getAllByText(/Quick Tour Complete!/i).length).toBeGreaterThan(0);

    // Verify "See Advanced Library Tools ✨" button is offered
    const advancedBtn = screen.getByRole('button', { name: /See Advanced Library Tools/i });
    expect(advancedBtn).toBeInTheDocument();

    // Clicking it triggers transition
    fireEvent.click(advancedBtn);
    expect(mockUpdateSettings).toHaveBeenCalledWith({ activeTourId: null });
  }, 15000);

  it('steps through all advanced library features steps cleanly', () => {
    mockActiveTourId = 'library-features';
    mockPathname = '/library';
    render(<IntroWizard />);

    // Step 1: Intro
    expect(screen.getAllByText(/Advanced Library Tools/i).length).toBeGreaterThan(0);
    const startButton = screen.getByRole('button', { name: /start walkthrough/i });
    fireEvent.click(startButton);

    const clickNext = () => {
      const nextButtons = screen.getAllByRole('button', { name: /next/i });
      fireEvent.click(nextButtons[nextButtons.length - 1]);
    };

    // Step 2: Intake
    expect(screen.getAllByText(/Camera & Barcode Book Lookup/i).length).toBeGreaterThan(0);
    clickNext();

    // Step 3: Labels
    expect(screen.getAllByText(/Printable Spine Labels & Stickers/i).length).toBeGreaterThan(0);
    clickNext();

    // Step 4: Reading Levels
    expect(screen.getAllByText(/Reading Levels & Genres/i).length).toBeGreaterThan(0);
    clickNext();

    // Step 5: Book Suggestions & Quiz
    expect(screen.getAllByText(/Smart Book Suggestions & Quiz/i).length).toBeGreaterThan(0);
    clickNext();

    // Step 6: Policy
    expect(screen.getAllByText(/Borrowing Limits & Due Dates/i).length).toBeGreaterThan(0);
    clickNext();

    // Step 7: Self-Checkout
    expect(screen.getAllByText(/Student Self-Checkout Station/i).length).toBeGreaterThan(0);
    clickNext();

    // Step 8: Audit
    expect(screen.getAllByText(/Quick Shelf Inventory Audits/i).length).toBeGreaterThan(0);
    clickNext();

    // Step 9: Finish
    expect(screen.getAllByText(/Your Library is Ready!/i).length).toBeGreaterThan(0);
    const finishButtons = screen.getAllByRole('button', { name: /finish/i });
    expect(finishButtons.length).toBeGreaterThan(0);
    fireEvent.click(finishButtons[finishButtons.length - 1]);
    expect(mockUpdateSettings).toHaveBeenCalledWith({ activeTourId: null });
  }, 15000);

  it('allows jumping directly to any step using the dropdown selector or step dots', () => {
    mockActiveTourId = 'library-features';
    mockPathname = '/library';
    render(<IntroWizard />);

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select).toBeInTheDocument();

    // Jump directly to step 4 (index 4 is step 5: Smart Book Suggestions & Quiz)
    fireEvent.change(select, { target: { value: '4' } });
    expect(screen.getAllByText(/Smart Book Suggestions & Quiz/i).length).toBeGreaterThan(0);

    // Jump directly via step dot to step 2: Camera & Barcode Book Lookup
    const step2Dots = screen.getAllByTitle(/Go to step 2:/i);
    fireEvent.click(step2Dots[step2Dots.length - 1]);
    expect(screen.getAllByText(/Camera & Barcode Book Lookup/i).length).toBeGreaterThan(0);
  });

  it('minimizes into floating pill and expands back', () => {
    mockActiveTourId = 'welcome';
    mockPathname = '/portal';
    render(<IntroWizard />);

    const minimizeBtn = screen.getByTitle(/Minimize tour/i);
    fireEvent.click(minimizeBtn);

    // Floating resume pill appears
    const resumeBtn = screen.getByRole('button', { name: /Resume Tour/i });
    expect(resumeBtn).toBeInTheDocument();

    // Clicking resume expands the card back
    fireEvent.click(resumeBtn);
    expect(screen.getByTitle(/Minimize tour/i)).toBeInTheDocument();
  });
});
