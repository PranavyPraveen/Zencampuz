import { useState, useEffect } from 'react';
import { academicsApi } from '../../api/academics';
import { campusApi } from '../../api/campus';
import { CrudTable, FormModal, Field, inputCls, selectCls, StatusBadge } from '../../components/academics/AcademicCrud';
import { Star, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

const TERMS = [
  { value: 'odd', label: 'Odd Semester' },
  { value: 'even', label: 'Even Semester' },
  { value: 'summer', label: 'Summer Term' },
  { value: 'trimester_1', label: 'Trimester 1' },
  { value: 'trimester_2', label: 'Trimester 2' },
  { value: 'trimester_3', label: 'Trimester 3' },
];
const blank = { name: '', campus: '', department: '', semester_number: 1, term: 'odd', academic_year: '2024-25', program: '', start_date: '', end_date: '', is_current: false };

export default function Semesters() {
  const { user } = useAuth();
  const userRole = user?.role?.name || user?.role;
  const isFaculty = userRole === 'faculty';

  const [filterCampus, setFilterCampus] = useState('');
  const [filterDept, setFilterDept] = useState(isFaculty && user?.department_id ? String(user.department_id) : '');
  const [filterProgram, setFilterProgram] = useState('');
  const [search, setSearch] = useState('');

  const [rows, setRows] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [depts, setDepts] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => { 
    if (!filterCampus && !isFaculty) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true); 
    const p = {};
    if (filterCampus) p.program__department__campus_id = filterCampus;
    if (filterDept) p.program__department_id = filterDept;

    // If faculty, force filter to their department
    if (isFaculty && user?.department_id) {
      p.program__department_id = user.department_id;
    }

    if (filterProgram) p.program_id = filterProgram;
    if (search) p.search = search;
    setRows(await academicsApi.getSemesters(p)); 
    setLoading(false); 
  };

  useEffect(() => { load(); }, [filterCampus, filterDept, filterProgram, search]);

  useEffect(() => { 
    campusApi.getCampuses().then(setCampuses);
    academicsApi.getDepartments().then(setDepts);
    academicsApi.getPrograms().then(setPrograms); 
  }, []);

  const set = (k, v) => setForm(f => {
    const updated = { ...f, [k]: v };
    if (k === 'campus') { updated.department = ''; updated.program = ''; }
    if (k === 'department') { updated.program = ''; }
    return updated;
  });
  const openCreate = () => { setEditing(null); setForm(blank); setOpen(true); };
  const openEdit = (row) => { setEditing(row); setForm({ ...row, program: row.program, department: row.department_id, campus: row.campus_id }); setOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) await academicsApi.updateSemester(editing.id, form);
      else await academicsApi.createSemester(form);
      setOpen(false); load();
    } catch (err) { alert(JSON.stringify(err.response?.data) || 'Save failed.'); }
    finally { setSaving(false); }
  };

  const handleSetCurrent = async (id) => {
    try { const r = await academicsApi.setCurrentSemester(id); alert(r.status); load(); }
    catch { alert('Failed to set current.'); }
  };

  const COLS = [
    { key: 'campus_name', label: 'Campus' },
    { key: 'department_name', label: 'Department' },
    { key: 'program_name', label: 'Program' },
    { key: 'semester_number', label: 'No.' },
    { key: 'name', label: 'Semester Name' },
    { key: 'academic_year', label: 'Academic Year' },
    { key: 'term_display', label: 'Term' },
    { key: 'is_current', label: 'Current', render: r => r.is_current
      ? <span className="flex items-center gap-1 text-[var(--primary)] text-xs font-bold"><Star className="w-3.5 h-3.5 fill-current" /> Current</span>
      : <button onClick={() => handleSetCurrent(r.id)} className="text-xs text-muted hover:text-[var(--primary)] underline">Set Current</button>
    },
  ];

  const noCampusBanner = !filterCampus && !isFaculty ? (
    <div className="flex items-start gap-3 bg-[#3B82F6]/10 border border-[#3B82F6]/30 rounded-xl px-5 py-4 mt-2 mb-2">
      <AlertTriangle className="w-5 h-5 text-[#3B82F6] shrink-0 mt-0.5" />
      <div>
        <p className="text-[#3B82F6] font-semibold text-sm">Please select a campus to filter</p>
      </div>
    </div>
  ) : null;

  const tableFilters = (
    <div className="flex flex-wrap gap-2">
      <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="bg-background border border-border px-4 py-2 text-foreground text-sm rounded-xl focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]" />
      <select value={filterCampus} onChange={e => { setFilterCampus(e.target.value); setFilterDept(''); setFilterProgram(''); }} className="bg-background border border-border px-4 py-2 text-foreground text-sm rounded-xl focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]">
        <option value="">All Campuses</option>{campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select value={filterDept} onChange={e => { setFilterDept(e.target.value); setFilterProgram(''); }} disabled={!filterCampus && !isFaculty} className={`bg-background border border-border px-4 py-2 text-sm rounded-xl focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] ${(!filterCampus && !isFaculty) ? 'opacity-50 cursor-not-allowed text-muted' : 'text-foreground'}`}>
        <option value="">{(!filterCampus && !isFaculty) ? 'Select Campus First' : 'All Departments'}</option>
        {depts.filter(d => !filterCampus || String(d.campus) === String(filterCampus)).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
      <select value={filterProgram} onChange={e => setFilterProgram(e.target.value)} disabled={!filterDept && !isFaculty} className={`bg-background border border-border px-4 py-2 text-sm rounded-xl focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] ${(!filterDept && !isFaculty) ? 'opacity-50 cursor-not-allowed text-muted' : 'text-foreground'}`}>
        <option value="">{(!filterDept && !isFaculty) ? 'Select Dept First' : 'All Programs'}</option>
        {programs.filter(p => !filterDept || String(p.department) === String(filterDept)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      {(filterCampus || filterDept || filterProgram || search) && <button onClick={() => { setFilterCampus(''); setFilterDept(''); setFilterProgram(''); setSearch(''); }} className="text-xs text-muted hover:text-foreground px-3">Clear Filters</button>}
    </div>
  );

  return (
    <>
      <CrudTable title="Semesters" subtitle="Configure all semesters per program and academic year" columns={COLS} rows={rows} onCreate={openCreate} onEdit={openEdit} onDelete={async id => { if (window.confirm('Delete?')) { await academicsApi.deleteSemester(id); load(); } }} loading={loading} filters={tableFilters} banner={noCampusBanner} userRole={userRole} />
      <FormModal isOpen={open} onClose={() => setOpen(false)} title={editing ? 'Edit Semester' : 'New Semester'} onSubmit={handleSubmit} saving={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Campus">
            <select required className={selectCls} value={form.campus} onChange={e => set('campus', e.target.value)}>
              <option value="">Select Campus...</option>
              {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Department">
            <select required className={selectCls} value={form.department} onChange={e => set('department', e.target.value)}>
              <option value="">Select Department...</option>
              {depts.filter(d => !form.campus || String(d.campus) === String(form.campus)).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Program">
            <select required className={selectCls} value={form.program} onChange={e => set('program', e.target.value)}>
              <option value="">Select Program...</option>
              {programs.filter(p => !form.department || String(p.department) === String(form.department)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Semester Number">
            <input type="number" min="1" className={inputCls} value={form.semester_number} onChange={e => set('semester_number', parseInt(e.target.value))} />
          </Field>
          <Field label="Semester Name">
            <input required className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Semester 3" />
          </Field>
          <Field label="Academic Year">
            <input required className={inputCls} value={form.academic_year} onChange={e => set('academic_year', e.target.value)} placeholder="e.g. 2024-25" />
          </Field>
          <Field label="Term">
            <select className={selectCls} value={form.term} onChange={e => set('term', e.target.value)}>
              {TERMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Mark as Current">
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input type="checkbox" checked={form.is_current} onChange={e => set('is_current', e.target.checked)} className="w-5 h-5 rounded" />
              <span className="text-foreground text-sm">Active / Current Semester</span>
            </label>
          </Field>
          <Field label="Start Date">
            <input type="date" className={inputCls} value={form.start_date} onChange={e => set('start_date', e.target.value)} />
          </Field>
          <Field label="End Date">
            <input type="date" className={inputCls} value={form.end_date} onChange={e => set('end_date', e.target.value)} />
          </Field>
        </div>
      </FormModal>
    </>
  );
}
