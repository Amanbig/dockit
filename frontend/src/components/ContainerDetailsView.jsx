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
  AlertTriangle,
  Activity,
  ArrowDown,
  ArrowUp
} from 'lucide-react';
import { 
  InspectContainer, 
  GetContainerLogs, 
  GetContainerResourceStats,
  StartContainer, 
  StopContainer, 
  RestartContainer, 
  PauseContainer, 
  UnpauseContainer, 
  RemoveContainer,
  ExecContainer
} from '../../wailsjs/go/main/App';

export default function ContainerDetailsView({ containerId, onBack, onRefreshList }) {
  const [details, setDetails] = useState(null);
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('overview'); // 'overview' | 'terminal' | 'logs' | 'env' | 'mounts' | 'raw'
  const [copiedKey, setCopiedKey] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [resourceStats, setResourceStats] = useState(null);

  // Terminal state
  const [commandInput, setCommandInput] = useState('');
  const [terminalHistory, setTerminalHistory] = useState([
    { type: 'system', text: 'Dockit Container Shell (bash/sh)\nType any command or "clear" to clear screen.' }
  ]);
  const [historyList, setHistoryList] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [executing, setExecuting] = useState(false);
  const terminalScrollRef = React.useRef(null);
  const terminalInputRef = React.useRef(null);

  // Auto-scroll inside terminal window without moving outer page
  React.useEffect(() => {
    if (activeSubTab === 'terminal' && terminalScrollRef.current) {
      terminalScrollRef.current.scrollTop = terminalScrollRef.current.scrollHeight;
    }
  }, [terminalHistory, executing]);

  // Focus terminal input without scrolling outer page when tab is activated
  React.useEffect(() => {
    if (activeSubTab === 'terminal') {
      if (terminalScrollRef.current) {
        terminalScrollRef.current.scrollTop = terminalScrollRef.current.scrollHeight;
      }
      setTimeout(() => {
        terminalInputRef.current?.focus({ preventScroll: true });
      }, 50);
    }
  }, [activeSubTab]);

  const handleRunCommand = async (e) => {
    e.preventDefault();
    const cmdStr = commandInput.trim();
    if (!cmdStr || executing) return;

    if (cmdStr === 'clear') {
      setTerminalHistory([]);
      setCommandInput('');
      setHistoryList(prev => [...prev, 'clear']);
      setHistoryIndex(-1);
      return;
    }

    setExecuting(true);
    setTerminalHistory(prev => [...prev, { type: 'cmd', text: cmdStr }]);
    setHistoryList(prev => [...prev, cmdStr]);
    setHistoryIndex(-1);
    setCommandInput('');

    try {
      const out = await ExecContainer(containerId, ['sh', '-c', cmdStr]);
      setTerminalHistory(prev => [...prev, { type: 'out', text: out || '' }]);
    } catch (err) {
      setTerminalHistory(prev => [...prev, { type: 'err', text: `Error: ${err}` }]);
    } finally {
      setExecuting(false);
      setTimeout(() => terminalInputRef.current?.focus({ preventScroll: true }), 50);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyList.length === 0) return;
      const nextIdx = historyIndex === -1 ? historyList.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIdx);
      setCommandInput(historyList[nextIdx] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIdx = historyIndex + 1;
      if (nextIdx >= historyList.length) {
        setHistoryIndex(-1);
        setCommandInput('');
      } else {
        setHistoryIndex(nextIdx);
        setCommandInput(historyList[nextIdx] || '');
      }
    }
  };

  // Enhanced Logs state
  const [logFilter, setLogFilter] = useState('');
  const [autoTail, setAutoTail] = useState(true);

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

  // Auto-poll logs when on logs tab and autoTail is on
  useEffect(() => {
    let timer;
    if (activeSubTab === 'logs' && autoTail && details?.state?.running) {
      timer = setInterval(() => {
        GetContainerLogs(containerId).then(out => {
          if (out) setLogs(out);
        }).catch(() => {});
      }, 3000);
    }
    return () => clearInterval(timer);
  }, [activeSubTab, autoTail, containerId, details?.state?.running]);

  // Auto-poll resource stats when container is running
  useEffect(() => {
    let timer;
    if (details?.state?.running) {
      const fetchStats = () => {
        GetContainerResourceStats(containerId)
          .then((st) => {
            if (st) setResourceStats(st);
          })
          .catch(() => {});
      };
      fetchStats();
      timer = setInterval(fetchStats, 2000);
    } else {
      setResourceStats(null);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [containerId, details?.state?.running]);

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
          { id: 'terminal', label: 'Terminal Exec', icon: Terminal },
          { id: 'logs', label: 'Live Logs', icon: Clock },
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
          <div className="space-y-6">
            {/* Live Metrics Grid (Visible when container is running) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* CPU Usage Card */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                    CPU Usage
                  </span>
                  {details?.state?.running && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  )}
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-slate-100">
                    {resourceStats ? `${resourceStats.cpuPercent.toFixed(1)}%` : details?.state?.running ? 'Loading...' : '0.0%'}
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="bg-cyan-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, resourceStats?.cpuPercent || 0))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Memory Usage Card */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-purple-400" />
                    Memory Usage
                  </span>
                  {resourceStats?.memoryPercent !== undefined && (
                    <span className="font-mono text-purple-400 font-semibold">
                      {resourceStats.memoryPercent.toFixed(1)}%
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-slate-100 truncate">
                    {resourceStats 
                      ? `${(resourceStats.memoryUsage / (1024 * 1024)).toFixed(1)} MB` 
                      : details?.state?.running ? 'Loading...' : '0.0 MB'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                    {resourceStats?.memoryLimit ? `Limit: ${(resourceStats.memoryLimit / (1024 * 1024 * 1024)).toFixed(2)} GB` : 'No Limit'}
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div 
                      className="bg-purple-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, resourceStats?.memoryPercent || 0))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Network I/O Card */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <Network className="w-3.5 h-3.5 text-emerald-400" />
                    Network I/O
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="flex items-center text-emerald-400">
                      <ArrowDown className="w-3 h-3 mr-0.5" />
                      {resourceStats ? `${(resourceStats.netRxBytes / 1024).toFixed(1)} KB` : '0 KB'}
                    </span>
                    <span className="text-slate-600">/</span>
                    <span className="flex items-center text-blue-400">
                      <ArrowUp className="w-3 h-3 mr-0.5" />
                      {resourceStats ? `${(resourceStats.netTxBytes / 1024).toFixed(1)} KB` : '0 KB'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-1">
                    Rx / Tx Traffic
                  </div>
                </div>
              </div>

              {/* Disk / Block I/O & Processes Card */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                    Disk & Tasks
                  </span>
                  {resourceStats?.pids ? (
                    <span className="font-mono text-amber-400 font-semibold">{resourceStats.pids} PIDs</span>
                  ) : null}
                </div>
                <div>
                  <div className="text-sm font-bold font-mono text-slate-200 truncate">
                    {resourceStats ? `R: ${(resourceStats.blockRead / 1024).toFixed(0)} KB • W: ${(resourceStats.blockWrite / 1024).toFixed(0)} KB` : '0 KB / 0 KB'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-1">
                    Total Disk Read / Write
                  </div>
                </div>
              </div>
            </div>

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
        </div>
        )}

        {/* Tab: Terminal Exec */}
        {activeSubTab === 'terminal' && (
          <div 
            onClick={() => terminalInputRef.current?.focus({ preventScroll: true })}
            className="terminal-window flex flex-col h-[360px] rounded-xl border border-slate-800 bg-[#0c1017] overflow-hidden shadow-2xl font-mono cursor-text"
          >
            {/* Terminal Window Titlebar */}
            <div className="px-4 py-2.5 bg-[#161b22] border-b border-slate-800 flex items-center justify-between text-xs select-none">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
                <span className="ml-2 text-slate-400 font-semibold text-[11px]">
                  root@{details?.name || 'container'}: ~
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-500">
                  {isRunning ? 'Connected via Docker Exec' : 'Container Offline'}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTerminalHistory([]);
                  }}
                  className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Terminal Output & Inline Prompt Area */}
            <div 
              ref={terminalScrollRef}
              className="flex-1 p-4 overflow-y-auto text-xs space-y-1.5 select-text leading-relaxed"
            >
              {!isRunning && (
                <div className="p-3 mb-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                  ⚠️ Container is currently stopped. Start the container to begin a terminal session.
                </div>
              )}

              {terminalHistory.map((item, idx) => (
                <div key={idx} className="whitespace-pre-wrap break-all">
                  {item.type === 'cmd' ? (
                    <div className="flex items-center gap-2 text-slate-200 font-bold mt-1">
                      <span className="text-emerald-400 font-bold">root@{details?.name || 'container'}:~#</span>
                      <span>{item.text}</span>
                    </div>
                  ) : item.type === 'err' ? (
                    <div className="text-rose-400 pl-2">{item.text}</div>
                  ) : item.type === 'system' ? (
                    <div className="text-slate-500 text-[11px] mb-2">{item.text}</div>
                  ) : (
                    <div className="text-slate-300 font-mono pl-1">{item.text}</div>
                  )}
                </div>
              ))}

              {executing && (
                <div className="flex items-center gap-2 text-slate-400 text-xs py-1">
                  <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
                  <span>Executing...</span>
                </div>
              )}

              {/* Seamless Inline CLI Prompt */}
              {isRunning && (
                <form onSubmit={handleRunCommand} className="flex items-center gap-2 pt-1">
                  <span className="text-emerald-400 font-bold text-xs shrink-0 select-none">
                    root@{details?.name || 'container'}:~#
                  </span>
                  <input
                    ref={terminalInputRef}
                    type="text"
                    disabled={executing}
                    value={commandInput}
                    onChange={(e) => setCommandInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="terminal-prompt-input flex-1 bg-transparent text-xs text-slate-100 font-mono border-none outline-none focus:ring-0 p-0 shadow-none ring-0 focus:outline-none"
                    placeholder={executing ? "" : ""}
                    spellCheck={false}
                    autoComplete="off"
                  />
                </form>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Live Logs */}
        {activeSubTab === 'logs' && (
          <div className="flex flex-col h-[540px] rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-inner">
            <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono text-slate-300 font-semibold">Container Logs</span>
                <button
                  onClick={() => setAutoTail(!autoTail)}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition flex items-center gap-1 cursor-pointer ${
                    autoTail 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                  title="Toggle automatic log streaming"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${autoTail ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                  <span>{autoTail ? 'Live Auto-Tail (3s)' : 'Manual Refresh'}</span>
                </button>
              </div>

              {/* Log Search Filter */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Filter logs (e.g. error, warn)..."
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-44"
                />

                <button
                  onClick={() => copyText(logs, 'logs')}
                  className="p-1.5 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  title="Copy logs"
                >
                  {copiedKey === 'logs' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={fetchLogs}
                  disabled={logsLoading}
                  className="p-1.5 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  title="Refresh logs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin text-cyan-400' : ''}`} />
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-0.5 select-text leading-relaxed">
              {(logs || '').split('\n').filter(line => !logFilter || line.toLowerCase().includes(logFilter.toLowerCase())).map((line, idx) => {
                const lower = line.toLowerCase();
                const isErr = lower.includes('error') || lower.includes('fatal') || lower.includes('panic');
                const isWarn = lower.includes('warn');
                return (
                  <div 
                    key={idx} 
                    className={`whitespace-pre-wrap break-all ${
                      isErr 
                        ? 'text-rose-400 bg-rose-500/5 px-1 py-0.5 rounded' 
                        : isWarn 
                          ? 'text-amber-400 bg-amber-500/5 px-1 py-0.5 rounded' 
                          : 'text-slate-300'
                    }`}
                  >
                    {line}
                  </div>
                );
              })}
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
