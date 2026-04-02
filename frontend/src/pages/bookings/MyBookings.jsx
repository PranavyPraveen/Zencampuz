import { useState, useEffect } from 'react';
import { bookingsApi } from '../../api/bookings';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, X, Clock, CheckCircle, AlertTriangle, XCircle, Calendar } from 'lucide-react';

const STATUS_CONFIG = {
  draft:    { color: '#64748B', icon: Clock, label: 'Draft' },
  pending:  { color: '#F59E0B', icon: Clock, label: 'Pending Approval' },
  approved: { color: '#10B981', icon: CheckCircle, label: 'Approved' },
  rejected: { color: '#EF4444', icon: XCircle, label: 'Rejected' },
  cancelled:{ color: '#475569', icon: XCircle, label: 'Cancelled' },
  active:   { color: '#22D3EE', icon: CheckCircle, label: 'Active' },
  completed:{ color: '#8B5CF6', icon: CheckCircle, label: 'Completed' },
  conflict: { color: '#EF4444', icon: AlertTriangle, label: 'Conflict' },
};

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    bookingsApi.getMyBookings().then(data => { setBookings(data); setLoading(false); });
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this booking?')) return;
    try { await bookingsApi.cancelBooking(id); setBookings(b => b.map(x => x.id === id ? { ...x, status: 'cancelled' } : x)); }
    catch { alert('Cannot cancel.'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">My Bookings</h2>
          <p className="text-muted mt-1">Track status of all your booking requests</p>
        </div>
        <button onClick={() => navigate('/bookings/new')} className="bg-[var(--primary)] hover:brightness-90 text-[#0F172A] px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2">
          <Plus className="w-5 h-5" /> New Booking
        </button>
      </div>

      {loading
        ? <div className="text-center py-16 text-muted">Loading your bookings...</div>
        : bookings.length === 0
          ? (
            <div className="text-center py-20 text-muted bg-surface/10 border border-border rounded-3xl">
              <Calendar className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-xl font-bold mb-2">No bookings yet</p>
              <p className="mb-6">Submit your first booking request</p>
              <button onClick={() => navigate('/bookings/new')} className="bg-[var(--primary)] text-[#0F172A] px-6 py-2.5 rounded-xl font-bold">Make a Booking</button>
            </div>
          )
          : (
            <div className="space-y-4">
              {bookings.map(b => {
                const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.draft;
                const StatusIcon = cfg.icon;
                return (
                  <div key={b.id} className="bg-background border border-border rounded-2xl p-6 flex gap-4 hover:border-[#22D3EE]/20 transition-all group">
                    <div className="w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-foreground font-bold text-lg">{b.title}</h3>
                          <p className="text-muted text-sm mt-1">{b.target_type_display}</p>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold" style={{ color: cfg.color, borderColor: `${cfg.color}30`, backgroundColor: `${cfg.color}10` }}>
                          <StatusIcon className="w-3.5 h-3.5" /> {cfg.label}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted">
                        <span>🕐 {new Date(b.start_time).toLocaleString()} → {new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>⏱ {b.duration_hours}h</span>
                        {b.room_name && <span>📍 {b.room_name}</span>}
                        {b.resource_name && <span>🔬 {b.resource_name}</span>}
                        {b.sub_unit_label && <span>💺 {b.sub_unit_label}</span>}
                      </div>
                      {b.status === 'conflict' && b.admin_notes && (
                        <div className="mt-3 p-2 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl text-xs text-[#EF4444]">{b.admin_notes}</div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button onClick={() => navigate(`/bookings/${b.id}`)} className="p-2 text-muted hover:text-[var(--primary)] bg-surface/30 rounded-lg"><Eye className="w-4 h-4" /></button>
                      {['pending', 'approved', 'draft'].includes(b.status) && (
                        <button onClick={() => handleCancel(b.id)} className="p-2 text-muted hover:text-[#EF4444] bg-surface/30 rounded-lg"><X className="w-4 h-4" /></button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
      }
    </div>
  );
}
