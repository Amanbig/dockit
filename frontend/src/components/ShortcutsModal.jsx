import React, { useState, useEffect } from 'react';
import { 
  X, 
  Keyboard, 
  Command, 
  Terminal, 
  Search, 
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react';

export default function ShortcutsModal({ isOpen, onClose }) {
  const [filter, setFilter] = useState('');
  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform || '');
  const modKey = isMac ? '⌘' : 'Ctrl';

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcutSections = [
    {
      category: 'Global & Navigation',
      icon: Command,
      shortcuts: [
        { keys: [modKey, 'K'], description: 'Open Command Palette & Global Search' },
        { keys: [modKey, 'B'], description: 'Toggle mini-rail sidebar layout' },
        { keys: ['?'], description: 'Open this Keyboard Shortcuts cheatsheet' },
        { keys: ['Esc'], description: 'Close any active modal, dialog, or drawer' },
        { keys: [modKey, 'R'], description: 'Refresh container and engine resources' },
      ]
    },
    {
      category: 'Bottom Terminal Drawer',
      icon: Terminal,
      shortcuts: [
        { keys: [modKey, '`'], description: 'Toggle interactive Host Terminal drawer' },
        { keys: [modKey, 'Shift', '`'], description: 'Open a new concurrent terminal session' },
        { keys: ['Alt', '1-9'], description: 'Switch between terminal tabs' },
        { keys: [modKey, 'Shift', 'C'], description: 'Copy terminal selection or full buffer' },
        { keys: [modKey, 'Shift', 'V'], description: 'Paste clipboard content into shell' },
        { keys: [modKey, 'L'], description: 'Clear active terminal screen' },
      ]
    },
    {
      category: 'Resource Workflows & Quick Actions',
      icon: Sparkles,
      shortcuts: [
        { keys: ['Click', 'Port'], description: 'Open localhost:<port> directly in browser' },
        { keys: ['Hover', 'ID / Tag'], description: 'Quick-copy container ID or image tag' },
        { keys: ['Row Click'], description: 'View full container details, logs & live exec' },
        { keys: ['Double-Click', 'Sash'], description: 'Reset sidebar width to default' },
      ]
    }
  ];

  const filteredSections = shortcutSections.map(section => ({
    ...section,
    shortcuts: section.shortcuts.filter(s => 
      s.description.toLowerCase().includes(filter.toLowerCase()) ||
      s.keys.some(k => k.toLowerCase().includes(filter.toLowerCase()))
    )
  })).filter(section => section.shortcuts.length > 0);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Keyboard Shortcuts &amp; Cheatsheet
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono font-normal">
                  Dev QoL
                </span>
              </h2>
              <p className="text-xs text-slate-400">Essential shortcuts to supercharge your container workflows</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter input */}
        <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-900/60">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Search shortcuts (e.g. terminal, copy, palette, port)..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition"
              autoFocus
            />
          </div>
        </div>

        {/* Shortcuts list */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {filteredSections.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No keyboard shortcuts match your search.
            </div>
          ) : (
            filteredSections.map(sec => {
              const Icon = sec.icon;
              return (
                <div key={sec.category} className="space-y-2.5">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <Icon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{sec.category}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {sec.shortcuts.map((sc, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80 hover:border-slate-700/80 transition"
                      >
                        <span className="text-xs text-slate-300 font-medium">{sc.description}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {sc.keys.map((k, kIdx) => (
                            <React.Fragment key={kIdx}>
                              <kbd className="px-2 py-1 rounded-md bg-slate-800 border border-slate-700/80 text-slate-300 text-[11px] font-mono font-semibold shadow-xs">
                                {k}
                              </kbd>
                              {kIdx < sc.keys.length - 1 && (
                                <span className="text-slate-600 text-xs">+</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-[11px] text-slate-500">
          <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono text-[10px]">?</kbd> anywhere to toggle this cheat sheet</span>
          <span>Dockit Desktop</span>
        </div>
      </div>
    </div>
  );
}
