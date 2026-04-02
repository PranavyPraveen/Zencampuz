import { useState, useEffect } from 'react';
import { campusApi } from '../../api/campus';
import api from '../../api/axios';
import { Plus, Edit2, Trash2, Eye, Upload, AlertTriangle } from 'lucide-react';
import RoomFormModal from '../../components/campus/RoomFormModal';
import { useLocation, useNavigate } from 'react-router-dom';

export default function RoomList() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const filterCampus = queryParams.get('campus') || '';
  const filterDept = queryParams.get('department') || '';
  const filterRoomType = queryParams.get('room_type') || '';

  const [rooms, setRooms] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (filterCampus) params.campus_id = filterCampus;
      if (filterDept) params.department_id = filterDept;
      if (filterRoomType) params.room_type__type_code = filterRoomType;
      
      const data = await campusApi.getRooms(params);
      setRooms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load rooms', err);
      setError(err?.response?.data?.detail || err.message || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const loadFilterData = async () => {
    try {
      const [campRes, deptRes, typesRes] = await Promise.all([
        campusApi.getCampuses(),
        api.get('/academics/departments/').then(r => r.data.results || r.data),
        campusApi.getRoomTypes()
      ]);
      setCampuses(campRes);
      setDepartments(deptRes);
      setRoomTypes(typesRes);
    } catch(e) { console.error("Error loading filter options", e); }
  };

  useEffect(() => { loadFilterData(); }, []);
  useEffect(() => { fetchRooms(); }, [filterCampus, filterDept, filterRoomType]);

  const updateParam = (key, val) => {
    if (val) queryParams.set(key, val); else queryParams.delete(key);
    navigate({ search: queryParams.toString() });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this room?")) return;
    try {
      await campusApi.deleteRoom(id);
      fetchRooms();
    } catch (err) {
      alert("Failed to delete room.");
    }
  };

  const selectedCampusObj = filterCampus ? campuses.find(c => String(c.id) === String(filterCampus)) : null;
  const selectedCampusIsInactive = selectedCampusObj && selectedCampusObj.status !== 'active';
  const campusStatusLabel = selectedCampusObj ? { active: 'Active', inactive: 'Inactive', maintenance: 'Under Maintenance' }[selectedCampusObj.status] || selectedCampusObj.status : '';

  const campusOptionLabel = (c) => {
    if (c.status === 'inactive') return `${c.name} — Inactive`;
    if (c.status === 'maintenance') return `${c.name} — Maintenance`;
    return c.name;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Rooms & Facilities</h2>
          <p className="text-muted mt-1">Manage classrooms, labs, and individual spaces</p>
        </div>
        <div className="flex gap-3">
            <button
                onClick={() => navigate('/campus/rooms/bulk-upload')}
                disabled={selectedCampusIsInactive}
                title={selectedCampusIsInactive ? `Cannot import rooms to an ${campusStatusLabel.toLowerCase()} campus` : 'Bulk Upload'}
                className={`border px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all ${selectedCampusIsInactive ? 'bg-surface/10 border-border/30 text-muted cursor-not-allowed opacity-50' : 'bg-surface hover:bg-surface/80 border-[#2563EB]/30 text-[var(--primary)]'}`}
            >
                <Upload className="w-5 h-5" /> Bulk Upload
            </button>
            <button
                onClick={() => { if (!selectedCampusIsInactive) { setEditingRoom(null); setIsModalOpen(true); } }}
                disabled={selectedCampusIsInactive}
                title={selectedCampusIsInactive ? `Cannot add rooms to an ${campusStatusLabel.toLowerCase()} campus` : 'Add Room'}
                className={`px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all ${selectedCampusIsInactive ? 'bg-[var(--primary)]/30 text-[#0F172A]/50 cursor-not-allowed opacity-50' : 'bg-[var(--primary)] hover:brightness-90 text-[#0F172A]'}`}
            >
                <Plus className="w-5 h-5" /> Add Room
            </button>
        </div>
      </div>

      {selectedCampusIsInactive && (
        <div className="flex items-start gap-3 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-xl px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
          <div>
            <p className="text-[#F59E0B] font-semibold text-sm">
              {selectedCampusObj.name} is currently <span className="uppercase">{campusStatusLabel}</span>
            </p>
            <p className="text-muted text-xs mt-0.5">
              This campus is not operational. No rooms can be added here. Existing rooms are shown for reference only.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <select 
          value={filterCampus} 
          onChange={(e) => updateParam('campus', e.target.value)} 
          className={`bg-background border border-border px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] ${selectedCampusIsInactive ? 'border-[#F59E0B]/50 text-[#F59E0B]' : 'text-foreground'}`}
        >
          <option value="">All Campuses</option>
          {campuses.filter(c => c.status === 'active').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          {campuses.filter(c => c.status !== 'active').length > 0 && <option disabled>── Inactive / Maintenance ──</option>}
          {campuses.filter(c => c.status !== 'active').map(c => <option key={c.id} value={c.id}>{campusOptionLabel(c)}</option>)}
        </select>
        <select 
          value={filterDept} 
          onChange={(e) => updateParam('department', e.target.value)} 
          className="bg-background border border-border px-4 py-2.5 rounded-xl text-foreground text-sm focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"
        >
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select 
          value={filterRoomType} 
          onChange={(e) => updateParam('room_type', e.target.value)} 
          className="bg-background border border-border px-4 py-2.5 rounded-xl text-foreground text-sm focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"
        >
          <option value="">All Room Types</option>
          {roomTypes.map(rt => <option key={rt.id} value={rt.type_code}>{rt.name}</option>)}
        </select>
        {(filterCampus || filterDept || filterRoomType) && (
          <button 
            onClick={() => navigate({ search: '' })}
            className="text-xs text-muted hover:text-foreground px-3"
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="bg-background border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface/50 text-muted text-xs uppercase tracking-wider">
              <th className="px-6 py-4 w-16">Sl. No.</th>
              <th className="px-6 py-4">Room Identifier</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4">Capacity</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1B2A4A]">
             {loading ? <tr><td colSpan="7" className="text-center py-8 text-muted">Loading...</td></tr> : 
              error ? <tr><td colSpan="7" className="text-center py-8 text-red-400">Error: {error}</td></tr> :
              rooms.length === 0 ? <tr><td colSpan="7" className="text-center py-8 text-muted">No rooms found.</td></tr> :
              rooms.map((r, idx) => (
                <tr key={r.id} className="hover:bg-surface/30 text-foreground">
                  <td className="px-6 py-4 text-muted text-sm font-semibold">{idx + 1}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold">{r.room_number}</div>
                    {r.room_name && <div className="text-xs text-[var(--primary)]">{r.room_name}</div>}
                  </td>
                  <td className="px-6 py-4">
                     <span className="bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20 px-2 py-1 rounded text-xs">
                         {r.room_type_name}
                     </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted">
                      {r.building_name} &bull; L{r.floor_number}
                  </td>
                  <td className="px-6 py-4 text-muted">{r.capacity > 0 ? r.capacity : 'N/A'}</td>
                  <td className="px-6 py-4">
                      {r.under_maintenance ? 
                        <span className="text-[#F59E0B] text-xs uppercase font-bold">Maintenance</span> : 
                        <span className="text-[#10B981] text-xs uppercase font-bold">{r.status}</span>
                      }
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => navigate(`/campus/rooms/${r.id}`)} className="text-muted hover:text-[#10B981] mx-2"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => { setEditingRoom(r); setIsModalOpen(true); }} className="text-muted hover:text-[var(--primary)] mx-2"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(r.id)} className="text-muted hover:text-[#EF4444]"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))
             }
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <RoomFormModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={fetchRooms} 
          initialData={editingRoom} 
        />
      )}
    </div>
  );
}
