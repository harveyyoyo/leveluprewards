import { useCallback, useReducer } from 'react';
import type { StudentTheme } from '@/lib/types';

import { LEVELUP_BRAND_PRIMARY_HEX } from '@/lib/appBranding';
import { DEFAULT_STUDENT_THEME_FONT_SCALE } from '@/lib/types';

function cloneTheme(theme: StudentTheme | undefined): StudentTheme | undefined {
    return theme ? { ...theme } : undefined;
}

function themesEqual(a: StudentTheme | undefined, b: StudentTheme | undefined): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    return JSON.stringify(a) === JSON.stringify(b);
}

export type HistoryState = {
    present: StudentTheme | undefined;
    past: (StudentTheme | undefined)[];
    future: (StudentTheme | undefined)[];
};

export type HistoryAction =
    | { type: 'reset'; theme: StudentTheme | undefined }
    | { type: 'commit'; theme: StudentTheme | undefined }
    | { type: 'commitFrom'; recipe: (current: StudentTheme | undefined) => StudentTheme | undefined }
    | { type: 'patch'; partial: Partial<StudentTheme> }
    | { type: 'undo' }
    | { type: 'redo' };

export function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
    switch (action.type) {
        case 'reset':
            return { present: action.theme, past: [], future: [] };
        case 'commit': {
            if (themesEqual(state.present, action.theme)) return state;
            const past = [...state.past, cloneTheme(state.present)];
            return { present: action.theme, past, future: [] };
        }
        case 'commitFrom': {
            const next = action.recipe(state.present);
            if (themesEqual(state.present, next)) return state;
            const past = [...state.past, cloneTheme(state.present)];
            return { present: next, past, future: [] };
        }
        case 'patch': {
            const base: StudentTheme = state.present || {
                background: '#020617',
                text: '#f8fafc',
                primary: LEVELUP_BRAND_PRIMARY_HEX,
                cardBackground: '#0f172a',
                accent: '#22c55e',
                fontScale: DEFAULT_STUDENT_THEME_FONT_SCALE,
            };
            const next = { ...base, ...action.partial };
            if (themesEqual(state.present, next)) return state;
            return {
                present: next,
                past: [...state.past, cloneTheme(state.present)],
                future: [],
            };
        }
        case 'undo': {
            if (state.past.length === 0) return state;
            const previous = state.past[state.past.length - 1];
            const past = state.past.slice(0, -1);
            const future = [cloneTheme(state.present), ...state.future];
            return { present: cloneTheme(previous), past, future };
        }
        case 'redo': {
            if (state.future.length === 0) return state;
            const next = state.future[0];
            const future = state.future.slice(1);
            const past = [...state.past, cloneTheme(state.present)];
            return { present: cloneTheme(next), past, future };
        }
        default:
            return state;
    }
}

export function useThemeEditorHistory(initial: StudentTheme | undefined) {
    const [state, dispatch] = useReducer(historyReducer, {
        present: initial,
        past: [],
        future: [],
    });

    const reset = useCallback((theme: StudentTheme | undefined) => {
        dispatch({ type: 'reset', theme });
    }, []);

    const commit = useCallback((theme: StudentTheme | undefined) => {
        dispatch({ type: 'commit', theme });
    }, []);

    const commitFrom = useCallback((recipe: (current: StudentTheme | undefined) => StudentTheme | undefined) => {
        dispatch({ type: 'commitFrom', recipe });
    }, []);

    const patch = useCallback((partial: Partial<StudentTheme>) => {
        dispatch({ type: 'patch', partial });
    }, []);

    const undo = useCallback(() => {
        dispatch({ type: 'undo' });
    }, []);

    const redo = useCallback(() => {
        dispatch({ type: 'redo' });
    }, []);

    return {
        present: state.present,
        reset,
        commit,
        commitFrom,
        patch,
        undo,
        redo,
        canUndo: state.past.length > 0,
        canRedo: state.future.length > 0,
    };
}
