import { useCallback, useReducer } from 'react';
import type { StudentTheme } from '@/lib/types';

function cloneTheme(theme: StudentTheme): StudentTheme {
    return { ...theme };
}

function themesEqual(a: StudentTheme | undefined, b: StudentTheme | undefined): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    return JSON.stringify(a) === JSON.stringify(b);
}

type HistoryState = {
    present: StudentTheme | undefined;
    past: StudentTheme[];
    future: StudentTheme[];
};

type HistoryAction =
    | { type: 'reset'; theme: StudentTheme | undefined }
    | { type: 'commit'; theme: StudentTheme | undefined }
    | { type: 'commitFrom'; recipe: (current: StudentTheme | undefined) => StudentTheme | undefined }
    | { type: 'patch'; partial: Partial<StudentTheme> }
    | { type: 'undo' }
    | { type: 'redo' };

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
    switch (action.type) {
        case 'reset':
            return { present: action.theme, past: [], future: [] };
        case 'commit': {
            if (themesEqual(state.present, action.theme)) return state;
            const past = state.present ? [...state.past, cloneTheme(state.present)] : state.past;
            return { present: action.theme, past, future: [] };
        }
        case 'commitFrom': {
            const next = action.recipe(state.present);
            if (themesEqual(state.present, next)) return state;
            const past = state.present ? [...state.past, cloneTheme(state.present)] : state.past;
            return { present: next, past, future: [] };
        }
        case 'patch': {
            if (!state.present) return state;
            const next = { ...state.present, ...action.partial };
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
            const future = state.present ? [cloneTheme(state.present), ...state.future] : state.future;
            return { present: cloneTheme(previous), past, future };
        }
        case 'redo': {
            if (state.future.length === 0) return state;
            const next = state.future[0];
            const future = state.future.slice(1);
            const past = state.present ? [...state.past, cloneTheme(state.present)] : state.past;
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
