import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { timetableApi } from '../../api/timetable';
import { Send, FileText } from 'lucide-react';

export default function TimetablePublish() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [notes, setNotes] = useState('');

  const load = async () => {
    setLoading(true);
    const p = await timetableApi.getPlan(id);
    setPlan(p);
    
    // Only get logs matching this plan
    const allLogs = await timetableApi.getLogs();
    setLogs(allLogs.filter(l => l.plan === id));
    
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handlePublish = async () => {
    if (!window.confirm(`Publish ${plan.name} to students and faculty?`)) return;
    setPublishing(true);
    try {
      await timetableApi.publishPlan(id, notes);
      setNotes('');
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Publish failed.');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) return null;

  return (
    <div className="max-w-4xl space-y-6">
      <button onClick={() => navigate('/timetable/plans')} className="text-[var(--primary)] text-sm hover:underline font-bold uppercase">&larr; Back to Plans</button>

      <div className="flex items-center justify-between">
         <div>
            <h2 className="text-3xl font-bold text-foreground">Publish Timetable</h2>
            <p className="text-muted mt-1">{plan.name} — Current Status: <span className={`font-bold ${plan.status === 'published' ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>{plan.status.toUpperCase()}</span></p>
         </div>
      </div>

      <div className="bg-background border border-border rounded-3xl p-6">
        <h3 className="text-foreground font-bold mb-4">New Publication</h3>
        {plan.status === 'published' && (
          <div className="mb-4 bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B] p-3 rounded-xl text-sm font-bold">
            Note: This plan is already published. Publishing again will bump the version number and notify users of changes.
          </div>
        )}
        <label className="block text-sm font-bold text-muted mb-2">Publish Notes (Optional)</label>
        <textarea 
           rows="3" 
           className="w-full bg-background border border-border p-3 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] mb-4"
           placeholder="e.g. Added practical lab sessions for Data Science..."
           value={notes}
           onChange={e => setNotes(e.target.value)}
        />
        <button 
           onClick={handlePublish} 
           disabled={publishing}
           className="bg-[var(--primary)] text-[#0F172A] px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:brightness-90 transition-colors disabled:opacity-50"
        >
          <Send className="w-5 h-5"/> {publishing ? 'Publishing...' : 'Publish to Portal'}
        </button>
      </div>

      <div>
        <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-muted"/> Version History & Logs</h3>
        {logs.length === 0 ? (
          <div className="border border-dashed border-border rounded-2xl p-8 text-center text-muted">No publish history found.</div>
        ) : (
          <div className="space-y-3">
            {logs.map(log => (
              <div key={log.id} className="bg-surface border border-border p-4 rounded-xl flex justify-between items-center">
                 <div>
                    <h4 className="text-[#10B981] font-bold">Version {log.version}</h4>
                    <p className="text-foreground text-sm mt-1">{log.notes || 'No notes provided.'}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-muted text-sm font-medium">{log.published_by_name}</p>
                    <p className="text-muted text-xs mt-1">{new Date(log.published_at).toLocaleString()}</p>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
