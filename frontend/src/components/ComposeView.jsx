import React, { useState } from 'react';
import { 
  FolderOpen, 
  Link as LinkIcon, 
  Play, 
  Square, 
  RotateCw, 
  Code, 
  CheckCircle2, 
  AlertTriangle, 
  FileEdit, 
  Save, 
  Undo2, 
  FlaskConical, 
  Activity, 
  Server,
  Layers,
  ChevronRight
} from 'lucide-react';

export default function ComposeView({
  onOpenLocal,
  onOpenURL,
  onUp,
  onDown,
  onStart,
  onStop,
  onRestart,
  onStageChanges,
  onApplyChanges,
  onDiscardChanges,
  onRefreshProject
}) {
  const [project, setProject] = useState(null);
  const [localPathInput, setLocalPathInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [activeTab, setActiveTab] = useState('services'); // 'services' | 'editor' | 'logs'
  const [editorYaml, setEditorYaml] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionOutput, setActionOutput] = useState('');
  const [showUrlDialog, setShowUrlDialog] = useState(false);

  const handleOpenLocal = async (e) => {
    e.preventDefault();
    if (!localPathInput.trim()) return;
    try {
      setLoading(true);
      const proj = await onOpenLocal(localPathInput.trim());
      setProject(proj);
      setEditorYaml(proj.stagedYaml || proj.originalYaml || '');
    } catch (err) {
      alert(`Failed to load project: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenURL = async (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    try {
      setLoading(true);
      const proj = await onOpenURL(urlInput.trim(), 'dockit-remote-project');
      setProject(proj);
      setEditorYaml(proj.stagedYaml || proj.originalYaml || '');
      setShowUrlDialog(false);
    } catch (err) {
      alert(`Failed to clone project: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStage = async () => {
    if (!project) return;
    try {
      await onStageChanges(project.workDir, editorYaml);
      const refreshed = await onRefreshProject(project.workDir);
      setProject(refreshed);
      alert('Changes staged! You can now test run them safely without touching your disk file.');
    } catch (err) {
      alert(`Stage failed: ${err}`);
    }
  };

  const handleApply = async () => {
    if (!project) return;
    if (!window.confirm('Write staged YAML permanently to docker-compose.yml on disk?')) return;
    try {
      await onApplyChanges(project.workDir);
      const refreshed = await onRefreshProject(project.workDir);
      setProject(refreshed);
      alert('Staged changes permanently applied to disk!');
    } catch (err) {
      alert(`Apply failed: ${err}`);
    }
  };

  const handleDiscard = async () => {
    if (!project) return;
    try {
      await onDiscardChanges(project.workDir);
      const refreshed = await onRefreshProject(project.workDir);
      setProject(refreshed);
      setEditorYaml(refreshed.originalYaml);
      alert('Staged changes discarded.');
    } catch (err) {
      alert(`Discard failed: ${err}`);
    }
  };

  const handleUp = async (useStaged = false) => {
    if (!project) return;
    try {
      setLoading(true);
      const out = await onUp(project.workDir, {
        detached: true,
        build: false,
        useStaged: useStaged
      });
      setActionOutput(out);
      const refreshed = await onRefreshProject(project.workDir);
      setProject(refreshed);
    } catch (err) {
      alert(`Compose Up failed: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDown = async () => {
    if (!project) return;
    try {
      setLoading(true);
      const out = await onDown(project.workDir, { removeVolumes: false });
      setActionOutput(out);
      const refreshed = await onRefreshProject(project.workDir);
      setProject(refreshed);
    } catch (err) {
      alert(`Compose Down failed: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900/60 overflow-hidden">
      {/* Action Header */}
      <div className="p-6 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <span>Compose Management & Testing Studio</span>
            {project?.isStaged && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                <FlaskConical className="w-3 h-3" />
                Staged Testing Active
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Test YAML tweaks temporarily, run selective services, and persist changes to disk only when verified.
          </p>
        </div>

        {/* Project Selector / Loader */}
        <div className="flex items-center gap-3">
          <form onSubmit={handleOpenLocal} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="/path/to/project with compose"
              value={localPathInput}
              onChange={(e) => setLocalPathInput(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-64 font-mono transition-colors"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>Load</span>
            </button>
          </form>

          <button
            onClick={() => setShowUrlDialog(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <LinkIcon className="w-3.5 h-3.5 text-blue-400" />
            <span>Git URL</span>
          </button>
        </div>
      </div>

      {!project ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
          <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center mb-4 text-cyan-400 shadow-xl">
            <Layers className="w-8 h-8" />
          </div>
          <h2 className="text-base font-semibold text-slate-200">No Compose Project Open</h2>
          <p className="text-xs text-slate-400 max-w-md mt-1 mb-6">
            Enter a local directory path containing a <code className="text-cyan-400 font-mono">docker-compose.yml</code> file or clone one directly from GitHub to begin visual service orchestration.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setLocalPathInput('.');
              }}
              className="text-xs px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 font-mono transition-colors"
            >
              Use Current Workspace (.)
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Subheader Toolbar */}
          <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
            {/* View tabs */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('services')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  activeTab === 'services'
                    ? 'bg-slate-800 text-slate-100 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Services ({Object.keys(project.services || {}).length})
              </button>
              <button
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                  activeTab === 'editor'
                    ? 'bg-slate-800 text-slate-100 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code className="w-3.5 h-3.5 text-cyan-400" />
                YAML Testing Studio
              </button>
              <button
                onClick={() => setActiveTab('output')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  activeTab === 'output'
                    ? 'bg-slate-800 text-slate-100 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Terminal Output
              </button>
            </div>

            {/* Quick Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleUp(false)}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Compose Up</span>
              </button>
              <button
                onClick={handleDown}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all disabled:opacity-50"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Compose Down</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Visual Services List */}
          {activeTab === 'services' && (
            <div className="flex-1 overflow-auto p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(project.services || {}).map(([sName, sCfg]) => {
                  return (
                    <div
                      key={sName}
                      className="border border-slate-800 bg-slate-950/70 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-slate-100 text-sm flex items-center gap-2">
                            <Server className="w-4 h-4 text-cyan-400" />
                            {sName}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                            {sCfg.restart || 'no'}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-400 mb-4 font-mono">
                          <div>
                            <span className="text-slate-500">Image:</span>{' '}
                            <span className="text-slate-300">{sCfg.image || '(local build)'}</span>
                          </div>
                          {sCfg.ports && sCfg.ports.length > 0 && (
                            <div>
                              <span className="text-slate-500">Ports:</span>{' '}
                              <span className="text-cyan-400">{sCfg.ports.join(', ')}</span>
                            </div>
                          )}
                          {sCfg.volumes && sCfg.volumes.length > 0 && (
                            <div>
                              <span className="text-slate-500">Volumes:</span>{' '}
                              <span className="text-slate-300">{sCfg.volumes.length} mounted</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Per-service controls */}
                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-900">
                        <button
                          onClick={() => onStart(project.workDir, [sName])}
                          className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors text-xs flex items-center gap-1"
                          title="Start service"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                          onClick={() => onStop(project.workDir, [sName])}
                          className="p-1.5 text-amber-400 hover:bg-amber-400/10 rounded transition-colors text-xs flex items-center gap-1"
                          title="Stop service"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                          onClick={() => onRestart(project.workDir, [sName])}
                          className="p-1.5 text-slate-400 hover:bg-slate-800 rounded transition-colors text-xs flex items-center gap-1"
                          title="Restart service"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 2: YAML Testing Studio */}
          {activeTab === 'editor' && (
            <div className="flex-1 flex flex-col p-6 overflow-hidden">
              {/* Studio Toolbar */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Target File:</span>
                  <span className="font-mono text-cyan-400">{project.composeFile}</span>
                  {project.isStaged ? (
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-semibold">
                      Draft Testing Sandbox Active
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[11px]">
                      Synced with Disk
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleStage}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 text-xs font-semibold transition-all"
                    title="Stage YAML into memory for non-destructive dry testing"
                  >
                    <FlaskConical className="w-3.5 h-3.5" />
                    <span>Stage in Sandbox</span>
                  </button>

                  <button
                    onClick={() => handleUp(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/30 text-xs font-semibold transition-all"
                    title="Test run with staged changes"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Test Run Staged</span>
                  </button>

                  {project.isStaged && (
                    <>
                      <button
                        onClick={handleApply}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-xs font-bold transition-all"
                        title="Permanently overwrite docker-compose.yml on disk"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Apply to Disk File</span>
                      </button>

                      <button
                        onClick={handleDiscard}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all"
                        title="Discard draft sandbox and restore original disk YAML"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        <span>Discard Changes</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Monospace Code Editor */}
              <div className="flex-1 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-inner flex flex-col">
                <textarea
                  value={editorYaml}
                  onChange={(e) => setEditorYaml(e.target.value)}
                  className="flex-1 w-full p-4 bg-transparent font-mono text-xs text-slate-200 resize-none focus:outline-none"
                  spellCheck={false}
                />
              </div>
            </div>
          )}

          {/* Tab 3: Terminal Output */}
          {activeTab === 'output' && (
            <div className="flex-1 p-6 flex flex-col overflow-hidden">
              <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-emerald-400 overflow-auto whitespace-pre-wrap">
                {actionOutput || 'No command execution output yet. Run Compose Up or Down to see output stream.'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Clone Git URL Modal */}
      {showUrlDialog && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-cyan-400" />
                Open Compose from Git Repository
              </h2>
              <button
                onClick={() => setShowUrlDialog(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleOpenURL} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Git Repository URL *</label>
                <input
                  type="text"
                  required
                  placeholder="https://github.com/user/compose-project.git"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Dockit clones the repository locally and loads the compose stack ready for staged edits and execution.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUrlDialog(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold hover:brightness-110 disabled:opacity-50"
                >
                  {loading ? 'Cloning...' : 'Clone & Load'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
