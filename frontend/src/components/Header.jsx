import React from 'react';
import { 
  RefreshCw, 
  Terminal, 
  DownloadCloud, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  ChevronDown,
  Search,
  Minus,
  Square,
  X
} from 'lucide-react';
import { WindowMinimise, WindowToggleMaximise, Quit } from '../../wailsjs/runtime/runtime';

function RestoreIcon({ className = "w-3 h-3" }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4.5 4.5V2.5A1 1 0 015.5 1.5H13.5A1 1 0 0114.5 2.5V10.5A1 1 0 0113.5 11.5H11.5" />
      <rect x="1.5" y="4.5" width="10" height="10" rx="1" />
    </svg>
  );
}

export default function Header({
  activeRuntime = 'docker',
  onSwitchRuntime,
  onRefresh,
  isRefreshing,
  systemInfo,
  onOpenInstaller,
  onOpenCommandPalette,
  isMaximised = false,
  onToggleMaximise
}) {
  const handleMinimise = () => {
    if (typeof WindowMinimise === 'function') WindowMinimise();
    else if (window.runtime?.WindowMinimise) window.runtime.WindowMinimise();
  };

  const handleToggleMaximise = () => {
    if (onToggleMaximise) {
      onToggleMaximise();
    } else if (typeof WindowToggleMaximise === 'function') {
      WindowToggleMaximise();
    } else if (window.runtime?.WindowToggleMaximise) {
      window.runtime.WindowToggleMaximise();
    }
  };

  const handleClose = () => {
    if (typeof Quit === 'function') Quit();
    else if (window.runtime?.Quit) window.runtime.Quit();
  };

  return (
    <header className="flex flex-col select-none shrink-0 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      {/* Top Controls Bar - Draggable in frameless mode */}
      <div 
        onDoubleClick={handleToggleMaximise}
        className="wails-drag h-14 px-4 sm:px-6 flex items-center justify-between gap-3 cursor-default"
      >
        <div className="flex items-center gap-3 shrink-0 wails-no-drag">
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
        </div>

        {/* Spacious, unobstructed draggable title area */}
        <div className="flex-1 h-full flex items-center justify-center pointer-events-none">
          <span className="text-xs font-medium text-slate-600/70 font-mono tracking-wider">
            Dockit
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 wails-no-drag">
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

          {/* Custom Frameless Window Controls */}
          <div className="flex items-center pl-1 sm:pl-1.5 border-l border-slate-800 gap-0.5 sm:gap-1">
            <button
              onClick={handleMinimise}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-md transition-colors"
              title="Minimize"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleToggleMaximise}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-md transition-colors"
              title={isMaximised ? "Restore Down" : "Maximize"}
            >
              {isMaximised ? <RestoreIcon className="w-3 h-3" /> : <Square className="w-3 h-3" />}
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-rose-600 rounded-md transition-colors"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Downward Search & Command Palette Bar */}
      <div className="px-4 sm:px-6 pb-2.5 pt-0.5 wails-no-drag">
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
