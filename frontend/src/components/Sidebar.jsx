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
  Zap,
  ExternalLink
} from 'lucide-react';
import { BrowserOpenURL, WindowToggleMaximise } from '../../wailsjs/runtime/runtime';

import logoImg from '../assets/images/logo.png';

function GithubIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
    </svg>
  );
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  stats = { runningContainers: 0, totalContainers: 0 },
  activeRuntime = 'docker',
  systemInfo,
  appVersion = '0.4.0',
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
      {/* Brand Header - Draggable */}
      <div 
        onDoubleClick={() => {
          if (typeof WindowToggleMaximise === 'function') WindowToggleMaximise();
          else if (window.runtime?.WindowToggleMaximise) window.runtime.WindowToggleMaximise();
        }}
        className="wails-drag h-14 flex items-center px-5 border-b border-slate-800 gap-3 cursor-default"
      >
        <img
          src={logoImg}
          alt="Dockit Logo"
          className="w-8 h-8 rounded-xl shadow-lg shadow-cyan-500/15 object-contain pointer-events-none"
        />
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-base text-slate-100 tracking-tight">Dockit</span>
            <button
              onClick={onOpenUpdateModal}
              title={updateAvailable ? "New version available! Click to update" : "Dockit version info"}
              className={`wails-no-drag text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded font-mono transition-all flex items-center gap-1 ${
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

      {/* Engine & Environment Status */}
      <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-900/40 space-y-1.5">
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs shadow-xs">
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

        {systemInfo && (
          <div className="flex items-center justify-between px-2.5 py-1 rounded bg-slate-950/60 border border-slate-800/60 text-[10px] text-slate-400 font-mono">
            <span className="truncate">{systemInfo.driver || 'Driver'}</span>
            <span className="text-slate-600">•</span>
            <span>{systemInfo.os || 'Linux'} / {systemInfo.arch || 'amd64'}</span>
            {systemInfo.cpus ? (
              <>
                <span className="text-slate-600">•</span>
                <span>{systemInfo.cpus} CPUs</span>
              </>
            ) : null}
          </div>
        )}
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

      {/* Bottom Footer: GitHub Repository & Releases */}
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={() => {
            const url = 'https://github.com/Amanbig/dockit';
            if (typeof BrowserOpenURL === 'function') {
              BrowserOpenURL(url);
            } else if (window.runtime?.BrowserOpenURL) {
              window.runtime.BrowserOpenURL(url);
            } else {
              window.open(url, '_blank');
            }
          }}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 text-xs text-slate-400 hover:text-slate-200 transition-all group shadow-xs cursor-pointer"
          title="Open Dockit on GitHub (Source, Issues, Releases)"
        >
          <div className="flex items-center gap-2.5">
            <GithubIcon className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
            <span className="font-medium text-slate-300 group-hover:text-slate-100">GitHub</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500 group-hover:text-slate-300">
            <span className="text-[10px] font-mono">Amanbig/dockit</span>
            <ExternalLink className="w-3 h-3 group-hover:text-cyan-400 transition-colors" />
          </div>
        </button>
      </div>
    </aside>
  );
}
