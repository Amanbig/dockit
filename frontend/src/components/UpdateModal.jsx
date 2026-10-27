import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Download, 
  ExternalLink, 
  X, 
  CheckCircle2, 
  Clock, 
  FileText,
  AlertCircle,
  RefreshCw,
  RotateCcw,
  Check
} from 'lucide-react';
import { BrowserOpenURL } from '../../wailsjs/runtime/runtime';
import { 
  DownloadAndApplyUpdate, 
  GetUpdateProgress, 
  RestartApp 
} from '../../wailsjs/go/main/App';

export default function UpdateModal({
  isOpen,
  onClose,
  updateInfo,
  onCheckAgain,
  isChecking
}) {
  const [installState, setInstallState] = useState('idle'); // idle, downloading, extracting, applying, ready, error
  const [progress, setProgress] = useState(0);
  const [progressInfo, setProgressInfo] = useState({ readBytes: 0, totalBytes: 0 });
  const [errorMessage, setErrorMessage] = useState('');
  const [isRestarting, setIsRestarting] = useState(false);

  const [selectedAsset, setSelectedAsset] = useState(null);

  useEffect(() => {
    if (updateInfo?.downloadUrl && updateInfo?.assetFileName) {
      setSelectedAsset({
        name: updateInfo.assetFileName,
        downloadUrl: updateInfo.downloadUrl,
        type: updateInfo.installType || 'binary'
      });
    }
  }, [updateInfo]);

  useEffect(() => {
    let timer;
    if (installState === 'downloading' || installState === 'extracting' || installState === 'applying') {
      timer = setInterval(async () => {
        try {
          const res = await GetUpdateProgress();
          if (res) {
            setProgress(res.percentage || 0);
            setProgressInfo({ readBytes: res.readBytes || 0, totalBytes: res.totalBytes || 0 });
            if (res.status === 'ready') {
              setInstallState('ready');
            } else if (res.status === 'error') {
              setInstallState('error');
              setErrorMessage(res.error || 'Update failed');
            } else if (res.status) {
              setInstallState(res.status);
            }
          }
        } catch (e) {
          console.warn('Failed to poll progress:', e);
        }
      }, 500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [installState]);

  if (!isOpen) return null;

  const hasUpdate = updateInfo?.available;

  const handleStartInAppUpdate = async () => {
    const targetUrl = selectedAsset?.downloadUrl || updateInfo?.downloadUrl;
    const targetFile = selectedAsset?.name || updateInfo?.assetFileName;

    if (!targetUrl || !targetFile) {
      handleManualBrowserDownload();
      return;
    }

    setInstallState('downloading');
    setProgress(0);
    setErrorMessage('');

    try {
      // Async trigger on Go side
      DownloadAndApplyUpdate(targetUrl, targetFile)
        .then(() => {
          setInstallState('ready');
        })
        .catch((err) => {
          setInstallState('error');
          setErrorMessage(String(err));
        });
    } catch (err) {
      setInstallState('error');
      setErrorMessage(String(err));
    }
  };

  const handleRestartNow = async () => {
    setIsRestarting(true);
    try {
      await RestartApp();
    } catch (err) {
      setIsRestarting(false);
      setErrorMessage(`Failed to restart: ${err}`);
      setInstallState('error');
    }
  };

  const handleManualBrowserDownload = () => {
    const url = updateInfo?.downloadUrl || updateInfo?.releaseUrl;
    if (url) {
      if (typeof BrowserOpenURL === 'function') {
        BrowserOpenURL(url);
      } else {
        window.open(url, '_blank');
      }
    }
  };

  const handleOpenReleasePage = () => {
    const url = updateInfo?.releaseUrl || `https://github.com/Amanbig/dockit/releases`;
    if (typeof BrowserOpenURL === 'function') {
      BrowserOpenURL(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl shadow-cyan-500/10 text-slate-100 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient background */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 mb-5 relative z-10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              installState === 'ready'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : hasUpdate 
                ? 'bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-400' 
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}>
              {installState === 'ready' ? (
                <Check className="w-5 h-5 text-emerald-400 stroke-[3]" />
              ) : hasUpdate ? (
                <Sparkles className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                {installState === 'ready' 
                  ? 'Update Ready to Restart' 
                  : installState === 'downloading' || installState === 'extracting' || installState === 'applying'
                  ? 'Updating Dockit...'
                  : hasUpdate 
                  ? 'Update Available!' 
                  : 'You Are Up To Date'}
              </h2>
              <p className="text-xs text-slate-400">
                {installState === 'ready'
                  ? 'The update has been applied in-place. Restart to launch the new version.'
                  : installState === 'downloading'
                  ? 'Downloading update package in the background...'
                  : installState === 'extracting' || installState === 'applying'
                  ? 'Extracting and updating application binary...'
                  : hasUpdate 
                  ? 'A newer version is available. Update now seamlessly in the background.' 
                  : 'Dockit is running the latest official release.'}
              </p>
            </div>
          </div>

          {installState !== 'downloading' && installState !== 'applying' && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Versions Badges */}
        <div className="grid grid-cols-2 gap-3 mb-5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Installed</span>
            <span className="text-sm font-mono font-bold text-slate-200 mt-0.5">
              v{String(updateInfo?.currentVersion || '0.1.0').replace(/^v/, '')}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">New Version</span>
            <span className={`text-sm font-mono font-bold mt-0.5 ${
              hasUpdate ? 'text-cyan-400' : 'text-emerald-400'
            }`}>
              v{String(updateInfo?.latestVersion || updateInfo?.currentVersion || '0.1.0').replace(/^v/, '')}
            </span>
          </div>
        </div>

        {/* In-Progress Progress Bar & Status */}
        {(installState === 'downloading' || installState === 'extracting' || installState === 'applying') && (
          <div className="space-y-3 mb-6 p-4 rounded-xl bg-slate-950/80 border border-cyan-800/40">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-cyan-300 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                {installState === 'downloading' && `Downloading: ${progress}%`}
                {installState === 'extracting' && 'Extracting binary...'}
                {installState === 'applying' && (
                  (selectedAsset?.type || updateInfo?.installType) === 'deb'
                    ? 'Installing .deb package (system authorization prompt may appear)...'
                    : (selectedAsset?.type || updateInfo?.installType) === 'rpm'
                    ? 'Installing .rpm package (system authorization prompt may appear)...'
                    : (selectedAsset?.type || updateInfo?.installType) === 'exe'
                    ? 'Launching Windows installer...'
                    : 'Applying update in-place...'
                )}
              </span>
              {progressInfo.totalBytes > 0 && (
                <span className="text-[11px] font-mono text-slate-400">
                  {formatSize(progressInfo.readBytes)} / {formatSize(progressInfo.totalBytes)}
                </span>
              )}
            </div>

            {/* Progress bar line */}
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-300 shadow-sm shadow-cyan-400/50"
                style={{ width: `${Math.max(5, progress)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              {(selectedAsset?.type || updateInfo?.installType) === 'deb' || (selectedAsset?.type || updateInfo?.installType) === 'rpm'
                ? 'Your desktop password will be requested to grant permission to install the updated package.'
                : 'You can keep using Dockit while the update is applied smoothly in the background.'}
            </p>
          </div>
        )}

        {/* Ready to restart prompt */}
        {installState === 'ready' && (
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-300 flex items-start gap-3 mb-6">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-slate-100">Update Installed Successfully!</p>
              <p className="text-slate-300 leading-relaxed">
                Dockit has updated to <strong>v{String(updateInfo?.latestVersion).replace(/^v/, '')}</strong>. Restart now to load the new version immediately, or restart later at your convenience.
              </p>
            </div>
          </div>
        )}

        {/* Error state alert */}
        {installState === 'error' && (
          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/50 text-xs text-rose-300 flex items-start gap-3 mb-6">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-rose-200">Update Failed</p>
              <p className="text-rose-300 leading-relaxed font-mono text-[11px]">
                {errorMessage || 'An error occurred during update.'}
              </p>
              <button
                onClick={handleManualBrowserDownload}
                className="mt-1 text-cyan-400 underline hover:text-cyan-300 block"
              >
                Download manually from browser instead
              </button>
            </div>
          </div>
        )}

        {/* Release Notes (Shown when idle) */}
        {hasUpdate && installState === 'idle' && (
          <div className="space-y-4 mb-6">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  {updateInfo?.releaseName || `Release ${updateInfo?.latestVersion}`}
                </span>
                {updateInfo?.publishedAt && (
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(updateInfo.publishedAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Release Notes snippet */}
              {updateInfo?.releaseNotes && (
                <div className="max-h-36 overflow-y-auto p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed select-text">
                  {updateInfo.releaseNotes}
                </div>
              )}
            </div>

            {/* Auto-detected Target Package for this system */}
            {(selectedAsset?.name || updateInfo?.assetFileName) && (
              <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/40 flex items-center justify-between gap-3 text-xs">
                <div className="truncate">
                  <span className="text-slate-400 block text-[11px]">
                    {updateInfo.installType === 'deb'
                      ? 'Target Package (.deb detected):'
                      : updateInfo.installType === 'rpm'
                      ? 'Target Package (.rpm detected):'
                      : updateInfo.installType === 'nsis'
                      ? 'Setup Wizard Installer (.exe):'
                      : updateInfo.installType === 'snap'
                      ? 'Managed by Snap Store:'
                      : 'Automatic Update Package:'}
                  </span>
                  <span className="font-mono text-cyan-300 font-medium truncate block mt-0.5">
                    {selectedAsset?.name || updateInfo.assetFileName}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                    {selectedAsset?.type ? `.${selectedAsset.type}` : updateInfo.platform}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {!hasUpdate && installState === 'idle' && (
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/30 text-xs text-emerald-300 flex items-start gap-2.5 mb-6">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              You are currently enjoying the latest official build of Dockit Desktop. Automatic update checks happen seamlessly in the background.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          <button
            onClick={onCheckAgain}
            disabled={isChecking || installState === 'downloading' || installState === 'applying'}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
          >
            {isChecking ? 'Checking...' : 'Check again'}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenReleasePage}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Notes</span>
            </button>

            {hasUpdate && installState === 'idle' && (
              updateInfo?.installType === 'snap' ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-800/60 text-xs text-cyan-300">
                  <span>Managed by Snap Store &bull; run</span>
                  <code className="font-mono font-semibold bg-slate-900 px-1 py-0.5 rounded border border-cyan-800/60 text-[11px] text-cyan-200">
                    snap refresh dockit
                  </code>
                </div>
              ) : (
                <button
                  onClick={handleStartInAppUpdate}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 text-xs font-bold shadow-md shadow-cyan-500/20 hover:brightness-110 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Update Now</span>
                </button>
              )
            )}

            {installState === 'ready' && (
              <button
                onClick={handleRestartNow}
                disabled={isRestarting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 hover:brightness-110 transition-all"
              >
                <RotateCcw className={`w-4 h-4 stroke-[2.5] ${isRestarting ? 'animate-spin' : ''}`} />
                <span>{isRestarting ? 'Restarting...' : 'Restart Now'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
