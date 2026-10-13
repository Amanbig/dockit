import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  X, 
  Terminal, 
  Cpu, 
  Play, 
  Sparkles,
  Lock
} from 'lucide-react';

export default function InstallerModal({ 
  isOpen, 
  onClose, 
  onDetect, 
  onGetPlan, 
  onInstall,
  onInstalled 
}) {
  const [detection, setDetection] = useState(null);
  const [selectedRuntime, setSelectedRuntime] = useState('docker');
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [installStatus, setInstallStatus] = useState('');
  const [error, setError] = useState('');

  const runDetection = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await onDetect();
      setDetection(res);

      // If docker is already running, or if podman is installed, select thoughtfully
      let initialChoice = 'docker';
      if (res?.docker?.running) {
        initialChoice = res?.podman?.running ? 'docker' : (!res?.podman?.installed ? 'podman' : 'docker');
      } else if (res?.podman?.running) {
        initialChoice = 'docker';
      }
      setSelectedRuntime(initialChoice);
      await loadPlan(initialChoice);
    } catch (err) {
      setError(`Detection failed: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const loadPlan = async (rt) => {
    try {
      const p = await onGetPlan(rt);
      setPlan(p);
    } catch (err) {
      setError(`Failed to generate installation plan: ${err}`);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runDetection();
    }
  }, [isOpen]);

  const handleSelectRuntime = (rt) => {
    setSelectedRuntime(rt);
    loadPlan(rt);
  };

  const handleInstall = async () => {
    setInstalling(true);
    setError('');
    setInstallStatus(`Installing ${selectedRuntime}... If prompted, please enter your root/sudo credentials in the system prompt.`);
    try {
      await onInstall(selectedRuntime);
      setInstallStatus(`Installation completed successfully!`);
      if (onInstalled) {
        onInstalled(selectedRuntime);
      }
      // Re-scan after install
      await runDetection();
    } catch (err) {
      setError(`Installation failed: ${err}`);
    } finally {
      setInstalling(false);
    }
  };

  if (!isOpen) return null;

  const currentStatus = selectedRuntime === 'docker' ? detection?.docker : detection?.podman;
  const isCurrentlyActive = currentStatus?.running;
  const isCurrentlyInstalled = currentStatus?.installed;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Container Engine Setup & Health</h2>
              <p className="text-xs text-slate-400">Inspect active daemon status or install missing container engines</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5 text-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
              <span>Scanning host system for container runtimes...</span>
            </div>
          ) : (
            <>
              {/* Detection Cards */}
              <div className="grid grid-cols-2 gap-3">
                {/* Docker Card */}
                <div
                  onClick={() => handleSelectRuntime('docker')}
                  className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                    selectedRuntime === 'docker'
                      ? 'border-cyan-500 bg-cyan-950/25 shadow-sm'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-200">Docker</span>
                    {detection?.docker?.running ? (
                      <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Active
                      </span>
                    ) : detection?.docker?.installed ? (
                      <span className="text-xs text-amber-400 font-medium">Stopped</span>
                    ) : (
                      <span className="text-xs text-slate-500 font-medium">Not Installed</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    Industry-standard container daemon with socket API support.
                  </p>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {detection?.docker?.version || 'Binary not found'}
                  </div>
                </div>

                {/* Podman Card */}
                <div
                  onClick={() => handleSelectRuntime('podman')}
                  className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                    selectedRuntime === 'podman'
                      ? 'border-purple-500 bg-purple-950/25 shadow-sm'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-200">Podman</span>
                    {detection?.podman?.running ? (
                      <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Active
                      </span>
                    ) : detection?.podman?.installed ? (
                      <span className="text-xs text-amber-400 font-medium">Stopped</span>
                    ) : (
                      <span className="text-xs text-slate-500 font-medium">Not Installed</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    Daemonless, rootless container engine with native Pods.
                  </p>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {detection?.podman?.version || 'Binary not found'}
                    {detection?.os === 'windows' && (
                      <span className="block mt-1 text-[10px] text-amber-400/90 font-sans">
                        Requires WSL2 VM backend
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              {isCurrentlyActive ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div>
                      <span className="text-emerald-300 font-semibold uppercase">{selectedRuntime} is fully active! </span>
                      <span className="text-slate-300">
                        Dockit is connected and ready. You don't need to reinstall it.
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-slate-800/40 border border-slate-800 rounded-xl text-xs text-slate-300">
                  <span className="text-slate-400 font-medium">Status Diagnostic: </span>
                  {currentStatus?.message || 'Ready for configuration.'}
                </div>
              )}

              {/* Install Plan Disclosure */}
              {plan && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      {isCurrentlyActive ? 'Underlying Setup & Commands' : `Installation Plan (${plan.packageManager})`}
                    </h4>
                    {plan.warning && !isCurrentlyActive && (
                      <span className="text-[11px] text-amber-400 flex items-center gap-1 font-medium">
                        <Lock className="w-3.5 h-3.5" /> Requires system admin authentication
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
                    {plan.steps.map((st, idx) => (
                      <div key={st.id} className="flex items-start gap-2.5 text-xs">
                        <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-300 flex-shrink-0 mt-0.5 font-bold">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-200">{st.title}</p>
                          <p className="text-[11px] text-slate-400">{st.description}</p>
                          <div className="mt-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 font-mono text-[11px] text-cyan-300 overflow-x-auto">
                            {st.command}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error or Progress */}
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {installStatus && (
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 rounded-xl text-xs flex items-center gap-2">
                  <RefreshCw className={`w-4 h-4 flex-shrink-0 ${installing ? 'animate-spin' : ''}`} />
                  <span>{installStatus}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <button
            onClick={runDetection}
            disabled={loading || installing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Re-scan System
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={installing}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg transition"
            >
              {isCurrentlyActive ? 'Done' : 'Cancel'}
            </button>

            {!isCurrentlyActive && (
              <button
                onClick={handleInstall}
                disabled={loading || installing}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 rounded-lg transition shadow-lg shadow-cyan-500/20 disabled:opacity-50 hover:brightness-110"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                {installing ? 'Installing...' : `Install ${selectedRuntime === 'docker' ? 'Docker' : 'Podman'}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
