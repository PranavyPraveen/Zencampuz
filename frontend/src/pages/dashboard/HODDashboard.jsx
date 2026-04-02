import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { academicsApi } from '../../api/academics';
import { useAuth } from '../../auth/AuthContext';
import {
  BookOpen,
  CalendarClock,
  ClipboardList,
  Loader2,
  Users,
  ArrowRight,
  AlertCircle,
  UserCheck,
  FileWarning,
  FolderKanban,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

function normalizeDashboardData(payload) {
  const safe = payload && typeof payload === 'object' ? payload : {};
  return {
    department_name: safe.department_name || 'Department',
    campus_name: safe.campus_name || '',
    summary: safe.summary && typeof safe.summary === 'object' ? safe.summary : {},
    faculty_directory: Array.isArray(safe.faculty_directory) ? safe.faculty_directory : [],
    faculty_preferences: Array.isArray(safe.faculty_preferences) ? safe.faculty_preferences : [],
    course_assignments: Array.isArray(safe.course_assignments) ? safe.course_assignments : [],
    leave_requests: Array.isArray(safe.leave_requests) ? safe.leave_requests : [],
    substitution_requests: Array.isArray(safe.substitution_requests) ? safe.substitution_requests : [],
    reports: safe.reports && typeof safe.reports === 'object' ? safe.reports : {},
  };
}

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

function StatCard({ icon: Icon, label, value, color, to }) {
  const content = (
    <div className="bg-surface/60 backdrop-blur-xl shadow-sm border border-border rounded-3xl p-6 transition-all hover:border-foreground/10 hover:shadow-lg group">
      <div className="flex items-start justify-between">
        <div className="p-3 rounded-2xl" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-3xl font-black text-foreground">{value ?? 0}</span>
          {to ? <ArrowRight className="w-4 h-4 text-foreground/25 transition-all group-hover:text-foreground/60 group-hover:translate-x-0.5" /> : null}
        </div>
      </div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-foreground/35 mt-4">{label}</p>
    </div>
  );
  return to ? <Link to={to} className="block hover:scale-[1.01] transition-transform">{content}</Link> : content;
}

function PreviewCard({ title, to, items, emptyText, renderItem }) {
  return (
    <div className="bg-surface/60 backdrop-blur-xl shadow-sm border border-border rounded-3xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
        <Link to={to} className="text-sm font-semibold text-[var(--primary)] inline-flex items-center gap-1">
          Open <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-foreground/35">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(renderItem)}
        </div>
      )}
    </div>
  );
}

