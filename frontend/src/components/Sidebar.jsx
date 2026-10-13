import React from 'react';
import { 
  Box, 
  Layers, 
  HardDrive, 
  Network, 
  FileCode2, 
  Globe, 
  Settings,
  ChevronRight,
  ShieldCheck,
  Zap
} from 'lucide-react';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  stats = { runningContainers: 0, totalContainers: 0 },
  activeRuntime = 'docker',
  appVersion = '0.1.0',
  updateAvailable = false,
  onOpenUpdateModal
}) {
  const navItems = [
    { 
      id: 'containers', 
      label: 'Containers', 
      icon: Box, 
      badge: stats.runningContainers > 0 ? `${stats.runningContainers} running` : null,
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    },
    { id: 'images', label: 'Images', icon: Layers },
    { id: 'volumes', label: 'Volumes', icon: HardDrive },
    { id: 'networks', label: 'Networks', icon: Network },
    { id: 'compose', label: 'Compose Projects', icon: FileCode2 },
    { id: 'registry', label: 'Registry Hub', icon: Globe },
    { id: 'settings', label: 'Settings & Setup', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black text-lg">
          D
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-base text-slate-100 tracking-tight">Dockit</span>
            <button
              onClick={onOpenUpdateModal}
              title={updateAvailable ? "New version available! Click to update" : "Dockit version info"}
              className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded font-mono transition-all flex items-center gap-1 ${
                updateAvailable
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 animate-pulse'
                  : 'bg-cyan-950 text-cyan-400 border border-cyan-800/60 hover:bg-cyan-900/50'
              }`}
            >
              v{appVersion.replace(/^v/, '')}
              {updateAvailable && <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>}
            </button>
          </div>
          <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Unified Desktop
          </span>
        </div>
      </div>

      {/* Engine Status Pill */}
      <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-900/40">
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400 font-medium">Engine:</span>
            <span className="font-semibold uppercase tracking-wider text-slate-200">
              {activeRuntime}
            </span>
          </div>
          <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Ready
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/15 to-blue-600/10 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.badge && (
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Bottom Footer */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>Docker & Podman</span>
        </div>
        <span className="text-[11px] text-slate-600">Cross-Platform</span>
      </div>
    </aside>
  );
}
