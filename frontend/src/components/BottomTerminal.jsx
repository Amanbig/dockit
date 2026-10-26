import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Terminal, 
  ChevronUp, 
  ChevronDown, 
  Maximize2, 
  Minimize2, 
  X, 
  RefreshCw, 
  Trash2, 
  Copy, 
  Check, 
  Folder,
  Square,
  ClipboardPaste,
  Plus,
  Activity,
  Cpu
} from 'lucide-react';

const MAX_HISTORY = 150;
const MAX_CMD_HISTORY = 100;
const MAX_OUTPUT_CHARS = 100000;
const DEFAULT_HEIGHT = 288;
const MIN_HEIGHT = 140;

function truncateText(str, max = MAX_OUTPUT_CHARS) {
  if (!str || typeof str !== 'string') return '';
  if (str.length <= max) return str;
  return str.slice(0, max) + '\n\n[...output truncated to 100,000 characters to conserve memory...]';
}

const getClipboardText = async () => {
  try {
    if (typeof window !== 'undefined' && window.runtime?.ClipboardGetText) {
      const text = await window.runtime.ClipboardGetText();
      if (text) return text;
    }
  } catch (_) {}

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
      const text = await navigator.clipboard.readText();
      if (text) return text;
    }
  } catch (_) {}

  return '';
};

function createInitialTab(id = 'term-1', title = 'Terminal 1', initialCwd = '~') {
  return {
    id,
    title,
    cwd: initialCwd,
    history: [
      {
        type: 'system',
        text: 'Dockit Host Terminal\nType any command or "clear" to clear screen.'
      }
    ],
    commandInput: '',
    executing: false,
    cmdHistory: [],
    historyIndex: -1
  };
}

