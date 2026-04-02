import { useState, useEffect } from 'react';
import { resourcesApi } from '../../api/resources';
import { Plus, Edit2, Trash2, Cpu } from 'lucide-react';

const STATUS_OPTS = ['available', 'in_use', 'reserved', 'maintenance'];

export default function SubUnitList() {
  const [units, setUnits] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterResource, setFilterResource] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ resource: '', unit_label: '', status: 'available', notes: '' });
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [u, a] = await Promise.all([resourcesApi.getSubUnits(filterResource ? { resource: filterResource } : {}), resourcesApi.getAssets()]);
    setUnits(u); setAssets(a); setLoading(false);
  };
  useEffect(() => { fetchAll(); }, [filterResource]);

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) await resourcesApi.updateSubUnit(editing.id, form);
      else await resourcesApi.createSubUnit(form);
      setShowForm(false); setEditing(null); setForm({ resource: '', unit_label: '', status: 'available', notes: '' });
      fetchAll();
    } catch { alert('Save failed.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this unit?')) return;
    await resourcesApi.deleteSubUnit(id); fetchAll();
  };

  const statusColor = (s) => ({ available: 'text-[#10B981]', in_use: 'text-[#2563EB]', reserved: 'text-[#F59E0B]', maintenance: 'text-[#EF4444]' }[s] || 'text-muted');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Sub-Resource Units</h2>
          <p className="text-muted mt-1">Individual bookable units — seats, systems, instruments per resource</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ resource: '', unit_label: '', status: 'available', notes: '' }); setShowForm(true); }} className="bg-[var(--primary)] hover:brightness-90 text-[#0F172A] px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2">
          <Plus className="w-5 h-5" /> Add Unit
        </button>
      </div>

      <div className="flex gap-3">
        <select value={filterResource} onChange={e => setFilterResource(e.target.value)} className="bg-background border border-border px-4 py-2.5 rounded-xl text-foreground text-sm">
          <option value="">All Resources</option>
          {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {showForm && (
        <div className="bg-surface/30 border border-[#22D3EE]/20 p-6 rounded-2xl">
          <h4 className="text-foreground font-bold mb-4">{editing ? 'Edit Unit' : 'New Sub-Unit'}</h4>
          <form id="suForm" onSubmit={handleSave} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold text-muted uppercase">Parent Resource</label>
              <select required value={form.resource} onChange={e => setForm({ ...form, resource: e.target.value })} className="w-full mt-1 bg-background border border-border px-3 py-2 rounded-xl text-foreground text-sm">
                <option value="">Select Resource</option>
                {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted uppercase">Unit Label</label>
              <input required value={form.unit_label} onChange={e => setForm({ ...form, unit_label: e.target.value })} placeholder="e.g. System-03" className="w-full mt-1 bg-background border border-border px-3 py-2 rounded-xl text-foreground text-sm font-mono" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted uppercase">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full mt-1 bg-background border border-border px-3 py-2 rounded-xl text-foreground text-sm">
                {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" disabled={saving} className="flex-1 bg-[var(--primary)] text-[#0F172A] py-2 rounded-xl font-bold text-sm">{saving ? '...' : 'Save'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 text-muted hover:text-foreground text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-background border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface/50 text-muted text-xs uppercase tracking-wider">
              <th className="px-6 py-4">Unit</th>
              <th className="px-6 py-4">Resource</th>
              <th className="px-6 py-4">Code</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1B2A4A]">
            {loading ? <tr><td colSpan="5" className="text-center py-8 text-muted">Loading...</td></tr>
              : units.length === 0 ? <tr><td colSpan="5" className="text-center py-8 text-muted">No units found.</td></tr>
              : units.map(u => (
                <tr key={u.id} className="hover:bg-surface/30">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="p-2 bg-[#8B5CF6]/10 rounded-lg"><Cpu className="text-[#8B5CF6] w-4 h-4" /></div>
                    <span className="text-foreground font-mono font-bold">{u.unit_label}</span>
                  </td>
                  <td className="px-6 py-4 text-muted">{u.resource_name}</td>
                  <td className="px-6 py-4 text-muted font-mono text-xs">{u.resource_code}</td>
                  <td className="px-6 py-4"><span className={`text-xs font-bold uppercase ${statusColor(u.status)}`}>{u.status}</span></td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => { setEditing(u); setForm(u); setShowForm(true); }} className="text-muted hover:text-[var(--primary)] mx-2"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(u.id)} className="text-muted hover:text-[#EF4444]"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
