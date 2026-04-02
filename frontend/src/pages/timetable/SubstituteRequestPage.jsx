import { useEffect, useMemo, useState } from 'react';
import { timetableApi } from '../../api/timetable';
import { academicsApi } from '../../api/academics';
import { useAuth } from '../../auth/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { CalendarOff, UserCheck, Plus, Check, X, Loader2, AlertCircle } from 'lucide-react';

const inputCls = 'bg-background border border-border text-foreground rounded-xl px-3 py-2 text-sm w-full focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]';
const selectCls = inputCls;

const STATUS_COLORS = {
  pending:      'bg-amber-500/20 text-amber-400',
  hod_approved: 'bg-blue-500/20 text-blue-400',
  hod_rejected: 'bg-red-500/20 text-red-400',
  approved:     'bg-emerald-500/20 text-emerald-400',
  rejected:     'bg-red-500/20 text-red-400',
};

export default function SubstituteRequestPage() {
  const { user } = useAuth();
  const { isTenantAdmin, isCampusAdmin, isHOD } = usePermissions();
  const canManageRequests = isTenantAdmin || isCampusAdmin || isHOD;

  const [leaveRequests, setLeaveRequests] = useState([]);
  const [subRequests, setSubRequests] = useState([]);
  const [classSessions, setClassSessions] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ error: '', success: '' });

  // Forms
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [showSubForm, setShowSubForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ date: '', reason: '', class_session: '', proposed_substitute: '' });
  const [subForm, setSubForm] = useState({ class_session: '', substitute_faculty: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('leave'); // 'leave' | 'sub'

  const sessionRequestParams = useMemo(() => {
    const ids = [user?.id, user?.profile_id].filter(Boolean);
    return [...new Set(ids)].map((facultyId) => ({ faculty_id: facultyId }));
  }, [user?.id, user?.profile_id]);

  const load = async () => {
    try {
      setLoading(true);
      setFeedback((prev) => ({ ...prev, error: '' }));

      const [leaveResult, substitutionResult, facultyResult, sessionResult] = await Promise.allSettled([
        timetableApi.getLeaveRequests(),
        timetableApi.getSubstitutionRequests(),
        academicsApi.getFaculty(),
        Promise.allSettled(sessionRequestParams.map((params) => timetableApi.getCalendarSessions(params))),
      ]);

      setLeaveRequests(leaveResult.status === 'fulfilled' && Array.isArray(leaveResult.value) ? leaveResult.value : []);
      setSubRequests(substitutionResult.status === 'fulfilled' && Array.isArray(substitutionResult.value) ? substitutionResult.value : []);
      setFaculties(facultyResult.status === 'fulfilled' && Array.isArray(facultyResult.value) ? facultyResult.value : []);

      if (sessionResult.status === 'fulfilled') {
        const firstNonEmpty = sessionResult.value.find(
          (result) => result.status === 'fulfilled' && Array.isArray(result.value) && result.value.length > 0
        );
        const firstResolved = sessionResult.value.find((result) => result.status === 'fulfilled' && Array.isArray(result.value));
        setClassSessions(firstNonEmpty?.value || firstResolved?.value || []);
      } else {
        setClassSessions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const currentFacultyProfile = useMemo(
    () => faculties.find((item) => String(item.user) === String(user?.profile_id || user?.id)),
    [faculties, user?.id, user?.profile_id]
  );

  const availableSubstitutes = useMemo(() => {
    const base = faculties.filter((item) => String(item.user) !== String(user?.id));
    const departmentMatches = currentFacultyProfile?.department
      ? base.filter((item) => String(item.department) === String(currentFacultyProfile.department))
      : [];
    const campusMatches = currentFacultyProfile?.campus_id
      ? base.filter((item) => String(item.campus_id) === String(currentFacultyProfile.campus_id))
      : [];

    if (departmentMatches.length > 0) return departmentMatches;
    if (campusMatches.length > 0) return campusMatches;
    return base;
  }, [currentFacultyProfile?.campus_id, currentFacultyProfile?.department, faculties, user?.id]);

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    if (!leaveForm.date || !leaveForm.reason.trim()) {
      setFeedback({ error: 'Leave date and reason are required.', success: '' });
      return;
    }
    if (!leaveForm.class_session) {
      setFeedback({ error: 'Please select a class session to cover.', success: '' });
      return;
    }
    if (!leaveForm.proposed_substitute) {
      setFeedback({ error: 'Please select a substitute teacher.', success: '' });
      return;
    }

    setSaving(true);
    try {
      const leave = await timetableApi.createLeaveRequest({
        date: leaveForm.date,
        reason: leaveForm.reason,
        proposed_substitute: leaveForm.proposed_substitute,
      });

      await timetableApi.createSubstitution({
        class_session: leaveForm.class_session,
        substitute_faculty: leaveForm.proposed_substitute,
        leave_request: leave.id,
        notes: leaveForm.reason,
      });

      setLeaveForm({ date: '', reason: '', class_session: '', proposed_substitute: '' });
      setShowLeaveForm(false);
      setFeedback({ error: '', success: 'Leave request submitted successfully.' });
      await load();
    } catch (err) {
      setFeedback({
        error: err?.response?.data?.error || 'Failed to submit leave request.',
        success: '',
      });
    } finally { setSaving(false); }
  };

  const handleSubSubmit = async (e) => {
    e.preventDefault();
    if (!subForm.class_session) {
      setFeedback({ error: 'Please select a class session to cover.', success: '' });
      return;
    }
    if (!subForm.substitute_faculty) {
      setFeedback({ error: 'Please select a substitute teacher.', success: '' });
      return;
    }

    setSaving(true);
    try {
      await timetableApi.createSubstitution({ ...subForm, original_faculty: user.id });
      setSubForm({ class_session: '', substitute_faculty: '', notes: '' });
      setShowSubForm(false);
      setFeedback({ error: '', success: 'Substitution request submitted successfully.' });
      await load();
    } catch (err) {
      setFeedback({
        error: err?.response?.data?.error || 'Failed to submit substitution request.',
        success: '',
      });
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <CalendarOff className="w-6 h-6 text-[var(--primary)]" /> Leave & Substitute Management
        </h2>
        <p className="text-muted text-sm mt-1">Manage faculty leave requests and arrange substitute teachers for class coverage.</p>
      </div>

      {(feedback.error || feedback.success) && (
        <div className={`rounded-2xl p-4 border flex items-center gap-3 ${feedback.error ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{feedback.error || feedback.success}</p>
        </div>
      )}

      {/* Section Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'leave', label: 'Leave Requests', icon: CalendarOff },
          { id: 'sub', label: 'Substitution Requests', icon: UserCheck },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              activeSection === tab.id ? 'bg-[var(--primary)] text-[#0F172A]' : 'bg-foreground/5 text-muted hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-muted flex items-center justify-center py-20 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading requests...
        </div>
      ) : (
        <>
          {/* LEAVE REQUESTS */}
          {activeSection === 'leave' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-foreground font-bold text-lg">Leave Requests</h3>
                <button
                  onClick={() => setShowLeaveForm(v => !v)}
                  className="flex items-center gap-2 bg-[var(--primary)] text-[#0F172A] px-4 py-2 rounded-xl font-bold text-sm"
                >
                  <Plus className="w-4 h-4" /> Request Leave
                </button>
              </div>

              {showLeaveForm && (
                <form onSubmit={handleLeaveSubmit} className="bg-surface border border-border rounded-2xl p-5 space-y-4">
                  <h4 className="text-foreground font-bold">New Leave Request</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted mb-1 block">Leave Date</label>
                      <input
                        type="date"
                        required
                        style={{ colorScheme: 'dark' }}
                        className={inputCls}
                        value={leaveForm.date}
                        onChange={e => setLeaveForm(f => ({ ...f, date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted mb-1 block">Class Session</label>
                      <select required className={selectCls} value={leaveForm.class_session} onChange={e => setLeaveForm(f => ({ ...f, class_session: e.target.value }))}>
                        <option value="">{classSessions.length ? 'Select class session to cover' : 'No class sessions available for substitution.'}</option>
                        {classSessions.map(cs => <option key={cs.id} value={cs.id}>{cs.course_code} {cs.course_name} — {cs.day_display} ({cs.time_slot_name})</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-muted mb-1 block">Reason</label>
                      <textarea required className={inputCls} rows={3} value={leaveForm.reason} onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))} placeholder="Briefly explain the reason for leave..."></textarea>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-muted mb-1 block">Proposed Substitute</label>
                      <select required className={selectCls} value={leaveForm.proposed_substitute} onChange={e => setLeaveForm(f => ({ ...f, proposed_substitute: e.target.value }))}>
                        <option value="">{availableSubstitutes.length ? 'Select substitute teacher' : 'No substitute teachers available.'}</option>
                        {availableSubstitutes.map(f => <option key={f.user} value={f.user}>{f.user_name} — {f.department_name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button type="button" onClick={() => setShowLeaveForm(false)} className="text-muted hover:text-foreground px-4 py-2 text-sm">Cancel</button>
                    <button type="submit" disabled={saving} className="bg-[var(--primary)] text-[#0F172A] px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Submit
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-3">
                {leaveRequests.length === 0 && <p className="text-muted text-sm text-center py-8">No leave requests found.</p>}
                {leaveRequests.map(lr => (
                  <div key={lr.id} className="bg-surface border border-border rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-foreground font-semibold">{lr.faculty_name} <span className="text-muted text-sm font-normal">— {lr.date}</span></p>
                      <p className="text-muted text-sm mt-0.5">{lr.reason || 'No reason provided'}</p>
                      {lr.admin_notes && <p className="text-xs text-amber-400 mt-1">Admin Note: {lr.admin_notes}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_COLORS[lr.status]}`}>{lr.status_display}</span>
                      {canManageRequests && lr.status === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={async () => { await timetableApi.approveLeave(lr.id, ''); load(); }} className="bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-500/30">
                            <Check className="w-3 h-3 inline mr-1" />Approve
                          </button>
                          <button onClick={async () => { await timetableApi.rejectLeave(lr.id, ''); load(); }} className="bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-500/30">
                            <X className="w-3 h-3 inline mr-1" />Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SUBSTITUTION REQUESTS */}
          {activeSection === 'sub' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-foreground font-bold text-lg">Substitution Requests</h3>
                <button
                  onClick={() => setShowSubForm(v => !v)}
                  className="flex items-center gap-2 bg-[var(--primary)] text-[#0F172A] px-4 py-2 rounded-xl font-bold text-sm"
                >
                  <Plus className="w-4 h-4" /> Request Substitute
                </button>
              </div>

              {showSubForm && (
                <form onSubmit={handleSubSubmit} className="bg-surface border border-border rounded-2xl p-5 space-y-4">
                  <h4 className="text-foreground font-bold">New Substitution Request</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-xs text-muted mb-1 block">Class Session</label>
                      <select required className={selectCls} value={subForm.class_session} onChange={e => setSubForm(f => ({ ...f, class_session: e.target.value }))}>
                        <option value="">{classSessions.length ? 'Select class session to cover' : 'No class sessions available for substitution.'}</option>
                        {classSessions.map(cs => <option key={cs.id} value={cs.id}>{cs.course_code} {cs.course_name} — {cs.day_display} ({cs.time_slot_name})</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-muted mb-1 block">Substitute Faculty</label>
                      <select required className={selectCls} value={subForm.substitute_faculty} onChange={e => setSubForm(f => ({ ...f, substitute_faculty: e.target.value }))}>
                        <option value="">{availableSubstitutes.length ? 'Select substitute teacher' : 'No substitute teachers available.'}</option>
                        {availableSubstitutes.map(f => <option key={f.user} value={f.user}>{f.user_name} — {f.department_name}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-muted mb-1 block">Notes</label>
                      <textarea className={inputCls} rows={2} value={subForm.notes} onChange={e => setSubForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional notes..."></textarea>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button type="button" onClick={() => setShowSubForm(false)} className="text-muted hover:text-foreground px-4 py-2 text-sm">Cancel</button>
                    <button type="submit" disabled={saving} className="bg-[var(--primary)] text-[#0F172A] px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Submit
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-3">
                {subRequests.length === 0 && <p className="text-muted text-sm text-center py-8">No substitution requests found.</p>}
                {subRequests.map(sr => (
                  <div key={sr.id} className="bg-surface border border-border rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-foreground font-semibold">
                          {sr.original_faculty_name} <span className="text-muted">→</span> {sr.substitute_faculty_name}
                        </p>
                        <p className="text-muted text-sm mt-0.5">{sr.class_session_display}</p>
                        {sr.notes && <p className="text-xs text-muted mt-1">{sr.notes}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_COLORS[sr.status]}`}>{sr.status_display}</span>
                        {/* HOD actions — available when pending */}
                        {canManageRequests && sr.status === 'pending' && (
                          <div className="flex gap-2">
                            <button onClick={async () => { await timetableApi.approveSubstitution(sr.id); load(); }} className="bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-500/30">
                              ✓ Approve
                            </button>
                            <button onClick={async () => { await timetableApi.rejectSubstitution(sr.id); load(); }} className="bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-500/30">
                              ✗ Reject
                            </button>
                          </div>
                        )}
                        {/* Admin final approve — after HOD approved */}
                        {canManageRequests && sr.status === 'hod_approved' && (
                          <div className="flex gap-2">
                            <button onClick={async () => { await timetableApi.approveSubstitution(sr.id); load(); }} className="bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-500/30">
                              <Check className="w-3 h-3 inline mr-1" />Final Approve
                            </button>
                            <button onClick={async () => { await timetableApi.rejectSubstitution(sr.id); load(); }} className="bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-500/30">
                              <X className="w-3 h-3 inline mr-1" />Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
