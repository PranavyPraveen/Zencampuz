import { useState, useEffect } from 'react';
import { academicsApi } from '../../api/academics';
import { campusApi } from '../../api/campus';
import { CrudTable, FormModal, Field, inputCls, selectCls, StatusBadge } from '../../components/academics/AcademicCrud';
import { Users, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import Programs from './Programs';

const batchBlank = { name: '', campus: '', department: '', program: '', start_year: new Date().getFullYear(), end_year: new Date().getFullYear() + 4, is_active: true };
const sectionBlank = { name: '', campus: '', department: '', program: '', batch: '', strength: 60, class_advisor: '', is_active: true };

export default function Batches() {
  const { user } = useAuth();
  const userRole = user?.role?.name || user?.role;
  const isFaculty = userRole === 'faculty';
  const isHOD = Boolean(user?.is_hod || userRole === 'hod');

  const [batches, setBatches] = useState([]);
  const [sections, setSections] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Global Filters
  const initialCampus = user?.campus?.id ? String(user.campus.id) : '';
  const initialDept = (isFaculty || isHOD) && user?.department_id ? String(user.department_id) : '';

  const [globalCampus, setGlobalCampus] = useState(initialCampus);
  const [globalDept, setGlobalDept] = useState(initialDept);
  const [globalSearch, setGlobalSearch] = useState('');

  // View All states for tables
  const [viewAllB, setViewAllB] = useState(false);
  const [viewAllS, setViewAllS] = useState(false);

  // Batch modal
  const [bOpen, setBOpen] = useState(false);
  const [bForm, setBForm] = useState(batchBlank);
  const [bEditing, setBEditing] = useState(null);

  // Section modal
  const [sOpen, setSOpen] = useState(false);
  const [sForm, setSForm] = useState(sectionBlank);
  const [sEditing, setSEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadBatches = async () => {
    const p = {};
    if (globalCampus) p.program__department__campus_id = globalCampus;
    if (globalDept) p.program__department_id = globalDept;
    if (globalSearch) p.search = globalSearch;
    setBatches(await academicsApi.getBatches(p));
  };

  const loadSections = async () => {
    const p = {};
    if (globalCampus) p.batch__program__department__campus_id = globalCampus;
    if (globalDept) p.batch__program__department_id = globalDept;
    if (globalSearch) p.search = globalSearch;
    setSections(await academicsApi.getSections(p));
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadBatches(), loadSections()]);
    setLoading(false);
  };

  useEffect(() => { loadBatches(); }, [globalCampus, globalDept, globalSearch]);
  useEffect(() => { loadSections(); }, [globalCampus, globalDept, globalSearch]);

  useEffect(() => {
    loadAll();
    academicsApi.getPrograms().then(setPrograms);
    // Load all faculty; dropdown filters by selected department at render time
    academicsApi.getFaculty().then(setFaculty);
    campusApi.getCampuses().then(setCampuses);
    academicsApi.getDepartments().then((departmentRows) => {
      setDepts(departmentRows);
      // If HOD and we don't have a department ID yet, auto-select the first available one
      if (isHOD && !globalDept && departmentRows.length > 0) {
        setGlobalDept(String(departmentRows[0].id));
        if (!globalCampus && departmentRows[0].campus) {
          setGlobalCampus(String(departmentRows[0].campus));
        }
      }
    });
  }, []);

  // --- Batch handlers ---
  const bSet = (k, v) => setBForm(f => {
    const updated = { ...f, [k]: v };
    if (k === 'campus') { updated.department = ''; updated.program = ''; }
    if (k === 'department') updated.program = '';
    return updated;
  });
  const openBCreate = () => { setBEditing(null); setBForm(batchBlank); setBOpen(true); };
  const openBEdit = (row) => { setBEditing(row); setBForm({ ...row, program: row.program, department: row.department_id, campus: row.campus_id }); setBOpen(true); };

  const handleBSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      // Auto-generate name from years; strip UI-only fields campus/department not on the model
      const payload = {
        program: bForm.program,
        name: bForm.name || `${bForm.start_year}-${bForm.end_year}`,
        start_year: bForm.start_year,
        end_year: bForm.end_year,
        is_active: bForm.is_active,
      };
      if (bEditing) await academicsApi.updateBatch(bEditing.id, payload);
      else await academicsApi.createBatch(payload);
      setBOpen(false); loadBatches();
    } catch (err) {
      const msg = err?.response?.data ? JSON.stringify(err.response.data) : 'Save failed.';
      alert(msg);
    }
    finally { setSaving(false); }
  };

  const handleBDelete = async (id) => {
    if (!window.confirm('Delete batch?')) return;
    await academicsApi.deleteBatch(id); loadBatches();
  };

  // --- Section handlers ---
  const sSet = (k, v) => setSForm(f => {
    const updated = { ...f, [k]: v };
    if (k === 'campus') { updated.department = ''; updated.program = ''; updated.batch = ''; }
    if (k === 'department') { updated.program = ''; updated.batch = ''; }
    if (k === 'program') { updated.batch = ''; }
    return updated;
  });
  const openSCreate = () => { setSEditing(null); setSForm(sectionBlank); setSOpen(true); };
  // Edit might be tricky dynamically, as we don't have deep fields easily mapped, but we'll map what we know
  const openSEdit = (row) => { setSEditing(row); setSForm({ ...row, batch: row.batch, class_advisor: row.class_advisor || '' }); setSOpen(true); };

  const handleSSave = async (e) => {
    e.preventDefault(); setSaving(true);
    const p = { ...sForm };
    if (!p.class_advisor) delete p.class_advisor;
    try {
      if (sEditing) await academicsApi.updateSection(sEditing.id, p);
      else await academicsApi.createSection(p);
      setSOpen(false); loadSections();
    } catch { alert('Save failed.'); }
    finally { setSaving(false); }
  };

  const B_COLS = [
    { key: 'campus_name', label: 'Campus' },
    { key: 'department_name', label: 'Department' },
    { key: 'program_name', label: 'Program' },
    { key: 'name', label: 'Batch Name' },
    { key: 'duration', label: 'Academic Years', render: r => `${r.start_year} – ${r.end_year}` },
    { key: 'section_count', label: 'Sections', render: r => <span className="px-2 py-1 bg-[var(--primary)]/10 text-[var(--primary)] rounded-lg text-xs font-bold">{r.section_count}</span> },
    { key: 'is_active', label: 'Status', render: r => <StatusBadge active={r.is_active} /> },
  ];

  const S_COLS = [
    { key: 'program_name', label: 'Programme' },
    { key: 'batch_name', label: 'Batch' },
    { key: 'name', label: 'Section Label', render: r => `Section ${r.name}` },
    { key: 'strength', label: 'Strength', render: r => <span className="flex items-center gap-1 text-xs"><Users className="w-3.5 h-3.5 text-muted" /> {r.strength}</span> },
    { key: 'advisor_name', label: 'Class Advisor', render: r => r.advisor_name || '—' },
  ];

  const selectedCampusObj = globalCampus ? campuses.find(c => String(c.id) === String(globalCampus)) : null;
  const selectedCampusIsInactive = selectedCampusObj && selectedCampusObj.status !== 'active';
  const campusStatusLabel = selectedCampusObj ? { active: 'Active', inactive: 'Inactive', maintenance: 'Under Maintenance' }[selectedCampusObj.status] || selectedCampusObj.status : '';

  const getAddDisableReason = (entityName) => {
    if (selectedCampusIsInactive) return `Cannot add ${entityName} to an ${campusStatusLabel.toLowerCase()} campus`;
    return null;
  };

  const inactiveCampusBanner = selectedCampusIsInactive ? (
    <div className="flex items-start gap-3 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-xl px-5 py-4 mb-4">
      <AlertTriangle className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
      <div>
        <p className="text-[#F59E0B] font-semibold text-sm">
          {selectedCampusObj.name} is currently <span className="uppercase">{campusStatusLabel}</span>
        </p>
        <p className="text-muted text-xs mt-0.5">
          This campus is not operational. No new records can be added here. Existing records are shown for reference only.
        </p>
      </div>
    </div>
  ) : null;

  const noCampusBanner = !globalCampus && !isFaculty && !isHOD ? (
    <div className="flex items-start gap-3 bg-[#3B82F6]/10 border border-[#3B82F6]/30 rounded-xl px-5 py-4 mb-4">
      <AlertTriangle className="w-5 h-5 text-[#3B82F6] shrink-0 mt-0.5" />
      <div>
        <p className="text-[#3B82F6] font-semibold text-sm">Please select a campus to filter</p>
      </div>
    </div>
  ) : null;

  const banner = inactiveCampusBanner || noCampusBanner;

  const globalFiltersBar = (
      <div className="bg-background border border-border rounded-2xl p-4 flex flex-wrap gap-4 items-center">
      <div className="flex-1 min-w-[200px]">
        <input 
          type="text" 
          placeholder="Search all..." 
          value={globalSearch} 
          onChange={e => setGlobalSearch(e.target.value)} 
          className="w-full bg-background border border-border px-4 py-2.5 text-foreground text-sm rounded-xl focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"
        />
      </div>
      <div className="flex-1 min-w-[200px]">
        <select 
          value={globalCampus} 
          onChange={e => { setGlobalCampus(e.target.value); setGlobalDept(''); }} 
          disabled={isHOD && Boolean(user?.campus?.id)}
          className={`w-full bg-background border border-border px-4 py-2.5 text-sm rounded-xl focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] ${selectedCampusIsInactive ? 'border-[#F59E0B]/50 text-[#F59E0B]' : 'text-foreground'}`}
        >
          <option value="">All Campuses</option>
          {campuses.filter(c => c.status === 'active').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          {campuses.filter(c => c.status !== 'active').length > 0 && <option disabled>── Inactive / Maintenance ──</option>}
          {campuses.filter(c => c.status !== 'active').map(c => <option key={c.id} value={c.id}>{c.status === 'inactive' ? `${c.name} — Inactive` : `${c.name} — Maintenance`}</option>)}
        </select>
      </div>
      <div className="flex-1 min-w-[200px]">
        <select 
          value={globalDept} 
          onChange={e => setGlobalDept(e.target.value)} 
          disabled={(isHOD && Boolean(globalDept)) || (!globalCampus && !isFaculty)}
          className={`w-full bg-background border border-border px-4 py-2.5 text-sm rounded-xl focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] ${
            ((isHOD && Boolean(globalDept)) || (!globalCampus && !isFaculty)) ? 'opacity-50 cursor-not-allowed text-muted' : 'text-foreground'
          }`}
        >
          <option value="">{isHOD ? (depts.find(d => String(d.id) === String(globalDept))?.name || 'Your Department') : ((!globalCampus && !isFaculty) ? 'Select Campus First' : 'All Departments')}</option>
          {depts.filter(d => !globalCampus || String(d.campus) === String(globalCampus)).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      {(globalCampus || globalDept || globalSearch) && (
        <button onClick={() => { setGlobalCampus(user?.campus?.id ? String(user.campus.id) : ''); setGlobalDept((isFaculty || isHOD) && user?.department_id ? String(user.department_id) : ''); setGlobalSearch(''); }} className="text-sm font-semibold text-muted hover:text-foreground px-2">
          Clear Filters
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-12">
      {/* Global Filter Bar */}
      {globalFiltersBar}

      {banner}

      <div>
        <Programs 
          filterCampus={globalCampus} 
          filterDept={globalDept} 
          search={globalSearch}
          disableAddReason={getAddDisableReason('programs')}
        />
      </div>

      <hr className="border-border" />

      <div>
        <CrudTable 
          title="Batches" 
          subtitle="Student admission cohorts (e.g. 2022-2026)" 
          columns={B_COLS} 
          rows={viewAllB ? batches : batches.slice(0, 10)} 
          onCreate={openBCreate} 
          onEdit={openBEdit} 
          onDelete={handleBDelete} 
          loading={loading}
          disableAddReason={getAddDisableReason('batches')}
          userRole={userRole}
        />
        {!viewAllB && batches.length > 10 && (
          <div className="flex justify-center mt-4">
            <button onClick={() => setViewAllB(true)} className="bg-surface hover:bg-surface/80 border border-border text-[var(--primary)] px-6 py-2 rounded-xl text-sm font-semibold">View All Batches</button>
          </div>
        )}
      </div>

      <hr className="border-border" />

      <div>
        <CrudTable 
          title="Sections" 
          subtitle="Parallel sections within a batch (e.g. Section A, Section B)" 
          columns={S_COLS} 
          rows={viewAllS ? sections : sections.slice(0, 10)} 
          onCreate={openSCreate} 
          onEdit={openSEdit} 
          onDelete={async id => { if (window.confirm('Delete section?')) { await academicsApi.deleteSection(id); loadSections(); } }} 
          loading={loading} 
          disableAddReason={getAddDisableReason('sections')}
          userRole={userRole}
        />
        {!viewAllS && sections.length > 10 && (
          <div className="flex justify-center mt-4">
            <button onClick={() => setViewAllS(true)} className="bg-surface hover:bg-surface/80 border border-border text-[var(--primary)] px-6 py-2 rounded-xl text-sm font-semibold">View All Sections</button>
          </div>
        )}
      </div>

      {/* Batch Modal */}
      <FormModal isOpen={bOpen} onClose={() => setBOpen(false)} title={bEditing ? 'Edit Batch' : 'New Batch'} onSubmit={handleBSave} saving={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Campus">
            <select required className={selectCls} value={bForm.campus} onChange={e => bSet('campus', e.target.value)}>
              <option value="">Select...</option>
              {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Department">
            <select required className={selectCls} value={bForm.department} onChange={e => bSet('department', e.target.value)}>
              <option value="">Select...</option>
              {depts.filter(d => !bForm.campus || String(d.campus) === String(bForm.campus)).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Program">
            <select required className={selectCls} value={bForm.program} onChange={e => bSet('program', e.target.value)}>
              <option value="">Select...</option>
              {programs.filter(p => !bForm.department || String(p.department) === String(bForm.department)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Start Year"><input required type="number" min="1990" max="2100" className={inputCls} value={bForm.start_year} onChange={e => bSet('start_year', parseInt(e.target.value))} /></Field>
          <Field label="End Year"><input required type="number" min="1990" max="2100" className={inputCls} value={bForm.end_year} onChange={e => bSet('end_year', parseInt(e.target.value))} /></Field>
          <Field label="Status">
            <select className={selectCls} value={bForm.is_active} onChange={e => bSet('is_active', e.target.value === 'true')}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </Field>
        </div>
      </FormModal>

      {/* Section Modal */}
      <FormModal isOpen={sOpen} onClose={() => setSOpen(false)} title={sEditing ? 'Edit Section' : 'New Section'} onSubmit={handleSSave} saving={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Campus">
            <select required className={selectCls} value={sForm.campus} onChange={e => sSet('campus', e.target.value)}>
              <option value="">Select...</option>
              {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Department">
            <select required className={selectCls} value={sForm.department} onChange={e => sSet('department', e.target.value)}>
              <option value="">Select...</option>
              {depts.filter(d => !sForm.campus || String(d.campus) === String(sForm.campus)).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Program">
            <select required className={selectCls} value={sForm.program} onChange={e => sSet('program', e.target.value)}>
              <option value="">Select...</option>
              {programs.filter(p => !sForm.department || String(p.department) === String(sForm.department)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Target Batch">
            <select required className={selectCls} value={sForm.batch} onChange={e => sSet('batch', e.target.value)}>
              <option value="">Select...</option>
              {batches.filter(b => !sForm.program || String(b.program) === String(sForm.program)).map(b => <option key={b.id} value={b.id}>{b.program_name} | {b.name}</option>)}
            </select>
          </Field>
          <Field label="Section Name / Label"><input required className={inputCls} value={sForm.name} onChange={e => sSet('name', e.target.value.toUpperCase())} placeholder="e.g. A" /></Field>
          <Field label="Student Strength"><input required type="number" min="1" max="200" className={inputCls} value={sForm.strength} onChange={e => sSet('strength', parseInt(e.target.value))} /></Field>
          <Field label="Class Advisor / In-charge">
            <select className={selectCls} value={sForm.class_advisor} onChange={e => sSet('class_advisor', e.target.value)}>
              <option value="">None applied</option>
              {faculty
                .filter(f => !sForm.department || String(f.department) === String(sForm.department))
                .map(f => <option key={f.user} value={f.user}>{f.user_name} ({f.department_name})</option>)}
            </select>
          </Field>
        </div>
      </FormModal>
    </div>
  );
}
