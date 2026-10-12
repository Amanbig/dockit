import React, { useState } from 'react';
import { 
  Network as NetworkIcon, 
  Trash2, 
  Plus, 
  Info, 
  Search, 
  Link2, 
  Unlink
} from 'lucide-react';

export default function NetworksView({
  networks = [],
  loading,
  onRefresh,
  onCreate,
  onRemove,
  onInspect
}) {
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    driver: 'bridge',
    internal: false,
    attachable: true
  });

  const filtered = networks.filter(n => 
    (n.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (n.driver || '').toLowerCase().includes(search.toLowerCase()) ||
    (n.id || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    await onCreate({
      name: form.name.trim(),
      driver: form.driver,
      internal: form.internal,
      attachable: form.attachable
    });
    setForm({ name: '', driver: 'bridge', internal: false, attachable: true });
    setShowCreateModal(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900/60 overflow-hidden">
      {/* Action Header */}
      <div className="p-6 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Networks</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Bridge, host, overlay, and internal virtual networks connecting containers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search networks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-56 transition-colors"
            />
          </div>

          {/* Create Network button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg text-xs shadow-md shadow-cyan-500/20 transition-all"
          >
            <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
            <span>Create Network</span>
          </button>
        </div>
      </div>

      {/* Main Networks Table */}
      <div className="flex-1 overflow-auto p-6">
        {filtered.length === 0 ? (
          <div className="h-64 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <NetworkIcon className="w-8 h-8 text-slate-600 mb-2" />
            <p className="font-medium text-sm text-slate-400">No networks found</p>
            <p className="text-xs mt-1">Create an isolated bridge network to connect your services.</p>
          </div>
        ) : (
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 shadow-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                  <th className="py-3 px-4">Network Name</th>
                  <th className="py-3 px-4">Driver</th>
                  <th className="py-3 px-4">Scope</th>
                  <th className="py-3 px-4">Network ID</th>
                  <th className="py-3 px-4">Subnet</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filtered.map((n) => {
                  const shortId = (n.id || '').substring(0, 12);
                  const isDefault = ['bridge', 'host', 'none'].includes(n.name);
                  return (
                    <tr key={n.id} className="hover:bg-slate-900/50 transition-colors group">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-100 group-hover:text-cyan-400 transition-colors">
                            {n.name}
                          </span>
                          {isDefault && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                              system
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                          {n.driver || 'bridge'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {n.scope || 'local'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {shortId}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {n.ipam?.config?.[0]?.subnet || '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onInspect(n.id)}
                            title="Inspect Network"
                            className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                          {!isDefault && (
                            <button
                              onClick={() => onRemove(n.id)}
                              title="Delete Network"
                              className="p-1.5 text-rose-400 hover:bg-rose-400/10 rounded-md transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Network Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <NetworkIcon className="w-4 h-4 text-cyan-400" />
                Create New Network
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Network Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. app-network, backend-net"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Driver</label>
                <select
                  value={form.driver}
                  onChange={(e) => setForm({ ...form, driver: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="bridge">bridge</option>
                  <option value="overlay">overlay</option>
                  <option value="macvlan">macvlan</option>
                  <option value="ipvlan">ipvlan</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="internal"
                  checked={form.internal}
                  onChange={(e) => setForm({ ...form, internal: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0"
                />
                <label htmlFor="internal" className="text-slate-300">
                  Internal (restrict external internet access)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="attachable"
                  checked={form.attachable}
                  onChange={(e) => setForm({ ...form, attachable: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0"
                />
                <label htmlFor="attachable" className="text-slate-300">
                  Attachable (allow manual container attachment)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold hover:brightness-110"
                >
                  Create Network
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
