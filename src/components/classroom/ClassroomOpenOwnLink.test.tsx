import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClassroomOpenOwnLink } from './ClassroomOpenOwnLink';

describe('ClassroomOpenOwnLink', () => {
  it('links to the standalone Classroom page in a new tab', () => {
    render(<ClassroomOpenOwnLink schoolId="schoolabc" />);

    const link = screen.getByRole('link', { name: /open classroom/i });
    expect(link.getAttribute('href')).toContain('/schoolabc/classroom-realm');
    expect(link.getAttribute('target')).toBe('_blank');
  });
});
