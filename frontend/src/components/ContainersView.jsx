import React, { useState } from 'react';
import { 
  Play, 
  Square, 
  RotateCw, 
  Pause, 
  Trash2, 
  FileText, 
  Info, 
  Plus, 
  Search
} from 'lucide-react';

export default function ContainersView({
  containers = [],
  loading,
  onRefresh,
  onStart,
  onStop,
  onRestart,
  onPause,
  onUnpause,
  onRemove,
  onCreate,
  onOpenLogs,
  onInspect
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    image: '',
    cmd: '',
    ports: '',
    env: ''
  });

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

    const envMap = {};
    if (createForm.env.trim()) {
      createForm.env.split(',').forEach(kv => {
        const [k, v] = kv.trim().split('=');
        if (k) envMap[k] = v || '';
      });
    }

    const payload = {
      name: createForm.name || undefined,
      image: createForm.image,
      cmd: createForm.cmd ? createForm.cmd.split(' ') : undefined,
      ports: portMap,
      env: envMap
    };

    await onCreate(payload);
    setShowCreateModal(false);
    setCreateForm({ name: '', image: '', cmd: '', ports: '', env: '' });
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
              className="appearance-none bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-8 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-slate-200">All States</option>
              <option value="running" className="bg-slate-900 text-slate-200">Running</option>
              <option value="stopped" className="bg-slate-900 text-slate-200">Stopped</option>
              <option value="paused" className="bg-slate-900 text-slate-200">Paused</option>
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">
              ▼
            </div>
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
          <div className="border border-slate-800 rounded-xl bg-slate-950/60 shadow-lg overflow-x-auto">
            <table className="w-full min-w-[700px] text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
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

                  return (
                    <tr key={c.id} className="hover:bg-slate-900/50 transition-colors group">
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
                            {c.ports.map((p, idx) => (
                              <span key={idx} className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">
                                {typeof p === 'string' ? p : `${p.publicPort ? `${p.publicPort}:` : ''}${p.privatePort}/${p.type}`}
                              </span>
                            ))}
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
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Lifecycle controls */}
                          {isRunning ? (
                            <>
                              <button
                                onClick={() => onStop(c.id)}
                                title="Stop Container"
                                className="p-1.5 text-amber-400 hover:bg-amber-400/10 rounded-md transition-colors"
                              >
                                <Square className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onPause(c.id)}
                                title="Pause Container"
                                className="p-1.5 text-slate-400 hover:bg-slate-800 rounded-md transition-colors"
                              >
                                <Pause className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : isPaused ? (
                            <button
                              onClick={() => onUnpause(c.id)}
                              title="Unpause Container"
                              className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded-md transition-colors"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => onStart(c.id)}
                              title="Start Container"
                              className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded-md transition-colors"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => onRestart(c.id)}
                            title="Restart Container"
                            className="p-1.5 text-slate-400 hover:bg-slate-800 rounded-md transition-colors"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onOpenLogs(c.id, c.name)}
                            title="View Container Logs"
                            className="p-1.5 text-cyan-400 hover:bg-cyan-400/10 rounded-md transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onInspect(c.id, c.name)}
                            title="Inspect Container Details"
                            className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onRemove(c.id, false)}
                            title="Delete Container"
                            className="p-1.5 text-rose-400 hover:bg-rose-400/10 rounded-md transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
                <label className="block text-slate-300 font-medium mb-1">Port Bindings (host:container)</label>
                <input
                  type="text"
                  placeholder="e.g. 8080:80, 443:443"
                  value={createForm.ports}
                  onChange={(e) => setCreateForm({ ...createForm, ports: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Environment Variables</label>
                <input
                  type="text"
                  placeholder="e.g. NODE_ENV=production, PORT=80"
                  value={createForm.env}
                  onChange={(e) => setCreateForm({ ...createForm, env: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Command Override</label>
                <input
                  type="text"
                  placeholder="e.g. echo hello"
                  value={createForm.cmd}
                  onChange={(e) => setCreateForm({ ...createForm, cmd: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
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
    </div>
  );
}
