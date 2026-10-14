import React from 'react';
import { 
  RefreshCw, 
  Terminal, 
  DownloadCloud, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  ChevronDown,
  Search
} from 'lucide-react';

export default function Header({
  activeRuntime = 'docker',
  onSwitchRuntime,
  onRefresh,
  isRefreshing,
  systemInfo,
  onOpenInstaller,
  onOpenCommandPalette
}) {
  return (
    <header className="flex flex-col select-none shrink-0 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      {/* Top Controls Bar */}
      <div className="h-14 px-4 sm:px-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Runtime Selector dropdown */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 shrink-0">
            <button
              onClick={() => onSwitchRuntime('docker')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                activeRuntime === 'docker'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Docker
            </button>
            <button
              onClick={() => onSwitchRuntime('podman')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                activeRuntime === 'podman'
                  ? 'bg-purple-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Podman
            </button>
          </div>

          {/* System info badge */}
          {systemInfo ? (
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 border border-slate-800/80 px-3 py-1 rounded-md whitespace-nowrap shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              <span className="font-medium text-slate-300">{systemInfo.driver || 'Driver'}</span>
              <span className="text-slate-600">•</span>
              <span className="font-mono text-slate-300">{systemInfo.os || 'Linux'} / {systemInfo.arch || 'amd64'}</span>
              <span className="hidden sm:inline text-slate-600">•</span>
              <span className="hidden sm:inline text-slate-300 font-medium">{systemInfo.cpus || 0} CPUs</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-md whitespace-nowrap shrink-0">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Connecting to daemon...</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Install / Setup runtime button */}
          <button
            onClick={onOpenInstaller}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors shadow-xs shrink-0 whitespace-nowrap"
            title="Detect and Install Docker or Podman"
          >
            <DownloadCloud className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="hidden sm:inline">Installer & Engines</span>
          </button>

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-850 rounded-lg border border-slate-800 transition-all disabled:opacity-50 shrink-0 shadow-xs"
            title="Refresh Resources"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Downward Search & Command Palette Bar */}
      <div className="px-4 sm:px-6 pb-2.5 pt-0.5">
        <button
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-cyan-500/50 text-xs text-slate-400 hover:text-slate-200 transition-all shadow-xs group"
          title="Search or Jump to... (Ctrl+K or Cmd+K)"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Search className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors shrink-0" />
            <span className="truncate">Search containers, images, volumes, actions...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center font-mono text-[10px] bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-slate-400 font-semibold shadow-xs shrink-0">
            {typeof navigator !== 'undefined' && navigator.platform?.toLowerCase().includes('mac') ? '⌘K' : 'Ctrl+K'}
          </kbd>
        </button>
      </div>
    </header>
  );
}