export default function BottomTerminal({
  isOpen,
  onToggle,
  onClose,
  onExecHostCommand,
  onExecHostCommandSession,
  onGetHostCwd,
  onGetHostCwdSession,
  onSetHostCwd,
  onSetHostCwdSession,
  onCancelHostCommand,
  onCancelHostCommandSession,
  onCloseHostTerminalSession,
  onGetHostHomeDir,
  activeComposeDir = null,
  hostMetrics = null,
  systemInfo = null,
  runningContainersCount = 0
}) {
  const [homeDir, setHomeDir] = useState('');
  const [tabs, setTabs] = useState([createInitialTab('term-1', 'Terminal 1', '~')]);
  const [activeTabId, setActiveTabId] = useState('term-1');
  const [isMaximized, setIsMaximized] = useState(false);
  const [copied, setCopied] = useState(false);
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

  const terminalScrollRef = useRef(null);
  const inputRef = useRef(null);
  const drawerRef = useRef(null);
  const hostResourcesRef = useRef(null);
  const [showHostResources, setShowHostResources] = useState(false);

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

  const handleDoubleClickSash = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isMaximized) {
      setIsMaximized(false);
    } else if (drawerHeight !== DEFAULT_HEIGHT) {
      setDrawerHeight(DEFAULT_HEIGHT);
    } else {
      setIsMaximized(true);
    }
  }, [isMaximized, drawerHeight]);

  // Window listeners for responsive dragging across the viewport
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

  // Persist user preferred height to localStorage when dragging settles
  useEffect(() => {
    if (!isDragging && drawerHeight) {
      try {
        localStorage.setItem('dockit:terminal_height', drawerHeight.toString());
      } catch (_) {}
    }
  }, [drawerHeight, isDragging]);

  // Active Tab object helper
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0] || createInitialTab('term-1');

  const updateTab = useCallback((tabId, updater) => {
    setTabs((prevTabs) =>
      prevTabs.map((t) => {
        if (t.id !== tabId) return t;
        const updates = typeof updater === 'function' ? updater(t) : updater;
        return { ...t, ...updates };
      })
    );
  }, []);

  const appendTabHistory = useCallback((tabId, entry) => {
    setTabs((prevTabs) =>
      prevTabs.map((t) => {
        if (t.id !== tabId) return t;
        const next = [...t.history, entry];
        return {
          ...t,
          history: next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next
        };
      })
    );
  }, []);

  const appendTabCmdHistory = useCallback((tabId, cmd) => {
    setTabs((prevTabs) =>
      prevTabs.map((t) => {
        if (t.id !== tabId) return t;
        const next = [...t.cmdHistory, cmd];
        return {
          ...t,
          cmdHistory: next.length > MAX_CMD_HISTORY ? next.slice(-MAX_CMD_HISTORY) : next
        };
      })
    );
  }, []);

  // Fetch initial home directory and initial cwd on mount or open
  useEffect(() => {
    if (onGetHostHomeDir) {
      onGetHostHomeDir()
        .then((home) => {
          if (home) {
            setHomeDir(home);
            setTabs((prevTabs) =>
              prevTabs.map((t, idx) => (idx === 0 && t.cwd === '~' ? { ...t, cwd: home } : t))
            );
          }
        })
        .catch(() => {});
    }

    if (onGetHostCwdSession) {
      onGetHostCwdSession('term-1')
        .then((dir) => {
          if (dir) {
            updateTab('term-1', { cwd: dir });
          }
        })
        .catch(() => {});
    } else if (onGetHostCwd) {
      onGetHostCwd()
        .then((dir) => {
          if (dir) {
            updateTab('term-1', { cwd: dir });
          }
        })
        .catch(() => {});
    }
  }, [isOpen, onGetHostHomeDir, onGetHostCwd, onGetHostCwdSession, updateTab]);

  // Auto-scroll terminal scroll area when active tab's history updates or tab changes
  useEffect(() => {
    if (isOpen && terminalScrollRef.current) {
      terminalScrollRef.current.scrollTop = terminalScrollRef.current.scrollHeight;
    }
  }, [activeTab.history, activeTab.executing, isOpen, activeTabId]);

  // Auto-focus input when terminal drawer opens or active tab switches
  useEffect(() => {
    if (isOpen && !activeTab.executing) {
      setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 50);
    }
  }, [isOpen, activeTabId, activeTab.executing]);

  // Auto-resize input textarea to match content height up to max-height
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 160)}px`;
    }
  }, [activeTab.commandInput, activeTabId]);

  const shortenPath = useCallback((path) => {
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
  }, [homeDir]);

  // Add a new terminal tab
  const handleNewTab = useCallback(() => {
    const newId = `term-${Date.now()}`;
    const newIndex = tabs.length + 1;
    const initialCwd = activeTab.cwd || homeDir || '~';
    const newTab = createInitialTab(newId, `Terminal ${newIndex}`, initialCwd);

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);

    if (onSetHostCwdSession) {
      onSetHostCwdSession(newId, initialCwd).catch(() => {});
    }

    setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 60);
  }, [tabs.length, activeTab.cwd, homeDir, onSetHostCwdSession]);

  // Close a specific terminal tab
  const handleCloseTab = useCallback((tabIdToClose, e) => {
    if (e) e.stopPropagation();

    if (tabs.length <= 1) {
      // If closing the only tab, clear its screen and reset
      updateTab(tabIdToClose, {
        history: [
          {
            type: 'system',
            text: 'Dockit Host Terminal\nType any command or "clear" to clear screen.'
          }
        ],
        commandInput: '',
        historyIndex: -1
      });
      return;
    }

    // Terminate session on backend
    if (onCloseHostTerminalSession) {
      onCloseHostTerminalSession(tabIdToClose);
    } else if (onCancelHostCommandSession) {
      onCancelHostCommandSession(tabIdToClose);
    }

    setTabs((prevTabs) => {
      const nextTabs = prevTabs.filter((t) => t.id !== tabIdToClose);
      if (activeTabId === tabIdToClose) {
        const closedIdx = prevTabs.findIndex((t) => t.id === tabIdToClose);
        const nextActive = nextTabs[Math.max(0, closedIdx - 1)] || nextTabs[0];
        if (nextActive) setActiveTabId(nextActive.id);
      }
      return nextTabs;
    });

    setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 50);
  }, [tabs.length, activeTabId, onCloseHostTerminalSession, onCancelHostCommandSession, updateTab]);

  // Cancel currently running command in the active or specified tab
  const handleCancelCommand = useCallback(async (tabId = activeTab.id) => {
    try {
      if (onCancelHostCommandSession) {
        await onCancelHostCommandSession(tabId);
      } else if (onCancelHostCommand) {
        await onCancelHostCommand();
      }
      appendTabHistory(tabId, { type: 'err', text: '^C (command canceled)' });
    } catch (_) {}
    updateTab(tabId, { executing: false });
    setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 40);
  }, [activeTab.id, onCancelHostCommandSession, onCancelHostCommand, appendTabHistory, updateTab]);

  // Paste handler into active tab command input
  const handlePasteToInput = useCallback(async () => {
    const text = await getClipboardText();
    if (!text) return;
    const currentTabId = activeTab.id;

    if (inputRef.current) {
      inputRef.current.focus({ preventScroll: true });
      const el = inputRef.current;
      const start = el.selectionStart ?? activeTab.commandInput.length;
      const end = el.selectionEnd ?? activeTab.commandInput.length;
      const updated = activeTab.commandInput.slice(0, start) + text + activeTab.commandInput.slice(end);
      updateTab(currentTabId, { commandInput: updated });
      setTimeout(() => {
        el.setSelectionRange(start + text.length, start + text.length);
        el.focus({ preventScroll: true });
      }, 10);
    } else {
      updateTab(currentTabId, (prev) => ({ commandInput: prev.commandInput + text }));
      setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 30);
    }
  }, [activeTab.id, activeTab.commandInput, updateTab]);

  // Global keyboard shortcuts: Ctrl+C, Ctrl+V, Ctrl+Shift+V, Ctrl+Shift+`, Alt+[1-9]
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDownGlobal = (e) => {
      // Hotkey: Ctrl+Shift+` to create a new tab
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === '`' || e.key === '~')) {
        e.preventDefault();
        handleNewTab();
        return;
      }

      // Hotkey: Alt+[1-9] to switch between tabs
      if (e.altKey && e.key >= '1' && e.key <= '9') {
        const targetIdx = parseInt(e.key, 10) - 1;
        if (tabs[targetIdx]) {
          e.preventDefault();
          setActiveTabId(tabs[targetIdx].id);
          setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 40);
          return;
        }
      }

      // Ctrl+V or Ctrl+Shift+V handling
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        if (
          drawerRef.current?.contains(document.activeElement) ||
          document.activeElement === inputRef.current
        ) {
          if (e.shiftKey || document.activeElement !== inputRef.current) {
            e.preventDefault();
            handlePasteToInput();
            return;
          }
        }
      }

      // Ctrl+C handling
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        const selection = window.getSelection()?.toString();
        if (selection && selection.length > 0) {
          return;
        }

        if (activeTab.executing) {
          e.preventDefault();
          handleCancelCommand(activeTab.id);
          return;
        }

        if (
          drawerRef.current?.contains(document.activeElement) ||
          document.activeElement === inputRef.current
        ) {
          e.preventDefault();
          if (activeTab.commandInput) {
            appendTabHistory(activeTab.id, {
              type: 'cmd',
              text: `${activeTab.commandInput}^C`,
              cwd: activeTab.cwd
            });
            updateTab(activeTab.id, { commandInput: '' });
          } else {
            appendTabHistory(activeTab.id, { type: 'cmd', text: '^C', cwd: activeTab.cwd });
          }
          setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 30);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDownGlobal);
    return () => window.removeEventListener('keydown', handleKeyDownGlobal);
  }, [
    isOpen,
    tabs,
    activeTab.id,
    activeTab.executing,
    activeTab.commandInput,
    activeTab.cwd,
    handleCancelCommand,
    handlePasteToInput,
    handleNewTab,
    appendTabHistory,
    updateTab
  ]);

  const handleRunCommand = async (e) => {
    if (e) e.preventDefault();
    const currentTabId = activeTab.id;
    const cmdStr = activeTab.commandInput.trim();
    if (!cmdStr || activeTab.executing) return;

    if (cmdStr.toLowerCase() === 'clear') {
      updateTab(currentTabId, {
        history: [],
        commandInput: '',
        historyIndex: -1
      });
      appendTabCmdHistory(currentTabId, 'clear');
      return;
    }

    updateTab(currentTabId, {
      executing: true,
      commandInput: '',
      historyIndex: -1
    });
    appendTabHistory(currentTabId, { type: 'cmd', text: cmdStr, cwd: activeTab.cwd });
    appendTabCmdHistory(currentTabId, cmdStr);

    try {
      let res = null;
      if (onExecHostCommandSession) {
        res = await onExecHostCommandSession(currentTabId, cmdStr);
      } else if (onExecHostCommand) {
        res = await onExecHostCommand(cmdStr);
      }

      if (res) {
        if (res.cwd) {
          updateTab(currentTabId, { cwd: res.cwd });
        }
        if (res.output) {
          appendTabHistory(currentTabId, { type: 'out', text: truncateText(res.output) });
        }
        if (res.error) {
          appendTabHistory(currentTabId, { type: 'err', text: truncateText(res.error) });
        }
      }
    } catch (err) {
      appendTabHistory(currentTabId, { type: 'err', text: `Execution failed: ${err}` });
    } finally {
      updateTab(currentTabId, { executing: false });
      setTimeout(() => {
        if (activeTabId === currentTabId) {
          inputRef.current?.focus({ preventScroll: true });
        }
      }, 40);
    }
  };

  const handleKeyDown = (e) => {
    // Ctrl + Shift + V on input element
    if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
      if (e.shiftKey) {
        e.preventDefault();
        handlePasteToInput();
        return;
      }
    }

    // Ctrl + C on input element
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      const selection = window.getSelection()?.toString();
      if (selection && selection.length > 0) {
        return;
      }
      e.preventDefault();
      if (activeTab.executing) {
        handleCancelCommand(activeTab.id);
      } else {
        if (activeTab.commandInput) {
          appendTabHistory(activeTab.id, {
            type: 'cmd',
            text: `${activeTab.commandInput}^C`,
            cwd: activeTab.cwd
          });
          updateTab(activeTab.id, { commandInput: '' });
        }
      }
      return;
    }

    // Enter key: Execute command or insert newline (Shift+Enter or continuation backslash '\')
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter creates a new line in textarea naturally
        return;
      }

      // Check if command ends with line continuation backslash '\'
      const textBeforeCursor = activeTab.commandInput.slice(0, e.target.selectionStart || 0);
      if (textBeforeCursor.trimEnd().endsWith('\\')) {
        // Allow newline insertion for multi-line continuation
        return;
      }

      // Normal Enter: execute the command
      e.preventDefault();
      handleRunCommand();
      return;
    }

    // Arrow Up / Down command history navigation
    if (e.key === 'ArrowUp') {
      // Only navigate history if cursor is on the first line
      const textBeforeCursor = activeTab.commandInput.slice(0, e.target.selectionStart || 0);
      if (textBeforeCursor.includes('\n')) {
        return; // Allow moving cursor up within multi-line textarea
      }

      e.preventDefault();
      if (activeTab.cmdHistory.length === 0) return;
      const nextIdx =
        activeTab.historyIndex === -1
          ? activeTab.cmdHistory.length - 1
          : Math.max(0, activeTab.historyIndex - 1);
      updateTab(activeTab.id, {
        historyIndex: nextIdx,
        commandInput: activeTab.cmdHistory[nextIdx] || ''
      });
    } else if (e.key === 'ArrowDown') {
      // Only navigate history if cursor is on the last line
      const textAfterCursor = activeTab.commandInput.slice(e.target.selectionEnd || 0);
      if (textAfterCursor.includes('\n')) {
        return; // Allow moving cursor down within multi-line textarea
      }

      e.preventDefault();
      if (activeTab.historyIndex === -1) return;
      const nextIdx = activeTab.historyIndex + 1;
      if (nextIdx >= activeTab.cmdHistory.length) {
        updateTab(activeTab.id, {
          historyIndex: -1,
          commandInput: ''
        });
      } else {
        updateTab(activeTab.id, {
          historyIndex: nextIdx,
          commandInput: activeTab.cmdHistory[nextIdx] || ''
        });
      }
    }
  };

  const handleCopyHistory = () => {
    const text = activeTab.history
      .map((item) => (item.type === 'cmd' ? `$ ${item.text}` : item.text))
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCdToCompose = async () => {
    if (!activeComposeDir) return;
    const currentTabId = activeTab.id;
    try {
      if (onSetHostCwdSession) {
        await onSetHostCwdSession(currentTabId, activeComposeDir);
      } else if (onSetHostCwd) {
        await onSetHostCwd(activeComposeDir);
      }
      updateTab(currentTabId, { cwd: activeComposeDir });
      appendTabHistory(currentTabId, {
        type: 'system',
        text: `Switched working directory to: ${activeComposeDir}`
      });
      setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 40);
    } catch (err) {
      appendTabHistory(currentTabId, { type: 'err', text: `Failed to cd: ${err}` });
    }
  };

  return (
    <div className="shrink-0 flex flex-col z-30 select-none">
      {/* Sliding Drawer Container */}
      {isOpen && (
        <div
          ref={drawerRef}
          style={{
            height: isMaximized ? '65vh' : `${drawerHeight}px`
          }}
          className={`terminal-window border-t border-slate-800 bg-[#0c1017] flex flex-col relative overflow-hidden shadow-2xl font-mono ${
            isDragging ? 'transition-none select-none' : 'transition-[height] duration-200'
          }`}
        >
          {/* VS Code-Style Top Resize Sash */}
          <div
            onPointerDown={handleResizeStart}
            onDoubleClick={handleDoubleClickSash}
            className={`terminal-resize-sash group/sash relative w-full h-[2px] cursor-ns-resize z-40 shrink-0 select-none transition-colors duration-150 ${
              isDragging
                ? 'bg-cyan-500 shadow-sm shadow-cyan-500/80'
                : 'bg-slate-800 hover:bg-cyan-500/90'
            }`}
            title="Drag to resize terminal (Double-click to reset / toggle maximize)"
          >
            {/* Expanded invisible hit area for effortless grabbing */}
            <div className="absolute -top-1 -bottom-1.5 inset-x-0 cursor-ns-resize" />
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
                      setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 40);
                    }}
                    className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer select-none shrink-0 ${
                      isActive
                        ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                    }`}
                    title={`Tab ${idx + 1} (${tab.title}): ${tab.cwd}`}
                  >
                    <Terminal className={`w-3 h-3 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <span className="font-mono text-[11px] font-semibold">{tab.title}</span>
                    <span className="text-slate-600 text-[10px]">•</span>
                    <span className="font-mono text-[10px] text-slate-400 max-w-[90px] truncate">
                      {shortenPath(tab.cwd)}
                    </span>
                    {tab.executing && (
                      <RefreshCw className="w-2.5 h-2.5 animate-spin text-amber-400 ml-0.5 shrink-0" />
                    )}
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

              {activeTab.executing ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelCommand(activeTab.id);
                  }}
                  className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-semibold transition cursor-pointer flex items-center gap-1 shadow-xs mr-1"
                  title="Stop command (Ctrl+C)"
                >
                  <Square className="w-2.5 h-2.5 fill-current" />
                  <span>Stop (Ctrl+C)</span>
                </button>
              ) : (
                <span className="text-[10px] text-slate-400 flex items-center gap-1.5 mr-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Ready
                </span>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyHistory();
                }}
                className="terminal-clear-btn p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                title="Copy terminal session"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePasteToInput();
                }}
                className="terminal-clear-btn p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-cyan-300 transition cursor-pointer"
                title="Paste from clipboard (Ctrl+V / Ctrl+Shift+V)"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateTab(activeTab.id, { history: [] });
                }}
                className="terminal-clear-btn text-[10px] px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                title="Clear screen (or type 'clear')"
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
                title={isMaximized ? "Restore Height" : "Maximize Drawer"}
              >
                {isMaximized ? <Minimize2 className="w-3.5 h-3.5 text-cyan-400" /> : <Maximize2 className="w-3.5 h-3.5" />}
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

          {/* Drawer Output Scroll Body for Active Tab */}
          <div
            ref={terminalScrollRef}
            onClick={() => {
              const selection = window.getSelection()?.toString();
              if (!selection && !activeTab.executing) {
                inputRef.current?.focus({ preventScroll: true });
              }
            }}
            className="flex-1 p-3.5 overflow-y-auto text-xs space-y-1.5 select-text leading-relaxed cursor-text"
          >
            {activeTab.history.map((item, idx) => (
              <div key={idx} className="whitespace-pre-wrap break-all">
                {item.type === 'cmd' ? (
                  <div className="flex items-start gap-2 text-slate-200 font-bold mt-1">
                    <span className="text-emerald-400 font-bold text-xs shrink-0 select-none pt-0.5">
                      host:{shortenPath(item.cwd || activeTab.cwd)}$
                    </span>
                    <span className="whitespace-pre-wrap break-all flex-1 font-mono leading-5">{item.text}</span>
                  </div>
                ) : item.type === 'err' ? (
                  <div className="text-rose-400 pl-2 font-mono whitespace-pre-wrap leading-relaxed">{item.text}</div>
                ) : item.type === 'system' ? (
                  <div className="text-slate-500 text-[11px] mb-2">{item.text}</div>
                ) : (
                  <div className="text-slate-300 font-mono pl-1">{item.text}</div>
                )}
              </div>
            ))}

            {/* In-Flight Execution State or Active Shell Prompt for Active Tab */}
            {activeTab.executing ? (
              <div className="flex items-center gap-3 py-2 text-slate-300 text-xs font-mono">
                <span className="flex items-center gap-2 text-amber-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing command in {activeTab.title}...</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleCancelCommand(activeTab.id)}
                  className="px-2.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 shadow-xs"
                  title="Stop command execution (Ctrl+C)"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Stop (Ctrl+C)</span>
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-2 pt-1">
                <span className="text-emerald-400 font-bold text-xs shrink-0 select-none pt-0.5">
                  host:{shortenPath(activeTab.cwd)}$
                </span>
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={activeTab.commandInput}
                  onChange={(e) => updateTab(activeTab.id, { commandInput: e.target.value })}
                  onKeyDown={handleKeyDown}
                  className="terminal-prompt-input flex-1 bg-transparent text-xs text-slate-100 font-mono border-none outline-none focus:ring-0 p-0 shadow-none ring-0 focus:outline-none resize-none leading-5 overflow-y-auto max-h-40"
                  placeholder="type host command... (Shift+Enter for newline)"
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
            )}
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
            <span className={`w-1.5 h-1.5 rounded-full ${activeTab.executing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></span>
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
              <ChevronUp className={`w-3 h-3 transition-transform ${showHostResources ? 'rotate-180 text-cyan-400' : 'text-slate-500'}`} />
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
                      {hostMetrics?.os || systemInfo?.osType || 'linux'} / {hostMetrics?.arch || systemInfo?.architecture || 'amd64'}
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
                          <span>{(hostMetrics.totalMemory / (1024 * 1024 * 1024)).toFixed(1)} GB</span>
                          <span className="text-slate-400 text-[10px] ml-1">
                            ({Math.round(hostMetrics.memoryPercent)}%)
                          </span>
                        </>
                      ) : systemInfo?.memoryTotal > 0 ? (
                        <span>{(systemInfo.memoryTotal / (1024 * 1024 * 1024)).toFixed(1)} GB Total</span>
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
                        width: `${Math.min(100, Math.max(5, hostMetrics?.memoryPercent || 25))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* CPU & Running Containers */}
                <div className="flex items-center justify-between text-[11px] font-mono pt-0.5">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Cpu className="w-3.5 h-3.5 text-slate-400" />
                    <span>{hostMetrics?.cpus || systemInfo?.cpus || '8'} Cores</span>
                  </div>
                  {hostMetrics?.cpuPercent > 0 ? (
                    <span className="text-cyan-400 text-[10px] bg-cyan-950/60 border border-cyan-800/50 px-1.5 py-0.5 rounded font-medium">
                      {Math.round(hostMetrics.cpuPercent)}% CPU
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span>{runningContainersCount || 0} running</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <span className="text-slate-600">|</span>

          <span 
            className="text-[11px] text-slate-500 font-mono flex items-center gap-1 truncate max-w-sm cursor-help"
            title={`Active Terminal (${activeTab.title}): ${activeTab.cwd}`}
          >
            <Folder className="w-3 h-3 text-slate-500" />
            <span>{shortenPath(activeTab.cwd)}</span>
          </span>
        </div>

        <div className="flex items-center gap-2.5 text-[11px] text-slate-500 font-mono">
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400">
            Ctrl + `
          </span>
          <button
            type="button"
            onClick={onToggle}
            className="text-slate-400 hover:text-slate-200 transition cursor-pointer p-0.5"
            title={isOpen ? "Collapse Terminal" : "Open Terminal"}
          >
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
