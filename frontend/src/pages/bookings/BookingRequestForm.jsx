import { useState, useEffect } from 'react';
import { bookingsApi } from '../../api/bookings';
import { campusApi } from '../../api/campus';
import { resourcesApi } from '../../api/resources';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, ArrowLeft } from 'lucide-react';

const TARGET_TYPES = [
  { value: 'room', label: 'Room / Facility' },
  { value: 'sub_unit', label: 'Sub-Resource Unit (Seat/System)' },
  { value: 'sports_turf', label: 'Sports Turf' },
  { value: 'seminar_hall', label: 'Seminar Hall' },
  { value: 'auditorium', label: 'Auditorium' },
  { value: 'lab_instrument', label: 'Lab Instrument' },
  { value: 'meeting_room', label: 'Meeting Room' },
];

export default function BookingRequestForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', purpose: '', target_type: 'room',
    room: '', resource: '', sub_unit: '',
    start_time: '', end_time: '', expected_attendees: 1,
  });
  const [rooms, setRooms] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [filterCampus, setFilterCampus] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('');
  const [filterFloor, setFilterFloor] = useState('');
  const [resources, setResources] = useState([]);
  const [subUnits, setSubUnits] = useState([]);
  const [saving, setSaving] = useState(false);
  const [policyPreview, setPolicyPreview] = useState(null);

  useEffect(() => {
    campusApi.getCampuses().then(setCampuses);
    campusApi.getRooms().then(setRooms);
    campusApi.getBuildings().then(setBuildings);
    campusApi.getFloors().then(setFloors);
    resourcesApi.getAssets().then(setResources);
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleResourceChange = async (id) => {
    set('resource', id);
    if (id) {
      const units = await resourcesApi.getSubUnits({ resource: id });
      setSubUnits(units);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form };
    if (!payload.room) delete payload.room;
    if (!payload.resource) delete payload.resource;
    if (!payload.sub_unit) delete payload.sub_unit;
    try {
      const result = await bookingsApi.createBooking(payload);
      const msg = result.status === 'conflict'
        ? `⚠ Booking conflict detected! ${result.admin_notes}`
        : result.status === 'approved'
          ? '✅ Booking auto-approved!'
          : result.status === 'cancelled'
            ? '🚫 Booking blocked by policy.'
            : '📋 Booking submitted — awaiting approval.';
      alert(msg);
      navigate('/bookings/my');
    } catch (err) {
      alert(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Submit failed.');
    } finally { setSaving(false); }
  };

  const needsRoom = ['room', 'seminar_hall', 'auditorium', 'meeting_room', 'sports_turf'].includes(form.target_type);
  const needsResource = ['lab_instrument'].includes(form.target_type);
  const needsSubUnit = form.target_type === 'sub_unit';

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/bookings/my')} className="p-2 bg-surface/50 hover:bg-surface rounded-xl text-muted"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">New Booking Request</h2>
          <p className="text-muted mt-1">Submit a booking — the policy engine will determine approval requirements</p>
        </div>
      </div>

      <div className="bg-surface/10 border border-[#22D3EE]/20 p-4 rounded-2xl text-sm text-[var(--primary)]">
        ℹ️ Your request will be automatically checked for conflicts and evaluated against booking policies. You'll see the result immediately after submission.
      </div>

      <form onSubmit={handleSubmit} className="bg-background border border-border rounded-3xl p-8 space-y-6">
        {/* Basic Info */}
        <div>
          <p className="text-xs font-bold text-[var(--primary)] uppercase tracking-widest mb-4">Booking Details</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-bold text-muted uppercase">Title / Event Name</label>
              <input required value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. CS101 Lab Session" className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-muted uppercase">Purpose / Reason</label>
              <textarea rows="2" required value={form.purpose} onChange={e => set('purpose', e.target.value)} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted uppercase">Expected Attendees</label>
              <input type="number" min="1" value={form.expected_attendees} onChange={e => set('expected_attendees', parseInt(e.target.value))} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted uppercase">Booking Type</label>
              <select value={form.target_type} onChange={e => set('target_type', e.target.value)} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]">
                {TARGET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Target Selection */}
        <div>
          <p className="text-xs font-bold text-[var(--primary)] uppercase tracking-widest mb-4">Target Selection</p>
           {needsRoom && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted uppercase">Campus</label>
                  <select value={filterCampus} onChange={e => { setFilterCampus(e.target.value); setFilterBuilding(''); setFilterFloor(''); set('room', ''); }} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]">
                    <option value="">All Campuses</option>
                    {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted uppercase">Building</label>
                  <select value={filterBuilding} onChange={e => { setFilterBuilding(e.target.value); setFilterFloor(''); set('room', ''); }} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]">
                    <option value="">All Buildings</option>
                    {buildings.filter(b => !filterCampus || String(b.campus) === String(filterCampus) || String(b.campus_id) === String(filterCampus)).map(b => <option key={b.id} value={b.id}>{b.name} [{b.code}]</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted uppercase">Floor</label>
                  <select value={filterFloor} onChange={e => { setFilterFloor(e.target.value); set('room', ''); }} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]">
                    <option value="">All Floors</option>
                    {floors.filter(f => (!filterBuilding || f.building === filterBuilding) && (!filterCampus || String(f.campus) === String(filterCampus) || String(f.campus_id) === String(filterCampus))).map(f => <option key={f.id} value={f.id}>{f.name || `Floor ${f.floor_number}`}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-muted uppercase">Room / Venue</label>
                <select value={form.room} onChange={e => set('room', e.target.value)} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]">
                  <option value="">Select Room...</option>
                  {rooms
                    .filter(r => (!filterBuilding || r.building === filterBuilding) && (!filterFloor || r.floor === filterFloor) && (!filterCampus || String(r.campus) === String(filterCampus) || String(r.campus_id) === String(filterCampus)))
                    .map(r => (
                      <option key={r.id} value={r.id}>
                        {r.room_number} {r.room_name && `(${r.room_name})`} — {r.building_name} [Cap: {r.capacity}{r.partial_booking_available ? ` | Seats left: ${r.remaining_seats ?? r.capacity}` : ''}]
                      </option>
                    ))
                  }
                </select>
              </div>
            </div>
          )}
          {needsResource && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-muted uppercase">Resource / Instrument</label>
                <select value={form.resource} onChange={e => handleResourceChange(e.target.value)} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]">
                  <option value="">Select Resource...</option>
                  {resources.map(r => <option key={r.id} value={r.id}>{r.name} [{r.resource_code}]</option>)}
                </select>
              </div>
            </div>
          )}
          {needsSubUnit && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-muted uppercase">Parent Resource</label>
                <select value={form.resource} onChange={e => handleResourceChange(e.target.value)} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]">
                  <option value="">Select Resource...</option>
                  {resources.filter(r => r.bookable_per_unit).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted uppercase">Specific Unit</label>
                <select value={form.sub_unit} onChange={e => set('sub_unit', e.target.value)} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]">
                  <option value="">Any Available Unit</option>
                  {subUnits.filter(u => u.status === 'available').map(u => <option key={u.id} value={u.id}>{u.unit_label}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Time */}
        <div>
          <p className="text-xs font-bold text-[var(--primary)] uppercase tracking-widest mb-4">Date & Time</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-muted uppercase">Start Time</label>
              <input type="datetime-local" required value={form.start_time} onChange={e => set('start_time', e.target.value)} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted uppercase">End Time</label>
              <input type="datetime-local" required value={form.end_time} onChange={e => set('end_time', e.target.value)} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]" />
            </div>
          </div>
          <p className="text-xs text-muted mt-2">⚠ Weekend and after-hours bookings (before 8AM / after 6PM) may require approval based on policies.</p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate('/bookings/my')} className="px-5 py-2.5 text-muted hover:text-foreground">Cancel</button>
          <button type="submit" disabled={saving} className="bg-[var(--primary)] hover:brightness-90 text-[#0F172A] px-8 py-2.5 rounded-xl font-bold flex items-center gap-2">
            <CalendarPlus className="w-5 h-5" /> {saving ? 'Submitting...' : 'Submit Booking'}
          </button>
        </div>
      </form>
    </div>
  );
}
