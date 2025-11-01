import { create } from 'zustand';

const createId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

const initialState = {
  start: null,
  end: null,
  checkpoints: [],
  selectedId: null,
  connectVia: 'direct',
  placementMode: null
};

const setSelectedId = (state, fallbackId) => ({
  ...state,
  selectedId: fallbackId ?? state.selectedId
});

export const useCheckpointsStore = create((set, get) => ({
  ...initialState,
  setPlacementMode: (mode) => set({ placementMode: mode }),
  toggleConnectMode: () =>
    set((state) => ({
      connectVia: state.connectVia === 'direct' ? 'route' : 'direct'
    })),
  setStart: (position) =>
    set((state) => ({
      start: { id: 'start', position },
      placementMode: null,
      selectedId: 'start',
      checkpoints: state.checkpoints
    })),
  setEnd: (position) =>
    set((state) => ({
      end: { id: 'end', position },
      placementMode: null,
      selectedId: 'end',
      checkpoints: state.checkpoints
    })),
  addCheckpoint: (position) =>
    set((state) => ({
      checkpoints: [
        ...state.checkpoints,
        {
          id: createId('checkpoint'),
          position
        }
      ],
      placementMode: null
    })),
  selectCheckpoint: (id) => set({ selectedId: id }),
  updateCheckpoint: (id, position) =>
    set((state) => ({
      checkpoints: state.checkpoints.map((checkpoint) =>
        checkpoint.id === id ? { ...checkpoint, position } : checkpoint
      )
    })),
  removeCheckpoint: (id) =>
    set((state) => {
      const checkpoints = state.checkpoints.filter((checkpoint) => checkpoint.id !== id);
      const selectedId = state.selectedId === id ? null : state.selectedId;
      return {
        checkpoints,
        selectedId
      };
    }),
  clearAll: () => set(initialState)
}));

export const useCheckpoints = () => useCheckpointsStore((state) => state);
