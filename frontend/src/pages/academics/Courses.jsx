import { useState, useEffect } from 'react';
import { academicsApi } from '../../api/academics';
import { campusApi } from '../../api/campus';
import { CrudTable, FormModal, Field, inputCls, selectCls, StatusBadge } from '../../components/academics/AcademicCrud';
import { generateUniqueCode } from '../../utils/codeGenerator';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

const TYPES = ['theory', 'practical', 'tutorial', 'project', 'elective', 'audit', 'online', 'seminar'];
const blank = { name: '', code: '', campus: '', program: '', course_type: 'theory', credits: 3.0, lecture_hours: 3, tutorial_hours: 1, practical_hours: 0, department: '', semester: '', is_elective: false, is_active: true, description: '' };

export default function Courses() {
  const { user } = useAuth();
  const userRole = user?.role?.name || user?.role;
  const isFaculty = userRole === 'faculty';
  const isHOD = Boolean(user?.is_hod);
  const canBulkDelete = ['tenant_admin', 'academic_admin'].includes(userRole);

  const [filterCampus, setFilterCampus] = useState('');
  const [filterDept, setFilterDept] = useState((isFaculty || isHOD) && user?.department_id ? String(user.department_id) : '');
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');

  const [rows, setRows] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [depts, setDepts] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const load = async () => {
    setLoading(true);
    const p = {};
    if (filterCampus && !isHOD) p.department__campus_id = filterCampus;
    if (filterDept) p.department_id = filterDept;

    // If faculty or HOD, use their department as fallback if no filter is selected
    if ((isFaculty || isHOD) && !p.department_id && user?.department_id) {
      p.department_id = user.department_id;
    }

    if (filterType) p.course_type = filterType;
    if (search) p.search = search;
    setRows(await academicsApi.getCourses(p));
    setSelectedIds([]);
    setLoading(false);
  };
  
  useEffect(() => { 
    if (!isHOD) {
      campusApi.getCampuses().then(setCampuses);
    } else {
      setCampuses([]);
    }
    academicsApi.getDepartments().then(setDepts); 
    academicsApi.getPrograms().then(setPrograms);
    academicsApi.getSemesters().then(setSemesters); 
  }, [isHOD]);
  
  useEffect(() => { load(); }, [filterCampus, filterDept, filterType, search]);

  const set = (k, v) => setForm(f => {
    const updated = { ...f, [k]: v };
    if (k === 'campus') { updated.department = ''; updated.program = ''; updated.semester = ''; }
    if (k === 'department') { updated.program = ''; updated.semester = ''; }
    if (k === 'program') { updated.semester = ''; }
    return updated;
  });
  
  const handleNameChange = (e) => {
    const newName = e.target.value;
    setForm(prev => {
      if (!editing) {
        const existingCodes = rows.map(r => r.code);
        return { ...prev, name: newName, code: generateUniqueCode(newName, existingCodes) };
      }
      return { ...prev, name: newName };
    });
  };

  const openCreate = () => { setEditing(null); setForm(blank); setOpen(true); };
  const openEdit = (row) => { setEditing(row); setForm({ ...row, semester: row.semester || '', department: row.department, campus: row.campus_id }); setOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    const payload = { ...form };
    if (!payload.semester) delete payload.semester;
    try {
      if (editing) await academicsApi.updateCourse(editing.id, payload);
      else await academicsApi.createCourse(payload);
      setOpen(false); load();
    } catch (err) { alert(JSON.stringify(err.response?.data) || 'Save failed.'); }
    finally { setSaving(false); }
  };

  const toggleRow = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const toggleAll = (visibleRows) => {
    const visibleIds = visibleRows.map((row) => row.id);
    const allSelected = visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) => {
      if (allSelected) {
        return prev.filter((id) => !visibleIds.includes(id));
      }
      return [...new Set([...prev, ...visibleIds])];
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected course(s)?`)) return;
    try {
      await academicsApi.bulkDeleteCourses(selectedIds);
      await load();
    } catch (err) {
      alert(JSON.stringify(err.response?.data) || 'Bulk delete failed.');
    }
  };

  const COLS = [
    { key: 'campus_name', label: 'Campus' },
    { key: 'department_name', label: 'Department' },
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Course Name' },
    { key: 'course_type_display', label: 'Type' },
    { key: 'credits', label: 'Credits' },
    { key: 'total_hours', label: 'Hrs/Week', render: r => `${r.total_hours}h` },
    { key: 'is_active', label: 'Status', render: r => <StatusBadge active={r.is_active} /> },
  ];

  const selectedCampusObj = filterCampus ? campuses.find(c => String(c.id) === String(filterCampus)) : null;
  const selectedCampusIsInactive = selectedCampusObj && selectedCampusObj.status !== 'active';
  const campusStatusLabel = selectedCampusObj ? { active: 'Active', inactive: 'Inactive', maintenance: 'Under Maintenance' }[selectedCampusObj.status] || selectedCampusObj.status : '';

  const inactiveCampusBanner = selectedCampusIsInactive ? (
    <div className="flex items-start gap-3 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-xl px-5 py-4 mt-2 mb-2">
      <AlertTriangle className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
      <div>
        <p className="text-[#F59E0B] font-semibold text-sm">
          {selectedCampusObj.name} is currently <span className="uppercase">{campusStatusLabel}</span>
        </p>
        <p className="text-muted text-xs mt-0.5">
          This campus is not operational. No new courses can be added here. Existing courses are shown for reference only.
        </p>
      </div>
    </div>
  ) : null;

  const noCampusBanner = !filterCampus && !isFaculty && !isHOD ? (
    <div className="flex items-start gap-3 bg-[#3B82F6]/10 border border-[#3B82F6]/30 rounded-xl px-5 py-4 mt-2 mb-2">
      <AlertTriangle className="w-5 h-5 text-[#3B82F6] shrink-0 mt-0.5" />
      <div>
        <p className="text-[#3B82F6] font-semibold text-sm">Please select a campus to filter</p>
      </div>
    </div>
  ) : null;

  const banner = inactiveCampusBanner || noCampusBanner;

  const tableFilters = (
    <div className="flex flex-wrap gap-2">
      <input type="text" placeholder="Search courses..." value={search} onChange={e => setSearch(e.target.value)} className="bg-background border border-border px-4 py-2 text-foreground text-sm rounded-xl focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]" />
      {!isHOD && (
        <select className={`bg-background border border-border px-3 py-2 rounded-xl text-sm ${selectedCampusIsInactive ? 'border-[#F59E0B]/50 text-[#F59E0B]' : 'text-foreground'}`} value={filterCampus} onChange={e => { setFilterCampus(e.target.value); setFilterDept(''); }}>
          <option value="">All Campuses</option>
          {campuses.filter(c => c.status === 'active').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          {campuses.filter(c => c.status !== 'active').length > 0 && <option disabled>── Inactive / Maintenance ──</option>}
          {campuses.filter(c => c.status !== 'active').map(c => <option key={c.id} value={c.id}>{c.status === 'inactive' ? `${c.name} — Inactive` : `${c.name} — Maintenance`}</option>)}
        </select>
      )}
      <select disabled={!filterCampus && !isFaculty && !isHOD} className={`bg-background border border-border px-3 py-2 rounded-xl text-sm ${(!filterCampus && !isFaculty && !isHOD) ? 'opacity-50 cursor-not-allowed text-muted' : 'text-foreground'}`} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
        <option value="">{(!filterCampus && !isFaculty && !isHOD) ? 'Select Campus First' : 'All Departments'}</option>
        {depts.filter(d => isHOD || !filterCampus || String(d.campus) === String(filterCampus)).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
      <select className="bg-background border border-border px-3 py-2 rounded-xl text-sm text-foreground" value={filterType} onChange={e => setFilterType(e.target.value)}>
        <option value="">All Types</option>
        {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
      </select>
      {(filterCampus || filterDept || filterType || search) && <button onClick={() => { setFilterCampus(''); setFilterDept(''); setFilterType(''); setSearch(''); }} className="text-xs text-muted hover:text-foreground px-3">Clear Filters</button>}
    </div>
  );

  return (
    <>
      <CrudTable 
        title="Courses" 
        subtitle={isHOD ? "Review department course workload and syllabus readiness." : "All courses across departments and semesters"} 
        columns={COLS} 
        rows={rows} 
        onCreate={openCreate} 
        onEdit={openEdit} 
        onDelete={async id => { if (window.confirm('Delete?')) { await academicsApi.deleteCourse(id); load(); } }} 
        loading={loading} 
        filters={tableFilters}
        disableAddReason={isHOD ? null : (selectedCampusIsInactive ? `Cannot add courses to an ${campusStatusLabel.toLowerCase()} campus` : null)}
        banner={isHOD ? null : inactiveCampusBanner}
        userRole={userRole}
        bulkSelection={canBulkDelete ? { selectedIds, onToggleRow: toggleRow, onToggleAll: toggleAll, onBulkDelete: handleBulkDelete } : null}
      />
      <FormModal isOpen={open} onClose={() => setOpen(false)} title={editing ? 'Edit Course' : 'New Course'} onSubmit={handleSubmit} saving={saving}>
        <div className="grid grid-cols-2 gap-4">
          {!isHOD && (
            <Field label="Campus">
              <select required className={selectCls} value={form.campus} onChange={e => set('campus', e.target.value)}>
                <option value="">Select...</option>
                {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          )}
          <Field label="Department">
            <select required className={selectCls} value={form.department} onChange={e => set('department', e.target.value)}>
              <option value="">Select...</option>
              {depts.filter(d => isHOD || !form.campus || String(d.campus) === String(form.campus)).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Program">
            <select className={selectCls} value={form.program} onChange={e => set('program', e.target.value)}>
              <option value="">Any</option>
              {programs.filter(p => !form.department || String(p.department) === String(form.department)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Semester (optional)">
            <select className={selectCls} value={form.semester} onChange={e => set('semester', e.target.value)}>
              <option value="">Any</option>
              {semesters.filter(s => !form.program || String(s.program) === String(form.program)).map(s => <option key={s.id} value={s.id}>{s.program_name} | {s.name}</option>)}
            </select>
          </Field>
          <Field label="Course Name"><input required className={inputCls} value={form.name} onChange={handleNameChange} /></Field>
          <Field label="Course Code"><input required className={inputCls} value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} /></Field>
          <Field label="Course Type">
            <select className={selectCls} value={form.course_type} onChange={e => set('course_type', e.target.value)}>
              {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </Field>
          <Field label="Credits"><input type="number" step="0.5" className={inputCls} value={form.credits} onChange={e => set('credits', parseFloat(e.target.value))} /></Field>
          <Field label="Lecture Hours/Week"><input type="number" min="0" className={inputCls} value={form.lecture_hours} onChange={e => set('lecture_hours', parseInt(e.target.value))} /></Field>
          <Field label="Tutorial Hours/Week"><input type="number" min="0" className={inputCls} value={form.tutorial_hours} onChange={e => set('tutorial_hours', parseInt(e.target.value))} /></Field>
          <Field label="Practical Hours/Week"><input type="number" min="0" className={inputCls} value={form.practical_hours} onChange={e => set('practical_hours', parseInt(e.target.value))} /></Field>
          <Field label="Elective?">
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input type="checkbox" checked={form.is_elective} onChange={e => set('is_elective', e.target.checked)} className="w-5 h-5 rounded" />
              <span className="text-foreground text-sm">This is an elective course</span>
            </label>
          </Field>
          <div className="col-span-2">
            <Field label="Description"><textarea className={inputCls} rows="2" value={form.description} onChange={e => set('description', e.target.value)} /></Field>
          </div>
        </div>
      </FormModal>
    </>
  );
}
