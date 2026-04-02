import { useState, useEffect } from 'react';
import { bookingsApi } from '../../api/bookings';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, Eye, UserCheck } from 'lucide-react';

export default function ApprovalInbox() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(null);
  const [comment, setComment] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    bookingsApi.getApprovalInbox().then(data => { setPending(data); setLoading(false); });
  }, []);

  const handleAction = async (bookingId, action) => {
    setActioning(bookingId);
    try {
      await bookingsApi.submitApproval({ booking: bookingId, action, comment });
      setPending(prev => prev.filter(b => b.id !== bookingId));
      setComment('');
    } catch { alert('Action failed.'); }
    finally { setActioning(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Approval Inbox</h2>
          <p className="text-muted mt-1">Pending booking requests awaiting your decision</p>
        </div>
        <div className="px-4 py-2 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-xl text-[#F59E0B] font-bold text-sm">
          {pending.length} Pending
        </div>
      </div>

      {loading
        ? <div className="text-center py-12 text-muted">Loading inbox...</div>
        : pending.length === 0
          ? (
            <div className="text-center py-20 bg-surface/10 border border-border rounded-3xl text-muted">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-[#10B981] opacity-40" />
              <p className="text-xl font-bold text-foreground">All Clear!</p>
              <p className="mt-2">No pending approvals.</p>
            </div>
          )
          : pending.map(b => (
            <div key={b.id} className="bg-background border border-[#F59E0B]/20 rounded-2xl p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-foreground font-bold text-xl">{b.title}</h3>
                  <p className="text-muted text-sm mt-1">{b.target_type_display}</p>
                </div>
                <button onClick={() => navigate(`/bookings/${b.id}`)} className="text-muted hover:text-[var(--primary)]"><Eye className="w-5 h-5" /></button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-surface/30 rounded-xl p-3">
                  <p className="text-muted text-xs uppercase">Requested By</p>
                  <p className="text-foreground font-semibold mt-1">{b.requested_by_name}</p>
                  <p className="text-muted text-xs">{b.requested_by_role?.replace(/_/g, ' ')}</p>
                </div>
                <div className="bg-surface/30 rounded-xl p-3">
                  <p className="text-muted text-xs uppercase">Start</p>
                  <p className="text-foreground font-semibold mt-1">{new Date(b.start_time).toLocaleDateString()}</p>
                  <p className="text-muted text-xs">{new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="bg-surface/30 rounded-xl p-3">
                  <p className="text-muted text-xs uppercase">Duration</p>
                  <p className="text-foreground font-semibold mt-1">{b.duration_hours}h</p>
                  <p className="text-muted text-xs">{b.expected_attendees} attendees</p>
                </div>
                <div className="bg-surface/30 rounded-xl p-3">
                  <p className="text-muted text-xs uppercase">Venue / Resource</p>
                  <p className="text-foreground font-semibold mt-1 truncate">{b.room_name || b.resource_name || b.sub_unit_label || '—'}</p>
                </div>
              </div>

              <div className="bg-background rounded-xl p-3">
                <p className="text-muted text-xs uppercase mb-1">Purpose</p>
                <p className="text-muted text-sm">{b.purpose}</p>
              </div>

              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-xs font-bold text-muted uppercase">Comment (Optional)</label>
                  <input value={actioning === b.id ? comment : ''} onChange={e => setComment(e.target.value)} onFocus={() => setActioning(b.id)} placeholder="Add a review note..." className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground text-sm focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]" />
                </div>
                <button onClick={() => handleAction(b.id, 'approved')} className="bg-[#10B981]/10 border border-[#10B981]/30 hover:bg-[#10B981]/20 text-[#10B981] px-5 py-2.5 rounded-xl font-bold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Approve
                </button>
                <button onClick={() => handleAction(b.id, 'rejected')} className="bg-[#EF4444]/10 border border-[#EF4444]/30 hover:bg-[#EF4444]/20 text-[#EF4444] px-5 py-2.5 rounded-xl font-bold flex items-center gap-2">
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </div>
            </div>
          ))
      }
    </div>
  );
}
