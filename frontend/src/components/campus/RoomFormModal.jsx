import { useState, useEffect } from 'react';
import { campusApi } from '../../api/campus';
import { X, DoorOpen } from 'lucide-react';

export default function RoomFormModal({ isOpen, onClose, onSuccess, initialData }) {
  const [formData, setFormData] = useState({ building: '', floor: '', room_type: '', room_number: '', room_name: '', capacity: 0, status: 'active', department: '' });
  
  const [buildings, setBuildings] = useState([]);
  const [allFloors, setAllFloors] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  
  const [saving, setSaving] = useState(false);
  const isEditing = !!initialData;

  useEffect(() => {
    campusApi.getBuildings().then(setBuildings);
    campusApi.getFloors().then(setAllFloors);
    campusApi.getRoomTypes().then(setRoomTypes);
    
    if (initialData) setFormData(initialData);
  }, [initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEditing) await campusApi.updateRoom(initialData.id, formData);
      else await campusApi.createRoom(formData);
      onSuccess();
      onClose();
    } catch (e) { alert("Save failed. Ensure building and floor match."); }
    finally { setSaving(false); }
  };

  if (!isOpen) return null;
  const filteredFloors = allFloors.filter(f => f.building.toString() === formData.building.toString());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-border bg-surface flex justify-between items-center">
          <h3 className="text-xl font-bold text-foreground flex gap-2"><DoorOpen className="text-[var(--primary)]"/> {isEditing ? 'Edit Room' : 'Add Room'}</h3>
          <button onClick={onClose} className="text-muted hover:text-foreground"><X className="w-6 h-6" /></button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <form id="rmForm" onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-xs font-bold text-muted uppercase">Building</label>
                   <select required value={formData.building} onChange={e => setFormData({...formData, building: e.target.value, floor: ''})} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]">
                     <option value="">Select a Building...</option>
                     {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                   </select>
                </div>
                <div>
                   <label className="text-xs font-bold text-muted uppercase">Floor</label>
                   <select required value={formData.floor} onChange={e => setFormData({...formData, floor: e.target.value})} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]" disabled={!formData.building}>
                     <option value="">Select a Floor...</option>
                     {filteredFloors.map(f => <option key={f.id} value={f.id}>{f.name || `Level ${f.floor_number}`}</option>)}
                   </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-xs font-bold text-muted uppercase">Room Type</label>
                   <select required value={formData.room_type} onChange={e => setFormData({...formData, room_type: e.target.value})} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]">
                     <option value="">Select a Type...</option>
                     {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
                   </select>
                </div>
                <div>
                   <label className="text-xs font-bold text-muted uppercase">Capacity</label>
                   <input type="number" value={formData.capacity} onChange={e => setFormData({...formData, capacity: parseInt(e.target.value)})} placeholder="0 for N/A" className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"/>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-xs font-bold text-muted uppercase">Room Number</label>
                   <input required value={formData.room_number} onChange={e => setFormData({...formData, room_number: e.target.value})} placeholder="e.g. 101A" className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"/>
                 </div>
                 <div>
                   <label className="text-xs font-bold text-muted uppercase">Custom Name (Optional)</label>
                   <input value={formData.room_name} onChange={e => setFormData({...formData, room_name: e.target.value})} placeholder="e.g. Einstein Lab" className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"/>
                 </div>
            </div>

            <div>
                 <label className="text-xs font-bold text-muted uppercase">Department (Optional)</label>
                 <input value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"/>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-xs font-bold text-muted uppercase">Status</label>
                   <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]">
                     <option value="active">Active</option>
                     <option value="inactive">Inactive</option>
                     <option value="maintenance">Maintenance</option>
                   </select>
                </div>
                <div className="flex items-center mt-6">
                    <label className="flex items-center cursor-pointer">
                      <input type="checkbox" checked={formData.under_maintenance} onChange={e => setFormData({...formData, under_maintenance: e.target.checked})} className="sr-only peer" />
                      <div className="w-11 h-6 bg-surface rounded-full peer peer-checked:bg-[#F59E0B] peer-focus:ring-2 peer-focus:ring-[#22D3EE] transition-all after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                      <span className="ms-3 text-sm font-bold text-muted">Under Maintenance Flag</span>
                    </label>
                </div>
            </div>

          </form>
        </div>
        <div className="p-4 border-t border-border bg-surface flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-muted hover:text-foreground">Cancel</button>
          <button type="submit" form="rmForm" disabled={saving} className="bg-[var(--primary)] text-[#0F172A] px-6 py-2.5 rounded-xl font-bold disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}
