import React from 'react';
import { 
  Sparkles, 
  Download, 
  ExternalLink, 
  X, 
  CheckCircle2, 
  Clock, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { BrowserOpenURL } from '../../wailsjs/runtime/runtime';

export default function UpdateModal({
  isOpen,
  onClose,
  updateInfo,
  onCheckAgain,
  isChecking
}) {
  if (!isOpen) return null;

  const hasUpdate = updateInfo?.available;

  const handleDownload = () => {
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
              hasUpdate 
                ? 'bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-400' 
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}>
              {hasUpdate ? <Sparkles className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                {hasUpdate ? 'Update Available!' : 'You Are Up To Date'}
              </h2>
              <p className="text-xs text-slate-400">
                {hasUpdate 
                  ? 'A newer version of Dockit is ready to download.' 
                  : 'Dockit is running the latest available release.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
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
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Latest Release</span>
            <span className={`text-sm font-mono font-bold mt-0.5 ${
              hasUpdate ? 'text-cyan-400' : 'text-emerald-400'
            }`}>
              v{String(updateInfo?.latestVersion || updateInfo?.currentVersion || '0.1.0').replace(/^v/, '')}
            </span>
          </div>
        </div>

        {/* Release Details / Notes */}
        {hasUpdate ? (
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

            {/* Target Package Banner */}
            {updateInfo?.assetFileName && (
              <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/40 flex items-center justify-between gap-3 text-xs">
                <div className="truncate">
                  <span className="text-slate-400 block text-[11px]">Recommended for your platform:</span>
                  <span className="font-mono text-cyan-300 font-medium truncate block">
                    {updateInfo.assetFileName}
                  </span>
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {updateInfo.platform}
                </span>
              </div>
            )}
          </div>
        ) : (
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
            disabled={isChecking}
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
              <span>Release Notes</span>
            </button>

            {hasUpdate && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 text-xs font-bold shadow-md shadow-cyan-500/20 hover:brightness-110 transition-all"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Download Update</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
