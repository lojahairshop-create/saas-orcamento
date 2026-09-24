import { create } from 'zustand';
import { PartConfig, SheetConfig } from '../types/nesting';

interface HistoryState {
  parts: PartConfig[];
  sheet: SheetConfig;
}

interface NestingState {
  parts: PartConfig[];
  sheet: SheetConfig;
  gridSize: number;
  showGrid: boolean;
  snapEnabled: boolean;
  debugMode: boolean;
  
  // New features:
  clipboard: PartConfig[];
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  past: HistoryState[];
  future: HistoryState[];
  
  // Actions
  addPart: (part: PartConfig) => void;
  updatePart: (id: string, updates: Partial<PartConfig>) => void;
  removePart: (id: string) => void;
  setSheet: (sheet: Partial<SheetConfig>) => void;
  selectParts: (ids: string[], multi: boolean) => void;
  clearSelection: () => void;
  setGridSize: (size: number) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  toggleDebug: () => void;

  // New actions
  setClipboard: (parts: PartConfig[]) => void;
  setAutoSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
  saveHistory: () => void;
  undo: () => void;
  redo: () => void;
  setParts: (parts: PartConfig[]) => void;
}

const MAX_HISTORY = 100;

export const useNestingStore = create<NestingState>((set, get) => ({
  parts: [],
  sheet: {
    width: 3000,
    height: 1500,
    thickness: 1.5,
    kerf: 0.1,
    material: 'Aço Carbono',
    utilization: 0,
  },
  gridSize: 10,
  showGrid: true,
  snapEnabled: true,
  debugMode: false,

  clipboard: [],
  autoSaveStatus: 'idle',
  past: [],
  future: [],

  saveHistory: () => set((state) => {
    const currentState = { parts: state.parts, sheet: state.sheet };
    const newPast = [...state.past, currentState].slice(-MAX_HISTORY);
    return { past: newPast, future: [] };
  }),

  undo: () => set((state) => {
    if (state.past.length === 0) return state;
    const previous = state.past[state.past.length - 1];
    const newPast = state.past.slice(0, state.past.length - 1);
    return {
      past: newPast,
      future: [{ parts: state.parts, sheet: state.sheet }, ...state.future],
      parts: previous.parts,
      sheet: previous.sheet,
    };
  }),

  redo: () => set((state) => {
    if (state.future.length === 0) return state;
    const next = state.future[0];
    const newFuture = state.future.slice(1);
    return {
      past: [...state.past, { parts: state.parts, sheet: state.sheet }],
      future: newFuture,
      parts: next.parts,
      sheet: next.sheet,
    };
  }),

  addPart: (part) => set((state) => {
    get().saveHistory();
    return { parts: [...state.parts, part] };
  }),
  
  updatePart: (id, updates) => set((state) => {
    // Only save history if actually modifying layout properties, otherwise it's just selection/etc.
    // For simplicity, we save history on every update that's not just selection.
    const isOnlySelection = Object.keys(updates).length === 1 && 'selected' in updates;
    if (!isOnlySelection) get().saveHistory();

    return {
      parts: state.parts.map(p => p.id === id ? { ...p, ...updates } : p)
    };
  }),
  
  removePart: (id) => set((state) => {
    get().saveHistory();
    return {
      parts: state.parts.filter(p => p.id !== id),
    };
  }),

  setParts: (parts) => set((state) => {
    get().saveHistory();
    return { parts };
  }),

  setSheet: (sheetUpdates) => set((state) => {
    get().saveHistory();
    return {
      sheet: { ...state.sheet, ...sheetUpdates }
    };
  }),

  selectParts: (ids, multi) => set((state) => {
    if (multi) {
      return {
        parts: state.parts.map(p => ({
          ...p,
          selected: ids.includes(p.id) ? true : p.selected
        }))
      };
    } else {
      return {
        parts: state.parts.map(p => ({
          ...p,
          selected: ids.includes(p.id)
        }))
      };
    }
  }),

  clearSelection: () => set((state) => ({
    parts: state.parts.map(p => ({ ...p, selected: false }))
  })),

  setGridSize: (size) => set({ gridSize: size }),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  toggleSnap: () => set((state) => ({ snapEnabled: !state.snapEnabled })),
  toggleDebug: () => set((state) => ({ debugMode: !state.debugMode })),

  setClipboard: (parts) => set({ clipboard: parts }),
  setAutoSaveStatus: (status) => set({ autoSaveStatus: status }),
}));
