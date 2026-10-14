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
    <header className="h-16 bg-slate-950/80 backdrop-blur border-b border-slate-800 px-6 flex items-center justify-between select-none">
      <div className="flex items-center gap-4">
        {/* Runtime Selector dropdown */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1">
          <button
            onClick={() => onSwitchRuntime('docker')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeRuntime === 'docker'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Docker
          </button>
          <button
            onClick={() => onSwitchRuntime('podman')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeRuntime === 'podman'
                ? 'bg-purple-500 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Podman
          </button>
        </div>

        {/* System info badge */}
        {systemInfo ? (
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 border border-slate-800/80 px-3 py-1.5 rounded-md">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{systemInfo.driver || 'Driver'}</span>
            <span className="text-slate-600">•</span>
            <span className="font-mono">{systemInfo.os || 'Linux'} / {systemInfo.arch || 'amd64'}</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300 font-medium">{systemInfo.cpus || 0} CPUs</span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-md">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Connecting to daemon...</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-850 hover:border-slate-700 text-xs text-slate-400 hover:text-slate-200 transition-all shadow-sm w-44 lg:w-56"
          title="Search or Jump to... (Ctrl+K or Cmd+K)"
        >
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <span className="flex-1 text-left truncate">Search or jump...</span>
          <kbd className="font-mono text-[10px] bg-slate-800/80 border border-slate-700/80 px-1.5 py-0.5 rounded text-slate-400">
            {typeof navigator !== 'undefined' && navigator.platform?.toLowerCase().includes('mac') ? '⌘K' : 'Ctrl+K'}
          </kbd>
        </button>

        {/* Install / Setup runtime button */}
        <button
          onClick={onOpenInstaller}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
          title="Detect and Install Docker or Podman"
        >
          <DownloadCloud className="w-3.5 h-3.5 text-cyan-400" />
          <span>Installer & Engines</span>
        </button>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-850 rounded-lg border border-slate-800 transition-all disabled:opacity-50"
          title="Refresh Resources"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
        </button>
      </div>
    </header>
  );
}
