import React, { useState, useEffect } from 'react';
import { 
  FolderOpen, 
  Link as LinkIcon, 
  Play, 
  Square, 
  RotateCw, 
  Code, 
  CheckCircle2, 
  AlertTriangle, 
  Save, 
  Undo2, 
  FlaskConical, 
  Server,
  Layers,
  ChevronRight,
  GitBranch,
  GitCommit,
  History,
  Terminal,
  Trash2,
  ArrowLeft,
  FileCheck,
  Check,
  Copy,
  Plus
} from 'lucide-react';

const RECENT_PROJECTS_STORAGE_KEY = 'dockit_recent_compose_projects';

export default function ComposeView({
  onOpenLocal,
  onOpenURL,
  onSelectDirectory,
  onUp,
  onDown,
  onStart,
  onStop,
  onRestart,
  onStageChanges,
  onApplyChanges,
  onDiscardChanges,
  onRefreshProject,
  onSaveSnapshot,
  onRestoreSnapshot
}) {
  const [project, setProject] = useState(null);
  const [recentProjects, setRecentProjects] = useState([]);
  const [localPathInput, setLocalPathInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [activeTab, setActiveTab] = useState('services'); // 'services' | 'editor' | 'snapshots' | 'output'
  const [editorYaml, setEditorYaml] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionOutput, setActionOutput] = useState('');
  const [showUrlDialog, setShowUrlDialog] = useState(false);
  const [snapshotMsg, setSnapshotMsg] = useState('');
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [serviceLoading, setServiceLoading] = useState({});
  const [showDownModal, setShowDownModal] = useState(false);
  const [downOptions, setDownOptions] = useState({
    removeVolumes: false,
    removeOrphans: true,
    removeImages: false
  });

  // Load saved projects list from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_PROJECTS_STORAGE_KEY);
      if (saved) {
        setRecentProjects(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to parse recent compose projects:', e);
    }
  }, []);

  const saveRecentProject = (proj) => {
    if (!proj || !proj.workingDir) return;
    try {
      const existing = recentProjects.filter(p => p.workingDir !== proj.workingDir);
      const updated = [
        {
          name: proj.name,
          workingDir: proj.workingDir,
          filePath: proj.filePath,
          servicesCount: Array.isArray(proj.services) ? proj.services.length : 0,
          lastOpened: new Date().toISOString()
        },
        ...existing
      ].slice(0, 15);
      setRecentProjects(updated);
      localStorage.setItem(RECENT_PROJECTS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save recent projects:', e);
    }
  };

  const removeRecentProject = (workingDir, e) => {
    if (e) e.stopPropagation();
    const updated = recentProjects.filter(p => p.workingDir !== workingDir);
    setRecentProjects(updated);
    localStorage.setItem(RECENT_PROJECTS_STORAGE_KEY, JSON.stringify(updated));
  };

  const loadProjectFromPath = async (dirPath) => {
    if (!dirPath || !dirPath.trim()) return;
    try {
      setLoading(true);
      let proj = await onOpenLocal(dirPath.trim());
      if (onRefreshProject) {
        try {
          const refreshed = await onRefreshProject(proj.id || proj.filePath || dirPath.trim());
          if (refreshed) proj = refreshed;
        } catch (_) {}
      }
      setProject(proj);
      setEditorYaml(proj.temporaryContent || proj.content || '');
      setActiveTab('services');
      saveRecentProject(proj);
    } catch (err) {
      alert(`Failed to load compose project: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceStart = async (sName) => {
    if (!project || !projectKey) return;
    try {
      setServiceLoading(prev => ({ ...prev, [sName]: true }));
      await onStart(projectKey, [sName]);
      const refreshed = await onRefreshProject(projectKey);
      if (refreshed) setProject(refreshed);
    } catch (err) {
      alert(`Failed to start ${sName}: ${err}`);
    } finally {
      setServiceLoading(prev => ({ ...prev, [sName]: false }));
    }
  };

  const handleServiceStop = async (sName) => {
    if (!project || !projectKey) return;
    try {
      setServiceLoading(prev => ({ ...prev, [sName]: true }));
      await onStop(projectKey, [sName]);
      const refreshed = await onRefreshProject(projectKey);
      if (refreshed) setProject(refreshed);
    } catch (err) {
      alert(`Failed to stop ${sName}: ${err}`);
    } finally {
      setServiceLoading(prev => ({ ...prev, [sName]: false }));
    }
  };

  const handleServiceRestart = async (sName) => {
    if (!project || !projectKey) return;
    try {
      setServiceLoading(prev => ({ ...prev, [sName]: true }));
      await onRestart(projectKey, [sName]);
      const refreshed = await onRefreshProject(projectKey);
      if (refreshed) setProject(refreshed);
    } catch (err) {
      alert(`Failed to restart ${sName}: ${err}`);
    } finally {
      setServiceLoading(prev => ({ ...prev, [sName]: false }));
    }
  };

  const handleOpenLocal = async (e) => {
    if (e) e.preventDefault();
    await loadProjectFromPath(localPathInput);
  };

  const handleBrowseDir = async () => {
    if (!onSelectDirectory) return;
    try {
      const selected = await onSelectDirectory();
      if (selected && selected.trim()) {
        setLocalPathInput(selected.trim());
        await loadProjectFromPath(selected.trim());
      }
    } catch (err) {
      alert(`Directory selection failed: ${err}`);
    }
  };

  const handleOpenURL = async (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    try {
      setLoading(true);
      const proj = await onOpenURL(urlInput.trim(), 'dockit-remote-project');
      setProject(proj);
      setEditorYaml(proj.temporaryContent || proj.content || '');
      setActiveTab('services');
      setShowUrlDialog(false);
      saveRecentProject(proj);
    } catch (err) {
      alert(`Failed to clone project: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const projectKey = project?.id || project?.filePath || project?.workingDir;

  const handleStage = async () => {
    if (!project || !projectKey) return;
    try {
      await onStageChanges(projectKey, editorYaml);
      const refreshed = await onRefreshProject(projectKey);
      setProject(refreshed);
      setEditorYaml(refreshed.temporaryContent || refreshed.content || '');
      alert('Changes staged! Testing sandbox updated with Git blob hash.');
    } catch (err) {
      alert(`Stage failed: ${err}`);
    }
  };

  const handleApply = async () => {
    if (!project || !projectKey) return;
    if (!window.confirm('Write staged YAML permanently to docker-compose.yml on disk?')) return;
    try {
      await onApplyChanges(projectKey);
      const refreshed = await onRefreshProject(projectKey);
      setProject(refreshed);
      setEditorYaml(refreshed.temporaryContent || refreshed.content || '');
      alert('Staged changes permanently committed to disk!');
    } catch (err) {
      alert(`Apply failed: ${err}`);
    }
  };

  const handleDiscard = async () => {
    if (!project || !projectKey) return;
    try {
      await onDiscardChanges(projectKey);
      const refreshed = await onRefreshProject(projectKey);
      setProject(refreshed);
      setEditorYaml(refreshed.content || '');
      alert('Staged sandbox changes discarded. Restored clean disk version.');
    } catch (err) {
      alert(`Discard failed: ${err}`);
    }
  };

  const handleSaveSnapshot = async (e) => {
    if (e) e.preventDefault();
    if (!project || !projectKey || !onSaveSnapshot) return;
    try {
      await onSaveSnapshot(projectKey, snapshotMsg || 'Manual snapshot');
      const refreshed = await onRefreshProject(projectKey);
      setProject(refreshed);
      setSnapshotMsg('');
      setShowSnapshotModal(false);
      alert('Git-like SHA-256 snapshot revision successfully saved!');
    } catch (err) {
      alert(`Failed to save snapshot: ${err}`);
    }
  };

  const handleRestoreSnapshot = async (hash) => {
    if (!project || !projectKey || !onRestoreSnapshot) return;
    if (!window.confirm(`Restore YAML revision ${hash.slice(0, 8)} into testing sandbox?`)) return;
    try {
      const restored = await onRestoreSnapshot(projectKey, hash);
      setProject(restored);
      setEditorYaml(restored.temporaryContent || restored.content || '');
      setActiveTab('editor');
      alert(`Snapshot ${hash.slice(0, 8)} staged into sandbox. You can now test run or apply it to disk.`);
    } catch (err) {
      alert(`Failed to restore snapshot: ${err}`);
    }
  };

  const handleUp = async (useStaged = false) => {
    if (!project || !projectKey) return;
    try {
      setLoading(true);
      const out = await onUp(projectKey, {
        detached: true,
        build: false,
        useStaged: useStaged
      });
      setActionOutput(out);
      const refreshed = await onRefreshProject(projectKey);
      setProject(refreshed);
      setActiveTab('output');
    } catch (err) {
      alert(`Compose Up failed: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDownModal = () => {
    setShowDownModal(true);
  };

  const executeDown = async () => {
    if (!project || !projectKey) return;
    try {
      setLoading(true);
      setShowDownModal(false);
      const out = await onDown(projectKey, downOptions);
      setActionOutput(out);
      const refreshed = await onRefreshProject(projectKey);
      setProject(refreshed);
      setActiveTab('output');
    } catch (err) {
      alert(`Compose Down failed: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRestartStack = async () => {
    if (!project || !projectKey) return;
    try {
      setLoading(true);
      const out = await onRestart(projectKey, []);
      setActionOutput(out);
      const refreshed = await onRefreshProject(projectKey);
      setProject(refreshed);
      setActiveTab('output');
    } catch (err) {
      alert(`Restart stack failed: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900/60 overflow-hidden">
      {/* Top Header Bar */}
      <div className="p-6 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {project ? (
              <button
                onClick={() => setProject(null)}
                className="text-cyan-400 hover:text-cyan-300 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer mr-1"
                title="Return to Compose Projects list"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>All Projects</span>
              </button>
            ) : null}
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <span>{project ? project.name : 'Docker Compose Studio'}</span>
              {project?.hasStagedChanges && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <FlaskConical className="w-3 h-3" />
                  Staged Testing Active
                </span>
              )}
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {project 
              ? `Workspace: ${project.workingDir}`
              : 'Open multi-container projects, test YAML non-destructively with Git-style blob hashing, and manage services.'}
          </p>
        </div>

        {/* Directory Loader: Only shown in All Projects view */}
        {!project && (
          <div className="flex items-center gap-3">
            <form onSubmit={handleOpenLocal} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="/path/to/project folder"
                value={localPathInput}
                onChange={(e) => setLocalPathInput(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-56 md:w-72 font-mono transition-colors"
              />
              <button
                type="button"
                onClick={handleBrowseDir}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Open native file explorer to select folder"
              >
                <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
                <span>Browse</span>
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all cursor-pointer"
              >
                <span>Load</span>
              </button>
            </form>

            <button
              onClick={() => setShowUrlDialog(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>Git URL</span>
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: Projects Library (when no project is open) */}
      {!project ? (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Action Callout Hero */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                <Layers className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-100">Select or Open a Compose Folder</h2>
                <p className="text-xs text-slate-400 max-w-xl mt-1">
                  Choose a directory containing <code className="text-cyan-400 font-mono">docker-compose.yml</code>. Dockit will create a dedicated project workspace with service inspection, Git-style blob hashing, and isolated testing sandboxes.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleBrowseDir}
                className="text-xs px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Browse Folder in Explorer</span>
              </button>
              <button
                onClick={() => {
                  setLocalPathInput('.');
                  loadProjectFromPath('.');
                }}
                className="text-xs px-3.5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 font-mono transition-colors cursor-pointer"
              >
                Use Current Workspace (.)
              </button>
            </div>
          </div>

          {/* Recent Projects List */}
          <div>
            <h3 className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-3 flex items-center gap-2">
              <History className="w-3.5 h-3.5 text-cyan-400" />
              Recent Compose Projects ({recentProjects.length})
            </h3>

            {recentProjects.length === 0 ? (
              <div className="p-8 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500">
                No recent projects opened yet. Use the Browse button above to open your first compose project.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentProjects.map((p) => (
                  <div
                    key={p.workingDir}
                    onClick={() => loadProjectFromPath(p.workingDir)}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-900/70 hover:border-cyan-500/50 hover:bg-slate-900 transition-all cursor-pointer flex flex-col justify-between group shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-100 text-sm group-hover:text-cyan-400 transition-colors flex items-center gap-2">
                          <Layers className="w-4 h-4 text-cyan-400" />
                          {p.name}
                        </span>
                        <button
                          onClick={(e) => removeRecentProject(p.workingDir, e)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Remove from recents"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="font-mono text-xs text-slate-400 truncate mb-3" title={p.workingDir}>
                        {p.workingDir}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                          {p.servicesCount || 0} services
                        </span>
                        <span>Opened {new Date(p.lastOpened).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-cyan-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        Open Project Workspace
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* VIEW 2: Dedicated Compose Project Workspace */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Subheader Toolbar */}
          <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
            {/* View tabs */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('services')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'services'
                    ? 'bg-slate-800 text-cyan-400 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Services ({Array.isArray(project.services) ? project.services.length : Object.keys(project.services || {}).length})
              </button>
              <button
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'editor'
                    ? 'bg-slate-800 text-cyan-400 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code className="w-3.5 h-3.5 text-cyan-400" />
                <span>YAML Testing Studio</span>
              </button>
              <button
                onClick={() => setActiveTab('snapshots')}
                className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'snapshots'
                    ? 'bg-slate-800 text-cyan-400 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <GitCommit className="w-3.5 h-3.5 text-cyan-400" />
                <span>Git Snapshots ({project.snapshots?.length || 0})</span>
              </button>
              <button
                onClick={() => setActiveTab('output')}
                className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'output'
                    ? 'bg-slate-800 text-cyan-400 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Terminal Output</span>
              </button>
            </div>

            {/* Quick Action buttons */}
            <div className="flex items-center gap-2">
              {(() => {
                const isStackActive = project.status === 'running' || project.status === 'partial' || (project.services || []).some(s => (s.status || '').toLowerCase() === 'running');
                return isStackActive ? (
                  <>
                    <button
                      onClick={handleOpenDownModal}
                      disabled={loading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                      title="Stop stack and choose cleanup options"
                    >
                      {loading ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5 fill-current" />}
                      <span>Compose Down</span>
                    </button>
                    <button
                      onClick={handleRestartStack}
                      disabled={loading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-medium transition-all disabled:opacity-50 cursor-pointer"
                      title="Restart entire stack"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
                      <span>Restart Stack</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleUp(false)}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm shadow-emerald-500/10"
                    title="Launch compose stack"
                  >
                    {loading ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    <span>Compose Up</span>
                  </button>
                );
              })()}
              <button
                onClick={() => onRefreshProject(projectKey).then(setProject)}
                disabled={loading}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded transition-colors cursor-pointer"
                title="Refresh project status"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* TAB 1: Visual Services List */}
          {activeTab === 'services' && (
            <div className="flex-1 overflow-auto p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(Array.isArray(project.services)
                  ? project.services
                  : Object.entries(project.services || {}).map(([sName, sCfg]) => ({ name: sName, ...sCfg }))
                ).map((service) => {
                  const sName = service.name;
                  const isRunning = (service.status || '').toLowerCase() === 'running';
                  const isBusy = !!serviceLoading[sName];

                  return (
                    <div
                      key={sName}
                      className="border border-slate-800 bg-slate-950/70 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-sm"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-slate-100 text-sm flex items-center gap-2">
                            <Server className="w-4 h-4 text-cyan-400" />
                            {sName}
                          </span>
                          {isRunning ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1.5 font-mono">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              running
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                              {service.status || 'stopped'}
                            </span>
                          )}
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-400 mb-4 font-mono">
                          <div>
                            <span className="text-slate-500">Image:</span>{' '}
                            <span className="text-slate-300">{service.image || '(local build)'}</span>
                          </div>
                          {service.ports && service.ports.length > 0 && (
                            <div>
                              <span className="text-slate-500">Ports:</span>{' '}
                              <span className="text-cyan-400">{Array.isArray(service.ports) ? service.ports.join(', ') : String(service.ports)}</span>
                            </div>
                          )}
                          {service.volumes && service.volumes.length > 0 && (
                            <div>
                              <span className="text-slate-500">Volumes:</span>{' '}
                              <span className="text-slate-300">{service.volumes.length} mounted</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Context-aware per-service controls */}
                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-900">
                        {isRunning ? (
                          <>
                            <button
                              onClick={() => handleServiceStop(sName)}
                              disabled={isBusy}
                              className="flex items-center gap-1.5 px-3 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                              title="Stop service"
                            >
                              {isBusy ? (
                                <RotateCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Square className="w-3 h-3 fill-current" />
                              )}
                              <span>Stop</span>
                            </button>
                            <button
                              onClick={() => handleServiceRestart(sName)}
                              disabled={isBusy}
                              className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs transition-colors cursor-pointer disabled:opacity-50"
                              title="Restart service"
                            >
                              <RotateCw className={`w-3 h-3 ${isBusy ? 'animate-spin text-cyan-400' : ''}`} />
                              <span>Restart</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleServiceStart(sName)}
                            disabled={isBusy}
                            className="flex items-center gap-1.5 px-3.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                            title="Start service"
                          >
                            {isBusy ? (
                              <RotateCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Play className="w-3 h-3 fill-current" />
                            )}
                            <span>Start</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: YAML Testing Studio with Git-Style Hashing */}
          {activeTab === 'editor' && (
            <div className="flex-1 flex flex-col p-6 overflow-hidden">
              {/* Studio Toolbar */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs min-w-0 max-w-full sm:max-w-md md:max-w-xl">
                  <span className="text-slate-400 shrink-0">Git SHA-256:</span>
                  <span className="font-mono text-cyan-400 truncate text-[11px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800" title={project.contentHash}>
                    {project.contentHash ? project.contentHash.slice(0, 16) + '...' : 'computing...'}
                  </span>
                  {project.hasStagedChanges ? (
                    <span className="shrink-0 px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-semibold">
                      Staged Draft Active
                    </span>
                  ) : (
                    <span className="shrink-0 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold">
                      Clean & Synced
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setShowSnapshotModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
                    title="Commit a Git-style hash snapshot"
                  >
                    <GitCommit className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Save Snapshot</span>
                  </button>

                  <button
                    onClick={handleStage}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer"
                    title="Stage YAML into memory for non-destructive dry testing"
                  >
                    <FlaskConical className="w-3.5 h-3.5" />
                    <span>Stage in Sandbox</span>
                  </button>

                  <button
                    onClick={() => handleUp(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/30 text-xs font-semibold transition-all cursor-pointer"
                    title="Test run with staged changes"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Test Run Staged</span>
                  </button>

                  {project.hasStagedChanges && (
                    <>
                      <button
                        onClick={handleApply}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer"
                        title="Permanently overwrite docker-compose.yml on disk"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Apply to Disk</span>
                      </button>

                      <button
                        onClick={handleDiscard}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer"
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
                  className="flex-1 w-full p-4 bg-transparent font-mono text-xs text-slate-200 resize-none focus:outline-none leading-relaxed"
                  spellCheck={false}
                />
              </div>
            </div>
          )}

          {/* TAB 3: Git Revisions & Snapshots */}
          {activeTab === 'snapshots' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-cyan-400" />
                    <span>Revision History & Git-Style Blob Hashes</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Every snapshot creates an immutable Git blob SHA-256 hash snapshot for versioning and safe rollback.
                  </p>
                </div>
                <button
                  onClick={() => setShowSnapshotModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Snapshot</span>
                </button>
              </div>

              {!project.snapshots || project.snapshots.length === 0 ? (
                <div className="p-12 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500">
                  <GitCommit className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="font-medium text-slate-400">No revisions saved yet</p>
                  <p className="mt-1">Click &ldquo;New Snapshot&rdquo; to capture a versioned hash checkpoint of your compose configuration.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {project.snapshots.map((snap) => (
                    <div
                      key={snap.hash}
                      className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                            sha256:{snap.hash.slice(0, 10)}...
                          </span>
                          <span className="font-semibold text-slate-200">{snap.message}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span>Recorded: {snap.timestamp}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRestoreSnapshot(snap.hash)}
                          className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
                        >
                          Restore to Sandbox
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Terminal Output */}
          {activeTab === 'output' && (
            <div className="flex-1 p-6 flex flex-col overflow-hidden">
              <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-emerald-400 overflow-auto whitespace-pre-wrap leading-relaxed select-text">
                {actionOutput || 'No command execution output yet. Run Compose Up or Down to inspect the live CLI stream.'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Snapshot Commit Modal */}
      {showSnapshotModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-cyan-400" />
                Commit Git-Style Hash Snapshot
              </h2>
              <button
                onClick={() => setShowSnapshotModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveSnapshot} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Snapshot Message / Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Added redis cache and mounted pgdata volume"
                  value={snapshotMsg}
                  onChange={(e) => setSnapshotMsg(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Computes an immutable SHA-256 Git blob hash of the YAML content for instant rollback at any time.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSnapshotModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold cursor-pointer"
                >
                  Save Snapshot
                </button>
              </div>
            </form>
          </div>
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
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold hover:brightness-110 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Cloning...' : 'Clone & Load'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Compose Down Options */}
      {showDownModal && project && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Square className="w-4 h-4 text-rose-400 fill-rose-400" />
                <span>Compose Down: {project.name}</span>
              </h2>
              <button
                onClick={() => setShowDownModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-300">
                Stop and remove containers, networks, and internal resources created for this compose stack.
              </p>

              <div className="space-y-3 pt-1">
                {/* Option 1: Remove Volumes */}
                <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-800 bg-slate-950 hover:border-slate-700 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={downOptions.removeVolumes}
                    onChange={(e) => setDownOptions({ ...downOptions, removeVolumes: e.target.checked })}
                    className="mt-0.5 rounded border-slate-700 text-rose-500 focus:ring-rose-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <span>Remove Named & Anonymous Volumes</span>
                      <code className="text-[10px] text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20">-v / --volumes</code>
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Deletes persistent database storage, caches, and volumes declared in the Compose file.
                    </p>
                  </div>
                </label>

                {/* Option 2: Remove Orphans */}
                <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-800 bg-slate-950 hover:border-slate-700 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={downOptions.removeOrphans}
                    onChange={(e) => setDownOptions({ ...downOptions, removeOrphans: e.target.checked })}
                    className="mt-0.5 rounded border-slate-700 text-rose-500 focus:ring-rose-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <span>Remove Orphaned Containers</span>
                      <code className="text-[10px] text-slate-400 bg-slate-800 px-1 py-0.2 rounded border border-slate-700">--remove-orphans</code>
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Cleans up old containers previously created for services removed from the YAML.
                    </p>
                  </div>
                </label>

                {/* Option 3: Remove Images */}
                <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-800 bg-slate-950 hover:border-slate-700 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={downOptions.removeImages}
                    onChange={(e) => setDownOptions({ ...downOptions, removeImages: e.target.checked })}
                    className="mt-0.5 rounded border-slate-700 text-rose-500 focus:ring-rose-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <span>Remove Associated Images</span>
                      <code className="text-[10px] text-slate-400 bg-slate-800 px-1 py-0.2 rounded border border-slate-700">--rmi all</code>
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Deletes images downloaded or locally built for this project to reclaim disk space.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDownModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeDown}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all cursor-pointer shadow-md shadow-rose-600/20"
                >
                  {loading ? 'Stopping...' : 'Confirm Compose Down'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