export default function HODDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState('');

  const primaryColor = user?.tenant?.primary_color || '#22D3EE';

  async function load() {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/auth/hod-dashboard-stats/', {
        validateStatus: () => true,
      });

      if (response.status >= 200 && response.status < 300) {
        setData(normalizeDashboardData(response.data));
        setError('');
        return;
      }

      setError(response?.data?.error || response?.data?.detail || 'Failed to load HOD dashboard.');
    } catch (err) {
      console.error(err);
      try {
        const token = localStorage.getItem('access_token');
        const fallbackResponse = await fetch(`${api.defaults.baseURL}/auth/hod-dashboard-stats/`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          setData(normalizeDashboardData(fallbackData));
          setError('');
          return;
        }

        const fallbackBody = await fallbackResponse.json().catch(() => ({}));
        setError(fallbackBody?.error || fallbackBody?.detail || 'Failed to load HOD dashboard.');
      } catch (fallbackErr) {
        console.error(fallbackErr);
        setError(err?.response?.data?.error || err?.response?.data?.detail || 'Failed to load HOD dashboard.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

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

  const summary = data?.summary || {};
  const facultyDirectory = data?.faculty_directory || [];
  const facultyPreferences = data?.faculty_preferences || [];
  const courseAssignments = data?.course_assignments || [];
  const leaveRequests = data?.leave_requests || [];
  const substitutionRequests = data?.substitution_requests || [];
  const reports = data?.reports || {};

  const facultyOptions = useMemo(
    () => facultyDirectory.map((row) => ({
      id: String(row.profile_id || row.id),
      name: row.user_name || row.faculty_name || 'Faculty',
      specialization: row.primary_specialization_domain || row.specialization || row.designation || 'Specialization pending',
    })),
    [facultyDirectory]
  );

  const inboxRows = useMemo(() => {
    const filtered = facultyPreferences.filter((row) => {
      if (selectedFaculty && String(row.faculty_profile_id || row.faculty_id || row.faculty) !== String(selectedFaculty)) {
        return false;
      }
      return row.status === 'submitted' || row.status === 'hod_approved' || row.status === 'hod_rejected';
    });
    return filtered;
  }, [facultyPreferences, selectedFaculty]);

  const pendingPreferenceRows = inboxRows.filter((row) => row.status === 'submitted').slice(0, 5);
  const unassignedCourses = courseAssignments.filter((row) => !row.assigned_faculty_name).slice(0, 5);
  const pendingLeaves = leaveRequests.filter((row) => row.status === 'pending').slice(0, 5);
  const pendingSubs = substitutionRequests.filter((row) => row.status === 'pending').slice(0, 5);
  const overloadWarnings = courseAssignments.filter((row) => row.overload_warning).slice(0, 5);

  const reviewPreference = async (preferenceId, action) => {
    try {
      setActionLoadingId(preferenceId);
      if (action === 'approve') {
        await academicsApi.approveFacultyPreference(preferenceId);
      } else {
        await academicsApi.rejectFacultyPreference(preferenceId);
      }
      await load();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || `Failed to ${action} preference.`);
    } finally {
      setActionLoadingId('');
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-foreground/25">Department Control</p>
        <h1 className="text-4xl font-black text-foreground tracking-tight">HOD Dashboard</h1>
        <p className="text-sm text-foreground/45">
          {data?.department_name || 'Department'} {data?.campus_name ? `• ${data.campus_name}` : ''}
        </p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Department Faculty" value={summary.total_faculty || 0} color={primaryColor} to="/academics/faculty" />
        <StatCard icon={BookOpen} label="Department Courses" value={summary.total_courses || 0} color="#8B5CF6" to="/academics/programme-subjects" />
        <StatCard icon={FolderKanban} label="Sections / Batches" value={(summary.total_sections || 0) + (summary.total_batches || 0)} color="#10B981" to="/academics/batches" />
        <StatCard icon={ClipboardList} label="Pending Preferences" value={summary.pending_preferences || 0} color="#F59E0B" to="/academics/faculty-preferences" />
        <StatCard icon={FileWarning} label="Unassigned Courses" value={summary.unassigned_courses || 0} color="#EF4444" to="/academics/course-sections" />
        <StatCard icon={CalendarClock} label="Timetable Drafts" value={summary.timetable_draft_count || 0} color="#38BDF8" to="/timetable/department-view" />
        <StatCard icon={UserCheck} label="Pending Leaves" value={summary.pending_leave_requests || 0} color="#F97316" to="/timetable/substitutions" />
        <StatCard icon={Users} label="Pending Substitutions" value={summary.pending_substitution_requests || 0} color="#A855F7" to="/timetable/substitutions" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-6">
        <div className="bg-surface/60 backdrop-blur-xl shadow-sm border border-border rounded-3xl p-6 space-y-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground/25">Faculty Filter</p>
            <h3 className="text-lg font-bold text-foreground mt-2">Department Faculty</h3>
          </div>
          <select
            value={selectedFaculty}
            onChange={(e) => setSelectedFaculty(e.target.value)}
            className="w-full h-11 rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none"
          >
            <option value="">All Faculty</option>
            {facultyOptions.map((row) => (
              <option key={row.id} value={row.id}>{row.name}</option>
            ))}
          </select>
          <p className="text-xs text-foreground/35">
            Shows faculty in {data?.department_name || 'your department'} only.
          </p>
        </div>

        <div className="bg-surface/60 backdrop-blur-xl shadow-sm border border-border rounded-3xl overflow-hidden">
          <div className="px-6 py-5 border-b border-border flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-foreground">Faculty Preferences Inbox</h3>
              <p className="text-xs text-foreground/35 mt-1">Submitted faculty preference requests waiting for HOD review.</p>
            </div>
            <Link to="/academics/faculty-preferences" className="text-sm font-semibold text-[var(--primary)] inline-flex items-center gap-1">
              Open Full Review <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {inboxRows.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-foreground/35">
                No faculty preference requests found for the selected filter.
              </div>
            ) : (
              inboxRows.slice(0, 8).map((item) => (
                <div key={item.id} className="px-6 py-4 flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground">{item.faculty_name}</p>
                    <p className="text-xs text-foreground/40 mt-1">
                      {(item.primary_specialization_domain || item.specialization || 'Specialization pending')} • {(item.status_display || 'Submitted')}
                    </p>
                    <p className="text-sm text-foreground/70 mt-2">
                      {item.ranked_preferences?.length
                        ? `${item.faculty_name} has requested to teach ${item.ranked_preferences.map((subject) => subject.course_code).join(', ')}.`
                        : `${item.faculty_name} has submitted a preference request.`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => reviewPreference(item.id, 'approve')}
                      disabled={actionLoadingId === item.id || item.status === 'hod_approved'}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15 inline-flex items-center gap-2 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => reviewPreference(item.id, 'reject')}
                      disabled={actionLoadingId === item.id || item.status === 'hod_rejected'}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/15 inline-flex items-center gap-2 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <PreviewCard
          title="Faculty Preference Review"
          to="/academics/faculty-preferences"
          items={pendingPreferenceRows}
          emptyText="All faculty preferences are reviewed or already submitted."
          renderItem={(item) => (
            <div key={item.faculty_id || item.faculty_name} className="rounded-2xl bg-foreground/5 border border-border px-4 py-3">
              <p className="text-sm font-bold text-foreground">{item.faculty_name}</p>
              <p className="text-xs text-foreground/40">{item.designation || 'Faculty'} • {item.primary_specialization_domain || item.specialization || 'Specialization pending'}</p>
              <p className="text-[11px] text-foreground/35 mt-2">
                {item.ranked_preferences?.length
                  ? item.ranked_preferences.map((subject) => `${subject.rank}. ${subject.course_code}`).join(' | ')
                  : (item.qualification || 'Preference not submitted yet')}
              </p>
            </div>
          )}
        />

        <PreviewCard
          title="Course Assignment Gaps"
          to="/academics/course-sections"
          items={unassignedCourses}
          emptyText="All visible courses have faculty assignments."
          renderItem={(item) => (
            <div key={item.id} className="rounded-2xl bg-foreground/5 border border-border px-4 py-3">
              <p className="text-sm font-bold text-foreground">{item.course_code} • {item.course_name}</p>
              <p className="text-xs text-foreground/40">{item.program_name || 'Programme'} • {item.section_label || item.section_name || 'Section pending'} • Unassigned</p>
            </div>
          )}
        />

        <PreviewCard
          title="Pending Leave Requests"
          to="/timetable/substitutions"
          items={pendingLeaves}
          emptyText="No pending leave requests in your department."
          renderItem={(item) => (
            <div key={item.id} className="rounded-2xl bg-foreground/5 border border-border px-4 py-3">
              <p className="text-sm font-bold text-foreground">{item.faculty_name}</p>
              <p className="text-xs text-foreground/40">{item.date} • {item.reason || 'No reason provided'}</p>
            </div>
          )}
        />

        <PreviewCard
          title="Pending Substitutions"
          to="/timetable/substitutions"
          items={pendingSubs}
          emptyText="No pending substitutions in your department."
          renderItem={(item) => (
            <div key={item.id} className="rounded-2xl bg-foreground/5 border border-border px-4 py-3">
              <p className="text-sm font-bold text-foreground">{item.course_name || item.original_faculty_name || 'Department request'}</p>
              <p className="text-xs text-foreground/40">{item.substitute_faculty_name || 'Substitute pending'} • {item.status_display || item.status}</p>
            </div>
          )}
        />

        <PreviewCard
          title="Faculty Overload Watch"
          to="/academics/course-sections"
          items={overloadWarnings}
          emptyText="No faculty overload warnings in the current assignment set."
          renderItem={(item) => (
            <div key={item.id} className="rounded-2xl bg-foreground/5 border border-border px-4 py-3">
              <p className="text-sm font-bold text-foreground">{item.faculty_name}</p>
              <p className="text-xs text-foreground/40">{item.course_code} • {item.section_label || item.section_name || 'Section'}</p>
              <p className="text-[11px] text-amber-400 mt-2">Assigned load {item.assigned_load || 0} / max {item.max_weekly_hours || 0}</p>
            </div>
          )}
        />
      </div>

      <div className="bg-surface/60 backdrop-blur-xl shadow-sm border border-border rounded-3xl p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">Department Readiness</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="rounded-2xl bg-foreground/5 px-4 py-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground/25">Preference Submission</p>
            <p className="text-2xl font-black text-foreground mt-2">{formatPreferenceStatus(reports.preference_submission_status)}</p>
          </div>
          <div className="rounded-2xl bg-foreground/5 px-4 py-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground/25">Assigned Courses</p>
            <p className="text-2xl font-black text-foreground mt-2">{formatAssignmentStatus(reports.course_assignment_status || reports.assignment_status)}</p>
          </div>
          <div className="rounded-2xl bg-foreground/5 px-4 py-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground/25">Timetable Readiness</p>
            <p className="text-2xl font-black text-foreground mt-2">{formatTimetableReadiness(reports.timetable_readiness)}</p>
          </div>
          <div className="rounded-2xl bg-foreground/5 px-4 py-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground/25">Workload Summary</p>
            <p className="text-2xl font-black text-foreground mt-2">{formatWorkloadSummary(reports.faculty_workload_summary || reports.workload_summary)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
