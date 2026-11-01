import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Terminal,
  ChevronUp,
  Maximize2,
  Minimize2,
  X,
  Copy,
  Check,
  Folder,
  ClipboardPaste,
  Plus,
  Activity,
  Zap,
} from 'lucide-react';
import XTermTab from './XTermTab';

const QUICK_COMMANDS = [
  { label: 'docker ps', cmd: 'docker ps' },
  { label: 'stats', cmd: 'docker stats --no-stream' },
  { label: 'system df', cmd: 'docker system df' },
  { label: 'compose ps', cmd: 'docker compose ps' },
  { label: 'images', cmd: 'docker images' },
];

function Sparkline({ data = [], color = '#22d3ee', height = 24 }) {
  if (!data || data.length < 2) return null;
  const width = 250;
  const step = width / (data.length - 1);
  const points = data
    .map((val, idx) => {
      const clamped = Math.max(0, Math.min(100, val));
      const x = Math.round(idx * step);
      const y = Math.round(height - (clamped / 100) * height);
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg className="w-full overflow-hidden rounded" height={height} viewBox={`0 0 ${width} ${height}`}>
      <polygon points={areaPoints} fill={color} fillOpacity="0.15" />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const DEFAULT_HEIGHT = 288;
const MIN_HEIGHT = 140;

function createInitialTab(id = 'term-1', title = 'Terminal 1', initialCwd = '~') {
  return {
    id,
    title,
    cwd: initialCwd,
  };
}

export default function BottomTerminal({
  isOpen,
  onToggle,
  onClose,
  onGetHostCwdSession,
  onSetHostCwdSession,
  onGetHostHomeDir,
  activeComposeDir = null,
  hostMetrics = null,
  systemInfo = null,
  runningContainersCount = 0,
}) {
  const [homeDir, setHomeDir] = useState('');
  const [tabs, setTabs] = useState([createInitialTab('term-1', 'Terminal 1', '~')]);
  const [activeTabId, setActiveTabId] = useState('term-1');
  const [isMaximized, setIsMaximized] = useState(false);
  const [copied, setCopied] = useState(false);
  const nextTabNumRef = useRef(2);
  const tabRefs = useRef({});

  const [drawerHeight, setDrawerHeight] = useState(() => {
    try {
      const saved = localStorage.getItem('dockit:terminal_height');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_HEIGHT && parsed <= 1600) {
          return parsed;
        }
      }
    } catch (_) {}
    return DEFAULT_HEIGHT;
  });
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);

  const drawerRef = useRef(null);
  const hostResourcesRef = useRef(null);
  const [showHostResources, setShowHostResources] = useState(false);
  const [cpuHistory, setCpuHistory] = useState([15, 20, 25, 22, 28, 35, 41]);
  const [memHistory, setMemHistory] = useState([50, 52, 54, 55, 58, 59, 59]);

  useEffect(() => {
    if (hostMetrics) {
      if (typeof hostMetrics.cpuPercent === 'number') {
        const val = Math.round(Math.max(0, Math.min(100, hostMetrics.cpuPercent)));
        setCpuHistory((prev) => [...prev.slice(-19), val]);
      }
      if (typeof hostMetrics.memoryPercent === 'number') {
        const val = Math.round(Math.max(0, Math.min(100, hostMetrics.memoryPercent)));
        setMemHistory((prev) => [...prev.slice(-19), val]);
      }
    }
  }, [hostMetrics?.cpuPercent, hostMetrics?.memoryPercent]);

  // Close host resources popover on outside click or Escape
  useEffect(() => {
    if (!showHostResources) return;
    const handleClickOutside = (e) => {
      if (hostResourcesRef.current && !hostResourcesRef.current.contains(e.target)) {
        setShowHostResources(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowHostResources(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showHostResources]);

  // Resize sash pointer handlers
  const handleResizeStart = useCallback((e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    setIsDragging(true);

    if (drawerRef.current) {
      const currentRect = drawerRef.current.getBoundingClientRect();
      setDrawerHeight(currentRect.height);
    }
    setIsMaximized(false);

    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleDoubleClickSash = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isMaximized) {
        setIsMaximized(false);
      } else if (drawerHeight !== DEFAULT_HEIGHT) {
        setDrawerHeight(DEFAULT_HEIGHT);
      } else {
        setIsMaximized(true);
      }
    },
    [isMaximized, drawerHeight]
  );

  // Viewport dragging listener
  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!isDraggingRef.current || !drawerRef.current) return;
      const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY);
      if (clientY === undefined) return;

      const drawerRect = drawerRef.current.getBoundingClientRect();
      const newHeight = drawerRect.bottom - clientY;
      const maxHeight = Math.max(MIN_HEIGHT, Math.floor(window.innerHeight * 0.85));
      const clamped = Math.min(Math.max(newHeight, MIN_HEIGHT), maxHeight);

      setDrawerHeight(clamped);
    };

    const handlePointerUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  // Persist user preferred height to localStorage
  useEffect(() => {
    if (!isDragging && drawerHeight) {
      try {
        localStorage.setItem('dockit:terminal_height', drawerHeight.toString());
      } catch (_) {}
    }
  }, [drawerHeight, isDragging]);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0] || createInitialTab('term-1');

  // Fetch initial home directory and initial cwd
  useEffect(() => {
    if (onGetHostHomeDir) {
      onGetHostHomeDir()
        .then((home) => {
          if (home) {
            setHomeDir(home);
            setTabs((prev) =>
              prev.map((t, idx) => (idx === 0 && t.cwd === '~' ? { ...t, cwd: home } : t))
            );
          }
        })
        .catch(() => {});
    }

    if (onGetHostCwdSession) {
      onGetHostCwdSession('term-1')
        .then((dir) => {
          if (dir) {
            setTabs((prev) =>
              prev.map((t) => (t.id === 'term-1' ? { ...t, cwd: dir } : t))
            );
          }
        })
        .catch(() => {});
    }
  }, [isOpen, onGetHostHomeDir, onGetHostCwdSession]);

  const shortenPath = useCallback(
    (path) => {
      if (!path) return '~';
      let p = path;
      if (homeDir && p.startsWith(homeDir)) {
        p = '~' + p.slice(homeDir.length);
        if (p === '') p = '~';
      }
      const parts = p.split('/');
      if (parts.length > 4) {
        return parts[0] + '/…/' + parts.slice(-2).join('/');
      }
      return p;
    },
    [homeDir]
  );

  const refreshCwd = useCallback(
    (tabId) => {
      if (onGetHostCwdSession) {
        onGetHostCwdSession(tabId)
          .then((dir) => {
            if (dir) {
              setTabs((prev) => {
                const current = prev.find((t) => t.id === tabId);
                if (current && current.cwd === dir) return prev;
                return prev.map((t) => (t.id === tabId ? { ...t, cwd: dir } : t));
              });
            }
          })
          .catch(() => {});
      }
    },
    [onGetHostCwdSession]
  );

  const handleCommandExecuted = useCallback(
    (tabId) => {
      refreshCwd(tabId);
    },
    [refreshCwd]
  );

  // Periodically update cwd of active tab
  useEffect(() => {
    if (!isOpen || !activeTabId) return;
    refreshCwd(activeTabId);
    const interval = setInterval(() => {
      refreshCwd(activeTabId);
    }, 3000);
    return () => clearInterval(interval);
  }, [isOpen, activeTabId, refreshCwd]);

  // Add a new terminal tab
  const handleNewTab = useCallback(() => {
    const tabNum = nextTabNumRef.current++;
    const newId = `term-${Date.now()}`;
    const initialCwd = activeTab.cwd || homeDir || '~';
    const newTab = createInitialTab(newId, `Terminal ${tabNum}`, initialCwd);

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);

    if (onSetHostCwdSession) {
      onSetHostCwdSession(newId, initialCwd).catch(() => {});
    }

    setTimeout(() => {
      tabRefs.current[newId]?.focus();
    }, 80);
  }, [activeTab.cwd, homeDir, onSetHostCwdSession]);

  // Close a specific terminal tab
  const handleCloseTab = useCallback(
    (tabIdToClose, e) => {
      if (e) e.stopPropagation();

      if (tabs.length <= 1) {
        // If closing the only tab, clear its screen and reset
        tabRefs.current[tabIdToClose]?.clear();
        return;
      }

      setTabs((prev) => {
        const remaining = prev.filter((t) => t.id !== tabIdToClose);
        if (activeTabId === tabIdToClose) {
          const closedIdx = prev.findIndex((t) => t.id === tabIdToClose);
          const nextActive = remaining[Math.max(0, closedIdx - 1)] || remaining[0];
          if (nextActive) {
            setActiveTabId(nextActive.id);
            setTimeout(() => {
              tabRefs.current[nextActive.id]?.focus();
            }, 50);
          }
        }
        return remaining;
      });
    },
    [tabs.length, activeTabId]
  );

  // Quick Command trigger
  const handleRunQuickCommand = useCallback(
    (cmd) => {
      if (!cmd) return;
      const term = tabRefs.current[activeTabId];
      if (term) {
        term.sendInput(cmd + '\n');
        term.focus();
      }
    },
    [activeTabId]
  );

  // Jump to compose directory
  const handleCdToCompose = useCallback(() => {
    if (!activeComposeDir) return;
    const term = tabRefs.current[activeTabId];
    if (term) {
      term.sendInput(`cd "${activeComposeDir}"\n`);
      term.focus();
      setTimeout(() => refreshCwd(activeTabId), 500);
    }
  }, [activeComposeDir, activeTabId, refreshCwd]);

  // Copy active terminal selection / buffer
  const handleCopy = useCallback(async () => {
    const term = tabRefs.current[activeTabId];
    if (term) {
      await term.copy();
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [activeTabId]);

  // Paste into active terminal
  const handlePaste = useCallback(async () => {
    const term = tabRefs.current[activeTabId];
    if (term) {
      await term.paste();
      term.focus();
    }
  }, [activeTabId]);

  // Clear active terminal screen
  const handleClear = useCallback(() => {
    const term = tabRefs.current[activeTabId];
    if (term) {
      term.clear();
      term.focus();
    }
  }, [activeTabId]);

  return (
    <div className="shrink-0 flex flex-col z-30 select-none">
      {/* Sliding Drawer Container */}
      {isOpen && (
        <div
          ref={drawerRef}
          style={{
            height: isMaximized ? '65vh' : `${drawerHeight}px`,
          }}
          className={`terminal-window border-t border-slate-800 bg-[#0c1017] flex flex-col relative overflow-hidden shadow-2xl font-mono ${
            isDragging ? 'transition-none select-none' : 'transition-[height] duration-200'
          }`}
        >
          {/* Top Resize Sash */}
          <div
            onPointerDown={handleResizeStart}
            onDoubleClick={handleDoubleClickSash}
            className={`terminal-resize-sash group/sash relative w-full h-[4px] cursor-ns-resize z-40 shrink-0 select-none transition-colors duration-150 ${
              isDragging
                ? 'bg-cyan-500 shadow-sm shadow-cyan-500/80'
                : 'bg-slate-800/80 hover:bg-cyan-500/90'
            }`}
            title="Drag to resize terminal (Double-click to reset / toggle maximize)"
          >
            {/* Centered drag handle pill affordance */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-1 rounded-full bg-slate-600 group-hover/sash:bg-cyan-400 transition-colors pointer-events-none" />
            <div className="absolute -top-1.5 -bottom-2 inset-x-0 cursor-ns-resize" />
          </div>

          {/* Drawer Titlebar & Tab Bar */}
          <div className="terminal-titlebar px-3 py-1.5 bg-[#161b22] border-b border-slate-800 flex items-center justify-between text-xs select-none shrink-0 gap-3">
            {/* Tabs Strip with Add Tab Button */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-[65%] min-w-0">
              {tabs.map((tab, idx) => {
                const isActive = tab.id === activeTab.id;
                return (
                  <div
                    key={tab.id}
                    onClick={() => {
                      setActiveTabId(tab.id);
                      setTimeout(() => tabRefs.current[tab.id]?.focus(), 40);
                    }}
                    className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer select-none shrink-0 ${
                      isActive
                        ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                    }`}
                    title={`Tab ${idx + 1} (${tab.title}): ${tab.cwd}`}
                  >
                    <Terminal
                      className={`w-3 h-3 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`}
                    />
                    <span className="font-mono text-[11px] font-semibold">{tab.title}</span>
                    <span className="text-slate-600 text-[10px]">•</span>
                    <span className="font-mono text-[10px] text-slate-400 max-w-[90px] truncate">
                      {shortenPath(tab.cwd)}
                    </span>
                    {tabs.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => handleCloseTab(tab.id, e)}
                        className="p-0.5 ml-0.5 rounded hover:bg-slate-700 hover:text-rose-400 text-slate-500 opacity-60 group-hover:opacity-100 transition cursor-pointer shrink-0"
                        title="Close Tab"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* New Tab Button */}
              <button
                type="button"
                onClick={handleNewTab}
                className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition cursor-pointer flex items-center gap-1 shrink-0 text-[11px] px-1.5 border border-dashed border-slate-700/60 hover:border-cyan-500/50"
                title="New Terminal Tab (Ctrl+Shift+`)"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[10px] font-mono">New Tab</span>
              </button>
            </div>

            {/* Titlebar Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              {activeComposeDir && activeComposeDir !== activeTab.cwd && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCdToCompose();
                  }}
                  className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/50 flex items-center gap-1 transition cursor-pointer"
                  title={`Jump active terminal directory to ${activeComposeDir}`}
                >
                  <Folder className="w-3 h-3 text-cyan-400" />
                  <span className="hidden md:inline">cd to Compose Dir</span>
                </button>
              )}

              <span className="text-[10px] text-slate-400 flex items-center gap-1.5 mr-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                PTY Active
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy();
                }}
                className="terminal-clear-btn p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                title="Copy terminal selection or full buffer (Ctrl+Shift+C)"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePaste();
                }}
                className="terminal-clear-btn p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-cyan-300 transition cursor-pointer"
                title="Paste from clipboard (Ctrl+Shift+V)"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="terminal-clear-btn text-[10px] px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                title="Clear screen (Ctrl+L)"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMaximized(!isMaximized);
                }}
                className="terminal-clear-btn p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                title={isMaximized ? 'Restore Height' : 'Maximize Drawer'}
              >
                {isMaximized ? (
                  <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="terminal-clear-btn p-1 rounded bg-slate-800/80 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition cursor-pointer ml-1"
                title="Close terminal drawer (Ctrl+`)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Diagnostics Command Chips */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#10141d] border-b border-slate-800/80 overflow-x-auto no-scrollbar shrink-0 select-none">
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Zap className="w-2.5 h-2.5 text-cyan-400" />
              Quick:
            </span>
            {QUICK_COMMANDS.map((qc, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleRunQuickCommand(qc.cmd)}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800 hover:border-slate-700 transition cursor-pointer whitespace-nowrap shrink-0"
                title={`Execute "${qc.cmd}" in active terminal`}
              >
                {qc.label}
              </button>
            ))}
          </div>

          {/* Real-time Interactive XTerm Viewport */}
          <div className="flex-1 min-h-0 relative overflow-hidden bg-[#0c1017]">
            {tabs.map((tab) => (
              <XTermTab
                key={tab.id}
                ref={(el) => {
                  if (el) tabRefs.current[tab.id] = el;
                  else delete tabRefs.current[tab.id];
                }}
                tabId={tab.id}
                isActive={tab.id === activeTab.id}
                onCommandExecuted={() => handleCommandExecuted(tab.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Persistent Docked Bottom Bar */}
      <div className="h-7 px-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs select-none">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggle}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
              isOpen
                ? 'bg-cyan-500/20 text-cyan-400 font-semibold border border-cyan-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
            }`}
            title="Toggle Bottom Terminal Drawer (Ctrl+`)"
          >
            <Terminal className="w-3 h-3 text-cyan-400" />
            <span>Terminal</span>
            {tabs.length > 1 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-cyan-300 border border-slate-700 font-mono">
                {tabs.length}
              </span>
            )}
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          </button>

          <span className="text-slate-600">|</span>

          {/* Host Resources Popover Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowHostResources((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-medium transition cursor-pointer font-mono ${
                showHostResources
                  ? 'bg-cyan-500/20 text-cyan-400 font-semibold border border-cyan-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
              title="Host CPU & Memory Resources (Click to toggle details)"
            >
              <Activity className="w-3 h-3 text-cyan-400" />
              <span>
                {hostMetrics
                  ? `CPU: ${Math.round(hostMetrics.cpuPercent || 0)}% • RAM: ${Math.round(hostMetrics.memoryPercent || 0)}%`
                  : 'Host Resources'}
              </span>
              <ChevronUp
                className={`w-3 h-3 transition-transform ${showHostResources ? 'rotate-180 text-cyan-400' : 'text-slate-500'}`}
              />
            </button>

            {/* Host Resources Popover Flyout */}
            {showHostResources && (
              <div
                ref={hostResourcesRef}
                className="absolute bottom-9 left-0 z-50 w-72 p-3 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-800 shadow-2xl space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-150"
              >
                <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800/80">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Host Resources</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                      {hostMetrics?.os || systemInfo?.osType || 'linux'} /{' '}
                      {hostMetrics?.arch || systemInfo?.architecture || 'amd64'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowHostResources(false);
                      }}
                      className="text-slate-500 hover:text-slate-300 p-0.5 rounded cursor-pointer"
                      title="Close"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* RAM utilization */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">RAM</span>
                    <span className="text-slate-200">
                      {hostMetrics?.usedMemory ? (
                        <>
                          <span className="text-cyan-400 font-medium">
                            {(hostMetrics.usedMemory / (1024 * 1024 * 1024)).toFixed(1)}
                          </span>
                          <span className="text-slate-500"> / </span>
                          <span>
                            {(hostMetrics.totalMemory / (1024 * 1024 * 1024)).toFixed(1)} GB
                          </span>
                          <span className="text-slate-400 text-[10px] ml-1">
                            ({Math.round(hostMetrics.memoryPercent)}%)
                          </span>
                        </>
                      ) : systemInfo?.memoryTotal > 0 ? (
                        <span>
                          {(systemInfo.memoryTotal / (1024 * 1024 * 1024)).toFixed(1)} GB Total
                        </span>
                      ) : (
                        <span className="text-slate-400">Normal</span>
                      )}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/60">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        (hostMetrics?.memoryPercent || 0) > 90
                          ? 'bg-rose-500'
                          : (hostMetrics?.memoryPercent || 0) > 75
                          ? 'bg-amber-400'
                          : 'bg-cyan-400'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(0, hostMetrics?.memoryPercent || 0))}%`,
                      }}
                    />
                  </div>
                  <div className="pt-1">
                    <Sparkline data={memHistory} color="#38bdf8" height={22} />
                  </div>
                </div>

                {/* CPU utilization */}
                <div className="space-y-1 pt-1 border-t border-slate-800/60">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">CPU</span>
                    <span className="text-slate-200">
                      {hostMetrics ? (
                        <>
                          <span className="text-emerald-400 font-medium">
                            {Math.round(hostMetrics.cpuPercent || 0)}%
                          </span>
                          {hostMetrics.cpus > 0 && (
                            <span className="text-slate-500 text-[10px] ml-1">
                              ({hostMetrics.cpus} Cores)
                            </span>
                          )}
                        </>
                      ) : systemInfo?.ncpu > 0 ? (
                        <span>{systemInfo.ncpu} Cores</span>
                      ) : (
                        <span className="text-slate-400">Active</span>
                      )}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/60">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        (hostMetrics?.cpuPercent || 0) > 85
                          ? 'bg-rose-500'
                          : (hostMetrics?.cpuPercent || 0) > 60
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(0, hostMetrics?.cpuPercent || 0))}%`,
                      }}
                    />
                  </div>
                  <div className="pt-1">
                    <Sparkline data={cpuHistory} color="#4ade80" height={22} />
                  </div>
                </div>

                {/* Running Containers Footer */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Containers</span>
                  <span className="text-cyan-400 font-semibold">{runningContainersCount} Active</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-500 text-[10px] font-mono">
          <span>Ctrl+` toggle</span>
        </div>
      </div>
    </div>
  );
}
