import { afterEach, describe, expect, it } from 'vitest';
import {
  CLASSROOM_LIVE_CHEATSHEET_KEY,
  loadClassroomLiveCheatsheetShown,
  saveClassroomLiveCheatsheetShown,
} from './classroomLiveCheatsheet';

describe('classroomLiveCheatsheet', () => {
  afterEach(() => {
    window.localStorage.removeItem(CLASSROOM_LIVE_CHEATSHEET_KEY);
  });

  it('stays hidden until the teacher turns it on, then remembers that choice', () => {
    expect(loadClassroomLiveCheatsheetShown()).toBe(false);
    saveClassroomLiveCheatsheetShown(true);
    expect(loadClassroomLiveCheatsheetShown()).toBe(true);
    saveClassroomLiveCheatsheetShown(false);
    expect(loadClassroomLiveCheatsheetShown()).toBe(false);
  });
});
