import { useState, useEffect } from 'react';
import { academicsApi } from '../../api/academics';
import { campusApi } from '../../api/campus';
import { CrudTable, FormModal, Field, inputCls, selectCls } from '../../components/academics/AcademicCrud';
import { useAuth } from '../../auth/AuthContext';

const blank = { course: '', campus: '', department: '', program: '', section: '', semester: '', faculty: '' };

export default function CourseSections() {
  const { user } = useAuth();
  const userRole = user?.role?.name || user?.role;
  const isFaculty = userRole === 'faculty';
  const isHOD = Boolean(userRole === 'hod' || (user?.is_hod && userRole !== 'faculty'));

  const [isViewAll, setIsViewAll] = useState(false);
  const [filterCampus, setFilterCampus] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterFaculty, setFilterFaculty] = useState('');
  const [search, setSearch] = useState('');

  const [rows, setRows] = useState([]);
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [depts, setDepts] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const p = {};
    if (filterCampus) p.campus_id = filterCampus;
    if (filterDept) p.department_id = filterDept;
    if (filterFaculty) p.faculty_id = filterFaculty;
    
    // If HOD/Faculty and no filter, fallback to their assigned department
    if ((isHOD || isFaculty) && !p.department_id && user?.department_id) {
        p.department_id = user.department_id;
    }
    // For HODs, if no campus filter, use their campus as fallback
    if (isHOD && !p.campus_id && user?.campus?.id) {
        p.campus_id = user.campus.id;
    }
    if (search) p.search = search;
    const response = await academicsApi.getCourseSections(p);
    setRows(Array.isArray(response) ? response : []);
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
    academicsApi.getCourses().then(setCourses);
    academicsApi.getSections().then(setSections);
    academicsApi.getSemesters().then(setSemesters);
    academicsApi.getFaculty().then(setFaculty);
  }, [isHOD]);

  useEffect(() => { load(); }, [filterCampus, filterDept, filterFaculty, search, isHOD]);

  const set = (k, v) => setForm(f => {
    const updated = { ...f, [k]: v };
    if (k === 'campus') { updated.department = ''; updated.program = ''; updated.course = ''; updated.section = ''; updated.semester = ''; }
    if (k === 'department') { updated.program = ''; updated.course = ''; updated.section = ''; updated.semester = ''; }
    if (k === 'program') { updated.course = ''; updated.section = ''; updated.semester = ''; }
    return updated;
  });
  const openCreate = () => { setEditing(null); setForm(blank); setOpen(true); };
  const openEdit = (row) => { setEditing(row); setForm({ ...row, faculty: row.faculty || '', department: row.department_id, campus: row.campus_id }); setOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    const p = { ...form };
    if (!p.faculty) delete p.faculty;
    try {
      if (editing) await academicsApi.updateCourseSection(editing.id, p);
      else await academicsApi.createCourseSection(p);
      setOpen(false); load();
    } catch { alert('Save failed. Ensure Course is unique per section/semester.'); }
    finally { setSaving(false); }
  };

  const facultyLoadMap = rows.reduce((acc, row) => {
    if (!row.faculty || !row.faculty_name) return acc;
    const key = String(row.faculty);
    const current = acc[key] || { count: 0, name: row.faculty_name };
    current.count += 1;
    acc[key] = current;
    return acc;
  }, {});

  const COLS = [
    { key: 'campus_name', label: 'Campus' },
    { key: 'department_name', label: 'Department' },
    { key: 'course_code', label: 'Course Code' },
    { key: 'course_name', label: 'Course Name' },
    { key: 'section_label', label: 'Section' },
    { key: 'faculty_name', label: 'Assigned Faculty', render: r => r.faculty_name || <span className="text-[#EF4444] font-bold text-xs">Unassigned</span> },
    { key: 'faculty_load', label: 'Faculty Load', render: (r) => {
      if (!r.faculty) return '—';
      const load = facultyLoadMap[String(r.faculty)]?.count || 0;
      return <span className={load >= 5 ? 'text-amber-400 font-bold' : 'text-[#CBD5E1]'}>{load} assignments</span>;
    } },
    { key: 'semester_name', label: 'Semester' },
  ];

  const displayedRows = isViewAll ? rows : rows.slice(0, 10);

  const tableFilters = (
    <div className="flex flex-wrap gap-2 items-center">
      <input 
        type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} 
        className="bg-background border border-border px-4 py-2 text-foreground text-sm rounded-xl focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"
      />
      {!isHOD && (
        <select value={filterCampus} onChange={e => { setFilterCampus(e.target.value); setFilterDept(''); }} className="bg-background border border-border px-4 py-2 text-foreground text-sm rounded-xl focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]">
          <option value="">All Campuses</option>{campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
      <select value={filterDept} onChange={e => setFilterDept(e.target.value)} disabled={!isHOD && !filterCampus && !isFaculty} className={`bg-background border border-border px-4 py-2 text-sm rounded-xl focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] ${(!isHOD && !filterCampus && !isFaculty) ? 'opacity-50 cursor-not-allowed text-muted' : 'text-foreground'}`}>
        <option value="">{(!isHOD && !filterCampus && !isFaculty) ? 'Select Campus First' : 'All Departments'}</option>
        {depts.filter(d => isHOD || !filterCampus || String(d.campus) === String(filterCampus)).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
      <select value={filterFaculty} onChange={e => setFilterFaculty(e.target.value)} className="bg-background border border-border px-4 py-2 text-foreground text-sm rounded-xl focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] max-w-sm">
        <option value="">All Faculty</option>
        {faculty.filter(f => !filterDept || String(f.department) === String(filterDept)).map(f => <option key={f.id} value={f.id}>{f.user_name}</option>)}
      </select>
      {(filterCampus || filterDept || filterFaculty || search) && <button onClick={() => { setFilterCampus(''); setFilterDept(''); setFilterFaculty(''); setSearch(''); }} className="text-xs text-muted hover:text-foreground px-3">Clear Filters</button>}
    </div>
  );

  return (
    <div className="space-y-4">
      <CrudTable title={isHOD ? "Department Course Assignment" : "Faculty Course Assignment"} subtitle={isHOD ? "Assign department faculty to sections, review unassigned subjects, and watch overload warnings before timetable generation." : "Assign which faculty teaches what course to which section."} columns={COLS} rows={displayedRows} onCreate={openCreate} onEdit={openEdit} onDelete={async id => { if (window.confirm('Remove assignment?')) { await academicsApi.deleteCourseSection(id); load(); } }} loading={loading} filters={tableFilters} userRole={userRole} />
      
      {!isViewAll && rows.length > 10 && (
        <div className="flex justify-center mt-4">
          <button onClick={() => setIsViewAll(true)} className="bg-surface hover:bg-surface/80 border border-border text-[var(--primary)] px-6 py-2 rounded-xl text-sm font-semibold">
            View All Assignments
          </button>
        </div>
      )}

      <FormModal isOpen={open} onClose={() => setOpen(false)} title={editing ? 'Edit Assignment' : 'New Assignment'} onSubmit={handleSubmit} saving={saving}>
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
            <select required className={selectCls} value={form.program} onChange={e => set('program', e.target.value)}>
              <option value="">Select...</option>
              {programs.filter(p => !form.department || String(p.department) === String(form.department)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Target Semester">
            <select required className={selectCls} value={form.semester} onChange={e => set('semester', e.target.value)}>
               <option value="">Select...</option>
              {semesters.filter(s => !form.program || String(s.program) === String(form.program)).map(s => <option key={s.id} value={s.id}>{s.name} ({s.academic_year})</option>)}
            </select>
          </Field>
          <Field label="Course">
            <select required className={selectCls} value={form.course} onChange={e => set('course', e.target.value)}>
               <option value="">Select...</option>
              {courses.filter(c => !form.department || String(c.department) === String(form.department)).map(c => <option key={c.id} value={c.id}>[{c.code}] {c.name}</option>)}
            </select>
          </Field>
          <Field label="Section (Class)">
            <select required className={selectCls} value={form.section} onChange={e => set('section', e.target.value)}>
               <option value="">Select...</option>
              {sections.filter(s => !form.program || String(s.batch_program) === String(form.program)).map(s => <option key={s.id} value={s.id}>{s.batch_name} — Section {s.name}</option>)}
            </select>
          </Field>
          <Field label="Assigned Faculty">
            <select className={selectCls} value={form.faculty} onChange={e => set('faculty', e.target.value)}>
              <option value="">— Leave Unassigned —</option>
              {faculty.filter(f => !form.campus || String(f.campus_id) === String(form.campus)).map(f => <option key={f.id} value={f.id}>{f.user_name} ({f.department_name})</option>)}
            </select>
          </Field>
        </div>
      </FormModal>
    </div>
  );
}
