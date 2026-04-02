import { useState, useEffect } from 'react';
import { bookingsApi } from '../../api/bookings';
import { Plus, Edit2, Trash2, ShieldCheck, ToggleLeft, ToggleRight } from 'lucide-react';

const TRIGGERS = [
  { value: 'role_student', label: 'Student Role' },
  { value: 'role_external', label: 'External User' },
  { value: 'role_research', label: 'Research Scholar' },
  { value: 'role_facility_manager', label: 'Facility Manager (Direct Book)' },
  { value: 'resource_auditorium', label: 'Auditorium Booking' },
  { value: 'resource_seminar_hall', label: 'Seminar Hall Booking' },
  { value: 'resource_lab', label: 'Lab Instrument Booking' },
  { value: 'resource_restricted', label: 'Restricted Resource' },
  { value: 'time_weekend', label: 'Weekend Booking' },
  { value: 'time_after_hours', label: 'After Hours (before 8AM / after 6PM)' },
  { value: 'duration_long', label: 'Duration Over 4 Hours' },
  { value: 'all', label: 'All Bookings (catch-all)' },
];
const ACTIONS = [
  { value: 'auto_approve', label: 'Auto Approve', color: '#10B981' },
  { value: 'require_approval', label: 'Require Approval', color: '#F59E0B' },
  { value: 'block', label: 'Block', color: '#EF4444' },
];

const blankForm = { name: '', trigger: 'role_student', action: 'require_approval', priority: 10, approver_roles: [], is_active: true, notes: '' };

export default function PolicyAdmin() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchPolicies = async () => {
    setLoading(true);
    setPolicies(await bookingsApi.getPolicies());
    setLoading(false);
  };
  useEffect(() => { fetchPolicies(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) await bookingsApi.updatePolicy(editing.id, form);
      else await bookingsApi.createPolicy(form);
      setShowForm(false); setEditing(null); setForm(blankForm); fetchPolicies();
    } catch { alert('Save failed.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this policy rule?')) return;
    await bookingsApi.deletePolicy(id); fetchPolicies();
  };

  const actionColor = (a) => ACTIONS.find(x => x.value === a)?.color || '#64748B';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Booking Policies</h2>
          <p className="text-muted mt-1">Rules that automatically determine approval requirements for booking requests</p>
        </div>
        <button onClick={() => { setEditing(null); setForm(blankForm); setShowForm(true); }} className="bg-[var(--primary)] hover:brightness-90 text-[#0F172A] px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2">
          <Plus className="w-5 h-5" /> Add Policy Rule
        </button>
      </div>

      <div className="bg-surface/10 border border-[#22D3EE]/20 rounded-2xl p-4 text-sm text-[var(--primary)]">
        ℹ️ Policies are evaluated in <strong>priority order</strong> (lower number = higher priority). The first matching rule determines the outcome. Unmatched bookings default to <strong>Require Approval</strong>.
      </div>

      {/* Policy Form */}
      {showForm && (
        <div className="bg-background border border-[#22D3EE]/20 rounded-2xl p-6">
          <h3 className="text-foreground font-bold mb-4 flex items-center gap-2"><ShieldCheck className="text-[var(--primary)]" /> {editing ? 'Edit Policy Rule' : 'New Policy Rule'}</h3>
          <form id="policyForm" onSubmit={handleSave} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="text-xs font-bold text-muted uppercase">Rule Name</label>
              <input required value={form.name} onChange={e => set('name', e.target.value)} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted uppercase">Trigger Condition</label>
              <select value={form.trigger} onChange={e => set('trigger', e.target.value)} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]">
                {TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted uppercase">Action</label>
              <select value={form.action} onChange={e => set('action', e.target.value)} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]">
                {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted uppercase">Priority (lower = higher)</label>
              <input type="number" min="1" value={form.priority} onChange={e => set('priority', parseInt(e.target.value))} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted uppercase">Notes</label>
              <input value={form.notes} onChange={e => set('notes', e.target.value)} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="w-5 h-5 rounded" />
                <span className="text-foreground text-sm font-medium">Active</span>
              </label>
            </div>
          </form>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setShowForm(false)} className="px-5 py-2 text-muted hover:text-foreground text-sm">Cancel</button>
            <button type="submit" form="policyForm" disabled={saving} className="bg-[var(--primary)] text-[#0F172A] px-6 py-2.5 rounded-xl font-bold">{saving ? 'Saving...' : 'Save Policy'}</button>
          </div>
        </div>
      )}

      {/* Policies Table */}
      <div className="bg-background border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface/50 text-muted text-xs uppercase tracking-wider">
              <th className="px-6 py-4 w-16">Sl. No.</th>
              <th className="px-6 py-4">Priority</th>
              <th className="px-6 py-4">Rule Name</th>
              <th className="px-6 py-4">Trigger</th>
              <th className="px-6 py-4">Action</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1B2A4A]">
            {loading
              ? <tr><td colSpan="7" className="text-center py-8 text-muted">Loading...</td></tr>
              : policies.length === 0
                ? <tr><td colSpan="7" className="text-center py-8 text-muted">No policies defined yet.</td></tr>
                : [...policies].sort((a, b) => a.priority - b.priority).map((p, idx) => (
                  <tr key={p.id} className="hover:bg-background">
                    <td className="px-6 py-4 text-muted text-sm font-semibold">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <span className="w-8 h-8 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-bold text-sm flex items-center justify-center">{p.priority}</span>
                    </td>
                    <td className="px-6 py-4 text-foreground font-medium">{p.name}</td>
                    <td className="px-6 py-4 text-muted text-sm">{p.trigger_display}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold border" style={{ color: actionColor(p.action), borderColor: `${actionColor(p.action)}30`, backgroundColor: `${actionColor(p.action)}10` }}>
                        {p.action_display}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {p.is_active ? <ToggleRight className="text-[#10B981] w-6 h-6" /> : <ToggleLeft className="text-muted w-6 h-6" />}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => { setEditing(p); setForm({ ...p }); setShowForm(true); }} className="text-muted hover:text-[var(--primary)] mx-2"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(p.id)} className="text-muted hover:text-[#EF4444]"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
