import React, { useState, useEffect } from 'react';
import { 
  Network, 
  Table, 
  Code, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  X, 
  AlertCircle,
  Zap
} from 'lucide-react';

export const parsePortSpecs = (raw) => {
  if (!raw) return [];
  let items = [];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (typeof raw === 'string') {
    if (raw.includes('\n')) {
      items = raw.split(/\r?\n/);
    } else {
      items = raw.split(',');
    }
  }

  const result = [];
  items.forEach((item) => {
    let str = typeof item === 'string' ? item.trim() : '';
    if (!str || str.startsWith('#')) return;

    let proto = 'tcp';
    if (str.includes('/')) {
      const parts = str.split('/');
      str = parts[0].trim();
      proto = (parts[1] || 'tcp').trim().toLowerCase();
    }

    const colonParts = str.split(':');
    let hostPort = '';
    let containerPort = '';

    if (colonParts.length === 1) {
      containerPort = colonParts[0].trim();
      hostPort = containerPort;
    } else if (colonParts.length === 2) {
      hostPort = colonParts[0].trim();
      containerPort = colonParts[1].trim();
    } else if (colonParts.length === 3) {
      // IP:hostPort:containerPort
      hostPort = `${colonParts[0].trim()}:${colonParts[1].trim()}`;
      containerPort = colonParts[2].trim();
    }

    if (containerPort || hostPort) {
      result.push({
        id: Math.random().toString(36).substring(2, 9),
        hostPort,
        containerPort,
        protocol: proto === 'udp' ? 'udp' : 'tcp'
      });
    }
  });

  return result;
};

export const rowsToPortString = (rows) => {
  return (rows || [])
    .filter(r => (r.containerPort && r.containerPort.trim()) || (r.hostPort && r.hostPort.trim()))
    .map(r => {
      const host = (r.hostPort || '').trim();
      const cont = (r.containerPort || '').trim() || host;
      const spec = host ? `${host}:${cont}` : cont;
      return r.protocol === 'udp' ? `${spec}/udp` : spec;
    })
    .join(', ');
};

const COMMON_PRESETS = [
  { label: 'HTTP (80:80)', host: '80', container: '80', protocol: 'tcp' },
  { label: 'HTTPS (443:443)', host: '443', container: '443', protocol: 'tcp' },
  { label: 'Web (8080:8080)', host: '8080', container: '8080', protocol: 'tcp' },
  { label: 'Dev (3000:3000)', host: '3000', container: '3000', protocol: 'tcp' },
  { label: 'Vite (5173:5173)', host: '5173', container: '5173', protocol: 'tcp' },
  { label: 'Postgres (5432)', host: '5432', container: '5432', protocol: 'tcp' },
  { label: 'MySQL (3306)', host: '3306', container: '3306', protocol: 'tcp' },
  { label: 'Redis (6379)', host: '6379', container: '6379', protocol: 'tcp' }
];

