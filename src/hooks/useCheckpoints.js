import { create } from 'zustand';
import { normaliseRouteShareSnapshot, ROUTE_SHARE_VERSION } from '../utils/routeUtils.js';

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

const normalizePlacementMode = (mode) => {
  if (mode == null) return null;
  if (typeof mode === 'string') {
    return { type: mode };
  }
  if (typeof mode === 'object' && typeof mode.type === 'string') {
    return mode;
  }
  return null;
};

export const useCheckpointsStore = create((set, get) => ({
  ...initialState,
  setPlacementMode: (mode) =>
    set((state) => {
      const normalized = normalizePlacementMode(mode);
      if (!normalized) {
        return { placementMode: null };
      }

      const current = normalizePlacementMode(state.placementMode);
      if (
        current?.type === normalized.type &&
        (current?.insertIndex ?? null) === (normalized?.insertIndex ?? null)
      ) {
        return { placementMode: null };
      }

      return { placementMode: normalized };
    }),
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
  addCheckpoint: (position, insertIndex) =>
    set((state) => {
      const newCheckpoint = {
        id: createId('checkpoint'),
        position
      };
      const checkpoints = Array.isArray(state.checkpoints) ? [...state.checkpoints] : [];
      if (typeof insertIndex === 'number' && insertIndex >= 0 && insertIndex <= checkpoints.length) {
        checkpoints.splice(insertIndex, 0, newCheckpoint);
      } else {
        checkpoints.push(newCheckpoint);
      }
      return {
        checkpoints,
        placementMode: null,
        selectedId: newCheckpoint.id
      };
    }),
  selectCheckpoint: (id) => set({ selectedId: id }),
  updateCheckpoint: (id, position) =>
    set((state) => ({
      checkpoints: state.checkpoints.map((checkpoint) =>
        checkpoint.id === id ? { ...checkpoint, position } : checkpoint
      )
    })),
  moveCheckpoint: (id, targetIndex) =>
    set((state) => {
      const checkpoints = Array.isArray(state.checkpoints) ? [...state.checkpoints] : [];
      const currentIndex = checkpoints.findIndex((checkpoint) => checkpoint.id === id);
      if (currentIndex === -1 || typeof targetIndex !== 'number') {
        return state;
      }
      if (targetIndex < 0 || targetIndex >= checkpoints.length || targetIndex === currentIndex) {
        return state;
      }
      const [checkpoint] = checkpoints.splice(currentIndex, 1);
      checkpoints.splice(targetIndex, 0, checkpoint);
      return {
        checkpoints
      };
    }),
  removeCheckpoint: (id) =>
    set((state) => {
      const checkpoints = state.checkpoints.filter((checkpoint) => checkpoint.id !== id);
      const selectedId = state.selectedId === id ? null : state.selectedId;
      return {
        checkpoints,
        selectedId,
        placementMode: null
      };
    }),
  loadRouteSnapshot: (snapshot) =>
    set((state) => {
      const normalised = normaliseRouteShareSnapshot({
        version: snapshot?.version ?? ROUTE_SHARE_VERSION,
        connectVia: snapshot?.connectVia,
        start: snapshot?.start,
        end: snapshot?.end,
        checkpoints: snapshot?.checkpoints
      });

      if (!normalised) {
        return state;
      }

      const startNode = normalised.start ? { id: 'start', position: normalised.start } : null;
      const endNode = normalised.end ? { id: 'end', position: normalised.end } : null;
      const checkpointNodes = normalised.checkpoints.map((position) => ({
        id: createId('checkpoint'),
        position
      }));

      let selectedId = null;
      if (startNode) {
        selectedId = 'start';
      } else if (checkpointNodes.length > 0) {
        selectedId = checkpointNodes[0].id;
      } else if (endNode) {
        selectedId = 'end';
      }

      return {
        ...initialState,
        connectVia: normalised.connectVia,
        start: startNode,
        end: endNode,
        checkpoints: checkpointNodes,
        selectedId,
        placementMode: null
      };
    }),
  clearAll: () => set(initialState),
  swapCheckpoints: (id1, id2) =>
    set((state) => {
      // Helper to get item and type
      const getItem = (id) => {
        if (id === 'start') return { type: 'start', item: state.start };
        if (id === 'end') return { type: 'end', item: state.end };
        const idx = state.checkpoints.findIndex((c) => c.id === id);
        if (idx !== -1) return { type: 'checkpoint', index: idx, item: state.checkpoints[idx] };
        return null;
      };

      const obj1 = getItem(id1);
      const obj2 = getItem(id2);

      if (!obj1 || !obj2 || !obj1.item || !obj2.item) return state;

      // We only swap positions
      const pos1 = obj1.item.position;
      const pos2 = obj2.item.position;

      let newState = { ...state };

      const setPos = (obj, pos) => {
        if (obj.type === 'start') newState.start = { ...newState.start, position: pos };
        else if (obj.type === 'end') newState.end = { ...newState.end, position: pos };
        else {
          const newCheckpoints = [...(newState.checkpoints || state.checkpoints)];
          newCheckpoints[obj.index] = { ...newCheckpoints[obj.index], position: pos };
          newState.checkpoints = newCheckpoints;
        }
      };

      setPos(obj1, pos2);
      setPos(obj2, pos1);

      return newState;
    })
}));

export const useCheckpoints = () => useCheckpointsStore((state) => state);
