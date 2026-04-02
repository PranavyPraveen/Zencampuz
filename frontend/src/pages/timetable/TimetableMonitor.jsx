import { useState, useEffect, useMemo, useCallback } from 'react';
import { timetableApi } from '../../api/timetable';
import { academicsApi } from '../../api/academics';
import { campusApi } from '../../api/campus';
import { Monitor, Filter, X, BarChart2, AlertTriangle, Loader2, User, RefreshCw, Search } from 'lucide-react';

const selectCls = 'bg-background border border-border text-foreground rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] w-full transition-colors disabled:opacity-40';

// ── Filter Bar ────────────────────────────────────────────────────────────────
function FilterBar({ filters, setF, campuses, allDepts, allPlans }) {
  const [depts, setDepts]       = useState(allDepts);
  const [faculties, setFacs]    = useState([]);
  const [plans, setPlans]       = useState(allPlans);

  // Cascade: campus → depts
  useEffect(() => {
    if (!filters.campus) { setDepts(allDepts); setF('department', ''); return; }
    academicsApi.getDepartments({ campus_id: filters.campus }).then(setDepts).catch(() => {});
    setF('department', ''); setF('faculty', ''); setF('plan', '');
  }, [filters.campus]);

  // Cascade: dept → faculty
  useEffect(() => {
    if (!filters.department) { setFacs([]); return; }
    academicsApi.getFaculty({ department_id: filters.department }).then(setFacs).catch(() => {});
    setF('faculty', '');
  }, [filters.department]);

  // Cascade: campus/dept → plan list
  useEffect(() => {
    const params = {};
    if (filters.campus) params.campus = filters.campus;
    if (filters.department) params.department_id = filters.department;
    timetableApi.getPlans(params).then(setPlans).catch(() => {});
  }, [filters.campus, filters.department]);

  // When allDepts/allPlans refresh, reset lists
  useEffect(() => { if (!filters.campus) setDepts(allDepts); }, [allDepts]);
  useEffect(() => { setPlans(allPlans); }, [allPlans]);

  return (
    <div className="bg-surface border border-border rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3 items-end">
      {/* Campus */}
      <div>
        <label className="text-[10px] text-muted uppercase tracking-widest font-bold mb-1 block">Campus</label>
        <select className={selectCls} value={filters.campus} onChange={e => setF('campus', e.target.value)}>
          <option value="">All Campuses</option>
          {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Department */}
      <div>
        <label className="text-[10px] text-muted uppercase tracking-widest font-bold mb-1 block">Department</label>
        <select className={selectCls} value={filters.department} onChange={e => setF('department', e.target.value)}>
          <option value="">All Depts</option>
          {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {/* Plan */}
      <div>
        <label className="text-[10px] text-muted uppercase tracking-widest font-bold mb-1 block">Timetable Plan</label>
        <select className={selectCls} value={filters.plan} onChange={e => setF('plan', e.target.value)}>
          <option value="">Select a plan...</option>
          {plans.map(p => <option key={p.id} value={p.id}>{p.name} ({p.status_display})</option>)}
        </select>
      </div>

      {/* Faculty */}
      <div>
        <label className="text-[10px] text-muted uppercase tracking-widest font-bold mb-1 block">Faculty</label>
        <select className={selectCls} value={filters.faculty} onChange={e => setF('faculty', e.target.value)}
          disabled={!filters.department}>
          <option value="">All Faculty</option>
          {faculties.map(f => <option key={f.user} value={f.user}>{f.user_name}</option>)}
        </select>
      </div>

      {/* Room filter */}
      <div>
        <label className="text-[10px] text-muted uppercase tracking-widest font-bold mb-1 block">Room</label>
        <select className={selectCls} value={filters.room} onChange={e => setF('room', e.target.value)}>
          <option value="">All Rooms</option>
          {filters._rooms?.map(r => <option key={r.id} value={r.id}>{r.room_number}</option>)}
        </select>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function TimetableMonitor() {
  const [campuses, setCampuses]   = useState([]);
  const [allDepts, setAllDepts]   = useState([]);
  const [allPlans, setAllPlans]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [gridLoading, setGridLoading] = useState(false);
  const [error, setError]         = useState(null);
  const [slots, setSlots]         = useState([]);
  const [rooms, setRooms]         = useState([]);

  const [filters, setFilters] = useState({ campus: '', department: '', plan: '', faculty: '', room: '' });
  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v }));
  const clearFilters = () => setFilters({ campus: '', department: '', plan: '', faculty: '', room: '' });
  const hasFilters = Object.values(filters).some(Boolean);

  // Load top-level meta once
  useEffect(() => {
    setLoading(true);
    Promise.all([
      campusApi.getCampuses(),
      academicsApi.getDepartments(),
      timetableApi.getPlans(),
      campusApi.getRooms(),
    ]).then(([c, d, p, r]) => {
      setCampuses(c); setAllDepts(d); setAllPlans(p); setRooms(r);
    }).catch(err => {
      setError(err?.response?.data?.detail || err.message || 'Failed to load monitor data.');
    }).finally(() => setLoading(false));
  }, []);

  // Load grid when plan or faculty changes
  const loadGrid = useCallback(async () => {
    if (!filters.plan) { setSlots([]); return; }
    setGridLoading(true);
    try {
      const params = {};
      if (filters.faculty) params.faculty_id = filters.faculty;
      const data = await timetableApi.getPlanGrid(filters.plan, params);
      setSlots(data);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Failed to load grid.');
    } finally { setGridLoading(false); }
  }, [filters.plan, filters.faculty]);

  useEffect(() => { loadGrid(); }, [loadGrid]);

  // Grid dimensions
  const days    = useMemo(() => [...new Set(slots.map(s => s.day_display))], [slots]);
  const periods = useMemo(() => [...new Map(slots.map(s => [`${s.time_slot_start}-${s.time_slot_end}`, s]))].map(([, s]) => s), [slots]);

  // Filter by room (client-side, grid is already faculty-filtered server-side)
  const filteredSlots = useMemo(() => {
    if (!filters.room) return slots;
    return slots.map(slot => ({
      ...slot,
      class_sessions: (slot.class_sessions || []).filter(sess =>
        sess.room_assignments?.some(ra => ra.room === filters.room)
      ),
    }));
  }, [slots, filters.room]);

  // Faculty workload summary
  const workloadSummary = useMemo(() => {
    const map = {};
    slots.forEach(slot => {
      slot.class_sessions?.forEach(sess => {
        sess.faculty_assignments?.forEach(fa => {
          if (!map[fa.faculty]) map[fa.faculty] = { name: fa.faculty_name, hours: 0 };
          map[fa.faculty].hours += 1;
        });
      });
    });
    return Object.values(map).sort((a, b) => b.hours - a.hours);
  }, [slots]);

  // Conflict detection
  const conflicts = useMemo(() => {
    const cs = [];
    slots.forEach(slot => {
      const facSeen = {}; const roomSeen = {};
      slot.class_sessions?.forEach(sess => {
        sess.faculty_assignments?.forEach(fa => {
          if (facSeen[fa.faculty]) cs.push(`Faculty Conflict: ${fa.faculty_name} double-booked on ${slot.day_display} ${slot.time_slot_name}`);
          facSeen[fa.faculty] = true;
        });
        sess.room_assignments?.forEach(ra => {
          if (roomSeen[ra.room]) cs.push(`Room Conflict: ${ra.room_number} overbooked on ${slot.day_display} ${slot.time_slot_name}`);
          roomSeen[ra.room] = true;
        });
      });
    });
    return cs;
  }, [slots]);

  const selectedPlan = allPlans.find(p => p.id === filters.plan);
  const filtersWithRooms = { ...filters, _rooms: rooms };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Monitor className="w-6 h-6 text-[var(--primary)]" /> Timetable Monitor
          </h2>
          <p className="text-muted text-sm mt-1">Monitor timetable by campus, department, faculty, and conflict status.</p>
        </div>
        <div className="flex items-center gap-3">
          {hasFilters && (
            <button onClick={clearFilters} className="text-sm text-[#EF4444] flex items-center gap-1 hover:underline">
              <X className="w-4 h-4" /> Clear
            </button>
          )}
          <button onClick={loadGrid} className="text-muted hover:text-foreground transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-muted flex items-center gap-2 py-4"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
      ) : (
        <FilterBar
          filters={filtersWithRooms}
          setF={setF}
          campuses={campuses}
          allDepts={allDepts}
          allPlans={allPlans}
        />
      )}

      {/* Analytics Row */}
      {filters.plan && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Workload */}
          <div className="bg-surface border border-border rounded-2xl p-5">
            <h3 className="text-foreground font-bold mb-4 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-[var(--primary)]" /> Faculty Workload</h3>
            {workloadSummary.length === 0 ? (
              <p className="text-muted text-sm">No sessions assigned yet.</p>
            ) : (
              <div className="space-y-3">
                {workloadSummary.map(fw => (
                  <div key={fw.name}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-foreground font-medium truncate flex-1">{fw.name}</span>
                      <span className="text-xs text-muted ml-2 shrink-0">{fw.hours} hrs/wk</span>
                    </div>
                    <div className="bg-surface rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-gradient-to-r from-[#22D3EE] to-[#10B981] transition-all"
                        style={{ width: `${Math.min((fw.hours / 20) * 100, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Conflicts */}
          <div className="bg-surface border border-border rounded-2xl p-5">
            <h3 className="text-foreground font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Conflict Log
            </h3>
            {conflicts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center mb-2">
                  <span className="text-emerald-400 text-xl">✓</span>
                </div>
                <p className="text-emerald-400 text-sm font-semibold">No conflicts detected</p>
                <p className="text-muted text-xs mt-1">All sessions look clean.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {conflicts.map((c, i) => (
                  <li key={i} className="text-red-400 text-xs bg-red-500/10 p-2 rounded-lg border border-red-500/20">{c}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Plan Summary */}
          <div className="bg-surface border border-border rounded-2xl p-5">
            <h3 className="text-foreground font-bold mb-4 flex items-center gap-2"><User className="w-4 h-4 text-[var(--primary)]" /> Plan Summary</h3>
            {selectedPlan && (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted">Plan</span><span className="text-foreground font-medium truncate ml-2">{selectedPlan.name}</span></div>
                <div className="flex justify-between"><span className="text-muted">Status</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${selectedPlan.status === 'published' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {selectedPlan.status_display}
                  </span>
                </div>
                {selectedPlan.campus_name    && <div className="flex justify-between"><span className="text-muted">Campus</span><span className="text-foreground">{selectedPlan.campus_name}</span></div>}
                {selectedPlan.department_name && <div className="flex justify-between"><span className="text-muted">Department</span><span className="text-foreground">{selectedPlan.department_name}</span></div>}
                <div className="flex justify-between"><span className="text-muted">Section</span><span className="text-foreground">{selectedPlan.section_name}</span></div>
                <div className="flex justify-between"><span className="text-muted">Total Slots</span><span className="text-foreground">{slots.length}</span></div>
                <div className="flex justify-between"><span className="text-muted">Assigned</span><span className="text-foreground">{slots.filter(s => s.class_sessions?.length > 0).length}</span></div>
                <div className="flex justify-between"><span className="text-muted">Empty</span><span className="text-foreground">{slots.filter(s => !s.class_sessions?.length).length}</span></div>
                <div className="flex justify-between"><span className="text-muted">Faculty Count</span><span className="text-foreground">{workloadSummary.length}</span></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Faculty-Scoped Banner */}
      {filters.plan && filters.faculty && (
        <div className="bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 rounded-2xl px-4 py-2.5 text-sm text-[#8B5CF6] font-medium flex items-center gap-2">
          <Search className="w-4 h-4" />
          Showing only sessions assigned to the selected faculty. Clear faculty filter to see the full grid.
        </div>
      )}

      {/* Timetable Grid (read-only) */}
      {filters.plan && (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-foreground font-bold">Timetable Grid</h3>
            {gridLoading && <Loader2 className="w-4 h-4 animate-spin text-muted" />}
          </div>
          {!gridLoading && filteredSlots.length > 0 ? (
            <div className="overflow-x-auto p-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="p-3 text-xs font-bold text-muted border-b border-border border-r w-28">Day</th>
                    {periods.map(p => (
                      <th key={`${p.time_slot_start}-${p.time_slot_end}`} className="p-3 text-xs font-bold text-[var(--primary)] border-b border-border text-center min-w-[160px]">
                        {p.time_slot_name}<br/>
                        <span className="text-muted font-normal">{p.time_slot_start?.slice(0,5)}–{p.time_slot_end?.slice(0,5)}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {days.map(d => (
                    <tr key={d} className="border-b border-border/50 last:border-0">
                      <td className="p-3 text-sm font-bold text-muted border-r border-border bg-surface">{d}</td>
                      {periods.map(p => {
                        const sid = `${p.time_slot_start}-${p.time_slot_end}`;
                        const cell = filteredSlots.find(s => s.day_display === d && `${s.time_slot_start}-${s.time_slot_end}` === sid);
                        return (
                          <td key={sid} className="p-2 border-r border-border/50 last:border-0 align-top min-h-[80px]">
                            {cell?.class_sessions?.map(sess => (
                              <div key={sess.id} className="bg-surface p-2 rounded-lg text-xs mb-1 border border-[#2A3A5A] hover:border-[#22D3EE]/40 transition-colors">
                                <div className="font-bold text-foreground">{sess.course_code}</div>
                                <div className="text-[var(--primary)] text-[10px] mt-0.5">{sess.faculty_assignments?.[0]?.faculty_name || '—'}</div>
                                <div className="text-[#10B981] text-[10px]">{sess.room_assignments?.[0]?.room_number || '—'}</div>
                              </div>
                            ))}
                            {!cell?.class_sessions?.length && (
                              <span className="text-[#334155] text-xs italic">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !gridLoading ? (
            <div className="text-muted text-center py-12 text-sm">
              No slots found. Generate grid slots from the builder first.
            </div>
          ) : null}
        </div>
      )}

      {!filters.plan && !loading && (
        <div className="text-center py-20 text-muted">
          <Monitor className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Select a timetable plan above to monitor its sessions.</p>
        </div>
      )}
    </div>
  );
}
