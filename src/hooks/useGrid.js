import { create } from 'zustand';

const clampPrecision = (precision) => (precision === 4 ? 4 : 3);

const initialState = {
  origin: null,
  originReference: null,
  precision: 3
};

export const useGridStore = create((set) => ({
  ...initialState,
  setPrecision: (precision) =>
    set((state) => {
      const resolved = clampPrecision(precision);
      return {
        precision: resolved,
      originReference: state.originReference
        ? { ...state.originReference, precision: resolved }
        : null
      };
    }),
  setOrigin: (origin) => set({ origin }),
  setOriginReference: (originReference) =>
    set((state) => ({
      originReference: originReference
        ? {
            ...originReference,
            precision: clampPrecision(originReference.precision ?? state.precision)
          }
        : null
    })),
  resetGrid: () => set(initialState)
}));

export const useGrid = () =>
  useGridStore((state) => ({
    origin: state.origin,
    originReference: state.originReference,
    precision: state.precision,
    setOrigin: state.setOrigin,
    setOriginReference: state.setOriginReference,
    setPrecision: state.setPrecision,
    resetGrid: state.resetGrid
  }));
