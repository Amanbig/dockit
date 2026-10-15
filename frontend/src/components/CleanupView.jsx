import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  Trash2, 
  HardDrive, 
  Layers, 
  Box, 
  Cpu, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight,
  Info,
  Check,
  Flame,
  Network
} from 'lucide-react';
import { GetDiskUsage, PruneSystem } from '../../wailsjs/go/main/App';

export default function CleanupView({ activeRuntime = 'docker' }) {
  const [loading, setLoading] = useState(false);
  const [pruning, setPruning] = useState(false);
  const [diskUsage, setDiskUsage] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState(null);

  // Modal / selective prune state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pruneScope, setPruneScope] = useState({
    containers: true,
    allImages: false, // false = dangling only, true = all unused
    volumes: true,
    buildCache: true,
    networks: false
  });

  const fetchDiskUsage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await GetDiskUsage();
      setDiskUsage(res);
    } catch (err) {
      console.warn('Failed to load disk usage:', err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiskUsage();
  }, [fetchDiskUsage, activeRuntime]);

  const formatBytes = (bytes) => {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleQuickPrune = async () => {
    // Quick prune: clean stopped containers, dangling images, and build cache
    executePrune({
      containers: true,
      allImages: false,
      volumes: false,
      buildCache: true,
      networks: false
    });
  };

  const handleCustomPruneSubmit = async () => {
    setShowConfirmModal(false);
    executePrune(pruneScope);
  };

  const executePrune = async (options) => {
    setPruning(true);
    setLastResult(null);
    setError(null);
    try {
      const res = await PruneSystem(options);
      setLastResult(res);
      await fetchDiskUsage();
    } catch (err) {
      console.warn('Prune error:', err);
      setError(String(err));
    } finally {
      setPruning(false);
    }
  };

  const totalSize = diskUsage?.totalSpace || 0;
  const reclaimableSize = diskUsage?.totalReclaimable || 0;
  const reclaimablePercent = totalSize > 0 ? Math.min(100, Math.round((reclaimableSize / totalSize) * 100)) : 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900/60 overflow-y-auto select-none">
      {/* Top Header */}
      <div className="p-6 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 sticky top-0 bg-slate-950/90 backdrop-blur-md z-10">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-cyan-400" />
              Disk Space & Cleanup
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 uppercase">
              {activeRuntime}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Analyze storage consumption and reclaim disk space from unused containers, images, and cache.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDiskUsage}
            disabled={loading || pruning}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={loading || pruning || reclaimableSize === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-slate-950 text-xs font-bold shadow-md shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4 stroke-[2.5]" />
            <span>Reclaim Disk Space</span>
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-6xl w-full mx-auto">
        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-200">Storage Analysis Error</p>
              <p className="text-rose-300/90 mt-0.5 font-mono text-[11px]">{error}</p>
            </div>
          </div>
        )}

        {/* Success Banner */}
        {lastResult && (
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-xs text-emerald-300 flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-slate-100 text-sm">
                  Successfully Reclaimed {formatBytes(lastResult.spaceReclaimed)}!
                </p>
                <p className="text-emerald-400/90 text-xs">
                  Cleaned {lastResult.containersDeleted?.length || 0} containers, {lastResult.imagesDeleted?.length || 0} images, {lastResult.volumesDeleted?.length || 0} volumes, and {lastResult.buildCacheDeleted?.length || 0} build cache items.
                </p>
              </div>
            </div>
            <button 
              onClick={() => setLastResult(null)}
              className="text-emerald-400 hover:text-emerald-200 text-xs font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Hero Storage Gauge Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Total Used */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Total Engine Storage</span>
              <HardDrive className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <div className="text-2xl lg:text-3xl font-extrabold text-slate-100 font-mono tracking-tight">
                {formatBytes(totalSize)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Occupied by images, containers, volumes & cache
              </p>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-4 overflow-hidden">
              <div className="bg-cyan-500 h-full rounded-full w-full" />
            </div>
          </div>

          {/* Reclaimable Storage Card */}
          <div className="cleanup-card-reclaimable p-5 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-slate-950/60 to-emerald-950/30 border border-cyan-800/40 relative overflow-hidden flex flex-col justify-between shadow-lg shadow-cyan-500/5">
            <div className="flex items-center justify-between text-xs text-cyan-300 mb-2">
              <span className="font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Reclaimable Space
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                {reclaimablePercent}% potential
              </span>
            </div>
            <div>
              <div className="text-2xl lg:text-3xl font-extrabold text-emerald-400 font-mono tracking-tight">
                {formatBytes(reclaimableSize)}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Can be safely purged without affecting running tasks
              </p>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-4 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.max(5, reclaimablePercent)}%` }}
              />
            </div>
          </div>

          {/* Quick Clean Action Card */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Quick Cleanup
              </span>
              <span className="text-[10px] text-slate-500 font-mono">1-Click</span>
            </div>
            <div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Prune stopped containers, dangling images, and build cache safely in one tap.
              </p>
            </div>
            <button
              onClick={handleQuickPrune}
              disabled={pruning || reclaimableSize === 0}
              className="cleanup-quick-btn mt-4 w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-[0.99] text-xs font-bold text-cyan-300 border border-cyan-800/40 hover:border-cyan-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pruning ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Pruning in progress...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Run Quick Clean</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Categories Breakdown Grid */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider text-[11px]">
            Storage Breakdown by Resource
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Images Card */}
            <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">Images</h3>
                    <p className="text-xs text-slate-400">
                      {diskUsage?.images?.totalCount || 0} total ({diskUsage?.images?.activeCount || 0} in active use)
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold font-mono text-slate-100">
                    {formatBytes(diskUsage?.images?.totalSize)}
                  </div>
                  <div className="text-[11px] font-mono text-emerald-400">
                    {formatBytes(diskUsage?.images?.reclaimable)} reclaimable
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3 text-xs">
                <span className="text-[11px] text-slate-500">
                  Pruning untagged & dangling images
                </span>
                <button
                  onClick={() => executePrune({ allImages: false })}
                  disabled={pruning || (diskUsage?.images?.reclaimable || 0) === 0}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all disabled:opacity-40"
                >
                  Prune Images
                </button>
              </div>
            </div>

            {/* 2. Containers Card */}
            <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <Box className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">Containers</h3>
                    <p className="text-xs text-slate-400">
                      {diskUsage?.containers?.totalCount || 0} total ({diskUsage?.containers?.activeCount || 0} running)
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold font-mono text-slate-100">
                    {formatBytes(diskUsage?.containers?.totalSize)}
                  </div>
                  <div className="text-[11px] font-mono text-emerald-400">
                    {formatBytes(diskUsage?.containers?.reclaimable)} reclaimable
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3 text-xs">
                <span className="text-[11px] text-slate-500">
                  Removes all stopped container layers
                </span>
                <button
                  onClick={() => executePrune({ containers: true })}
                  disabled={pruning || (diskUsage?.containers?.reclaimable || 0) === 0}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all disabled:opacity-40"
                >
                  Prune Stopped
                </button>
              </div>
            </div>

            {/* 3. Volumes Card */}
            <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">Volumes</h3>
                    <p className="text-xs text-slate-400">
                      {diskUsage?.volumes?.totalCount || 0} total ({diskUsage?.volumes?.activeCount || 0} attached)
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold font-mono text-slate-100">
                    {formatBytes(diskUsage?.volumes?.totalSize)}
                  </div>
                  <div className="text-[11px] font-mono text-emerald-400">
                    {formatBytes(diskUsage?.volumes?.reclaimable)} reclaimable
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3 text-xs">
                <span className="text-[11px] text-slate-500">
                  Removes volumes not attached to any container
                </span>
                <button
                  onClick={() => executePrune({ volumes: true })}
                  disabled={pruning || (diskUsage?.volumes?.reclaimable || 0) === 0}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all disabled:opacity-40"
                >
                  Prune Unused
                </button>
              </div>
            </div>

            {/* 4. Build Cache Card */}
            <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">Build Cache</h3>
                    <p className="text-xs text-slate-400">
                      {diskUsage?.buildCache?.totalCount || 0} cache records
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold font-mono text-slate-100">
                    {formatBytes(diskUsage?.buildCache?.totalSize)}
                  </div>
                  <div className="text-[11px] font-mono text-emerald-400">
                    {formatBytes(diskUsage?.buildCache?.reclaimable)} reclaimable
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3 text-xs">
                <span className="text-[11px] text-slate-500">
                  Purges build cache layers from previous builds
                </span>
                <button
                  onClick={() => executePrune({ buildCache: true })}
                  disabled={pruning || (diskUsage?.buildCache?.reclaimable || 0) === 0}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all disabled:opacity-40"
                >
                  Clear Cache
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation & Custom Prune Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl text-slate-100 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Reclaim Storage</h3>
                <p className="text-xs text-slate-400">Select which unused items you would like to purge:</p>
              </div>
            </div>

            <div className="space-y-2.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
              <label className="cleanup-modal-label flex items-center justify-between p-2 rounded-lg hover:bg-slate-900 cursor-pointer transition-colors">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={pruneScope.containers}
                    onChange={(e) => setPruneScope(prev => ({ ...prev, containers: e.target.checked }))}
                    className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-0"
                  />
                  <span>Stopped Containers</span>
                </div>
                <span className="font-mono text-slate-400">{formatBytes(diskUsage?.containers?.reclaimable)}</span>
              </label>

              <label className="cleanup-modal-label flex items-center justify-between p-2 rounded-lg hover:bg-slate-900 cursor-pointer transition-colors">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={pruneScope.allImages}
                    onChange={(e) => setPruneScope(prev => ({ ...prev, allImages: e.target.checked }))}
                    className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-0"
                  />
                  <div>
                    <span>All Unused Images</span>
                    <span className="block text-[10px] text-slate-500">Not just dangling/untagged</span>
                  </div>
                </div>
                <span className="font-mono text-slate-400">{formatBytes(diskUsage?.images?.reclaimable)}</span>
              </label>

              <label className="cleanup-modal-label flex items-center justify-between p-2 rounded-lg hover:bg-slate-900 cursor-pointer transition-colors">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={pruneScope.volumes}
                    onChange={(e) => setPruneScope(prev => ({ ...prev, volumes: e.target.checked }))}
                    className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-0"
                  />
                  <span>Unattached Volumes</span>
                </div>
                <span className="font-mono text-slate-400">{formatBytes(diskUsage?.volumes?.reclaimable)}</span>
              </label>

              <label className="cleanup-modal-label flex items-center justify-between p-2 rounded-lg hover:bg-slate-900 cursor-pointer transition-colors">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={pruneScope.buildCache}
                    onChange={(e) => setPruneScope(prev => ({ ...prev, buildCache: e.target.checked }))}
                    className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-0"
                  />
                  <span>Build Cache</span>
                </div>
                <span className="font-mono text-slate-400">{formatBytes(diskUsage?.buildCache?.reclaimable)}</span>
              </label>

              <label className="cleanup-modal-label flex items-center justify-between p-2 rounded-lg hover:bg-slate-900 cursor-pointer transition-colors">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={pruneScope.networks}
                    onChange={(e) => setPruneScope(prev => ({ ...prev, networks: e.target.checked }))}
                    className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-0"
                  />
                  <span>Unused Networks</span>
                </div>
                <span className="font-mono text-slate-500">0 B</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCustomPruneSubmit}
                disabled={!pruneScope.containers && !pruneScope.allImages && !pruneScope.volumes && !pruneScope.buildCache && !pruneScope.networks}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-slate-950 text-xs font-bold shadow-md shadow-cyan-500/20 transition-all disabled:opacity-50"
              >
                Confirm Cleanup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
