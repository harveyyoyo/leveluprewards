import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  ClassroomAwardGivenNotice,
  classroomAwardGivenMessage,
} from './ClassroomAwardGivenNotice';

describe('ClassroomAwardGivenNotice', () => {
  it('says who got the award and how many points', () => {
    expect(classroomAwardGivenMessage('Luke', 10, 'Great effort')).toBe(
      'You awarded Luke +10 · Great effort',
    );

    render(
      <ClassroomAwardGivenNotice
        visible
        studentLabel="Luke"
        points={10}
        awardLabel="Great effort"
      />,
    );

    expect(screen.getByRole('status').textContent).toMatch(/points awarded/i);
    expect(screen.getByText(/you awarded luke \+10/i)).toBeDefined();
  });
});
