import { create } from "zustand";

export interface UndoableAction {
  type: string;
  description: string;
  execute: () => Promise<void>;
  undo: () => Promise<void>;
}

const MAX_HISTORY = 50;

interface UndoState {
  history: UndoableAction[];
  redoStack: UndoableAction[];
  push: (action: UndoableAction) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  clear: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useUndoStore = create<UndoState>((set, get) => ({
  history: [],
  redoStack: [],

  push: (action) => set((state) => ({
    history: [...state.history.slice(-MAX_HISTORY + 1), action],
    redoStack: [], // 새 액션 시 redo 스택 초기화
  })),

  undo: async () => {
    const { history } = get();
    if (history.length === 0) return;
    const action = history[history.length - 1];
    try {
      await action.undo();
      set((state) => ({
        history: state.history.slice(0, -1),
        redoStack: [...state.redoStack, action],
      }));
    } catch {}
  },

  redo: async () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return;
    const action = redoStack[redoStack.length - 1];
    try {
      await action.execute();
      set((state) => ({
        redoStack: state.redoStack.slice(0, -1),
        history: [...state.history, action],
      }));
    } catch {}
  },

  clear: () => set({ history: [], redoStack: [] }),
  canUndo: () => get().history.length > 0,
  canRedo: () => get().redoStack.length > 0,
}));

/** 액션을 실행하고 undo 스택에 추가 */
export async function executeUndoable(action: UndoableAction) {
  await action.execute();
  useUndoStore.getState().push(action);
}
