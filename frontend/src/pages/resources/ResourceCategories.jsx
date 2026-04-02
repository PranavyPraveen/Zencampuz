import { useState, useEffect } from 'react';
import { resourcesApi } from '../../api/resources';
import { Plus, Edit2, Trash2, Tag, Search } from 'lucide-react';
import CategoryFormModal from '../../components/resources/CategoryFormModal';

const ALL_TYPES = [
  { value: 'equipment', label: 'Equipment' },
  { value: 'lab_instrument', label: 'Lab Instrument' },
  { value: 'sports', label: 'Sports Equipment' },
  { value: 'research', label: 'Research Tool' },
  { value: 'it_asset', label: 'IT Asset' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'av_equipment', label: 'AV Equipment' },
  { value: 'other', label: 'Other' },
];

export default function ResourceCategories() {
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const p = {};
      if (filterType) p.category_type = filterType;
      if (search) p.search = search;
      setCategories(await resourcesApi.getCategories(p));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCategories(); }, [filterType, search]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category? All associated resources will be affected.')) return;
    try { await resourcesApi.deleteCategory(id); fetchCategories(); }
    catch { alert('Delete failed. Category may have associated resources.'); }
  };

  const TYPE_COLORS = {
    equipment: '#2563EB', lab_instrument: '#8B5CF6', sports: '#10B981',
    research: '#22D3EE', it_asset: '#F59E0B', furniture: '#64748B',
    av_equipment: '#EF4444', other: '#CBD5E1',
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Resource Categories</h2>
          <p className="text-muted mt-1">Classify assets, instruments, and equipment types</p>
        </div>
        <button onClick={() => { setEditing(null); setIsModalOpen(true); }}
          className="bg-[var(--primary)] hover:brightness-90 text-[#0F172A] px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2">
          <Plus className="w-5 h-5" /> Add Category
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search categories..." className="bg-background border border-border pl-9 pr-4 py-2 text-foreground text-sm rounded-xl focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] w-56" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-background border border-border px-4 py-2 text-foreground text-sm rounded-xl focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]">
          <option value="">All Types</option>
          {ALL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {(filterType || search) && <button onClick={() => { setFilterType(''); setSearch(''); }} className="text-xs text-muted hover:text-foreground px-3">Clear Filters</button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? <div className="col-span-3 text-center py-12 text-muted">Loading...</div>
          : categories.length === 0
            ? <div className="col-span-3 text-center py-12 text-muted">No categories yet.</div>
            : categories.map(cat => (
              <div key={cat.id} className="bg-background border border-border rounded-2xl p-6 flex flex-col gap-3 hover:border-[#22D3EE]/30 transition-all group">
                <div className="flex justify-between items-start">
                  <div className="p-3 rounded-xl" style={{ backgroundColor: `${TYPE_COLORS[cat.category_type] || '#64748B'}15` }}>
                    <Tag style={{ color: TYPE_COLORS[cat.category_type] || '#64748B' }} className="w-6 h-6" />
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditing(cat); setIsModalOpen(true); }} className="text-muted hover:text-[var(--primary)]"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(cat.id)} className="text-muted hover:text-[#EF4444]"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div>
                  <h3 className="text-foreground font-bold text-lg">{cat.name}</h3>
                  <p className="text-muted text-xs uppercase tracking-widest mt-1">{cat.category_type.replace('_', ' ')}</p>
                  {cat.description && <p className="text-muted text-sm mt-2 line-clamp-2">{cat.description}</p>}
                </div>
                <div className="mt-auto pt-3 border-t border-border">
                  <span className="text-[var(--primary)] font-bold">{cat.resource_count}</span>
                  <span className="text-muted text-sm"> resources</span>
                </div>
              </div>
            ))
        }
      </div>

      {isModalOpen && <CategoryFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchCategories} initialData={editing} />}
    </div>
  );
}
