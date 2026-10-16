import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  RefreshCw, 
  X, 
  Copy, 
  Check, 
  Search, 
  Clock, 
  ArrowDown, 
  Filter, 
  SlidersHorizontal 
} from 'lucide-react';

export function highlightLogText(text, query) {
  if (!query || !query.trim() || !text) return text;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  if (parts.length <= 1) return text;

  return parts.map((part, i) =>
    part.toLowerCase() === query.trim().toLowerCase() ? (
      <mark
        key={i}
        className="bg-amber-400 text-slate-950 font-semibold px-0.5 rounded-xs"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export default function LogsModal({ isOpen, containerId, containerName, onClose, onFetchLogs }) {
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Enhancements
  const [searchQuery, setSearchQuery] = useState('');
  const [logLevel, setLogLevel] = useState('all'); // 'all', 'error', 'warn', 'info'
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const logsContainerRef = useRef(null);

  const fetchLogs = async () => {
    if (!containerId) return;
    setLoading(true);
    try {
      if (onFetchLogs) {
        const output = await onFetchLogs(containerId);
        setLogs(output || 'No logs found for this container.');
      }
    } catch (err) {
      setLogs(`Error fetching logs: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = (smooth = false) => {
    const scroll = () => {
      if (logsContainerRef.current) {
        logsContainerRef.current.scrollTo({
          top: logsContainerRef.current.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto'
        });
      }
    };
    requestAnimationFrame(scroll);
    setTimeout(scroll, 50);
  };

  useEffect(() => {
    if (isOpen && containerId) {
      fetchLogs();
    }
  }, [isOpen, containerId]);

  // Auto-scroll when logs update or finish loading
  useEffect(() => {
    if (isOpen && autoScroll && !loading) {
      scrollToBottom();
    }
  }, [isOpen, logs, loading, autoScroll, searchQuery, logLevel]);

  if (!isOpen) return null;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(logs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter & Format lines
  const lines = (logs || '').split('\n');

  // RFC3339 regex timestamp pattern: 2026-10-13T12:00:00.123456789Z or similar
  const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})\s*/;

  const filteredLines = lines.filter((line) => {
    if (!line) return false;
    const lower = line.toLowerCase();

    // Log level filter
    if (logLevel === 'error') {
      if (!lower.includes('error') && !lower.includes('fatal') && !lower.includes('panic') && !lower.includes('err')) {
        return false;
      }
    } else if (logLevel === 'warn') {
      if (!lower.includes('warn') && !lower.includes('warning')) {
        return false;
      }
    } else if (logLevel === 'info') {
      if (lower.includes('error') || lower.includes('fatal') || lower.includes('panic') || lower.includes('warn')) {
        return false;
      }
    }

    // Search query filter
    if (searchQuery && !lower.includes(searchQuery.toLowerCase())) {
      return false;
    }

    return true;
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-750 rounded-xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-base text-slate-100 flex items-center gap-2">
              Logs:
              <span className="text-cyan-400 font-mono text-xs px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60">
                {containerName || (containerId ? containerId.slice(0, 12) : '')}
              </span>
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyToClipboard}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
              title="Copy All Logs"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
              title="Refresh Logs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Search & Filters */}
        <div className="px-5 py-2.5 bg-slate-950/40 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search / filter logs (Ctrl+F)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                ✕
              </button>
            )}
          </div>

          {/* Level Filter Pills & Options */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[11px]">
              {['all', 'error', 'warn', 'info'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLogLevel(lvl)}
                  className={`px-2.5 py-0.5 rounded capitalize font-medium transition cursor-pointer ${
                    logLevel === lvl 
                      ? lvl === 'error'
                        ? 'bg-rose-500/20 text-rose-300 font-bold'
                        : lvl === 'warn'
                        ? 'bg-amber-500/20 text-amber-300 font-bold'
                        : 'bg-cyan-500/20 text-cyan-300 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {/* Toggle Timestamps */}
            <button
              onClick={() => setShowTimestamps(!showTimestamps)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] transition cursor-pointer ${
                showTimestamps 
                  ? 'bg-slate-800 border-slate-700 text-slate-200' 
                  : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
              title="Show / hide log timestamps"
            >
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>Timestamps</span>
            </button>

            {/* Auto-scroll toggle */}
            <button
              onClick={() => {
                setAutoScroll(true);
                scrollToBottom(true);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] transition cursor-pointer ${
                autoScroll 
                  ? 'bg-slate-800 border-slate-700 text-cyan-400' 
                  : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
              title="Auto-scroll to latest log entries"
            >
              <ArrowDown className={`w-3 h-3 ${autoScroll ? 'animate-bounce' : ''}`} />
              <span>Scroll to Bottom</span>
            </button>
          </div>
        </div>

        {/* Console Output */}
        <div 
          ref={logsContainerRef}
          className="flex-1 p-4 overflow-y-auto bg-slate-950 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed select-text space-y-0.5"
        >
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Loading container logs...</span>
            </div>
          ) : filteredLines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-1 text-center">
              <span>No log messages match your filter.</span>
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="text-cyan-400 underline text-xs mt-1"
                >
                  Clear search query
                </button>
              )}
            </div>
          ) : (
            filteredLines.map((line, idx) => {
              const lower = line.toLowerCase();
              const isErr = lower.includes('error') || lower.includes('fatal') || lower.includes('panic');
              const isWarn = lower.includes('warn');

              let timestamp = null;
              let content = line;

              const tsMatch = line.match(timestampRegex);
              if (tsMatch) {
                timestamp = tsMatch[0].trim();
                content = line.substring(tsMatch[0].length);
              }

              return (
                <div 
                  key={idx} 
                  className={`flex items-start gap-2 py-0.5 px-1 rounded hover:bg-slate-900/60 transition-colors ${
                    isErr 
                      ? 'text-rose-400 bg-rose-500/5' 
                      : isWarn 
                      ? 'text-amber-400 bg-amber-500/5' 
                      : 'text-slate-300'
                  }`}
                >
                  {showTimestamps && timestamp && (
                    <span className="text-[10px] text-slate-500 select-none shrink-0 font-mono pt-0.5">
                      {highlightLogText(timestamp, searchQuery)}
                    </span>
                  )}
                  <span className="break-all flex-1">{highlightLogText(content, searchQuery)}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-slate-800 bg-slate-950/60 flex justify-between items-center text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span>Container ID: <code className="text-slate-300 font-mono">{containerId}</code></span>
            <span>•</span>
            <span>Showing <strong className="text-slate-200">{filteredLines.length}</strong> of <strong className="text-slate-200">{lines.length}</strong> lines</span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
