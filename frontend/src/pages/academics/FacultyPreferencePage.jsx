import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { academicsApi } from '../../api/academics';
import { campusApi } from '../../api/campus';
import {
  Save, AlertCircle, CheckCircle2, Loader2, BookOpen,
  Calendar, Clock, Info, ShieldCheck, Eye,
  School, Users, Activity, Send, Check, XCircle,
} from 'lucide-react';

const DAYS = [
  { id: 'mon', label: 'Monday' },
  { id: 'tue', label: 'Tuesday' },
  { id: 'wed', label: 'Wednesday' },
  { id: 'thu', label: 'Thursday' },
  { id: 'fri', label: 'Friday' },
  { id: 'sat', label: 'Saturday' },
];

const DAY_LABELS = DAYS.reduce((acc, d) => ({ ...acc, [d.id]: d.label }), {});

function statusStyles(status) {
  if (status === 'hod_approved') return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
  if (status === 'hod_rejected') return 'bg-red-500/10 border-red-500/20 text-red-400';
  if (status === 'submitted') return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
  return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
}

function statusLabel(status, display) {
  return display || {
    hod_approved: 'Approved by HOD',
    hod_rejected: 'Rejected by HOD',
    submitted: 'Submitted to HOD',
    draft: 'Draft',
  }[status] || 'Draft';
}

