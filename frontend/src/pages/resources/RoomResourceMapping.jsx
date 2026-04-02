import { useState, useEffect } from 'react';
import { resourcesApi } from '../../api/resources';
import { campusApi } from '../../api/campus';
import { Plus, Trash2, Link } from 'lucide-react';

export default function RoomResourceMapping() {
  const [mappings, setMappings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ room: '', resource: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [m, r, a] = await Promise.all([resourcesApi.getRoomMappings(), campusApi.getRooms(), resourcesApi.getAssets()]);
    setMappings(m); setRooms(r); setAssets(a); setLoading(false);
  };
  useEffect(() => { fetchAll(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await resourcesApi.createRoomMapping(form); setForm({ room: '', resource: '', notes: '' }); fetchAll(); }
    catch { alert('Mapping creation failed. It may already exist.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this mapping?')) return;
    await resourcesApi.deleteRoomMapping(id); fetchAll();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground tracking-tight">Room-Resource Mapping</h2>
        <p className="text-muted mt-1">Associate resources and equipment to specific rooms</p>
      </div>

      <div className="bg-surface/30 border border-[#22D3EE]/20 p-6 rounded-2xl">
        <h4 className="text-foreground font-bold mb-4 flex items-center gap-2"><Link className="text-[var(--primary)] w-5 h-5" /> Create New Mapping</h4>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-xs font-bold text-muted uppercase">Room</label>
            <select required value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground text-sm">
              <option value="">Select a Room...</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.room_number} - {r.building_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-muted uppercase">Resource</label>
            <select required value={form.resource} onChange={e => setForm({ ...form, resource: e.target.value })} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground text-sm">
              <option value="">Select a Resource...</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.name} [{a.resource_code}]</option>)}
            </select>
          </div>
          <button type="submit" disabled={saving} className="bg-[var(--primary)] text-[#0F172A] px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 justify-center">
            <Plus className="w-5 h-5" /> {saving ? 'Creating...' : 'Add Mapping'}
          </button>
        </form>
      </div>

      <div className="bg-background border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface/50 text-muted text-xs uppercase tracking-wider">
              <th className="px-6 py-4">Room</th>
              <th className="px-6 py-4">Building</th>
              <th className="px-6 py-4">Resource</th>
              <th className="px-6 py-4">Code</th>
              <th className="px-6 py-4 text-right">Remove</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1B2A4A]">
            {loading ? <tr><td colSpan="5" className="text-center py-8 text-muted">Loading...</td></tr>
              : mappings.length === 0 ? <tr><td colSpan="5" className="text-center py-8 text-muted">No mappings found.</td></tr>
              : mappings.map(m => (
                <tr key={m.id} className="hover:bg-surface/30">
                  <td className="px-6 py-4 text-foreground font-bold">{m.room_number}</td>
                  <td className="px-6 py-4 text-muted">{m.building_name}</td>
                  <td className="px-6 py-4 text-muted">{m.resource_name}</td>
                  <td className="px-6 py-4 text-muted font-mono text-xs">{m.resource_code}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(m.id)} className="text-muted hover:text-[#EF4444]"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
