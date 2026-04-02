import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { examsApi } from '../../api/exams';
import { Printer, ArrowLeft } from 'lucide-react';

export default function SeatingPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const [plan, setPlan] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [seating, setSeating] = useState([]);
  const [invigilators, setInvigilators] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const p = await examsApi.getPlan(id);
      setPlan(p);
      
      const sess = await examsApi.getSessions({ plan: id });
      setSessions(sess);
      
      const seats = await examsApi.getSeatingPlans();
      const invigs = await examsApi.getInvigilatorAssignments();

      // Only care about seating mapping to these sessions
      const mySeats = seats.filter(s => sess.some(ss => ss.id === s.exam_assignment.session || ss.id.includes(s.exam_assignment))); // simplification, in real app expand lookup
      // Use the generic fetch and filter by session match via UI side or the optimized endpoint
      
      // Let's use the optimized endpoint for each session
      let combinedSeating = [];
      for (const s of sess) {
        const d = await examsApi.getSeatingBySession(s.id);
        combinedSeating = [...combinedSeating, ...d];
      }
      setSeating(combinedSeating);

      // Same for invigs (pull all, filter locally matching our generated seating/allocs)
      const validAllocIds = [...new Set(combinedSeating.map(s => s.hall_allocation))];
      setInvigilators(invigs.filter(i => validAllocIds.includes(i.hall_allocation)));

      setLoading(false);
    };
    load();
  }, [id]);

  const handlePrint = () => { window.print(); };

  if(loading) return <div className="p-8 text-foreground font-mono">Compiling final schedule data...</div>;

  return (
    <div className="bg-white min-h-screen text-black p-8 font-sans print:m-0 print:p-0">
       <div className="max-w-5xl mx-auto print:max-w-none print:w-full space-y-12">
          {/* Header */}
          <div className="flex justify-between items-start print:hidden border-b pb-4">
             <button onClick={() => navigate(`/exams/publish/${id}`)} className="flex items-center gap-2 text-slate-500 hover:text-black font-bold uppercase text-sm"><ArrowLeft className="w-4 h-4"/> Back</button>
             <button onClick={handlePrint} className="bg-blue-600 text-foreground px-5 py-2.5 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 shadow-lg"><Printer className="w-4 h-4"/> Print Master Schedule</button>
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-4xl font-black uppercase tracking-widest">{plan.name}</h1>
            <p className="text-xl text-slate-600 font-medium">Master Seating & Invigilation Chart</p>
            <p className="text-sm text-slate-400 font-mono">Generated on: {new Date().toLocaleString()}</p>
          </div>

          {sessions.map(sess => {
            // Group seating by room
            const sessSeats = seating.filter(s => sessions.find(ss=>ss.id===sess.id));
            // Actual grouping
            const allocMap = {};
            sessSeats.forEach(st => {
               if(!allocMap[st.room_number]) allocMap[st.room_number] = { courses: [], allocId: st.hall_allocation };
               allocMap[st.room_number].courses.push(st);
            });

            if (Object.keys(allocMap).length === 0) return null;

            return (
              <div key={sess.id} className="break-inside-avoid border border-slate-300 rounded-xl overflow-hidden mb-8">
                 <div className="bg-slate-100 p-4 border-b border-slate-300 flex justify-between items-center">
                    <h2 className="text-2xl font-bold">{sess.date} — {sess.name}</h2>
                    <span className="font-mono bg-white px-3 py-1 rounded shadow-sm border border-slate-200">{sess.start_time.slice(0,5)} to {sess.end_time.slice(0,5)}</span>
                 </div>
                 <table className="w-full text-left border-collapse">
                    <thead>
                       <tr className="bg-slate-50 text-slate-600 font-bold text-sm uppercase tracking-wider">
                          <th className="p-3 border-b border-r border-slate-300 w-1/4">Room / Hall</th>
                          <th className="p-3 border-b border-r border-slate-300 w-1/2">Seated Candidates (Course & Sec)</th>
                          <th className="p-3 border-b border-slate-300 w-1/4">Assigned Invigilators</th>
                       </tr>
                    </thead>
                    <tbody>
                       {Object.entries(allocMap).map(([room, data]) => {
                         const roomInvigs = invigilators.filter(i => i.hall_allocation === data.allocId);
                         return (
                           <tr key={room} className="border-b border-slate-200 last:border-0 align-top">
                              <td className="p-4 border-r border-slate-200 font-bold text-lg">{room}</td>
                              <td className="p-4 border-r border-slate-200">
                                <ul className="space-y-2">
                                  {data.courses.map(c => (
                                     <li key={c.id} className="flex justify-between items-center border-b border-slate-100 pb-1 last:border-0">
                                        <span><span className="font-bold">{c.course_code}</span> — Sec {c.section_name}</span>
                                        <span className="bg-slate-100 font-mono text-xs px-2 py-1 rounded font-bold border border-slate-200">{c.allocated_count} px</span>
                                     </li>
                                  ))}
                                </ul>
                              </td>
                              <td className="p-4">
                                {roomInvigs.length === 0 ? <p className="text-slate-400 italic text-sm">None assigned</p> : (
                                  <ul className="space-y-1">
                                    {roomInvigs.map(inv => (
                                      <li key={inv.id} className="text-sm font-medium flex items-center justify-between">
                                        {inv.faculty_name} {inv.is_chief && <span className="text-[10px] bg-purple-100 text-purple-700 font-bold uppercase px-1.5 rounded ml-2">Chief</span>}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </td>
                           </tr>
                         );
                       })}
                    </tbody>
                 </table>
              </div>
            );
          })}
       </div>
    </div>
  );
}
