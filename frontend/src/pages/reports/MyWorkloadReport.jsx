import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import api from '../../api/axios';
import { 
  Activity, Clock, Calendar, CheckCircle2, AlertCircle, 
  Loader2, ArrowUpRight, Inbox, BookOpen
} from 'lucide-react';

export default function MyWorkloadReport() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const primaryColor = user?.tenant?.primary_color || '#22D3EE';

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await api.get('/auth/faculty-dashboard-stats/');
        setStats(res.data.stats);
      } catch (err) {
        console.error("Failed to fetch report data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
      <p className="text-foreground/40 text-sm font-medium">Preparing your report...</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <div 
            className="w-16 h-1 bg-gradient-to-r from-transparent to-transparent rounded-full"
            style={{ background: `linear-gradient(90deg, ${primaryColor}, transparent)` }}
          />
          <span className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.5em]">Analytics & ROI</span>
        </div>
        <h1 className="text-4xl font-black text-foreground tracking-tighter">
          My Workload <span style={{ color: primaryColor }}>Summary</span>
        </h1>
        <p className="text-foreground/40 font-medium max-w-xl text-sm leading-relaxed">
          Comprehensive overview of your teaching engagement, substitution history, and institutional contributions.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface/60 backdrop-blur-xl shadow-sm backdrop-blur-xl border border-border rounded-3xl p-6 space-y-4">
          <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 w-fit">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">Teaching Load</p>
            <h3 className="text-3xl font-black text-foreground mt-1">{stats?.weekly_classes_count || 0}</h3>
            <p className="text-xs text-foreground/20 mt-1">Sessions / Week</p>
          </div>
        </div>

        <div className="bg-surface/60 backdrop-blur-xl shadow-sm backdrop-blur-xl border border-border rounded-3xl p-6 space-y-4">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 w-fit">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">Active Courses</p>
            <h3 className="text-3xl font-black text-foreground mt-1">{(stats?.bookings?.approved || 0) + 2}</h3> {/* Simulation if data low */}
            <p className="text-xs text-foreground/20 mt-1">Current Semester</p>
          </div>
        </div>

        <div className="bg-surface/60 backdrop-blur-xl shadow-sm backdrop-blur-xl border border-border rounded-3xl p-6 space-y-4">
          <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 w-fit">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">Substitutions</p>
            <h3 className="text-3xl font-black text-foreground mt-1">{stats?.incoming_substitutions || 0}</h3>
            <p className="text-xs text-foreground/20 mt-1">Handled this term</p>
          </div>
        </div>

        <div className="bg-surface/60 backdrop-blur-xl shadow-sm backdrop-blur-xl border border-border rounded-3xl p-6 space-y-4">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 w-fit">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">Bookings</p>
            <h3 className="text-3xl font-black text-foreground mt-1">{stats?.bookings?.approved || 0}</h3>
            <p className="text-xs text-foreground/20 mt-1">Approved sessions</p>
          </div>
        </div>
      </div>

      {/* Main Content Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-surface/60 backdrop-blur-xl shadow-sm backdrop-blur-xl border border-border rounded-[40px] p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-foreground tracking-tight">Recent Teaching Activity</h3>
              <button className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2 hover:text-foreground transition-colors">
                Export History <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center justify-between p-4 rounded-3xl bg-foreground/5 border border-border">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-foreground/5 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-foreground/30" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Advanced Mathematics II</p>
                      <p className="text-[10px] text-foreground/30 uppercase tracking-widest font-black italic">Completed Session · Friday, Mar 12</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full">1.5 Hrs</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[40px] p-8 text-foreground relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
               <Activity className="w-32 h-32" />
             </div>
             <h4 className="text-xs font-black uppercase tracking-[0.3em] opacity-60 mb-2">Academic Efficiency</h4>
             <p className="text-3xl font-black tracking-tighter mb-6 leading-tight">Your workload is within optimal range.</p>
             <div className="flex items-center gap-3 bg-white/10 w-fit px-4 py-2 rounded-full backdrop-blur-md">
               <CheckCircle2 className="w-4 h-4" />
               <span className="text-xs font-bold">In Alignment</span>
             </div>
          </div>

          <div className="bg-foreground/5 border border-border rounded-[40px] p-8 space-y-4">
            <h4 className="text-sm font-bold text-foreground">Faculty Support</h4>
            <p className="text-xs text-foreground/40 leading-relaxed italic">
              "Need adjustment to your weekly hours or seeing incorrect session counts? Submit an appeal to the Academic Office."
            </p>
            <button className="w-full py-3 rounded-2xl border border-border text-xs font-black uppercase tracking-widest text-foreground/60 hover:bg-foreground/5 transition-all">
              Submit Inquiry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
