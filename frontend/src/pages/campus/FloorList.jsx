import { useState, useEffect } from 'react';
import { campusApi } from '../../api/campus';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Layers, AlertTriangle } from 'lucide-react';
import FloorFormModal from '../../components/campus/FloorFormModal';

export default function FloorList() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const filterCampus = queryParams.get('campus') || '';
  const filterBuilding = queryParams.get('building') || '';

  const [floors, setFloors] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFloor, setEditingFloor] = useState(null);

  const fetchFloors = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterCampus) params.building__campus_id = filterCampus;
      if (filterBuilding) params.building_id = filterBuilding;
      const data = await campusApi.getFloors(params);
      setFloors(data);
    } catch (err) {
      console.error('Failed to load floors', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCampuses = async () => {
    try { setCampuses(await campusApi.getCampuses()); } 
    catch(e) { console.error(e); }
  };

  const loadBuildings = async (campusId) => {
    try {
      const params = campusId ? { campus_id: campusId } : {};
      setBuildings(await campusApi.getBuildings(params));
    } catch(e) { console.error(e); }
  };

  useEffect(() => { loadCampuses(); loadBuildings(filterCampus); }, []);

  useEffect(() => { 
    loadBuildings(filterCampus);
    fetchFloors(); 
  }, [filterCampus, filterBuilding]);

  const handleFilterCampus = (val) => {
    if (val) queryParams.set('campus', val); else queryParams.delete('campus');
    queryParams.delete('building'); // reset linked dropdown
    navigate({ search: queryParams.toString() });
  };

  const handleFilterBuilding = (val) => {
    if (val) queryParams.set('building', val); else queryParams.delete('building');
    navigate({ search: queryParams.toString() });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this floor? This cascades to all rooms.")) return;
    try {
      await campusApi.deleteFloor(id);
      fetchFloors();
    } catch (err) {
      alert("Failed to delete floor.");
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
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Floors</h2>
          <p className="text-muted mt-1">Manage physical building layers</p>
        </div>
        <button
          onClick={() => { if (!selectedCampusIsInactive) { setEditingFloor(null); setIsModalOpen(true); } }}
          disabled={selectedCampusIsInactive}
          title={selectedCampusIsInactive ? `Cannot add floors to an ${campusStatusLabel.toLowerCase()} campus` : 'Add Floor'}
          className={`px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all ${selectedCampusIsInactive ? 'bg-[var(--primary)]/30 text-[#0F172A]/50 cursor-not-allowed opacity-50' : 'bg-[var(--primary)] hover:brightness-90 text-[#0F172A]'}`}
        >
          <Plus className="w-5 h-5" /> Add Floor
        </button>
      </div>

      {selectedCampusIsInactive && (
        <div className="flex items-start gap-3 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-xl px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
          <div>
            <p className="text-[#F59E0B] font-semibold text-sm">
              {selectedCampusObj.name} is currently <span className="uppercase">{campusStatusLabel}</span>
            </p>
            <p className="text-muted text-xs mt-0.5">
              This campus is not operational. No floors can be added here. Existing floors are shown for reference only.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <select 
          value={filterCampus} 
          onChange={(e) => handleFilterCampus(e.target.value)} 
          className={`bg-background border border-border px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] ${selectedCampusIsInactive ? 'border-[#F59E0B]/50 text-[#F59E0B]' : 'text-foreground'}`}
        >
          <option value="">All Campuses</option>
          {campuses.filter(c => c.status === 'active').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          {campuses.filter(c => c.status !== 'active').length > 0 && <option disabled>── Inactive / Maintenance ──</option>}
          {campuses.filter(c => c.status !== 'active').map(c => <option key={c.id} value={c.id}>{campusOptionLabel(c)}</option>)}
        </select>
        <select 
          value={filterBuilding} 
          onChange={(e) => handleFilterBuilding(e.target.value)} 
          className="bg-background border border-border px-4 py-2.5 rounded-xl text-foreground text-sm focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"
        >
          <option value="">All Buildings</option>
          {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        {(filterCampus || filterBuilding) && (
          <button 
            onClick={() => { handleFilterCampus(''); }}
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
              <th className="px-6 py-4">Floor Name / #</th>
              <th className="px-6 py-4">Building</th>
              <th className="px-6 py-4">Campus</th>
              <th className="px-6 py-4">Rooms</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1B2A4A]">
             {loading ? <tr><td colSpan="6" className="text-center py-8 text-muted">Loading...</td></tr> : 
              floors.length === 0 ? <tr><td colSpan="6" className="text-center py-8 text-muted">No floors found.</td></tr> :
              floors.map((f, idx) => (
                <tr key={f.id} className="hover:bg-surface/30 text-foreground">
                  <td className="px-6 py-4 text-muted text-sm font-semibold">{idx + 1}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#8B5CF6]/20 rounded-lg"><Layers className="text-[#8B5CF6] w-5 h-5"/></div>
                      <div>
                        <div className="font-bold">{f.name || `Floor ${f.floor_number}`}</div>
                        <div className="text-xs text-muted">Level {f.floor_number}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{f.building_name}</td>
                  <td className="px-6 py-4 text-muted text-sm">{f.campus_name}</td>
                  <td className="px-6 py-4"><span className="text-[var(--primary)] font-bold">{f.room_count}</span> rooms mapped</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => { setEditingFloor(f); setIsModalOpen(true); }} className="text-muted hover:text-[var(--primary)] mx-2"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(f.id)} className="text-muted hover:text-[#EF4444]"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))
             }
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <FloorFormModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={fetchFloors} 
          initialData={editingFloor} 
        />
      )}
    </div>
  );
}
