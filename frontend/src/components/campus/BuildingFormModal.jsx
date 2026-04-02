import { useState, useEffect } from 'react';
import { campusApi } from '../../api/campus';
import { X, Building } from 'lucide-react';

export default function BuildingFormModal({ isOpen, onClose, onSuccess, initialData }) {
  const [formData, setFormData] = useState({ name: '', code: '', campus: '', total_floors: 1 });
  const [campuses, setCampuses] = useState([]);
  const [saving, setSaving] = useState(false);
  const isEditing = !!initialData;

  useEffect(() => {
    campusApi.getCampuses().then(setCampuses);
    if (initialData) setFormData(initialData);
  }, [initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEditing) await campusApi.updateBuilding(initialData.id, formData);
      else await campusApi.createBuilding(formData);
      onSuccess();
      onClose();
    } catch (e) { alert("Save failed. Ensure you selected a campus."); }
    finally { setSaving(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-border bg-surface flex justify-between items-center">
          <h3 className="text-xl font-bold text-foreground flex gap-2"><Building className="text-[#2563EB]"/> {isEditing ? 'Edit Building' : 'Add Building'}</h3>
          <button onClick={onClose} className="text-muted hover:text-foreground"><X className="w-6 h-6" /></button>
        </div>
        <div className="p-6 overflow-y-auto">
          <form id="bldForm" onSubmit={handleSubmit} className="space-y-4">
            <div>
               <label className="text-xs font-bold text-muted uppercase">Parent Campus</label>
               <select required value={formData.campus} onChange={e => setFormData({...formData, campus: e.target.value})} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]">
                 <option value="">Select a Campus...</option>
                 {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
            </div>
            <div>
               <label className="text-xs font-bold text-muted uppercase">Building Name</label>
               <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"/>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="text-xs font-bold text-muted uppercase">Short Code</label>
                 <input required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="e.g. BLD-A" className="w-full mt-1 font-mono uppercase bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"/>
               </div>
               <div>
                 <label className="text-xs font-bold text-muted uppercase">Total Floors</label>
                 <input required type="number" min="1" value={formData.total_floors} onChange={e => setFormData({...formData, total_floors: parseInt(e.target.value)})} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"/>
               </div>
            </div>
          </form>
        </div>
        <div className="p-4 border-t border-border bg-surface flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-muted hover:text-foreground">Cancel</button>
          <button type="submit" form="bldForm" disabled={saving} className="bg-[var(--primary)] text-[#0F172A] px-6 py-2.5 rounded-xl font-bold disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}
