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
  RefreshCw
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
  favorites = []
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
  const [copiedCmd, setCopiedCmd] = useState(false);
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
      alert(`Search failed: ${err}`);
    } finally {
      setSearching(false);
    }
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
      alert(`Successfully initiated pull for ${fullRef}`);
    } catch (err) {
      alert(`Failed to pull ${fullRef}: ${err}`);
    } finally {
      setPullingTag(null);
    }
  };

  const copyPullCommand = (tag = 'latest') => {
    if (!selectedImage) return;
    const cmd = `docker pull ${selectedImage.name}:${tag}`;
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
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
      {/* Search Header */}
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-w-0">
        {/* Left Side: Results List */}
        <div className="w-full md:w-5/12 border-b md:border-b-0 md:border-r border-slate-800 overflow-y-auto p-4 md:p-6 space-y-3 min-w-0">
          {results.length === 0 ? (
            <div className="h-64 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <Search className="w-8 h-8 text-slate-600 mb-2" />
              <p className="font-medium text-sm text-slate-400">Search for OCI images</p>
              <p className="text-xs mt-1">Explore popular containers like postgres, nginx, redis, or python.</p>
            </div>
          ) : (
            results.map((res) => {
              const isSelected = selectedImage?.name === res.name && selectedImage?.registry === res.registry;
              const fav = isFavorite(res.name);
              return (
                <div
                  key={`${res.registry}-${res.name}`}
                  onClick={() => handleSelectImage(res)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-900 border-cyan-500/60 shadow-md shadow-cyan-500/10'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-100 text-sm truncate">{res.name}</span>
                        {res.isOfficial && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1 shrink-0 whitespace-nowrap">
                            <ShieldCheck className="w-3 h-3" />
                            Official
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 uppercase font-mono shrink-0 whitespace-nowrap">
                          {res.registry}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {res.description || 'No description provided.'}
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(res.name);
                      }}
                      className="p-1 text-slate-500 hover:text-amber-400 transition-colors shrink-0"
                      title={fav ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star className={`w-4 h-4 ${fav ? 'text-amber-400 fill-amber-400' : ''}`} />
                    </button>
                  </div>

                  <div className="flex items-center gap-4 mt-3 pt-2 border-t border-slate-900 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-500" />
                      {formatCount(res.stars ?? res.starCount ?? 0)} stars
                    </span>
                    {(res.pullCount ?? 0) > 0 && (
                      <span>{formatCount(res.pullCount)} pulls</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Side: Image Overview & Tags Workspace */}
        <div className="w-full md:w-7/12 flex flex-col overflow-hidden bg-slate-950/40 min-w-0">
          {!selectedImage ? (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center text-slate-500 p-8">
              <Layers className="w-10 h-10 text-slate-700 mb-3" />
              <p className="text-sm font-semibold text-slate-300">Select an image repository</p>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Select any image on the left to read its full documentation overview, run instructions, and inspect available tags.
              </p>
            </div>
          ) : (
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
                    {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
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
                              <Copy className="w-3.5 h-3.5" />
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
          )}
        </div>
      </div>
    </div>
  );
}
