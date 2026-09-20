import { describe, it, expect } from 'vitest';
import { historyReducer, type HistoryState } from './useThemeEditorHistory';
import type { StudentTheme } from '@/lib/types';

const mockThemeA: StudentTheme = {
    background: '#112233',
    text: '#ffffff',
    primary: '#336699',
    cardBackground: '#223344',
    accent: '#44aa88',
    fontScale: 1.1,
};

const mockThemeB: StudentTheme = {
    background: '#000000',
    text: '#ffffff',
    primary: '#ff0000',
    cardBackground: '#111111',
    accent: '#00ff00',
    fontScale: 1.25,
};

describe('useThemeEditorHistory reducer', () => {
    it('initializes with present theme and empty past/future', () => {
        const state: HistoryState = { present: mockThemeA, past: [], future: [] };
        expect(state.present).toEqual(mockThemeA);
        expect(state.past).toHaveLength(0);
        expect(state.future).toHaveLength(0);
    });

    it('records previous theme in past on commit', () => {
        const state: HistoryState = { present: mockThemeA, past: [], future: [] };
        const next = historyReducer(state, { type: 'commit', theme: mockThemeB });

        expect(next.present).toEqual(mockThemeB);
        expect(next.past).toHaveLength(1);
        expect(next.past[0]).toEqual(mockThemeA);
        expect(next.future).toHaveLength(0);
    });

    it('ignores commit if theme is identical', () => {
        const state: HistoryState = { present: mockThemeA, past: [], future: [] };
        const next = historyReducer(state, { type: 'commit', theme: { ...mockThemeA } });
        expect(next).toBe(state);
    });

    it('records previous state in past when generating from undefined initial', () => {
        const state: HistoryState = { present: undefined, past: [], future: [] };
        const next = historyReducer(state, { type: 'commit', theme: mockThemeA });

        expect(next.present).toEqual(mockThemeA);
        expect(next.past).toHaveLength(1);
        expect(next.past[0]).toBeUndefined();

        // Undo should restore undefined
        const undone = historyReducer(next, { type: 'undo' });
        expect(undone.present).toBeUndefined();
        expect(undone.past).toHaveLength(0);
        expect(undone.future).toEqual([mockThemeA]);

        // Redo should restore mockThemeA
        const redone = historyReducer(undone, { type: 'redo' });
        expect(redone.present).toEqual(mockThemeA);
        expect(redone.past).toEqual([undefined]);
        expect(redone.future).toHaveLength(0);
    });

    it('patches fields and allows undoing back to previous value', () => {
        const state: HistoryState = { present: mockThemeA, past: [], future: [] };
        const patched = historyReducer(state, { type: 'patch', partial: { fontScale: 1.3 } });

        expect(patched.present?.fontScale).toBe(1.3);
        expect(patched.past).toHaveLength(1);
        expect(patched.past[0]?.fontScale).toBe(1.1);

        const undone = historyReducer(patched, { type: 'undo' });
        expect(undone.present?.fontScale).toBe(1.1);
        expect(undone.future).toHaveLength(1);
        expect(undone.future[0]?.fontScale).toBe(1.3);

        const redone = historyReducer(undone, { type: 'redo' });
        expect(redone.present?.fontScale).toBe(1.3);
    });

    it('does nothing on undo/redo when history is empty', () => {
        const state: HistoryState = { present: mockThemeA, past: [], future: [] };
        const undone = historyReducer(state, { type: 'undo' });
        expect(undone).toEqual(state);

        const redone = historyReducer(state, { type: 'redo' });
        expect(redone).toEqual(state);
    });
});
