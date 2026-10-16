import React, { useState, useEffect, useRef } from 'react';
import { 
  HardDrive, 
  Trash2, 
  Plus, 
  Info, 
  Search, 
  Layers, 
  Sparkles,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

export default function VolumesView({
  volumes = [],
  loading,
  onRefresh,
  onCreate,
  onRemove,
  onBatchRemove,
  onPrune,
  onInspect,
  onConfirm
}) {
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newVolumeName, setNewVolumeName] = useState('');
  const [newVolumeDriver, setNewVolumeDriver] = useState('local');
  const [pruning, setPruning] = useState(false);
  const [deletingVolumes, setDeletingVolumes] = useState({});
  const [selectedNames, setSelectedNames] = useState([]);
  const [batchExecuting, setBatchExecuting] = useState(false);
  const headerCheckboxRef = useRef(null);

  useEffect(() => {
    if (!showCreateModal) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShowCreateModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCreateModal]);

  const filtered = volumes.filter(v => 
    (v.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (v.driver || '').toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (headerCheckboxRef.current) {
      const allSelected = filtered.length > 0 && filtered.every(v => selectedNames.includes(v.name));
      const someSelected = selectedNames.length > 0 && !allSelected;
      headerCheckboxRef.current.checked = allSelected;
      headerCheckboxRef.current.indeterminate = someSelected;
    }
  }, [selectedNames, filtered]);

  const handleToggleSelectAll = () => {
    const allSelected = filtered.length > 0 && filtered.every(v => selectedNames.includes(v.name));
    if (allSelected) {
      const filteredNames = new Set(filtered.map(v => v.name));
      setSelectedNames(prev => prev.filter(name => !filteredNames.has(name)));
    } else {
      const combined = new Set([...selectedNames, ...filtered.map(v => v.name)]);
      setSelectedNames(Array.from(combined));
    }
  };

  const handleToggleSelectOne = (e, name) => {
    e.stopPropagation();
    setSelectedNames(prev =>
      prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]
    );
  };

  const handleBatchRemove = async () => {
    if (!onBatchRemove || selectedNames.length === 0 || batchExecuting) return;
    setBatchExecuting(true);
    try {
      const ok = await onBatchRemove(selectedNames);
      if (ok) setSelectedNames([]);
    } finally {
      setBatchExecuting(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newVolumeName.trim()) return;
    await onCreate({
      name: newVolumeName.trim(),
      driver: newVolumeDriver || 'local'
    });
    setNewVolumeName('');
    setShowCreateModal(false);
  };

  const handleDeleteVolume = async (name) => {
    if (deletingVolumes[name]) return;
    setDeletingVolumes(prev => ({ ...prev, [name]: true }));
    try {
      await onRemove(name, false);
    } finally {
      setDeletingVolumes(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handlePruneClick = async () => {
    let ok = false;
    if (onConfirm) {
      ok = await onConfirm({
        title: 'Prune Unused Volumes',
        message: 'Are you sure you want to prune all unused volumes? This cannot be undone.',
        confirmText: 'Prune Volumes',
        isDanger: true
      });
    } else {
      ok = window.confirm('Are you sure you want to prune all unused volumes? This cannot be undone.');
    }
    if (!ok) return;
    try {
      setPruning(true);
      await onPrune();
    } finally {
      setPruning(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900/60 overflow-hidden">
      {/* Top Header */}
      <div className="p-6 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Volumes</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Persistent storage volumes shared across containers and compose stacks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search volumes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-56 transition-colors"
            />
          </div>

          {/* Prune Unused button */}
          <button
            onClick={handlePruneClick}
            disabled={pruning}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold px-3 py-1.5 rounded-lg text-xs border border-slate-700 transition-colors disabled:opacity-50"
            title="Remove all unused volumes"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{pruning ? 'Pruning...' : 'Prune Unused'}</span>
          </button>

          {/* Create Volume button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg text-xs shadow-md shadow-cyan-500/20 transition-all"
          >
            <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
            <span>Create Volume</span>
          </button>
        </div>
      </div>

      {/* Main Volumes Table */}
      <div className="flex-1 overflow-auto p-6">
        {filtered.length === 0 ? (
          <div className="h-64 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <HardDrive className="w-8 h-8 text-slate-600 mb-2" />
            <p className="font-medium text-sm text-slate-400">No storage volumes found</p>
            <p className="text-xs mt-1">Create a new persistent volume for databases or uploads.</p>
          </div>
        ) : (
          <>
            {/* Batch Action Toolbar */}
            {selectedNames.length > 0 && (
              <div className="batch-action-bar mb-3 px-4 py-2.5 rounded-xl border border-cyan-500/30 bg-slate-950/90 shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="font-semibold text-slate-100 font-mono">
                    {selectedNames.length} volume{selectedNames.length > 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={() => setSelectedNames([])}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 underline ml-1 cursor-pointer"
                  >
                    Clear selection
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBatchRemove}
                    disabled={batchExecuting}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium transition cursor-pointer disabled:opacity-50"
                    title="Delete selected volumes"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            )}

            <div className="border border-slate-800 rounded-xl overflow-x-auto bg-slate-950/60 shadow-lg">
              <table className="w-full text-left border-collapse text-xs min-w-[680px]">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        ref={headerCheckboxRef}
                        checked={filtered.length > 0 && filtered.every(v => selectedNames.includes(v.name))}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/30 cursor-pointer accent-cyan-500"
                        title={filtered.length > 0 && filtered.every(v => selectedNames.includes(v.name)) ? "Deselect all" : "Select all"}
                      />
                    </th>
                    <th className="py-3 px-4">Volume Name</th>
                    <th className="py-3 px-4">Driver</th>
                    <th className="py-3 px-4">Mountpoint</th>
                    <th className="py-3 px-4">Scope</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filtered.map((v) => {
                    const isSelected = selectedNames.includes(v.name);
                    return (
                      <tr 
                        key={v.name} 
                        className={`hover:bg-slate-900/50 transition-colors group ${
                          isSelected ? 'row-selected bg-cyan-50/80 border-l-2 border-l-cyan-500 dark:bg-cyan-950/30 dark:border-l-cyan-400' : ''
                        }`}
                      >
                        <td className="py-3 px-3 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleToggleSelectOne(e, v.name)}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/30 cursor-pointer accent-cyan-500"
                          />
                        </td>
                        <td className="py-3 px-4 max-w-[240px] sm:max-w-[320px] md:max-w-[400px]">
                          <div 
                            className="font-semibold text-slate-100 group-hover:text-cyan-400 transition-colors truncate font-mono text-xs"
                            title={v.name}
                          >
                            {v.name}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                            {v.driver || 'local'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400 max-w-[220px] truncate" title={v.mountpoint}>
                          {v.mountpoint || '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                          {v.scope || 'local'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onInspect(v.name)}
                              title="Inspect Volume"
                              className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteVolume(v.name)}
                              disabled={Boolean(deletingVolumes[v.name])}
                              title="Delete Volume"
                              className="p-1.5 text-rose-400 hover:bg-rose-400/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                              {deletingVolumes[v.name] ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Create Volume Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                Create New Volume
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Volume Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. pgdata, redis_cache"
                  value={newVolumeName}
                  onChange={(e) => setNewVolumeName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Driver</label>
                <select
                  value={newVolumeDriver}
                  onChange={(e) => setNewVolumeDriver(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="local">local</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold hover:brightness-110"
                >
                  Create Volume
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
