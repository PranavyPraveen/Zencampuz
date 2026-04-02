import { useEffect, useMemo, useState } from 'react';
import { academicsApi } from '../../api/academics';
import { FormModal, Field, inputCls, selectCls } from '../../components/academics/AcademicCrud';
import { useAuth } from '../../auth/AuthContext';
import { Loader2, Plus, RotateCcw, ShieldCheck } from 'lucide-react';

function badgeClasses(status) {
  if (status === 'hod_approved' || status === 'hod_added' || status === 'finalized') return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  if (status === 'hod_rejected') return 'bg-red-500/10 text-red-400 border border-red-500/20';
  return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
}

export default function EligibleSubjectPool() {
  const { user } = useAuth();
  const primaryColor = user?.tenant?.primary_color || '#22D3EE';

  const [eligibleRows, setEligibleRows] = useState([]);
  const [assignmentRows, setAssignmentRows] = useState([]);
  const [preferenceRows, setPreferenceRows] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ faculty: '', course: '', notes: '' });

  const departmentId = user?.department_id || '';
  const [filters, setFilters] = useState({
    department: departmentId,
    faculty: '',
    specialization: '',
    program: '',
    domain: '',
    status: '',
    subject: '',
  });

  useEffect(() => {
    if (departmentId) {
      setFilters((prev) => ({ ...prev, department: prev.department || departmentId }));
    }
  }, [departmentId]);

  const load = async () => {
    setLoading(true);
    try {
      const eligibleParams = {};
      const assignmentParams = {};
      if (departmentId) {
        eligibleParams.department_id = departmentId;
        assignmentParams.department_id = departmentId;
      }
      if (filters.faculty) {
        eligibleParams.faculty_id = filters.faculty;
        assignmentParams.faculty_id = filters.faculty;
      }
      if (filters.program) {
        eligibleParams.program_id = filters.program;
        assignmentParams.program_id = filters.program;
      }
      if (filters.status) eligibleParams.status = filters.status;

      const [poolRows, finalRows, prefRows, facultyRows, programRows, courseRows] = await Promise.all([
        academicsApi.getFacultyEligibleSubjects(eligibleParams),
        academicsApi.getFacultySubjectAssignments(assignmentParams),
        academicsApi.getFacultyPreferences(departmentId ? { department: departmentId } : {}),
        academicsApi.getFaculty(departmentId ? { department_id: departmentId } : {}),
        academicsApi.getPrograms(departmentId ? { department_id: departmentId } : {}),
        academicsApi.getCourses(departmentId ? { department_id: departmentId } : {}),
      ]);

      setEligibleRows(Array.isArray(poolRows) ? poolRows : []);
      setAssignmentRows(Array.isArray(finalRows) ? finalRows : []);
      setPreferenceRows(Array.isArray(prefRows) ? prefRows : []);
      setFaculty(Array.isArray(facultyRows) ? facultyRows.filter((row) => row.profile_id) : []);
      setPrograms(Array.isArray(programRows) ? programRows : []);
      setCourses(Array.isArray(courseRows) ? courseRows : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [departmentId, filters.faculty, filters.program, filters.status]);

  const courseMap = useMemo(
    () => Object.fromEntries(courses.map((row) => [String(row.id), row])),
    [courses]
  );

  const facultyMap = useMemo(
    () => Object.fromEntries(faculty.map((row) => [String(row.profile_id), row])),
    [faculty]
  );

  const domainOptions = useMemo(() => {
    const unique = new Map();
    courses.forEach((row) => {
      if (row.primary_domain && row.primary_domain_name) {
        unique.set(String(row.primary_domain), { id: String(row.primary_domain), name: row.primary_domain_name });
      }
    });
    return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [courses]);

  const specializationOptions = useMemo(() => {
    const unique = new Map();
    eligibleRows.forEach((row) => {
      if (row.faculty_primary_domain_name) unique.set(row.faculty_primary_domain_name, row.faculty_primary_domain_name);
    });
    faculty.forEach((row) => {
      const value = row.primary_specialization_domain_name || row.primary_specialization_domain || row.specialization;
      if (value) unique.set(value, value);
    });
    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b));
  }, [eligibleRows, faculty]);

  const departmentOptions = useMemo(() => {
    const unique = new Map();
    faculty.forEach((row) => {
      if (row.department && row.department_name) {
        unique.set(String(row.department), { id: String(row.department), name: row.department_name });
      }
    });
    if (departmentId && user?.department) {
      unique.set(String(departmentId), { id: String(departmentId), name: user.department });
    }
    return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [faculty, departmentId, user]);

  const filteredEligibleRows = useMemo(() => {
    const subjectQuery = filters.subject.trim().toLowerCase();
    const rows = eligibleRows.filter((row) => {
      const course = courseMap[String(row.course)];
      const facultyRow = facultyMap[String(row.faculty)];
      if (filters.domain && String(course?.primary_domain) !== String(filters.domain) && String(course?.secondary_domain) !== String(filters.domain)) {
        return false;
      }
      if (filters.specialization && String(row.faculty_primary_domain_name || facultyRow?.primary_specialization_domain_name || facultyRow?.specialization || '') !== String(filters.specialization)) {
        return false;
      }
      if (filters.department && String(facultyRow?.department || departmentId) !== String(filters.department)) {
        return false;
      }
      if (subjectQuery) {
        const haystack = `${row.course_code || ''} ${row.course_name || ''}`.toLowerCase();
        if (!haystack.includes(subjectQuery)) return false;
      }
      return true;
    });
    return [...rows].sort((a, b) => {
      const prefA = Number(Boolean(selectedPreferenceMap[String(a.faculty)]?.has(String(a.course))));
      const prefB = Number(Boolean(selectedPreferenceMap[String(b.faculty)]?.has(String(b.course))));
      const scoreA = Number(a.score || 0);
      const scoreB = Number(b.score || 0);
      return prefB - prefA || scoreB - scoreA || String(a.course_code || '').localeCompare(String(b.course_code || ''));
    });
  }, [eligibleRows, filters.domain, filters.specialization, filters.subject, filters.department, courseMap, facultyMap, departmentId]);

  const filteredAssignments = useMemo(() => {
    const subjectQuery = filters.subject.trim().toLowerCase();
    return assignmentRows.filter((row) => {
      const course = courseMap[String(row.course)];
      const facultyRow = facultyMap[String(row.faculty)];
      if (filters.domain && String(course?.primary_domain) !== String(filters.domain) && String(course?.secondary_domain) !== String(filters.domain)) {
        return false;
      }
      if (filters.specialization && String(facultyRow?.primary_specialization_domain_name || facultyRow?.specialization || '') !== String(filters.specialization)) {
        return false;
      }
      if (filters.department && String(facultyRow?.department || departmentId) !== String(filters.department)) {
        return false;
      }
      if (subjectQuery) {
        const haystack = `${row.course_code || ''} ${row.course_name || ''}`.toLowerCase();
        if (!haystack.includes(subjectQuery)) return false;
      }
      return true;
    });
  }, [assignmentRows, filters.domain, filters.specialization, filters.subject, filters.department, courseMap, facultyMap, departmentId]);

  const selectedPreference = useMemo(() => {
    if (!filters.faculty) return null;
    return preferenceRows.find((row) => String(row.faculty) === String(filters.faculty)) || null;
  }, [preferenceRows, filters.faculty]);

  const selectedPreferenceMap = useMemo(() => {
    const map = {};
    preferenceRows.forEach((row) => {
      map[String(row.faculty)] = new Set((row.ranked_preferences || []).map((item) => String(item.course)));
    });
    return map;
  }, [preferenceRows]);

  const preferredSubjectIds = new Set((selectedPreference?.ranked_preferences || []).map((row) => String(row.course)));

  const availableCourses = useMemo(() => {
    return courses.filter((row) => {
      if (filters.program && String(row.program_id) !== String(filters.program)) return false;
      if (filters.domain && String(row.primary_domain) !== String(filters.domain) && String(row.secondary_domain) !== String(filters.domain)) return false;
      return true;
    });
  }, [courses, filters.program, filters.domain]);

  const finalizeSubject = async (row) => {
    setActionLoadingId(row.id);
    try {
      await academicsApi.createFacultySubjectAssignment({
        faculty: row.faculty,
        course: row.course,
        status: 'finalized',
        notes: '',
      });
      await load();
    } catch (err) {
      alert(JSON.stringify(err.response?.data) || 'Failed to finalize subject.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const reviewEligible = async (row, action) => {
    setActionLoadingId(row.id);
    try {
      if (action === 'approve') await academicsApi.approveFacultyEligibleSubject(row.id);
      else await academicsApi.rejectFacultyEligibleSubject(row.id);
      await load();
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tight">Eligible Subjects</h1>
            <p className="text-foreground/40 text-sm mt-1">
              Review faculty preferences, eligible subjects, and final assignments in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => academicsApi.regenerateFacultyEligibleSubjects().then(load)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-surface border border-border text-foreground hover:bg-foreground/5 inline-flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> Regenerate
            </button>
            <button onClick={() => setOpen(true)} className="px-4 py-2 rounded-xl text-sm font-semibold text-[#0F172A] inline-flex items-center gap-2" style={{ backgroundColor: primaryColor }}>
              <Plus className="w-4 h-4" /> Add Subject
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface/60 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30">Department</label>
              <select value={filters.department || departmentId} onChange={(e) => setFilters((prev) => ({ ...prev, department: e.target.value }))} className={`${selectCls} h-10 py-2 text-sm`}>
                <option value="">All Departments</option>
                {departmentOptions.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30">Faculty</label>
              <select value={filters.faculty} onChange={(e) => setFilters((prev) => ({ ...prev, faculty: e.target.value }))} className={`${selectCls} h-10 py-2 text-sm`}>
                <option value="">All Faculty</option>
                {faculty.map((row) => <option key={row.profile_id} value={row.profile_id}>{row.user_name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30">Specialization</label>
              <select value={filters.specialization} onChange={(e) => setFilters((prev) => ({ ...prev, specialization: e.target.value }))} className={`${selectCls} h-10 py-2 text-sm`}>
                <option value="">All Specializations</option>
                {specializationOptions.map((row) => <option key={row} value={row}>{row}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30">Programme</label>
              <select value={filters.program} onChange={(e) => setFilters((prev) => ({ ...prev, program: e.target.value }))} className={`${selectCls} h-10 py-2 text-sm`}>
                <option value="">All Programmes</option>
                {programs.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30">Domain</label>
              <select value={filters.domain} onChange={(e) => setFilters((prev) => ({ ...prev, domain: e.target.value }))} className={`${selectCls} h-10 py-2 text-sm`}>
                <option value="">All Domains</option>
                {domainOptions.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30">Status</label>
              <select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))} className={`${selectCls} h-10 py-2 text-sm`}>
                <option value="">All Statuses</option>
                <option value="auto_suggested">Auto Suggested</option>
                <option value="hod_approved">Approved</option>
                <option value="hod_rejected">Rejected</option>
                <option value="hod_added">HOD Added</option>
              </select>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto] gap-3 items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30">Subject</label>
              <input
                type="text"
                value={filters.subject}
                onChange={(e) => setFilters((prev) => ({ ...prev, subject: e.target.value }))}
                placeholder="Search subject code or name..."
                className={`${inputCls} h-10 py-2 text-sm`}
              />
            </div>
            <button
              type="button"
              onClick={() => setFilters({ department: departmentId, faculty: '', specialization: '', program: '', domain: '', status: '', subject: '' })}
              className="px-4 h-10 rounded-xl text-xs font-bold bg-foreground/5 border border-border text-foreground/60 hover:text-foreground"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {filters.faculty && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 rounded-3xl border border-border bg-surface/60 p-5">
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <h2 className="text-lg font-bold text-foreground">Faculty Preferred Subjects</h2>
                  <p className="text-xs text-foreground/35">Top 3 subjects selected by the faculty appear here first.</p>
                </div>
              </div>
              {!selectedPreference?.ranked_preferences?.length ? (
                <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-foreground/35">
                  No saved subject preferences for the selected faculty.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {selectedPreference.ranked_preferences.map((row) => (
                    <div key={row.id} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Preference {row.rank}</p>
                      <p className="mt-2 text-sm font-bold text-foreground">{row.course_code}</p>
                      <p className="text-xs text-foreground/55 mt-1">{row.course_name}</p>
                      <p className="text-[11px] text-foreground/35 mt-2">{row.program_name || 'Programme'} / {row.semester_name || 'Semester'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-border bg-surface/60 p-5">
              <h2 className="text-lg font-bold text-foreground">Review Status</h2>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-foreground/5 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/25">Preference Status</p>
                  <p className="mt-2 text-lg font-black text-foreground">{selectedPreference?.status_display || 'Draft'}</p>
                </div>
                <div className="rounded-2xl bg-foreground/5 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/25">Eligible Subjects</p>
                  <p className="mt-2 text-lg font-black text-foreground">{filteredEligibleRows.filter((row) => String(row.faculty) === String(filters.faculty)).length}</p>
                </div>
                <div className="rounded-2xl bg-foreground/5 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/25">Final Assignments</p>
                  <p className="mt-2 text-lg font-black text-foreground">{filteredAssignments.filter((row) => String(row.faculty) === String(filters.faculty)).length}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-3xl border border-border bg-surface/60 overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">Eligible Subjects</h2>
            <p className="text-xs text-foreground/35 mt-1">Subjects selected by faculty appear first, followed by the remaining eligible subjects.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[10px] uppercase tracking-[0.2em] text-foreground/25">
                <tr>
                  <th className="px-6 py-3">Faculty</th>
                  <th className="px-6 py-3">Preference</th>
                  <th className="px-6 py-3">Subject</th>
                  <th className="px-6 py-3">Domain</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Score</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-foreground/75">
                {loading ? (
                  <tr><td colSpan="7" className="px-6 py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--primary)]" /></td></tr>
                ) : filteredEligibleRows.length === 0 ? (
                  <tr><td colSpan="7" className="px-6 py-10 text-center text-foreground/35">No eligible subject suggestions found.</td></tr>
                ) : filteredEligibleRows.map((row) => {
                  const preferred = preferredSubjectIds.has(String(row.course)) || selectedPreferenceMap[String(row.faculty)]?.has(String(row.course));
                  return (
                    <tr key={row.id} className={preferred ? 'bg-emerald-500/[0.04]' : ''}>
                      <td className="px-6 py-4">
                        <div className="font-bold text-foreground">{row.faculty_name}</div>
                        <div className="text-xs text-foreground/35">{row.faculty_primary_domain_name || row.faculty_designation || 'Faculty'}</div>
                      </td>
                      <td className="px-6 py-4">{preferred ? <span className="inline-flex px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider">Selected</span> : <span className="text-foreground/25">—</span>}</td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-foreground">{row.course_code}</div>
                        <div className="text-xs text-foreground/35">{row.course_name}</div>
                      </td>
                      <td className="px-6 py-4">{row.primary_domain_name || '—'}</td>
                      <td className="px-6 py-4"><span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${badgeClasses(row.status)}`}>{row.status_display}</span></td>
                      <td className="px-6 py-4">{row.score ?? '—'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" onClick={() => reviewEligible(row, 'approve')} disabled={actionLoadingId === row.id} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15">
                            Approve
                          </button>
                          <button type="button" onClick={() => reviewEligible(row, 'reject')} disabled={actionLoadingId === row.id} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/15">
                            Reject
                          </button>
                          <button type="button" onClick={() => finalizeSubject(row)} disabled={actionLoadingId === row.id} className="px-3 py-1.5 rounded-xl text-xs font-bold" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor, border: `1px solid ${primaryColor}40` }}>
                            Finalize
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-surface/60 overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">Final Assignments</h2>
            <p className="text-xs text-foreground/35 mt-1">Final approved subjects assigned to faculty for teaching.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[10px] uppercase tracking-[0.2em] text-foreground/25">
                <tr>
                  <th className="px-6 py-3">Faculty</th>
                  <th className="px-6 py-3">Subject</th>
                  <th className="px-6 py-3">Programme</th>
                  <th className="px-6 py-3">Semester</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-foreground/75">
                {loading ? (
                  <tr><td colSpan="5" className="px-6 py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--primary)]" /></td></tr>
                ) : filteredAssignments.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-10 text-center text-foreground/35">No final subject assignments found.</td></tr>
                ) : filteredAssignments.map((row) => (
                  <tr key={row.id}>
                    <td className="px-6 py-4">{row.faculty_name}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground">{row.course_code}</div>
                      <div className="text-xs text-foreground/35">{row.course_name}</div>
                    </td>
                    <td className="px-6 py-4">{row.program_name || '—'}</td>
                    <td className="px-6 py-4">{row.semester_name || '—'}</td>
                    <td className="px-6 py-4"><span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${badgeClasses(row.status)}`}>{row.status_display}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <FormModal isOpen={open} onClose={() => setOpen(false)} title="Add Eligible Subject" onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
          await academicsApi.addFacultyEligibleSubject(form);
          setOpen(false);
          setForm({ faculty: '', course: '', notes: '' });
          await load();
        } catch (err) {
          alert(JSON.stringify(err.response?.data) || 'Failed to add eligible subject.');
        } finally {
          setSaving(false);
        }
      }} saving={saving}>
        <div className="grid grid-cols-1 gap-4">
          <Field label="Faculty">
            <select className={selectCls} value={form.faculty} onChange={(e) => setForm((prev) => ({ ...prev, faculty: e.target.value }))} required>
              <option value="">Select...</option>
              {faculty.map((row) => <option key={row.profile_id} value={row.profile_id}>{row.user_name}</option>)}
            </select>
          </Field>
          <Field label="Subject">
            <select className={selectCls} value={form.course} onChange={(e) => setForm((prev) => ({ ...prev, course: e.target.value }))} required>
              <option value="">Select...</option>
              {availableCourses.map((row) => <option key={row.id} value={row.id}>{row.code} — {row.name}</option>)}
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
