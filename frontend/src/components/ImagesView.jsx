import React, { useState, useEffect, useRef } from 'react';
import { 
  DownloadCloud, 
  Trash2, 
  Tag, 
  Info, 
  Layers, 
  Search, 
  HardDrive, 
  Copy, 
  Check,
  RefreshCw
} from 'lucide-react';

export default function ImagesView({
  images = [],
  loading,
  onRefresh,
  onPull,
  onRemove,
  onBatchRemove,
  onTag,
  onInspect
}) {
  const [search, setSearch] = useState('');
  const [showPullModal, setShowPullModal] = useState(false);
  const [pullInput, setPullInput] = useState('');
  const [pulling, setPulling] = useState(false);
  const [tagModal, setTagModal] = useState({ open: false, imageId: '', newTag: '' });
  const [copiedId, setCopiedId] = useState(null);
  const [deletingImages, setDeletingImages] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [batchExecuting, setBatchExecuting] = useState(false);
  const headerCheckboxRef = useRef(null);

  useEffect(() => {
    if (!showPullModal && !tagModal.open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showPullModal) setShowPullModal(false);
        if (tagModal.open) setTagModal({ open: false, imageId: '', newTag: '' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPullModal, tagModal.open]);

  const filtered = images.filter(img => {
    const tagsStr = (img.repoTags || []).join(' ');
    const idStr = img.id || '';
    return tagsStr.toLowerCase().includes(search.toLowerCase()) || idStr.toLowerCase().includes(search.toLowerCase());
  });

  useEffect(() => {
    if (headerCheckboxRef.current) {
      const allSelected = filtered.length > 0 && filtered.every(img => selectedIds.includes(img.id));
      const someSelected = selectedIds.length > 0 && !allSelected;
      headerCheckboxRef.current.checked = allSelected;
      headerCheckboxRef.current.indeterminate = someSelected;
    }
  }, [selectedIds, filtered]);

  const handleToggleSelectAll = () => {
    const allSelected = filtered.length > 0 && filtered.every(img => selectedIds.includes(img.id));
    if (allSelected) {
      const filteredIds = new Set(filtered.map(img => img.id));
      setSelectedIds(prev => prev.filter(id => !filteredIds.has(id)));
    } else {
      const combined = new Set([...selectedIds, ...filtered.map(img => img.id)]);
      setSelectedIds(Array.from(combined));
    }
  };

  const handleToggleSelectOne = (e, id) => {
    e.stopPropagation();
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBatchRemove = async () => {
    if (!onBatchRemove || selectedIds.length === 0 || batchExecuting) return;
    setBatchExecuting(true);
    try {
      const ok = await onBatchRemove(selectedIds);
      if (ok) setSelectedIds([]);
    } finally {
      setBatchExecuting(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handlePullSubmit = async (e) => {
    e.preventDefault();
    if (!pullInput.trim()) return;
    try {
      setPulling(true);
      await onPull(pullInput.trim());
      setShowPullModal(false);
      setPullInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setPulling(false);
    }
  };

  const handleDeleteImage = async (id) => {
    if (deletingImages[id]) return;
    setDeletingImages(prev => ({ ...prev, [id]: true }));
    try {
      await onRemove(id, false);
    } finally {
      setDeletingImages(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleTagSubmit = async (e) => {
    e.preventDefault();
    if (!tagModal.newTag.trim()) return;
    try {
      await onTag(tagModal.imageId, tagModal.newTag.trim());
      setTagModal({ open: false, imageId: '', newTag: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900/60 overflow-hidden">
      {/* Action Header */}
      <div className="p-6 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Images</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Local container images stored on your machine. Pull new tags or clean dangling layers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search images or tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-56 transition-colors"
            />
          </div>

          {/* Pull button */}
          <button
            onClick={() => setShowPullModal(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg text-xs shadow-md shadow-cyan-500/20 transition-all"
          >
            <DownloadCloud className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            <span>Pull Image</span>
          </button>
        </div>
      </div>

      {/* Main Images Table */}
      <div className="flex-1 overflow-auto p-6">
        {filtered.length === 0 ? (
          <div className="h-64 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Layers className="w-8 h-8 text-slate-600 mb-2" />
            <p className="font-medium text-sm text-slate-400">No images found</p>
            <p className="text-xs mt-1">Pull an image from Docker Hub or your registry to get started.</p>
          </div>
        ) : (
          <>
            {/* Batch Action Toolbar */}
            {selectedIds.length > 0 && (
              <div className="mb-3 px-4 py-2.5 rounded-xl border border-cyan-500/30 bg-slate-950/90 shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="font-semibold text-slate-100 font-mono">
                    {selectedIds.length} image{selectedIds.length > 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={() => setSelectedIds([])}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 underline ml-1 cursor-pointer"
                  >
                    Clear selection
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBatchRemove}
                    disabled={batchExecuting}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium transition cursor-pointer disabled:opacity-50"
                    title="Delete selected images"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            )}

            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 shadow-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        ref={headerCheckboxRef}
                        checked={filtered.length > 0 && filtered.every(img => selectedIds.includes(img.id))}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/30 cursor-pointer accent-cyan-500"
                        title={filtered.length > 0 && filtered.every(img => selectedIds.includes(img.id)) ? "Deselect all" : "Select all"}
                      />
                    </th>
                    <th className="py-3 px-4">Repository / Tag</th>
                    <th className="py-3 px-4">Image ID</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filtered.map((img) => {
                    const tagList = img.repoTags && img.repoTags.length > 0 ? img.repoTags : ['<untagged>'];
                    const shortId = (img.id || '').replace(/^sha256:/, '').substring(0, 12);
                    const isSelected = selectedIds.includes(img.id);
                    return (
                      <tr 
                        key={img.id} 
                        className={`hover:bg-slate-900/50 transition-colors group ${
                          isSelected ? 'bg-cyan-950/30 border-l-2 border-l-cyan-400' : ''
                        }`}
                      >
                        <td className="py-3 px-3 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleToggleSelectOne(e, img.id)}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/30 cursor-pointer accent-cyan-500"
                          />
                        </td>
                        <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          {tagList.map((t, idx) => (
                            <span 
                              key={idx} 
                              className={`font-mono text-xs font-semibold ${t === '<untagged>' ? 'text-amber-400' : 'text-slate-100 group-hover:text-cyan-400'} transition-colors`}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
                          <span>{shortId}</span>
                          <button
                            onClick={() => handleCopy(img.id, img.id)}
                            className="text-slate-600 hover:text-slate-300 transition-colors"
                            title="Copy full Image ID"
                          >
                            {copiedId === img.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                        {formatBytes(img.size)}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {new Date(img.created * 1000).toLocaleString(undefined, {
                          month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setTagModal({ open: true, imageId: img.id, newTag: '' })}
                            title="Add Tag"
                            className="p-1.5 text-slate-400 hover:bg-slate-800 rounded-md transition-colors"
                          >
                            <Tag className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onInspect(img.id, tagList[0])}
                            title="Inspect Image"
                            className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteImage(img.id)}
                            disabled={Boolean(deletingImages[img.id])}
                            title="Delete Image"
                            className="p-1.5 text-rose-400 hover:bg-rose-400/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            {deletingImages[img.id] ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      </div>

      {/* Pull Image Modal */}
      {showPullModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <DownloadCloud className="w-4 h-4 text-cyan-400" />
                Pull Image
              </h2>
              <button
                onClick={() => setShowPullModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handlePullSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Image Reference (Name + Tag)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. alpine:latest, postgres:16-alpine, ghcr.io/..."
                  value={pullInput}
                  onChange={(e) => setPullInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Dockit will pull layers from your active registry and prepare the image locally.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPullModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pulling}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold hover:brightness-110 disabled:opacity-50"
                >
                  {pulling ? 'Pulling Layers...' : 'Pull Image'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tag Image Modal */}
      {tagModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Tag className="w-4 h-4 text-cyan-400" />
                Add Image Tag
              </h2>
              <button
                onClick={() => setTagModal({ open: false, imageId: '', newTag: '' })}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleTagSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  New Tag Target
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. my-app:v1.0.0 or localhost:5000/test:latest"
                  value={tagModal.newTag}
                  onChange={(e) => setTagModal({ ...tagModal, newTag: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setTagModal({ open: false, imageId: '', newTag: '' })}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold hover:brightness-110"
                >
                  Apply Tag
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
