import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { timetableApi } from '../../api/timetable';
import { academicsApi } from '../../api/academics';
import { campusApi } from '../../api/campus';
import { Check, X, Plus, AlertCircle, Trash2, Wand2, Info, Pencil } from 'lucide-react';
import { Field, selectCls } from '../../components/academics/AcademicCrud';

export default function TimetableBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [slots, setSlots] = useState([]);
  
  // Data sources for the modal
  const [courseSections, setCourseSections] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [rooms, setRooms] = useState([]);

  // Modal State
  const [activeSlot, setActiveSlot] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Session form state
  const [sForm, setSForm] = useState({ course_section: '', session_type: 'regular', faculty_id: '', room_id: '' });
  const [sSaving, setSSaving] = useState(false);
  const [sError, setSError] = useState('');
  
  // Auto-schedule UI state
  const [autoResults, setAutoResults] = useState(null);
  const [autoRunning, setAutoRunning] = useState(false);
  const [suggestedRooms, setSuggestedRooms] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);

  // Edit existing session state
  const [editSession, setEditSession] = useState(null);
  const [editForm, setEditForm] = useState({ session_type: 'regular', faculty_id: '', room_id: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const loadGrid = async () => {
    setLoading(true);
    setPlan(await timetableApi.getPlan(id));
    setSlots(await timetableApi.getPlanGrid(id));
    setLoading(false);
  };

  const loadMeta = async () => {
    const [cs, f, r] = await Promise.all([
      academicsApi.getCourseSections(),
      academicsApi.getFaculty(),
      campusApi.getRooms()
    ]);
    setCourseSections(cs);
    setFaculty(f);
    setRooms(r);
  };

  useEffect(() => { loadGrid(); loadMeta(); }, [id]);

  const generateSlots = async () => {
    if (!window.confirm("This will scaffold the missing day/period intersections based on active days and templates. Proceed?")) return;
    await timetableApi.generateSlots(id);
    loadGrid();
  };

  const runAutoScheduler = async () => {
    if (!window.confirm("This will attempt to fit all unassigned courses into empty slots automatically. Proceed?")) return;
    setAutoRunning(true); setAutoResults(null);
    try {
      const results = await timetableApi.autoSchedule(id);
      setAutoResults(results);
      loadGrid();
    } catch (err) { alert('Auto-schedule failed.'); }
    finally { setAutoRunning(false); }
  };

  const handleOpenAssign = (slot) => {
    setActiveSlot(slot);
    setSError('');
    setSForm({ course_section: '', session_type: 'regular', faculty_id: '', room_id: '' });
  };

  const handleSaveSession = async () => {
    setSSaving(true); setSError('');
    try {
      // 1. Create ClassSession
      const sess = await timetableApi.createClassSession({
        timetable_slot: activeSlot.id,
        course_section: sForm.course_section,
        session_type: sForm.session_type
      });

      // 2. Assign Faculty
      if (sForm.faculty_id) {
        await timetableApi.createFacultyAssignment({ class_session: sess.id, faculty: sForm.faculty_id });
      }

      // 3. Assign Room
      if (sForm.room_id) {
        await timetableApi.createRoomAssignment({ class_session: sess.id, room: sForm.room_id });
      }

      setActiveSlot(null);
      loadGrid();
    } catch (err) {
      // Django validation errors are returned as arrays
      const msg = err.response?.data ? Object.values(err.response.data).flat().join(' | ') : 'Failed to save or conflict detected.';
      setSError(msg);
    } finally {
      setSSaving(false);
    }
  };

  const handleDeleteSession = async (sessId) => {
    if (!window.confirm("Remove this session?")) return;
    await timetableApi.deleteClassSession(sessId);
    loadGrid();
  };

  const handleOpenEdit = (sess) => {
    setEditError('');
    setEditSession(sess);
    setEditForm({
      course_section: sess.course_section || '',
      session_type: sess.session_type || 'regular',
      faculty_id: sess.faculty_assignments?.[0]?.faculty || '',
      room_id: sess.room_assignments?.[0]?.room || '',
    });
  };

  const handleSaveEdit = async () => {
    setEditSaving(true); setEditError('');
    try {
      // 1. Update session config (type and course section)
      await timetableApi.updateClassSession(editSession.id, { 
        session_type: editForm.session_type,
        course_section: editForm.course_section 
      });

      // 2. Swap faculty: delete old, create new
      if (editSession.faculty_assignments?.[0]) {
        await timetableApi.deleteFacultyAssignment(editSession.faculty_assignments[0].id);
      }
      if (editForm.faculty_id) {
        await timetableApi.createFacultyAssignment({ class_session: editSession.id, faculty: editForm.faculty_id });
      }

      // 3. Swap room: delete old, create new
      if (editSession.room_assignments?.[0]) {
        await timetableApi.deleteRoomAssignment(editSession.room_assignments[0].id);
      }
      if (editForm.room_id) {
        await timetableApi.createRoomAssignment({ class_session: editSession.id, room: editForm.room_id });
      }

      setEditSession(null);
      loadGrid();
    } catch (err) {
      const msg = err.response?.data ? Object.values(err.response.data).flat().join(' | ') : 'Failed to save edits or conflict detected.';
      setEditError(msg);
    } finally { setEditSaving(false); }
  };

  // Grouping logic for the Grid
  const days = [...new Set(slots.map(s => s.day_display))];
  const periods = [...new Set(slots.map(s => `${s.time_slot_name} (${s.time_slot_start.slice(0,5)}-${s.time_slot_end.slice(0,5)})`))];
  
  const getCell = (d, p) => {
    return slots.find(s => s.day_display === d && `${s.time_slot_name} (${s.time_slot_start.slice(0,5)}-${s.time_slot_end.slice(0,5)})` === p);
  };

  // Effect to load Room suggestions when Assign Modal changes context
  useEffect(() => {
    if (!activeSlot) return;
    const fetchSuggestions = async () => {
      setSuggestLoading(true);
      try {
        const selectedCS = courseSections.find(cs => cs.id === sForm.course_section);
        const ctype = selectedCS?.course?.course_type === 'practical' ? 'practical' : 'theory';
        const d = await timetableApi.suggestRooms(activeSlot.id, ctype, sForm.faculty_id || '');
        setSuggestedRooms(d);
      } catch (e) {
        setSuggestedRooms([]);
      } finally {
        setSuggestLoading(false);
      }
    };
    fetchSuggestions();
  }, [sForm.course_section, sForm.faculty_id, activeSlot]);

  if (loading) return <div className="text-foreground">Loading grid...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <button onClick={() => navigate('/timetable/plans')} className="text-[var(--primary)] text-sm mb-2 hover:underline tracking-wide font-bold uppercase block">&larr; Back to Plans</button>
          <h2 className="text-3xl font-bold text-foreground">{plan?.name}</h2>
          <p className="text-muted text-sm mt-1">{plan?.semester_name} — Section {plan?.section_name}</p>
        </div>
        <div className="flex gap-2">
          {slots.length === 0 && (
            <button onClick={generateSlots} className="bg-[var(--primary)] text-[#0F172A] px-4 py-2 rounded-xl font-bold">Generate Grid Setup</button>
          )}
          {slots.length > 0 && (
             <button onClick={runAutoScheduler} disabled={autoRunning} className="bg-[#10B981] text-[#0F172A] px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-[#059669] transition-colors disabled:opacity-50">
               <Wand2 className="w-4 h-4"/> {autoRunning ? 'Scheduling...' : 'Auto-Schedule'}
             </button>
          )}
        </div>
      </div>

      {autoResults && (
        <div className="bg-[#10B981]/10 border border-[#10B981]/20 rounded-2xl p-4 flex gap-4 items-start">
           <Info className="w-6 h-6 text-[#10B981] shrink-0 mt-0.5" />
           <div className="flex-1">
             <h4 className="text-[#10B981] font-bold">Auto-Schedule Complete</h4>
             <p className="text-[#D1D5DB] text-sm mt-1">Successfully placed {autoResults.success_count} / {autoResults.total_requested} requested class sessions.</p>
             {autoResults.conflicts?.length > 0 && (
                 <div className="mt-3 bg-background p-3 rounded-xl border border-[#EF4444]/30">
                   <p className="text-[#EF4444] text-xs font-bold mb-2 uppercase tracking-widest">Unresolvable Conflicts ({autoResults.conflicts.length})</p>
                   <ul className="text-sm font-mono text-muted space-y-1">
                     {autoResults.conflicts.map((c, i) => <li key={i}>- {c}</li>)}
                   </ul>
                   <p className="text-muted text-xs mt-2 italic">You must manually schedule these remaining sessions or adjust constraints.</p>
                 </div>
             )}
           </div>
           <button onClick={() => setAutoResults(null)} className="text-muted hover:text-foreground"><X className="w-5 h-5"/></button>
        </div>
      )}

      {slots.length > 0 ? (
        <div className="overflow-x-auto bg-background border border-border rounded-2xl p-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="p-3 font-bold text-muted border-b border-border border-r">Day / Time</th>
                {periods.map(p => <th key={p} className="p-3 text-sm font-bold text-[var(--primary)] border-b border-border text-center min-w-[200px]">{p}</th>)}
              </tr>
            </thead>
            <tbody>
              {days.map(d => (
                <tr key={d} className="border-b border-border/50 last:border-0 hover:bg-surface/10">
                  <td className="p-3 font-bold text-muted border-r border-border bg-surface">{d}</td>
                  {periods.map(p => {
                    const cell = getCell(d, p);
                    return (
                      <td key={p} className="p-2 border-r border-border/50 last:border-0 align-top h-32 relative group">
                        {cell ? (
                          <div className="h-full flex flex-col gap-2">
                            {cell.class_sessions.map(sess => (
                              <div key={sess.id} className="bg-surface p-2 rounded-xl text-xs flex flex-col justify-between h-full border border-transparent hover:border-[#22D3EE]/40 transition-colors relative group">
                                <span className="font-bold text-foreground">{sess.course_code}</span>
                                <span className="text-muted max-w-[150px] truncate" title={sess.course_name}>{sess.course_name} ({sess.session_type})</span>
                                <div className="mt-2 text-[var(--primary)] font-medium flex justify-between items-center bg-background px-2 py-1 rounded-lg">
                                    <span>{sess.faculty_assignments[0]?.faculty_name || 'No Fac'}</span>
                                    <span className="text-[#10B981]">{sess.room_assignments[0]?.room_number || 'No Rm'}</span>
                                </div>
                                <button onClick={() => handleOpenEdit(sess)} className="absolute -top-2 -left-2 bg-[var(--primary)] text-[#0F172A] rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg" title="Edit Session">
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button onClick={() => handleDeleteSession(sess.id)} className="absolute -top-2 -right-2 bg-[#EF4444] text-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg"><Trash2 className="w-3 h-3" /></button>
                              </div>
                            ))}
                            {cell.class_sessions.length === 0 && (
                              <button onClick={() => handleOpenAssign(cell)} className="h-full w-full border-2 border-dashed border-border rounded-xl flex items-center justify-center text-muted hover:border-[#22D3EE] hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all text-sm font-bold">
                                <Plus className="w-4 h-4 mr-1"/> Assign
                              </button>
                            )}
                          </div>
                        ) : <span className="text-[#334155] text-xs italic flex items-center justify-center h-full">-</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center p-12 bg-background border-2 border-dashed border-border rounded-3xl text-muted">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
          Grid is uninitialized. Generate the setup first.
        </div>
      )}

      {/* Assignment Modal */}
      {activeSlot && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-background border border-border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <h3 className="text-xl font-bold text-foreground">Assign Class</h3>
              <button onClick={() => setActiveSlot(null)} className="text-muted hover:text-foreground"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 space-y-4">
              {sError && (
                <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] p-3 rounded-xl text-sm flex items-start gap-2 font-mono">
                  <AlertCircle className="w-5 h-5 shrink-0" /> {sError}
                </div>
              )}
              <div className="text-sm font-bold text-muted bg-surface/30 p-3 rounded-xl border border-border">
                Day: {activeSlot.day_display} | Time: {activeSlot.time_slot_name}
              </div>

               <Field label="Subject / Course Section">
                  <select className={selectCls} value={sForm.course_section} onChange={e => setSForm({...sForm, course_section: e.target.value})}>
                    <option value="">Select subject mapped to this section...</option>
                    {/* Only show courses mapped to THIS plan's semester/section combo */}
                    {courseSections.filter(cs => cs.semester === plan.semester && cs.section === plan.section).map(cs => (
                      <option key={cs.id} value={cs.id}>[{cs.course_code}] {cs.course_name}</option>
                    ))}
                  </select>
               </Field>
               <div className="grid grid-cols-2 gap-4">
                  <Field label="Class Type">
                    <select className={selectCls} value={sForm.session_type} onChange={e => setSForm({...sForm, session_type: e.target.value})}>
                      <option value="regular">Regular</option>
                      <option value="lab">Lab</option>
                      <option value="tutorial">Tutorial</option>
                    </select>
                  </Field>
                  <Field label="Faculty">
                    <select className={selectCls} value={sForm.faculty_id} onChange={e => setSForm({...sForm, faculty_id: e.target.value})}>
                      <option value="">Select (optional)...</option>
                      {faculty.map(f => (<option key={f.user} value={f.user}>{f.user_name}</option>))}
                    </select>
                  </Field>
                  <div className="col-span-2">
                    <Field label="Room Assignment (Best Fit Suggested First)">
                      <select className={selectCls} value={sForm.room_id} onChange={e => setSForm({...sForm, room_id: e.target.value})}>
                        <option value="">Select (optional)...</option>
                        {suggestLoading && <option disabled>Calculating suggestions...</option>}
                        {!suggestLoading && suggestedRooms.length > 0 && (
                          <optgroup label="✨ Intelligent Best-Fit Suggestions (Free right now & fits capacity)">
                            {suggestedRooms.map(r => (
                              <option key={r.id} value={r.id}>
                                ⭐ {r.room_number} {r.name ? `(${r.name})` : ''} — {r.type} (Cap: {r.capacity})
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label="All Rooms">
                          {rooms.map(r => (<option key={r.id} value={r.id}>{r.room_number} {r.room_name ? `(${r.room_name})` : ''} - Cap {r.capacity}</option>))}
                        </optgroup>
                      </select>
                    </Field>
                  </div>
               </div>
            </div>
            <div className="p-6 border-t border-border bg-surface flex justify-end gap-3">
              <button onClick={() => setActiveSlot(null)} className="px-5 py-2.5 rounded-xl font-bold text-muted hover:text-foreground transition-colors">Cancel</button>
              <button onClick={handleSaveSession} disabled={!sForm.course_section || sSaving} className="bg-[var(--primary)] text-[#0F172A] px-5 py-2.5 rounded-xl font-bold hover:brightness-90 transition-colors flex items-center gap-2">
                {sSaving ? 'Adding...' : <><Check className="w-4 h-4"/> Confirm Assignment</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Session Modal ── */}
      {editSession && (() => {
        // Find if selected faculty/room is busy in another session in this SAME time slot
        const parentSlot = slots.find(s => s.class_sessions.some(cs => cs.id === editSession.id));
        const isFacBusy = editForm.faculty_id && parentSlot?.class_sessions.some(cs => cs.id !== editSession.id && cs.faculty_assignments.some(fa => fa.faculty === editForm.faculty_id));
        const isRoomBusy = editForm.room_id && parentSlot?.class_sessions.some(cs => cs.id !== editSession.id && cs.room_assignments.some(ra => ra.room === editForm.room_id));

        // Cascading Filters Logic
        const selectedCourse = courseSections.find(cs => cs.id === editForm.course_section);
        // If a subject is selected, ONLY show the faculty that is assigned to that specific Course Section. 
        // If no subject is explicitly selected (or we want to fallback), show all faculty.
        const filteredFacultyList = selectedCourse?.faculty 
          ? faculty.filter(f => f.user === selectedCourse.faculty)
          : faculty;

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-background border border-[#22D3EE]/30 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center p-6 border-b border-border">
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-[var(--primary)]" /> Edit Session
                </h3>
                <button onClick={() => setEditSession(null)} className="text-muted hover:text-foreground"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                {editError && (
                  <div className="bg-[#EF4444]/10 border border-[#EF4444]/50 text-[#EF4444] p-3 rounded-xl text-sm flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 shrink-0" /> {editError}
                  </div>
                )}
                
                <Field label="Subject / Course Section">
                  <select 
                    className={selectCls} 
                    value={editForm.course_section} 
                    onChange={e => {
                      const newCsId = parseInt(e.target.value, 10);
                      const newCourseObj = courseSections.find(c => c.id === newCsId);
                      setEditForm({
                        ...editForm, 
                        course_section: newCsId,
                        // Auto-assign the faculty that belongs to this newly selected subject
                        faculty_id: newCourseObj?.faculty || ''
                      });
                    }}
                  >
                    {courseSections.filter(cs => cs.semester === plan.semester && cs.section === plan.section).map(cs => (
                      <option key={cs.id} value={cs.id}>[{cs.course_code}] {cs.course_name}</option>
                    ))}
                  </select>
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Session Type">
                    <select className={selectCls} value={editForm.session_type} onChange={e => setEditForm({...editForm, session_type: e.target.value})}>
                      {selectedCourse?.course?.course_type === 'practical' ? (
                        <option value="lab">Lab</option>
                      ) : (
                        <>
                          <option value="regular">Regular</option>
                          <option value="tutorial">Tutorial</option>
                          <option value="seminar">Seminar</option>
                        </>
                      )}
                    </select>
                  </Field>
                  <Field label="Faculty">
                    <select 
                      className={`${selectCls} ${isFacBusy ? '!border-red-500 !ring-red-500/20' : ''}`} 
                      value={editForm.faculty_id} 
                      onChange={e => setEditForm({...editForm, faculty_id: e.target.value})}
                    >
                      <option value="">(remove faculty)</option>
                      {filteredFacultyList.map(f => <option key={f.user} value={f.user}>{f.user_name}</option>)}
                    </select>
                    {isFacBusy && <span className="text-red-400 text-xs mt-1 block">⚠️ Faculty already booked in this slot</span>}
                  </Field>
                  
                  <div className="col-span-2">
                    <Field label="Room">
                      <select 
                        className={selectCls} 
                        value={editForm.room_id} 
                        onChange={e => setEditForm({...editForm, room_id: e.target.value})}
                      >
                        <option value="">(remove room)</option>
                        {rooms.filter(r => {
                          // Room is available if it's NOT assigned to any OTHER session in this slot
                          const isBusy = parentSlot?.class_sessions.some(cs => cs.id !== editSession.id && cs.room_assignments.some(ra => ra.room === r.id));
                          return !isBusy;
                        }).map(r => (
                          <option key={r.id} value={r.id}>
                            {r.room_number} ({r.building_code || 'Main'}) — Cap {r.capacity}
                          </option>
                        ))}
                      </select>
                      {isRoomBusy && <span className="text-red-400 text-xs mt-1 block">⚠️ Room already booked in this slot</span>}
                    </Field>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-border bg-surface flex justify-end gap-3">
                <button onClick={() => setEditSession(null)} className="px-5 py-2.5 rounded-xl font-bold text-muted hover:text-foreground transition-colors">Cancel</button>
                <button onClick={handleSaveEdit} disabled={editSaving || isFacBusy || isRoomBusy} className="bg-[var(--primary)] text-[#0F172A] px-5 py-2.5 rounded-xl font-bold hover:brightness-90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {editSaving ? 'Saving...' : <><Check className="w-4 h-4" /> Save Changes</>}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
