import { useState, useEffect } from 'react';
import { campusApi } from '../../api/campus';
import { Plus, Edit2, Trash2, Building as BuildingIcon, AlertTriangle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import BuildingFormModal from '../../components/campus/BuildingFormModal';

export default function BuildingList() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const filterCampus = queryParams.get('campus') || '';

  const [buildings, setBuildings] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState(null);

  const fetchBuildings = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterCampus) params.campus_id = filterCampus;
      const data = await campusApi.getBuildings(params);
      setBuildings(data);
    } catch (err) {
      console.error('Failed to load buildings', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampuses = async () => {
    try {
      const data = await campusApi.getCampuses();
      setCampuses(data);
    } catch (err) {
      console.error('Failed to load campuses', err);
    }
  };

  useEffect(() => { 
    fetchCampuses();
  }, []);

  useEffect(() => { 
    fetchBuildings(); 
  }, [filterCampus]);

  const handleFilterCampusChange = (e) => {
    const val = e.target.value;
    if (val) queryParams.set('campus', val);
    else queryParams.delete('campus');
    navigate({ search: queryParams.toString() });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this building? This may cascade to all associated floors and rooms.")) return;
    try {
      await campusApi.deleteBuilding(id);
      fetchBuildings();
    } catch (err) {
      alert("Failed to delete building.");
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
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Buildings</h2>
          <p className="text-muted mt-1">Manage physical buildings across your campuses</p>
        </div>
        <button
          onClick={() => { if (!selectedCampusIsInactive) { setEditingBuilding(null); setIsModalOpen(true); } }}
          disabled={selectedCampusIsInactive}
          title={selectedCampusIsInactive ? `Cannot add buildings to an ${campusStatusLabel.toLowerCase()} campus` : 'Add Building'}
          className={`px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all ${selectedCampusIsInactive ? 'bg-[var(--primary)]/30 text-[#0F172A]/50 cursor-not-allowed opacity-50' : 'bg-[var(--primary)] hover:brightness-90 text-[#0F172A]'}`}
        >
          <Plus className="w-5 h-5" /> Add Building
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
              This campus is not operational. No buildings can be added here. Existing buildings are shown for reference only.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select 
          value={filterCampus} 
          onChange={handleFilterCampusChange} 
          className={`bg-background border border-border px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] ${selectedCampusIsInactive ? 'border-[#F59E0B]/50 text-[#F59E0B]' : 'text-foreground'}`}
        >
          <option value="">All Campuses</option>
          {campuses.filter(c => c.status === 'active').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          {campuses.filter(c => c.status !== 'active').length > 0 && <option disabled>── Inactive / Maintenance ──</option>}
          {campuses.filter(c => c.status !== 'active').map(c => <option key={c.id} value={c.id}>{campusOptionLabel(c)}</option>)}
        </select>
        {filterCampus && (
          <button 
            onClick={() => handleFilterCampusChange({ target: { value: '' } })}
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
              <th className="px-6 py-4">Building</th>
              <th className="px-6 py-4">Campus</th>
              <th className="px-6 py-4">Resources</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1B2A4A]">
             {loading ? <tr><td colSpan="5" className="text-center py-8 text-muted">Loading...</td></tr> : 
              buildings.length === 0 ? <tr><td colSpan="5" className="text-center py-8 text-muted">No buildings found.</td></tr> :
              buildings.map((b, idx) => (
                <tr key={b.id} className="hover:bg-surface/30">
                  <td className="px-6 py-4 text-muted text-sm font-semibold">{idx + 1}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#2563EB]/20 rounded-lg"><BuildingIcon className="text-[#2563EB] w-5 h-5"/></div>
                      <div>
                        <div className="text-foreground font-medium">{b.name}</div>
                        <div className="text-xs text-muted font-mono tracking-widest">{b.code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted font-medium">{b.campus_name}</td>
                  <td className="px-6 py-4 text-sm text-muted">
                    <span className="text-[#2563EB] font-bold">{b.floor_count}/{b.total_floors}</span> mapped floors &bull; <span className="text-[var(--primary)] font-bold">{b.room_count}</span> rooms
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => { setEditingBuilding(b); setIsModalOpen(true); }} className="text-muted hover:text-[var(--primary)] mx-2"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(b.id)} className="text-muted hover:text-[#EF4444]"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))
             }
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <BuildingFormModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={fetchBuildings} 
          initialData={editingBuilding} 
        />
      )}
    </div>
  );
}
