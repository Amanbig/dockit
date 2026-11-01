import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { EventsOn, EventsOff, ClipboardGetText, ClipboardSetText } from '../../wailsjs/runtime/runtime';
import {
  StartHostTerminal,
  SendHostTerminalInput,
  ResizeHostTerminal,
  CloseHostTerminal,
} from '../../wailsjs/go/main/App';
import { Copy, ClipboardPaste, Square, Trash2 } from 'lucide-react';

const getClipboard = async () => {
  try {
    const text = await ClipboardGetText();
    if (text) return text;
  } catch (_) {}

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
      const text = await navigator.clipboard.readText();
      if (text) return text;
    }
  } catch (_) {}

  return '';
};

const setClipboard = async (text) => {
  try {
    await ClipboardSetText(text);
    return;
  } catch (_) {}

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    }
  } catch (_) {}
};

export const XTermTab = forwardRef(function XTermTab(
  { tabId, isActive, onTitleChange, onCommandExecuted },
  ref
) {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const fitAddonRef = useRef(null);
  const lastSelectionRef = useRef('');
  const menuRef = useRef(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [copiedToast, setCopiedToast] = useState(false);

  const copyActionRef = useRef(() => {});
  const pasteActionRef = useRef(() => {});
  const onCommandExecutedRef = useRef(onCommandExecuted);

  useEffect(() => {
    onCommandExecutedRef.current = onCommandExecuted;
  }, [onCommandExecuted]);

  const copySelectionOrBuffer = useCallback(async () => {
    let sel = termRef.current?.getSelection() || lastSelectionRef.current;
    if (!sel) {
      const buf = termRef.current?.buffer.active;
      if (buf) {
        const lines = [];
        for (let i = 0; i < buf.length; i++) {
          const line = buf.getLine(i);
          if (line) lines.push(line.translateToString(true));
        }
        sel = lines.join('\n').trimEnd();
      }
    }

    if (sel && sel.length > 0) {
      await setClipboard(sel);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 1200);
    }
    setContextMenu(null);
  }, []);

  const pasteClipboardText = useCallback(async () => {
    try {
      const text = await getClipboard();
      if (text && termRef.current) {
        SendHostTerminalInput(tabId, text).catch(() => {});
      }
    } catch (_) {}
    setContextMenu(null);
  }, [tabId]);

  const selectAll = useCallback(() => {
    termRef.current?.selectAll();
    setContextMenu(null);
  }, []);

  const clearTerminal = useCallback(() => {
    termRef.current?.clear();
    setContextMenu(null);
  }, []);

  const focus = useCallback(() => {
    termRef.current?.focus();
  }, []);

  const sendInput = useCallback(
    (text) => {
      if (text) {
        SendHostTerminalInput(tabId, text).catch(() => {});
      }
    },
    [tabId]
  );

  // Expose imperative API to parent component
  useImperativeHandle(
    ref,
    () => ({
      clear: clearTerminal,
      copy: copySelectionOrBuffer,
      paste: pasteClipboardText,
      selectAll,
      focus,
      sendInput,
      getSelection: () => termRef.current?.getSelection() || lastSelectionRef.current || '',
      getAllText: () => {
        const buf = termRef.current?.buffer.active;
        if (!buf) return '';
        const lines = [];
        for (let i = 0; i < buf.length; i++) {
          const line = buf.getLine(i);
          if (line) lines.push(line.translateToString(true));
        }
        return lines.join('\n').trimEnd();
      },
    }),
    [clearTerminal, copySelectionOrBuffer, pasteClipboardText, selectAll, focus, sendInput]
  );

  // Initialize xterm.js instance
  useEffect(() => {
    if (!containerRef.current || !tabId) return;

    const term = new Terminal({
      fontFamily: "'JetBrains Mono Variable', 'JetBrains Mono', 'Fira Code', Menlo, Monaco, monospace",
      fontSize: 12.5,
      lineHeight: 1.25,
      cursorBlink: true,
      cursorStyle: 'block',
      cursorInactiveStyle: 'outline',
      allowTransparency: true,
      scrollback: 10000,
      theme: {
        background: '#0c1017',
        foreground: '#f1f5f9',
        cursor: '#22d3ee',
        cursorAccent: '#0c1017',
        selectionBackground: 'rgba(34, 211, 238, 0.3)',
        black: '#0f172a',
        red: '#f87171',
        green: '#4ade80',
        yellow: '#facc15',
        blue: '#38bdf8',
        magenta: '#c084fc',
        cyan: '#22d3ee',
        white: '#f8fafc',
        brightBlack: '#64748b',
        brightRed: '#ef4444',
        brightGreen: '#22c55e',
        brightYellow: '#eab308',
        brightBlue: '#0284c7',
        brightMagenta: '#a855f7',
        brightCyan: '#06b6d4',
        brightWhite: '#ffffff',
      },
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    term.open(containerRef.current);
    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Small delay to ensure container layout dimensions are computed
    const initTimer = setTimeout(() => {
      try {
        fitAddon.fit();
        term.focus();
        const rows = term.rows || 24;
        const cols = term.cols || 80;
        StartHostTerminal(tabId, rows, cols).catch((err) => {
          term.writeln(`\r\n\x1b[31m[Failed to start host shell: ${err?.message || err}]\x1b[0m\r\n`);
        });
      } catch (e) {
        console.error('Terminal init error:', e);
      }
    }, 40);

    const handleFocusClick = () => {
      term.focus();
    };
    const el = containerRef.current;
    el.addEventListener('click', handleFocusClick);

    copyActionRef.current = copySelectionOrBuffer;
    pasteActionRef.current = pasteClipboardText;

    // Keyboard shortcuts
    term.attachCustomKeyEventHandler((e) => {
      if (e.type === 'keydown') {
        // Ctrl+Shift+C: copy
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
          copyActionRef.current?.();
          return false;
        }

        // Ctrl+C with text selected: copy instead of sending SIGINT
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'c' || e.key === 'c')) {
          if (term.hasSelection()) {
            copyActionRef.current?.();
            return false;
          }
        }

        // Ctrl+Shift+V: paste
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'V' || e.key === 'v')) {
          pasteActionRef.current?.();
          return false;
        }
      }
      return true;
    });

    // Auto-copy highlighted text to clipboard on selection change
    const selectionDisposable = term.onSelectionChange(() => {
      const s = term.getSelection();
      if (s && s.length > 0) {
        lastSelectionRef.current = s;
        setClipboard(s).catch(() => {});
      }
    });

    // Middle-click to paste
    const handleMouseUp = (e) => {
      if (e.button === 1) {
        e.preventDefault();
        pasteActionRef.current?.();
      }
    };
    el.addEventListener('mouseup', handleMouseUp);

    // Forward keystrokes to host PTY
    const dataDisposable = term.onData((data) => {
      SendHostTerminalInput(tabId, data).catch(() => {});
      if (data === '\r' || data === '\n') {
        if (onCommandExecutedRef.current) {
          setTimeout(() => onCommandExecutedRef.current?.(), 400);
        }
      }
    });

    // Handle terminal resize events
    const resizeDisposable = term.onResize(({ rows, cols }) => {
      ResizeHostTerminal(tabId, rows, cols).catch(() => {});
    });

    // Listen to real-time PTY stream from backend
    const dataEventName = 'terminal:data:' + tabId;
    const exitEventName = 'terminal:exit:' + tabId;

    const unsubData = EventsOn(dataEventName, (incoming) => {
      term.write(incoming);
    });

    const unsubExit = EventsOn(exitEventName, () => {
      term.writeln('\r\n\x1b[90m[Process finished]\x1b[0m');
    });

    // ResizeObserver to automatically fit xterm when container dimensions change
    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current && containerRef.current.clientWidth > 0 && containerRef.current.clientHeight > 0) {
        try {
          fitAddon.fit();
        } catch (_) {}
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      clearTimeout(initTimer);
      el.removeEventListener('click', handleFocusClick);
      el.removeEventListener('mouseup', handleMouseUp);
      selectionDisposable.dispose();
      resizeObserver.disconnect();
      unsubData();
      unsubExit();
      EventsOff(dataEventName);
      EventsOff(exitEventName);
      dataDisposable.dispose();
      resizeDisposable.dispose();
      CloseHostTerminal(tabId).catch(() => {});
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, [tabId]);

  // When tab becomes active, trigger fit and focus
  useEffect(() => {
    if (isActive && termRef.current && fitAddonRef.current) {
      setTimeout(() => {
        try {
          fitAddonRef.current?.fit();
          termRef.current?.focus();
        } catch (_) {}
      }, 30);
    }
  }, [isActive]);

  // Context menu handlers
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // If text was selected, immediately copy it on right-click
    const sel = termRef.current?.getSelection();
    if (sel && sel.length > 0) {
      lastSelectionRef.current = sel;
      setClipboard(sel).catch(() => {});
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 1200);
    }

    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    if (!contextMenu) return;
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setContextMenu(null);
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') setContextMenu(null);
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [contextMenu]);

  return (
    <div
      className={`relative w-full h-full flex flex-col bg-[#0c1017] ${isActive ? 'block' : 'hidden'}`}
      onContextMenu={handleContextMenu}
    >
      <div
        ref={containerRef}
        className="w-full h-full p-2 overflow-hidden"
      />

      {/* Copy notification toast */}
      {copiedToast && (
        <div className="absolute top-2 right-4 z-50 bg-cyan-950/90 text-cyan-300 border border-cyan-500/50 px-2.5 py-1 rounded text-[11px] font-mono shadow-lg animate-in fade-in zoom-in-95 duration-100">
          Copied to clipboard
        </div>
      )}

      {/* Right-Click Context Menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 min-w-[170px] bg-slate-900 border border-slate-700/80 rounded-md shadow-2xl py-1 text-xs text-slate-200 select-none animate-in fade-in zoom-in-95 duration-100 font-sans"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={copySelectionOrBuffer}
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2">
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>{termRef.current?.hasSelection() || lastSelectionRef.current ? 'Copy Selection' : 'Copy All Output'}</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Ctrl+Shift+C</span>
          </button>
          <button
            onClick={pasteClipboardText}
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2">
              <ClipboardPaste className="w-3.5 h-3.5 text-slate-400" />
              <span>Paste</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Ctrl+Shift+V</span>
          </button>
          <div className="h-px bg-slate-800 my-1" />
          <button
            onClick={selectAll}
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2">
              <Square className="w-3.5 h-3.5 text-slate-400" />
              <span>Select All</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Ctrl+A</span>
          </button>
          <button
            onClick={clearTerminal}
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800 hover:text-rose-400 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Clear Terminal</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Ctrl+L</span>
          </button>
        </div>
      )}
    </div>
  );
});

export default XTermTab;
