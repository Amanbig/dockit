import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Play, 
  Square, 
  RotateCw, 
  Pause, 
  Trash2, 
  Terminal, 
  Code, 
  Cpu, 
  HardDrive, 
  Network, 
  Clock, 
  Layers, 
  Copy, 
  Check, 
  RefreshCw,
  Folder,
  Sliders,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { 
  InspectContainer, 
  GetContainerLogs, 
  StartContainer, 
  StopContainer, 
  RestartContainer, 
  PauseContainer, 
  UnpauseContainer, 
  RemoveContainer 
} from '../../wailsjs/go/main/App';

export default function ContainerDetailsView({ containerId, onBack, onRefreshList }) {
  const [details, setDetails] = useState(null);
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('overview'); // 'overview' | 'logs' | 'env' | 'mounts' | 'raw'
  const [copiedKey, setCopiedKey] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const data = await InspectContainer(containerId);
      setDetails(data);
    } catch (err) {
      console.error('Failed to inspect container:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLogsLoading(true);
      const output = await GetContainerLogs(containerId);
      setLogs(output || 'No logs found for this container.');
    } catch (err) {
      setLogs(`Failed to fetch logs: ${err}`);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (containerId) {
      fetchDetails();
      fetchLogs();
    }
  }, [containerId]);

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const isRunning = details?.state?.running;
  const isPaused = details?.state?.paused;
  const stateStatus = details?.state?.status || (isRunning ? 'running' : 'stopped');

  const handleStart = async () => {
    setActionInProgress(true);
    try {
      await StartContainer(containerId);
      await fetchDetails();
      if (onRefreshList) onRefreshList();
    } finally {
      setActionInProgress(false);
    }
  };

  const handleStop = async () => {
    setActionInProgress(true);
    try {
      await StopContainer(containerId, 10);
      await fetchDetails();
      if (onRefreshList) onRefreshList();
    } finally {
      setActionInProgress(false);
    }
  };

  const handleRestart = async () => {
    setActionInProgress(true);
    try {
      await RestartContainer(containerId, 10);
      await fetchDetails();
      if (onRefreshList) onRefreshList();
    } finally {
      setActionInProgress(false);
    }
  };

  const handlePause = async () => {
    setActionInProgress(true);
    try {
      await PauseContainer(containerId);
      await fetchDetails();
      if (onRefreshList) onRefreshList();
    } finally {
      setActionInProgress(false);
    }
  };

  const handleUnpause = async () => {
    setActionInProgress(true);
    try {
      await UnpauseContainer(containerId);
      await fetchDetails();
      if (onRefreshList) onRefreshList();
    } finally {
      setActionInProgress(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm('Are you sure you want to delete this container?')) return;
    try {
      await RemoveContainer(containerId, false, true);
      if (onRefreshList) onRefreshList();
      onBack();
    } catch (err) {
      alert(`Delete failed: ${err}`);
    }
  };

  if (loading && !details) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
        <span className="text-sm font-medium">Loading container details...</span>
      </div>
    );
  }

  const containerName = details?.name ? details.name.replace(/^\//, '') : containerId.slice(0, 12);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900/60 overflow-hidden">
      {/* Top Navigation & Action Header */}
      <div className="p-4 md:p-6 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
            title="Back to Containers List"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>{containerName}</span>
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isRunning 
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : isPaused
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : isPaused ? 'bg-amber-400' : 'bg-slate-500'}`}></span>
                <span className="capitalize">{stateStatus}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
              <span>ID: {containerId.slice(0, 12)}</span>
              <button 
                onClick={() => copyText(containerId, 'id')}
                className="hover:text-slate-300"
                title="Copy full ID"
              >
                {copiedKey === 'id' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
              <span>•</span>
              <span className="text-slate-400">{details?.image}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isRunning ? (
            <>
              <button
                onClick={handleStop}
                disabled={actionInProgress}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 text-xs font-semibold transition disabled:opacity-50"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Stop</span>
              </button>
              <button
                onClick={handlePause}
                disabled={actionInProgress}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-semibold transition disabled:opacity-50"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </button>
            </>
          ) : isPaused ? (
            <button
              onClick={handleUnpause}
              disabled={actionInProgress}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Unpause</span>
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={actionInProgress}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Start</span>
            </button>
          )}

          <button
            onClick={handleRestart}
            disabled={actionInProgress}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-semibold transition disabled:opacity-50"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Restart</span>
          </button>

          <button
            onClick={handleRemove}
            disabled={actionInProgress}
            className="p-1.5 text-rose-400 hover:bg-rose-400/10 rounded-lg border border-slate-800 transition"
            title="Delete Container"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sub Tabs Bar */}
      <div className="px-6 py-2.5 border-b border-slate-800 bg-slate-950/20 flex items-center gap-1 overflow-x-auto select-none">
        {[
          { id: 'overview', label: 'Overview & Health', icon: Sliders },
          { id: 'logs', label: 'Live Logs', icon: Terminal },
          { id: 'env', label: 'Environment Variables', icon: Sliders },
          { id: 'mounts', label: 'Volumes & Mounts', icon: HardDrive },
          { id: 'raw', label: 'Raw JSON Inspect', icon: Code },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                isActive
                  ? 'bg-slate-800 text-cyan-400 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Tab View Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Tab 1: Overview */}
        {activeSubTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* General Info Card */}
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/60 space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                Execution Details
              </h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500">Image ID:</span>{' '}
                  <span className="font-mono text-slate-300">{details?.imageId?.slice(0, 19)}...</span>
                </div>
                <div>
                  <span className="text-slate-500">Command:</span>{' '}
                  <span className="font-mono text-cyan-400">{details?.command || details?.args?.join(' ') || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Created:</span>{' '}
                  <span className="text-slate-300">{details?.created}</span>
                </div>
                <div>
                  <span className="text-slate-500">Started At:</span>{' '}
                  <span className="text-slate-300">{details?.state?.startedAt || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Finished At:</span>{' '}
                  <span className="text-slate-300">{details?.state?.finishedAt || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Exit Code:</span>{' '}
                  <span className="font-mono text-slate-300">{details?.state?.exitCode ?? '-'}</span>
                </div>
              </div>
            </div>

            {/* Network Info Card */}
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/60 space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Network className="w-4 h-4 text-cyan-400" />
                Network Settings
              </h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500">IP Address:</span>{' '}
                  <span className="font-mono text-cyan-400">{details?.network?.ipAddress || 'Host / None'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Gateway:</span>{' '}
                  <span className="font-mono text-slate-300">{details?.network?.gateway || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500">MAC Address:</span>{' '}
                  <span className="font-mono text-slate-300">{details?.network?.macAddress || '-'}</span>
                </div>
                <div className="pt-2 border-t border-slate-900">
                  <span className="text-slate-500 block mb-1.5 font-medium">Exposed Ports:</span>
                  {details?.ports && details.ports.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {details.ports.map((p, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-cyan-300">
                          {p.publicPort ? `${p.publicPort}:` : ''}{p.privatePort}/{p.type}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-600 font-mono">No ports exposed</span>
                  )}
                </div>
              </div>
            </div>

            {/* Storage & Mounts Summary */}
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/60 space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                Storage & Mounts
              </h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500">Total Mounts:</span>{' '}
                  <span className="text-slate-200 font-medium">{details?.mounts?.length || 0} attached</span>
                </div>
                {details?.mounts && details.mounts.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    {details.mounts.slice(0, 3).map((m, idx) => (
                      <div key={idx} className="p-2 rounded bg-slate-900 border border-slate-800/80 font-mono text-[11px] space-y-0.5">
                        <div className="text-cyan-400 truncate">{m.destination}</div>
                        <div className="text-slate-500 text-[10px] truncate">{m.source}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-600">No volumes attached</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Live Logs */}
        {activeSubTab === 'logs' && (
          <div className="flex flex-col h-[520px] rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-inner">
            <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="font-mono text-slate-400">Standard Output & Stderr</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyText(logs, 'logs')}
                  className="p-1 text-slate-400 hover:text-slate-200 transition"
                  title="Copy logs"
                >
                  {copiedKey === 'logs' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={fetchLogs}
                  disabled={logsLoading}
                  className="p-1 text-slate-400 hover:text-slate-200 transition"
                  title="Refresh logs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin text-cyan-400' : ''}`} />
                </button>
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-slate-300 whitespace-pre-wrap select-text leading-relaxed">
              {logs}
            </div>
          </div>
        )}

        {/* Tab 3: Environment Variables */}
        {activeSubTab === 'env' && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden shadow-lg">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase text-[11px] font-semibold">
                  <th className="py-3 px-4 w-1/3">Variable Key</th>
                  <th className="py-3 px-4">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {details?.env && details.env.length > 0 ? (
                  details.env.map((entry, idx) => {
                    const [k, ...v] = entry.split('=');
                    return (
                      <tr key={idx} className="hover:bg-slate-900/40 transition">
                        <td className="py-2.5 px-4 font-semibold text-cyan-400">{k}</td>
                        <td className="py-2.5 px-4 text-slate-300 select-all break-all">{v.join('=')}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="2" className="p-6 text-center text-slate-500">No environment variables set</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Mounts */}
        {activeSubTab === 'mounts' && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden shadow-lg">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase text-[11px] font-semibold">
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Source (Host)</th>
                  <th className="py-3 px-4">Destination (Container)</th>
                  <th className="py-3 px-4">Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {details?.mounts && details.mounts.length > 0 ? (
                  details.mounts.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/40 transition">
                      <td className="py-2.5 px-4 text-cyan-400 font-semibold">{m.type}</td>
                      <td className="py-2.5 px-4 text-slate-300 break-all">{m.source}</td>
                      <td className="py-2.5 px-4 text-slate-300 font-semibold">{m.destination}</td>
                      <td className="py-2.5 px-4 text-slate-400">{m.rw ? 'Read/Write' : 'Read-Only'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="p-6 text-center text-slate-500">No storage mounts configured</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 5: Raw JSON */}
        {activeSubTab === 'raw' && (
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300 overflow-auto whitespace-pre-wrap select-text leading-relaxed">
            {JSON.stringify(details, null, 2)}
          </div>
        )}
      </div>
    </div>
  );
}
