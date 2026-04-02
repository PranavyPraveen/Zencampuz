import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { academicsApi } from '../../api/academics';
import { timetableApi } from '../../api/timetable';
import {
  BookOpen, Calendar, Bell, UserCheck, User,
  Settings2, ArrowRight, Loader2, AlertCircle, MapPin, Plus, CheckCircle2
} from 'lucide-react';

// ── Stat Card (simpler for Faculty) ───────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, to, sub }) {
  const content = (
    <div
      className="bg-background border border-border rounded-2xl p-5 flex flex-col gap-3 hover:border-border transition-all group relative overflow-hidden h-full"
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300" style={{ background: `radial-gradient(circle at top left, ${color}08, transparent 60%)` }} />
      <div className="flex items-start justify-between">
        <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {to && <ArrowRight className="w-4 h-4 text-foreground/20 group-hover:text-foreground/50 group-hover:translate-x-0.5 transition-all" />}
      </div>
      <div className="mt-auto pt-2">
        <p className="text-2xl font-black text-foreground tracking-tight">{value ?? '—'}</p>
        <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-foreground/30 mt-1">{sub}</p>}
      </div>
    </div>
  );
  return to ? <Link to={to} className="block h-full">{content}</Link> : <div className="h-full">{content}</div>;
}

// ── Quick Action ─────────────────────────────────────────────────────────────
function QuickAction({ icon: Icon, label, to, color }) {
  return (
    <Link to={to} className="group flex items-center gap-3 bg-background border border-border hover:border-border rounded-xl px-4 py-3 transition-all">
      <Icon className="w-4 h-4 transition-colors" style={{ color }} />
      <span className="text-sm font-medium text-foreground/60 group-hover:text-foreground/90 transition-colors">{label}</span>
      <ArrowRight className="w-3.5 h-3.5 text-foreground/20 group-hover:text-foreground/50 ml-auto transition-all group-hover:translate-x-0.5" />
    </Link>
  );
}

