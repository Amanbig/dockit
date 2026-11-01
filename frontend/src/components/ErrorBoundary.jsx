import React from 'react';
import { AlertCircle, RefreshCw, Copy, Check } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, copied: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Dockit ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, copied: false });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleCopyError = () => {
    const text = `${this.state.error?.message || ''}\n\n${this.state.error?.stack || ''}`;
    navigator.clipboard?.writeText(text);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-900/60">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4 shadow-lg shadow-rose-500/5">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-100">Something went wrong in this view</h2>
          <p className="text-xs text-rose-300/90 font-mono bg-rose-950/30 border border-rose-900/40 px-3 py-1.5 rounded-lg max-w-lg mt-2 leading-relaxed break-all">
            {this.state.error?.message || 'An unexpected error occurred while rendering this component.'}
          </p>
          <div className="mt-5 flex items-center gap-2.5">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white shadow-md shadow-cyan-600/20 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload View</span>
            </button>
            <button
              onClick={this.handleCopyError}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700 transition cursor-pointer"
            >
              {this.state.copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{this.state.copied ? 'Copied' : 'Copy Error'}</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
