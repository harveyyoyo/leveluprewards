import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DisplayTvPairModal } from './DisplayTvPairModal';

describe('DisplayTvPairModal', () => {
  it('renders correctly when open with the screen name and pair guides', () => {
    render(
      <DisplayTvPairModal
        isOpen={true}
        onClose={vi.fn()}
        schoolId="demo-school"
        screenId="hall-of-fame"
        screenName="Hall of Fame"
      />,
    );

    expect(screen.getByText('Show on Hallway TV')).toBeDefined();
    expect(screen.getByText(/Pair "Hall of Fame" to any TV/)).toBeDefined();
    expect(screen.getByText('Amazon Fire TV')).toBeDefined();
    expect(screen.getByText('Google TV / Chromecast')).toBeDefined();
    expect(screen.getByText('Apple TV / AirPlay')).toBeDefined();
    expect(screen.getByText('Smart TV Browser')).toBeDefined();
  });

  it('does not render content when closed', () => {
    const { container } = render(
      <DisplayTvPairModal
        isOpen={false}
        onClose={vi.fn()}
        schoolId="demo-school"
        screenId="hall-of-fame"
        screenName="Hall of Fame"
      />,
    );

    expect(screen.queryByText('Show on Hallway TV')).toBeNull();
  });
});