function StatusPill({ status, label }) {
  const colors = {
    pending: 'bg-amber-500/10 text-amber-400',
    approved: 'bg-emerald-500/10 text-emerald-400',
    rejected: 'bg-red-500/10 text-red-400',
    hod_approved: 'bg-blue-500/10 text-blue-400',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${colors[status] || 'bg-white/10 text-foreground/60'}`}>
      {label || status}
    </span>
  );
}

const DEFAULT_STATS = {
  today_classes_count: 0,
  weekly_classes_count: 0,
  pending_substitution_requests: 0,
  incoming_substitutions: 0,
  preference_status: 'Not Submitted',
  unread_notifications_count: 0,
  leave_pending_count: 0,
  leave_approved_count: 0,
  received_substitution_count: 0,
  bookings: {},
};

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function FacultyDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [facultyOptions, setFacultyOptions] = useState([]);
  const [classSessions, setClassSessions] = useState([]);
  const [profileSummary, setProfileSummary] = useState(null);
  const [preferenceSummary, setPreferenceSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ error: '', success: '' });
  const [leaveForm, setLeaveForm] = useState({
    date: '',
    reason: '',
    proposed_substitute: '',
    class_session: '',
  });
  
  const tenant = user?.tenant;
  const primaryColor = tenant?.primary_color || '#22D3EE';
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  const getFacultySessionParams = () => {
    const ids = [user?.id, user?.profile_id].filter(Boolean);
    return [...new Set(ids)].map((facultyId) => ({ faculty_id: facultyId }));
  };

  const load = async () => {
    try {
      setLoading(true);
      setFeedback((prev) => ({ ...prev, error: '' }));

      const statsRes = await api.get('/auth/faculty-dashboard-stats/');
      const dashboardData = statsRes?.data || {};
      setData({
        ...dashboardData,
        stats: {
          ...DEFAULT_STATS,
          ...(dashboardData?.stats || {}),
        },
        leave_requests: Array.isArray(dashboardData?.leave_requests) ? dashboardData.leave_requests : [],
        substitution_requests: Array.isArray(dashboardData?.substitution_requests) ? dashboardData.substitution_requests : [],
        received_substitutions: Array.isArray(dashboardData?.received_substitutions) ? dashboardData.received_substitutions : [],
        notifications: Array.isArray(dashboardData?.notifications) ? dashboardData.notifications : [],
      });

      const [facultyResult, sessionResults, profileResult, preferenceResult] = await Promise.allSettled([
        academicsApi.getFaculty(),
        Promise.allSettled(getFacultySessionParams().map((params) => timetableApi.getCalendarSessions(params))),
        academicsApi.getMyProfessionalProfile(),
        academicsApi.getMyPreference(),
      ]);

      setFacultyOptions(facultyResult.status === 'fulfilled' && Array.isArray(facultyResult.value) ? facultyResult.value : []);

      if (sessionResults.status === 'fulfilled') {
        const firstNonEmpty = sessionResults.value.find(
          (result) => result.status === 'fulfilled' && Array.isArray(result.value) && result.value.length > 0
        );
        const firstResolved = sessionResults.value.find((result) => result.status === 'fulfilled' && Array.isArray(result.value));
        setClassSessions(firstNonEmpty?.value || firstResolved?.value || []);
      } else {
        setClassSessions([]);
      }

      setProfileSummary(profileResult.status === 'fulfilled' ? profileResult.value : null);
      setPreferenceSummary(preferenceResult.status === 'fulfilled' ? preferenceResult.value : null);
    } catch (err) {
      console.error(err);
      setFeedback({ error: 'Failed to load faculty dashboard.', success: '' });
      setData({
        stats: DEFAULT_STATS,
        leave_requests: [],
        substitution_requests: [],
        received_substitutions: [],
        notifications: [],
      });
      setFacultyOptions([]);
      setClassSessions([]);
      setProfileSummary(null);
      setPreferenceSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      load();
    }
  }, [user?.id]);

  const availableSubstitutes = useMemo(
    () => facultyOptions.filter((item) => item.user !== user?.id),
    [facultyOptions, user?.id]
  );

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback({ error: '', success: '' });
    try {
      const leave = await timetableApi.createLeaveRequest({
        date: leaveForm.date,
        reason: leaveForm.reason,
        proposed_substitute: leaveForm.proposed_substitute || null,
      });

      if (leaveForm.class_session && leaveForm.proposed_substitute) {
        await timetableApi.createSubstitution({
          class_session: leaveForm.class_session,
          substitute_faculty: leaveForm.proposed_substitute,
          leave_request: leave.id,
          notes: leaveForm.reason,
        });
      }

      setLeaveForm({ date: '', reason: '', proposed_substitute: '', class_session: '' });
      setFeedback({ error: '', success: 'Leave request submitted successfully.' });
      await load();
    } catch (err) {
      setFeedback({ error: err?.response?.data?.error || 'Failed to submit leave request.', success: '' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  const {
    stats: rawStats,
    faculty_name,
    department_name,
    campus_name,
    assigned_campus_name,
    leave_requests = [],
    substitution_requests = [],
    received_substitutions = [],
    notifications = [],
  } = data || {};
  const stats = { ...DEFAULT_STATS, ...(rawStats || {}) };
  const hasNotifications = tenant?.has_notifications;
  const prefColor = stats.preference_status === 'Submitted' ? '#10B981' :
                    stats.preference_status === 'Not Submitted' ? '#EF4444' : '#F59E0B';
  const completionPercentage = Number(profileSummary?.profile?.profile_completion ?? 0);
  const approvedEligibleSubjects = Array.isArray(preferenceSummary?.approved_eligible_subjects) ? preferenceSummary.approved_eligible_subjects : [];
  const rankedPreferences = Array.isArray(preferenceSummary?.ranked_preferences) ? preferenceSummary.ranked_preferences : [];
  const profileCompletionMessage = preferenceSummary?.profile_completion_message || profileSummary?.profile_completion_message || 'Complete your profile to receive subject preferences.';
  const canSubmitPreferences = Boolean(preferenceSummary?.can_submit_preferences);

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-foreground/40 mb-1">{greeting} 👋</p>
          <h1 className="text-3xl font-black text-foreground tracking-tight">{faculty_name || user?.full_name}</h1>
          <div className="flex items-center gap-2 mt-2 text-sm text-foreground/40">
            {department_name && (
              <span className="px-2 py-0.5 rounded-md bg-foreground/5 border border-border">
                {department_name}
              </span>
            )}
            {(assigned_campus_name || campus_name) && (
              <span className="px-3 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] border border-[#22D3EE]/20 font-semibold flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" />
                Campus: {assigned_campus_name || campus_name}
              </span>
            )}
            <span className="hidden sm:inline">· {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* ── Academic Overview ── */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-foreground/30 mb-4">Academic Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard 
            icon={BookOpen} 
            label="Today's Classes" 
            value={stats.today_classes_count} 
            color={primaryColor} 
            to="/timetable/faculty-view" 
          />
          <StatCard 
            icon={Calendar} 
            label="Weekly Classes" 
            value={stats.weekly_classes_count} 
            color="#8B5CF6" 
            to="/timetable/faculty-view" 
          />
          <StatCard 
            icon={UserCheck} 
            label="Incoming Subs" 
            value={stats.incoming_substitutions} 
            color="#EC4899" 
            to="/timetable/substitutions" 
            sub={`${stats.pending_substitution_requests} raised`}
          />
          <StatCard 
            icon={Settings2} 
            label="My Preferences" 
            value={stats.preference_status || 'Not Submitted'} 
            color={prefColor} 
            to="/academics/faculty-preference" 
          />
          <StatCard
            icon={Bell}
            label="Notifications"
            value={stats.unread_notifications_count}
            color="#F59E0B"
            to="/notifications"
          />
          <StatCard
            icon={Calendar}
            label="Pending Leaves"
            value={stats.leave_pending_count}
            color="#FB7185"
            to="/timetable/substitutions"
          />
          <StatCard
            icon={CheckCircle2}
            label="Approved Leaves"
            value={stats.leave_approved_count}
            color="#10B981"
            to="/timetable/substitutions"
          />
          <StatCard
            icon={UserCheck}
            label="Received Subs"
            value={stats.received_substitution_count}
            color="#38BDF8"
            to="/timetable/substitutions"
          />
          <StatCard
            icon={User}
            label="Profile Completion"
            value={`${completionPercentage}%`}
            color={completionPercentage >= 70 ? '#10B981' : '#F59E0B'}
            to="/academics/my-profile"
            sub={profileSummary?.profile?.profile_is_complete ? 'Ready for preferences' : 'Update required'}
          />
          <StatCard
            icon={BookOpen}
            label="Approved Subjects"
            value={approvedEligibleSubjects.length}
            color="#8B5CF6"
            to="/academics/faculty-preference"
            sub={canSubmitPreferences ? 'Available for preference ranking' : 'Profile incomplete'}
          />
        </div>
      </div>

      {(feedback.error || feedback.success) && (
        <div className={`rounded-2xl p-4 border flex items-center gap-3 ${feedback.error ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
          {feedback.error ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <p className="text-sm font-medium">{feedback.error || feedback.success}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-background border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-foreground font-bold">Profile Readiness</h2>
            <Link to="/academics/my-profile" className="text-xs text-[var(--primary)]">Update profile</Link>
          </div>
          <div className="space-y-3">
            <div className="h-3 rounded-full bg-foreground/5 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${completionPercentage}%`, backgroundColor: completionPercentage >= 70 ? '#10B981' : primaryColor }} />
            </div>
            <p className="text-sm text-foreground/60">{profileCompletionMessage}</p>
            {!profileSummary?.profile?.profile_is_complete && Array.isArray(profileSummary?.profile?.profile_missing_fields) && profileSummary.profile.profile_missing_fields.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profileSummary.profile.profile_missing_fields.map((field) => (
                  <span key={field} className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                    {String(field).replaceAll('_', ' ')}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-emerald-400">Your academic profile is ready for subject preference submission.</p>
            )}
          </div>
        </div>

        <div className="bg-background border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-foreground font-bold">Approved Subject Pool</h2>
            <Link to="/academics/faculty-preference" className="text-xs text-[var(--primary)]">My preferences</Link>
          </div>
          {approvedEligibleSubjects.length === 0 ? (
            <p className="text-sm text-foreground/40">No HOD-approved subjects are available yet.</p>
          ) : (
            <div className="space-y-3">
              {approvedEligibleSubjects.slice(0, 5).map((item) => (
                <div key={item.id || `${item.course_code}-${item.semester_name}`} className="rounded-xl bg-background border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-foreground font-semibold">{item.course_code} · {item.course_name}</p>
                      <p className="text-xs text-foreground/50 mt-1">
                        {[item.program_name, item.semester_name, item.primary_domain_name].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <StatusPill status="hod_approved" label="Approved" />
                  </div>
                </div>
              ))}
              {rankedPreferences.length > 0 && (
                <p className="text-xs text-foreground/40">You have already ranked {rankedPreferences.length} subject preference(s).</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-background border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-foreground font-bold">Leave Requests</h2>
            <span className="text-xs text-foreground/40">{stats.leave_pending_count} pending</span>
          </div>
          <form onSubmit={handleLeaveSubmit} className="space-y-3">
            <input
              type="date"
              value={leaveForm.date}
              onChange={(e) => setLeaveForm((prev) => ({ ...prev, date: e.target.value }))}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-foreground"
              required
            />
            <textarea
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm((prev) => ({ ...prev, reason: e.target.value }))}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-foreground"
              rows={3}
              placeholder="Reason for leave"
              required
            />
            <select
              value={leaveForm.class_session}
              onChange={(e) => setLeaveForm((prev) => ({ ...prev, class_session: e.target.value }))}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-foreground"
            >
              <option value="">Select class session to cover</option>
              {classSessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.course_code} {session.course_name} - {session.day_display} ({session.time_slot_name})
                </option>
              ))}
            </select>
            <select
              value={leaveForm.proposed_substitute}
              onChange={(e) => setLeaveForm((prev) => ({ ...prev, proposed_substitute: e.target.value }))}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-foreground"
            >
              <option value="">Propose substitute teacher</option>
              {availableSubstitutes.map((faculty) => (
                <option key={faculty.user} value={faculty.user}>
                  {faculty.user_name} - {faculty.department_name}
                </option>
              ))}
            </select>
            <button type="submit" disabled={saving} className="w-full bg-[var(--primary)] hover:brightness-90 text-[#0F172A] font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Submit Leave
            </button>
          </form>
          <div className="space-y-3">
            {leave_requests.length === 0 ? (
              <p className="text-sm text-foreground/40">No leave requests yet.</p>
            ) : leave_requests.map((item) => (
              <div key={item.id} className="rounded-xl bg-background border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-foreground font-semibold">{item.date}</p>
                    <p className="text-sm text-foreground/50 mt-1">{item.reason}</p>
                    {item.proposed_substitute_name && <p className="text-xs text-[var(--primary)] mt-2">Proposed substitute: {item.proposed_substitute_name}</p>}
                  </div>
                  <StatusPill status={item.status} label={item.status_display} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-background border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-foreground font-bold">My Substitution Requests</h2>
              <Link to="/timetable/substitutions" className="text-xs text-[var(--primary)]">Manage</Link>
            </div>
            {substitution_requests.length === 0 ? (
              <p className="text-sm text-foreground/40">No substitution requests raised yet.</p>
            ) : substitution_requests.map((item) => (
              <div key={item.id} className="rounded-xl bg-background border border-border p-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-foreground font-semibold">{item.class_session_display}</p>
                  <p className="text-xs text-foreground/50 mt-1">Substitute: {item.substitute_faculty_name || 'Pending'}</p>
                </div>
                <StatusPill status={item.status} label={item.status_display} />
              </div>
            ))}
          </div>

          <div className="bg-background border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-foreground font-bold">Received Substitutions</h2>
              <Link to="/timetable/substitutions" className="text-xs text-[var(--primary)]">View all</Link>
            </div>
            {received_substitutions.length === 0 ? (
              <p className="text-sm text-foreground/40">No substitution requests received.</p>
            ) : received_substitutions.map((item) => (
              <div key={item.id} className="rounded-xl bg-background border border-border p-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-foreground font-semibold">{item.class_session_display}</p>
                  <p className="text-xs text-foreground/50 mt-1">Requested by {item.original_faculty_name}</p>
                </div>
                <StatusPill status={item.status} label={item.status_display} />
              </div>
            ))}
          </div>

          {(hasNotifications || notifications.length > 0) && (
            <div className="bg-background border border-border rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-foreground font-bold">Notifications</h2>
                <Link to="/notifications" className="text-xs text-[var(--primary)]">Inbox</Link>
              </div>
              {hasNotifications && notifications.length > 0 ? notifications.map((item) => (
                <div key={item.id} className="rounded-xl bg-background border border-border p-4">
                  <p className="text-foreground font-semibold">{item.title}</p>
                  <p className="text-sm text-foreground/50 mt-1">{item.message}</p>
                </div>
              )) : (
                <p className="text-sm text-foreground/40">No notifications.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Links ── */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-foreground/30 mb-4">Quick Shortcuts</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction icon={Calendar} label="My Timetable" to="/timetable/faculty-view" color={primaryColor} />
          <QuickAction icon={Calendar} label="Calendar View" to="/timetable/calendar" color="#10B981" />
          <QuickAction icon={BookOpen} label="My Courses" to="/academics/my-courses" color="#22D3EE" />
          <QuickAction icon={UserCheck} label="Faculty Directory" to="/academics/faculty" color="#8B5CF6" />
          <QuickAction icon={User} label="My Profile" to="/academics/my-profile" color="#F97316" />
          <QuickAction icon={Bell} label="Notifications" to="/notifications" color="#EC4899" />
        </div>
      </div>

    </div>
  );
}
