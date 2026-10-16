import React, { useState, useEffect, useRef } from 'react';
import { 
  SlidersHorizontal, 
  Table, 
  Code, 
  Plus, 
  Trash2, 
  Upload, 
  Copy, 
  Check, 
  X, 
  AlertCircle,
  FileText
} from 'lucide-react';

/**
 * Parses raw text or list into array of { id, key, value }
 */
export const parseEnvString = (raw) => {
  if (!raw) return [];
  let lines = [];
  if (Array.isArray(raw)) {
    lines = raw;
  } else if (typeof raw === 'string') {
    if (raw.includes('\n')) {
      lines = raw.split(/\r?\n/);
    } else {
      lines = raw.split(',');
    }
  }

  const result = [];
  lines.forEach((line) => {
    let trimmed = typeof line === 'string' ? line.trim() : '';
    if (!trimmed || trimmed.startsWith('#')) return;
    if (trimmed.startsWith('export ')) {
      trimmed = trimmed.substring(7).trim();
    }
    const eqIdx = trimmed.indexOf('=');
    let key = '';
    let value = '';
    if (eqIdx === -1) {
      key = trimmed;
      value = '';
    } else {
      key = trimmed.slice(0, eqIdx).trim();
      value = trimmed.slice(eqIdx + 1).trim();
      // Remove surrounding single or double quotes if matched
      if (
        (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
        (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
      ) {
        value = value.slice(1, -1);
      }
    }
    if (key) {
      result.push({
        id: Math.random().toString(36).substring(2, 9),
        key,
        value
      });
    }
  });
  return result;
};

/**
 * Serializes rows into .env multi-line string
 */
export const rowsToEnvString = (rows) => {
  return (rows || [])
    .filter((r) => r.key && r.key.trim())
    .map((r) => `${r.key.trim()}=${r.value ?? ''}`)
    .join('\n');
};

export default function EnvEditorModal({
  isOpen,
  initialEnv = '',
  onSave,
  onClose
}) {
  const [activeTab, setActiveTab] = useState('table');
  const [rows, setRows] = useState([]);
  const [rawText, setRawText] = useState('');
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const fileInputRef = useRef(null);

  // Initialize data when modal opens
  useEffect(() => {
    if (!isOpen) return;
    const parsed = parseEnvString(initialEnv);
    if (parsed.length > 0) {
      setRows(parsed);
      setRawText(rowsToEnvString(parsed));
    } else {
      const defaultRow = [{ id: Math.random().toString(36).substring(2, 9), key: '', value: '' }];
      setRows(defaultRow);
      setRawText('');
    }
    setActiveTab('table');
    setStatusMessage(null);
  }, [isOpen, initialEnv]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validRowCount = activeTab === 'table' 
    ? rows.filter(r => r.key.trim()).length
    : parseEnvString(rawText).length;

  const handleTabChange = (newTab) => {
    if (newTab === activeTab) return;
    if (newTab === 'raw') {
      // Switching from table to raw
      const serialized = rowsToEnvString(rows);
      setRawText(serialized);
      setActiveTab('raw');
    } else {
      // Switching from raw to table
      const parsed = parseEnvString(rawText);
      setRows(parsed.length > 0 ? parsed : [{ id: Math.random().toString(36).substring(2, 9), key: '', value: '' }]);
      setActiveTab('table');
    }
  };

  const handleAddRow = () => {
    setRows(prev => [
      ...prev,
      { id: Math.random().toString(36).substring(2, 9), key: '', value: '' }
    ]);
  };

  const handleRemoveRow = (id) => {
    setRows(prev => {
      const updated = prev.filter(r => r.id !== id);
      return updated.length > 0 ? updated : [{ id: Math.random().toString(36).substring(2, 9), key: '', value: '' }];
    });
  };

  const handleRowChange = (id, field, value) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleClearAll = () => {
    setRows([{ id: Math.random().toString(36).substring(2, 9), key: '', value: '' }]);
    setRawText('');
    setStatusMessage({ type: 'info', text: 'Cleared all environment variables.' });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleFileImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        const imported = parseEnvString(content);
        if (imported.length === 0) {
          setStatusMessage({ type: 'warning', text: `No valid variables found in ${file.name}.` });
        } else {
          // Merge imported variables into rows
          setRows(prev => {
            const existingNonEmpty = prev.filter(r => r.key.trim());
            const keyMap = new Map();
            existingNonEmpty.forEach(r => keyMap.set(r.key.trim(), r));
            imported.forEach(r => keyMap.set(r.key.trim(), r));
            return Array.from(keyMap.values());
          });

          // Also update raw text
          if (activeTab === 'raw') {
            setRawText(prev => (prev.trim() ? `${prev.trim()}\n${content.trim()}` : content.trim()));
          }

          setStatusMessage({
            type: 'success',
            text: `Successfully imported ${imported.length} variable${imported.length > 1 ? 's' : ''} from ${file.name}.`
          });
        }
        setTimeout(() => setStatusMessage(null), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input so same file can be picked again
  };

  const handleCopy = () => {
    const textToCopy = activeTab === 'raw' 
      ? rawText 
      : rowsToEnvString(rows);
    
    if (!textToCopy.trim()) {
      setStatusMessage({ type: 'warning', text: 'No environment variables to copy.' });
      setTimeout(() => setStatusMessage(null), 2500);
      return;
    }

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    let result = '';
    if (activeTab === 'raw') {
      const parsed = parseEnvString(rawText);
      result = rowsToEnvString(parsed);
    } else {
      result = rowsToEnvString(rows);
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
        className="bg-slate-900 border border-slate-750 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hidden file input for .env upload */}
        <input 
          type="file" 
          ref={fileInputRef} 
          accept=".env,.env.*,.txt,text/plain" 
          onChange={handleFileImport} 
          className="hidden" 
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-100">Environment Variables</h3>
              <p className="text-[11px] text-slate-400">Configure key-value pairs or import an .env file</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Upload .env button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-cyan-400 text-xs font-medium border border-slate-700/80 transition cursor-pointer"
              title="Upload or import a .env file"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import .env</span>
            </button>

            {/* Copy button */}
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-slate-100 text-xs font-medium border border-slate-700/80 transition cursor-pointer"
              title="Copy as .env format to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* View Switcher Bar */}
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
              <span>Raw .env</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {validRowCount} variable{validRowCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Notification / Status message */}
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

        {/* Modal Content Body */}
        <div className="flex-1 p-5 overflow-y-auto">
          {activeTab === 'table' ? (
            <div className="space-y-3">
              {/* Table Column Labels */}
              <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
                <div className="flex-1">Variable Name (Key)</div>
                <div className="w-4 text-center select-none opacity-0">=</div>
                <div className="flex-1">Value</div>
                <div className="w-8 text-center select-none">Action</div>
              </div>

              {/* Rows List */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {rows.map((row, idx) => (
                  <div key={row.id} className="flex items-center gap-2">
                    {/* Key Input */}
                    <input
                      type="text"
                      placeholder="e.g. PORT"
                      value={row.key}
                      onChange={(e) => handleRowChange(row.id, 'key', e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition"
                      spellCheck={false}
                    />

                    {/* Separator */}
                    <span className="text-slate-500 font-mono font-bold select-none text-xs">=</span>

                    {/* Value Input */}
                    <input
                      type="text"
                      placeholder="e.g. 8080"
                      value={row.value}
                      onChange={(e) => handleRowChange(row.id, 'value', e.target.value)}
                      onKeyDown={(e) => {
                        // Pressing Enter in last row value adds a new row
                        if (e.key === 'Enter' && idx === rows.length - 1) {
                          e.preventDefault();
                          handleAddRow();
                        }
                      }}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition"
                      spellCheck={false}
                    />

                    {/* Delete Row Button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(row.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                      title="Remove variable"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Table Action Controls */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-cyan-400 border border-slate-800 text-xs font-medium transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Variable</span>
                </button>

                {rows.some(r => r.key.trim()) && (
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
            /* Raw / .env Text View */
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Enter one <code className="text-cyan-400 font-mono">KEY=VALUE</code> per line. Comments with <code className="text-cyan-400 font-mono">#</code> are ignored.</span>
              </div>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`# Container Environment Variables\nNODE_ENV=production\nPORT=8080\nAPI_URL=https://api.example.com`}
                className="w-full h-72 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 resize-none leading-relaxed select-text"
                spellCheck={false}
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            {validRowCount === 0 ? (
              <span>No variables will be set</span>
            ) : (
              <span><strong className="text-slate-200">{validRowCount}</strong> variable{validRowCount > 1 ? 's' : ''} ready to apply</span>
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
              Apply Variables
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
