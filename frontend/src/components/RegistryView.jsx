import React, { useState } from 'react';
import { 
  Globe, 
  Search, 
  DownloadCloud, 
  Star, 
  ShieldCheck, 
  ExternalLink,
  Layers,
  Tag,
  CheckCircle2,
  Bookmark
} from 'lucide-react';

export default function RegistryView({
  onSearch,
  onSearchAll,
  onGetTags,
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
  const [tags, setTags] = useState([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [pullingTag, setPullingTag] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    try {
      setSearching(true);
      let res = [];
      if (selectedRegistry === 'all') {
        res = await onSearchAll(query.trim(), 25, 1);
      } else {
        res = await onSearchRegistry(selectedRegistry, query.trim(), 25, 1);
      }
      setResults(res || []);
      setSelectedImage(null);
      setTags([]);
    } catch (err) {
      alert(`Search failed: ${err}`);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectImage = async (img) => {
    setSelectedImage(img);
    try {
      setLoadingTags(true);
      const fetchedTags = await onGetTags(img.registry, img.name);
      setTags(fetchedTags || []);
    } catch (err) {
      console.error(err);
      setTags([]);
    } finally {
      setLoadingTags(false);
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

  const isFavorite = (name) => (favorites || []).includes(name);

  const toggleFavorite = async (name) => {
    if (isFavorite(name)) {
      await onRemoveFavorite(name);
    } else {
      await onAddFavorite(name);
    }
  };

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
            Search Docker Hub and GitHub Container Registry (GHCR), discover official images, tags, and pull instantly.
          </p>
        </div>

        {/* Search controls */}
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <select
            value={selectedRegistry}
            onChange={(e) => setSelectedRegistry(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Registries</option>
            <option value="dockerhub">Docker Hub</option>
            <option value="ghcr">GitHub (GHCR)</option>
          </select>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search images (e.g. postgres, redis, node)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-72 font-mono transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={searching}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 text-xs font-bold shadow-md shadow-cyan-500/20 hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Results List */}
        <div className="w-1/2 border-r border-slate-800 overflow-y-auto p-6 space-y-3">
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
                      ? 'bg-slate-900 border-cyan-500/50 shadow-md shadow-cyan-500/5'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100 text-sm">{res.name}</span>
                        {res.isOfficial && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Official
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 uppercase font-mono">
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
                      className="p-1 text-slate-500 hover:text-amber-400 transition-colors"
                      title={fav ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star className={`w-4 h-4 ${fav ? 'text-amber-400 fill-amber-400' : ''}`} />
                    </button>
                  </div>

                  <div className="flex items-center gap-4 mt-3 pt-2 border-t border-slate-900 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-500" />
                      {res.starCount || 0} stars
                    </span>
                    {res.pullCount > 0 && (
                      <span>{res.pullCount.toLocaleString()} pulls</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Side: Image Details & Tag Browser */}
        <div className="w-1/2 overflow-y-auto p-6 bg-slate-950/40">
          {!selectedImage ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
              <Layers className="w-8 h-8 text-slate-700 mb-2" />
              <p className="text-sm font-medium text-slate-400">Select an image</p>
              <p className="text-xs mt-1">Click any image on the left to inspect tags and pull layers directly.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Detailed Card */}
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-100">{selectedImage.name}</h2>
                  <button
                    onClick={() => handlePullImageTag(selectedImage.name, 'latest')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 text-xs font-bold hover:brightness-110 shadow-md shadow-cyan-500/20"
                  >
                    <DownloadCloud className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Pull :latest</span>
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2">{selectedImage.description}</p>
              </div>

              {/* Tag Browser */}
              <div>
                <h3 className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-3 flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-cyan-400" />
                  Available Tags ({tags.length})
                </h3>

                {loadingTags ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    Fetching registry tags...
                  </div>
                ) : tags.length === 0 ? (
                  <div className="p-6 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500">
                    No explicit tags returned from registry API. You can still pull directly with :latest.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tags.map((t) => (
                      <div
                        key={t.name}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-cyan-300">{t.name}</span>
                          {t.size > 0 && (
                            <span className="text-[11px] text-slate-500 font-mono">
                              {(t.size / 1024 / 1024).toFixed(1)} MB
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => handlePullImageTag(selectedImage.name, t.name)}
                          disabled={pullingTag === t.name}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs transition-colors disabled:opacity-50"
                        >
                          <DownloadCloud className="w-3 h-3 text-cyan-400" />
                          <span>{pullingTag === t.name ? 'Pulling...' : 'Pull'}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
