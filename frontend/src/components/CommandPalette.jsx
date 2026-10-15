import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Box,
  Disc,
  HardDrive,
  Network,
  Layers,
  Settings,
  Terminal,
  Play,
  Square,
  RefreshCw,
  DownloadCloud,
  Sun,
  Moon,
  Sparkles,
  ArrowRight,
  CornerDownLeft,
  Trash2,
  Command,
  FileText
} from 'lucide-react';

export default function CommandPalette({
  isOpen,
  onClose,
  containers = [],
  images = [],
  volumes = [],
  networks = [],
  activeRuntime = 'docker',
  theme = 'dark',
  onNavigate,
  onSwitchRuntime,
  onToggleTheme,
  onRefresh,
  onCheckUpdates,
  onOpenInstaller,
  onContainerAction,
  onInspectImage,
  onInspectVolume,
  onPruneVolumes
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Reset query and selected index on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build searchable items
  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = [];

    // Helper to add item
    const addItem = (category, item) => {
      if (!q) {
        result.push({ category, ...item });
        return;
      }
      const match =
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        (item.keywords && item.keywords.some(k => k.toLowerCase().includes(q)));
      if (match) {
        result.push({ category, ...item });
      }
    };

    // 1. Navigation items
    const navItems = [
      { id: 'nav-containers', title: 'Go to Containers', subtitle: 'View and manage containers', icon: Box, action: () => onNavigate('containers'), shortcut: 'C' },
      { id: 'nav-images', title: 'Go to Images', subtitle: 'Local images, pulls, and tags', icon: Disc, action: () => onNavigate('images'), shortcut: 'I' },
      { id: 'nav-volumes', title: 'Go to Volumes', subtitle: 'Persistent data volumes', icon: HardDrive, action: () => onNavigate('volumes'), shortcut: 'V' },
      { id: 'nav-networks', title: 'Go to Networks', subtitle: 'Bridge, host, and overlay networks', icon: Network, action: () => onNavigate('networks'), shortcut: 'N' },
      { id: 'nav-cleanup', title: 'Go to Disk & Cleanup', subtitle: 'Analyze disk usage and reclaim space', icon: Sparkles, action: () => onNavigate('cleanup'), shortcut: 'D' },
      { id: 'nav-compose', title: 'Go to Compose Studio', subtitle: 'Multi-container projects and .env', icon: Layers, action: () => onNavigate('compose'), shortcut: 'S' },
      { id: 'nav-registry', title: 'Go to Hub & Registries', subtitle: 'Search Docker Hub, GHCR, Quay', icon: DownloadCloud, action: () => onNavigate('registry'), shortcut: 'R' },
      { id: 'nav-settings', title: 'Go to Settings', subtitle: 'Preferences, engine, and themes', icon: Settings, action: () => onNavigate('settings'), shortcut: ',' }
    ];
    navItems.forEach(item => addItem('Navigation', item));

    // 2. Container items
    containers.forEach(c => {
      const name = (c.names && c.names[0]) ? c.names[0].replace(/^\//, '') : c.id?.substring(0, 12);
      const isRunning = c.status === 'running' || c.state === 'running';
      addItem('Containers', {
        id: `container-${c.id}`,
        title: name,
        subtitle: `${c.image || 'Unknown'} • ${isRunning ? 'Running' : 'Stopped'}`,
        icon: Box,
        badge: isRunning ? 'Running' : 'Stopped',
        badgeColor: isRunning ? 'emerald' : 'slate',
        keywords: [c.id, c.image, c.status, isRunning ? 'running' : 'stopped'],
        action: () => onNavigate('containers', c.id),
        quickActions: [
          isRunning
            ? {
                title: 'Stop',
                icon: Square,
                color: 'text-amber-400 hover:bg-amber-500/20',
                action: (e) => { e.stopPropagation(); onContainerAction('stop', c.id, name); }
              }
            : {
                title: 'Start',
                icon: Play,
                color: 'text-emerald-400 hover:bg-emerald-500/20',
                action: (e) => { e.stopPropagation(); onContainerAction('start', c.id, name); }
              },
          {
            title: 'Logs',
            icon: FileText,
            color: 'text-cyan-400 hover:bg-cyan-500/20',
            action: (e) => { e.stopPropagation(); onContainerAction('logs', c.id, name); }
          }
        ]
      });
    });

    // 3. Image items
    images.forEach(img => {
      const tag = (img.repoTags && img.repoTags[0] && img.repoTags[0] !== '<none>:<none>')
        ? img.repoTags[0]
        : (img.id ? img.id.substring(0, 12) : 'Dangling Image');
      addItem('Images', {
        id: `image-${img.id}`,
        title: tag,
        subtitle: img.size ? `${(img.size / (1024 * 1024)).toFixed(1)} MB` : 'Image',
        icon: Disc,
        keywords: [img.id, ...(img.repoTags || [])],
        action: () => {
          onNavigate('images');
          if (onInspectImage) onInspectImage(img.id, tag);
        }
      });
    });

    // 4. Volume items
    volumes.forEach(vol => {
      addItem('Volumes', {
        id: `volume-${vol.name}`,
        title: vol.name,
        subtitle: `Driver: ${vol.driver || 'local'}`,
        icon: HardDrive,
        keywords: [vol.name, vol.driver],
        action: () => {
          onNavigate('volumes');
          if (onInspectVolume) onInspectVolume(vol.name);
        }
      });
    });

    // 5. Global Actions
    const actionItems = [
      {
        id: 'action-switch-runtime',
        title: activeRuntime === 'docker' ? 'Switch Runtime to Podman' : 'Switch Runtime to Docker',
        subtitle: `Currently using ${activeRuntime.toUpperCase()}`,
        icon: RefreshCw,
        keywords: ['switch', 'runtime', 'engine', 'podman', 'docker'],
        action: () => onSwitchRuntime(activeRuntime === 'docker' ? 'podman' : 'docker')
      },
      {
        id: 'action-toggle-theme',
        title: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
        subtitle: 'Toggle application color scheme',
        icon: theme === 'dark' ? Sun : Moon,
        keywords: ['theme', 'dark', 'light', 'mode'],
        action: onToggleTheme
      },
      {
        id: 'action-refresh',
        title: 'Refresh All Resources',
        subtitle: 'Fetch latest containers, images, volumes, and engine state',
        icon: RefreshCw,
        keywords: ['reload', 'refresh', 'sync', 'update'],
        action: onRefresh
      },
      {
        id: 'action-prune-volumes',
        title: 'Prune Unused Volumes',
        subtitle: 'Clean up unused and orphaned Docker/Podman volumes',
        icon: Trash2,
        keywords: ['prune', 'clean', 'delete', 'volumes'],
        action: onPruneVolumes
      },
      {
        id: 'action-check-updates',
        title: 'Check for Updates',
        subtitle: 'Check GitHub releases for the latest Dockit version',
        icon: Sparkles,
        keywords: ['update', 'version', 'upgrade', 'release'],
        action: onCheckUpdates
      },
      {
        id: 'action-installer',
        title: 'Open Installer & Engines Guide',
        subtitle: 'Check requirements and install Docker or Podman engines',
        icon: DownloadCloud,
        keywords: ['install', 'setup', 'engine', 'docker', 'podman'],
        action: onOpenInstaller
      }
    ];
    actionItems.forEach(item => addItem('Actions', item));

    return result;
  }, [
    query,
    containers,
    images,
    volumes,
    networks,
    activeRuntime,
    theme,
    onNavigate,
    onSwitchRuntime,
    onToggleTheme,
    onRefresh,
    onCheckUpdates,
    onOpenInstaller,
    onContainerAction,
    onInspectImage,
    onInspectVolume,
    onPruneVolumes
  ]);

  // Adjust selection bounds if list changes
  useEffect(() => {
    if (selectedIndex >= items.length) {
      setSelectedIndex(Math.max(0, items.length - 1));
    }
  }, [items.length, selectedIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < items.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : Math.max(0, items.length - 1)));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = items[selectedIndex];
        if (selected && selected.action) {
          selected.action();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, items, selectedIndex, onClose]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 sm:px-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="fixed inset-0 -z-10" 
        onClick={onClose}
      />
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh] animate-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 gap-3 bg-slate-950/60">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, search containers, images, volumes..."
            className="flex-1 bg-transparent text-sm sm:text-base text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded shadow-sm">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 divide-y divide-slate-800/40">
          {items.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Command className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No results found for "{query}"</p>
              <p className="text-xs text-slate-500 mt-1">Try searching for container names, images, or "switch runtime"</p>
            </div>
          ) : (
            items.map((item, index) => {
              const Icon = item.icon || Box;
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  data-index={index}
                  onClick={() => {
                    if (item.action) item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-950/50 text-slate-100 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-400 group-hover:text-cyan-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate text-slate-100">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                              item.badgeColor === 'emerald'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-800/80 border border-slate-750 px-1.5 py-0.5 rounded">
                          {item.category}
                        </span>
                      </div>
                      {item.subtitle && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions / Shortcut info */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-3">
                    {item.quickActions && (
                      <div className="flex items-center gap-1">
                        {item.quickActions.map((qa, i) => {
                          const QAIcon = qa.icon;
                          return (
                            <button
                              key={i}
                              onClick={qa.action}
                              title={qa.title}
                              className={`p-1.5 rounded-md border border-slate-700/80 bg-slate-800 hover:bg-slate-750 transition ${qa.color || 'text-slate-400'}`}
                            >
                              <QAIcon className="w-3.5 h-3.5" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {item.shortcut ? (
                      <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded">
                        {item.shortcut}
                      </kbd>
                    ) : (
                      isSelected && (
                        <CornerDownLeft className="w-4 h-4 text-cyan-400 opacity-80" />
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-850 border border-slate-750 font-mono text-[10px] text-slate-300">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-850 border border-slate-750 font-mono text-[10px] text-slate-300">↓</kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-850 border border-slate-750 font-mono text-[10px] text-slate-300">↵</kbd>
              <span>select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-850 border border-slate-750 font-mono text-[10px] text-slate-300">esc</kbd>
              <span>close</span>
            </span>
          </div>
          <span className="hidden sm:inline font-mono text-[11px] text-cyan-400 font-semibold">
            Dockit Command Palette
          </span>
        </div>
      </div>
    </div>
  );
}
