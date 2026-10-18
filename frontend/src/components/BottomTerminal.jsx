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
  Square
} from 'lucide-react';

export default function BottomTerminal({
  isOpen,
  onToggle,
  onClose,
  onExecHostCommand,
  onGetHostCwd,
  onSetHostCwd,
  onCancelHostCommand,
  onGetHostHomeDir,
  activeComposeDir = null
}) {
  const [cwd, setCwd] = useState('~');
  const [homeDir, setHomeDir] = useState('');
  const [history, setHistory] = useState([
    {
      type: 'system',
      text: 'Dockit Host Terminal (bash/zsh) — VS Code Style Drawer\nType any host commands (docker, git, curl, etc.) or "clear" to clear screen.'
    }
  ]);
  const [commandInput, setCommandInput] = useState('');
  const [executing, setExecuting] = useState(false);
  const [cmdHistory, setCmdHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isMaximized, setIsMaximized] = useState(false);
  const [copied, setCopied] = useState(false);

  const terminalScrollRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch initial cwd and home directory on mount or open
  useEffect(() => {
    if (onGetHostHomeDir) {
      onGetHostHomeDir()
        .then((home) => {
          if (home) setHomeDir(home);
        })
        .catch(() => {});
    }

    if (onGetHostCwd) {
      onGetHostCwd()
        .then((dir) => {
          if (dir) setCwd(dir);
        })
        .catch(() => {});
    }
  }, [isOpen, onGetHostCwd, onGetHostHomeDir]);

  // Auto-scroll inside terminal when new output arrives
  useEffect(() => {
    if (isOpen && terminalScrollRef.current) {
      terminalScrollRef.current.scrollTop = terminalScrollRef.current.scrollHeight;
    }
  }, [history, executing, isOpen]);

  // Auto-focus input when terminal drawer opens
  useEffect(() => {
    if (isOpen && !executing) {
      setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 80);
    }
  }, [isOpen, executing]);

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

  const handleCancelCommand = useCallback(async () => {
    try {
      if (onCancelHostCommand) {
        await onCancelHostCommand();
      }
      setHistory((prev) => [...prev, { type: 'err', text: '^C (command canceled)' }]);
    } catch (_) {}
    setExecuting(false);
    setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 40);
  }, [onCancelHostCommand]);

  const handleRunCommand = async (e) => {
    if (e) e.preventDefault();
    const cmdStr = commandInput.trim();
    if (!cmdStr || executing) return;

    if (cmdStr.toLowerCase() === 'clear') {
      setHistory([]);
      setCommandInput('');
      setCmdHistory((prev) => [...prev, 'clear']);
      setHistoryIndex(-1);
      return;
    }

    setExecuting(true);
    setHistory((prev) => [...prev, { type: 'cmd', text: cmdStr, cwd }]);
    setCmdHistory((prev) => [...prev, cmdStr]);
    setHistoryIndex(-1);
    setCommandInput('');

    try {
      if (onExecHostCommand) {
        const res = await onExecHostCommand(cmdStr);
        if (res) {
          if (res.cwd) setCwd(res.cwd);
          if (res.output) {
            setHistory((prev) => [...prev, { type: 'out', text: res.output }]);
          }
          if (res.error) {
            setHistory((prev) => [...prev, { type: 'err', text: res.error }]);
          }
        }
      }
    } catch (err) {
      setHistory((prev) => [...prev, { type: 'err', text: `Execution failed: ${err}` }]);
    } finally {
      setExecuting(false);
      setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 40);
    }
  };

  const handleKeyDown = (e) => {
    // Ctrl + C handling
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      if (executing) {
        handleCancelCommand();
      } else {
        if (commandInput) {
          setHistory((prev) => [...prev, { type: 'cmd', text: `${commandInput}^C`, cwd }]);
          setCommandInput('');
        }
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const nextIdx = historyIndex === -1 ? cmdHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIdx);
      setCommandInput(cmdHistory[nextIdx] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIdx = historyIndex + 1;
      if (nextIdx >= cmdHistory.length) {
        setHistoryIndex(-1);
        setCommandInput('');
      } else {
        setHistoryIndex(nextIdx);
        setCommandInput(cmdHistory[nextIdx] || '');
      }
    }
  };

  const handleCopyHistory = () => {
    const text = history
      .map((item) => (item.type === 'cmd' ? `$ ${item.text}` : item.text))
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCdToCompose = async () => {
    if (!activeComposeDir || !onSetHostCwd) return;
    try {
      await onSetHostCwd(activeComposeDir);
      setCwd(activeComposeDir);
      setHistory((prev) => [
        ...prev,
        { type: 'system', text: `Switched working directory to: ${activeComposeDir}` }
      ]);
      setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 40);
    } catch (err) {
      setHistory((prev) => [...prev, { type: 'err', text: `Failed to cd: ${err}` }]);
    }
  };

  return (
    <div className="shrink-0 flex flex-col z-30 select-none">
      {/* Sliding Drawer Container */}
      {isOpen && (
        <div
          className={`terminal-window border-t border-slate-800 bg-[#0c1017] flex flex-col transition-all duration-200 overflow-hidden shadow-2xl font-mono ${
            isMaximized ? 'h-[65vh]' : 'h-72'
          }`}
          onClick={() => {
            if (!executing) inputRef.current?.focus({ preventScroll: true });
          }}
        >
          {/* Drawer Header Toolbar */}
          <div className="terminal-titlebar px-4 py-2 bg-[#161b22] border-b border-slate-800 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="terminal-dot-red w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block"></span>
              <span className="terminal-dot-yellow w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block"></span>
              <span className="terminal-dot-green w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block"></span>

              <div className="flex items-center gap-2 ml-1 text-slate-300 font-semibold text-[11px]">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Host Terminal</span>
                <span className="text-slate-500">•</span>
                <span 
                  className="text-slate-400 font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800/60 border border-slate-700/60 max-w-xs truncate cursor-help"
                  title={`Working Directory: ${cwd}`}
                >
                  {shortenPath(cwd)}
                </span>
              </div>

              {activeComposeDir && activeComposeDir !== cwd && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCdToCompose();
                  }}
                  className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/50 flex items-center gap-1 transition cursor-pointer"
                  title={`Jump terminal directory to ${activeComposeDir}`}
                >
                  <Folder className="w-3 h-3 text-cyan-400" />
                  <span>cd to Compose Dir</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {executing ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelCommand();
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
                  setHistory([]);
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

          {/* Drawer Output Scroll Body */}
          <div
            ref={terminalScrollRef}
            className="flex-1 p-3.5 overflow-y-auto text-xs space-y-1.5 select-text leading-relaxed cursor-text"
          >
            {history.map((item, idx) => (
              <div key={idx} className="whitespace-pre-wrap break-all">
                {item.type === 'cmd' ? (
                  <div className="flex items-center gap-2 text-slate-200 font-bold mt-1">
                    <span className="text-emerald-400 font-bold text-xs">
                      host:{shortenPath(item.cwd || cwd)}$
                    </span>
                    <span>{item.text}</span>
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

            {/* In-Flight Execution State or Active Shell Prompt */}
            {executing ? (
              <div className="flex items-center gap-3 py-2 text-slate-300 text-xs font-mono">
                <span className="flex items-center gap-2 text-amber-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing command...</span>
                </span>
                <button
                  type="button"
                  onClick={handleCancelCommand}
                  className="px-2.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 shadow-xs"
                  title="Stop command execution (Ctrl+C)"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Stop (Ctrl+C)</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleRunCommand} className="flex items-center gap-2 pt-1">
                <span className="text-emerald-400 font-bold text-xs shrink-0 select-none">
                  host:{shortenPath(cwd)}$
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="terminal-prompt-input flex-1 bg-transparent text-xs text-slate-100 font-mono border-none outline-none focus:ring-0 p-0 shadow-none ring-0 focus:outline-none"
                  placeholder="type host command..."
                  spellCheck={false}
                  autoComplete="off"
                />
              </form>
            )}
          </div>
        </div>
      )}

      {/* Persistent Docked Bottom Bar (VS Code Status Bar Style) */}
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
            <span className={`w-1.5 h-1.5 rounded-full ${executing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></span>
          </button>

          <span className="text-slate-600">|</span>

          <span 
            className="text-[11px] text-slate-500 font-mono flex items-center gap-1 truncate max-w-sm cursor-help"
            title={`Current Shell Directory: ${cwd}`}
          >
            <Folder className="w-3 h-3 text-slate-500" />
            <span>{shortenPath(cwd)}</span>
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
