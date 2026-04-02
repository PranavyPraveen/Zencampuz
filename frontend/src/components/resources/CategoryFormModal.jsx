import { useState, useEffect } from 'react';
import { resourcesApi } from '../../api/resources';
import { X, Tag } from 'lucide-react';

const CATEGORY_TYPES = [
  { value: 'equipment', label: 'Equipment' },
  { value: 'lab_instrument', label: 'Lab Instrument' },
  { value: 'sports', label: 'Sports Equipment' },
  { value: 'research', label: 'Research Tool' },
  { value: 'it_asset', label: 'IT Asset' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'av_equipment', label: 'AV Equipment' },
  { value: 'other', label: 'Other' },
];

export default function CategoryFormModal({ isOpen, onClose, onSuccess, initialData }) {
  const [formData, setFormData] = useState({ name: '', category_type: 'equipment', description: '', icon: '' });
  const [saving, setSaving] = useState(false);
  const isEditing = !!initialData;

  useEffect(() => { if (initialData) setFormData(initialData); }, [initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEditing) await resourcesApi.updateCategory(initialData.id, formData);
      else await resourcesApi.createCategory(formData);
      onSuccess(); onClose();
    } catch { alert('Save failed'); }
    finally { setSaving(false); }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-3xl w-full max-w-lg shadow-2xl">
        <div className="px-6 py-4 border-b border-border bg-surface flex justify-between items-center">
          <h3 className="text-xl font-bold text-foreground flex gap-2"><Tag className="text-[var(--primary)]" /> {isEditing ? 'Edit Category' : 'Add Category'}</h3>
          <button onClick={onClose} className="text-muted hover:text-foreground"><X className="w-6 h-6" /></button>
        </div>
        <form id="catForm" onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-muted uppercase">Category Name</label>
            <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted uppercase">Type</label>
            <select value={formData.category_type} onChange={e => setFormData({ ...formData, category_type: e.target.value })} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]">
              {CATEGORY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-muted uppercase">Description (optional)</label>
            <textarea rows="2" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]" />
          </div>
        </form>
        <div className="p-4 border-t border-border bg-surface flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-muted hover:text-foreground">Cancel</button>
          <button type="submit" form="catForm" disabled={saving} className="bg-[var(--primary)] text-[#0F172A] px-6 py-2.5 rounded-xl font-bold">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}
