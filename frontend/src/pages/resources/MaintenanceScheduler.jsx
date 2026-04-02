import { useState, useEffect } from 'react';
import { resourcesApi } from '../../api/resources';
import { campusApi } from '../../api/campus';
import { Plus, Edit2, Trash2, Wrench, ChevronDown, Search } from 'lucide-react';

const PRIORITY_COLORS = { low: 'text-[#10B981]', medium: 'text-[#F59E0B]', high: 'text-[#EF4444]', critical: 'text-[#EF4444] animate-pulse' };
const STATUS_COLORS = { scheduled: 'text-[#2563EB]', in_progress: 'text-[#F59E0B]', completed: 'text-[#10B981]', cancelled: 'text-muted' };
const inputCls = 'w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]';
const blank = { resource: '', resource_code: '', title: '', maintenance_type: 'preventive', priority: 'medium', scheduled_date: '', assigned_to: '', status: 'scheduled', notes: '' };

export default function MaintenanceScheduler() {
  // List filters
  const [isViewAll, setIsViewAll] = useState(false);
  const [filterCampus, setFilterCampus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterResource, setFilterResource] = useState('');
  const [search, setSearch] = useState('');

  // Data
  const [schedules, setSchedules] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allAssets, setAllAssets] = useState([]);

  // Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [formCampus, setFormCampus] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [filteredFormAssets, setFilteredFormAssets] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load reference data
  useEffect(() => {
    campusApi.getCampuses().then(setCampuses);
    resourcesApi.getCategories().then(setCategories);
    resourcesApi.getAssets().then(setAllAssets);
  }, []);

  const fetchSchedules = async () => {
    setLoading(true);
    const p = {};
    if (filterCampus) p['resource__campus_id'] = filterCampus;
    if (filterCategory) p['resource__category_id'] = filterCategory;
    if (filterResource) p.resource_id = filterResource;
    if (search) p.search = search;
    setSchedules(await resourcesApi.getMaintenance(p));
    setLoading(false);
  };
  useEffect(() => { fetchSchedules(); }, [filterCampus, filterCategory, filterResource, search]);

  // Cascade form assets: filter by campus AND category
  useEffect(() => {
    let filtered = allAssets;
    if (formCampus) filtered = filtered.filter(a => String(a.campus) === String(formCampus));
    if (formCategory) filtered = filtered.filter(a => String(a.category) === String(formCategory));
    setFilteredFormAssets(filtered);
    setForm(f => ({ ...f, resource: '', resource_code: '' }));
  }, [formCampus, formCategory, allAssets]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-fetch resource code when resource is selected
  const handleResourceSelect = (resourceId) => {
    const asset = allAssets.find(a => a.id === resourceId);
    setForm(f => ({ ...f, resource: resourceId, resource_code: asset?.resource_code || '' }));
  };

  const openCreate = () => {
    setEditing(null); setForm(blank); setFormCampus(''); setFormCategory(''); setIsModalOpen(true);
  };
  const openEdit = (s) => {
    setEditing(s);
    const asset = allAssets.find(a => a.id === s.resource);
    setFormCampus(asset?.campus || '');
    setFormCategory(asset?.category || '');
    setForm({ ...s, resource_code: s.resource_code || '' });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form };
      delete payload.resource_code; // read-only, not sent
      if (editing) await resourcesApi.updateMaintenance(editing.id, payload);
      else await resourcesApi.createMaintenance(payload);
      setIsModalOpen(false); setEditing(null); fetchSchedules();
    } catch { alert('Save failed.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete schedule?')) return;
    await resourcesApi.deleteMaintenance(id); fetchSchedules();
  };

  const displayedSchedules = isViewAll ? schedules : schedules.slice(0, 10);
  const hasFilters = filterCampus || filterCategory || filterResource || search;

  // Filter options for list filter dropdowns
  const filterAssets = allAssets
    .filter(a => !filterCampus || String(a.campus) === String(filterCampus))
    .filter(a => !filterCategory || String(a.category) === String(filterCategory));

  // Category dropdown for form should only show categories having assets in the selected campus
  const formCategories = formCampus
    ? categories.filter(c => allAssets.some(a => String(a.campus) === String(formCampus) && String(a.category) === String(c.id)))
    : categories;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Maintenance Scheduler</h2>
          <p className="text-muted mt-1">Plan preventive, corrective, and calibration maintenance</p>
        </div>
        <button onClick={openCreate} className="bg-[var(--primary)] hover:brightness-90 text-[#0F172A] px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2">
          <Plus className="w-5 h-5" /> Schedule Maintenance
        </button>
      </div>

      {/* List Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="bg-background border border-border pl-9 pr-4 py-2 text-foreground text-sm rounded-xl focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] w-48" />
        </div>
        <select value={filterCampus} onChange={e => { setFilterCampus(e.target.value); setFilterCategory(''); setFilterResource(''); }} className="bg-background border border-border px-4 py-2 text-foreground text-sm rounded-xl">
          <option value="">All Campuses</option>
          {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setFilterResource(''); }} className="bg-background border border-border px-4 py-2 text-foreground text-sm rounded-xl">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterResource} onChange={e => setFilterResource(e.target.value)} className="bg-background border border-border px-4 py-2 text-foreground text-sm rounded-xl">
          <option value="">All Resources</option>
          {filterAssets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        {hasFilters && <button onClick={() => { setFilterCampus(''); setFilterCategory(''); setFilterResource(''); setSearch(''); }} className="text-xs text-muted hover:text-foreground px-3">Clear Filters</button>}
      </div>

      <div className="bg-background border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface/50 text-muted text-xs uppercase tracking-wider">
              <th className="px-6 py-4">Resource</th>
              <th className="px-6 py-4">Issue Title</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Priority</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1B2A4A]">
            {loading ? <tr><td colSpan="7" className="text-center py-8 text-muted">Loading...</td></tr>
              : displayedSchedules.length === 0 ? <tr><td colSpan="7" className="text-center py-8 text-muted">No maintenance schedules.</td></tr>
              : displayedSchedules.map(s => (
                <tr key={s.id} className="hover:bg-surface/30">
                  <td className="px-6 py-4 text-foreground font-medium">
                    <div>{s.resource_name}</div>
                    <div className="text-xs font-mono text-muted">{s.resource_code}</div>
                    {s.category_name && <div className="text-xs text-[#8B5CF6]">{s.category_name}</div>}
                  </td>
                  <td className="px-6 py-4 text-muted">{s.title}<br />{s.assigned_to && <span className="text-xs text-muted">{s.assigned_to}</span>}</td>
                  <td className="px-6 py-4"><span className="bg-[#2563EB]/10 text-[#2563EB] px-2 py-1 rounded text-xs capitalize">{s.maintenance_type}</span></td>
                  <td className="px-6 py-4 text-sm text-muted">{s.scheduled_date}</td>
                  <td className="px-6 py-4 text-xs font-bold uppercase">
                    <span className={PRIORITY_COLORS[s.priority] || 'text-muted'}>{s.priority}</span>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold uppercase">
                    <span className={STATUS_COLORS[s.status] || 'text-muted'}>{s.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEdit(s)} className="text-muted hover:text-[var(--primary)] mx-2"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(s.id)} className="text-muted hover:text-[#EF4444]"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!isViewAll && schedules.length > 10 && (
        <div className="flex justify-center">
          <button onClick={() => setIsViewAll(true)} className="bg-surface border border-border text-[var(--primary)] px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2">
            <ChevronDown className="w-4 h-4" /> View All Schedules ({schedules.length})
          </button>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-surface flex justify-between items-center">
              <h3 className="text-xl font-bold text-foreground flex gap-2"><Wrench className="text-[#F59E0B]" /> {editing ? 'Edit Schedule' : 'New Maintenance Task'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-foreground text-xl">✕</button>
            </div>
            <form id="mntForm" onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">

              {/* Dependent: Campus → Category → Resource */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted uppercase">Campus</label>
                  <select value={formCampus} onChange={e => setFormCampus(e.target.value)} className={inputCls}>
                    <option value="">Select Campus...</option>
                    {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted uppercase">Resource Category</label>
                  <select value={formCategory} onChange={e => setFormCategory(e.target.value)} className={inputCls} disabled={!formCampus}>
                    <option value="">{formCampus ? 'Select Category...' : 'Select a Campus first'}</option>
                    {formCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted uppercase">Resource <span className="text-[#EF4444]">*</span></label>
                <select required value={form.resource} onChange={e => handleResourceSelect(e.target.value)} className={inputCls} disabled={!formCategory}>
                  <option value="">{formCategory ? 'Select Resource...' : 'Select a Category first'}</option>
                  {filteredFormAssets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              {form.resource_code && (
                <div className="bg-[var(--primary)]/10 border border-[#22D3EE]/30 rounded-xl px-4 py-2 flex items-center gap-3">
                  <span className="text-xs text-muted uppercase font-bold">Resource Code</span>
                  <span className="text-[var(--primary)] font-mono font-bold">{form.resource_code}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-muted uppercase">Issue Title <span className="text-[#EF4444]">*</span></label>
                <input required value={form.title} onChange={e => set('title', e.target.value)} className={inputCls} placeholder="Describe the issue..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted uppercase">Type</label>
                  <select value={form.maintenance_type} onChange={e => set('maintenance_type', e.target.value)} className={inputCls}>
                    {['preventive', 'corrective', 'calibration', 'inspection'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted uppercase">Priority</label>
                  <select value={form.priority} onChange={e => set('priority', e.target.value)} className={inputCls}>
                    {['low', 'medium', 'high', 'critical'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted uppercase">Scheduled Date <span className="text-[#EF4444]">*</span></label>
                  <input type="date" required value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted uppercase">Status</label>
                  <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
                    {['scheduled', 'in_progress', 'completed', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted uppercase">Assigned To</label>
                <input value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} placeholder="Name, role, or team" className={inputCls} />
              </div>

              <div>
                <label className="text-xs font-bold text-muted uppercase">Description</label>
                <textarea rows="2" value={form.notes} onChange={e => set('notes', e.target.value)} className={inputCls} placeholder="Additional notes or description..." />
              </div>
            </form>
            <div className="p-4 border-t border-border bg-surface flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-muted hover:text-foreground">Cancel</button>
              <button type="submit" form="mntForm" disabled={saving} className="bg-[var(--primary)] text-[#0F172A] px-6 py-2.5 rounded-xl font-bold">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
