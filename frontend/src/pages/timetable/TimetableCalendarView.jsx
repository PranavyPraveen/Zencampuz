import { useState, useEffect, useMemo, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { timetableApi } from '../../api/timetable';
import { academicsApi } from '../../api/academics';
import { campusApi } from '../../api/campus';
import { useAuth } from '../../auth/AuthContext';
import { Calendar, X, Filter, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

const selectCls = 'bg-background border border-border text-foreground rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] w-full transition-colors disabled:opacity-40';
const inputCls  = 'bg-background border border-border text-foreground rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] w-full';

// ── Course type → colors ─────────────────────────────────────────────────────
const colorMap = {
  lab:      { bg: '#8B5CF6', border: '#6D28D9', text: '#fff' },
  tutorial: { bg: '#F59E0B', border: '#D97706', text: '#000' },
  regular:  { bg: '#2563EB', border: '#1D4ED8', text: '#fff' },
  seminar:  { bg: '#10B981', border: '#059669', text: '#fff' },
  makeup:   { bg: '#EF4444', border: '#DC2626', text: '#fff' },
};

// Day map for FullCalendar recurring events
const DAY_MAP = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

export default function TimetableCalendarView() {
  const { user } = useAuth();
  const userRole = user?.role?.name || user?.role;
  const defaultFacultyId = user?.profile_id || user?.id || '';

  // Options data
  const [campuses, setCampuses]   = useState([]);
  const [depts, setDepts]         = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [plans, setPlans]         = useState([]);

  // Filter state
  const [filters, setFilters] = useState({
    campus: user?.campus?.id || '', 
    department: '', // Will be set after depts load if faculty
    faculty: userRole === 'faculty' ? defaultFacultyId : '', 
    semester: '', 
    plan: ''
  });
  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  // Sessions / loading
  const [sessions, setSessions]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [fetching, setFetching]   = useState(false);
  const [error, setError]         = useState(null);
  const [selected, setSelected]   = useState(null);

  // Initial meta load
  useEffect(() => {
    setLoading(true);
    Promise.all([
      campusApi.getCampuses(),
      academicsApi.getDepartments(),
      academicsApi.getFaculty(),
      academicsApi.getSemesters(),
      timetableApi.getPlans({ status: 'published' }),
    ]).then(([c, d, fa, s, p]) => {
      setCampuses(c); setDepts(d); setFaculties(fa); setSemesters(s); setPlans(p);
      
      // If faculty, try to find their department from faculty profiles
      if (userRole === 'faculty' && !filters.department) {
        const myProfile = fa.find(f => String(f.user) === String(defaultFacultyId));
        if (myProfile) {
          setFilters(prev => ({ 
            ...prev, 
            department: myProfile.department,
            campus: myProfile.campus_id || prev.campus,
            faculty: myProfile.user || prev.faculty,
          }));
        }
      }
    }).catch(err => setError(err?.message || 'Failed to load calendar metadata.'))
    .finally(() => setLoading(false));
  }, []);

  // Cascade: campus → dept
  useEffect(() => {
    if (!filters.campus) return;
    academicsApi.getDepartments({ campus_id: filters.campus }).then(setDepts).catch(() => {});
    setF('department', '');
    if (userRole !== 'faculty') {
      setF('faculty', '');
    }
  }, [filters.campus]);

  // Cascade: dept → faculty
  useEffect(() => {
    if (!filters.department) return;
    academicsApi.getFaculty({ department_id: filters.department }).then(setFaculties).catch(() => {});
    if (userRole !== 'faculty') {
      setF('faculty', '');
    }
  }, [filters.department]);

  // Fetch sessions whenever any filter changes
  const fetchSessions = useCallback(async () => {
    setFetching(true); setError(null);
    try {
      const params = {};
      if (filters.campus)     params.campus_id = filters.campus;
      if (filters.department) params.department_id = filters.department;
      if (filters.faculty)    params.faculty_id = filters.faculty;
      if (filters.semester)   params.semester_id = filters.semester;
      if (filters.plan)       params.plan_id = filters.plan;
      const data = await timetableApi.getCalendarSessions(params);
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Failed to fetch sessions.');
    } finally { setFetching(false); }
  }, [filters]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // Build FullCalendar recurring events from weekly sessions
  const events = useMemo(() => {
    return sessions.map(sess => {
      const c = colorMap[sess.session_type] || colorMap.regular;
      const dow = DAY_MAP[sess.day];
      if (dow === undefined) return null;
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // This Monday

      const eventDate = new Date(monday);
      // Offset based on day of week
      eventDate.setDate(monday.getDate() + ((dow + 6) % 7)); // mon=0 offset

      const dateStr = eventDate.toISOString().split('T')[0];
      const faculty = sess.faculty?.map(f => f.name).join(', ') || '—';
      const room = sess.rooms?.join(', ') || '—';

      return {
        id: sess.id,
        title: `${sess.course_code} • ${faculty}`,
        startRecur: new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0],
        endRecur: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
        daysOfWeek: [dow],
        startTime: sess.start_time,
        endTime: sess.end_time,
        backgroundColor: c.bg,
        borderColor: c.border,
        textColor: c.text,
        extendedProps: { ...sess, faculty, room },
      };
    }).filter(Boolean);
  }, [sessions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 gap-3 text-muted">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Loading calendar...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[var(--primary)]" /> {userRole === 'faculty' ? 'My Schedule' : 'Calendar View'}
          </h2>
          <p className="text-muted text-sm mt-1">
            {userRole === 'faculty' 
              ? 'View your upcoming classes, seminars, and academic events.' 
              : 'Visualize weekly sessions across the tenant, defaulting faculty users to their own department timetable.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchSessions} className="text-muted hover:text-foreground transition-colors">
            <RefreshCw className={`w-4 h-4 ${fetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Bar (Hidden for Faculty) */}
      {userRole !== 'faculty' && (
        <div className="bg-surface border border-border rounded-2xl p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-[10px] text-muted uppercase tracking-widest font-bold mb-1 block">Campus</label>
            <select className={selectCls} value={filters.campus} onChange={e => setF('campus', e.target.value)}>
              <option value="">All Campuses</option>
              {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-muted uppercase tracking-widest font-bold mb-1 block">Department</label>
            <select className={selectCls} value={filters.department} onChange={e => setF('department', e.target.value)}>
              <option value="">All Depts</option>
              {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-muted uppercase tracking-widest font-bold mb-1 block">Faculty</label>
            <select className={selectCls} value={filters.faculty} onChange={e => setF('faculty', e.target.value)}
              disabled={!filters.department}>
              <option value="">All Faculty</option>
              {faculties.map(f => <option key={f.user} value={f.user}>{f.user_name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-muted uppercase tracking-widest font-bold mb-1 block">Semester</label>
            <select className={selectCls} value={filters.semester} onChange={e => setF('semester', e.target.value)}>
              <option value="">All Semesters</option>
              {semesters.map(s => <option key={s.id} value={s.id}>{s.name} ({s.academic_year})</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-muted uppercase tracking-widest font-bold mb-1 block">Plan</label>
            <select className={selectCls} value={filters.plan} onChange={e => setF('plan', e.target.value)}>
              <option value="">All Plans</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" /><p className="text-sm">{error}</p>
        </div>
      )}

      {/* Session count bar */}
      <div className="flex items-center gap-4 text-sm text-muted">
        <span>{fetching ? <Loader2 className="w-4 h-4 animate-spin inline" /> : `${sessions.length} sessions`}</span>
        <div className="flex items-center gap-3">
          {Object.entries(colorMap).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: v.bg }} />
              <span className="capitalize">{k}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <style>{`
          .fc { --fc-border-color: rgba(27,42,74,0.6); --fc-today-bg-color: rgba(34,211,238,0.04); }
          .fc .fc-toolbar-title { color: #fff; font-size: 1.1rem; }
          .fc .fc-button { background: #1B2A4A; border-color: #1B2A4A; color: #fff; }
          .fc .fc-button:hover { background: #22D3EE; border-color: #22D3EE; color: #0B1026; }
          .fc .fc-button-active { background: #22D3EE !important; border-color: #22D3EE !important; color: #0B1026 !important; }
          .fc-col-header-cell { background: #0E1630; }
          .fc-col-header-cell-cushion { color: #94A3B8; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; text-decoration: none; }
          .fc-timegrid-slot-label-cushion { color: #64748B; font-size: 0.7rem; }
          .fc-event { border-radius: 6px !important; padding: 2px 4px !important; font-size: 11px !important; }
          .fc-event-title { font-weight: 700 !important; white-space: normal !important; overflow: visible !important; }
        `}</style>
        <FullCalendar
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
          events={events}
          height="auto"
          nowIndicator
          slotMinTime="07:00:00"
          slotMaxTime="20:00:00"
          expandRows
          eventClick={info => setSelected(info.event.extendedProps)}
        />
      </div>

      {/* Event Detail Popover */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-background border border-border rounded-2xl w-full max-w-md shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-foreground font-bold text-lg">{selected.course_name}</h3>
                <span className="text-xs font-bold text-[var(--primary)] uppercase tracking-wider">{selected.course_code} • {selected.session_type}</span>
              </div>
              <button onClick={() => setSelected(null)} className="text-muted hover:text-foreground transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <Row label="Day" value={selected.day_display} />
              <Row label="Time" value={`${selected.start_time?.slice(0,5)} – ${selected.end_time?.slice(0,5)}`} />
              <Row label="Faculty" value={selected.faculty || '—'} />
              <Row label="Room" value={selected.room || '—'} />
              <Row label="Plan" value={selected.plan_name || '—'} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
      <span className="text-xs text-muted uppercase tracking-wider font-bold">{label}</span>
      <span className="text-sm text-foreground font-medium">{value}</span>
    </div>
  );
}
