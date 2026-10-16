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
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Minimize2
} from 'lucide-react';

export function highlightLogMatches(text, query, getMatchIndex, activeMatchIndex, prefix = 'log') {
  if (!query || !query.trim() || !text) return text;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  if (parts.length <= 1) return text;

  return parts.map((part, i) => {
    if (part.toLowerCase() === query.trim().toLowerCase()) {
      const matchIdx = getMatchIndex ? getMatchIndex() : -1;
      const isActive = matchIdx >= 0 && matchIdx === activeMatchIndex;
      return (
        <mark
          key={i}
          id={matchIdx >= 0 ? `${prefix}-match-${matchIdx}` : undefined}
          className={
            isActive
              ? 'bg-amber-400 text-slate-950 font-black ring-2 ring-cyan-400 ring-offset-1 ring-offset-slate-950 rounded-xs shadow-md scale-105 inline-block transition-transform'
              : 'bg-amber-400/80 text-slate-950 font-semibold px-0.5 rounded-xs'
          }
        >
          {part}
        </mark>
      );
    }
    return part;
  });
}

export function highlightLogText(text, query) {
  return highlightLogMatches(text, query, null, -1);
}

export default function LogsModal({ isOpen, containerId, containerName, onClose, onFetchLogs }) {
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Enhancements
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [filterMode, setFilterMode] = useState(false); // false = show all lines with match highlights & nav; true = filter lines
  const [logLevel, setLogLevel] = useState('all'); // 'all', 'error', 'warn', 'info'
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
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

  // Auto-scroll when logs update or finish loading (only if not searching)
  useEffect(() => {
    if (isOpen && autoScroll && !loading && !searchQuery.trim()) {
      scrollToBottom();
    }
  }, [isOpen, logs, loading, autoScroll, logLevel]);

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

    // Search query filter (only when filterMode is enabled)
    if (filterMode && searchQuery && !lower.includes(searchQuery.toLowerCase())) {
      return false;
    }

    return true;
  });

  const totalMatches = React.useMemo(() => {
    if (!searchQuery.trim()) return 0;
    const escaped = searchQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    let count = 0;
    for (const line of filteredLines) {
      const m = line.match(regex);
      if (m) count += m.length;
    }
    return count;
  }, [filteredLines, searchQuery]);

  const scrollToMatch = (index) => {
    requestAnimationFrame(() => {
      const el = document.getElementById(`logs-modal-match-${index}`);
      const container = logsContainerRef.current;
      if (el && container) {
        const containerRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const relativeTop = elRect.top - containerRect.top + container.scrollTop;
        const targetScroll = relativeTop - container.clientHeight / 2 + elRect.height / 2;
        container.scrollTo({
          top: Math.max(0, targetScroll),
          behavior: 'smooth'
        });
      } else if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  };

  const handleNextMatch = () => {
    if (totalMatches === 0) return;
    setActiveMatchIndex((prev) => {
      const next = (prev + 1) % totalMatches;
      scrollToMatch(next);
      return next;
    });
  };

  const handlePrevMatch = () => {
    if (totalMatches === 0) return;
    setActiveMatchIndex((prev) => {
      const next = (prev - 1 + totalMatches) % totalMatches;
      scrollToMatch(next);
      return next;
    });
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrevMatch();
      } else {
        handleNextMatch();
      }
    } else if (e.key === 'Escape') {
      setSearchQuery('');
    }
  };

  useEffect(() => {
    if (searchQuery.trim() && totalMatches > 0) {
      setActiveMatchIndex(0);
      scrollToMatch(0);
    } else {
      setActiveMatchIndex(0);
    }
  }, [searchQuery, filterMode]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className={`bg-slate-900 border border-slate-750 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-100 transition-all duration-150 ${
          isFullScreen 
            ? 'w-[98vw] h-[95vh] max-w-none max-h-none' 
            : 'w-full max-w-4xl max-h-[88vh]'
        }`}
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
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title={isFullScreen ? "Restore Normal Size" : "Full Screen Dialog"}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4 text-cyan-400" /> : <Maximize2 className="w-4 h-4" />}
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
          {/* Search Input with Match Navigation */}
          <div className="flex items-center gap-2 flex-1 min-w-[280px] max-w-md">
            <div className="relative flex-1 flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Find in logs (Enter / Shift+Enter)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-28 py-1 text-xs text-slate-200 font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              {searchQuery && (
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                  <span className="text-[10px] font-mono text-slate-400 select-none px-1">
                    {totalMatches > 0 ? `${activeMatchIndex + 1}/${totalMatches}` : '0/0'}
                  </span>
                  <button
                    onClick={handlePrevMatch}
                    disabled={totalMatches === 0}
                    className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 disabled:opacity-25 disabled:hover:text-slate-400 disabled:hover:bg-transparent rounded transition cursor-pointer"
                    title="Previous match (Shift+Enter / ▲)"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleNextMatch}
                    disabled={totalMatches === 0}
                    className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 disabled:opacity-25 disabled:hover:text-slate-400 disabled:hover:bg-transparent rounded transition cursor-pointer"
                    title="Next match (Enter / ▼)"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="p-1 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded transition cursor-pointer"
                    title="Clear search (Esc)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setFilterMode(!filterMode)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-mono transition cursor-pointer shrink-0 ${
                filterMode && searchQuery
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-semibold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title={filterMode ? 'Showing only matching lines' : 'Showing all lines (click to isolate matching lines only)'}
            >
              <Filter className="w-3 h-3 text-cyan-400" />
              <span>{filterMode && searchQuery ? 'Filtered' : 'All Lines'}</span>
            </button>
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
          ) : (() => {
            let matchCounter = 0;
            return filteredLines.map((line, idx) => {
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
                      {highlightLogMatches(timestamp, searchQuery, () => matchCounter++, activeMatchIndex, 'logs-modal')}
                    </span>
                  )}
                  <span className="break-all flex-1">
                    {highlightLogMatches(content, searchQuery, () => matchCounter++, activeMatchIndex, 'logs-modal')}
                  </span>
                </div>
              );
            });
          })()}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-slate-800 bg-slate-950/60 flex justify-between items-center text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span>Container ID: <code className="text-slate-300 font-mono">{containerId}</code></span>
            <span>•</span>
            <span>Showing <strong className="text-slate-200">{filteredLines.length}</strong> of <strong className="text-slate-200">{lines.length}</strong> lines</span>
            {searchQuery && (
              <>
                <span>•</span>
                <span>Matches: <strong className="text-amber-400">{totalMatches > 0 ? `${activeMatchIndex + 1} of ${totalMatches}` : '0 found'}</strong></span>
              </>
            )}
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