export default function PortBindingsModal({
  isOpen,
  initialPorts = '',
  onSave,
  onClose
}) {
  const [activeTab, setActiveTab] = useState('table');
  const [rows, setRows] = useState([]);
  const [rawText, setRawText] = useState('');
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Initialize data when modal opens
  useEffect(() => {
    if (!isOpen) return;
    const parsed = parsePortSpecs(initialPorts);
    if (parsed.length > 0) {
      setRows(parsed);
      setRawText(rowsToPortString(parsed));
    } else {
      const defaultRow = [{ id: Math.random().toString(36).substring(2, 9), hostPort: '', containerPort: '', protocol: 'tcp' }];
      setRows(defaultRow);
      setRawText('');
    }
    setActiveTab('table');
    setStatusMessage(null);
  }, [isOpen, initialPorts]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validRowCount = activeTab === 'table'
    ? rows.filter(r => (r.containerPort && r.containerPort.trim()) || (r.hostPort && r.hostPort.trim())).length
    : parsePortSpecs(rawText).length;

  const handleTabChange = (newTab) => {
    if (newTab === activeTab) return;
    if (newTab === 'raw') {
      const serialized = rowsToPortString(rows);
      setRawText(serialized);
      setActiveTab('raw');
    } else {
      const parsed = parsePortSpecs(rawText);
      setRows(parsed.length > 0 ? parsed : [{ id: Math.random().toString(36).substring(2, 9), hostPort: '', containerPort: '', protocol: 'tcp' }]);
      setActiveTab('table');
    }
  };

  const handleAddRow = () => {
    setRows(prev => [
      ...prev,
      { id: Math.random().toString(36).substring(2, 9), hostPort: '', containerPort: '', protocol: 'tcp' }
    ]);
  };

  const handleRemoveRow = (id) => {
    setRows(prev => {
      const updated = prev.filter(r => r.id !== id);
      return updated.length > 0 ? updated : [{ id: Math.random().toString(36).substring(2, 9), hostPort: '', containerPort: '', protocol: 'tcp' }];
    });
  };

  const handleRowChange = (id, field, value) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleApplyPreset = (preset) => {
    setRows(prev => {
      // If there's only 1 empty row, replace it
      const hasOnlyEmpty = prev.length === 1 && !prev[0].hostPort && !prev[0].containerPort;
      const newEntry = {
        id: Math.random().toString(36).substring(2, 9),
        hostPort: preset.host,
        containerPort: preset.container,
        protocol: preset.protocol
      };
      if (hasOnlyEmpty) return [newEntry];
      // Avoid exact duplicates
      const exists = prev.some(r => r.hostPort === preset.host && r.containerPort === preset.container && r.protocol === preset.protocol);
      if (exists) return prev;
      return [...prev, newEntry];
    });
    setStatusMessage({ type: 'success', text: `Added preset ${preset.label}` });
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleClearAll = () => {
    setRows([{ id: Math.random().toString(36).substring(2, 9), hostPort: '', containerPort: '', protocol: 'tcp' }]);
    setRawText('');
    setStatusMessage({ type: 'info', text: 'Cleared all port mappings.' });
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleCopy = () => {
    const textToCopy = activeTab === 'raw' ? rawText : rowsToPortString(rows);
    if (!textToCopy.trim()) {
      setStatusMessage({ type: 'warning', text: 'No port mappings to copy.' });
      setTimeout(() => setStatusMessage(null), 2000);
      return;
    }
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    let result = '';
    if (activeTab === 'raw') {
      const parsed = parsePortSpecs(rawText);
      result = rowsToPortString(parsed);
    } else {
      result = rowsToPortString(rows);
    }
    if (onSave) {
      onSave(result);
    }
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-750 rounded-xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-100">Port Bindings</h3>
              <p className="text-[11px] text-slate-400">Forward traffic from host ports to container ports</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-slate-100 text-xs font-medium border border-slate-700/80 transition cursor-pointer"
              title="Copy port mappings string"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* View Switcher & Counter */}
        <div className="px-5 py-2.5 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-950 border border-slate-800">
            <button
              type="button"
              onClick={() => handleTabChange('table')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                activeTab === 'table'
                  ? 'bg-slate-800 text-cyan-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Table View</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('raw')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                activeTab === 'raw'
                  ? 'bg-slate-800 text-cyan-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Quick String</span>
            </button>
          </div>

          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            {validRowCount} port{validRowCount !== 1 ? 's' : ''} mapped
          </span>
        </div>

        {/* Quick Presets Bar */}
        <div className="px-5 py-2 bg-slate-900 border-b border-slate-800/80">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium mr-1">
              <Zap className="w-3 h-3 text-amber-400" />
              Presets:
            </span>
            {COMMON_PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className="text-[10px] px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-slate-800 font-mono transition cursor-pointer hover:border-cyan-500/50"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div className={`px-5 py-2 text-xs flex items-center gap-2 border-b ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : statusMessage.type === 'warning'
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
          }`}>
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 p-5 overflow-y-auto">
          {activeTab === 'table' ? (
            <div className="space-y-3">
              {/* Column Labels */}
              <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
                <div className="flex-1">Host Port (or IP:Port)</div>
                <div className="w-4 text-center select-none text-slate-500">:</div>
                <div className="flex-1">Container Port</div>
                <div className="w-24">Protocol</div>
                <div className="w-8 text-center select-none">Action</div>
              </div>

              {/* Rows List */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {rows.map((row, idx) => (
                  <div key={row.id} className="flex items-center gap-2">
                    {/* Host Port Input */}
                    <input
                      type="text"
                      placeholder="e.g. 8080"
                      value={row.hostPort}
                      onChange={(e) => handleRowChange(row.id, 'hostPort', e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition"
                      spellCheck={false}
                    />

                    {/* Separator */}
                    <span className="text-slate-500 font-mono font-bold select-none text-xs">:</span>

                    {/* Container Port Input */}
                    <input
                      type="text"
                      placeholder="e.g. 80"
                      value={row.containerPort}
                      onChange={(e) => handleRowChange(row.id, 'containerPort', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && idx === rows.length - 1) {
                          e.preventDefault();
                          handleAddRow();
                        }
                      }}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition"
                      spellCheck={false}
                    />

                    {/* Protocol Select */}
                    <select
                      value={row.protocol}
                      onChange={(e) => handleRowChange(row.id, 'protocol', e.target.value)}
                      className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 transition cursor-pointer"
                    >
                      <option value="tcp">TCP</option>
                      <option value="udp">UDP</option>
                    </select>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(row.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                      title="Remove mapping"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-cyan-400 border border-slate-800 text-xs font-medium transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Port Mapping</span>
                </button>

                {rows.some(r => r.hostPort.trim() || r.containerPort.trim()) && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-xs text-rose-400 hover:text-rose-300 hover:underline transition cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Quick String View */
            <div className="space-y-2">
              <div className="text-[11px] text-slate-400">
                Enter comma or newline-separated port bindings, e.g. <code className="text-cyan-400 font-mono">8080:80, 443:443/udp, 127.0.0.1:3000:3000</code>.
              </div>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="8080:80, 443:443, 3000:3000/udp"
                className="w-full h-48 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 resize-none leading-relaxed select-text"
                spellCheck={false}
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            {validRowCount === 0 ? (
              <span>No ports mapped (internal ports only)</span>
            ) : (
              <span><strong className="text-slate-200">{validRowCount}</strong> port{validRowCount > 1 ? 's' : ''} mapped to host</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold hover:brightness-110 text-xs transition cursor-pointer"
            >
              Apply Ports
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
