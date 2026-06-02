import { describe, expect, it } from 'vitest';
import { staffGreetingName } from '@/lib/utils';

describe('staffGreetingName', () => {
  it('keeps the full display name for titled names', () => {
    expect(staffGreetingName('Mr. Smith')).toBe('Mr. Smith');
    expect(staffGreetingName('Mrs. Jones')).toBe('Mrs. Jones');
    expect(staffGreetingName('Ms Davis')).toBe('Ms Davis');
    expect(staffGreetingName('Dr. Jane Smith')).toBe('Dr. Jane Smith');
  });

  it('keeps the full display name for untitled names', () => {
    expect(staffGreetingName('Sarah Johnson')).toBe('Sarah Johnson');
    expect(staffGreetingName('Coach Wilson')).toBe('Coach Wilson');
  });

  it('trims whitespace', () => {
    expect(staffGreetingName('  John Smith  ')).toBe('John Smith');
  });
});
