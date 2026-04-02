import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { examsApi } from '../../api/exams';
import { academicsApi } from '../../api/academics';
import { Plus, X, AlertCircle } from 'lucide-react';
import { Field, inputCls, selectCls } from '../../components/academics/AcademicCrud';

export default function ExamSessionScheduler() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [courseSections, setCourseSections] = useState([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [sForm, setSForm] = useState({ date: '', start_time: '', end_time: '', name: '' });
  const [sError, setSError] = useState('');
  
  const [aForm, setAForm] = useState({ session_id: '', course_section_id: '' });
  const [aError, setAError] = useState('');

  const loadAll = async () => {
    setLoading(true);
    const p = await examsApi.getPlan(id);
    setPlan(p);
    
    const sess = await examsApi.getSessions({ plan: id });
    setSessions(sess);

    const assigns = await examsApi.getCourseAssignments();
    // Filter assignments that belong to sessions in this plan
    const myAssigns = assigns.filter(a => sess.some(s => s.id === a.session));
    setAssignments(myAssigns);

    const cs = await academicsApi.getCourseSections();
    // Filter CS to match the Plan's semester
    setCourseSections(cs.filter(c => c.semester === p.semester));
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, [id]);

  const addSession = async (e) => {
    e.preventDefault(); setSError('');
    try {
      await examsApi.createSession({ ...sForm, plan: id });
      setSForm({ date: '', start_time: '', end_time: '', name: '' });
      loadAll();
    } catch (err) {
      setSError(Object.values(err.response?.data || {}).flat().join(' | '));
    }
  };

  const addAssignment = async (e) => {
    e.preventDefault(); setAError('');
    try {
      await examsApi.createCourseAssignment({ session: aForm.session_id, course_section: aForm.course_section_id });
      setAForm({ session_id: '', course_section_id: '' });
      loadAll();
    } catch (err) {
      setAError(Object.values(err.response?.data || {}).flat().join(' | '));
    }
  };

  const removeSession = async (sid) => {
    if(!window.confirm("Delete session and all booked exams in it?")) return;
    await examsApi.deleteSession(sid);
    loadAll();
  };

  const removeAssignment = async (aid) => {
    await examsApi.deleteCourseAssignment(aid);
    loadAll();
  };

  if (loading) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <div>
            <button onClick={() => navigate('/exams/plans')} className="text-[var(--primary)] text-sm mb-2 hover:underline tracking-wide font-bold uppercase block">&larr; Back to Exam Plans</button>
            <h2 className="text-3xl font-bold text-foreground">Step 1: Session Scheduler</h2>
            <p className="text-muted mt-1">{plan.name} — ({plan.start_date} to {plan.end_date})</p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
          {/* L: Add Session */}
          <div className="bg-background border border-border rounded-3xl p-6">
             <h3 className="text-foreground font-bold mb-4">Create Time Block</h3>
             {sError && <div className="mb-4 bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] p-3 rounded-xl text-xs">{sError}</div>}
             <form onSubmit={addSession} className="space-y-4">
                <Field label="Session Label"><input required className={inputCls} placeholder="e.g. Morning Shift" value={sForm.name} onChange={e => setSForm({...sForm, name: e.target.value})} /></Field>
                <Field label="Date"><input required type="date" className={inputCls} min={plan.start_date} max={plan.end_date} value={sForm.date} onChange={e => setSForm({...sForm, date: e.target.value})} /></Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Start Time"><input required type="time" className={inputCls} value={sForm.start_time} onChange={e => setSForm({...sForm, start_time: e.target.value})} /></Field>
                  <Field label="End Time"><input required type="time" className={inputCls} value={sForm.end_time} onChange={e => setSForm({...sForm, end_time: e.target.value})} /></Field>
                </div>
                <button type="submit" className="w-full bg-surface text-foreground py-2 rounded-xl font-bold hover:bg-[#2A3A6A] flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Add Session</button>
             </form>
          </div>

          {/* R: Assign Course to Session */}
          <div className="bg-background border border-border rounded-3xl p-6">
             <h3 className="text-foreground font-bold mb-4">Map Course to Session</h3>
             {aError && <div className="mb-4 bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] p-3 rounded-xl text-xs">{aError}</div>}
             <form onSubmit={addAssignment} className="space-y-4">
                <Field label="Select Session">
                  <select required className={selectCls} value={aForm.session_id} onChange={e => setAForm({...aForm, session_id: e.target.value})}>
                    <option value="">Choose...</option>
                    {sessions.map(s => <option key={s.id} value={s.id}>{s.date} | {s.name} ({s.start_time.slice(0,5)}-{s.end_time.slice(0,5)})</option>)}
                  </select>
                </Field>
                <Field label="Select Course mapped to Semester">
                  <select required className={selectCls} value={aForm.course_section_id} onChange={e => setAForm({...aForm, course_section_id: e.target.value})}>
                    <option value="">Choose...</option>
                    {courseSections.map(cs => <option key={cs.id} value={cs.id}>[{cs.course.code}] {cs.course.name} — Sec {cs.section.name} (Strength: {cs.section.strength})</option>)}
                  </select>
                </Field>
                <button type="submit" disabled={sessions.length === 0} className="w-full bg-[var(--primary)] text-[#0F172A] py-2 rounded-xl font-bold hover:brightness-90 flex items-center justify-center gap-2 disabled:opacity-50"><Plus className="w-4 h-4" /> Map Course & Check Overlap</button>
             </form>
             <p className="text-muted text-xs mt-3">The backend strictly validates student overlap conflicts and enforce a minimum same-day buffer rule.</p>
          </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-border">
         <h3 className="text-xl font-bold text-foreground">Configured Sessions</h3>
         {sessions.length === 0 && <div className="text-muted italic">No sessions created yet.</div>}
         
         <div className="grid grid-cols-1 gap-4">
            {sessions.map(sess => {
              const myCos = assignments.filter(a => a.session === sess.id);
              return (
                <div key={sess.id} className="bg-surface border border-border rounded-2xl p-4 flex gap-6 w-full">
                   <div className="w-1/4 shrink-0 border-r border-border pr-4 flex flex-col justify-center relative">
                     <p className="font-bold text-muted text-lg">{sess.name}</p>
                     <p className="text-[var(--primary)] font-mono text-sm mt-1">{sess.date}</p>
                     <p className="text-muted font-mono text-xs">{sess.start_time.slice(0,5)} - {sess.end_time.slice(0,5)}</p>
                     <button onClick={() => removeSession(sess.id)} className="absolute top-0 right-4 text-[#EF4444] hover:bg-[#EF4444]/10 p-1 rounded-md"><X className="w-4 h-4"/></button>
                   </div>
                   <div className="flex-1 flex flex-wrap gap-2 content-start">
                     {myCos.length === 0 && <p className="text-muted text-sm mt-2">Empty session block. No courses mapped.</p>}
                     {myCos.map(a => (
                       <div key={a.id} className="bg-surface px-3 py-1.5 rounded-lg flex items-center gap-3 text-sm">
                          <div>
                            <span className="font-bold text-foreground">{a.course_code}</span>
                            <span className="text-muted ml-2 text-xs">Sec {a.section_name} ({a.student_count} pax)</span>
                          </div>
                          <button onClick={() => removeAssignment(a.id)} className="text-[#EF4444] hover:text-foreground"><X className="w-4 h-4"/></button>
                       </div>
                     ))}
                   </div>
                </div>
              );
            })}
         </div>
      </div>

    </div>
  );
}
