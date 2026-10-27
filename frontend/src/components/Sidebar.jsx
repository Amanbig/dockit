import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Box, 
  Layers, 
  HardDrive, 
  Network, 
  FileCode2, 
  Globe, 
  Settings,
  ChevronRight,
  ExternalLink,
  Activity,
  Cpu,
  Sparkles,
  ArrowLeft,
  Copy,
  Check,
  PanelLeft,
  PanelLeftClose
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

const DEFAULT_SIDEBAR_WIDTH = 256;
const MIN_SIDEBAR_WIDTH = 190;
const MAX_SIDEBAR_WIDTH = 480;

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  stats = { runningContainers: 0, totalContainers: 0 },
  activeRuntime = 'docker',
  systemInfo,
  runtimesStatus,
  onOpenInstaller,
  hostMetrics,
  appVersion = '0.8.1',
  updateAvailable = false,
  onOpenUpdateModal,
  navigationStyle = 'sidebar',
  contextualNav = null
}) {
  const [copied, setCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('dockit:sidebar_collapsed') === 'true';
    } catch (_) {
      return false;
    }
  });

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('dockit:sidebar_collapsed', String(next));
      } catch (_) {}
      return next;
    });
  }, []);

  // Listen for Ctrl+B / Cmd+B to toggle sidebar collapsed state
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea') return;
        e.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCollapsed]);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('dockit:sidebar_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_SIDEBAR_WIDTH && parsed <= MAX_SIDEBAR_WIDTH) {
          return parsed;
        }
      }
    } catch (_) {}
    return DEFAULT_SIDEBAR_WIDTH;
  });
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const sidebarRef = useRef(null);

  // Resize sash pointer handlers
  const handleResizeStart = useCallback((e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    setIsDragging(true);

    if (sidebarRef.current) {
      const currentRect = sidebarRef.current.getBoundingClientRect();
      setSidebarWidth(currentRect.width);
    }
  }, []);

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!isDraggingRef.current) return;
      const newWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handlePointerUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
        setSidebarWidth((latestWidth) => {
          try {
            localStorage.setItem('dockit:sidebar_width', String(Math.round(latestWidth)));
          } catch (_) {}
          return latestWidth;
        });
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, []);

  const handleDoubleClickSash = () => {
    setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
    try {
      localStorage.setItem('dockit:sidebar_width', String(DEFAULT_SIDEBAR_WIDTH));
    } catch (_) {}
  };
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
    { id: 'cleanup', label: 'Disk & Cleanup', icon: Sparkles },
    { id: 'compose', label: 'Compose Projects', icon: FileCode2 },
    { id: 'registry', label: 'Registry Hub', icon: Globe },
    { id: 'settings', label: 'Settings & Setup', icon: Settings },
  ];

  return (
    <aside 
      ref={sidebarRef}
      style={{ width: `${isCollapsed ? 58 : sidebarWidth}px` }}
      className={`relative shrink-0 bg-slate-950 border-r border-slate-800 flex flex-col h-full select-none ${
        isDragging ? 'transition-none select-none' : 'transition-[width] duration-150'
      }`}
    >
      {/* Brand Header - Draggable */}
      {isCollapsed ? (
        <div className="wails-drag h-14 flex items-center justify-center border-b border-slate-800 cursor-default px-1">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="wails-no-drag p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition cursor-pointer"
            title="Expand Sidebar (Ctrl+B)"
          >
            <PanelLeft className="w-4 h-4 text-cyan-400" />
          </button>
        </div>
      ) : (
        <div 
          onDoubleClick={() => {
            if (typeof WindowToggleMaximise === 'function') WindowToggleMaximise();
            else if (window.runtime?.WindowToggleMaximise) window.runtime.WindowToggleMaximise();
          }}
          className="wails-drag h-14 flex items-center justify-between px-4 border-b border-slate-800 gap-2 cursor-default min-w-0"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={logoImg}
              alt="Dockit Logo"
              className="w-7 h-7 rounded-xl shadow-lg shadow-cyan-500/15 object-contain pointer-events-none shrink-0"
            />
            <span className="font-bold text-base text-slate-100 tracking-tight truncate">Dockit</span>
            <button
              onClick={onOpenUpdateModal}
              title={updateAvailable ? "New version available! Click to update" : "Dockit version info"}
              className={`wails-no-drag text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded font-mono transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                updateAvailable
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 animate-pulse'
                  : 'bg-cyan-950 text-cyan-400 border border-cyan-800/60 hover:bg-cyan-900/50'
              }`}
            >
              v{appVersion.replace(/^v/, '')}
              {updateAvailable && <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>}
            </button>
          </div>

          <button
            type="button"
            onClick={toggleCollapsed}
            className="wails-no-drag p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer shrink-0"
            title="Collapse Sidebar (Ctrl+B)"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Links */}
      <nav className={`flex-1 overflow-y-auto ${isCollapsed ? 'px-1.5 py-2 space-y-1' : 'px-3 py-3 space-y-1'}`}>
        {contextualNav ? (
          isCollapsed ? (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={contextualNav.onBack}
                className="w-full flex items-center justify-center p-2 rounded-lg text-cyan-400 hover:bg-slate-900 border border-cyan-800/40 transition cursor-pointer"
                title={`Back to ${contextualNav.backLabel || 'All'}`}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="my-1 border-t border-slate-800/60" />

              {contextualNav.subTabs.map((subTab) => {
                const SubIcon = subTab.icon;
                const isActive = contextualNav.activeSubTab === subTab.id;
                return (
                  <button
                    key={subTab.id}
                    type="button"
                    onClick={() => contextualNav.onSelectSubTab(subTab.id)}
                    className={`w-full flex items-center justify-center p-2.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                      isActive
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                    }`}
                    title={subTab.label}
                  >
                    <SubIcon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Contextual Back Button */}
              <button
                type="button"
                onClick={contextualNav.onBack}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:bg-slate-900/90 border border-cyan-800/40 hover:border-cyan-700/60 transition-all cursor-pointer shadow-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Back to {contextualNav.backLabel || 'All'}</span>
              </button>

              {/* Contextual Entity Header Card */}
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/90 space-y-2 shadow-xs overflow-hidden">
                <div className="flex items-center justify-between gap-1.5 min-w-0">
                  <span className="font-bold text-slate-100 truncate text-xs font-mono" title={contextualNav.title}>
                    {contextualNav.title}
                  </span>
                  {contextualNav.badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 font-medium ${contextualNav.badge.color}`}>
                      {contextualNav.badge.text}
                    </span>
                  )}
                </div>
                {contextualNav.subtitle && (
                  <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between gap-1 min-w-0" title={contextualNav.subtitle}>
                    <span className="truncate">{contextualNav.subtitle}</span>
                    {contextualNav.copyText && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard?.writeText(contextualNav.copyText);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="p-0.5 text-slate-500 hover:text-slate-300 transition shrink-0 cursor-pointer"
                        title="Copy"
                      >
                        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                )}

                {/* Contextual Action Buttons in Sidebar Card */}
                {contextualNav.actions && contextualNav.actions.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5 flex-wrap">
                    {contextualNav.actions.map((act, idx) => {
                      const ActIcon = act.icon;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={act.onClick}
                          disabled={act.disabled}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer disabled:opacity-50 ${
                            act.variant === 'danger'
                              ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30'
                              : act.variant === 'warning'
                              ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30'
                              : act.variant === 'success'
                              ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                          }`}
                          title={act.title || act.label}
                        >
                          {ActIcon && <ActIcon className="w-3 h-3" />}
                          {act.label && <span>{act.label}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Contextual Subtabs */}
              <div className="space-y-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 py-1">
                  Navigation
                </div>
                {contextualNav.subTabs.map((subTab) => {
                  const SubIcon = subTab.icon;
                  const isActive = contextualNav.activeSubTab === subTab.id;
                  return (
                    <button
                      key={subTab.id}
                      type="button"
                      onClick={() => contextualNav.onSelectSubTab(subTab.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-cyan-500/15 to-blue-600/10 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10 font-semibold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <SubIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                        <span className="truncate">{subTab.label}</span>
                      </div>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )
        ) : (
          isCollapsed ? (
            navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-center p-2.5 rounded-lg text-sm font-medium transition cursor-pointer relative ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                  }`}
                  title={item.label}
                >
                  <Icon className="w-4 h-4" />
                  {item.badge && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm"></span>
                  )}
                </button>
              );
            })
          ) : (
            navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
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
            })
          )
        )}
      </nav>

      {/* Bottom Footer: GitHub Repository & Releases */}
      <div className={`${isCollapsed ? 'p-1.5' : 'p-3'} border-t border-slate-800 space-y-2`}>
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
          className={`w-full flex items-center rounded-lg bg-slate-900/50 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 text-xs text-slate-400 hover:text-slate-200 transition-all group shadow-xs cursor-pointer ${
            isCollapsed ? 'p-2 justify-center' : 'px-2.5 py-1.5 justify-between gap-2'
          }`}
          title={`GitHub: Amanbig/dockit (v${appVersion})`}
        >
          {isCollapsed ? (
            <GithubIcon className="w-4 h-4 text-slate-400 group-hover:text-cyan-400" />
          ) : (
            <>
              <div className="flex items-center gap-1.5 min-w-0">
                <GithubIcon className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                <span className="font-medium text-slate-300 group-hover:text-slate-100 text-[11px] shrink-0">GitHub</span>
                {sidebarWidth >= 200 && (
                  <>
                    <span className="text-slate-600 text-[10px] shrink-0">•</span>
                    <span className="text-[10px] font-mono text-slate-500 group-hover:text-slate-400 truncate">
                      Amanbig/dockit
                    </span>
                  </>
                )}
              </div>
              <ExternalLink className="w-3 h-3 shrink-0 text-slate-500 group-hover:text-cyan-400 transition-colors" />
            </>
          )}
        </button>
      </div>

      {/* VS Code-Style Right Resize Sash (only when expanded) */}
      {!isCollapsed && (
        <div
          onPointerDown={handleResizeStart}
          onDoubleClick={handleDoubleClickSash}
          className={`sidebar-resize-sash group/sash absolute top-0 bottom-0 -right-[2px] w-[3px] cursor-ew-resize z-40 select-none transition-colors duration-150 ${
            isDragging
              ? 'bg-cyan-500 shadow-sm shadow-cyan-500/80'
              : 'bg-transparent hover:bg-cyan-500/90'
          }`}
          title="Drag to resize sidebar (Double-click to reset)"
        >
          {/* Expanded invisible hit area for effortless grabbing */}
          <div className="absolute -left-1.5 -right-1.5 inset-y-0 cursor-ew-resize" />
        </div>
      )}
    </aside>
  );
}
