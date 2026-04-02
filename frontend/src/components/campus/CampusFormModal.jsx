import { useState, useEffect } from 'react';
import { campusApi } from '../../api/campus';
import { X, Save, Building2, AlertCircle } from 'lucide-react';
import PhoneInput from '../common/PhoneInput';

export default function CampusFormModal({ isOpen, onClose, onSuccess, initialData = null }) {
  const [formData, setFormData] = useState({ name: '', address: '', contact_email: '', contact_phone: '', status: 'active' });
  const [saving, setSaving] = useState(false);
  const isEditing = !!initialData;

  useEffect(() => {
    if (initialData) setFormData(initialData);
  }, [initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEditing) await campusApi.updateCampus(initialData.id, formData);
      else await campusApi.createCampus(formData);
      onSuccess();
      onClose();
    } catch (e) { alert("Save failed: " + (e.response?.data?.error || e.message)); }
    finally { setSaving(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-border bg-surface flex justify-between items-center">
          <h3 className="text-xl font-bold text-foreground flex gap-2"><Building2 className="text-[var(--primary)]"/> {isEditing ? 'Edit Campus' : 'Add Campus'}</h3>
          <button onClick={onClose} className="text-muted hover:text-foreground"><X className="w-6 h-6" /></button>
        </div>
        <div className="p-6 overflow-y-auto">
          <form id="camForm" onSubmit={handleSubmit} className="space-y-4">
            <div>
               <label className="text-xs font-bold text-muted uppercase">Campus Name</label>
               <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"/>
            </div>
            <div>
               <label className="text-xs font-bold text-muted uppercase">Address</label>
               <textarea rows="2" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"/>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                <label className="block text-sm font-medium text-muted">Contact Email</label>
                <input required type="email" value={formData.contact_email} onChange={e => setFormData({...formData, contact_email: e.target.value})} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"/>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted">Contact Phone</label>
                <PhoneInput 
                  value={formData.contact_phone} 
                  onChangePhone={(v) => setFormData({...formData, contact_phone: v})}
                  // Using default +91 since backend doesn't split country_code for campus yet
                  onChangeCode={() => {}}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
               <label className="text-xs font-bold text-muted uppercase">Status</label>
               <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]">
                 <option value="active">Active</option>
                 <option value="inactive">Inactive</option>
                 <option value="maintenance">Maintenance</option>
               </select>
            </div>
          </form>
        </div>
        <div className="p-4 border-t border-border bg-surface flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-muted hover:text-foreground">Cancel</button>
          <button type="submit" form="camForm" disabled={saving} className="bg-[var(--primary)] text-[#0F172A] px-6 py-2.5 rounded-xl font-bold disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}
