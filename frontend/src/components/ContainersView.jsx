import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Square, 
  RotateCw, 
  Pause, 
  Trash2, 
  FileText, 
  Info, 
  Plus, 
  Search, 
  RefreshCw, 
  X, 
  SlidersHorizontal,
  Network,
  Terminal,
  ExternalLink
} from 'lucide-react';
import { BrowserOpenURL } from '../../wailsjs/runtime/runtime';
import EnvEditorModal, { parseEnvString } from './EnvEditorModal';
import PortBindingsModal, { parsePortSpecs } from './PortBindingsModal';
import CommandOverrideModal, { parseCommandArgs } from './CommandOverrideModal';

function extractHostPort(p) {
  if (!p) return null;
  if (typeof p === 'object') {
    const pub = p.publicPort ?? p.PublicPort;
    if (pub && Number(pub) > 0) return Number(pub);
  } else if (typeof p === 'string') {
    const m = p.match(/(?:(?:::|[0-9.]+):)?([0-9]+)(?:->|:)/);
    if (m && m[1]) return Number(m[1]);
  }
  return null;
}

export default function ContainersView({
  containers = [],
  networks = [],
  volumes = [],
  loading,
  onRefresh,
  onStart,
  onStop,
  onRestart,
  onPause,
  onUnpause,
  onRemove,
  onOpenLogs,
  onInspect,
  onSelectContainer,
  onCreate,
  onBatchStart,
  onBatchStop,
  onBatchRestart,
  onBatchRemove
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEnvModal, setShowEnvModal] = useState(false);
  const [showPortModal, setShowPortModal] = useState(false);
  const [showCmdModal, setShowCmdModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
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
  const [createForm, setCreateForm] = useState({
    name: '',
    image: '',
    cmd: '',
    ports: '',
    env: '',
    network: '',
    volume: '',
    restartPolicy: 'no'
  });

  const parsedEnvList = typeof createForm.env === 'string'
    ? parseEnvString(createForm.env).map(r => `${r.key}=${r.value}`)
    : (Array.isArray(createForm.env) ? createForm.env : []);

  const parsedPortList = typeof createForm.ports === 'string'
    ? parsePortSpecs(createForm.ports)
    : [];

  const parsedCmdArgs = typeof createForm.cmd === 'string'
    ? parseCommandArgs(createForm.cmd)
    : [];
  const [loadingActions, setLoadingActions] = useState({});

  const executeAction = async (e, containerId, actionName, actionFn) => {
    e.stopPropagation();
    if (loadingActions[containerId]) return;
    setLoadingActions(prev => ({ ...prev, [containerId]: actionName }));
    try {
      await actionFn(containerId);
    } finally {
      setLoadingActions(prev => {
        const next = { ...prev };
        delete next[containerId];
        return next;
      });
    }
  };

  const getContainerState = (c) => {
    const raw = (c.state || c.status || '').toLowerCase();
    if (raw.includes('running') || raw.startsWith('up')) return 'running';
    if (raw.includes('pause')) return 'paused';
    if (raw.includes('exit') || raw.includes('stop')) return 'stopped';
    return raw;
  };

  const filtered = containers.filter(c => {
    const matchesSearch = 
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.image || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.shortId || '').toLowerCase().includes(search.toLowerCase());
    
    const state = getContainerState(c);
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'running') return matchesSearch && state === 'running';
    if (statusFilter === 'stopped') return matchesSearch && state === 'stopped';
    if (statusFilter === 'paused') return matchesSearch && state === 'paused';
    return matchesSearch;
  });

  useEffect(() => {
    if (headerCheckboxRef.current) {
      const allSelected = filtered.length > 0 && filtered.every(c => selectedIds.includes(c.id));
      const someSelected = selectedIds.length > 0 && !allSelected;
      headerCheckboxRef.current.checked = allSelected;
      headerCheckboxRef.current.indeterminate = someSelected;
    }
  }, [selectedIds, filtered]);

  const handleToggleSelectAll = () => {
    const allSelected = filtered.length > 0 && filtered.every(c => selectedIds.includes(c.id));
    if (allSelected) {
      const filteredIds = new Set(filtered.map(c => c.id));
      setSelectedIds(prev => prev.filter(id => !filteredIds.has(id)));
    } else {
      const combined = new Set([...selectedIds, ...filtered.map(c => c.id)]);
      setSelectedIds(Array.from(combined));
    }
  };

  const handleToggleSelectOne = (e, id) => {
    e.stopPropagation();
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBatchStart = async () => {
    if (!onBatchStart || selectedIds.length === 0 || batchExecuting) return;
    setBatchExecuting(true);
    try {
      await onBatchStart(selectedIds);
      setSelectedIds([]);
    } finally {
      setBatchExecuting(false);
    }
  };

  const handleBatchStop = async () => {
    if (!onBatchStop || selectedIds.length === 0 || batchExecuting) return;
    setBatchExecuting(true);
    try {
      await onBatchStop(selectedIds);
      setSelectedIds([]);
    } finally {
      setBatchExecuting(false);
    }
  };

  const handleBatchRestart = async () => {
    if (!onBatchRestart || selectedIds.length === 0 || batchExecuting) return;
    setBatchExecuting(true);
    try {
      await onBatchRestart(selectedIds);
      setSelectedIds([]);
    } finally {
      setBatchExecuting(false);
    }
  };

  const handleBatchRemove = async () => {
    if (!onBatchRemove || selectedIds.length === 0 || batchExecuting) return;
    setBatchExecuting(true);
    try {
      const ok = await onBatchRemove(selectedIds);
      if (ok) setSelectedIds([]);
    } finally {
      setBatchExecuting(false);
    }
  };

  const renderStatusBadge = (c) => {
    const state = getContainerState(c);
    const label = c.status || (state.charAt(0).toUpperCase() + state.slice(1));

    switch (state) {
      case 'running':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{label}</span>
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/25 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>{label}</span>
          </span>
        );
      case 'stopped':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700/80 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
            <span>{label}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 whitespace-nowrap">
            {label}
          </span>
        );
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.image) return;

    const portMap = {};
    if (createForm.ports.trim()) {
      const parts = createForm.ports.split(',');
      parts.forEach(p => {
        const [host, container] = p.trim().split(':');
        if (host && container) portMap[container] = host;
      });
    }

    const envList = [];
    if (typeof createForm.env === 'string' && createForm.env.trim()) {
      createForm.env.split(/\r?\n|,/).forEach(kv => {
        const trimmed = kv.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          envList.push(trimmed);
        }
      });
    } else if (Array.isArray(createForm.env)) {
      createForm.env.forEach(kv => {
        if (typeof kv === 'string' && kv.trim() && !kv.trim().startsWith('#')) {
          envList.push(kv.trim());
        }
      });
    }

    const portList = [];
    if (createForm.ports.trim()) {
      createForm.ports.split(/\r?\n|,/).forEach(p => {
        if (p.trim() && !p.trim().startsWith('#')) portList.push(p.trim());
      });
    }

    const volumeList = [];
    if (createForm.volume.trim()) {
      createForm.volume.split(',').forEach(v => {
        if (v.trim()) volumeList.push(v.trim());
      });
    }

    const networkList = [];
    if (createForm.network.trim()) {
      networkList.push(createForm.network.trim());
    }

    const cmdArgs = createForm.cmd.trim() ? parseCommandArgs(createForm.cmd.trim()) : undefined;

    const payload = {
      name: createForm.name.trim() || undefined,
      image: createForm.image.trim(),
      command: cmdArgs && cmdArgs.length > 0 ? cmdArgs : undefined,
      portMappings: portList.length > 0 ? portList : undefined,
      env: envList.length > 0 ? envList : undefined,
      volumes: volumeList.length > 0 ? volumeList : undefined,
      networks: networkList.length > 0 ? networkList : undefined,
      restartPolicy: createForm.restartPolicy !== 'no' ? createForm.restartPolicy : undefined
    };

    if (onCreate) {
      await onCreate(payload);
    }
    setShowCreateModal(false);
    setCreateForm({ name: '', image: '', cmd: '', ports: '', env: '', network: '', volume: '', restartPolicy: 'no' });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900/60 overflow-hidden">
      {/* Top action bar */}
      <div className="p-4 md:p-6 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Containers</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage your local container instances, inspect logs, and control lifecycles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search name, image, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-48 md:w-56 transition-colors"
            />
          </div>

          {/* Status filter dropdown */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-8 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">All States</option>
              <option value="running">Running</option>
              <option value="stopped">Stopped</option>
              <option value="paused">Paused</option>
            </select>
          </div>

          {/* New Container button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg text-xs shadow-md shadow-cyan-500/20 transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
            <span>Create Container</span>
          </button>
        </div>
      </div>

      {/* Main Container list: with horizontal & vertical scroll for small displays */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {filtered.length === 0 ? (
          <div className="h-64 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <p className="font-medium text-sm text-slate-400">No containers found</p>
            <p className="text-xs mt-1">Start a new container or adjust your search filter.</p>
          </div>
        ) : (
          <>
            {/* Batch Action Toolbar */}
            {selectedIds.length > 0 && (
              <div className="batch-action-bar mb-3 px-4 py-2.5 rounded-xl border border-cyan-500/30 bg-slate-950/90 shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="font-semibold text-slate-100 font-mono">
                    {selectedIds.length} container{selectedIds.length > 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={() => setSelectedIds([])}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 underline ml-1 cursor-pointer"
                  >
                    Clear selection
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBatchStart}
                    disabled={batchExecuting}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium transition cursor-pointer disabled:opacity-50"
                    title="Start selected containers"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Start</span>
                  </button>
                  <button
                    onClick={handleBatchStop}
                    disabled={batchExecuting}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium transition cursor-pointer disabled:opacity-50"
                    title="Stop selected containers"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Stop</span>
                  </button>
                  <button
                    onClick={handleBatchRestart}
                    disabled={batchExecuting}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium transition cursor-pointer disabled:opacity-50"
                    title="Restart selected containers"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${batchExecuting ? 'animate-spin' : ''}`} />
                    <span>Restart</span>
                  </button>
                  <button
                    onClick={handleBatchRemove}
                    disabled={batchExecuting}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium transition cursor-pointer disabled:opacity-50"
                    title="Delete selected containers"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            )}

            <div className="border border-slate-800 rounded-xl bg-slate-950/60 shadow-lg overflow-x-auto">
              <table className="w-full min-w-[740px] text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        ref={headerCheckboxRef}
                        checked={filtered.length > 0 && filtered.every(c => selectedIds.includes(c.id))}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/30 cursor-pointer accent-cyan-500"
                        title={filtered.length > 0 && filtered.every(c => selectedIds.includes(c.id)) ? "Deselect all" : "Select all"}
                      />
                    </th>
                    <th className="py-3 px-4 min-w-[140px]">Container</th>
                    <th className="py-3 px-4 min-w-[150px]">Status</th>
                    <th className="py-3 px-4 min-w-[140px]">Image</th>
                    <th className="py-3 px-4 min-w-[100px]">Ports</th>
                    <th className="py-3 px-4 min-w-[120px]">Created</th>
                    <th className="py-3 px-4 text-right min-w-[150px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filtered.map((c) => {
                    const state = getContainerState(c);
                    const isRunning = state === 'running';
                    const isPaused = state === 'paused';
                    const shortId = c.shortId || (c.id ? c.id.substring(0, 12) : '');
                    const isSelected = selectedIds.includes(c.id);

                    return (
                      <tr 
                        key={c.id} 
                        onClick={() => onSelectContainer && onSelectContainer(c.id)}
                        className={`hover:bg-slate-900/50 transition-colors group cursor-pointer ${
                          isSelected ? 'row-selected bg-cyan-50/80 border-l-2 border-l-cyan-500 dark:bg-cyan-950/30 dark:border-l-cyan-400' : ''
                        }`}
                      >
                        <td className="py-3 px-3 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleToggleSelectOne(e, c.id)}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/30 cursor-pointer accent-cyan-500"
                          />
                        </td>
                        <td className="py-3 px-4">
                        <div className="font-semibold text-slate-100 group-hover:text-cyan-400 transition-colors truncate max-w-[180px]">
                          {c.name || shortId}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {shortId}
                        </div>
                      </td>
                      <td className="py-3 px-4">{renderStatusBadge(c)}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-300 max-w-[180px] truncate" title={c.image}>
                        {c.image}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {c.ports && c.ports.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {Array.from(new Set(c.ports.map(p => typeof p === 'string' ? p : `${p.publicPort ? `${p.publicPort}:` : ''}${p.privatePort}/${p.type}`))).map((label, idx) => {
                              const hostPort = extractHostPort(label);
                              const isRunning = (c.state || '').toLowerCase() === 'running';
                              if (hostPort && isRunning) {
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const url = `http://localhost:${hostPort}`;
                                      if (typeof BrowserOpenURL === 'function') BrowserOpenURL(url);
                                      else if (window.runtime?.BrowserOpenURL) window.runtime.BrowserOpenURL(url);
                                      else window.open(url, '_blank');
                                    }}
                                    className="flex items-center gap-1 bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 hover:text-cyan-200 border border-cyan-800/60 hover:border-cyan-600/80 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap transition cursor-pointer group/port"
                                    title={`Open http://localhost:${hostPort} in browser`}
                                  >
                                    <span>{label}</span>
                                    <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover/port:opacity-100 transition shrink-0" />
                                  </button>
                                );
                              }
                              return (
                                <span key={idx} className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">
                                  {label}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                        {c.created ? new Date(c.created * 1000).toLocaleString(undefined, { 
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                        }) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {/* Lifecycle controls */}
                          {isRunning ? (
                            <>
                              <button
                                onClick={(e) => executeAction(e, c.id, 'stop', onStop)}
                                disabled={Boolean(loadingActions[c.id])}
                                title="Stop Container"
                                className="p-1.5 text-amber-400 hover:bg-amber-400/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                              >
                                {loadingActions[c.id] === 'stop' ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Square className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={(e) => executeAction(e, c.id, 'pause', onPause)}
                                disabled={Boolean(loadingActions[c.id])}
                                title="Pause Container"
                                className="p-1.5 text-slate-400 hover:bg-slate-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                              >
                                {loadingActions[c.id] === 'pause' ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Pause className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </>
                          ) : isPaused ? (
                            <button
                              onClick={(e) => executeAction(e, c.id, 'unpause', onUnpause)}
                              disabled={Boolean(loadingActions[c.id])}
                              title="Unpause Container"
                              className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                              {loadingActions[c.id] === 'unpause' ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Play className="w-3.5 h-3.5" />
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={(e) => executeAction(e, c.id, 'start', onStart)}
                              disabled={Boolean(loadingActions[c.id])}
                              title="Start Container"
                              className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                              {loadingActions[c.id] === 'start' ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Play className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          <button
                            onClick={(e) => executeAction(e, c.id, 'restart', onRestart)}
                            disabled={Boolean(loadingActions[c.id])}
                            title="Restart Container"
                            className="p-1.5 text-slate-400 hover:bg-slate-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            {loadingActions[c.id] === 'restart' ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                            ) : (
                              <RotateCw className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            onClick={(e) => { e.stopPropagation(); onOpenLogs(c.id, c.name); }}
                            title="View Container Logs"
                            className="p-1.5 text-cyan-400 hover:bg-cyan-400/10 rounded-md transition-colors cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={(e) => { e.stopPropagation(); onInspect(c.id, c.name); }}
                            title="Inspect Container Details"
                            className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors cursor-pointer"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={(e) => executeAction(e, c.id, 'remove', (id) => onRemove(id, false))}
                            disabled={Boolean(loadingActions[c.id])}
                            title="Delete Container"
                            className="p-1.5 text-rose-400 hover:bg-rose-400/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            {loadingActions[c.id] === 'remove' ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-400" />
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

      {/* Modal: Create Container */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-100">Create Container</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Image Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. nginx:alpine or redis:latest"
                  value={createForm.image}
                  onChange={(e) => setCreateForm({ ...createForm, image: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Container Name (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. my-web-app"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-medium">Port Bindings (host:container)</label>
                  {parsedPortList.length > 0 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {parsedPortList.length} mapped
                    </span>
                  )}
                </div>

                <div 
                  onClick={() => setShowPortModal(true)}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-cyan-500/50 rounded-lg p-2.5 cursor-pointer transition group"
                  title="Click to manage port bindings"
                >
                  {parsedPortList.length === 0 ? (
                    <div className="flex items-center justify-between py-0.5">
                      <div className="flex items-center gap-2 text-slate-400 group-hover:text-slate-300 transition-colors">
                        <Network className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-xs">Configure Port Bindings...</span>
                      </div>
                      <span className="text-[11px] text-cyan-400 group-hover:underline flex items-center gap-1 font-medium">
                        + Add / Map
                      </span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-medium">
                          <Network className="w-3 h-3 text-cyan-400" />
                          <span>Configured Ports ({parsedPortList.length})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCreateForm(prev => ({ ...prev, ports: '' }));
                            }}
                            className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                          >
                            Clear
                          </button>
                          <span className="text-[11px] text-cyan-400 group-hover:underline font-medium">
                            Edit Table
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                        {parsedPortList.slice(0, 5).map((p, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-cyan-300 max-w-[180px] truncate"
                            title={`${p.hostPort || p.containerPort}:${p.containerPort}/${p.protocol || 'tcp'}`}
                          >
                            {p.hostPort || p.containerPort}:{p.containerPort}{p.protocol === 'udp' ? '/udp' : ''}
                          </span>
                        ))}
                        {parsedPortList.length > 5 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-900/80 border border-slate-800 text-[10px] text-slate-400">
                            +{parsedPortList.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-medium">Environment Variables</label>
                  {parsedEnvList.length > 0 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {parsedEnvList.length} set
                    </span>
                  )}
                </div>

                <div 
                  onClick={() => setShowEnvModal(true)}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-cyan-500/50 rounded-lg p-2.5 cursor-pointer transition group"
                  title="Click to manage environment variables"
                >
                  {parsedEnvList.length === 0 ? (
                    <div className="flex items-center justify-between py-0.5">
                      <div className="flex items-center gap-2 text-slate-400 group-hover:text-slate-300 transition-colors">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-xs">Configure Environment Variables...</span>
                      </div>
                      <span className="text-[11px] text-cyan-400 group-hover:underline flex items-center gap-1 font-medium">
                        + Add / Import
                      </span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-medium">
                          <SlidersHorizontal className="w-3 h-3 text-cyan-400" />
                          <span>Configured Variables ({parsedEnvList.length})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCreateForm(prev => ({ ...prev, env: '' }));
                            }}
                            className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                          >
                            Clear
                          </button>
                          <span className="text-[11px] text-cyan-400 group-hover:underline font-medium">
                            Edit Table / .env
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                        {parsedEnvList.slice(0, 5).map((item, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-cyan-300 max-w-[180px] truncate"
                            title={item}
                          >
                            {item}
                          </span>
                        ))}
                        {parsedEnvList.length > 5 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-900/80 border border-slate-800 text-[10px] text-slate-400">
                            +{parsedEnvList.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-medium">Command Override</label>
                  {parsedCmdArgs.length > 0 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {parsedCmdArgs.length} arg{parsedCmdArgs.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div 
                  onClick={() => setShowCmdModal(true)}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-cyan-500/50 rounded-lg p-2.5 cursor-pointer transition group"
                  title="Click to edit command override"
                >
                  {!createForm.cmd.trim() ? (
                    <div className="flex items-center justify-between py-0.5">
                      <div className="flex items-center gap-2 text-slate-400 group-hover:text-slate-300 transition-colors">
                        <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-xs">Override Container Command (CMD)...</span>
                      </div>
                      <span className="text-[11px] text-cyan-400 group-hover:underline flex items-center gap-1 font-medium">
                        + Edit Command
                      </span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-medium">
                          <Terminal className="w-3 h-3 text-cyan-400" />
                          <span>Custom Command ({parsedCmdArgs.length} args)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCreateForm(prev => ({ ...prev, cmd: '' }));
                            }}
                            className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                          >
                            Clear
                          </button>
                          <span className="text-[11px] text-cyan-400 group-hover:underline font-medium">
                            Edit Editor
                          </span>
                        </div>
                      </div>
                      <div className="font-mono text-[11px] text-cyan-300 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 max-h-16 overflow-y-auto break-all select-text">
                        {createForm.cmd}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Advanced Network Attachment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Attach Network</label>
                  <select
                    value={createForm.network}
                    onChange={(e) => setCreateForm({ ...createForm, network: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-xs"
                  >
                    <option value="">Default (bridge / engine default)</option>
                    {networks.map(net => (
                      <option key={net.id || net.name} value={net.name}>
                        {net.name} ({net.driver || 'bridge'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Restart Policy</label>
                  <select
                    value={createForm.restartPolicy}
                    onChange={(e) => setCreateForm({ ...createForm, restartPolicy: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-xs"
                  >
                    <option value="no">no (do not restart)</option>
                    <option value="always">always</option>
                    <option value="unless-stopped">unless-stopped</option>
                    <option value="on-failure">on-failure</option>
                  </select>
                </div>
              </div>

              {/* Volume & Mount Binding */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Volume / Bind Mount (volume_or_host:container_path)
                </label>
                <input
                  type="text"
                  placeholder="e.g. my-volume:/data or /home/user/app:/app"
                  value={createForm.volume}
                  onChange={(e) => setCreateForm({ ...createForm, volume: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-xs"
                />
                {volumes.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-500">Available volumes:</span>
                    {volumes.slice(0, 4).map(v => (
                      <button
                        key={v.name}
                        type="button"
                        onClick={() => setCreateForm({ ...createForm, volume: `${v.name}:/data` })}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 font-mono transition cursor-pointer"
                      >
                        {v.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold hover:brightness-110"
                >
                  Create & Run
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Environment Variables Editor */}
      <EnvEditorModal
        isOpen={showEnvModal}
        initialEnv={createForm.env}
        onSave={(newEnv) => setCreateForm(prev => ({ ...prev, env: newEnv }))}
        onClose={() => setShowEnvModal(false)}
      />

      {/* Modal: Port Bindings Editor */}
      <PortBindingsModal
        isOpen={showPortModal}
        initialPorts={createForm.ports}
        onSave={(newPorts) => setCreateForm(prev => ({ ...prev, ports: newPorts }))}
        onClose={() => setShowPortModal(false)}
      />

      {/* Modal: Command Override Editor */}
      <CommandOverrideModal
        isOpen={showCmdModal}
        initialCmd={createForm.cmd}
        onSave={(newCmd) => setCreateForm(prev => ({ ...prev, cmd: newCmd }))}
        onClose={() => setShowCmdModal(false)}
      />
    </div>
  );
}
