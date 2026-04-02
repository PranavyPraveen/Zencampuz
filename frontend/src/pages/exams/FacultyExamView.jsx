import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import api from '../../api/axios';
import { 
  Calendar, Clock, MapPin, Loader2, Info, AlertCircle, 
  ShieldCheck, UserCheck, FileText
} from 'lucide-react';

export default function FacultyExamView() {
  const { user } = useAuth();
  const [examSchedule, setExamSchedule] = useState([]);
  const [duties, setDuties] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const primaryColor = user?.tenant?.primary_color || '#22D3EE';

  useEffect(() => {
    async function fetchExamData() {
      try {
        // In a real scenario, we'd fetch from /exams/published-timetable/ and /exams/my-duties/
        // For now, we simulate or use existing endpoints if available
        const [timetableRes, dutiesRes] = await Promise.all([
          api.get('/exams/plans/').catch(() => ({ data: [] })), // Fallback to list of plans
          api.get('/exams/invigilators/').catch(() => ({ data: [] }))
        ]);
        
        setExamSchedule(Array.isArray(timetableRes.data) ? timetableRes.data : []);
        setDuties(Array.isArray(dutiesRes.data) ? dutiesRes.data : []);
      } catch (err) {
        console.error("Failed to fetch exam data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchExamData();
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
      <p className="text-foreground/40 text-sm font-medium">Fetching exam schedule...</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <div 
            className="w-16 h-1 bg-gradient-to-r from-transparent to-transparent rounded-full"
            style={{ background: `linear-gradient(90deg, ${primaryColor}, transparent)` }}
          />
          <span className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.5em]">Examination Bureau</span>
        </div>
        <h1 className="text-4xl font-black text-foreground tracking-tighter">
          Exam <span style={{ color: primaryColor }}>Timetable</span>
        </h1>
        <p className="text-foreground/40 font-medium max-w-xl text-sm leading-relaxed">
          Access published examination schedules and your assigned invigilation duties.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Schedule */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" /> Published Schedules
            </h3>
          </div>

          {examSchedule.length === 0 ? (
            <div className="bg-surface shadow-sm/40 border border-border rounded-3xl p-12 text-center">
              <AlertCircle className="w-10 h-10 text-foreground/10 mx-auto mb-4" />
              <p className="text-foreground/30 font-bold uppercase tracking-widest text-xs">No exams scheduled yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {examSchedule.filter(p => p.status === 'published').map(p => (
                <div key={p.id} className="group bg-surface/60 backdrop-blur-xl shadow-sm border border-border rounded-3xl p-6 hover:border-blue-400/30 transition-all flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-foreground/5 flex items-center justify-center group-hover:bg-blue-500/10 transition-colors">
                      <Calendar className="w-6 h-6 text-foreground/20 group-hover:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground">{p.name || 'End Semester Exams'}</h4>
                      <p className="text-xs text-foreground/40 uppercase tracking-widest font-black mt-1">Active Window: {p.start_date} – {p.end_date}</p>
                    </div>
                  </div>
                  <button className="px-5 py-2.5 rounded-xl bg-blue-500 text-[#0F172A] font-black text-xs uppercase tracking-widest hover:bg-blue-400 transition-all">
                    View Full Sheet
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Duties Sidebar */}
        <div className="space-y-6">
          <div className="bg-foreground/5 border border-border rounded-[40px] p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">My Invigilation</h3>
            </div>

            <div className="space-y-4">
              {duties.length === 0 ? (
                <div className="py-8 text-center border-2 border-dashed border-border rounded-3xl">
                  <p className="text-foreground/20 text-xs italic">No duties assigned currently.</p>
                </div>
              ) : (
                duties.map((d, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-background border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Session {i+1}</span>
                      <Users className="w-3.5 h-3.5 text-foreground/20" />
                    </div>
                    <p className="text-sm font-bold text-foreground mb-2">Room {d.room_name || 'B-102'}</p>
                    <div className="flex items-center gap-2 text-foreground/40 text-[10px] font-medium">
                      <Clock className="w-3 h-3" /> 09:30 AM – 12:30 PM
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex gap-3">
              <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-500/60 leading-relaxed italic">
                Report to the Exam Controller office 30 minutes before your duty starts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
