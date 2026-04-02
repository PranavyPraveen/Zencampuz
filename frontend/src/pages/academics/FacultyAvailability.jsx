import { useState, useEffect } from 'react';
import { academicsApi } from '../../api/academics';
import { FormModal, Field, inputCls, selectCls } from '../../components/academics/AcademicCrud';
import { Plus, Trash2 } from 'lucide-react';

const DAYS = [
  { value: 'mon', label: 'Monday' },
  { value: 'tue', label: 'Tuesday' },
  { value: 'wed', label: 'Wednesday' },
  { value: 'thu', label: 'Thursday' },
  { value: 'fri', label: 'Friday' },
  { value: 'sat', label: 'Saturday' },
];
const blank = { faculty: '', day: 'mon', start_time: '08:00', end_time: '12:00', is_available: true, note: '' };

export default function FacultyAvailability() {
  const [faculty, setFaculty] = useState([]);
  const [selected, setSelected] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => { academicsApi.getFaculty().then(setFaculty); }, []);

  const loadRecords = async (fid) => {
    setLoading(true);
    setRecords(await academicsApi.getFacultyAvailability({ faculty: fid }));
    setLoading(false);
  };

  const handleFacultyChange = (id) => { setSelected(id); if (id) loadRecords(id); else setRecords([]); };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const openAdd = () => { setForm({ ...blank, faculty: selected }); setOpen(true); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await academicsApi.createAvailability(form); setOpen(false); loadRecords(selected); }
    catch { alert('Save failed.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this slot?')) return;
    await academicsApi.deleteAvailability(id); loadRecords(selected);
  };

  const dayGroups = DAYS.map(d => ({ ...d, slots: records.filter(r => r.day === d.value) }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Faculty Availability</h2>
          <p className="text-muted mt-1">Define when each faculty member is available for teaching slots</p>
        </div>
        {selected && (
          <button onClick={openAdd} className="bg-[var(--primary)] text-[#0F172A] px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2">
            <Plus className="w-5 h-5" /> Add Slot
          </button>
        )}
      </div>

      <div className="mb-4">
        <label className="text-xs font-bold text-muted uppercase">Select Faculty</label>
        <select className="mt-1 w-72 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]" value={selected} onChange={e => handleFacultyChange(e.target.value)}>
          <option value="">— Pick a faculty member —</option>
          {faculty.map(f => <option key={f.id} value={f.id}>{f.user_name} | {f.department_name}</option>)}
        </select>
      </div>

      {selected && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {dayGroups.map(d => (
            <div key={d.value} className="bg-background border border-border rounded-2xl p-4">
              <p className="text-[var(--primary)] font-bold text-sm mb-3">{d.label}</p>
              {d.slots.length === 0
                ? <p className="text-muted text-xs">No slots defined</p>
                : d.slots.map(s => (
                  <div key={s.id} className="flex items-center justify-between bg-surface/30 rounded-xl px-3 py-2 mb-2">
                    <div>
                      <p className="text-foreground text-xs font-semibold">{s.start_time} – {s.end_time}</p>
                      {s.note && <p className="text-muted text-xs">{s.note}</p>}
                      <span className={`text-xs font-bold ${s.is_available ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                        {s.is_available ? 'Available' : 'Busy'}
                      </span>
                    </div>
                    <button onClick={() => handleDelete(s.id)} className="text-muted hover:text-[#EF4444]"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))
              }
            </div>
          ))}
        </div>
      )}

      <FormModal isOpen={open} onClose={() => setOpen(false)} title="Add Availability Slot" onSubmit={handleSave} saving={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Day">
            <select className={selectCls} value={form.day} onChange={e => set('day', e.target.value)}>
              {DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </Field>
          <Field label="Available?">
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input type="checkbox" checked={form.is_available} onChange={e => set('is_available', e.target.checked)} className="w-5 h-5 rounded" />
              <span className="text-foreground text-sm">Available for teaching</span>
            </label>
          </Field>
          <Field label="Start Time"><input type="time" className={inputCls} value={form.start_time} onChange={e => set('start_time', e.target.value)} /></Field>
          <Field label="End Time"><input type="time" className={inputCls} value={form.end_time} onChange={e => set('end_time', e.target.value)} /></Field>
          <div className="col-span-2">
            <Field label="Note (optional)"><input className={inputCls} value={form.note} onChange={e => set('note', e.target.value)} /></Field>
          </div>
        </div>
      </FormModal>
    </div>
  );
}
