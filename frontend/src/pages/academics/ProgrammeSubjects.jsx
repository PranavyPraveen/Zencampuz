import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { academicsApi } from '../../api/academics';
import { CrudTable, FormModal, Field, inputCls, selectCls, StatusBadge } from '../../components/academics/AcademicCrud';
import { useAuth } from '../../auth/AuthContext';

const TYPES = ['theory', 'practical', 'tutorial', 'project', 'elective', 'audit', 'online', 'seminar'];
const blank = { name: '', code: '', program: '', semester: '', course_type: 'theory', credits: 3.0, lecture_hours: 3, tutorial_hours: 1, practical_hours: 0, department: '', primary_domain: '', secondary_domain: '', is_elective: false, is_active: true, description: '' };

export default function ProgrammeSubjects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userRole = user?.role?.name || user?.role;
  const [programs, setPrograms] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [selectedIds, setSelectedIds] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [domains, setDomains] = useState([]);

  const [search, setSearch] = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [syncingProgramId, setSyncingProgramId] = useState('');

  const requestedProgramId = searchParams.get('program');

  useEffect(() => {
    async function bootstrap() {
      try {
        const [programRows, semesterRows, domainRows] = await Promise.all([
          academicsApi.getPrograms(user?.department_id ? { department_id: user.department_id } : {}),
          academicsApi.getSemesters(user?.department_id ? { department_id: user.department_id } : {}),
          academicsApi.getSubjectDomains(user?.department_id ? { department_id: user.department_id } : {}),
        ]);
        setPrograms(programRows || []);
        setSemesters(semesterRows || []);
        setDomains(domainRows || []);
        if (Array.isArray(programRows) && programRows.length > 0) {
          const requestedMatch = requestedProgramId && programRows.find((row) => String(row.id) === String(requestedProgramId));
          if (requestedMatch) {
            setFilterProgram(String(requestedMatch.id));
          } else if (!filterProgram) {
            setFilterProgram(String(programRows[0].id));
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    bootstrap();
  }, [requestedProgramId]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = {};
        if (user?.department_id) params.department_id = user.department_id;
        if (filterProgram) params.program_id = filterProgram;
        if (filterSemester) params.semester_number = filterSemester;
        if (search) params.search = search;
        const courseRows = await academicsApi.getCourses(params);
        setRows(Array.isArray(courseRows) ? courseRows : []);
        setSelectedIds([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filterProgram, filterSemester, search, user?.department_id]);

  const selectedProgram = useMemo(
    () => programs.find((program) => String(program.id) === String(filterProgram)) || null,
    [programs, filterProgram]
  );

  useEffect(() => {
    async function syncExistingUploadedSyllabus() {
      if (!selectedProgram || rows.length > 0 || !selectedProgram.syllabus_file_url) {
        return;
      }
      if (syncingProgramId === String(selectedProgram.id)) {
        return;
      }

      try {
        setSyncingProgramId(String(selectedProgram.id));
        const updatedProgram = await academicsApi.syncProgramSyllabusSubjects(selectedProgram.id);
        setPrograms((prev) => prev.map((item) => String(item.id) === String(updatedProgram.id) ? updatedProgram : item));

        const params = {};
        if (user?.department_id) params.department_id = user.department_id;
        params.program_id = selectedProgram.id;
        if (filterSemester) params.semester_number = filterSemester;
        if (search) params.search = search;
        const courseRows = await academicsApi.getCourses(params);
        setRows(Array.isArray(courseRows) ? courseRows : []);
      } catch (err) {
        console.error(err);
      } finally {
        setSyncingProgramId('');
      }
    }

    syncExistingUploadedSyllabus();
  }, [selectedProgram, rows.length, user?.department_id, filterSemester, search, syncingProgramId]);

  const availableSemesters = useMemo(
    () => {
      if (!selectedProgram?.total_semesters) return [];
      return Array.from({ length: selectedProgram.total_semesters }, (_, index) => ({
        id: `semester-${index + 1}`,
        semester_number: index + 1,
        name: `Semester ${index + 1}`,
      }));
    },
    [selectedProgram]
  );

  useEffect(() => {
    if (!selectedProgram?.total_semesters) {
      if (filterSemester) setFilterSemester('');
      return;
    }
    if (filterSemester && Number(filterSemester) > Number(selectedProgram.total_semesters)) {
      setFilterSemester('');
    }
  }, [selectedProgram, filterSemester]);

  const set = (key, value) => setForm((prev) => {
    const next = { ...prev, [key]: value };
    if (key === 'program') next.semester = '';
    return next;
  });

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
    if (!window.confirm(`Delete ${selectedIds.length} selected subject(s)?`)) return;
    try {
      await academicsApi.bulkDeleteCourses(selectedIds);
      setRows((prev) => prev.filter((row) => !selectedIds.includes(row.id)));
      setSelectedIds([]);
    } catch (err) {
      alert(JSON.stringify(err.response?.data) || 'Bulk delete failed.');
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...blank,
      program: filterProgram || '',
      department: user?.department_id || '',
      primary_domain: '',
      secondary_domain: '',
    });
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      ...row,
      department: row.department,
      program: row.program_id || '',
      semester: row.semester || '',
      primary_domain: row.primary_domain || '',
      secondary_domain: row.secondary_domain || '',
    });
    setOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, department: user?.department_id || form.department };
      if (editing) {
        await academicsApi.updateCourse(editing.id, payload);
      } else {
        await academicsApi.createCourse(payload);
      }
      setOpen(false);
      setFilterProgram(payload.program || filterProgram);
      const params = { department_id: user?.department_id || payload.department };
      if (filterProgram) params.program_id = filterProgram;
      if (filterSemester) params.semester_number = filterSemester;
      setRows(await academicsApi.getCourses(params));
    } catch (err) {
      alert(JSON.stringify(err.response?.data) || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const COLS = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Subject Name' },
    { key: 'primary_domain_name', label: 'Domain', render: r => r.primary_domain_name || 'Incomplete' },
    { key: 'lecture_hours', label: 'Theory (L)' },
    { key: 'tutorial_hours', label: 'Tutorial (T)' },
    { key: 'practical_hours', label: 'Lab (P)' },
    { key: 'credits', label: 'Credits' },
    { key: 'course_type_display', label: 'Type' },
    { key: 'is_active', label: 'Status', render: r => <StatusBadge active={r.is_active} /> },
  ];

  const tableFilters = (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => navigate(`/academics/programme-syllabus${filterProgram ? `?program=${filterProgram}` : ''}`)}
        className="bg-foreground/5 border border-border px-4 py-2 rounded-xl text-sm font-semibold text-foreground hover:bg-foreground/10"
      >
        Upload Syllabus
      </button>
      <select value={filterProgram} onChange={(e) => { setFilterProgram(e.target.value); setFilterSemester(''); }} className="bg-background border border-border px-3 py-2 rounded-xl text-sm text-foreground">
        <option value="">All Programmes</option>
        {programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
      </select>
      <select value={filterSemester} onChange={(e) => setFilterSemester(e.target.value)} className="bg-background border border-border px-3 py-2 rounded-xl text-sm text-foreground">
        <option value="">All Semesters</option>
        {availableSemesters.map((semester) => <option key={semester.id} value={semester.semester_number}>{semester.name}</option>)}
      </select>
      <input type="text" placeholder="Search subject code or name..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-background border border-border px-4 py-2 text-foreground text-sm rounded-xl focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]" />
      {(filterProgram || filterSemester || search) ? <button onClick={() => { setFilterProgram(''); setFilterSemester(''); setSearch(''); }} className="text-xs text-muted hover:text-foreground px-3">Clear Filters</button> : null}
    </div>
  );

  return (
    <>
      <CrudTable
        title="Programme Subjects"
        subtitle={syncingProgramId ? 'Syncing uploaded syllabus into the structured subject table...' : 'Structured subject table imported from syllabus. You can also add, edit, or delete subjects manually.'}
        columns={COLS}
        rows={rows}
        onCreate={openCreate}
        onEdit={openEdit}
        onDelete={async (id) => { if (window.confirm('Delete subject?')) { await academicsApi.deleteCourse(id); setRows((prev) => prev.filter((row) => row.id !== id)); } }}
        loading={loading}
        filters={tableFilters}
        userRole={userRole}
        emptyMessage="No subjects found for the selected programme."
        bulkSelection={{ selectedIds, onToggleRow: toggleRow, onToggleAll: toggleAll, onBulkDelete: handleBulkDelete }}
      />

      <FormModal isOpen={open} onClose={() => setOpen(false)} title={editing ? 'Edit Subject' : 'Add Subject'} onSubmit={handleSubmit} saving={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Programme">
            <select required className={selectCls} value={form.program} onChange={(e) => set('program', e.target.value)}>
              <option value="">Select...</option>
              {programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
            </select>
          </Field>
          <Field label="Semester">
            <select required className={selectCls} value={form.semester} onChange={(e) => set('semester', e.target.value)}>
              <option value="">Select...</option>
              {semesters.filter((semester) => !form.program || String(semester.program) === String(form.program)).map((semester) => (
                <option key={semester.id} value={semester.id}>{semester.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Subject Name"><input required className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Subject Code"><input required className={inputCls} value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} /></Field>
          <Field label="Subject Type">
            <select className={selectCls} value={form.course_type} onChange={(e) => set('course_type', e.target.value)}>
              {TYPES.map((type) => <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>)}
            </select>
          </Field>
          <Field label="Primary Domain">
            <select required className={selectCls} value={form.primary_domain} onChange={(e) => set('primary_domain', e.target.value)}>
              <option value="">Select...</option>
              {domains.map((domain) => <option key={domain.id} value={domain.id}>{domain.name}</option>)}
            </select>
          </Field>
          <Field label="Secondary Domain">
            <select className={selectCls} value={form.secondary_domain} onChange={(e) => set('secondary_domain', e.target.value)}>
              <option value="">Optional</option>
              {domains.map((domain) => <option key={domain.id} value={domain.id}>{domain.name}</option>)}
            </select>
          </Field>
          <Field label="Credits"><input type="number" step="0.5" className={inputCls} value={form.credits} onChange={(e) => set('credits', parseFloat(e.target.value))} /></Field>
          <Field label="Theory Hours (L)"><input type="number" min="0" className={inputCls} value={form.lecture_hours} onChange={(e) => set('lecture_hours', parseInt(e.target.value))} /></Field>
          <Field label="Tutorial Hours (T)"><input type="number" min="0" className={inputCls} value={form.tutorial_hours} onChange={(e) => set('tutorial_hours', parseInt(e.target.value))} /></Field>
          <Field label="Lab Hours (P)"><input type="number" min="0" className={inputCls} value={form.practical_hours} onChange={(e) => set('practical_hours', parseInt(e.target.value))} /></Field>
          <Field label="Elective?">
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input type="checkbox" checked={form.is_elective} onChange={(e) => set('is_elective', e.target.checked)} className="w-5 h-5 rounded" />
              <span className="text-foreground text-sm">This is an elective subject</span>
            </label>
          </Field>
          <div className="col-span-2">
            <Field label="Description"><textarea className={inputCls} rows="2" value={form.description || ''} onChange={(e) => set('description', e.target.value)} /></Field>
          </div>
        </div>
      </FormModal>
    </>
  );
}
