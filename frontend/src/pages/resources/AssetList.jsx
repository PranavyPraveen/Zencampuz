import { useState, useEffect } from 'react';
import { resourcesApi } from '../../api/resources';
import { campusApi } from '../../api/campus';
import { academicsApi } from '../../api/academics';
import { Plus, Edit2, Trash2, Upload, Package, Search, ChevronDown, AlertTriangle } from 'lucide-react';
import AssetFormModal from '../../components/resources/AssetFormModal';
import { useNavigate } from 'react-router-dom';

export default function AssetList() {
  const [isViewAll, setIsViewAll] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterCampus, setFilterCampus] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [buildings, setBuildings] = useState([]);

  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const navigate = useNavigate();

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const p = {};
      if (filterCategory) p.category_id = filterCategory;
      if (filterCampus) p.campus_id = filterCampus;
      if (filterBuilding) p.building_id = filterBuilding;
      if (filterStatus) p.status = filterStatus;
      if (search) p.search = search;
      setAssets(await resourcesApi.getAssets(p));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    resourcesApi.getCategories().then(setCategories);
    campusApi.getCampuses().then(setCampuses);
    campusApi.getBuildings().then(setBuildings);
  }, []);

  useEffect(() => { fetchAssets(); }, [filterCategory, filterCampus, filterBuilding, filterStatus, search]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this resource?')) return;
    try { await resourcesApi.deleteAsset(id); fetchAssets(); }
    catch { alert('Delete failed.'); }
  };

  const statusColor = (s, m) => {
    if (m) return 'text-[#F59E0B]';
    switch (s) {
      case 'available': return 'text-[#10B981]';
      case 'in_use': return 'text-[#2563EB]';
      case 'maintenance': return 'text-[#F59E0B]';
      case 'retired': return 'text-muted';
      default: return 'text-muted';
    }
  };

  const displayedAssets = isViewAll ? assets : assets.slice(0, 10);
  const filteredBuildings = filterCampus
    ? buildings.filter(b => String(b.campus) === String(filterCampus))
    : buildings;

  const clearFilters = () => {
    setFilterCategory(''); setFilterCampus(''); setFilterBuilding('');
    setFilterStatus(''); setSearch('');
  };
  const hasFilters = filterCategory || filterCampus || filterBuilding || filterStatus || search;

  const selectedCampusObj = filterCampus ? campuses.find(c => String(c.id) === String(filterCampus)) : null;
  const selectedCampusIsInactive = selectedCampusObj && selectedCampusObj.status !== 'active';
  const campusStatusLabel = selectedCampusObj ? { active: 'Active', inactive: 'Inactive', maintenance: 'Under Maintenance' }[selectedCampusObj.status] || selectedCampusObj.status : '';

  const campusOptionLabel = (c) => {
    if (c.status === 'inactive') return `${c.name} — Inactive`;
    if (c.status === 'maintenance') return `${c.name} — Maintenance`;
    return c.name;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Assets & Equipment</h2>
          <p className="text-muted mt-1">Manage all bookable resources, instruments, and equipment</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => navigate('/resources/bulk-upload')} 
            disabled={selectedCampusIsInactive}
            title={selectedCampusIsInactive ? `Cannot upload to an ${campusStatusLabel.toLowerCase()} campus` : 'Bulk Upload'}
            className={`border px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all ${selectedCampusIsInactive ? 'bg-surface/10 border-border/30 text-muted cursor-not-allowed opacity-50' : 'bg-surface border-[#2563EB]/30 text-[var(--primary)] hover:bg-[#243558]'}`}
          >
            <Upload className="w-5 h-5" /> Bulk Upload
          </button>
          <button 
            onClick={() => { if (!selectedCampusIsInactive) { setEditing(null); setIsModalOpen(true); } }} 
            disabled={selectedCampusIsInactive}
            title={selectedCampusIsInactive ? `Cannot add assets to an ${campusStatusLabel.toLowerCase()} campus` : 'Add Asset'}
            className={`px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all ${selectedCampusIsInactive ? 'bg-[var(--primary)]/30 text-[#0F172A]/50 cursor-not-allowed opacity-50' : 'bg-[var(--primary)] hover:brightness-90 text-[#0F172A]'}`}
          >
            <Plus className="w-5 h-5" /> Add Asset
          </button>
        </div>
      </div>

      {selectedCampusIsInactive && (
        <div className="flex items-start gap-3 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-xl px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
          <div>
            <p className="text-[#F59E0B] font-semibold text-sm">
              {selectedCampusObj.name} is currently <span className="uppercase">{campusStatusLabel}</span>
            </p>
            <p className="text-muted text-xs mt-0.5">
              This campus is not operational. No assets can be added here. Existing assets are shown for reference only.
            </p>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets..." className="bg-background border border-border pl-9 pr-4 py-2 text-foreground text-sm rounded-xl focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] w-52" />
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-background border border-border px-4 py-2 text-foreground text-sm rounded-xl focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterCampus} onChange={e => { setFilterCampus(e.target.value); setFilterBuilding(''); }} className={`bg-background border border-border px-4 py-2 text-sm rounded-xl focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] ${selectedCampusIsInactive ? 'border-[#F59E0B]/50 text-[#F59E0B]' : 'text-foreground'}`}>
          <option value="">All Campuses</option>
          {campuses.filter(c => c.status === 'active').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          {campuses.filter(c => c.status !== 'active').length > 0 && <option disabled>── Inactive / Maintenance ──</option>}
          {campuses.filter(c => c.status !== 'active').map(c => <option key={c.id} value={c.id}>{campusOptionLabel(c)}</option>)}
        </select>
        <select value={filterBuilding} onChange={e => setFilterBuilding(e.target.value)} className="bg-background border border-border px-4 py-2 text-foreground text-sm rounded-xl focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]">
          <option value="">All Buildings</option>
          {filteredBuildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-background border border-border px-4 py-2 text-foreground text-sm rounded-xl focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]">
          <option value="">All Statuses</option>
          <option value="available">Available</option>
          <option value="in_use">In Use</option>
          <option value="maintenance">Maintenance</option>
          <option value="retired">Retired</option>
        </select>
        {hasFilters && <button onClick={clearFilters} className="text-xs text-muted hover:text-foreground px-3">Clear Filters</button>}
      </div>

      {/* Table */}
      <div className="bg-background border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface/50 text-muted text-xs uppercase tracking-wider">
              <th className="px-6 py-4 w-16">Sl. No.</th>
              <th className="px-6 py-4">Resource</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Campus / Location</th>
              <th className="px-6 py-4">Qty</th>
              <th className="px-6 py-4">Bookable</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1B2A4A]">
            {loading ? (
              <tr><td colSpan="8" className="text-center py-8 text-muted">Loading...</td></tr>
            ) : displayedAssets.length === 0 ? (
              <tr><td colSpan="8" className="text-center py-8 text-muted">No assets found.</td></tr>
            ) : displayedAssets.map((a, idx) => (
              <tr key={a.id} className="hover:bg-surface/30 text-foreground">
                <td className="px-6 py-4 text-muted text-sm font-semibold">{idx + 1}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#2563EB]/10 rounded-lg"><Package className="text-[#2563EB] w-4 h-4" /></div>
                    <div>
                      <div className="font-bold text-foreground">{a.name}</div>
                      <div className="text-xs font-mono text-muted">{a.resource_code}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20 px-2 py-1 rounded text-xs">{a.category_name}</span>
                </td>
                <td className="px-6 py-4 text-sm text-muted">
                  {a.campus_name && <div className="text-xs text-[var(--primary)]">{a.campus_name}{a.building_name && ` / ${a.building_name}`}</div>}
                  {a.room_name || a.department || (!a.campus_name && <span className="text-muted">Unassigned</span>)}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className="text-[#10B981] font-bold">{a.quantity_available}</span>
                  <span className="text-muted">/{a.quantity_total}</span>
                  <div className="text-muted text-xs">{a.unit_type}</div>
                </td>
                <td className="px-6 py-4 text-xs text-muted">
                  {a.bookable_as_whole && <div>As Whole</div>}
                  {a.bookable_per_unit && <div className="text-[var(--primary)]">Per Unit ({a.sub_unit_count})</div>}
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs font-bold uppercase ${statusColor(a.status, a.under_maintenance)}`}>
                    {a.under_maintenance ? 'Maintenance' : a.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => { setEditing(a); setIsModalOpen(true); }} className="text-muted hover:text-[var(--primary)] mx-2"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(a.id)} className="text-muted hover:text-[#EF4444]"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isViewAll && assets.length > 10 && (
        <div className="flex justify-center">
          <button onClick={() => setIsViewAll(true)} className="bg-surface hover:bg-surface/80 border border-border text-[var(--primary)] px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2">
            <ChevronDown className="w-4 h-4" /> View All Assets ({assets.length})
          </button>
        </div>
      )}

      {isModalOpen && <AssetFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchAssets} initialData={editing} />}
    </div>
  );
}
