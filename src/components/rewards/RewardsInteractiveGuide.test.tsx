import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RewardsInteractiveGuide } from './RewardsInteractiveGuide';

const mockPush = vi.fn();
let mockSchoolId = 'demo-school';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useParams: () => ({
    schoolId: mockSchoolId,
  }),
}));

vi.mock('@/components/AppProvider', () => ({
  useAppContext: () => ({
    schoolId: mockSchoolId,
  }),
}));

vi.mock('@/hooks/useArcadeSound', () => ({
  useArcadeSound: () => vi.fn(),
}));

describe('RewardsInteractiveGuide', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockSchoolId = 'demo-school';
  });

  it('renders the trigger button and opens the guide when clicked', () => {
    render(<RewardsInteractiveGuide />);

    const guideTrigger = screen.getByRole('button', { name: /Rewards Guide/i });
    expect(guideTrigger).toBeDefined();

    fireEvent.click(guideTrigger);

    expect(screen.getByText('LevelUp Rewards Guide')).toBeDefined();
    expect(screen.getByText('School Admin Setup')).toBeDefined();
    expect(screen.getByText('Teacher Tools & Point Desk')).toBeDefined();
    expect(screen.getByText('Student Self-Service Kiosk')).toBeDefined();
    expect(screen.getByText('School Store & Prizes')).toBeDefined();
  });

  it('filters topics by search query', () => {
    render(<RewardsInteractiveGuide open={true} onOpenChange={() => {}} />);

    const searchInput = screen.getByPlaceholderText(/Search topics/i);
    fireEvent.change(searchInput, { target: { value: 'kiosk' } });

    expect(screen.getByText('Student Self-Service Kiosk')).toBeDefined();
    expect(screen.queryByText('School Admin Setup')).toBeNull();
  });

  it('filters topics by category chips', () => {
    render(<RewardsInteractiveGuide open={true} onOpenChange={() => {}} />);

    const spiritChip = screen.getByRole('button', { name: /School Spirit & TVs/i });
    fireEvent.click(spiritChip);

    expect(screen.getByText('School Houses & Teams')).toBeDefined();
    expect(screen.getByText('Hall of Fame & Leaderboards')).toBeDefined();
    expect(screen.getByText('Hallway TVs & Big Screens')).toBeDefined();
    expect(screen.queryByText('School Admin Setup')).toBeNull();
  });

  it('navigates to target route and closes guide when an action button is clicked', () => {
    const mockOnOpenChange = vi.fn();
    render(<RewardsInteractiveGuide open={true} onOpenChange={mockOnOpenChange} />);

    const teacherButton = screen.getByRole('button', { name: /Open Teacher Tools/i });
    fireEvent.click(teacherButton);

    expect(mockPush).toHaveBeenCalledWith('/demo-school/teacher');
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('opens when the custom window event "open-rewards-guide" is fired', () => {
    render(<RewardsInteractiveGuide />);

    expect(screen.queryByText('LevelUp Rewards Guide')).toBeNull();

    fireEvent(window, new CustomEvent('open-rewards-guide'));

    expect(screen.getByText('LevelUp Rewards Guide')).toBeDefined();
  });
});
