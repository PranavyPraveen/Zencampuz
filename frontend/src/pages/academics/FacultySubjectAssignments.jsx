import { useEffect, useMemo, useState } from 'react';
import { academicsApi } from '../../api/academics';
import { CrudTable, FormModal, Field, inputCls, selectCls } from '../../components/academics/AcademicCrud';
import { useAuth } from '../../auth/AuthContext';

export default function FacultySubjectAssignments() {
  const { user } = useAuth();
  const userRole = user?.role?.name || user?.role;
  const [rows, setRows] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [eligibleRows, setEligibleRows] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState({ department: user?.department_id || '', faculty: '', program: '', semester: '' });
  const [form, setForm] = useState({ faculty: '', course: '', notes: '', status: 'finalized' });

  const departmentId = filters.department || '';

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (departmentId) params.department_id = departmentId;
      if (filters.faculty) params.faculty_id = filters.faculty;
      if (filters.program) params.program_id = filters.program;
      if (filters.semester) params.semester_number = filters.semester;
      const [assignmentRows, facultyRows, eligiblePool, programRows, semesterRows, departmentRows] = await Promise.all([
        academicsApi.getFacultySubjectAssignments(params),
        academicsApi.getFaculty(departmentId ? { department_id: departmentId } : {}),
        academicsApi.getFacultyEligibleSubjects({ status: 'hod_approved', ...(departmentId ? { department_id: departmentId } : {}) }),
        academicsApi.getPrograms(departmentId ? { department_id: departmentId } : {}),
        academicsApi.getSemesters(departmentId ? { department_id: departmentId } : {}),
        academicsApi.getDepartments(),
      ]);
      setRows(Array.isArray(assignmentRows) ? assignmentRows : []);
      setFaculty(Array.isArray(facultyRows) ? facultyRows.filter((row) => row.profile_id) : []);
      setEligibleRows(Array.isArray(eligiblePool) ? eligiblePool : []);
      setPrograms(Array.isArray(programRows) ? programRows : []);
      setSemesters(Array.isArray(semesterRows) ? semesterRows : []);
      setDepartments(Array.isArray(departmentRows) ? departmentRows : []);
      if (!departmentId && Array.isArray(departmentRows) && departmentRows.length === 1) {
        setFilters((prev) => ({ ...prev, department: String(departmentRows[0].id) }));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [departmentId, filters.faculty, filters.program, filters.semester]);

  const selectedFacultyEligible = useMemo(
    () => eligibleRows.filter((row) => {
      if (form.faculty && String(row.faculty) !== String(form.faculty)) return false;
      if (filters.program && String(row.program) !== String(filters.program)) return false;
      if (filters.semester && String(row.semester_number) !== String(filters.semester)) return false;
      return true;
    }),
    [eligibleRows, form.faculty, filters.program, filters.semester]
  );

  const semesterOptions = useMemo(() => {
    const relevantSemesters = filters.program
      ? semesters.filter((row) => String(row.program) === String(filters.program))
      : semesters;
    const semesterMap = new Map();
    relevantSemesters.forEach((row) => {
      if (row.semester_number && !semesterMap.has(String(row.semester_number))) {
        semesterMap.set(String(row.semester_number), {
          value: String(row.semester_number),
          label: row.name || `Semester ${row.semester_number}`,
        });
      }
    });
    return Array.from(semesterMap.values()).sort((a, b) => Number(a.value) - Number(b.value));
  }, [semesters, filters.program]);

  const facultyOptions = useMemo(
    () => faculty.map((row) => ({
      value: row.profile_id,
      label: row.user_name,
    })),
    [faculty]
  );

  const COLS = [
    { key: 'faculty_name', label: 'Faculty' },
    { key: 'course_code', label: 'Subject Code' },
    { key: 'course_name', label: 'Subject Name' },
    { key: 'program_name', label: 'Programme' },
    { key: 'semester_name', label: 'Semester' },
    { key: 'status_display', label: 'Status' },
    { key: 'assigned_by_name', label: 'Finalized By' },
  ];

  const filtersNode = (
    <div className="flex flex-wrap gap-2">
      <select value={filters.department} onChange={(e) => setFilters((prev) => ({ ...prev, department: e.target.value, faculty: '', program: '', semester: '' }))} className={selectCls}>
        <option value="">All Departments</option>
        {departments.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
      </select>
      <select value={filters.faculty} onChange={(e) => setFilters((prev) => ({ ...prev, faculty: e.target.value }))} className={selectCls}>
        <option value="">All Faculty</option>
        {facultyOptions.map((row) => <option key={row.value} value={row.value}>{row.label}</option>)}
      </select>
      <select value={filters.program} onChange={(e) => setFilters((prev) => ({ ...prev, program: e.target.value, semester: '' }))} className={selectCls}>
        <option value="">All Programmes</option>
        {programs.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
      </select>
      <select value={filters.semester} onChange={(e) => setFilters((prev) => ({ ...prev, semester: e.target.value }))} className={selectCls}>
        <option value="">All Semesters</option>
        {semesterOptions.map((row) => <option key={row.value} value={row.value}>{row.label}</option>)}
      </select>
    </div>
  );

  return (
    <>
      <CrudTable
        title="Final Faculty-Subject Assignments"
        subtitle="Finalize the subject-to-faculty mapping that will be used before timetable generation."
        columns={COLS}
        rows={rows}
        onCreate={() => setOpen(true)}
        onEdit={null}
        onDelete={async (id) => {
          if (window.confirm('Delete final assignment?')) {
            await academicsApi.deleteFacultySubjectAssignment(id);
            await load();
          }
        }}
        loading={loading}
        filters={filtersNode}
        userRole={userRole}
        emptyMessage="No final subject assignments found."
      />

      <FormModal isOpen={open} onClose={() => setOpen(false)} title="Finalize Subject Assignment" onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
          await academicsApi.createFacultySubjectAssignment(form);
          setOpen(false);
          setForm({ faculty: '', course: '', notes: '', status: 'finalized' });
          await load();
        } catch (err) {
          alert(JSON.stringify(err.response?.data) || 'Failed to save final assignment.');
        } finally {
          setSaving(false);
        }
      }} saving={saving}>
        <div className="grid grid-cols-1 gap-4">
          <Field label="Faculty">
            <select className={selectCls} value={form.faculty} onChange={(e) => setForm((prev) => ({ ...prev, faculty: e.target.value, course: '' }))} required>
              <option value="">Select...</option>
              {facultyOptions.map((row) => <option key={row.value} value={row.value}>{row.label}</option>)}
            </select>
          </Field>
          <Field label="Approved Subject">
            <select className={selectCls} value={form.course} onChange={(e) => setForm((prev) => ({ ...prev, course: e.target.value }))} required>
              <option value="">Select...</option>
              {selectedFacultyEligible.map((row) => <option key={row.id} value={row.course}>{row.course_code} — {row.course_name}</option>)}
            </select>
          </Field>
          <Field label="Notes">
            <textarea className={inputCls} rows="3" value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
          </Field>
        </div>
      </FormModal>
    </>
  );
}
