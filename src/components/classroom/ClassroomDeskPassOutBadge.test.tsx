import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClassroomDeskPassOutBadge } from './ClassroomDeskPassOutBadge';

describe('ClassroomDeskPassOutBadge', () => {
  it('marks the desk Pass Out when a student is in the hall', () => {
    render(
      <div className="relative">
        <ClassroomDeskPassOutBadge visible passLabel="Bathroom" />
      </div>,
    );
    expect(screen.getByText('Pass Out')).toBeDefined();
    expect(screen.getByText('Pass Out').parentElement?.className).toContain('bg-amber-500');
    expect(screen.getByTitle(/bathroom pass/i)).toBeDefined();
  });

  it('stays off the desk when nobody is out', () => {
    render(
      <div className="relative">
        <ClassroomDeskPassOutBadge visible={false} />
      </div>,
    );
    expect(screen.queryByText('Pass Out')).toBeNull();
  });
});
