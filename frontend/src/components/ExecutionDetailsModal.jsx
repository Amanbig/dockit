import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  X, 
  Copy, 
  Check, 
  Layers, 
  Clock, 
  Network, 
  HardDrive, 
  Sliders, 
  ShieldCheck, 
  AlertTriangle,
  Activity,
  Terminal,
  FileCode
} from 'lucide-react';
import { formatDateTime } from './ContainerDetailsView';

export default function ExecutionDetailsModal({
  isOpen,
  onClose,
  details,
  resourceStats
}) {
  const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !details) return null;

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const copyFullJson = () => {
    navigator.clipboard.writeText(JSON.stringify(details, null, 2));
    setCopiedKey('full_json');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isRunning = details.state?.running;
  const isPaused = details.state?.paused;
  const isRestarting = details.state?.restarting;
  const isOOMKilled = details.state?.oomKilled;

  // Calculate container uptime or run duration
  let durationText = '-';
  if (details.state?.startedAt && !details.state.startedAt.startsWith('0001-01-01')) {
    const start = new Date(details.state.startedAt).getTime();
    const end = (details.state.finishedAt && !details.state.finishedAt.startsWith('0001-01-01') && !isRunning)
      ? new Date(details.state.finishedAt).getTime()
      : Date.now();
    
    if (end > start) {
      const diffSec = Math.floor((end - start) / 1000);
      const days = Math.floor(diffSec / 86400);
      const hours = Math.floor((diffSec % 86400) / 3600);
      const minutes = Math.floor((diffSec % 3600) / 60);
      const seconds = diffSec % 60;
      
      const parts = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0) parts.push(`${minutes}m`);
      if (parts.length === 0 || seconds > 0) parts.push(`${seconds}s`);
      durationText = parts.join(' ');
      if (isRunning) durationText += ' (active)';
    }
  }

  return (
    <div 
      className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-750 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base text-slate-100 font-mono truncate">{details.name || details.id?.slice(0, 12)}</h3>
                {isRunning ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Running
                  </span>
                ) : isPaused ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    Paused
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                    Stopped
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">{details.image}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={copyFullJson}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-slate-100 text-xs font-medium border border-slate-700/80 transition cursor-pointer"
              title="Copy complete inspect data as JSON"
            >
              {copiedKey === 'full_json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'full_json' ? 'Copied JSON' : 'Copy JSON'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 text-xs select-text">
          {/* Section 1: Execution & Process State */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-850 pb-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Runtime & Process State
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">PID</span>
                <span className="font-mono text-slate-200 text-sm font-semibold">{details.state?.pid || '-'}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Exit Code</span>
                <span className={`font-mono text-sm font-semibold ${details.state?.exitCode === 0 ? 'text-emerald-400' : details.state?.exitCode ? 'text-rose-400' : 'text-slate-300'}`}>
                  {details.state?.exitCode !== undefined ? details.state.exitCode : '-'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">OOM Killed</span>
                <span className={`font-mono text-sm font-semibold ${isOOMKilled ? 'text-rose-400' : 'text-slate-300'}`}>
                  {isOOMKilled ? 'Yes (Out of Memory)' : 'No'}
                </span>
              </div>
            </div>

            {/* Command Breakdown */}
            <div className="pt-1">
              <span className="text-slate-500 block mb-1 font-semibold">Startup Command:</span>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-cyan-300 break-all select-text">
                {details.command || details.args?.join(' ') || '-'}
              </div>
            </div>
          </div>

          {/* Section 2: Identifiers & Version Details */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-850 pb-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Container Identifiers & Image Versions
            </h4>

            <div className="space-y-2">
              {/* Container ID */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800">
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Full Container ID</span>
                  <span className="font-mono text-slate-200 truncate block">{details.id}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(details.id, 'container_id')}
                  className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition shrink-0 cursor-pointer"
                  title="Copy Container ID"
                >
                  {copiedKey === 'container_id' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Full Image ID */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800">
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Full Image ID</span>
                  <span className="font-mono text-slate-200 truncate block">{details.imageId}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(details.imageId, 'image_id')}
                  className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition shrink-0 cursor-pointer"
                  title="Copy Image ID"
                >
                  {copiedKey === 'image_id' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Platform / Architecture</span>
                  <span className="font-mono text-slate-200">{details.platform || 'linux/amd64'}</span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Restart Count</span>
                  <span className="font-mono text-slate-200">{details.restartCount ?? 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Lifecycle Timestamps & Duration */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-850 pb-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Lifecycle Timestamps & Uptime
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Created</span>
                <span className="font-mono text-slate-200 block text-xs" title={details.created}>
                  {formatDateTime(details.created)}
                </span>
                <span className="text-[10px] text-slate-500 block truncate font-mono mt-0.5">{details.created}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Uptime / Execution Duration</span>
                <span className="font-mono text-cyan-300 block text-xs font-semibold">{durationText}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Started At</span>
                <span className="font-mono text-slate-200 block text-xs" title={details.state?.startedAt}>
                  {formatDateTime(details.state?.startedAt)}
                </span>
                <span className="text-[10px] text-slate-500 block truncate font-mono mt-0.5">{details.state?.startedAt || '-'}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Finished At</span>
                <span className="font-mono text-slate-200 block text-xs" title={details.state?.finishedAt}>
                  {formatDateTime(details.state?.finishedAt)}
                </span>
                <span className="text-[10px] text-slate-500 block truncate font-mono mt-0.5">{details.state?.finishedAt || '-'}</span>
              </div>
            </div>
          </div>

          {/* Section 4: Network & Attached Storage Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Network */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-850 pb-2">
                <Network className="w-4 h-4 text-cyan-400" />
                Network Details
              </h4>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">IP Address:</span>
                  <span className="font-mono text-cyan-400">{details.network?.ipAddress || 'Host / None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Gateway:</span>
                  <span className="font-mono text-slate-300">{details.network?.gateway || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">MAC Address:</span>
                  <span className="font-mono text-slate-300">{details.network?.macAddress || '-'}</span>
                </div>
              </div>
            </div>

            {/* Storage */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-850 pb-2">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                Storage & Mounts ({details.mounts?.length || 0})
              </h4>
              {details.mounts && details.mounts.length > 0 ? (
                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                  {details.mounts.map((m, idx) => (
                    <div key={idx} className="p-1.5 rounded bg-slate-900 border border-slate-800/80 font-mono text-[10px]">
                      <span className="text-cyan-400 font-medium block truncate">{m.destination}</span>
                      <span className="text-slate-500 block truncate">{m.source}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-slate-500 italic block py-2">No persistent mounts attached.</span>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <span className="text-slate-500 text-[11px] font-mono">
            {details.id?.slice(0, 12)} • {details.platform || 'linux/amd64'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition text-xs font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
