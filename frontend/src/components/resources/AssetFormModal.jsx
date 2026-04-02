import { useState, useEffect } from 'react';
import { resourcesApi } from '../../api/resources';
import { campusApi } from '../../api/campus';
import { academicsApi } from '../../api/academics';
import { X, Package } from 'lucide-react';

const UNIT_TYPES = ['unit', 'set', 'seat', 'system', 'instrument', 'kit', 'pair'];
const cls = 'w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]';

export default function AssetFormModal({ isOpen, onClose, onSuccess, initialData }) {
  const emptyForm = {
    resource_code: '', name: '', category: '',
    campus: '', building: '', department: '',
    room: '', quantity_total: 1, quantity_available: 1, unit_type: 'unit',
    bookable_as_whole: true, bookable_per_unit: false,
    status: 'available', requires_approval: false, under_maintenance: false, notes: '',
    restricted_roles: [],
  };
  const [formData, setFormData] = useState(emptyForm);
  const [categories, setCategories] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [codeLoading, setCodeLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const isEditing = !!initialData;

  // Load dropdowns
  useEffect(() => {
    resourcesApi.getCategories().then(setCategories);
    campusApi.getCampuses().then(setCampuses);
    campusApi.getBuildings().then(setBuildings);
    academicsApi.getDepartments().then(setDepartments);
  }, []);

  // Populate form when editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        ...emptyForm,
        ...initialData,
        category: initialData.category || '',
        campus: initialData.campus || '',
        building: initialData.building || '',
        tag_ids: [],
      });
    } else {
      setFormData(emptyForm);
    }
  }, [initialData]);

  const set = (key, val) => setFormData(f => {
    const updated = { ...f, [key]: val };
    if (key === 'campus') { updated.building = ''; }
    // Auto-set under_maintenance when status is "maintenance"
    if (key === 'status') { updated.under_maintenance = val === 'maintenance'; }
    return updated;
  });

  // Auto-generate resource code from name (create mode only)
  const handleNameChange = async (e) => {
    const name = e.target.value;
    set('name', name);
    if (!isEditing && name.trim().length > 2) {
      try {
        setCodeLoading(true);
        const res = await resourcesApi.generateCode(name.trim());
        setFormData(f => ({ ...f, name, resource_code: res.code }));
      } catch { /* silently skip */ }
      finally { setCodeLoading(false); }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...formData };
      if (!payload.campus) delete payload.campus;
      if (!payload.building) delete payload.building;
      if (!payload.room) delete payload.room;
      if (isEditing) await resourcesApi.updateAsset(initialData.id, payload);
      else await resourcesApi.createAsset(payload);
      onSuccess(); onClose();
    } catch { alert('Save failed. Check resource code uniqueness.'); }
    finally { setSaving(false); }
  };

  const filteredBuildings = formData.campus
    ? buildings.filter(b => String(b.campus) === String(formData.campus))
    : buildings;

  const filteredDepts = formData.campus
    ? departments.filter(d => String(d.campus) === String(formData.campus))
    : departments;

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-border bg-surface flex justify-between items-center flex-shrink-0">
          <h3 className="text-xl font-bold text-foreground flex gap-2"><Package className="text-[var(--primary)]" /> {isEditing ? 'Edit Asset' : 'Add Asset / Resource'}</h3>
          <button onClick={onClose} className="text-muted hover:text-foreground"><X className="w-6 h-6" /></button>
        </div>
        <form id="assetForm" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">

          {/* Category first */}
          <div>
            <label className="text-xs font-bold text-muted uppercase">Category <span className="text-[#EF4444]">*</span></label>
            <select required value={formData.category} onChange={e => set('category', e.target.value)} className={cls}>
              <option value="">Select category first...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name} ({c.category_type.replace('_', ' ')})</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-muted uppercase">Name <span className="text-[#EF4444]">*</span></label>
              <input required value={formData.name} onChange={handleNameChange} className={cls} placeholder="e.g. Digital Oscilloscope" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted uppercase">
                Resource Code {codeLoading && <span className="text-[var(--primary)] normal-case font-normal">generating...</span>}
              </label>
              <input required value={formData.resource_code} onChange={e => set('resource_code', e.target.value.toUpperCase())}
                className={`${cls} font-mono`} placeholder="e.g. DO-1" />
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-muted uppercase">Campus</label>
              <select value={formData.campus} onChange={e => set('campus', e.target.value)} className={cls}>
                <option value="">Select Campus...</option>
                {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted uppercase">Building</label>
              <select value={formData.building} onChange={e => set('building', e.target.value)} className={cls}>
                <option value="">Select Building...</option>
                {filteredBuildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-muted uppercase">Department</label>
            <select value={formData.department} onChange={e => set('department', e.target.value)} className={cls}>
              <option value="">Select Department (Optional)...</option>
              {filteredDepts.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-muted uppercase">Total Qty</label>
              <input type="number" min="0" value={formData.quantity_total} onChange={e => set('quantity_total', parseInt(e.target.value))} className={cls} />
            </div>
            <div>
              <label className="text-xs font-bold text-muted uppercase">Available Qty</label>
              <input type="number" min="0" value={formData.quantity_available} onChange={e => set('quantity_available', parseInt(e.target.value))} className={cls} />
            </div>
            <div>
              <label className="text-xs font-bold text-muted uppercase">Unit Type</label>
              <select value={formData.unit_type} onChange={e => set('unit_type', e.target.value)} className={cls}>
                {UNIT_TYPES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-muted uppercase">Status</label>
              <select value={formData.status} onChange={e => set('status', e.target.value)} className={cls}>
                <option value="available">Available</option>
                <option value="in_use">In Use</option>
                <option value="maintenance">Maintenance</option>
                <option value="retired">Retired</option>
              </select>
            </div>
            <div className="flex flex-col gap-2.5 mt-5">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={formData.bookable_as_whole} onChange={e => set('bookable_as_whole', e.target.checked)} className="w-4 h-4 rounded text-[var(--primary)]" />
                <span className="text-sm text-muted">Bookable as Whole</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={formData.bookable_per_unit} onChange={e => set('bookable_per_unit', e.target.checked)} className="w-4 h-4 rounded text-[var(--primary)]" />
                <span className="text-sm text-muted">Bookable per Unit</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={formData.requires_approval} onChange={e => set('requires_approval', e.target.checked)} className="w-4 h-4 rounded text-[var(--primary)]" />
                <span className="text-sm text-muted">Requires Approval</span>
              </label>
              {/* Under maintenance auto-sets when status is maintenance */}
              {formData.status === 'maintenance' && (
                <div className="flex items-center gap-3 px-3 py-2 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-xl">
                  <span className="text-xs text-[#F59E0B] font-bold">⚠ Under Maintenance flag enabled automatically</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-muted uppercase">Notes</label>
            <textarea rows="2" value={formData.notes} onChange={e => set('notes', e.target.value)} className={cls} />
          </div>
        </form>
        <div className="p-4 border-t border-border bg-surface flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 text-muted hover:text-foreground">Cancel</button>
          <button type="submit" form="assetForm" disabled={saving} className="bg-[var(--primary)] text-[#0F172A] px-6 py-2.5 rounded-xl font-bold">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}
