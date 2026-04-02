import { useState, useEffect } from 'react';
import { campusApi } from '../../api/campus';
import { Plus, Edit2, Trash2, MapPin, AlertTriangle } from 'lucide-react';
import CampusFormModal from '../../components/campus/CampusFormModal';

export default function CampusList() {
  const [campuses, setCampuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampus, setEditingCampus] = useState(null);

  const fetchCampuses = async () => {
    try {
      setLoading(true);
      const data = await campusApi.getCampuses();
      setCampuses(data);
    } catch (err) {
      console.error('Failed to load campuses', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCampuses(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this campus? This may cascade to all associated buildings and rooms.")) return;
    try {
      await campusApi.deleteCampus(id);
      fetchCampuses();
    } catch (err) {
      alert("Failed to delete campus.");
    }
  };

  const statusBadge = (s) => {
    switch(s) {
      case 'active': return <span className="text-[#10B981] bg-[#10B981]/10 px-2 py-1 rounded text-xs uppercase font-bold">Active</span>;
      case 'inactive': return <span className="text-muted bg-[#64748B]/10 px-2 py-1 rounded text-xs uppercase font-bold">Inactive</span>;
      case 'maintenance': return <span className="text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-1 rounded text-xs uppercase font-bold">Maintenance</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Campuses</h2>
          <p className="text-muted mt-1">Manage physical campus locations</p>
        </div>
        <button
          onClick={() => { setEditingCampus(null); setIsModalOpen(true); }}
          className="bg-[var(--primary)] hover:brightness-90 text-[#0F172A] px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Add Campus
        </button>
      </div>

      <div className="bg-background border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface/50 text-muted text-xs uppercase tracking-wider">
              <th className="px-6 py-4 w-16">Sl. No.</th>
              <th className="px-6 py-4">Campus Name</th>
              <th className="px-6 py-4">Address</th>
              <th className="px-6 py-4">Resources</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1B2A4A]">
             {loading ? <tr><td colSpan="6" className="text-center py-8 text-muted">Loading...</td></tr> : 
              campuses.length === 0 ? <tr><td colSpan="6" className="text-center py-8 text-muted">No campuses found.</td></tr> :
              campuses.map((c, idx) => (
                <tr key={c.id} className="hover:bg-surface/30">
                  <td className="px-6 py-4 text-muted text-sm font-semibold">{idx + 1}</td>
                  <td className="px-6 py-4 text-foreground font-medium">{c.name}</td>
                  <td className="px-6 py-4 text-muted text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted"/> {c.address || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted">
                    <span className="text-[var(--primary)] font-bold">{c.building_count}</span> bldgs &bull; <span className="text-[var(--primary)] font-bold">{c.room_count}</span> rooms
                  </td>
                  <td className="px-6 py-4">{statusBadge(c.status)}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => { setEditingCampus(c); setIsModalOpen(true); }} className="text-muted hover:text-[var(--primary)] mx-2"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(c.id)} className="text-muted hover:text-[#EF4444]"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))
             }
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <CampusFormModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={fetchCampuses} 
          initialData={editingCampus} 
        />
      )}
    </div>
  );
}
