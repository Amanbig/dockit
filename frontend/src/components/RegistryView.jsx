import React, { useState, useMemo } from 'react';
import { marked } from 'marked';
import { 
  Globe, 
  Search, 
  DownloadCloud, 
  Star, 
  ShieldCheck, 
  Layers,
  Tag,
  Copy,
  Check,
  FileText,
  Clock,
  Sparkles,
  Terminal,
  ExternalLink,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';

// Configure marked with GitHub Flavored Markdown and line breaks
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Format large numbers cleanly (e.g. 1.14B, 12.5M, 13.6K) to prevent layout overflows on small displays
 */
function formatCount(num) {
  if (num === undefined || num === null) return '0';
  if (typeof num === 'string') {
    const parsed = parseInt(num.replace(/,/g, ''), 10);
    if (!isNaN(parsed)) num = parsed;
    else return num;
  }
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(2).replace(/\.00$/, '') + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toLocaleString();
}

/**
 * Rich Markdown & Code Formatter for Docker Hub / Registry READMEs
 */
function ReadmeViewer({ markdown }) {
  if (!markdown || !markdown.trim()) {
    return (
      <div className="py-8 text-center text-xs text-slate-500">
        No full README documentation published for this repository.
      </div>
    );
  }

  const renderedHtml = useMemo(() => {
    try {
      const parsed = marked.parse(markdown);
      // Strip potentially harmful script tags
      return parsed.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    } catch (err) {
      console.error('Failed to parse README markdown:', err);
      return `<p>${markdown}</p>`;
    }
  }, [markdown]);

  const handleContainerClick = (e) => {
    const anchor = e.target.closest('a');
    if (anchor && anchor.href) {
      e.preventDefault();
      try {
        if (window.runtime?.BrowserOpenURL) {
          window.runtime.BrowserOpenURL(anchor.href);
        } else {
          window.open(anchor.href, '_blank', 'noopener,noreferrer');
        }
      } catch {
        window.open(anchor.href, '_blank', 'noopener,noreferrer');
      }
    }
  };

  return (
    <div
      className="readme-markdown max-w-full overflow-x-auto text-xs text-slate-300 leading-relaxed select-text"
      onClick={handleContainerClick}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
}

export default function RegistryView({
  onSearch,
  onSearchAll,
  onGetTags,
  onGetMetadata,
  onPull,
  onAddFavorite,
  onRemoveFavorite,
  favorites = [],
  onToast
}) {
  const [query, setQuery] = useState('');
  const [selectedRegistry, setSelectedRegistry] = useState('all'); // 'all' | 'dockerhub' | 'ghcr'
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  
  // Right panel detail view tabs
  const [detailTab, setDetailTab] = useState('overview'); // 'overview' | 'tags'
  const [metadata, setMetadata] = useState(null);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  
  const [tags, setTags] = useState([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [pullingTag, setPullingTag] = useState(null);
  const [tagFilter, setTagFilter] = useState('');
  const [copiedTag, setCopiedTag] = useState(null);
  const [copiedReadme, setCopiedReadme] = useState(false);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    try {
      setSearching(true);
      let res = [];
      if (selectedRegistry === 'all') {
        res = await onSearchAll(query.trim(), 1, 30);
      } else {
        res = await onSearch(selectedRegistry, query.trim(), 1, 30);
      }
      const sorted = (res || []).sort((a, b) => {
        if (a.isOfficial && !b.isOfficial) return -1;
        if (!a.isOfficial && b.isOfficial) return 1;
        const starsA = a.stars ?? a.starCount ?? 0;
        const starsB = b.stars ?? b.starCount ?? 0;
        return starsB - starsA;
      });
      setResults(sorted);
      setSelectedImage(null);
      setMetadata(null);
      setTags([]);
    } catch (err) {
      if (onToast) onToast(err.message || String(err), 'error', 'Search Failed');
      else alert(`Search failed: ${err}`);
    } finally {
      setSearching(false);
    }
  };

  const handleQuickSearch = (term) => {
    setQuery(term);
    setSearching(true);
    const searchPromise = selectedRegistry === 'all'
      ? onSearchAll(term, 1, 30)
      : onSearch(selectedRegistry, term, 1, 30);
    searchPromise
      .then(res => {
        const sorted = (res || []).sort((a, b) => {
          if (a.isOfficial && !b.isOfficial) return -1;
          if (!a.isOfficial && b.isOfficial) return 1;
          const starsA = a.stars ?? a.starCount ?? 0;
          const starsB = b.stars ?? b.starCount ?? 0;
          return starsB - starsA;
        });
        setResults(sorted);
        setSelectedImage(null);
      })
      .catch(err => {
        if (onToast) onToast(err.message || String(err), 'error', 'Search Failed');
      })
      .finally(() => setSearching(false));
  };

  const handleSelectImage = async (img) => {
    setSelectedImage(img);
    setMetadata(null);
    setDetailTab('overview');
    
    // Fetch tags and metadata in parallel
    setLoadingTags(true);
    setLoadingMetadata(true);

    onGetTags(img.registry, img.name)
      .then(fetchedTags => setTags(fetchedTags || []))
      .catch(err => {
        console.error("Error fetching tags:", err);
        setTags([]);
      })
      .finally(() => setLoadingTags(false));

    if (onGetMetadata) {
      onGetMetadata(img.registry, img.name)
        .then(meta => setMetadata(meta))
        .catch(err => {
          console.error("Error fetching metadata:", err);
          setMetadata(null);
        })
        .finally(() => setLoadingMetadata(false));
    } else {
      setLoadingMetadata(false);
    }
  };

  const handlePullImageTag = async (imageName, tagName) => {
    const fullRef = `${imageName}:${tagName}`;
    try {
      setPullingTag(tagName);
      await onPull(fullRef);
      if (onToast) onToast(`Successfully initiated pull for ${fullRef}`, 'success', 'Pull Started');
    } catch (err) {
      if (onToast) onToast(err.message || String(err), 'error', 'Pull Failed');
      else alert(`Failed to pull ${fullRef}: ${err}`);
    } finally {
      setPullingTag(null);
    }
  };

  const copyPullCommand = (tag = 'latest') => {
    if (!selectedImage) return;
    const cmd = `docker pull ${selectedImage.name}:${tag}`;
    navigator.clipboard.writeText(cmd);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const isFavorite = (name) => (favorites || []).includes(name);

  const toggleFavorite = async (name) => {
    if (isFavorite(name)) {
      await onRemoveFavorite(name);
    } else {
      await onAddFavorite(name);
    }
  };

  const filteredTags = (tags || []).filter(t => 
    !tagFilter || t.name.toLowerCase().includes(tagFilter.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900/60 overflow-hidden">
      {/* Search Header (Hidden on Image Details Page) */}
      {!selectedImage && (
        <div className="p-6 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Globe className="w-5 h-5 text-cyan-400" />
              Registry Hub
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Explore Docker Hub and GitHub Container Registry (GHCR), read official documentation, inspect tags, and pull images.
            </p>
          </div>

          {/* Search controls */}
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            {/* Registry Dropdown */}
            <div className="relative">
              <select
                value={selectedRegistry}
                onChange={(e) => setSelectedRegistry(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-8 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="all">All Registries</option>
                <option value="dockerhub">Docker Hub</option>
                <option value="ghcr">GitHub (GHCR)</option>
              </select>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search images (e.g. redis, postgres, node)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-64 md:w-80 font-mono transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={searching}
              className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-md shadow-cyan-500/20 disabled:opacity-50 transition-all whitespace-nowrap cursor-pointer"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>
      )}

      {/* Main Content Area */}
      {!selectedImage ? (
        /* Full-Page Search Results View */
        <div className="flex-1 overflow-y-auto p-4 md:p-6 min-w-0">
          {results.length === 0 ? (
            <div className="h-full min-h-[360px] border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-center p-8 text-slate-500 max-w-2xl mx-auto my-12">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h2 className="font-bold text-base text-slate-200">Discover OCI Container Images</h2>
              <p className="text-xs text-slate-400 max-w-md mt-1 mb-5">
                Explore Docker Hub and GitHub Container Registry. Select any image to read official README docs, inspect layer tags, and pull directly to your local engine.
              </p>

              {/* Popular quick searches */}
              <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg">
                <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mr-1">Popular:</span>
                {['redis', 'postgres', 'nginx', 'node', 'python', 'golang', 'alpine', 'ubuntu', 'mongodb'].map(kw => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => handleQuickSearch(kw)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-cyan-300 hover:text-cyan-200 border border-slate-800 transition cursor-pointer font-mono"
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <p className="text-xs text-slate-400">
                  Found <strong className="text-slate-200">{results.length}</strong> repositories matching <span className="text-cyan-400 font-mono">"{query}"</span>
                </p>
                <span className="text-[11px] text-slate-500">Click any card to view full documentation & tags</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((res) => {
                  const fav = isFavorite(res.name);
                  return (
                    <div
                      key={`${res.registry}-${res.name}`}
                      onClick={() => handleSelectImage(res)}
                      className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 hover:bg-slate-900 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/5 transition-all cursor-pointer flex flex-col justify-between group min-w-0"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0 flex-1">
                            <span 
                              className="font-bold text-slate-100 text-sm font-mono truncate block group-hover:text-cyan-300 transition-colors"
                              title={res.name}
                            >
                              {res.name}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(res.name);
                            }}
                            className="p-1 text-slate-500 hover:text-amber-400 transition-colors shrink-0 cursor-pointer"
                            title={fav ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <Star className={`w-4 h-4 ${fav ? 'text-amber-400 fill-amber-400' : ''}`} />
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                          {res.isOfficial && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1 shrink-0">
                              <ShieldCheck className="w-3 h-3" />
                              Official
                            </span>
                          )}
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 uppercase font-mono shrink-0">
                            {res.registry}
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-4">
                          {res.description || 'No description provided.'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-900 text-xs text-slate-500">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 text-amber-400 font-medium">
                            <Star className="w-3 h-3 fill-current" />
                            {formatCount(res.stars ?? res.starCount ?? 0)}
                          </span>
                          {(res.pullCount ?? 0) > 0 && (
                            <span>{formatCount(res.pullCount)} pulls</span>
                          )}
                        </div>
                        <span className="text-cyan-400 text-[11px] font-medium group-hover:underline flex items-center gap-1">
                          View Details &rarr;
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Full-Page Image Overview & Tags Workspace */
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-slate-950/20">
          {/* Repository Navigation Bar */}
          <div className="px-6 py-2.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700/80 transition cursor-pointer hover:text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
              <span>Back to Search Results</span>
            </button>

            <div className="text-xs text-slate-400 font-mono hidden sm:flex items-center gap-1.5">
              <span>Registry Hub</span>
              <span className="text-slate-600">/</span>
              <span className="text-cyan-400 font-bold">{selectedImage.name}</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              {/* Repository Header Banner */}
              <div className="p-4 md:p-6 border-b border-slate-800 bg-slate-900/60 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                    <h2 className="text-lg md:text-xl font-bold text-slate-100 font-mono truncate">{selectedImage.name}</h2>
                    {selectedImage.isOfficial && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1 shrink-0">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Official Image
                      </span>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase font-mono shrink-0">
                      {selectedImage.registry}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handlePullImageTag(selectedImage.name, 'latest')}
                      disabled={pullingTag === 'latest'}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-md shadow-cyan-500/20 transition-all cursor-pointer whitespace-nowrap"
                    >
                      <DownloadCloud className="w-3.5 h-3.5" />
                      <span>{pullingTag === 'latest' ? 'Pulling :latest...' : 'Pull :latest'}</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                  {metadata?.description || selectedImage.description}
                </p>

                {/* Docker Pull Command Banner */}
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono min-w-0">
                  <div className="flex items-center gap-2 text-slate-300 truncate min-w-0">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="text-slate-500 select-none">$</span>
                    <span className="truncate">docker pull {selectedImage.name}:latest</span>
                  </div>
                  <button
                    onClick={() => copyPullCommand('latest')}
                    className="p-1 text-slate-400 hover:text-cyan-400 transition-colors shrink-0 cursor-pointer"
                    title="Copy docker pull command"
                  >
                    {copiedTag === 'latest' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Sub-Tabs: Overview vs Tags */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => setDetailTab('overview')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                      detailTab === 'overview'
                        ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Overview & Docs</span>
                  </button>

                  <button
                    onClick={() => setDetailTab('tags')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                      detailTab === 'tags'
                        ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>Tags & Architectures ({tags.length})</span>
                  </button>
                </div>
              </div>

              {/* Tab 1: Overview & Documentation */}
              {detailTab === 'overview' && (
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 min-w-0">
                  {/* Metadata Stats Chips */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 min-w-0">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Stars</div>
                      <div 
                        className="text-xs sm:text-sm font-bold text-amber-400 flex items-center gap-1 mt-0.5 truncate"
                        title={`${(metadata?.starCount ?? selectedImage.stars ?? 0).toLocaleString()} stars`}
                      >
                        <Star className="w-3.5 h-3.5 fill-current shrink-0" />
                        <span className="truncate">{formatCount(metadata?.starCount ?? selectedImage.stars ?? 0)}</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 min-w-0">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Pulls</div>
                      <div 
                        className="text-xs sm:text-sm font-bold text-slate-200 mt-0.5 truncate"
                        title={`${(metadata?.pullCount ?? selectedImage.pullCount ?? 0).toLocaleString()} pulls`}
                      >
                        {(metadata?.pullCount ?? selectedImage.pullCount ?? 0) > 0 
                          ? `${formatCount(metadata?.pullCount ?? selectedImage.pullCount)}+`
                          : '10M+'}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 min-w-0">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Updated</div>
                      <div 
                        className="text-xs font-medium text-slate-300 mt-0.5 truncate"
                        title={metadata?.lastUpdated ? new Date(metadata.lastUpdated).toLocaleDateString() : 'Recent'}
                      >
                        {metadata?.lastUpdated ? new Date(metadata.lastUpdated).toLocaleDateString() : 'Recent'}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 min-w-0">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Provider</div>
                      <div 
                        className="text-xs font-semibold text-cyan-400 mt-0.5 uppercase truncate"
                        title={selectedImage.registry}
                      >
                        {selectedImage.registry}
                      </div>
                    </div>
                  </div>

                  {/* README / Markdown Documentation */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 md:p-5 overflow-hidden min-w-0">
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800 text-xs gap-2">
                      <span className="font-semibold text-slate-200 flex items-center gap-1.5 truncate">
                        <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span className="truncate">Repository Documentation</span>
                      </span>
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          onClick={() => {
                            const text = metadata?.fullDescription || selectedImage.description || '';
                            navigator.clipboard.writeText(text);
                            setCopiedReadme(true);
                            setTimeout(() => setCopiedReadme(false), 2000);
                          }}
                          className="text-slate-400 hover:text-cyan-400 flex items-center gap-1 text-[11px] transition-colors cursor-pointer"
                          title="Copy raw markdown text"
                        >
                          {copiedReadme ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedReadme ? 'Copied' : 'Copy MD'}</span>
                        </button>
                        {selectedImage.registry === 'dockerhub' && (
                          <a
                            href={`https://hub.docker.com/${selectedImage.isOfficial ? '_' : 'r'}/${selectedImage.name}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 hover:text-cyan-400 flex items-center gap-1 text-[11px] transition-colors"
                          >
                            <span className="hidden sm:inline">Docker Hub</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    {loadingMetadata ? (
                      <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                        <span className="text-xs">Fetching repository README and documentation...</span>
                      </div>
                    ) : (
                      <ReadmeViewer markdown={metadata?.fullDescription || selectedImage.description} />
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Available Tags & Pull */}
              {detailTab === 'tags' && (
                <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden min-w-0">
                  {/* Tag search filter */}
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Filter tags (e.g. alpine, 16, latest)..."
                        value={tagFilter}
                        onChange={(e) => setTagFilter(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">
                      Showing {filteredTags.length} of {tags.length} tags
                    </span>
                  </div>

                  {/* Tags list */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-w-0">
                    {loadingTags ? (
                      <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                        Fetching tags from registry...
                      </div>
                    ) : filteredTags.length === 0 ? (
                      <div className="p-8 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500">
                        No tags found matching &ldquo;{tagFilter}&rdquo;.
                      </div>
                    ) : (
                      filteredTags.map((t) => (
                        <div
                          key={t.name}
                          className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs hover:border-slate-700 transition-colors gap-2 min-w-0"
                        >
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0 truncate">
                            <span className="font-mono font-semibold text-cyan-300 truncate">{t.name}</span>
                            {t.size > 0 && (
                              <span className="text-[11px] text-slate-400 font-mono shrink-0">
                                {(t.size / 1024 / 1024).toFixed(1)} MB
                              </span>
                            )}
                            {t.lastUpdated && (
                              <span className="text-[11px] text-slate-500 hidden sm:flex items-center gap-1 shrink-0">
                                <Clock className="w-3 h-3" />
                                {new Date(t.lastUpdated).toLocaleDateString()}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => copyPullCommand(t.name)}
                              className="p-1.5 text-slate-400 hover:text-slate-200 rounded transition-colors"
                              title={`Copy docker pull ${selectedImage.name}:${t.name}`}
                            >
                              {copiedTag === t.name ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => handlePullImageTag(selectedImage.name, t.name)}
                              disabled={pullingTag === t.name}
                              className="flex items-center gap-1 px-3 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
                            >
                              <DownloadCloud className="w-3 h-3 text-cyan-400" />
                              <span>{pullingTag === t.name ? 'Pulling...' : 'Pull'}</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
      )}
    </div>
  );
}
