import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ContainersView from './components/ContainersView';
import ImagesView from './components/ImagesView';
import VolumesView from './components/VolumesView';
import NetworksView from './components/NetworksView';
import ComposeView from './components/ComposeView';
import RegistryView from './components/RegistryView';
import SettingsView from './components/SettingsView';
import ContainerDetailsView from './components/ContainerDetailsView';

import LogsModal from './components/LogsModal';
import InspectModal from './components/InspectModal';
import InstallerModal from './components/InstallerModal';

// Wails Go Bridge API bindings
import {
  GetActiveRuntime,
  SwitchRuntime,
  GetSystemInfo,
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
  SearchRegistry,
  SearchAllRegistries,
  GetRegistryTags,
  GetFavorites,
  AddFavorite,
  RemoveFavorite,
  GetConfig,
  SetTheme,
  GetSystemTheme,
  DetectRuntimes,
  GetInstallPlan,
  InstallRuntime,
  SelectDirectoryDialog
} from '../wailsjs/go/main/App';

export default function App() {
  const [activeTab, setActiveTab] = useState('containers');
  const [selectedContainerId, setSelectedContainerId] = useState(null);
  const [activeRuntime, setActiveRuntime] = useState('docker');
  const [systemInfo, setSystemInfo] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [appConfig, setAppConfig] = useState(null);
  const [theme, setTheme] = useState('dark');

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
    try {
      const [rt, info, cList, iList, vList, nList, favs, cfg] = await Promise.allSettled([
        GetActiveRuntime(),
        GetSystemInfo(),
        GetContainers(true),
        GetImages(false),
        GetVolumes(),
        GetNetworks(),
        GetFavorites(),
        GetConfig()
      ]);

      if (rt.status === 'fulfilled' && rt.value) setActiveRuntime(rt.value);
      if (info.status === 'fulfilled') setSystemInfo(info.value);
      if (cList.status === 'fulfilled' && Array.isArray(cList.value)) setContainers(cList.value);
      if (iList.status === 'fulfilled' && Array.isArray(iList.value)) setImages(iList.value);
      if (vList.status === 'fulfilled' && Array.isArray(vList.value)) setVolumes(vList.value);
      if (nList.status === 'fulfilled' && Array.isArray(nList.value)) setNetworks(nList.value);
      if (favs.status === 'fulfilled' && Array.isArray(favs.value)) setFavorites(favs.value);
      if (cfg.status === 'fulfilled' && cfg.value) {
        setAppConfig(cfg.value);
        if (cfg.value.ui?.theme) {
          setTheme(cfg.value.ui.theme);
          applyThemeToDOM(cfg.value.ui.theme);
        }
      }
    } catch (err) {
      console.error('Error refreshing Dockit state:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();
    const interval = setInterval(() => {
      // Periodic background refresh for container health
      GetContainers(true).then((list) => {
        if (Array.isArray(list)) setContainers(list);
      }).catch(() => {});
    }, 6000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  // Runtime Switch Handler
  const handleSwitchRuntime = async (target) => {
    try {
      const chosen = await SwitchRuntime(target);
      setActiveRuntime(chosen);
      await refreshAll();
    } catch (err) {
      alert(`Could not switch to ${target}: ${err}`);
    }
  };

  // Container handlers
  const handleStartContainer = async (id) => {
    await StartContainer(id);
    refreshAll();
  };

  const handleStopContainer = async (id) => {
    await StopContainer(id, 10);
    refreshAll();
  };

  const handleRestartContainer = async (id) => {
    await RestartContainer(id, 10);
    refreshAll();
  };

  const handlePauseContainer = async (id) => {
    await PauseContainer(id);
    refreshAll();
  };

  const handleUnpauseContainer = async (id) => {
    await UnpauseContainer(id);
    refreshAll();
  };

  const handleRemoveContainer = async (id, force = false) => {
    if (!window.confirm('Delete this container?')) return;
    await RemoveContainer(id, force, true);
    refreshAll();
  };

  const handleCreateContainer = async (opts) => {
    try {
      await CreateContainer(opts);
      refreshAll();
    } catch (err) {
      alert(`Create container failed: ${err}`);
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
      alert(`Inspect failed: ${err}`);
    }
  };

  // Image handlers
  const handlePullImage = async (ref) => {
    try {
      await PullImage(ref);
      refreshAll();
    } catch (err) {
      alert(`Pull image failed: ${err}`);
      throw err;
    }
  };

  const handleRemoveImage = async (id, force = false) => {
    if (!window.confirm('Delete this image?')) return;
    await RemoveImage(id, force);
    refreshAll();
  };

  const handleTagImage = async (id, newTag) => {
    await TagImage(id, newTag);
    refreshAll();
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
      alert(`Inspect failed: ${err}`);
    }
  };

  // Volume handlers
  const handleCreateVolume = async (opts) => {
    try {
      await CreateVolume(opts);
      refreshAll();
    } catch (err) {
      alert(`Create volume failed: ${err}`);
    }
  };

  const handleRemoveVolume = async (name, force = false) => {
    if (!window.confirm(`Delete volume "${name}"?`)) return;
    await RemoveVolume(name, force);
    refreshAll();
  };

  const handlePruneVolumes = async () => {
    await PruneVolumes();
    refreshAll();
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
      alert(`Inspect failed: ${err}`);
    }
  };

  // Network handlers
  const handleCreateNetwork = async (opts) => {
    try {
      await CreateNetwork(opts);
      refreshAll();
    } catch (err) {
      alert(`Create network failed: ${err}`);
    }
  };

  const handleRemoveNetwork = async (id) => {
    if (!window.confirm('Delete this network?')) return;
    await RemoveNetwork(id);
    refreshAll();
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
      alert(`Inspect failed: ${err}`);
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
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Left Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setSelectedContainerId(null);
          setActiveTab(tab);
        }}
        activeRuntime={activeRuntime}
        stats={{
          runningContainers,
          totalContainers: containers.length
        }}
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
          onOpenInstaller={() => setShowInstaller(true)}
        />

        {/* View Switcher */}
        <main className="flex-1 flex overflow-hidden">
          {activeTab === 'containers' && (
            selectedContainerId ? (
              <ContainerDetailsView
                containerId={selectedContainerId}
                onBack={() => setSelectedContainerId(null)}
                onRefreshList={refreshAll}
              />
            ) : (
              <ContainersView
                containers={containers}
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
              />
            )
          )}

          {activeTab === 'images' && (
            <ImagesView
              images={images}
              loading={isRefreshing}
              onRefresh={refreshAll}
              onPull={handlePullImage}
              onRemove={handleRemoveImage}
              onTag={handleTagImage}
              onInspect={handleInspectImage}
            />
          )}

          {activeTab === 'volumes' && (
            <VolumesView
              volumes={volumes}
              loading={isRefreshing}
              onRefresh={refreshAll}
              onCreate={handleCreateVolume}
              onRemove={handleRemoveVolume}
              onPrune={handlePruneVolumes}
              onInspect={handleInspectVolume}
            />
          )}

          {activeTab === 'networks' && (
            <NetworksView
              networks={networks}
              loading={isRefreshing}
              onRefresh={refreshAll}
              onCreate={handleCreateNetwork}
              onRemove={handleRemoveNetwork}
              onInspect={handleInspectNetwork}
            />
          )}

          {activeTab === 'compose' && (
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
            />
          )}

          {activeTab === 'registry' && (
            <RegistryView
              onSearch={SearchRegistry}
              onSearchAll={SearchAllRegistries}
              onGetTags={GetRegistryTags}
              onPull={handlePullImage}
              onAddFavorite={handleAddFavorite}
              onRemoveFavorite={handleRemoveFavorite}
              favorites={favorites}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              config={appConfig}
              activeRuntime={activeRuntime}
              onSwitchRuntime={handleSwitchRuntime}
              onOpenInstaller={() => setShowInstaller(true)}
              theme={theme}
              onSetTheme={handleSetTheme}
            />
          )}
        </main>
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
    </div>
  );
}
