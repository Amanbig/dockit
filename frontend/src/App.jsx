import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ContainersView from './components/ContainersView';
import ImagesView from './components/ImagesView';
import VolumesView from './components/VolumesView';
import NetworksView from './components/NetworksView';
import CleanupView from './components/CleanupView';
import ComposeView from './components/ComposeView';
import RegistryView from './components/RegistryView';
import SettingsView from './components/SettingsView';
import ContainerDetailsView from './components/ContainerDetailsView';

import LogsModal from './components/LogsModal';
import InspectModal from './components/InspectModal';
import InstallerModal from './components/InstallerModal';
import CommandPalette from './components/CommandPalette';
import ConfirmModal from './components/ConfirmModal';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastContainer, formatEngineError } from './components/Toast';
import { Sparkles, ArrowRight, X, AlertCircle } from 'lucide-react';
import packageJson from '../package.json';

// Wails Go Bridge API bindings
import {
  GetActiveRuntime,
  SwitchRuntime,
  GetSystemInfo,
  GetHostMetrics,
  GetContainers,
  StartContainer,
  StopContainer,
  RestartContainer,
  PauseContainer,
  UnpauseContainer,
  RemoveContainer,
  CreateContainer,
  GetContainerLogs,
  InspectContainer,
  GetImages,
  PullImage,
  RemoveImage,
  TagImage,
  InspectImage,
  GetVolumes,
  CreateVolume,
  RemoveVolume,
  PruneVolumes,
  InspectVolume,
  GetNetworks,
  CreateNetwork,
  RemoveNetwork,
  InspectNetwork,
  OpenComposeProject,
  OpenComposeProjectFromURL,
  ComposeUp,
  ComposeDown,
  ComposeStart,
  ComposeStop,
  ComposeRestart,
  ComposeStageChanges,
  ComposeApplyChanges,
  ComposeDiscardChanges,
  ComposeRefresh,
  ComposeSaveSnapshot,
  ComposeRestoreSnapshot,
  ComposeReadEnv,
  ComposeSaveEnv,
  SearchRegistry,
  SearchAllRegistries,
  GetRegistryTags,
  GetRegistryMetadata,
  GetFavorites,
  AddFavorite,
  RemoveFavorite,
  GetConfig,
  GetAppVersion,
  CheckForAppUpdate,
  SetTheme,
  GetSystemTheme,
  DetectRuntimes,
  GetInstallPlan,
  InstallRuntime,
  SelectDirectoryDialog
} from '../wailsjs/go/main/App';
import { WindowIsMaximised, WindowToggleMaximise } from '../wailsjs/runtime/runtime';
import UpdateModal from './components/UpdateModal';

