import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingsApi } from '../../api/bookings';
import { ArrowLeft, CheckCircle, XCircle, Clock, AlertTriangle, Users, FileText } from 'lucide-react';

const STATUS_CONFIG = {
  draft:    { color: '#64748B', label: 'Draft' },
  pending:  { color: '#F59E0B', label: 'Pending Approval' },
  approved: { color: '#10B981', label: 'Approved' },
  rejected: { color: '#EF4444', label: 'Rejected' },
  cancelled:{ color: '#475569', label: 'Cancelled' },
  active:   { color: '#22D3EE', label: 'Active' },
  completed:{ color: '#8B5CF6', label: 'Completed' },
  conflict: { color: '#EF4444', label: 'Conflict Detected' },
};

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bookingsApi.getBooking(id).then(data => { setBooking(data); setLoading(false); });
  }, [id]);

  const handleActivate = async () => {
    try { await bookingsApi.activateBooking(id); setBooking(b => ({ ...b, status: 'active' })); }
    catch { alert('Cannot activate.'); }
  };

  if (loading) return <div className="text-center py-16 text-muted">Loading booking details...</div>;
  if (!booking) return <div className="text-center py-16 text-[#EF4444]">Booking not found.</div>;

  const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.draft;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-surface/50 hover:bg-surface rounded-xl text-muted"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1">
          <h2 className="text-3xl font-bold text-foreground">{booking.title}</h2>
          <p className="text-muted mt-1 text-sm">Booking ID: <span className="font-mono text-xs">{booking.id}</span></p>
        </div>
        <div className="px-4 py-2 rounded-xl border font-bold text-sm" style={{ color: cfg.color, borderColor: `${cfg.color}40`, backgroundColor: `${cfg.color}10` }}>
          {cfg.label}
        </div>
      </div>

      {/* Main Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Type', value: booking.target_type_display },
          { label: 'Venue', value: booking.room_name || booking.resource_name || booking.sub_unit_label || '—' },
          { label: 'Start', value: new Date(booking.start_time).toLocaleString() },
          { label: 'Duration', value: `${booking.duration_hours}h` },
          { label: 'Requested By', value: `${booking.requested_by_name}` },
          { label: 'Role', value: booking.requested_by_role?.replace(/_/g,' ') },
          { label: 'Attendees', value: booking.expected_attendees },
          { label: 'Policy Applied', value: booking.applied_policy ? 'Yes' : 'None' },
        ].map(item => (
          <div key={item.label} className="bg-background border border-border rounded-xl p-4">
            <p className="text-muted text-xs uppercase">{item.label}</p>
            <p className="text-foreground font-semibold mt-1 text-sm">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Purpose */}
      <div className="bg-background border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3"><FileText className="text-[var(--primary)] w-5 h-5" /><h3 className="text-foreground font-bold">Purpose</h3></div>
        <p className="text-muted">{booking.purpose}</p>
        {booking.admin_notes && (
          <div className="mt-3 p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl text-[#EF4444] text-sm">
            ⚠ Admin Note: {booking.admin_notes}
          </div>
        )}
      </div>

      {/* Approvals */}
      {booking.approvals?.length > 0 && (
        <div className="bg-background border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4"><CheckCircle className="text-[#10B981] w-5 h-5" /><h3 className="text-foreground font-bold">Approval History</h3></div>
          <div className="space-y-3">
            {booking.approvals.map(a => (
              <div key={a.id} className="flex items-start gap-4 p-3 bg-background rounded-xl">
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${a.action === 'approved' ? 'bg-[#10B981]' : a.action === 'rejected' ? 'bg-[#EF4444]' : 'bg-[#F59E0B]'}`} />
                <div>
                  <p className="text-foreground font-semibold text-sm">{a.action_display} by {a.reviewed_by_name}</p>
                  {a.comment && <p className="text-muted text-sm mt-1">"{a.comment}"</p>}
                  <p className="text-muted text-xs mt-1">{new Date(a.reviewed_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Participants */}
      {booking.participants?.length > 0 && (
        <div className="bg-background border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4"><Users className="text-[#8B5CF6] w-5 h-5" /><h3 className="text-foreground font-bold">Participants</h3></div>
          <div className="space-y-2">
            {booking.participants.map(p => (
              <div key={p.id} className="flex items-center gap-4 p-3 bg-background rounded-xl">
                <div className="w-8 h-8 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center text-[#8B5CF6] font-bold text-sm">{p.name.charAt(0)}</div>
                <div>
                  <p className="text-foreground font-medium text-sm">{p.name}</p>
                  <p className="text-muted text-xs">{p.email} {p.role_label && `· ${p.role_label}`}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Actions */}
      {booking.status === 'approved' && (
        <div className="flex justify-end">
          <button onClick={handleActivate} className="bg-[var(--primary)] text-[#0F172A] px-6 py-3 rounded-xl font-bold">Mark as Active</button>
        </div>
      )}
    </div>
  );
}
