import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { timetableApi } from '../../api/timetable';
import { academicsApi } from '../../api/academics';
import { campusApi } from '../../api/campus';
import { Settings, Calendar, Wand2, Plus, Loader2, Edit2, Trash2, ChevronRight, RefreshCw, X } from 'lucide-react';

// ── Styles ──────────────────────────────────────────────────────────────────
const selectCls = "w-full bg-surface text-foreground text-sm border border-border rounded-xl px-3 py-2.5 outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] transition-colors disabled:opacity-40";
const inputCls  = "w-full bg-surface text-foreground text-sm border border-border rounded-xl px-3 py-2.5 outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] transition-colors";
const labelCls  = "block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider";
const Field = ({ label, children }) => (
  <div><label className={labelCls}>{label}</label>{children}</div>
);

const STATUS_MAP = {
  published: { label: 'Published', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  draft:     { label: 'Draft',     cls: 'bg-amber-500/15  text-amber-400   border-amber-500/30' },
  archived:  { label: 'Archived',  cls: 'bg-gray-500/15   text-gray-400    border-gray-500/30' },
};

const blank = {
  name: '', semester: '', section: '',
  campus: '', programme: '', batch: '',
  valid_from: '', valid_to: '', status: 'draft',
};

// ── Cascade Dropdown Form ────────────────────────────────────────────────────
function PlanForm({ form, set, semesters, editing }) {
  const [campuses, setCampuses]     = useState([]);
  const [departments, setDepts]     = useState([]);
  const [programmes, setProgs]      = useState([]);
  const [batches, setBatches]       = useState([]);
  const [filtSems, setFiltSems]     = useState([]);
  const [sections, setSections]     = useState([]);
  const [autoName, setAutoName]     = useState(true);
  const [naming, setNaming]         = useState(false);

  // Load campuses once
  useEffect(() => {
    campusApi.getCampuses().then(setCampuses).catch(() => {});
  }, []);

  // Cascade on campus change
  useEffect(() => {
    if (!form.campus) { setDepts([]); return; }
    academicsApi.getDepartments({ campus_id: form.campus }).then(setDepts).catch(() => {});
    set('department_id', ''); set('programme', ''); set('batch', ''); set('semester', ''); set('section', '');
  }, [form.campus]);

  // Cascade on department change
  useEffect(() => {
    if (!form.department_id) { setProgs([]); return; }
    academicsApi.getPrograms({ department_id: form.department_id }).then(setProgs).catch(() => {});
    set('programme', ''); set('batch', ''); set('semester', ''); set('section', '');
  }, [form.department_id]);

  // Cascade on programme change
  useEffect(() => {
    if (!form.programme) { setBatches([]); return; }
    academicsApi.getBatches({ program_id: form.programme }).then(setBatches).catch(() => {});
    const filteredSems = semesters.filter(s => s.program === form.programme);
    setFiltSems(filteredSems);
    set('batch', ''); set('semester', ''); set('section', '');
  }, [form.programme]);

  // Cascade on batch/semester change → load sections
  useEffect(() => {
    if (!form.batch) { setSections([]); return; }
    academicsApi.getSections({ batch_id: form.batch }).then(setSections).catch(() => {});
    set('section', '');
  }, [form.batch]);

  // Auto generate plan name whenever key fields change
  useEffect(() => {
    if (!autoName) return;
    const params = {};
    if (form.campus) params.campus_id = form.campus;
    if (form.department_id) params.department_id = form.department_id;
    if (form.programme) params.programme_id = form.programme;
    if (form.semester) params.semester_id = form.semester;
    if (form.batch) params.batch_id = form.batch;
    if (form.section) params.section_id = form.section;
    if (Object.keys(params).length === 0) return;
    setNaming(true);
    timetableApi.generatePlanName(params).then(res => {
      set('name', res.name);
    }).catch(() => {}).finally(() => setNaming(false));
  }, [form.campus, form.department_id, form.programme, form.semester, form.batch, form.section]);

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* ── Step 1: Campus ── */}
      <Field label="1. Campus">
        <select className={selectCls} value={form.campus} onChange={e => { set('campus', e.target.value); }}>
          <option value="">— Select Campus —</option>
          {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>

      {/* ── Step 2: Department ── */}
      <Field label="2. Department">
        <select className={selectCls} value={form.department_id || ''} disabled={!form.campus}
          onChange={e => set('department_id', e.target.value)}>
          <option value="">— Select Department —</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </Field>

      {/* ── Step 3: Programme ── */}
      <Field label="3. Programme">
        <select className={selectCls} value={form.programme} disabled={!form.department_id}
          onChange={e => set('programme', e.target.value)}>
          <option value="">— Select Programme —</option>
          {programmes.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
        </select>
      </Field>

      {/* ── Step 4: Batch ── */}
      <Field label="4. Batch">
        <select className={selectCls} value={form.batch} disabled={!form.programme}
          onChange={e => set('batch', e.target.value)}>
          <option value="">— Select Batch —</option>
          {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </Field>

      {/* ── Step 5: Semester ── */}
      <Field label="5. Semester">
        <select required className={selectCls} value={form.semester} disabled={!form.programme}
          onChange={e => set('semester', e.target.value)}>
          <option value="">— Select Semester —</option>
          {(filtSems.length > 0 ? filtSems : semesters).map(s => <option key={s.id} value={s.id}>{s.name} ({s.academic_year})</option>)}
        </select>
      </Field>

      {/* ── Step 6: Section ── */}
      <Field label="6. Section">
        <select required className={selectCls} value={form.section} disabled={!form.batch}
          onChange={e => set('section', e.target.value)}>
          <option value="">— Select Section —</option>
          {sections.map(s => <option key={s.id} value={s.id}>{s.batch_name} — Sec {s.name}</option>)}
        </select>
      </Field>

      {/* ── Plan Name (auto/manual) ── */}
      <div className="col-span-2">
        <div className="flex items-center justify-between mb-1.5">
          <label className={labelCls + ' mb-0'}>Plan Name</label>
          <button type="button" onClick={() => setAutoName(!autoName)}
            className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${autoName ? 'border-[#22D3EE] text-[var(--primary)] bg-[var(--primary)]/10' : 'border-border text-muted'}`}>
            {autoName ? '⚡ Auto' : '✏️ Manual'}
          </button>
        </div>
        <div className="relative">
          <input
            required className={inputCls}
            value={form.name}
            onChange={e => { setAutoName(false); set('name', e.target.value); }}
            placeholder="e.g. CSE | Sem-1 | 2024-28 | Sec-A"
          />
          {naming && <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-[var(--primary)]" />}
        </div>
      </div>

      {/* ── Dates ── */}
      <Field label="Valid From">
        <input required type="date" className={inputCls} value={form.valid_from} onChange={e => set('valid_from', e.target.value)} />
      </Field>
      <Field label="Valid To">
        <input required type="date" className={inputCls} value={form.valid_to} onChange={e => set('valid_to', e.target.value)} />
      </Field>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function TimetablePlans() {
  const navigate = useNavigate();

  // Master data for list filters
  const [campuses, setCampuses]       = useState([]);
  const [departments, setDepts]       = useState([]);
  const [programmes, setProgs]        = useState([]);
  const [semesters, setSemesters]     = useState([]);
  const [allDepts, setAllDepts]       = useState([]);

  // List state
  const [rows, setRows]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [autoRunning, setAutoRunning] = useState(null);

  // List-level filters (server-side)
  const [fCampus, setFCampus]         = useState('');
  const [fDept, setFDept]             = useState('');
  const [fProg, setFProg]             = useState('');
  const [filtDepts, setFiltDepts]     = useState([]);
  const [filtProgs, setFiltProgs]     = useState([]);

  // Modal form state
  const [open, setOpen]     = useState(false);
  const [form, setForm]     = useState(blank);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving]   = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Load list with filters ──
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = {};
      if (fCampus) params.campus = fCampus;
      if (fDept)   params.department_id = fDept;
      if (fProg)   params.programme = fProg;
      setRows(await timetableApi.getPlans(params));
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Failed to load plans.');
    } finally {
      setLoading(false);
    }
  }, [fCampus, fDept, fProg]);

  // Initial load
  useEffect(() => {
    campusApi.getCampuses().then(setCampuses).catch(() => {});
    academicsApi.getDepartments().then(d => { setAllDepts(d); setDepts(d); }).catch(() => {});
    academicsApi.getSemesters().then(setSemesters).catch(() => {});
    academicsApi.getPrograms().then(setProgs).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filter cascade for list-level filters
  useEffect(() => {
    if (!fCampus) { setFiltDepts(allDepts); return; }
    academicsApi.getDepartments({ campus_id: fCampus }).then(setFiltDepts).catch(() => {});
    setFDept(''); setFProg('');
  }, [fCampus]);

  useEffect(() => {
    if (!fDept) { setFiltProgs(programmes); return; }
    academicsApi.getPrograms({ department_id: fDept }).then(setFiltProgs).catch(() => {});
    setFProg('');
  }, [fDept]);

  const clearFilters = () => { setFCampus(''); setFDept(''); setFProg(''); };
  const hasFilters = fCampus || fDept || fProg;

  // ── Modal helpers ──
  const openCreate = () => { setEditing(null); setForm(blank); setOpen(true); };
  const openEdit = (row) => {
    setEditing(row);
    setForm({
      ...blank, ...row,
      campus: row.campus || '',
      programme: row.programme || '',
      batch: row.batch || '',
      department_id: row.department_id || '',
    });
    setOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form };
      // Remove empty optional FKs
      if (!payload.campus) delete payload.campus;
      if (!payload.programme) delete payload.programme;
      if (!payload.batch) delete payload.batch;
      delete payload.department_id; // computed, not a model field
      if (editing) await timetableApi.updatePlan(editing.id, payload);
      else await timetableApi.createPlan(payload);
      setOpen(false); load();
    } catch (err) {
      alert('Save failed: ' + (err?.response?.data?.detail || err.message));
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this timetable plan entirely?')) {
      await timetableApi.deletePlan(id); load();
    }
  };

  const handleAutoSchedule = async (plan) => {
    if (!window.confirm(`Auto-generate timetable for "${plan.name}"?\n\nThis will clear existing sessions and re-assign all classes.`)) return;
    setAutoRunning(plan.id);
    try {
      await timetableApi.clearSessions(plan.id);
      const res = await timetableApi.autoSchedule(plan.id);
      const conflicts = Array.isArray(res.conflicts) ? res.conflicts : [];
      alert(
        `✅ Auto-schedule complete!\nAssigned: ${res.assigned ?? 0} sessions\nSkipped: ${res.skipped ?? 0}` +
        (conflicts.length ? `\n\nConflicts (${conflicts.length}):\n${conflicts.slice(0,5).join('\n')}` : '\n\nNo conflicts!')
      );
      navigate(`/timetable/builder/${plan.id}`);
    } catch (err) {
      alert('Auto-schedule failed: ' + (err?.response?.data?.error || err.message));
    } finally { setAutoRunning(null); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Timetable Plans</h2>
          <p className="text-muted mt-1 text-sm">Each plan links a campus → department → programme → section to a full weekly schedule</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-[var(--primary)] text-[#0F172A] px-5 py-2.5 rounded-xl font-bold hover:bg-[#06B6D4] transition-colors">
          <Plus className="w-4 h-4" /> Add New Plan
        </button>
      </div>

      {/* ── Filters Bar (server-side) ── */}
      <div className="bg-background border border-border rounded-2xl p-4 flex flex-wrap gap-3 items-center">
        <span className="text-sm font-bold text-muted">Filter:</span>

        <select className="bg-background text-foreground text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"
          value={fCampus} onChange={e => setFCampus(e.target.value)}>
          <option value="">All Campuses</option>
          {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select className="bg-background text-foreground text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"
          value={fDept} onChange={e => setFDept(e.target.value)}>
          <option value="">All Departments</option>
          {(fCampus ? filtDepts : allDepts).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <select className="bg-background text-foreground text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"
          value={fProg} onChange={e => setFProg(e.target.value)}>
          <option value="">All Programmes</option>
          {(fDept ? filtProgs : programmes).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-[#EF4444] hover:underline">
            <X className="w-3 h-3" /> Clear Filters
          </button>
        )}
        <button onClick={load} className="ml-auto text-muted hover:text-foreground transition-colors" title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ── How-to Guide ── */}
      <div className="bg-surface/40 border border-border rounded-2xl p-4 text-sm text-muted">
        <p className="font-bold text-[var(--primary)] mb-1">How to generate a timetable:</p>
        <div className="flex flex-wrap gap-4">
          {['1. Create a plan (select campus → dept → programme → section)', '2. Click ⚡ Auto-Schedule to generate automatically', '3. Click 📋 Open Builder to manually edit any slot', '4. Publish when ready'].map((s, i) => (
            <span key={i} className="flex items-center gap-1.5"><ChevronRight className="w-3 h-3 text-[var(--primary)]" />{s}</span>
          ))}
        </div>
      </div>

      {/* ── List ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading plans...
        </div>
      ) : error ? (
        <div className="text-red-400 bg-red-500/10 border border-red-500/20 p-6 rounded-2xl text-sm">{error}</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-20 bg-surface border border-dashed border-border rounded-2xl text-muted">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-bold text-foreground mb-1">No timetable plans found</p>
          <p className="text-sm mb-4">Try adjusting your filters or create a new plan.</p>
          <button onClick={openCreate} className="bg-[var(--primary)] text-[#0F172A] px-5 py-2 rounded-xl font-bold text-sm">+ Create First Plan</button>
        </div>
      ) : (
        <div className="grid gap-4">
          {rows.map(plan => {
            const statusInfo = STATUS_MAP[plan.status] || STATUS_MAP.draft;
            const isRunning = autoRunning === plan.id;
            return (
              <div key={plan.id} className="bg-surface border border-border rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4 hover:border-[#22D3EE]/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${statusInfo.cls}`}>{statusInfo.label}</span>
                    <h3 className="text-foreground font-bold text-lg truncate">{plan.name}</h3>
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
                    {plan.campus_name    && <span>🏫 <span className="text-muted">{plan.campus_name}</span></span>}
                    {plan.department_name && <span>🏛️ <span className="text-muted">{plan.department_name}</span></span>}
                    {plan.programme_name && <span>📚 <span className="text-muted">{plan.programme_name}</span></span>}
                    <span>📅 Semester: <span className="text-muted">{plan.semester_name}</span></span>
                    <span>👥 Section: <span className="text-muted">{plan.section_name}</span></span>
                    <span>📆 {plan.valid_from ? new Date(plan.valid_from).toLocaleDateString() : '—'} → {plan.valid_to ? new Date(plan.valid_to).toLocaleDateString() : '—'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <button onClick={() => handleAutoSchedule(plan)} disabled={isRunning}
                    className="flex items-center gap-2 bg-[#7C3AED] text-foreground px-4 py-2 rounded-xl font-bold text-sm hover:bg-[#6D28D9] transition-colors disabled:opacity-60">
                    {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    {isRunning ? 'Generating…' : 'Auto-Schedule'}
                  </button>
                  <button onClick={() => navigate(`/timetable/builder/${plan.id}`)}
                    className="flex items-center gap-2 bg-[var(--primary)]/10 text-[var(--primary)] border border-[#22D3EE]/30 px-4 py-2 rounded-xl font-bold text-sm hover:bg-[var(--primary)]/20 transition-colors">
                    <Calendar className="w-4 h-4" /> Open Builder
                  </button>
                  <button onClick={() => navigate(`/timetable/publish/${plan.id}`)}
                    className="flex items-center gap-2 bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 px-4 py-2 rounded-xl font-bold text-sm hover:bg-[#10B981]/20 transition-colors">
                    <Settings className="w-4 h-4" /> Publish
                  </button>
                  <button onClick={() => openEdit(plan)} className="p-2 text-muted hover:text-foreground hover:bg-foreground/5 rounded-xl transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(plan.id)} className="p-2 text-[#EF4444]/50 hover:text-[#EF4444] hover:bg-red-500/10 rounded-xl transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-foreground font-bold text-lg">{editing ? 'Edit Plan' : 'New Timetable Plan'}</h3>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <PlanForm form={form} set={set} semesters={semesters} editing={editing} />
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border mt-4">
                <button type="button" onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors">Cancel</button>
                <button type="submit" disabled={saving}
                  className="px-6 py-2.5 bg-[var(--primary)] text-[#0F172A] rounded-xl font-bold text-sm hover:bg-[#06B6D4] transition-colors disabled:opacity-60 flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Saving…' : (editing ? 'Update Plan' : 'Create Plan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
