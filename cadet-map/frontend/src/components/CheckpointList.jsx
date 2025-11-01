import { useMemo } from 'react';
import { useCheckpoints } from '../hooks/useCheckpoints.js';

const CheckpointList = () => {
  const {
    start,
    end,
    checkpoints,
    selectedId,
    selectCheckpoint,
    connectVia,
    toggleConnectMode,
    clearAll,
    setPlacementMode
  } = useCheckpoints();

  const entries = useMemo(() => {
    const items = [];
    if (start) {
      items.push({ id: 'start', label: 'Start', position: start.position });
    }
    checkpoints.forEach((checkpoint, index) => {
      items.push({
        id: checkpoint.id,
        label: `Checkpoint ${index + 1}`,
        position: checkpoint.position
      });
    });
    if (end) {
      items.push({ id: 'end', label: 'End', position: end.position });
    }
    return items;
  }, [start, checkpoints, end]);

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-slate-900/70 p-4 shadow-lg shadow-slate-950">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-sky-200">Route Planner</h2>
        <button
          type="button"
          className="rounded-md border border-rose-500 px-2 py-1 text-xs font-medium text-rose-300 hover:bg-rose-500/10"
          onClick={clearAll}
        >
          Clear
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md border border-emerald-500 px-3 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-500/10"
          onClick={() => setPlacementMode('start')}
        >
          Set Start
        </button>
        <button
          type="button"
          className="rounded-md border border-sky-500 px-3 py-1 text-xs font-medium text-sky-200 hover:bg-sky-500/10"
          onClick={() => setPlacementMode('checkpoint')}
        >
          Add Checkpoint
        </button>
        <button
          type="button"
          className="rounded-md border border-orange-500 px-3 py-1 text-xs font-medium text-orange-300 hover:bg-orange-500/10"
          onClick={() => setPlacementMode('end')}
        >
          Set End
        </button>
      </div>

      <div className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
        <span>Connection</span>
        <button
          type="button"
          className="rounded-md border border-slate-600 px-3 py-1 text-xs font-semibold text-slate-100 hover:bg-slate-700/40"
          onClick={toggleConnectMode}
        >
          {connectVia === 'direct' ? 'Direct Lines' : 'Route Mode'}
        </button>
      </div>

      <ul className="space-y-2 text-sm text-slate-200">
        {entries.length === 0 && (
          <li className="text-xs text-slate-500">No markers yet. Use the buttons above to start.</li>
        )}
        {entries.map((entry) => (
          <li
            key={entry.id}
            className={`cursor-pointer rounded-md border px-3 py-2 ${
              selectedId === entry.id
                ? 'border-sky-500 bg-sky-500/10 text-sky-100'
                : 'border-slate-800 hover:border-slate-600 hover:bg-slate-800/40'
            }`}
            onClick={() => selectCheckpoint(entry.id)}
          >
            <div className="font-semibold">{entry.label}</div>
            <div className="text-xs text-slate-400">
              {entry.position.lat.toFixed(4)}, {entry.position.lng.toFixed(4)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CheckpointList;
