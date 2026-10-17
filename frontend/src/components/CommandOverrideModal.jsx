import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Code, 
  Copy, 
  Check, 
  X, 
  Zap,
  Info
} from 'lucide-react';

/**
 * Shell argument tokenizer that respects single and double quotes.
 * e.g. `sh -c "echo 'hello world'"` -> `["sh", "-c", "echo 'hello world'"]`
 */
export const parseCommandArgs = (cmdStr) => {
  if (!cmdStr || typeof cmdStr !== 'string' || !cmdStr.trim()) return [];
  const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
  const args = [];
  let match;
  while ((match = regex.exec(cmdStr)) !== null) {
    if (match[1] !== undefined) {
      args.push(match[1]); // Double quoted
    } else if (match[2] !== undefined) {
      args.push(match[2]); // Single quoted
    } else {
      args.push(match[0]); // Plain token
    }
  }
  return args;
};

const COMMAND_SNIPPETS = [
  { label: 'Keep-Alive', cmd: 'sleep infinity', desc: 'Keeps container running indefinitely' },
  { label: 'Tail Null', cmd: 'tail -f /dev/null', desc: 'Alternative lightweight keep-alive' },
  { label: 'Interactive sh', cmd: '/bin/sh', desc: 'Standard POSIX shell' },
  { label: 'Interactive bash', cmd: '/bin/bash', desc: 'Bourne Again Shell' },
  { label: 'Shell wrapper', cmd: 'sh -c "echo \'Dockit container ready\' && sleep 3600"', desc: 'Execute inline shell script' }
];

export default function CommandOverrideModal({
  isOpen,
  initialCmd = '',
  onSave,
  onClose
}) {
  const [cmdText, setCmdText] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCmdText(initialCmd || '');
  }, [isOpen, initialCmd]);

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

  const parsedArgs = parseCommandArgs(cmdText);

  const handleCopy = () => {
    if (!cmdText.trim()) return;
    navigator.clipboard.writeText(cmdText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (onSave) {
      onSave(cmdText.trim());
    }
    onClose();
  };

  const handleApplySnippet = (snippetCmd) => {
    setCmdText(snippetCmd);
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
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-100">Command Override (CMD)</h3>
              <p className="text-[11px] text-slate-400">Override default executable command or entrypoint arguments</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-slate-100 text-xs font-medium border border-slate-700/80 transition cursor-pointer"
              title="Copy command to clipboard"
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

        {/* Quick Snippets Bar */}
        <div className="px-5 py-2.5 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium mr-1">
              <Zap className="w-3 h-3 text-amber-400" />
              Snippets:
            </span>
            {COMMAND_SNIPPETS.map((snip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplySnippet(snip.cmd)}
                title={snip.desc}
                className="text-[10px] px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-slate-800 font-mono transition cursor-pointer hover:border-cyan-500/50"
              >
                {snip.label}
              </button>
            ))}
          </div>

          {cmdText && (
            <button
              type="button"
              onClick={() => setCmdText('')}
              className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Editor Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Command Script / Arguments
            </label>
            <textarea
              value={cmdText}
              onChange={(e) => setCmdText(e.target.value)}
              placeholder="e.g. python -u server.py --port 8080 or sh -c 'npm run build && npm start'"
              className="w-full h-36 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 resize-none leading-relaxed select-text"
              spellCheck={false}
              autoFocus
            />
          </div>

          {/* Argument Tokenizer Preview */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
                <Code className="w-3.5 h-3.5 text-cyan-400" />
                <span>Docker Engine Execution Preview</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {parsedArgs.length} arg{parsedArgs.length !== 1 ? 's' : ''}
              </span>
            </div>

            {parsedArgs.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic">
                No custom command entered. Container will run the default image CMD/ENTRYPOINT.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {parsedArgs.map((arg, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-cyan-300"
                    title={`Argument [${idx}]: ${arg}`}
                  >
                    <span className="text-[9px] text-slate-500 font-bold select-none">[{idx}]</span>
                    <span>{arg}</span>
                  </span>
                ))}
              </div>
            )}

            <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-start gap-1.5 text-[10px] text-slate-400">
              <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
              <span>Quotes like <code className="text-cyan-400 font-mono">"..."</code> and <code className="text-cyan-400 font-mono">'...'</code> are automatically respected when tokenizing arguments.</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            {parsedArgs.length === 0 ? (
              <span>Using image default command</span>
            ) : (
              <span>Ready to pass <strong>{parsedArgs.length}</strong> argument{parsedArgs.length > 1 ? 's' : ''}</span>
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
              Apply Command
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
