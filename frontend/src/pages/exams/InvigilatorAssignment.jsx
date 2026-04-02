import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { examsApi } from '../../api/exams';
import { academicsApi } from '../../api/academics';
import { Plus, X, UserCheck } from 'lucide-react';
import { Field, selectCls } from '../../components/academics/AcademicCrud';

export default function InvigilatorAssignment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  
  const [sessions, setSessions] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [invigilators, setInvigilators] = useState([]);
  const [faculty, setFaculty] = useState([]);

  const [loading, setLoading] = useState(true);

  // Form
  const [form, setForm] = useState({ hall_allocation_id: '', faculty_id: '', is_chief: false });
  const [error, setError] = useState('');

  const loadAll = async () => {
    setLoading(true);
    setPlan(await examsApi.getPlan(id));
    
    const sess = await examsApi.getSessions({ plan: id });
    setSessions(sess);

    const allocs = await examsApi.getHallAllocations();
    const myAllocs = allocs.filter(a => sess.some(s => s.id === a.session));
    setAllocations(myAllocs);

    const invigs = await examsApi.getInvigilatorAssignments();
    // Filter to those belonging to my allocations
    setInvigilators(invigs.filter(i => myAllocs.some(a => a.id === i.hall_allocation)));

    setFaculty(await academicsApi.getFaculty());

    setLoading(false);
  };

  useEffect(() => { loadAll(); }, [id]);

  const addInvigilator = async (e) => {
    e.preventDefault(); setError('');
    try {
      await examsApi.createInvigilatorAssignment({ 
        hall_allocation: form.hall_allocation_id, 
        faculty: form.faculty_id, 
        is_chief: form.is_chief 
      });
      setForm({ hall_allocation_id: '', faculty_id: '', is_chief: false });
      loadAll();
    } catch (err) {
      setError(Object.values(err.response?.data || {}).flat().join(' | '));
    }
  };

  const removeInvigilator = async (iId) => {
    await examsApi.deleteInvigilatorAssignment(iId);
    loadAll();
  };

  if (loading) return null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
         <div>
            <button onClick={() => navigate('/exams/plans')} className="text-[var(--primary)] text-sm mb-2 hover:underline tracking-wide font-bold uppercase block">&larr; Back to Exam Plans</button>
            <h2 className="text-3xl font-bold text-foreground">Step 3: Assign Invigilators</h2>
            <p className="text-muted mt-1">{plan.name} — Assign faculty to oversee allocated halls.</p>
         </div>
         <button onClick={() => navigate(`/exams/publish/${id}`)} className="bg-[#10B981] text-[#0F172A] px-5 py-2.5 rounded-xl font-bold hover:bg-[#059669] transition-colors">Finish & Publish &rarr;</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* L: Form */}
        <div className="lg:col-span-1">
          <div className="bg-background border border-border rounded-3xl p-6 sticky top-6">
             <h3 className="text-foreground font-bold mb-4 flex items-center gap-2"><UserCheck className="w-5 h-5 text-[#A855F7]" /> Map Faculty to Hall</h3>
             {error && <div className="mb-4 bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] p-3 rounded-xl text-xs">{error}</div>}
             <form onSubmit={addInvigilator} className="space-y-4">
                <Field label="Target Booked Room">
                  <select required className={selectCls} value={form.hall_allocation_id} onChange={e => setForm({...form, hall_allocation_id: e.target.value})}>
                    <option value="">Select an allocated room...</option>
                    {allocations.map(a => {
                       const s = sessions.find(ss => ss.id === a.session);
                       return <option key={a.id} value={a.id}>{s?.name} — {a.room_number}</option>;
                    })}
                  </select>
                </Field>
                <Field label="Select Faculty (Checks Conflicts)">
                  <select required className={selectCls} value={form.faculty_id} onChange={e => setForm({...form, faculty_id: e.target.value})}>
                    <option value="">Choose...</option>
                    {faculty.map(f => <option key={f.user} value={f.user}>{f.user_name} ({f.department_name})</option>)}
                  </select>
                </Field>
                <label className="flex items-center gap-2 cursor-pointer mt-2">
                  <input type="checkbox" checked={form.is_chief} onChange={e => setForm({...form, is_chief: e.target.checked})} className="w-4 h-4 rounded-md accent-[#A855F7] bg-background border-border" />
                  <span className="text-sm font-bold text-muted">Mark as Chief Invigilator</span>
                </label>
                <button type="submit" disabled={!form.hall_allocation_id || !form.faculty_id} className="w-full bg-[#A855F7] text-foreground py-2 mt-4 rounded-xl font-bold hover:bg-[#9333EA] flex items-center justify-center gap-2 disabled:opacity-50"><Plus className="w-4 h-4" /> Assign</button>
             </form>
          </div>
        </div>

        {/* R: Overview */}
        <div className="lg:col-span-3 space-y-8">
            {sessions.map(sess => {
              const myAllocs = allocations.filter(a => a.session === sess.id);
              if (myAllocs.length === 0) return null;

              return (
                <div key={sess.id}>
                   <h3 className="font-bold text-muted text-lg mb-3 pb-2 border-b border-border">{sess.name} | {sess.date} ({sess.start_time.slice(0,5)} - {sess.end_time.slice(0,5)})</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {myAllocs.map(alloc => {
                        const myInvigs = invigilators.filter(i => i.hall_allocation === alloc.id);
                        return (
                          <div key={alloc.id} className="bg-background border border-border rounded-2xl overflow-hidden p-4">
                             <div className="flex justify-between items-center mb-3">
                               <p className="font-bold text-[#F59E0B] flex items-center gap-2">Room {alloc.room_number}</p>
                               <span className="text-muted text-xs font-mono">{myInvigs.length} assigned</span>
                             </div>
                             <div className="space-y-2 min-h-[50px]">
                               {myInvigs.length === 0 && <p className="text-[#334155] text-xs italic">Unassigned</p>}
                               {myInvigs.map(inv => (
                                 <div key={inv.id} className="flex justify-between items-center bg-surface px-3 py-2 rounded-xl text-sm">
                                    <div className="flex items-center gap-2">
                                       <span className="font-bold text-foreground">{inv.faculty_name}</span>
                                       {inv.is_chief && <span className="bg-[#A855F7]/20 text-[#A855F7] text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">Chief</span>}
                                    </div>
                                    <button onClick={() => removeInvigilator(inv.id)} className="text-[#EF4444] hover:text-foreground"><X className="w-3 h-3"/></button>
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
        </div>
      </div>
    </div>
  );
}