function FacultyView({ primaryColor }) {
  const [pref, setPref] = useState(null);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [profileCompletion, setProfileCompletion] = useState(null);
  const [rankings, setRankings] = useState(['', '', '']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const prefData = await academicsApi.getMyPreference();
        setPref(prefData.id ? prefData : {
          preferred_days: [],
          preferred_time_start: '09:00:00',
          preferred_time_end: '17:00:00',
          avoid_early_morning: false,
          avoid_consecutive_hours: false,
          max_courses_per_semester: 4,
          notes: '',
          status: 'draft',
        });
        setAvailableSubjects(Array.isArray(prefData.available_preference_subjects) ? prefData.available_preference_subjects : []);
        setProfileCompletion(prefData.profile_completion || null);
        const ranked = Array.isArray(prefData.ranked_preferences) ? [...prefData.ranked_preferences].sort((a, b) => a.rank - b.rank) : [];
        setRankings([
          ranked[0]?.course || '',
          ranked[1]?.course || '',
          ranked[2]?.course || '',
        ]);
      } catch (err) {
        setError('Failed to load your preferences. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const rankingOptions = useMemo(
    () => availableSubjects.map((subject) => ({
      ...subject,
      value: String(subject.course),
      label: `${subject.course_code} - ${subject.course_name} (${subject.program_name || 'Programme'} / ${subject.semester_name || 'Semester'})`,
    })),
    [availableSubjects]
  );

  useEffect(() => {
    const availableIds = new Set(rankingOptions.map((item) => item.value));
    setRankings((prev) => {
      const cleaned = prev.map((item) => (item && availableIds.has(String(item)) ? String(item) : ''));
      const seen = new Set();
      return cleaned.map((item) => {
        if (!item || seen.has(item)) return '';
        seen.add(item);
        return item;
      });
    });
  }, [rankingOptions]);

  const isPreferenceDisabled = (index) => {
    if (profileCompletion && !profileCompletion.ready_for_preferences) return true;
    if (rankingOptions.length <= index) return true;
    if (index === 0) return false;
    return !rankings[index - 1];
  };

  const approvedSubjects = useMemo(() => {
    if (pref?.status !== 'hod_approved') return [];
    const ranked = Array.isArray(pref?.ranked_preferences) ? [...pref.ranked_preferences].sort((a, b) => a.rank - b.rank) : [];
    return ranked;
  }, [pref]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      if (profileCompletion && !profileCompletion.ready_for_preferences) {
        setError('Complete your specialization and years of experience before submitting preferences.');
        setSaving(false);
        return;
      }
      const selected = rankings.filter(Boolean);
      if (selected.length !== new Set(selected).size) {
        setError('Each ranked preference must be different.');
        setSaving(false);
        return;
      }
      const resp = await academicsApi.updateMyPreference({
        preferred_days: pref.preferred_days || [],
        preferred_time_start: pref.preferred_time_start || '',
        preferred_time_end: pref.preferred_time_end || '',
        avoid_early_morning: Boolean(pref.avoid_early_morning),
        avoid_consecutive_hours: Boolean(pref.avoid_consecutive_hours),
        max_courses_per_semester: pref.max_courses_per_semester || 4,
        notes: pref.notes || '',
        preference_rankings: selected,
      });
      setPref(resp);
      setAvailableSubjects(Array.isArray(resp.available_preference_subjects) ? resp.available_preference_subjects : []);
      setProfileCompletion(resp.profile_completion || null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const detail = err.response?.data?.preference_rankings?.[0] || err.response?.data?.preferred_courses?.[0] || err.response?.data?.detail || 'Failed to save preferences.';
      setError(detail);
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (dayId) => {
    const days = pref.preferred_days.includes(dayId)
      ? pref.preferred_days.filter((d) => d !== dayId)
      : [...pref.preferred_days, dayId];
    setPref({ ...pref, preferred_days: days });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
        <p className="text-foreground/40 text-sm font-medium">Fetching your preferences...</p>
      </div>
    );
  }

  if (!pref) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="w-12 h-12 text-blue-400 opacity-50" />
        <p className="text-foreground/40 text-sm font-medium">{error || 'No preference data available.'}</p>
      </div>
    );
  }

  const selectedCount = rankings.filter(Boolean).length;

  return (
    <form onSubmit={handleSave} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-3xl border border-border bg-surface/60 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/30">Profile Readiness</p>
          <p className="mt-3 text-3xl font-black text-foreground">{profileCompletion?.percentage || 0}%</p>
          <p className="mt-2 text-xs text-foreground/40">
            {profileCompletion?.ready_for_preferences ? 'Ready to submit preferences.' : 'Complete your profile to continue.'}
          </p>
        </div>
        <div className={`rounded-3xl border p-5 ${statusStyles(pref.status)}`}>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Current Status</p>
          <p className="mt-3 text-2xl font-black">{statusLabel(pref.status, pref.status_display)}</p>
          <p className="mt-2 text-xs opacity-75">
            {pref.status === 'draft' && 'Save your ranked subjects to submit them for HOD review.'}
            {pref.status === 'submitted' && 'Your saved preferences are waiting for HOD review.'}
            {pref.status === 'hod_approved' && 'Your submitted preferences were approved by the HOD.'}
            {pref.status === 'hod_rejected' && 'Your preferences were reviewed and need changes.'}
          </p>
        </div>
        <div className="rounded-3xl border border-border bg-surface/60 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/30">Matched Subjects</p>
          <p className="mt-3 text-3xl font-black text-foreground">{availableSubjects.length}</p>
          <p className="mt-2 text-xs text-foreground/40">Only subjects matching your selected domains can be ranked.</p>
        </div>
      </div>

      {profileCompletion && (
        <div className={`rounded-2xl p-4 border ${profileCompletion.ready_for_preferences ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
          <p className="text-sm font-bold">Profile Completion: {profileCompletion.percentage || 0}%</p>
          <p className="text-xs mt-1">
            {profileCompletion.ready_for_preferences
              ? 'Your profile is complete enough to receive subject preferences.'
              : 'Complete your profile to receive subject preferences.'}
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3 text-green-400">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">Preferences submitted successfully and sent for HOD review.</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-surface/60 border border-border rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 shadow-inner">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground tracking-tight">Ranked Subject Preferences</h3>
                <p className="text-xs text-foreground/30">Choose up to 3 matched subjects. These will be sent to the HOD for review.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[1, 2, 3].map((rank, index) => (
                <div key={rank} className="rounded-2xl border border-border bg-foreground/5 p-4 space-y-2">
                  <label className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em]">{`Preference ${rank}`}</label>
                  <select
                    value={rankings[index]}
                    onChange={(e) => setRankings((prev) => prev.map((item, itemIndex) => (
                      itemIndex === index ? e.target.value : item
                    )))}
                    className="w-full bg-background/40 border border-border rounded-2xl px-4 py-3 text-foreground focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                    disabled={isPreferenceDisabled(index)}
                  >
                    <option value="">
                      {rankingOptions.length <= index
                        ? `Only ${rankingOptions.length} matched ${rankingOptions.length === 1 ? 'subject is' : 'subjects are'} available`
                        : 'Select subject...'}
                    </option>
                    {rankingOptions
                      .filter((subject) => !rankings.includes(subject.value) || rankings[index] === subject.value)
                      .map((subject) => (
                        <option key={`${rank}-${subject.value}`} value={subject.value}>
                          {subject.course_code} - {subject.course_name} ({subject.program_name || 'Programme'} / {subject.semester_name || 'Semester'})
                        </option>
                      ))}
                  </select>
                  {rankingOptions.length <= index ? (
                    <p className="text-[11px] text-foreground/35">
                      {index === 0
                        ? 'No subjects are available for your selected specialization domains yet.'
                        : `Preference ${rank} is enabled only when at least ${rank} domain-matched subjects are available.`}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
          <div className="bg-surface/60 border border-border rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shadow-inner">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground tracking-tight">Approved by HOD</h3>
                <p className="text-xs text-foreground/30">Once your submitted preferences are approved, they will appear here.</p>
              </div>
            </div>

            {pref.status === 'hod_approved' && approvedSubjects.length > 0 ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  {approvedSubjects.map((subject) => (
                    <div key={subject.id} className="min-w-[220px] rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Preference {subject.rank}</p>
                      <p className="mt-2 text-sm font-bold text-foreground">{subject.course_code} - {subject.course_name}</p>
                      <p className="mt-1 text-[11px] text-foreground/45">{subject.program_name || 'Programme'} / {subject.semester_name || 'Semester'}</p>
                    </div>
                  ))}
                </div>
                {(pref.hod_reviewed_by_name || pref.hod_review_note) && (
                  <div className="rounded-2xl border border-border bg-foreground/5 p-4 text-sm text-foreground/70">
                    {pref.hod_reviewed_by_name && <p><span className="font-bold text-foreground">Reviewed by:</span> {pref.hod_reviewed_by_name}</p>}
                    {pref.hod_review_note && <p className="mt-2"><span className="font-bold text-foreground">Note:</span> {pref.hod_review_note}</p>}
                  </div>
                )}
              </div>
            ) : (
              <div className={`rounded-2xl border p-5 ${statusStyles(pref.status)}`}>
                <p className="text-sm font-bold">{statusLabel(pref.status, pref.status_display)}</p>
                <p className="text-xs mt-2 opacity-80">
                  {pref.status === 'submitted' && 'Your current ranked subjects are waiting for HOD approval.'}
                  {pref.status === 'hod_rejected' && (pref.hod_review_note || 'Your preferences were rejected. Update them and submit again.')}
                  {pref.status === 'draft' && 'Save your ranked subjects first. Approved subjects will appear here after HOD review.'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-surface/60 border border-border rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shadow-inner">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground tracking-tight">Working Days</h3>
            </div>
            <div className="space-y-2">
              {DAYS.map((day) => (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => toggleDay(day.id)}
                  className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl border transition-all duration-300 ${
                    pref.preferred_days.includes(day.id)
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-foreground font-bold'
                      : 'bg-foreground/5 border-border text-foreground/30'
                  }`}
                >
                  <span className="text-sm tracking-tight">{day.label}</span>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${pref.preferred_days.includes(day.id) ? 'bg-emerald-500' : 'bg-foreground/5'}`}>
                    {pref.preferred_days.includes(day.id) && <CheckCircle2 className="w-3.5 h-3.5 text-[#0F172A]" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-surface/60 border border-border rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shadow-inner">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground tracking-tight">Availability</h3>
                <p className="text-xs text-foreground/30">Define your preferred teaching window and load.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em]">Start Time</label>
                <input
                  type="time"
                  value={pref.preferred_time_start || ''}
                  onChange={(e) => setPref({ ...pref, preferred_time_start: e.target.value })}
                  className="w-full bg-foreground/5 border border-border rounded-2xl px-4 py-3 text-foreground focus:border-blue-500/50 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em]">End Time</label>
                <input
                  type="time"
                  value={pref.preferred_time_end || ''}
                  onChange={(e) => setPref({ ...pref, preferred_time_end: e.target.value })}
                  className="w-full bg-foreground/5 border border-border rounded-2xl px-4 py-3 text-foreground focus:border-blue-500/50 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => setPref({ ...pref, avoid_early_morning: !pref.avoid_early_morning })}
                className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${pref.avoid_early_morning ? 'bg-amber-500/10 border-amber-500/40 text-foreground' : 'bg-foreground/5 border-border text-foreground/40'}`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-bold tracking-tight">Avoid Early Sessions</span>
              </button>
              <button
                type="button"
                onClick={() => setPref({ ...pref, avoid_consecutive_hours: !pref.avoid_consecutive_hours })}
                className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${pref.avoid_consecutive_hours ? 'bg-amber-500/10 border-amber-500/40 text-foreground' : 'bg-foreground/5 border-border text-foreground/40'}`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-bold tracking-tight">No Consecutive Hours</span>
              </button>
            </div>

            <div className="bg-foreground/5 rounded-2xl px-5 py-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">Max Courses</p>
                <p className="text-[10px] text-foreground/40 uppercase tracking-widest font-black">Per Semester</p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setPref({ ...pref, max_courses_per_semester: Math.max(1, pref.max_courses_per_semester - 1) })}
                  className="w-8 h-8 rounded-lg bg-foreground/5 border border-border flex items-center justify-center text-foreground"
                >-</button>
                <span className="text-2xl font-black text-blue-400 w-6 text-center">{pref.max_courses_per_semester}</span>
                <button
                  type="button"
                  onClick={() => setPref({ ...pref, max_courses_per_semester: Math.min(6, pref.max_courses_per_semester + 1) })}
                  className="w-8 h-8 rounded-lg bg-foreground/5 border border-border flex items-center justify-center text-foreground"
                >+</button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em]">Additional Notes</label>
              <textarea
                value={pref.notes || ''}
                onChange={(e) => setPref({ ...pref, notes: e.target.value })}
                rows={3}
                className="w-full bg-foreground/5 border border-border rounded-2xl px-4 py-4 text-foreground focus:border-blue-500/50 outline-none resize-none text-sm placeholder:text-foreground/10"
                placeholder="Add any remarks for HOD review..."
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 rounded-3xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-[#0F172A] font-black text-base transition-all duration-300 shadow-2xl shadow-blue-500/20"
            >
              <div className="flex items-center justify-center gap-3">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> Save And Send To HOD</>}
              </div>
            </button>

            <div className="p-4 bg-foreground/5 border border-border rounded-2xl flex gap-3">
              <Info className="w-5 h-5 text-foreground/20 shrink-0" />
              <div className="text-[11px] text-foreground/35 leading-relaxed">
                <p>{selectedCount} of 3 ranked preferences selected.</p>
                <p className="mt-1">Only subjects matching your selected specialization domains are available in the ranking list.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
function AdminView({ isHOD = false }) {
  const [prefs, setPrefs] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [depts, setDepts] = useState([]);
  const [facultyRows, setFacultyRows] = useState([]);
  const [filters, setFilters] = useState({ campus: '', department: '' });
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  useEffect(() => {
    async function loadMeta() {
      try {
        const requests = [academicsApi.getDepartments(), academicsApi.getFaculty()];
        if (!isHOD) requests.unshift(campusApi.getCampuses());
        const results = await Promise.all(requests);
        if (!isHOD) {
          setCampuses(results[0]);
          setDepts(results[1]);
          setFacultyRows(results[2]);
        } else {
          setCampuses([]);
          setDepts(results[0]);
          setFacultyRows(results[1]);
        }
      } catch (err) {
        setCampuses([]);
        setDepts([]);
        setFacultyRows([]);
      }
    }
    loadMeta();
  }, [isHOD]);

  useEffect(() => {
    async function fetchPrefs() {
      setLoading(true);
      try {
        const params = {};
        if (!isHOD && filters.campus) params['faculty__department__campus'] = filters.campus;
        if (filters.department) params['faculty__department'] = filters.department;
        const data = await academicsApi.getFacultyPreferences(params);
        setPrefs(data);
      } catch (err) {
        setPrefs([]);
      } finally {
        setLoading(false);
      }
    }
    fetchPrefs();
  }, [filters, isHOD]);

  useEffect(() => {
    if (isHOD) {
      academicsApi.getDepartments().then(setDepts).catch(() => setDepts([]));
    } else if (filters.campus) {
      academicsApi.getDepartments({ campus_id: filters.campus }).then(setDepts).catch(() => setDepts([]));
    } else {
      academicsApi.getDepartments().then(setDepts).catch(() => setDepts([]));
    }
  }, [filters.campus, isHOD]);

  const submittedFacultyIds = new Set(prefs.map((pref) => String(pref.faculty)));
  const missingFaculty = facultyRows.filter((faculty) => !submittedFacultyIds.has(String(faculty.id)));

  const updatePrefInState = (updatedPref) => {
    setPrefs((prev) => prev.map((item) => (item.id === updatedPref.id ? updatedPref : item)));
  };

  const handleReviewAction = async (prefId, action) => {
    setActionLoadingId(prefId);
    try {
      const response = action === 'approve'
        ? await academicsApi.approveFacultyPreference(prefId)
        : await academicsApi.rejectFacultyPreference(prefId);
      updatePrefInState(response);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {!isHOD && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-500">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <p className="text-amber-500 text-sm font-bold">Admin Audit Mode</p>
            <p className="text-amber-500/60 text-xs">Viewing faculty submissions. HOD approval flow remains department-scoped.</p>
          </div>
        </div>
      )}

      <div className="bg-surface/60 border border-border rounded-3xl p-6 shadow-2xl flex flex-wrap gap-4 items-end">
        {!isHOD && (
          <div className="space-y-2 flex-1 min-w-[200px]">
            <label className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em] flex items-center gap-2">
              <School className="w-3 h-3" /> Campus
            </label>
            <select value={filters.campus} onChange={(e) => setFilters({ ...filters, campus: e.target.value, department: '' })} className="w-full bg-foreground/5 border border-border rounded-2xl px-4 py-3 text-foreground outline-none">
              <option value="">All Campuses</option>
              {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        <div className="space-y-2 flex-1 min-w-[220px]">
          <label className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em] flex items-center gap-2">
            <Users className="w-3 h-3" /> Department
          </label>
          <select value={filters.department} onChange={(e) => setFilters({ ...filters, department: e.target.value })} className="w-full bg-foreground/5 border border-border rounded-2xl px-4 py-3 text-foreground outline-none">
            <option value="">All Departments</option>
            {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="h-12 flex items-center px-4 bg-foreground/5 border border-border rounded-2xl text-[10px] font-black text-foreground/40 uppercase tracking-widest">
          {prefs.length} {prefs.length === 1 ? 'Submission' : 'Submissions'}
        </div>
      </div>

      {isHOD && missingFaculty.length > 0 && (
        <div className="bg-surface/60 border border-border rounded-3xl p-6 shadow-2xl">
          <h3 className="text-lg font-bold text-foreground mb-4">Missing Preference Submissions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {missingFaculty.map((faculty) => (
              <div key={faculty.id} className="rounded-2xl bg-foreground/5 border border-border px-4 py-3">
                <p className="text-sm font-bold text-foreground">{faculty.user_name}</p>
                <p className="text-xs text-foreground/40">{faculty.designation_display || 'Faculty'} / {faculty.user_email}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      ) : prefs.length === 0 ? (
        <div className="bg-surface/40 border border-border rounded-3xl p-16 text-center">
          <Info className="w-12 h-12 text-foreground/10 mx-auto mb-4" />
          <p className="text-foreground/30 font-bold uppercase tracking-widest text-sm">No preferences submitted yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {prefs.map((p) => (
            <div key={p.id} className="bg-surface/60 border border-border rounded-3xl p-6 shadow-2xl space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-lg font-bold text-foreground tracking-tight">{p.faculty_name}</h4>
                  <p className="text-xs text-foreground/40 uppercase tracking-wider font-medium mt-1">{p.department_name} / {p.campus_name}</p>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 border rounded-full ${statusStyles(p.status)}`}>{statusLabel(p.status, p.status_display)}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-foreground/5 rounded-2xl p-4 border border-border">
                  <p className="text-[10px] font-black text-foreground/20 uppercase tracking-[0.2em] mb-2">Preferred Days</p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.preferred_days?.length ? p.preferred_days.map((d) => (
                      <span key={d} className="text-[10px] font-bold text-foreground/60 bg-foreground/5 px-2 py-0.5 rounded-lg border border-border">{DAY_LABELS[d]}</span>
                    )) : <span className="text-xs text-foreground/20 italic">Not set</span>}
                  </div>
                </div>
                <div className="bg-foreground/5 rounded-2xl p-4 border border-border">
                  <p className="text-[10px] font-black text-foreground/20 uppercase tracking-[0.2em] mb-2">Time Window</p>
                  <p className="text-foreground font-bold text-sm">{p.preferred_time_start ? `${p.preferred_time_start.slice(0, 5)} - ${p.preferred_time_end.slice(0, 5)}` : 'Flexible'}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black text-foreground/20 uppercase tracking-[0.2em] mb-3">Selected Preferences</p>
                <div className="space-y-2">
                  {p.ranked_preferences?.length ? p.ranked_preferences.map((subject) => (
                    <div key={subject.id} className="rounded-2xl border border-border bg-foreground/5 px-4 py-3">
                      <p className="text-sm font-bold text-foreground">Preference {subject.rank}: {subject.course_code}</p>
                      <p className="text-xs text-foreground/45 mt-1">{subject.course_name} / {subject.program_name || 'Programme'} / {subject.semester_name || 'Semester'}</p>
                    </div>
                  )) : <p className="text-sm text-foreground/35">No ranked subjects selected.</p>}
                </div>
              </div>

              {p.notes && (
                <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-[11px] text-amber-500/80 leading-relaxed italic">"{p.notes}"</div>
              )}

              {p.hod_review_note && (
                <div className="rounded-2xl border border-border bg-foreground/5 p-4">
                  <p className="text-xs text-foreground/40 uppercase tracking-[0.2em] font-black">Review Note</p>
                  <p className="mt-2 text-sm text-foreground/75">{p.hod_review_note}</p>
                </div>
              )}

              {isHOD && (
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => handleReviewAction(p.id, 'approve')} disabled={actionLoadingId === p.id} className="rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-[#0F172A] font-black py-3 flex items-center justify-center gap-2">
                    {actionLoadingId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Approve
                  </button>
                  <button type="button" onClick={() => handleReviewAction(p.id, 'reject')} disabled={actionLoadingId === p.id} className="rounded-2xl bg-red-500/90 hover:bg-red-500 disabled:opacity-50 text-white font-black py-3 flex items-center justify-center gap-2">
                    {actionLoadingId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FacultyPreferencePage() {
  const { user } = useAuth();
  const roleName = user?.role?.name || user?.role || '';
  const isFaculty = roleName === 'faculty';
  const isHOD = Boolean(roleName === 'hod' || (user?.is_hod && roleName !== 'faculty'));
  const primaryColor = user?.tenant?.primary_color || '#22D3EE';

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="w-16 h-1 bg-gradient-to-r from-transparent to-transparent rounded-full" style={{ background: `linear-gradient(90deg, ${primaryColor}, transparent)` }} />
            <span className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.5em]">Academic Planning</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tighter leading-none">Faculty <span style={{ color: primaryColor }}>Preferences</span></h1>
          <p className="text-foreground/40 font-medium max-w-2xl text-sm leading-relaxed">
            {isFaculty && !isHOD
              ? 'Choose your ranked subject preferences and send them for HOD review. Approved subjects will be shown back here once they are confirmed.'
              : 'Review faculty preference submissions, track missing submissions, and approve or reject ranked choices before final assignment.'}
          </p>
        </div>
      </div>

      {isFaculty && !isHOD ? <FacultyView primaryColor={primaryColor} /> : <AdminView isHOD={isHOD} />}
    </div>
  );
}
