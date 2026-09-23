import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { GoalsOptionsPanel } from './GoalsOptionsPanel';
import { GOALS_OPTION_FIELDS, DEFAULT_GOALS_OPTIONS } from '@/lib/goals/goalsOptions';

afterEach(cleanup);

it('retains every setting and changes only the selected option', () => {
  const onChange = vi.fn();
  render(<GoalsOptionsPanel value={{ ...DEFAULT_GOALS_OPTIONS, classPartyMode: false }} onChange={onChange} />);
  expect(screen.getAllByRole('switch')).toHaveLength(8);
  for (const field of GOALS_OPTION_FIELDS) expect(screen.getByRole('switch', { name: field.label })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('switch', { name: 'Cheer when a goal finishes' }));
  expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_GOALS_OPTIONS, classPartyMode: false, celebrateOnAward: false });
});
