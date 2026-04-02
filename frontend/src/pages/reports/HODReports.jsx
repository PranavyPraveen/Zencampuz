import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../auth/AuthContext';
import { AlertCircle, Loader2, Search } from 'lucide-react';

function formatPreferenceStatus(value) {
  if (!value || typeof value !== 'object') return '0 / 0';
  return `${value.submitted || 0} submitted / ${value.pending || 0} pending`;
}

function formatAssignmentStatus(value) {
  if (!value || typeof value !== 'object') return '0 / 0';
  return `${value.assigned || 0} assigned / ${value.unassigned || 0} unassigned`;
}

function formatTimetableReadiness(value) {
  if (!value || typeof value !== 'object') return 'Draft';
  return `${value.draft_plans || 0} draft / ${value.published_plans || 0} published`;
}

function formatWorkloadSummary(value) {
  if (!Array.isArray(value)) return 'Pending';
  return `${value.length} faculty tracked`;
}

export default function HODReports() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const primaryColor = user?.tenant?.primary_color || '#22D3EE';

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError('');
        const response = await api.get('/auth/hod-dashboard-stats/');
        setData(response.data || {});
      } catch (err) {
        console.error(err);
        setError('Failed to load department reports.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const facultyDirectory = Array.isArray(data?.faculty_directory) ? data.faculty_directory : [];
  const courseAssignments = Array.isArray(data?.course_assignments) ? data.course_assignments : [];
  const courseReadiness = Array.isArray(data?.course_readiness) ? data.course_readiness : [];
  const reports = data?.reports || {};
  const facultyWorkloadSummary = Array.isArray(reports?.faculty_workload_summary) ? reports.faculty_workload_summary : [];

  const filteredFaculty = useMemo(() => {
    const query = search.trim().toLowerCase();
    const source = facultyWorkloadSummary.length > 0 ? facultyWorkloadSummary : facultyDirectory;
    if (!query) return source;
    return source.filter((row) =>
      [row.name, row.email, row.designation, row.employee_id, row.faculty_name, row.department].some((value) => value?.toLowerCase().includes(query))
    );
  }, [facultyDirectory, facultyWorkloadSummary, search]);

  const filteredAssignments = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return courseAssignments;
    return courseAssignments.filter((row) =>
      [row.course_code, row.course_name, row.assigned_faculty_name, row.section_label].some((value) => value?.toLowerCase().includes(query))
    );
  }, [courseAssignments, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 text-red-400">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <p className="text-sm font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight">Department Reports</h1>
          <p className="text-sm text-foreground/45 mt-2">
            {data?.department_name || 'Department'} • workload, assignment, and timetable readiness.
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search faculty or courses..."
            className="w-full bg-foreground/5 border border-border rounded-2xl pl-12 pr-4 py-3 text-foreground focus:border-blue-500/50 outline-none placeholder:text-foreground/15"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-3xl bg-surface/60 backdrop-blur-xl shadow-sm border border-border p-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground/25">Workload Summary</p>
          <p className="text-2xl font-black text-foreground mt-2">{formatWorkloadSummary(facultyWorkloadSummary || reports.workload_summary)}</p>
        </div>
        <div className="rounded-3xl bg-surface/60 backdrop-blur-xl shadow-sm border border-border p-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground/25">Assignment Status</p>
          <p className="text-2xl font-black text-foreground mt-2">{formatAssignmentStatus(reports.course_assignment_status || reports.assignment_status)}</p>
        </div>
        <div className="rounded-3xl bg-surface/60 backdrop-blur-xl shadow-sm border border-border p-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground/25">Preference Status</p>
          <p className="text-2xl font-black text-foreground mt-2">{formatPreferenceStatus(reports.preference_submission_status)}</p>
        </div>
        <div className="rounded-3xl bg-surface/60 backdrop-blur-xl shadow-sm border border-border p-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground/25">Timetable Readiness</p>
          <p className="text-2xl font-black text-foreground mt-2">{formatTimetableReadiness(reports.timetable_readiness)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-surface/60 backdrop-blur-xl shadow-sm border border-border rounded-3xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">Faculty Workload Summary</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-xs uppercase tracking-wider text-foreground/25">
                <tr>
                  <th className="px-6 py-3">Faculty</th>
                  <th className="px-6 py-3">Designation</th>
                  <th className="px-6 py-3">Max Hours</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-foreground/75">
                {filteredFaculty.length === 0 ? (
                  <tr><td colSpan="4" className="px-6 py-8 text-center text-foreground/35">No faculty found.</td></tr>
                ) : filteredFaculty.map((row) => (
                  <tr key={row.id || row.faculty_name}>
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground">{row.name || row.faculty_name}</div>
                      <div className="text-xs text-foreground/35">{row.email || row.employee_id || '—'}</div>
                    </td>
                    <td className="px-6 py-4">{row.designation || row.department || 'Not Set'}</td>
                    <td className="px-6 py-4">{row.max_weekly_hours ?? '—'}</td>
                    <td className="px-6 py-4">{row.status || 'active'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-surface/60 backdrop-blur-xl shadow-sm border border-border rounded-3xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">Course Assignment Status</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-xs uppercase tracking-wider text-foreground/25">
                <tr>
                  <th className="px-6 py-3">Course</th>
                  <th className="px-6 py-3">Section</th>
                  <th className="px-6 py-3">Assigned Faculty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-foreground/75">
                {filteredAssignments.length === 0 ? (
                  <tr><td colSpan="3" className="px-6 py-8 text-center text-foreground/35">No assignments found.</td></tr>
                ) : filteredAssignments.map((row) => (
                  <tr key={row.id}>
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground">{row.course_code}</div>
                      <div className="text-xs text-foreground/35">{row.course_name}</div>
                    </td>
                    <td className="px-6 py-4">{row.section_label || row.section_name || '—'}</td>
                    <td className="px-6 py-4">{row.assigned_faculty_name || 'Unassigned'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-surface/60 backdrop-blur-xl shadow-sm border border-border rounded-3xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Department Course Readiness</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-xs uppercase tracking-wider text-foreground/25">
              <tr>
                <th className="px-6 py-3">Code</th>
                <th className="px-6 py-3">Course</th>
                <th className="px-6 py-3">Semester</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Theory</th>
                <th className="px-6 py-3">Practical</th>
                <th className="px-6 py-3">Tutorial</th>
                <th className="px-6 py-3">Weekly Load</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-foreground/75">
              {courseReadiness.length === 0 ? (
                <tr><td colSpan="8" className="px-6 py-8 text-center text-foreground/35">No department courses found.</td></tr>
              ) : courseReadiness.map((row) => (
                <tr key={row.id}>
                  <td className="px-6 py-4 font-bold text-foreground">{row.code}</td>
                  <td className="px-6 py-4">{row.name}</td>
                  <td className="px-6 py-4">{row.semester_name || '—'}</td>
                  <td className="px-6 py-4">{row.course_type_display || row.course_type || '—'}</td>
                  <td className="px-6 py-4">{row.lecture_hours ?? 0}</td>
                  <td className="px-6 py-4">{row.practical_hours ?? 0}</td>
                  <td className="px-6 py-4">{row.tutorial_hours ?? 0}</td>
                  <td className="px-6 py-4">{row.total_hours ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
