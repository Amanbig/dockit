import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Terminal, 
  DownloadCloud, 
  Palette, 
  HardDrive, 
  Zap,
  Save,
  CheckCircle2,
  RefreshCw,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';

export default function SettingsView({
  config,
  onSaveConfig,
  onOpenInstaller,
  onSwitchRuntime,
  activeRuntime,
  theme,
  onSetTheme,
  appVersion = '0.1.0'
}) {
  const [selectedTheme, setSelectedTheme] = useState(theme || config?.ui?.theme || 'dark');
  const [defaultRuntime, setDefaultRuntime] = useState(activeRuntime || 'docker');
  const [dockerSocket, setDockerSocket] = useState(config?.runtime?.dockerSocket || '');
  const [podmanSocket, setPodmanSocket] = useState(config?.runtime?.podmanSocket || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (activeRuntime) {
      setDefaultRuntime(activeRuntime);
    }
  }, [activeRuntime]);

  useEffect(() => {
    if (theme) {
      setSelectedTheme(theme);
    }
  }, [theme]);

  // Instant Theme Switcher
  const handleThemeChange = async (t) => {
    setSelectedTheme(t);
    if (onSetTheme) {
      await onSetTheme(t);
    }
  };

  // Instant Runtime Switcher when clicking radio
  const handleRuntimeChange = async (rt) => {
    setDefaultRuntime(rt);
    if (onSwitchRuntime && rt !== activeRuntime) {
      await onSwitchRuntime(rt);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (onSwitchRuntime && defaultRuntime !== activeRuntime) {
        await onSwitchRuntime(defaultRuntime);
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err) {
      alert(`Save failed: ${err}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900/60 overflow-y-auto">
      {/* Top Header */}
      <div className="p-4 md:p-6 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            Preferences & Environment
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure default container engine, custom socket endpoints, and installation packages.
          </p>
        </div>

        <button
          onClick={onOpenInstaller}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 text-xs font-bold shadow-md shadow-cyan-500/20 hover:brightness-110 whitespace-nowrap"
        >
          <DownloadCloud className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Launch Engine Installer</span>
        </button>
      </div>

      {/* Main Settings Form */}
      <div className="p-4 md:p-6 max-w-2xl space-y-6">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Theme & Visuals: Instant Apply */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/70 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-cyan-400" />
                  Interface Theme
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Applies instantly across all screens.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleThemeChange('dark')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                  selectedTheme === 'dark'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </button>

              <button
                type="button"
                onClick={() => handleThemeChange('light')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                  selectedTheme === 'light'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light</span>
              </button>

              <button
                type="button"
                onClick={() => handleThemeChange('system')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                  selectedTheme === 'system'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>System</span>
              </button>
            </div>
          </div>

          {/* Active Runtime Selection: Instant Switch */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/70 space-y-3">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              Default Container Engine
            </h2>
            <p className="text-xs text-slate-400">
              Select which container daemon Dockit connects to.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label 
                onClick={() => handleRuntimeChange('docker')}
                className={`p-4 rounded-lg border cursor-pointer flex flex-col gap-1 transition-all ${
                  defaultRuntime === 'docker'
                    ? 'border-cyan-500 bg-cyan-950/20 text-slate-100 shadow-sm'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Docker Engine</span>
                  <input
                    type="radio"
                    name="defaultRuntime"
                    value="docker"
                    checked={defaultRuntime === 'docker'}
                    onChange={() => {}}
                    className="accent-cyan-500 pointer-events-none"
                  />
                </div>
                <span className="text-[11px] text-slate-500 font-mono">/var/run/docker.sock</span>
              </label>

              <label 
                onClick={() => handleRuntimeChange('podman')}
                className={`p-4 rounded-lg border cursor-pointer flex flex-col gap-1 transition-all ${
                  defaultRuntime === 'podman'
                    ? 'border-purple-500 bg-purple-950/20 text-slate-100 shadow-sm'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Podman</span>
                  <input
                    type="radio"
                    name="defaultRuntime"
                    value="podman"
                    checked={defaultRuntime === 'podman'}
                    onChange={() => {}}
                    className="accent-purple-500 pointer-events-none"
                  />
                </div>
                <span className="text-[11px] text-slate-500 font-mono">podman.sock (rootless / rootful)</span>
              </label>
            </div>
          </div>

          {/* Sockets Overrides */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/70 space-y-4">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              Daemon Socket Endpoints (Optional Overrides)
            </h2>
            <p className="text-xs text-slate-400">
              Dockit auto-detects standard unix sockets, user rootless sockets, and named pipes. Override if running custom proxies.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Docker Socket Endpoint</label>
                <input
                  type="text"
                  placeholder="unix:///var/run/docker.sock"
                  value={dockerSocket}
                  onChange={(e) => setDockerSocket(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Podman Socket Endpoint</label>
                <input
                  type="text"
                  placeholder="unix:///run/user/1000/podman/podman.sock"
                  value={podmanSocket}
                  onChange={(e) => setPodmanSocket(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* About & Version Information */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-sm">
                  D
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-200">Dockit Desktop</h2>
                  <p className="text-xs text-slate-400">Universal Docker &amp; Podman Management</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono text-xs font-semibold">
                v{appVersion.replace(/^v/, '')}
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Built with Wails v2, Go, and React. Official binaries are built across Linux, Windows, and macOS via GitHub Actions.
            </p>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {savedSuccess && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium animate-pulse">
                  <CheckCircle2 className="w-4 h-4" />
                  Preferences saved successfully!
                </span>
              )}
            </div>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 text-xs font-bold hover:brightness-110 shadow-md shadow-cyan-500/20"
            >
              <Save className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Save Preferences</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
