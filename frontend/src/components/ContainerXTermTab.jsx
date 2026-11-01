import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { EventsOn, EventsOff, ClipboardGetText, ClipboardSetText } from '../../wailsjs/runtime/runtime';
import {
  StartContainerTerminal,
  SendHostTerminalInput,
  ResizeHostTerminal,
  CloseHostTerminal,
} from '../../wailsjs/go/main/App';
import { Copy, ClipboardPaste, Square, Trash2, RotateCw, AlertCircle } from 'lucide-react';

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

export const ContainerXTermTab = forwardRef(function ContainerXTermTab(
  { containerId, containerName, isActive, onSessionExit },
  ref
) {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const fitAddonRef = useRef(null);
  const lastSelectionRef = useRef('');
  const menuRef = useRef(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [copiedToast, setCopiedToast] = useState(false);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const sessionId = `container-${containerId}`;

  const copyActionRef = useRef(() => {});
  const pasteActionRef = useRef(() => {});
  const onSessionExitRef = useRef(onSessionExit);
  onSessionExitRef.current = onSessionExit;

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
        SendHostTerminalInput(sessionId, text).catch(() => {});
      }
    } catch (_) {}
    setContextMenu(null);
  }, [sessionId]);

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

  const handleReconnect = useCallback(async () => {
    setIsDisconnected(false);
    if (!termRef.current) return;
    termRef.current.writeln('\r\n\x1b[36m[Connecting container shell...]\x1b[0m\r\n');
    try {
      await CloseHostTerminal(sessionId).catch(() => {});
      const rows = termRef.current.rows || 24;
      const cols = termRef.current.cols || 80;
      await StartContainerTerminal(sessionId, containerId, rows, cols);
      termRef.current.focus();
    } catch (err) {
      setIsDisconnected(true);
      termRef.current.writeln(`\r\n\x1b[31m[Failed to connect container shell: ${err?.message || err}]\x1b[0m\r\n`);
      if (onSessionExitRef.current) {
        onSessionExitRef.current();
      }
    }
  }, [containerId, sessionId]);

  useImperativeHandle(
    ref,
    () => ({
      clear: clearTerminal,
      copy: copySelectionOrBuffer,
      paste: pasteClipboardText,
      selectAll,
      focus,
      reconnect: handleReconnect,
    }),
    [clearTerminal, copySelectionOrBuffer, pasteClipboardText, selectAll, focus, handleReconnect]
  );

  useEffect(() => {
    if (!containerRef.current || !containerId) return;

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

    const initTimer = setTimeout(() => {
      try {
        fitAddon.fit();
        term.focus();
        const rows = term.rows || 24;
        const cols = term.cols || 80;
        StartContainerTerminal(sessionId, containerId, rows, cols)
          .then(() => {
            setIsDisconnected(false);
          })
          .catch((err) => {
            setIsDisconnected(true);
            term.writeln(`\r\n\x1b[31m[Failed to connect container shell: ${err?.message || err}]\x1b[0m\r\n`);
            if (onSessionExitRef.current) {
              onSessionExitRef.current();
            }
          });
      } catch (e) {
        console.error('Container terminal init error:', e);
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
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
          copyActionRef.current?.();
          return false;
        }
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'c' || e.key === 'c')) {
          if (term.hasSelection()) {
            copyActionRef.current?.();
            return false;
          }
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'V' || e.key === 'v')) {
          pasteActionRef.current?.();
          return false;
        }
      }
      return true;
    });

    const selectionDisposable = term.onSelectionChange(() => {
      const s = term.getSelection();
      if (s && s.length > 0) {
        lastSelectionRef.current = s;
        setClipboard(s).catch(() => {});
      }
    });

    const handleMouseUp = (e) => {
      if (e.button === 1) {
        e.preventDefault();
        pasteActionRef.current?.();
      }
    };
    el.addEventListener('mouseup', handleMouseUp);

    const dataDisposable = term.onData((data) => {
      SendHostTerminalInput(sessionId, data).catch(() => {});
    });

    const resizeDisposable = term.onResize(({ rows, cols }) => {
      ResizeHostTerminal(sessionId, rows, cols).catch(() => {});
    });

    const dataEventName = 'terminal:data:' + sessionId;
    const exitEventName = 'terminal:exit:' + sessionId;

    const unsubData = EventsOn(dataEventName, (incoming) => {
      term.write(incoming);
    });

    const unsubExit = EventsOn(exitEventName, () => {
      setIsDisconnected(true);
      term.writeln('\r\n\x1b[90m[Container shell session disconnected]\x1b[0m');
      if (onSessionExitRef.current) {
        onSessionExitRef.current();
      }
    });

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
      CloseHostTerminal(sessionId).catch(() => {});
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, [containerId, sessionId]);

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

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();

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
      className="relative w-full h-full flex-1 flex flex-col bg-[#0c1017] min-h-[300px]"
      onContextMenu={handleContextMenu}
    >
      <div
        ref={containerRef}
        className="w-full h-full p-2 overflow-hidden flex-1"
      />

      {copiedToast && (
        <div className="absolute top-2 right-4 z-50 bg-cyan-950/90 text-cyan-300 border border-cyan-500/50 px-2.5 py-1 rounded text-[11px] font-mono shadow-lg animate-in fade-in zoom-in-95 duration-100">
          Copied to clipboard
        </div>
      )}

      {isDisconnected && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-lg shadow-xl flex items-center gap-3 text-xs backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-150 select-none">
          <span className="flex items-center gap-1.5 text-amber-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>Session disconnected</span>
          </span>
          <button
            type="button"
            onClick={handleReconnect}
            className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-medium text-[11px] flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <RotateCw className="w-3 h-3" />
            <span>Reconnect</span>
          </button>
        </div>
      )}

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

export default ContainerXTermTab;
