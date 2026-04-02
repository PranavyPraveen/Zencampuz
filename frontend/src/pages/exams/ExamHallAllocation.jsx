import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { examsApi } from '../../api/exams';
import { campusApi } from '../../api/campus';
import { Plus, X, Layers, Users } from 'lucide-react';
import { Field, selectCls } from '../../components/academics/AcademicCrud';

export default function ExamHallAllocation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  
  const [sessions, setSessions] = useState([]);
  const [rooms, setRooms] = useState([]);
  
  // All the nested stuff
  const [assignments, setAssignments] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [seating, setSeating] = useState([]);

  const [loading, setLoading] = useState(true);

  // Forms
  const [hallForm, setHallForm] = useState({ session_id: '', room_id: '' });
  const [hallError, setHallError] = useState('');

  const [seatForm, setSeatForm] = useState({ hall_allocation_id: '', exam_assignment_id: '', allocated_count: '' });
  const [seatError, setSeatError] = useState('');

  const loadAll = async () => {
    setLoading(true);
    setPlan(await examsApi.getPlan(id));
    
    const sess = await examsApi.getSessions({ plan: id });
    setSessions(sess);

    setRooms(await campusApi.getRooms());

    const assigns = await examsApi.getCourseAssignments();
    const myAssigns = assigns.filter(a => sess.some(s => s.id === a.session));
    setAssignments(myAssigns);

    const allocs = await examsApi.getHallAllocations();
    const myAllocs = allocs.filter(a => sess.some(s => s.id === a.session));
    setAllocations(myAllocs);

    const seats = await examsApi.getSeatingPlans();
    // Filter seating records matching our known allocations
    setSeating(seats.filter(s => myAllocs.some(a => a.id === s.hall_allocation)));

    setLoading(false);
  };

  useEffect(() => { loadAll(); }, [id]);

  const addHall = async (e) => {
    e.preventDefault(); setHallError('');
    try {
      await examsApi.createHallAllocation({ session: hallForm.session_id, room: hallForm.room_id });
      setHallForm({ session_id: '', room_id: '' });
      loadAll();
    } catch (err) {
      setHallError(Object.values(err.response?.data || {}).flat().join(' | '));
    }
  };

  const addSeating = async (e) => {
    e.preventDefault(); setSeatError('');
    try {
      await examsApi.createSeatingPlan({ 
        exam_assignment: seatForm.exam_assignment_id, 
        hall_allocation: seatForm.hall_allocation_id, 
        allocated_count: seatForm.allocated_count 
      });
      setSeatForm({ ...seatForm, allocated_count: '' });
      loadAll();
    } catch (err) {
      setSeatError(Object.values(err.response?.data || {}).flat().join(' | '));
    }
  };

  const removeHall = async (alId) => {
    if(!window.confirm("Remove Room from session?")) return;
    await examsApi.deleteHallAllocation(alId);
    loadAll();
  };

  const removeSeating = async (sId) => {
    await examsApi.deleteSeatingPlan(sId);
    loadAll();
  };

  if (loading) return null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
         <div>
            <button onClick={() => navigate('/exams/plans')} className="text-[var(--primary)] text-sm mb-2 hover:underline tracking-wide font-bold uppercase block">&larr; Back to Exam Plans</button>
            <h2 className="text-3xl font-bold text-foreground">Step 2: Room & Capacity Layout</h2>
            <p className="text-muted mt-1">{plan.name} — Split large sections across multiple rooms safely.</p>
         </div>
         <button onClick={() => navigate(`/exams/invigilators/${id}`)} className="bg-[#A855F7] text-foreground px-5 py-2.5 rounded-xl font-bold hover:bg-[#9333EA] transition-colors">Continue to Invigilators &rarr;</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Master form for allocating halls to sessions */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-background border border-border rounded-3xl p-6">
             <h3 className="text-foreground font-bold mb-4 flex items-center gap-2"><Layers className="w-5 h-5 text-[var(--primary)]" /> 1. Book Room for Session</h3>
             {hallError && <div className="mb-4 bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] p-3 rounded-xl text-xs">{hallError}</div>}
             <form onSubmit={addHall} className="space-y-4">
                <Field label="Select Session">
                  <select required className={selectCls} value={hallForm.session_id} onChange={e => setHallForm({...hallForm, session_id: e.target.value})}>
                    <option value="">Choose...</option>
                    {sessions.map(s => <option key={s.id} value={s.id}>{s.name} ({s.date})</option>)}
                  </select>
                </Field>
                <Field label="Select Room (Checks double-bookings)">
                  <select required className={selectCls} value={hallForm.room_id} onChange={e => setHallForm({...hallForm, room_id: e.target.value})}>
                    <option value="">Choose...</option>
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.room_number} (Cap: {r.capacity})</option>)}
                  </select>
                </Field>
                <button type="submit" className="w-full bg-surface text-foreground py-2 rounded-xl font-bold hover:bg-[#2A3A6A] flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Book Room</button>
             </form>
          </div>

          <div className="bg-background border border-border rounded-3xl p-6">
             <h3 className="text-foreground font-bold mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-[#10B981]" /> 2. Seat Students in Room</h3>
             {seatError && <div className="mb-4 bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] p-3 rounded-xl text-xs">{seatError}</div>}
             <form onSubmit={addSeating} className="space-y-4">
                <Field label="Target Booked Room">
                  <select required className={selectCls} value={seatForm.hall_allocation_id} onChange={e => setSeatForm({...seatForm, hall_allocation_id: e.target.value, exam_assignment_id: ''})}>
                    <option value="">Select an allocated room...</option>
                    {allocations.map(a => {
                       const s = sessions.find(ss => ss.id === a.session);
                       return <option key={a.id} value={a.id}>{s?.name} — {a.room_number} (Cap {a.capacity})</option>;
                    })}
                  </select>
                </Field>
                
                {seatForm.hall_allocation_id && (
                  <>
                     <Field label="Course & Section (Filtered by Session)">
                       <select required className={selectCls} value={seatForm.exam_assignment_id} onChange={e => setSeatForm({...seatForm, exam_assignment_id: e.target.value})}>
                         <option value="">Select course...</option>
                         {/* Only courses assigned to this specific session block */}
                         {assignments.filter(a => a.session === allocations.find(al=>al.id === seatForm.hall_allocation_id)?.session).map(a => {
                            // Calculate remaining unseated students
                            const seated = seating.filter(st => st.exam_assignment === a.id).reduce((sum, st) => sum + st.allocated_count, 0);
                            const remaining = a.student_count - seated;
                            return <option key={a.id} value={a.id}>[{a.course_code}] Sec {a.section_name} (Needs {remaining} seats)</option>;
                         })}
                       </select>
                     </Field>
                     <Field label="Allocate N Students">
                        <input required type="number" min="1" className="w-full bg-background border border-border p-2 rounded-xl text-foreground outline-none focus:border-[#10B981]" value={seatForm.allocated_count} onChange={e => setSeatForm({...seatForm, allocated_count: e.target.value})} placeholder="e.g. 30" />
                     </Field>
                  </>
                )}
                <button type="submit" disabled={!seatForm.hall_allocation_id} className="w-full bg-[#10B981] text-[#0F172A] py-2 rounded-xl font-bold hover:bg-[#059669] flex items-center justify-center gap-2 disabled:opacity-50"><Plus className="w-4 h-4" /> Place in Room</button>
             </form>
          </div>
        </div>

        {/* Right Col: Complex Visualizer of Rooms -> Seats */}
        <div className="lg:col-span-2 space-y-4 border-l border-border pl-6 min-h-screen">
            <h3 className="text-xl font-bold text-foreground mb-2">Live Seating Layout</h3>
            {sessions.map(sess => {
              const myAllocs = allocations.filter(a => a.session === sess.id);
              if (myAllocs.length === 0) return null;

              return (
                <div key={sess.id} className="bg-surface border border-border rounded-3xl p-5 w-full">
                   <div className="border-b border-border/50 pb-3 mb-4">
                     <p className="font-bold text-[var(--primary)]">{sess.name} <span className="text-muted font-normal text-sm ml-2">{sess.date}</span></p>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      {myAllocs.map(alloc => {
                        const mySeats = seating.filter(s => s.hall_allocation === alloc.id);
                        const usedSeats = mySeats.reduce((sum, s) => sum + s.allocated_count, 0);
                        const isFull = usedSeats >= alloc.capacity;

                        return (
                          <div key={alloc.id} className="border border-border bg-background rounded-2xl overflow-hidden relative group font-mono text-sm">
                            <button onClick={() => removeHall(alloc.id)} className="absolute top-2 right-2 text-[#EF4444] opacity-0 group-hover:opacity-100 transition-opacity z-10 p-1"><X className="w-4 h-4"/></button>
                            <div className="p-3 border-b border-border flex justify-between items-center bg-background">
                               <span className="font-bold text-foreground">Room {alloc.room_number}</span>
                               <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${isFull ? 'bg-[#EF4444]/20 text-[#EF4444]' : 'bg-[#10B981]/20 text-[#10B981]'}`}>{usedSeats} / {alloc.capacity} Filled</span>
                            </div>
                            <div className="p-3 min-h-[80px] space-y-2">
                               {mySeats.length === 0 && <p className="text-[#334155] text-xs italic text-center mt-2">Empty Room</p>}
                               {mySeats.map(st => (
                                 <div key={st.id} className="flex justify-between items-center text-xs bg-surface p-2 rounded-lg">
                                    <span className="text-muted"><b className="text-foreground">{st.course_code}</b> (Sec {st.section_name})</span>
                                    <div className="flex items-center gap-2">
                                       <span className="font-bold text-[#F59E0B]">{st.allocated_count} pax</span>
                                       <button onClick={() => removeSeating(st.id)} className="text-[#EF4444] hover:text-foreground"><X className="w-3 h-3"/></button>
                                    </div>
                                 </div>
                               ))}
                            </div>
                          </div>
                        );
                      })}
                   </div>
                </div>
              );
            })}
            
            {allocations.length === 0 && (
               <div className="text-center p-12 border-2 border-dashed border-border rounded-3xl text-muted">
                 Book rooms on the left to start allocating capacity.
               </div>
            )}
        </div>

      </div>
    </div>
  );
}
