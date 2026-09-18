import { describe, expect, it } from 'vitest';
import { shouldHideEmptyDeskSlot } from './classroomEmptyDeskVisibility';

describe('shouldHideEmptyDeskSlot', () => {
  it('hides empty seats while teaching', () => {
    expect(shouldHideEmptyDeskSlot({ hasStudent: false, editMode: false })).toBe(true);
  });

  it('shows empty seats in arrange mode for drag targets', () => {
    expect(shouldHideEmptyDeskSlot({ hasStudent: false, editMode: true })).toBe(false);
  });

  it('always shows occupied desks', () => {
    expect(shouldHideEmptyDeskSlot({ hasStudent: true, editMode: false })).toBe(false);
    expect(shouldHideEmptyDeskSlot({ hasStudent: true, editMode: true })).toBe(false);
  });

  it('hides empty seats on the class screen', () => {
    expect(
      shouldHideEmptyDeskSlot({ hasStudent: false, editMode: false, hideEmptyDesks: true }),
    ).toBe(true);
  });
});
