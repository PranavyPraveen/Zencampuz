import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { timetableApi } from '../../api/timetable';
import { academicsApi } from '../../api/academics';

export default function DepartmentTimetableView() {
  const { user } = useAuth();
  const userRole = user?.role?.name || user?.role;
  const campusId = user?.campus?.id || user?.campus;
  const isHOD = Boolean(userRole === 'hod' || (user?.is_hod && userRole !== 'faculty'));
  
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  
  const [plans, setPlans] = useState([]); // All published plans for selected dept
  const [selectedProgramme, setSelectedProgramme] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingPlans, setFetchingPlans] = useState(false);

  // Initial load: Only depts for this campus
  useEffect(() => { 
    if (isHOD) {
      academicsApi.getDepartments().then(items => {
        setDepartments(items);
        if (items.length === 1) {
          setSelectedDept(String(items[0].id));
        }
      });
    } else if (campusId) {
      academicsApi.getDepartments({ campus_id: campusId }).then(setDepartments);
    } else {
      academicsApi.getDepartments().then(setDepartments);
    }
  }, [campusId, isHOD]);

  // When Dept changes, fetch its published plans
  useEffect(() => {
    if (!selectedDept) {
      setPlans([]);
      setSelectedProgramme('');
      setSelectedSection('');
      setSlots([]);
      return;
    }
    
    setFetchingPlans(true);
    timetableApi.getPlans({ 
      status: 'published', 
      department_id: selectedDept 
    }).then(res => {
      setPlans(res);
      setFetchingPlans(false);
    });
  }, [selectedDept]);

  // Unique Programmes from plans
  const availableProgrammes = useMemo(() => {
    const unique = [];
    const ids = new Set();
    plans.forEach(p => {
      if (p.programme && !ids.has(p.programme)) {
        ids.add(p.programme);
        unique.push({ id: p.programme, name: p.programme_name });
      }
    });
    return unique;
  }, [plans]);

  // Unique Sections from plans (matching selected programme)
  const availableSections = useMemo(() => {
    if (!selectedProgramme) return [];
    const unique = [];
    const ids = new Set();
    plans.filter(p => p.programme === selectedProgramme).forEach(p => {
      if (p.section && !ids.has(p.section)) {
        ids.add(p.section);
        // Use section_name but maybe clean it up if it's too long
        unique.push({ id: p.section, name: p.section_name });
      }
    });
    return unique;
  }, [plans, selectedProgramme]);

  // Load the specific plan grid when Section is picked
  const loadPlanGrid = async (sectionId) => {
    if (!sectionId) { setSlots([]); return; }
    
    // Find the specific plan
    const plan = plans.find(p => p.programme === selectedProgramme && p.section === sectionId);
    if (!plan) { setSlots([]); return; }

    setLoading(true);
    try {
      const g = await timetableApi.getPlanGrid(plan.id);
      const mySlots = g.filter(s => s.class_sessions && s.class_sessions.length > 0);
      setSlots(mySlots);
    } catch (err) {
      console.error(err);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeptChange = (id) => {
    setSelectedDept(id);
    setSelectedProgramme('');
    setSelectedSection('');
    setSlots([]);
  };

  const handleProgChange = (id) => {
    setSelectedProgramme(id);
    setSelectedSection('');
    setSlots([]);
  };

  const handleSectionChange = (id) => {
    setSelectedSection(id);
    loadPlanGrid(id);
  };

  // Grouping for table
  const days = [...new Set(slots.map(s => s.day_display))];
  const periods = [...new Set(slots.map(s => `${s.time_slot_name} (${s.time_slot_start.slice(0,5)}-${s.time_slot_end.slice(0,5)})`))];
  const getCell = (d, p) => slots.find(s => s.day_display === d && `${s.time_slot_name} (${s.time_slot_start.slice(0,5)}-${s.time_slot_end.slice(0,5)})` === p);

  const selectCls = "mt-1 w-full bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] block text-sm transition-all";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Department Timetable Overview</h2>
        <p className="text-muted mt-1">
          {isHOD
            ? 'Review your department timetable drafts and published plans by programme and section.'
            : `${user?.campus?.name ? `${user.campus.name} Campus • ` : ''}View aggregated schedules by department, programme, and section.`}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Department Filter */}
        {!isHOD && <div className="flex-1">
          <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Select Department</label>
          <select className={selectCls} value={selectedDept} onChange={e => handleDeptChange(e.target.value)}>
            <option value="">— Choose a department —</option>
            {departments.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
          </select>
        </div>}

        {/* Programme Filter */}
        <div className={`flex-1 transition-all duration-300 ${selectedDept ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Select Programme</label>
          <select className={selectCls} value={selectedProgramme} onChange={e => handleProgChange(e.target.value)}>
            <option value="">— Choose a programme —</option>
            {availableProgrammes.map(p => (<option key={p.id} value={p.id}>{p.name} ({p.code})</option>))}
          </select>
          {fetchingPlans && <span className="text-[10px] text-[var(--primary)] animate-pulse">Loading programmes...</span>}
        </div>

        {/* Section Filter */}
        <div className={`flex-1 transition-all duration-300 ${selectedProgramme ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Select Section</label>
          <select className={selectCls} value={selectedSection} onChange={e => handleSectionChange(e.target.value)}>
            <option value="">— Choose a section —</option>
            {availableSections.map(s => (<option key={s.id} value={s.id}>Section {s.name}</option>))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center p-12 bg-background border border-border rounded-3xl space-y-4">
          <div className="w-8 h-8 border-2 border-[#22D3EE] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[var(--primary)] font-medium tracking-wide">Loading timetable...</span>
        </div>
      )}

      {!loading && selectedDept && plans.length === 0 && !fetchingPlans && (
         <div className="text-center p-12 bg-background border border-border rounded-3xl text-muted">
            <div className="mb-2 text-2xl">📅</div>
            No time tables published for this department yet.
         </div>
      )}

      {!loading && selectedSection && slots.length === 0 && (
         <div className="text-center p-12 bg-background border border-border rounded-3xl text-muted">
            <div className="mb-2 text-2xl">ℹ️</div>
            No sessions found for the selected section.
         </div>
      )}

      {!loading && slots.length > 0 && selectedSection && (
        <div className="overflow-x-auto bg-background border border-border rounded-2xl p-4 shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="p-3 font-bold text-muted border-b border-border border-r w-32">Day</th>
                {periods.map(p => <th key={p} className="p-3 text-sm font-bold text-[var(--primary)] border-b border-border text-center min-w-[250px]">{p}</th>)}
              </tr>
            </thead>
            <tbody>
              {days.map(d => (
                <tr key={d} className="border-b border-border/50 last:border-0 hover:bg-surface/10">
                  <td className="p-3 font-bold text-muted border-r border-border bg-surface">{d}</td>
                  {periods.map(p => {
                    const cell = getCell(d, p);
                    return (
                       <td key={p} className="p-2 border-r border-border/50 last:border-0 align-top h-32 min-w-[250px]">
                        {cell ? (
                          <div className="h-full flex flex-col gap-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {cell.class_sessions.map(sess => (
                              <div key={sess.id} className="bg-surface/60 p-2.5 rounded-xl text-xs flex flex-col border border-[#22D3EE]/10 hover:border-[#22D3EE]/30 transition-colors shadow-sm">
                                <div className="flex justify-between items-start mb-1.5">
                                    <span className="font-bold text-foreground tracking-wider uppercase">{sess.course_code}</span>
                                    <span className="bg-[var(--primary)]/10 text-[var(--primary)] px-2 py-0.5 rounded text-[9px] uppercase font-black tracking-tighter">{sess.session_type}</span>
                                </div>
                                <span className="text-muted text-[11px] leading-snug mb-3 line-clamp-2" title={sess.course_name}>{sess.course_name}</span>
                                <div className="mt-auto pt-2 border-t border-border flex items-center justify-between text-[10px]">
                                  <div className="flex items-center gap-1.5 text-muted">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] opacity-50"></div>
                                    <span className="truncate max-w-[120px]" title={sess.faculty_assignments[0]?.faculty_name}>{sess.faculty_assignments[0]?.faculty_name || 'TBD'}</span>
                                  </div>
                                  <span className="bg-[#10B981]/10 text-[#10B981] px-2 py-0.5 rounded font-bold">{sess.room_assignments[0]?.room_number || 'TBD'}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : <span className="text-[#334155] text-[10px] font-black tracking-widest flex items-center justify-center opacity-20">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
