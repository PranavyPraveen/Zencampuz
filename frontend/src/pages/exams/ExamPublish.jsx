import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { examsApi } from '../../api/exams';
import { Send, FileText, Printer } from 'lucide-react';

export default function ExamPublish() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [notes, setNotes] = useState('');

  const load = async () => {
    setLoading(true);
    const p = await examsApi.getPlan(id);
    setPlan(p);
    
    const allLogs = await examsApi.getLogs();
    setLogs(allLogs.filter(l => l.plan === id));
    
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handlePublish = async () => {
    if (!window.confirm(`Publish ${plan.name} final schedule to portal?`)) return;
    setPublishing(true);
    try {
      await examsApi.publishPlan(id, notes);
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
      <button onClick={() => navigate('/exams/plans')} className="text-[var(--primary)] text-sm hover:underline font-bold uppercase">&larr; Back to Plans</button>

      <div className="flex items-center justify-between">
         <div>
            <h2 className="text-3xl font-bold text-foreground">Final Review & Publish</h2>
            <p className="text-muted mt-1">{plan.name} — Status: <span className={`font-bold ${plan.status === 'published' ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>{plan.status.toUpperCase()}</span></p>
         </div>
         <button onClick={() => window.open(`/exams/seating/${id}`, '_blank')} className="bg-white text-black px-5 py-2.5 rounded-xl font-bold hover:bg-gray-200 transition-colors flex items-center gap-2 shadow-lg">
            <Printer className="w-4 h-4" /> Print Seating Plan
         </button>
      </div>

      <div className="bg-background border border-border rounded-3xl p-6">
        <h3 className="text-foreground font-bold mb-4">Finalize Publication</h3>
        {plan.status === 'published' && (
          <div className="mb-4 bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B] p-3 rounded-xl text-sm font-bold">
            Note: This exam plan is already published. Publishing again will bump the version number and notify students of changes.
          </div>
        )}
        <label className="block text-sm font-bold text-muted mb-2">Publish Notes/Amendments (Optional)</label>
        <textarea 
           rows="3" 
           className="w-full bg-background border border-border p-3 rounded-xl text-foreground focus:outline-none focus:border-[#10B981] mb-4"
           placeholder="e.g. Added backup invigilator to Hall 3..."
           value={notes}
           onChange={e => setNotes(e.target.value)}
        />
        <button 
           onClick={handlePublish} 
           disabled={publishing}
           className="bg-[#10B981] text-[#0F172A] px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-[#059669] transition-colors disabled:opacity-50"
        >
          <Send className="w-5 h-5"/> {publishing ? 'Publishing...' : 'Publish LIVE to Portal'}
        </button>
      </div>

      <div>
        <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-muted"/> Publication Sub-versions</h3>
        {logs.length === 0 ? (
          <div className="border border-dashed border-border rounded-2xl p-8 text-center text-muted">Not published yet.</div>
        ) : (
          <div className="space-y-3">
            {logs.map(log => (
              <div key={log.id} className="bg-surface border border-border p-4 rounded-xl flex justify-between items-center">
                 <div>
                    <h4 className="text-[#10B981] font-bold">Version {log.version}</h4>
                    <p className="text-foreground text-sm mt-1">{log.notes || 'No change notes provided.'}</p>
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