export default function App() {
  const [activeTab, setActiveTab] = useState('containers');
  const [visitedTabs, setVisitedTabs] = useState(() => new Set(['containers']));

  useEffect(() => {
    setVisitedTabs(prev => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  const [selectedContainerId, setSelectedContainerId] = useState(null);
  const [activeRuntime, setActiveRuntime] = useState('docker');
  const [systemInfo, setSystemInfo] = useState(null);
  const [hostMetrics, setHostMetrics] = useState(null);
  const [runtimesStatus, setRuntimesStatus] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [appConfig, setAppConfig] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [appVersion, setAppVersion] = useState(packageJson?.version || '0.6.5');

  // Track whether the frameless window is currently maximized
  const [isMaximised, setIsMaximised] = useState(false);

  const checkMaximised = useCallback(() => {
    if (typeof WindowIsMaximised === 'function') {
      WindowIsMaximised().then(setIsMaximised).catch(() => {});
    } else if (window.runtime?.WindowIsMaximised) {
      window.runtime.WindowIsMaximised().then(setIsMaximised).catch(() => {});
    }
  }, []);

  useEffect(() => {
    checkMaximised();
    window.addEventListener('resize', checkMaximised);
    return () => window.removeEventListener('resize', checkMaximised);
  }, [checkMaximised]);

  const handleToggleMaximise = useCallback(() => {
    if (typeof WindowToggleMaximise === 'function') {
      WindowToggleMaximise();
    } else if (window.runtime?.WindowToggleMaximise) {
      window.runtime.WindowToggleMaximise();
    }
    setTimeout(checkMaximised, 120);
  }, [checkMaximised]);

  // Immediately query app version from Go backend on mount
  useEffect(() => {
    GetAppVersion().then((ver) => {
      if (ver) setAppVersion(ver);
    }).catch(console.warn);
  }, []);

  // Domain states
  const [containers, setContainers] = useState([]);
  const [images, setImages] = useState([]);
  const [volumes, setVolumes] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [favorites, setFavorites] = useState([]);

  // Modals
  const [logsModal, setLogsModal] = useState({ open: false, id: '', name: '' });
  const [inspectModal, setInspectModal] = useState({ open: false, title: '', data: null });
  const [showInstaller, setShowInstaller] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [showUpdateToast, setShowUpdateToast] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    isDanger: true,
    resolve: null
  });

  const requestConfirmation = useCallback(({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', isDanger = true }) => {
    return new Promise((resolve) => {
      setConfirmModal({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        isDanger,
        resolve
      });
    });
  }, []);

  const handleConfirmModalAction = useCallback((confirmed) => {
    if (confirmModal.resolve) {
      confirmModal.resolve(confirmed);
    }
    setConfirmModal(prev => ({ ...prev, isOpen: false, resolve: null }));
  }, [confirmModal]);

  const addToast = useCallback((message, type = 'info', title = null, duration = 4500) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev.slice(-4), { id, message, type, title, duration }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Global keyboard shortcuts (Ctrl+K for Command Palette, Esc for modals)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        if (confirmModal.isOpen) {
          handleConfirmModalAction(false);
        } else if (commandPaletteOpen) {
          setCommandPaletteOpen(false);
        } else if (inspectModal.open) {
          setInspectModal({ open: false, title: '', data: null });
        } else if (logsModal.open) {
          setLogsModal({ open: false, id: '', name: '' });
        } else if (updateModalOpen) {
          setUpdateModalOpen(false);
        } else if (showInstaller) {
          setShowInstaller(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, inspectModal.open, logsModal.open, updateModalOpen, showInstaller, confirmModal.isOpen, handleConfirmModalAction]);

  // Apply theme to document root
  const applyThemeToDOM = async (t) => {
    const root = document.documentElement;
    if (t === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else if (t === 'dark') {
      root.classList.remove('light');
      root.classList.add('dark');
    } else {
      // System: first check backend desktop portal (e.g. Cinnamon, GNOME, Mint)
      try {
        const sys = await GetSystemTheme();
        if (sys === 'dark') {
          root.classList.remove('light');
          root.classList.add('dark');
          return;
        } else if (sys === 'light') {
          root.classList.remove('dark');
          root.classList.add('light');
          return;
        }
      } catch (e) {
        // Fallback to WebKit media query
      }
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.remove('light');
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
      }
    }
  };

  const handleSetTheme = async (newTheme) => {
    setTheme(newTheme);
    await applyThemeToDOM(newTheme);
    try {
      await SetTheme(newTheme);
    } catch (e) {
      console.error(e);
    }
  };

  // Initial load & runtime synchronization
  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 6000));
    try {
      await Promise.race([
        Promise.allSettled([
          GetActiveRuntime(),
          GetSystemInfo(),
          GetHostMetrics(),
          DetectRuntimes(),
          GetContainers(true),
          GetImages(false),
          GetVolumes(),
          GetNetworks(),
          GetFavorites(),
          GetConfig(),
          GetAppVersion()
        ]).then(([rt, info, metrics, runtimes, cList, iList, vList, nList, favs, cfg, ver]) => {
          if (rt?.status === 'fulfilled' && rt.value) setActiveRuntime(rt.value);
          if (info?.status === 'fulfilled') {
            setSystemInfo(info.value);
          } else {
            setSystemInfo(null);
          }
          if (metrics?.status === 'fulfilled' && metrics.value) setHostMetrics(metrics.value);
          if (runtimes?.status === 'fulfilled' && runtimes.value) setRuntimesStatus(runtimes.value);
          if (cList?.status === 'fulfilled' && Array.isArray(cList.value)) {
            setContainers(cList.value);
          } else {
            setContainers([]);
          }
          if (iList?.status === 'fulfilled' && Array.isArray(iList.value)) {
            setImages(iList.value);
          } else {
            setImages([]);
          }
          if (vList?.status === 'fulfilled' && Array.isArray(vList.value)) {
            setVolumes(vList.value);
          } else {
            setVolumes([]);
          }
          if (nList?.status === 'fulfilled' && Array.isArray(nList.value)) {
            setNetworks(nList.value);
          } else {
            setNetworks([]);
          }
          if (favs?.status === 'fulfilled' && Array.isArray(favs.value)) setFavorites(favs.value);
          if (ver?.status === 'fulfilled' && ver.value) setAppVersion(ver.value);
          if (cfg?.status === 'fulfilled' && cfg.value) {
            setAppConfig(cfg.value);
            if (cfg.value.ui?.theme) {
              setTheme(cfg.value.ui.theme);
              applyThemeToDOM(cfg.value.ui.theme);
            }
          }
        }),
        timeoutPromise
      ]);
    } catch (err) {
      console.error('Error refreshing Dockit state:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();
    const interval = setInterval(() => {
      // Periodic background refresh for container health & host metrics
      GetContainers(true).then((list) => {
        if (Array.isArray(list)) setContainers(list);
      }).catch(() => {});
      GetHostMetrics().then((m) => {
        if (m) setHostMetrics(m);
      }).catch(() => {});
    }, 4000);

    // Auto-sync state whenever user switches back to Dockit
    const handleFocus = () => {
      refreshAll();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshAll]);

  // Check for app updates
  const handleCheckForUpdates = useCallback(async (manual = false) => {
    setIsCheckingUpdate(true);
    try {
      const res = await CheckForAppUpdate();
      if (res) {
        setUpdateInfo(res);
        if (res.currentVersion) {
          setAppVersion(res.currentVersion);
        }
        if (res.available) {
          if (manual) {
            setUpdateModalOpen(true);
          } else {
            setShowUpdateToast(true);
          }
        } else if (manual) {
          setUpdateModalOpen(true);
        }
      }
    } catch (err) {
      console.warn('Update check failed:', err);
      if (manual) {
        addToast(`Could not check for updates: ${err}`, 'warning', 'Update Check');
      }
    } finally {
      setIsCheckingUpdate(false);
    }
  }, [addToast]);

  // Background check for update shortly after app startup (if enabled in preferences)
  useEffect(() => {
    if (appConfig?.ui?.autoCheckUpdates === false) return;
    const timer = setTimeout(() => {
      handleCheckForUpdates(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [appConfig?.ui?.autoCheckUpdates, handleCheckForUpdates]);

  // Runtime Switch Handler
  const handleSwitchRuntime = async (target) => {
    try {
      const chosen = await SwitchRuntime(target);
      setActiveRuntime(chosen || target);
      addToast(`Switched active engine to ${chosen || target}`, 'success');
      await refreshAll();
    } catch (err) {
      console.warn(`Could not connect to ${target}:`, err);
      setActiveRuntime(target);
      addToast(formatEngineError(err), 'error', `Failed to Switch to ${target}`);
      await refreshAll();
    }
  };

  // Container handlers
  const handleStartContainer = async (id) => {
    try {
      await StartContainer(id);
      addToast('Container started successfully', 'success');
      refreshAll();
    } catch (err) {
      addToast(formatEngineError(err), 'error', 'Failed to Start Container');
    }
  };

  const handleStopContainer = async (id) => {
    try {
      await StopContainer(id, 10);
      addToast('Container stopped', 'info');
      refreshAll();
    } catch (err) {
      addToast(formatEngineError(err), 'error', 'Failed to Stop Container');
    }
  };

  const handleRestartContainer = async (id) => {
    try {
      await RestartContainer(id, 10);
      addToast('Container restarted', 'success');
      refreshAll();
    } catch (err) {
      addToast(formatEngineError(err), 'error', 'Failed to Restart Container');
    }
  };

  const handlePauseContainer = async (id) => {
    try {
      await PauseContainer(id);
      addToast('Container paused', 'info');
      refreshAll();
    } catch (err) {
      addToast(formatEngineError(err), 'error', 'Failed to Pause Container');
    }
  };

  const handleUnpauseContainer = async (id) => {
    try {
      await UnpauseContainer(id);
      addToast('Container resumed', 'success');
      refreshAll();
    } catch (err) {
      addToast(formatEngineError(err), 'error', 'Failed to Resume Container');
    }
  };

  const handleRemoveContainer = async (id, force = false) => {
    const ok = await requestConfirmation({
      title: 'Delete Container',
      message: 'Are you sure you want to permanently delete this container? All unsaved data in the container rootfs will be removed.',
      confirmText: 'Delete Container',
      isDanger: true
    });
    if (!ok) return;
    try {
      await RemoveContainer(id, force, true);
      addToast('Container deleted', 'success');
      refreshAll();
    } catch (err) {
      addToast(formatEngineError(err), 'error', 'Failed to Delete Container');
    }
  };

  const handleCreateContainer = async (opts) => {
    try {
      await CreateContainer(opts);
      addToast('Container created successfully', 'success');
      refreshAll();
    } catch (err) {
      addToast(formatEngineError(err), 'error', 'Container Creation Failed');
    }
  };

  const handleInspectContainer = async (id, name) => {
    try {
      const data = await InspectContainer(id);
      setInspectModal({
        open: true,
        title: `Container Inspect: ${name || id.substring(0, 12)}`,
        data
      });
    } catch (err) {
      addToast(formatEngineError(err), 'error', 'Inspect Failed');
    }
  };

  const handleBatchStartContainers = async (ids) => {
    let success = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        await StartContainer(id);
        success++;
      } catch {
        fail++;
      }
    }
    if (success > 0) addToast(`Started ${success} container${success > 1 ? 's' : ''}`, 'success');
    if (fail > 0) addToast(`Failed to start ${fail} container${fail > 1 ? 's' : ''}`, 'error');
    refreshAll();
  };

  const handleBatchStopContainers = async (ids) => {
    let success = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        await StopContainer(id);
        success++;
      } catch {
        fail++;
      }
    }
    if (success > 0) addToast(`Stopped ${success} container${success > 1 ? 's' : ''}`, 'success');
    if (fail > 0) addToast(`Failed to stop ${fail} container${fail > 1 ? 's' : ''}`, 'error');
    refreshAll();
  };

  const handleBatchRestartContainers = async (ids) => {
    let success = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        await RestartContainer(id);
        success++;
      } catch {
        fail++;
      }
    }
    if (success > 0) addToast(`Restarted ${success} container${success > 1 ? 's' : ''}`, 'success');
    if (fail > 0) addToast(`Failed to restart ${fail} container${fail > 1 ? 's' : ''}`, 'error');
    refreshAll();
  };

  const handleBatchRemoveContainers = async (ids) => {
    const ok = await requestConfirmation({
      title: `Delete ${ids.length} Container${ids.length > 1 ? 's' : ''}`,
      message: `Are you sure you want to permanently delete ${ids.length} selected container${ids.length > 1 ? 's' : ''}? Unsaved data in rootfs will be removed.`,
      confirmText: `Delete ${ids.length} Container${ids.length > 1 ? 's' : ''}`,
      isDanger: true
    });
    if (!ok) return false;
    let success = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        await RemoveContainer(id, true, true);
        success++;
      } catch {
        fail++;
      }
    }
    if (success > 0) addToast(`Deleted ${success} container${success > 1 ? 's' : ''}`, 'success');
    if (fail > 0) addToast(`Failed to delete ${fail} container${fail > 1 ? 's' : ''}`, 'error');
    refreshAll();
    return true;
  };

  // Image handlers
  const handlePullImage = async (ref) => {
    try {
      addToast(`Pulling ${ref}...`, 'info', 'Pull Started');
      await PullImage(ref);
      addToast(`Successfully pulled ${ref}`, 'success');
      refreshAll();
    } catch (err) {
      addToast(formatEngineError(err), 'error', `Failed to Pull ${ref}`);
      throw err;
    }
  };

  const handleRemoveImage = async (id, force = false) => {
    const ok = await requestConfirmation({
      title: 'Delete Image',
      message: 'Are you sure you want to delete this image from your local storage?',
      confirmText: 'Delete Image',
      isDanger: true
    });
    if (!ok) return;
    try {
      await RemoveImage(id, force);
      addToast('Image deleted successfully', 'success');
      refreshAll();
    } catch (err) {
      addToast(formatEngineError(err), 'error', 'Failed to Delete Image');
    }
  };

  const handleTagImage = async (id, newTag) => {
    try {
      await TagImage(id, newTag);
      addToast(`Tagged image as ${newTag}`, 'success');
      refreshAll();
    } catch (err) {
      addToast(formatEngineError(err), 'error', 'Failed to Tag Image');
    }
  };

  const handleInspectImage = async (id, name) => {
    try {
      const data = await InspectImage(id);
      setInspectModal({
        open: true,
        title: `Image Inspect: ${name || id.substring(0, 12)}`,
        data
      });
    } catch (err) {
      addToast(formatEngineError(err), 'error', 'Inspect Failed');
    }
  };

  const handleBatchRemoveImages = async (ids) => {
    const ok = await requestConfirmation({
      title: `Delete ${ids.length} Image${ids.length > 1 ? 's' : ''}`,
      message: `Are you sure you want to delete ${ids.length} selected image${ids.length > 1 ? 's' : ''} from local storage?`,
      confirmText: `Delete ${ids.length} Image${ids.length > 1 ? 's' : ''}`,
      isDanger: true
    });
    if (!ok) return false;
    let success = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        await RemoveImage(id, false);
        success++;
      } catch {
        fail++;
      }
    }
    if (success > 0) addToast(`Deleted ${success} image${success > 1 ? 's' : ''}`, 'success');
    if (fail > 0) addToast(`Failed to delete ${fail} image${fail > 1 ? 's' : ''}`, 'error');
    refreshAll();
    return true;
  };

  // Volume handlers
  const handleCreateVolume = async (opts) => {
    try {
      await CreateVolume(opts);
      addToast('Volume created successfully', 'success');
      refreshAll();
    } catch (err) {
      addToast(formatEngineError(err), 'error', 'Failed to Create Volume');
    }
  };

  const handleRemoveVolume = async (name, force = false) => {
    const ok = await requestConfirmation({
      title: 'Delete Volume',
      message: `Are you sure you want to delete volume "${name}"? Data stored on this volume will be permanently erased.`,
      confirmText: 'Delete Volume',
      isDanger: true
    });
    if (!ok) return false;
    try {
      await RemoveVolume(name, force);
      addToast(`Volume "${name}" deleted`, 'success');
      refreshAll();
    } catch (err) {
      addToast(formatEngineError(err), 'error', 'Failed to Delete Volume');
    }
  };

  const handleBatchRemoveVolumes = async (names) => {
    const ok = await requestConfirmation({
      title: `Delete ${names.length} Volume${names.length > 1 ? 's' : ''}`,
      message: `Are you sure you want to delete ${names.length} selected volume${names.length > 1 ? 's' : ''}? Data stored on these volumes will be permanently erased.`,
      confirmText: `Delete ${names.length} Volume${names.length > 1 ? 's' : ''}`,
      isDanger: true
    });
    if (!ok) return false;
    let success = 0;
    let fail = 0;
    for (const name of names) {
      try {
        await RemoveVolume(name, false);
        success++;
      } catch {
        fail++;
      }
    }
    if (success > 0) addToast(`Deleted ${success} volume${success > 1 ? 's' : ''}`, 'success');
    if (fail > 0) addToast(`Failed to delete ${fail} volume${fail > 1 ? 's' : ''}`, 'error');
    refreshAll();
    return true;
  };

  const handlePruneVolumes = async () => {
    const ok = await requestConfirmation({
      title: 'Prune Unused Volumes',
      message: 'Are you sure you want to prune all volumes not currently attached to any container? This cannot be undone.',
      confirmText: 'Prune Volumes',
      isDanger: true
    });
    if (!ok) return;
    try {
      await PruneVolumes();
      addToast('Unused volumes pruned', 'success');
      refreshAll();
    } catch (err) {
      addToast(formatEngineError(err), 'error', 'Failed to Prune Volumes');
    }
  };

  const handleInspectVolume = async (name) => {
    try {
      const data = await InspectVolume(name);
      setInspectModal({
        open: true,
        title: `Volume Inspect: ${name}`,
        data
      });
    } catch (err) {
      addToast(formatEngineError(err), 'error', 'Inspect Failed');
    }
  };

  // Network handlers
  const handleCreateNetwork = async (opts) => {
    try {
      await CreateNetwork(opts);
      addToast('Network created successfully', 'success');
      refreshAll();
    } catch (err) {
      addToast(formatEngineError(err), 'error', 'Failed to Create Network');
    }
  };

  const handleRemoveNetwork = async (id) => {
    const ok = await requestConfirmation({
      title: 'Delete Network',
      message: 'Are you sure you want to delete this network?',
      confirmText: 'Delete Network',
      isDanger: true
    });
    if (!ok) return;
    try {
      await RemoveNetwork(id);
      addToast('Network deleted successfully', 'success');
      refreshAll();
    } catch (err) {
      addToast(formatEngineError(err), 'error', 'Failed to Delete Network');
    }
  };

  const handleInspectNetwork = async (id) => {
    try {
      const data = await InspectNetwork(id);
      setInspectModal({
        open: true,
        title: `Network Inspect: ${id.substring(0, 12)}`,
        data
      });
    } catch (err) {
      addToast(formatEngineError(err), 'error', 'Inspect Failed');
    }
  };

  // Registry favorites
  const handleAddFavorite = async (name) => {
    await AddFavorite(name);
    const f = await GetFavorites();
    setFavorites(f || []);
  };

  const handleRemoveFavorite = async (name) => {
    await RemoveFavorite(name);
    const f = await GetFavorites();
    setFavorites(f || []);
  };

  // Calculate container stats
  const runningContainers = containers.filter(c => c.status === 'running').length;

  return (
    <div
      className={`h-screen w-screen bg-transparent select-none overflow-hidden font-sans transition-all duration-150 ${
        isMaximised ? 'p-0' : 'p-1.5'
      }`}
    >
      <div
        className={`app-window-frame flex h-full w-full bg-slate-950 text-slate-100 overflow-hidden transition-all duration-200 relative ${
          isMaximised
            ? 'rounded-none border-0 shadow-none'
            : 'rounded-xl border border-slate-700/80 shadow-[0_4px_16px_rgba(0,0,0,0.5),0_0_0_1px_rgba(100,116,139,0.35)]'
        }`}
      >
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setSelectedContainerId(null);
            setActiveTab(tab);
          }}
          activeRuntime={activeRuntime}
          systemInfo={systemInfo}
          runtimesStatus={runtimesStatus}
          onOpenInstaller={() => setShowInstaller(true)}
          hostMetrics={hostMetrics}
          stats={{
            runningContainers,
            totalContainers: containers.length
          }}
          appVersion={appVersion}
          updateAvailable={Boolean(updateInfo?.available)}
          onOpenUpdateModal={() => setUpdateModalOpen(true)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Global Header */}
          <Header
            activeRuntime={activeRuntime}
            onSwitchRuntime={handleSwitchRuntime}
            onRefresh={refreshAll}
            isRefreshing={isRefreshing}
            systemInfo={systemInfo}
            runtimesStatus={runtimesStatus}
            onOpenInstaller={() => setShowInstaller(true)}
            onOpenCommandPalette={() => setCommandPaletteOpen(true)}
            isMaximised={isMaximised}
            onToggleMaximise={handleToggleMaximise}
          />

          {/* Engine offline / not installed banner */}
          {activeRuntime !== 'none' && runtimesStatus && runtimesStatus[activeRuntime] && (!runtimesStatus[activeRuntime].installed || !runtimesStatus[activeRuntime].running) && (
            <div className={`engine-status-banner px-4 py-2.5 border-b flex items-center justify-between text-xs z-10 shrink-0 transition-colors ${
              !runtimesStatus[activeRuntime].installed
                ? 'engine-status-banner-rose bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300'
                : 'engine-status-banner-amber bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-300'
            }`}>
              <div className="flex items-center gap-2.5 font-medium">
                <AlertCircle className={`w-4 h-4 shrink-0 ${
                  !runtimesStatus[activeRuntime].installed ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
                }`} />
                <span>
                  {!runtimesStatus[activeRuntime].installed
                    ? `${activeRuntime === 'podman' ? 'Podman' : 'Docker'} is not installed on this system.`
                    : `${activeRuntime === 'podman' ? 'Podman' : 'Docker'} daemon is stopped or unreachable.`
                  }
                </span>
              </div>
              <button
                onClick={() => setShowInstaller(true)}
                className={`px-3 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer shadow-xs ${
                  !runtimesStatus[activeRuntime].installed
                    ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700 dark:bg-rose-900/70 dark:hover:bg-rose-800 dark:border-rose-700 dark:text-rose-100'
                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-600 dark:bg-amber-900/70 dark:hover:bg-amber-800 dark:border-amber-700 dark:text-amber-100'
                }`}
              >
                {!runtimesStatus[activeRuntime].installed ? 'Install Engine' : 'Setup & Start Daemon'}
              </button>
            </div>
          )}

        {/* View Switcher wrapped in ErrorBoundary */}
        <ErrorBoundary onReset={refreshAll}>
          <main className="flex-1 flex overflow-hidden relative">
            {visitedTabs.has('containers') && (
              <div
                className="flex-1 flex flex-col h-full overflow-hidden"
                style={{ display: activeTab === 'containers' ? 'flex' : 'none' }}
              >
                {selectedContainerId ? (
                  <ContainerDetailsView
                    containerId={selectedContainerId}
                    onBack={() => setSelectedContainerId(null)}
                    onRefreshList={refreshAll}
                    onToast={addToast}
                    onConfirm={requestConfirmation}
                    onOpenLogs={(id, name) => setLogsModal({ open: true, id, name })}
                  />
                ) : (
                  <ContainersView
                    containers={containers}
                    networks={networks}
                    volumes={volumes}
                    loading={isRefreshing}
                    onRefresh={refreshAll}
                    onStart={handleStartContainer}
                    onStop={handleStopContainer}
                    onRestart={handleRestartContainer}
                    onPause={handlePauseContainer}
                    onUnpause={handleUnpauseContainer}
                    onRemove={handleRemoveContainer}
                    onCreate={handleCreateContainer}
                    onOpenLogs={(id, name) => setLogsModal({ open: true, id, name })}
                    onInspect={handleInspectContainer}
                    onSelectContainer={(id) => setSelectedContainerId(id)}
                    onBatchStart={handleBatchStartContainers}
                    onBatchStop={handleBatchStopContainers}
                    onBatchRestart={handleBatchRestartContainers}
                    onBatchRemove={handleBatchRemoveContainers}
                  />
                )}
              </div>
            )}

            {visitedTabs.has('images') && (
              <div
                className="flex-1 flex flex-col h-full overflow-hidden"
                style={{ display: activeTab === 'images' ? 'flex' : 'none' }}
              >
                <ImagesView
                  images={images}
                  loading={isRefreshing}
                  onRefresh={refreshAll}
                  onPull={handlePullImage}
                  onRemove={handleRemoveImage}
                  onBatchRemove={handleBatchRemoveImages}
                  onTag={handleTagImage}
                  onInspect={handleInspectImage}
                />
              </div>
            )}

            {visitedTabs.has('volumes') && (
              <div
                className="flex-1 flex flex-col h-full overflow-hidden"
                style={{ display: activeTab === 'volumes' ? 'flex' : 'none' }}
              >
                <VolumesView
                  volumes={volumes}
                  loading={isRefreshing}
                  onRefresh={refreshAll}
                  onCreate={handleCreateVolume}
                  onRemove={handleRemoveVolume}
                  onBatchRemove={handleBatchRemoveVolumes}
                  onPrune={handlePruneVolumes}
                  onInspect={handleInspectVolume}
                  onConfirm={requestConfirmation}
                />
              </div>
            )}

            {visitedTabs.has('networks') && (
              <div
                className="flex-1 flex flex-col h-full overflow-hidden"
                style={{ display: activeTab === 'networks' ? 'flex' : 'none' }}
              >
                <NetworksView
                  networks={networks}
                  loading={isRefreshing}
                  onRefresh={refreshAll}
                  onCreate={handleCreateNetwork}
                  onRemove={handleRemoveNetwork}
                  onInspect={handleInspectNetwork}
                />
              </div>
            )}

            {visitedTabs.has('cleanup') && (
              <div
                className="flex-1 flex flex-col h-full overflow-hidden"
                style={{ display: activeTab === 'cleanup' ? 'flex' : 'none' }}
              >
                <CleanupView
                  activeRuntime={activeRuntime}
                />
              </div>
            )}

            {visitedTabs.has('compose') && (
              <div
                className="flex-1 flex flex-col h-full overflow-hidden"
                style={{ display: activeTab === 'compose' ? 'flex' : 'none' }}
              >
                <ComposeView
                  onOpenLocal={OpenComposeProject}
                  onOpenURL={OpenComposeProjectFromURL}
                  onSelectDirectory={SelectDirectoryDialog}
                  onUp={ComposeUp}
                  onDown={ComposeDown}
                  onStart={ComposeStart}
                  onStop={ComposeStop}
                  onRestart={ComposeRestart}
                  onStageChanges={ComposeStageChanges}
                  onApplyChanges={ComposeApplyChanges}
                  onDiscardChanges={ComposeDiscardChanges}
                  onRefreshProject={ComposeRefresh}
                  onSaveSnapshot={ComposeSaveSnapshot}
                  onRestoreSnapshot={ComposeRestoreSnapshot}
                  onReadEnv={ComposeReadEnv}
                  onSaveEnv={ComposeSaveEnv}
                  onToast={addToast}
                  onConfirm={requestConfirmation}
                />
              </div>
            )}

            {visitedTabs.has('registry') && (
              <div
                className="flex-1 flex flex-col h-full overflow-hidden"
                style={{ display: activeTab === 'registry' ? 'flex' : 'none' }}
              >
                <RegistryView
                  onSearch={SearchRegistry}
                  onSearchAll={SearchAllRegistries}
                  onGetTags={GetRegistryTags}
                  onGetMetadata={GetRegistryMetadata}
                  onPull={handlePullImage}
                  onAddFavorite={handleAddFavorite}
                  onRemoveFavorite={handleRemoveFavorite}
                  favorites={favorites}
                  onToast={addToast}
                />
              </div>
            )}

            {visitedTabs.has('settings') && (
              <div
                className="flex-1 flex flex-col h-full overflow-hidden"
                style={{ display: activeTab === 'settings' ? 'flex' : 'none' }}
              >
                <SettingsView
                  config={appConfig}
                  activeRuntime={activeRuntime}
                  onSwitchRuntime={handleSwitchRuntime}
                  onOpenInstaller={() => setShowInstaller(true)}
                  theme={theme}
                  onSetTheme={handleSetTheme}
                  appVersion={appVersion}
                  onCheckForUpdates={() => handleCheckForUpdates(true)}
                  isCheckingUpdates={isCheckingUpdate}
                  onToast={addToast}
                />
              </div>
            )}
          </main>
        </ErrorBoundary>
      </div>

      {/* Floating Modal Portals */}
      <LogsModal
        isOpen={logsModal.open}
        onClose={() => setLogsModal({ open: false, id: '', name: '' })}
        containerId={logsModal.id}
        containerName={logsModal.name}
        onFetchLogs={GetContainerLogs}
      />

      <InspectModal
        isOpen={inspectModal.open}
        onClose={() => setInspectModal({ open: false, title: '', data: null })}
        title={inspectModal.title}
        data={inspectModal.data}
      />

      <InstallerModal
        isOpen={showInstaller}
        onClose={() => setShowInstaller(false)}
        onDetect={DetectRuntimes}
        onGetPlan={GetInstallPlan}
        onInstall={InstallRuntime}
      />

      <UpdateModal
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        updateInfo={updateInfo}
        onCheckAgain={() => handleCheckForUpdates(true)}
        isChecking={isCheckingUpdate}
      />

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        containers={containers}
        images={images}
        volumes={volumes}
        networks={networks}
        activeRuntime={activeRuntime}
        theme={theme}
        onNavigate={(tab, containerId = null) => {
          setActiveTab(tab);
          if (containerId) {
            setSelectedContainerId(containerId);
          } else {
            setSelectedContainerId(null);
          }
        }}
        onSwitchRuntime={handleSwitchRuntime}
        onToggleTheme={() => handleSetTheme(theme === 'dark' ? 'light' : 'dark')}
        onRefresh={refreshAll}
        onCheckUpdates={() => handleCheckForUpdates(true)}
        onOpenInstaller={() => setShowInstaller(true)}
        onContainerAction={async (action, id, name) => {
          if (action === 'start') await handleStartContainer(id);
          else if (action === 'stop') await handleStopContainer(id);
          else if (action === 'restart') await handleRestartContainer(id);
          else if (action === 'logs') setLogsModal({ open: true, id, name });
          else if (action === 'inspect') await handleInspectContainer(id, name);
        }}
        onInspectImage={handleInspectImage}
        onInspectVolume={handleInspectVolume}
        onPruneVolumes={handlePruneVolumes}
      />

      {/* Non-intrusive Update Toast Notification */}
      {showUpdateToast && updateInfo?.available && !updateModalOpen && (
        <div className="fixed bottom-5 right-5 z-40 max-w-sm w-full bg-slate-900/95 border border-cyan-500/40 rounded-xl p-4 shadow-2xl shadow-cyan-500/20 backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  Dockit Update Available
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                    v{String(updateInfo.latestVersion).replace(/^v/, '')}
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  A newer release is ready with improvements &amp; fixes.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowUpdateToast(false)}
              className="text-slate-400 hover:text-slate-200 p-0.5 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              onClick={() => setShowUpdateToast(false)}
              className="text-[11px] px-2.5 py-1 text-slate-400 hover:text-slate-200 transition"
            >
              Later
            </button>
            <button
              onClick={() => {
                setShowUpdateToast(false);
                setUpdateModalOpen(true);
              }}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 text-xs font-bold shadow-sm shadow-cyan-500/20 hover:brightness-110 transition"
            >
              <span>View Update</span>
              <ArrowRight className="w-3 h-3 stroke-[3]" />
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        isDanger={confirmModal.isDanger}
        onConfirm={() => handleConfirmModalAction(true)}
        onCancel={() => handleConfirmModalAction(false)}
      />

      {/* Global Toast Notification System */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </div>
    </div>
  );
}
