import { useState, useEffect } from 'react';
import { campusApi } from '../../api/campus';
import { X, Layers } from 'lucide-react';

export default function FloorFormModal({ isOpen, onClose, onSuccess, initialData }) {
  const [formData, setFormData] = useState({ building: '', floor_number: 0, name: '' });
  const [buildings, setBuildings] = useState([]);
  const [saving, setSaving] = useState(false);
  const isEditing = !!initialData;

  useEffect(() => {
    campusApi.getBuildings().then(setBuildings);
    if (initialData) setFormData(initialData);
  }, [initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEditing) await campusApi.updateFloor(initialData.id, formData);
      else await campusApi.createFloor(formData);
      onSuccess();
      onClose();
    } catch (e) { alert("Save failed. Check duplicate floor numbers."); }
    finally { setSaving(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-border bg-surface flex justify-between items-center">
          <h3 className="text-xl font-bold text-foreground flex gap-2"><Layers className="text-[#8B5CF6]"/> {isEditing ? 'Edit Floor' : 'Add Floor'}</h3>
          <button onClick={onClose} className="text-muted hover:text-foreground"><X className="w-6 h-6" /></button>
        </div>
        <div className="p-6 overflow-y-auto">
          <form id="flrForm" onSubmit={handleSubmit} className="space-y-4">
            <div>
               <label className="text-xs font-bold text-muted uppercase">Parent Building</label>
               <select required value={formData.building} onChange={e => setFormData({...formData, building: e.target.value})} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]">
                 <option value="">Select a Building...</option>
                 {buildings.map(b => <option key={b.id} value={b.id}>{b.name} [{b.code}]</option>)}
               </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="text-xs font-bold text-muted uppercase">Floor Level</label>
                 <input type="number" required value={formData.floor_number} onChange={e => setFormData({...formData, floor_number: parseInt(e.target.value)})} placeholder="e.g. 0, 1, 2" className="w-full mt-1 font-mono bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"/>
                 <p className="text-muted text-xs mt-1">Use 0 for Ground</p>
               </div>
               <div>
                 <label className="text-xs font-bold text-muted uppercase">Custom Name (Optional)</label>
                 <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Mezzanine" className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"/>
               </div>
            </div>
          </form>
        </div>
        <div className="p-4 border-t border-border bg-surface flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-muted hover:text-foreground">Cancel</button>
          <button type="submit" form="flrForm" disabled={saving} className="bg-[var(--primary)] text-[#0F172A] px-6 py-2.5 rounded-xl font-bold disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}
