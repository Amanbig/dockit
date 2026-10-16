import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export function formatEngineError(rawError) {
  if (!rawError) return 'An unexpected error occurred.';
  const str = String(rawError).trim();

  if (str.includes('bind: address already in use')) {
    return 'Port collision: One of the requested ports is already occupied by another service on your host.';
  }
  if (str.includes('volume is in use')) {
    return 'Volume in use: This volume is currently attached to a container. Remove or stop the container first.';
  }
  if (str.includes('No such container')) {
    return 'Container not found: The container may have already been removed.';
  }
  if (str.includes('No such image')) {
    return 'Image not found: The image does not exist locally.';
  }
  if (str.includes('network is in use') || str.includes('has active endpoints')) {
    return 'Network in use: Disconnect all containers from this network before deleting it.';
  }
  if (str.includes('Cannot connect to the Docker daemon') || str.includes('Is the docker daemon running')) {
    return 'Engine unavailable: Cannot connect to Docker daemon. Ensure Docker is running.';
  }
  if (str.includes('context deadline exceeded')) {
    return 'Operation timed out: The container engine took too long to respond.';
  }
  if (str.includes('permission denied')) {
    return 'Permission denied: Insufficient privileges to communicate with the container socket.';
  }

  // Clean common prefixes
  return str
    .replace(/^Error response from daemon:\s*/i, '')
    .replace(/^failed to [^:]+:\s*/i, '')
    .replace(/^Error:\s*/i, '');
}

export function ToastContainer({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const { id, type = 'info', title, message, duration = 4000 } = toast;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  const typeConfig = {
    success: {
      border: 'border-emerald-500/40',
      bg: 'bg-slate-900/95',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
      titleColor: 'text-emerald-300',
      glow: 'shadow-emerald-500/10'
    },
    error: {
      border: 'border-rose-500/50',
      bg: 'bg-slate-900/95',
      icon: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
      titleColor: 'text-rose-300',
      glow: 'shadow-rose-500/10'
    },
    warning: {
      border: 'border-amber-500/40',
      bg: 'bg-slate-900/95',
      icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
      titleColor: 'text-amber-300',
      glow: 'shadow-amber-500/10'
    },
    info: {
      border: 'border-cyan-500/40',
      bg: 'bg-slate-900/95',
      icon: <Info className="w-4 h-4 text-cyan-400 shrink-0" />,
      titleColor: 'text-cyan-300',
      glow: 'shadow-cyan-500/10'
    }
  }[type] || {
    border: 'border-slate-700',
    bg: 'bg-slate-900/95',
    icon: <Info className="w-4 h-4 text-slate-400 shrink-0" />,
    titleColor: 'text-slate-300',
    glow: 'shadow-slate-500/10'
  };

  return (
    <div 
      className={`pointer-events-auto p-3.5 rounded-xl border ${typeConfig.border} ${typeConfig.bg} backdrop-blur-md shadow-xl ${typeConfig.glow} flex items-start gap-3 animate-in slide-in-from-bottom-3 duration-200 transition-all select-none`}
    >
      <div className="mt-0.5">{typeConfig.icon}</div>
      <div className="flex-1 min-w-0 pr-1">
        {title && (
          <p className={`text-xs font-bold leading-tight ${typeConfig.titleColor}`}>
            {title}
          </p>
        )}
        <p className="text-xs text-slate-200 mt-0.5 leading-snug break-words">
          {message}
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors shrink-0 -mr-1 -mt-1 cursor-pointer"
        title="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
