import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { timetableApi } from '../../api/timetable';
import { academicsApi } from '../../api/academics';
import { BookOpen, Calendar, LayoutGrid, List, ArrowRight, Loader2, MapPin } from 'lucide-react';

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const selectCls = 'bg-background border border-border text-foreground rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]';

export default function FacultyTimetableView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const roleName = user?.role?.name || user?.role;
  const [faculty, setFaculty] = useState([]);
  const [selected, setSelected] = useState('');
  const [plans, setPlans] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('weekly'); // 'weekly' | 'daily'
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [mySubRequests, setMySubRequests] = useState([]);

  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      academicsApi.getFaculty(),
      timetableApi.getPlans({ status: 'published' })
    ])
    .then(([facFac, planRes]) => {
      setFaculty(facFac);
      setPlans(planRes);
      
      // Auto-select if user is faculty
      if (roleName === 'faculty') {
        const myFac = facFac.find(f => String(f.user) === String(user.id) || String(f.user) === String(user.profile_id));
        setSelected(myFac?.user || user.id);
      }
    })
    .catch(err => {
      console.error('Failed to load faculty metadata:', err);
      setError('Could not load faculty or plan data.');
    });
  }, [roleName, user]);

  // Handle plan loading dependency for grid
  useEffect(() => {
    if (selected && plans.length > 0) {
      loadFacultyGrid(selected);
    }
  }, [selected, plans]);

  const loadFacultyGrid = async (facId) => {
    if (!facId) { setSlots([]); setMySubRequests([]); return; }
    try {
      setLoading(true);
      setError(null);
      const allSlotsList = [];
      for (const p of plans) {
        const g = await timetableApi.getPlanGrid(p.id);
        allSlotsList.push(...g);
      }
      const mySlots = allSlotsList.map(s => ({
        ...s,
        class_sessions: s.class_sessions.filter(sess =>
          sess.faculty_assignments.some(fa => fa.faculty === facId)
        ),
      })).filter(s => s.class_sessions.length > 0);
      setSlots(mySlots);

      // Load sub requests
      const subs = await timetableApi.getSubstitutionRequests();
      setMySubRequests(
        (subs || []).filter(
          (item) =>
            String(item.original_faculty) === String(facId) ||
            String(item.substitute_faculty) === String(facId)
        )
      );
    } catch (err) {
      console.error('Failed to load faculty grid:', err);
      setError(err?.response?.data?.detail || err?.response?.data?.error || err.message || 'Could not load the faculty timetable grid.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (id) => { setSelected(id); };

  // Group for weekly view
  const days = useMemo(() => DAYS_ORDER.filter(d => slots.some(s => s.day_display === d)), [slots]);
  const periods = useMemo(() => {
    const pMap = new Map();
    slots.forEach(s => pMap.set(`${s.time_slot_start}-${s.time_slot_end}`, s));
    return [...pMap.values()].sort((a, b) => a.time_slot_start.localeCompare(b.time_slot_start));
  }, [slots]);

  const getCell = (day, periodKey) =>
    slots.find(s => s.day_display === day && `${s.time_slot_start}-${s.time_slot_end}` === periodKey);

  // Daily view: sessions for the selected day
  const dailySessions = useMemo(() =>
    slots.filter(s => s.day_display === selectedDay).sort((a, b) => a.time_slot_start.localeCompare(b.time_slot_start)),
    [slots, selectedDay]);

  const selectedFaculty = faculty.find(f => String(f.user) === String(selected));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-[var(--primary)]" /> Faculty Timetable
          </h2>
          <p className="text-muted mt-1">Cross-section view of a faculty member's assignments across all active plans.</p>
        </div>
        <button
          onClick={() => navigate('/timetable/substitutions')}
          className="text-sm text-[var(--primary)] border border-[#22D3EE]/30 px-4 py-2 rounded-xl hover:bg-[var(--primary)]/10 transition-colors flex items-center gap-2"
        >
          Leave & Substitutions <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Faculty Picker */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[300px]">
          {roleName !== 'faculty' ? (
            <>
              <label className="text-xs font-bold text-muted uppercase tracking-widest mb-1 block">Select Faculty</label>
              <select className={`${selectCls} w-full`} value={selected} onChange={e => handleSelect(e.target.value)}>
                <option value="">— Choose a faculty member —</option>
                {faculty.map(f => <option key={f.user} value={f.user}>{f.user_name} | {f.department_name}</option>)}
              </select>
            </>
          ) : (
            <div className="py-2">
               <span className="text-xs font-bold text-muted uppercase tracking-widest">Logged in as</span>
               <p className="text-foreground font-bold">{selectedFaculty?.user_name || user?.full_name}</p>
               <p className="text-muted text-sm mt-1">
                 {selectedFaculty?.department_name || 'Department not assigned'}
                 {selectedFaculty?.campus_name ? ` • ${selectedFaculty.campus_name}` : ''}
               </p>
            </div>
          )}
        </div>

        {/* View Mode Toggle */}
        {slots.length > 0 && (
          <div className="flex gap-1 bg-background border border-border rounded-xl p-1">
            <button
              onClick={() => setViewMode('weekly')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'weekly' ? 'bg-[var(--primary)] text-[#0F172A]' : 'text-muted hover:text-foreground'}`}
            >
              <LayoutGrid className="w-4 h-4" /> Weekly
            </button>
            <button
              onClick={() => setViewMode('daily')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'daily' ? 'bg-[var(--primary)] text-[#0F172A]' : 'text-muted hover:text-foreground'}`}
            >
              <List className="w-4 h-4" /> Daily
            </button>
          </div>
        )}
      </div>

      {/* Faculty Info */}
      {selectedFaculty && slots.length > 0 && (
        <div className="bg-gradient-to-r from-[#22D3EE]/10 to-transparent border border-[#22D3EE]/20 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)] font-bold text-lg">
            {selectedFaculty.user_name?.charAt(0)}
          </div>
          <div>
            <p className="text-foreground font-bold">{selectedFaculty.user_name}</p>
            <p className="text-muted text-sm">{selectedFaculty.department_name} · {slots.reduce((a, s) => a + s.class_sessions.length, 0)} sessions/week</p>
            {selectedFaculty.campus_name && (
              <p className="text-xs text-[var(--primary)] mt-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {selectedFaculty.campus_name}
              </p>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 text-red-400 p-6 rounded-2xl text-center border border-red-500/20">
          <p className="font-bold flex items-center justify-center gap-2"><ArrowRight className="w-4 h-4"/> {error}</p>
        </div>
      )}

      {loading && !error && (
        <div className="text-[var(--primary)] flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading schedule...
        </div>
      )}

      {!loading && selected && slots.length === 0 && (
        <div className="text-center p-12 bg-background border border-border rounded-3xl text-muted">
          No published assignments found for this faculty member.
        </div>
      )}

      {/* ── WEEKLY VIEW ── */}
      {!loading && slots.length > 0 && viewMode === 'weekly' && (
        <div className="overflow-x-auto bg-background border border-border rounded-2xl p-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="p-3 font-bold text-muted border-b border-border border-r w-28">Day</th>
                {periods.map(p => (
                  <th key={`${p.time_slot_start}-${p.time_slot_end}`} className="p-3 text-sm font-bold text-[var(--primary)] border-b border-border text-center min-w-[180px]">
                    {p.time_slot_name}
                    <span className="block text-muted font-normal text-xs">{p.time_slot_start?.slice(0,5)}–{p.time_slot_end?.slice(0,5)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map(d => (
                <tr key={d} className="border-b border-border/50 last:border-0 hover:bg-surface/10">
                  <td className="p-3 font-bold text-muted border-r border-border bg-surface">{d}</td>
                  {periods.map(p => {
                    const key = `${p.time_slot_start}-${p.time_slot_end}`;
                    const cell = getCell(d, key);
                    return (
                      <td key={key} className="p-2 border-r border-border/50 last:border-0 align-top h-24">
                        {cell?.class_sessions.map(sess => (
                          <div key={sess.id} className="bg-gradient-to-br from-[#1B2A4A] to-[#0E1630] p-3 rounded-xl text-xs flex flex-col h-full border border-border shadow">
                            <span className="font-bold text-foreground tracking-widest uppercase mb-1">{sess.course_code}</span>
                            <span className="text-muted">{sess.course_name}</span>
                            <div className="mt-auto text-foreground font-mono flex items-center justify-between">
                              <span className="text-muted">{sess.session_type}</span>
                              <span className="bg-[#10B981]/10 text-[#10B981] px-2 py-0.5 rounded font-bold">{sess.room_assignments?.[0]?.room_number || 'TBD'}</span>
                            </div>
                          </div>
                        )) || <span className="text-[#334155] text-xs italic flex items-center justify-center h-full">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── DAILY VIEW ── */}
      {!loading && slots.length > 0 && viewMode === 'daily' && (
        <div className="space-y-4">
          {/* Day selector */}
          <div className="flex gap-2 flex-wrap">
            {days.map(d => (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${selectedDay === d ? 'bg-[var(--primary)] text-[#0F172A]' : 'bg-foreground/5 text-muted hover:text-foreground'}`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Sessions list for selected day */}
          <div className="space-y-3">
            {dailySessions.length === 0 ? (
              <div className="text-muted text-sm text-center py-8">No sessions on {selectedDay}.</div>
            ) : (
              dailySessions.flatMap(slot =>
                slot.class_sessions.map(sess => (
                  <div key={sess.id} className="bg-surface border border-border rounded-2xl p-4 flex items-center gap-4">
                    <div className="flex-shrink-0 text-center bg-surface rounded-xl p-3 min-w-[80px]">
                      <p className="text-[var(--primary)] font-bold text-sm">{slot.time_slot_start?.slice(0,5)}</p>
                      <p className="text-muted text-xs">to</p>
                      <p className="text-[var(--primary)] font-bold text-sm">{slot.time_slot_end?.slice(0,5)}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-foreground font-bold">{sess.course_code} — {sess.course_name}</p>
                      <p className="text-muted text-sm mt-0.5 capitalize">{sess.session_type} class</p>
                    </div>
                    <div className="text-right">
                      <span className="bg-[#10B981]/10 text-[#10B981] px-3 py-1 rounded-lg text-sm font-bold">
                        {sess.room_assignments?.[0]?.room_number || 'No Room'}
                      </span>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      )}

      {/* ── My Substitute Requests ── */}
      {selected && mySubRequests.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-5">
          <h3 className="text-foreground font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" /> My Substitute Requests
          </h3>
          <div className="space-y-3">
            {mySubRequests.slice(0, 5).map(sr => (
              <div key={sr.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-foreground font-medium">{sr.class_session_display}</p>
                  <p className="text-muted text-xs mt-0.5">Substitute: {sr.substitute_faculty_name}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sr.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : sr.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  {sr.status_display}
                </span>
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/timetable/substitutions')} className="mt-4 text-xs text-[var(--primary)] hover:underline">
            View all requests →
          </button>
        </div>
      )}
    </div>
  );
}
