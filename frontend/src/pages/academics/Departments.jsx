import { useState, useEffect } from 'react';
import { academicsApi } from '../../api/academics';
import { campusApi } from '../../api/campus';
import { useLocation, useNavigate } from 'react-router-dom';
import { CrudTable, FormModal, Field, inputCls, selectCls, StatusBadge } from '../../components/academics/AcademicCrud';
import { generateUniqueCode } from '../../utils/codeGenerator';
import ComboboxSearch from '../../components/common/ComboboxSearch';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

const blank = { campus: '', name: '', code: '', description: '', head_of_department: '', is_active: true };

export default function Departments() {
  const { user } = useAuth();
  const userRole = user?.role?.name || user?.role;
  const isFaculty = userRole === 'faculty';

  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const filterCampus = queryParams.get('campus') || '';

  const [rows, setRows] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => { 
    setLoading(true); 
    const params = filterCampus ? { campus_id: filterCampus } : {};
    
    // If faculty, filter by their department ID
    if (isFaculty && user?.department_id) {
      params.id = user.department_id;
    }

    setRows(await academicsApi.getDepartments(params)); 
    setLoading(false); 
  };
  
  useEffect(() => { 
    campusApi.getCampuses().then(setCampuses);
  }, []);

  useEffect(() => { 
    load(); 
  }, [filterCampus]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  
  const handleNameChange = (e) => {
    const newName = e.target.value;
    setForm(prev => {
      if (!editing) {
        const existingCodes = rows.map(r => r.code);
        return { ...prev, name: newName, code: generateUniqueCode(newName, existingCodes) };
      }
      return { ...prev, name: newName };
    });
  };

  const openCreate = () => { setEditing(null); setForm(blank); setOpen(true); };
  const openEdit = (row) => { setEditing(row); setForm({ ...row, head_of_department: row.head_of_department || '' }); setOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    const payload = { ...form };
    if (!payload.head_of_department) delete payload.head_of_department;
    try {
      if (editing) await academicsApi.updateDepartment(editing.id, payload);
      else await academicsApi.createDepartment(payload);
      setOpen(false); load();
    } catch (err) { alert(JSON.stringify(err.response?.data) || 'Save failed.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this department?')) return;
    await academicsApi.deleteDepartment(id); load();
  };

  const COLS = [
    { key: 'campus_name', label: 'Campus' },
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Department Name' },
    { key: 'hod_name', label: 'Head of Dept', render: r => r.hod_name || '—' },
    { key: 'is_active', label: 'Status', render: r => <StatusBadge active={r.is_active} /> },
  ];

  const handleFilterCampus = (e) => {
    const val = e.target.value;
    if (val) queryParams.set('campus', val); else queryParams.delete('campus');
    navigate({ search: queryParams.toString() });
  };

  const selectedCampusObj = filterCampus ? campuses.find(c => String(c.id) === String(filterCampus)) : null;
  const selectedCampusIsInactive = selectedCampusObj && selectedCampusObj.status !== 'active';
  const campusStatusLabel = selectedCampusObj ? { active: 'Active', inactive: 'Inactive', maintenance: 'Under Maintenance' }[selectedCampusObj.status] || selectedCampusObj.status : '';

  const inactiveCampusBanner = selectedCampusIsInactive ? (
    <div className="flex items-start gap-3 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-xl px-5 py-4 mt-2 mb-2">
      <AlertTriangle className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
      <div>
        <p className="text-[#F59E0B] font-semibold text-sm">
          {selectedCampusObj.name} is currently <span className="uppercase">{campusStatusLabel}</span>
        </p>
        <p className="text-muted text-xs mt-0.5">
          This campus is not operational. No new departments can be added here. Existing departments are shown for reference only.
        </p>
      </div>
    </div>
  ) : null;

  const noCampusBanner = !filterCampus && !isFaculty ? (
    <div className="flex items-start gap-3 bg-[#3B82F6]/10 border border-[#3B82F6]/30 rounded-xl px-5 py-4 mt-2 mb-2">
      <AlertTriangle className="w-5 h-5 text-[#3B82F6] shrink-0 mt-0.5" />
      <div>
        <p className="text-[#3B82F6] font-semibold text-sm">Please select a campus to filter</p>
      </div>
    </div>
  ) : null;

  const banner = inactiveCampusBanner || noCampusBanner;

  const tableFilters = (
    <div className="flex gap-2">
      <select 
        value={filterCampus} 
        onChange={handleFilterCampus} 
        className={`bg-background border border-border px-4 py-2 text-sm rounded-xl focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] ${selectedCampusIsInactive ? 'border-[#F59E0B]/50 text-[#F59E0B]' : 'text-foreground'}`}
      >
        <option value="">All Campuses</option>
        {campuses.filter(c => c.status === 'active').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        {campuses.filter(c => c.status !== 'active').length > 0 && <option disabled>── Inactive / Maintenance ──</option>}
        {campuses.filter(c => c.status !== 'active').map(c => <option key={c.id} value={c.id}>{c.status === 'inactive' ? `${c.name} — Inactive` : `${c.name} — Maintenance`}</option>)}
      </select>
      {filterCampus && (
        <button onClick={() => navigate({ search: '' })} className="text-xs text-muted hover:text-foreground px-3">
          Clear Filters
        </button>
      )}
    </div>
  );

  return (
    <>
      <CrudTable 
        title="Departments" 
        subtitle="Manage academic departments within your institution" 
        columns={COLS} 
        rows={rows} 
        onCreate={openCreate} 
        onEdit={openEdit} 
        onDelete={handleDelete} 
        loading={loading} 
        filters={tableFilters} 
        disableAddReason={selectedCampusIsInactive ? `Cannot add departments to an ${campusStatusLabel.toLowerCase()} campus` : null}
        banner={inactiveCampusBanner}
        userRole={userRole}
      />
      <FormModal isOpen={open} onClose={() => setOpen(false)} title={editing ? 'Edit Department' : 'Create Department'} onSubmit={handleSubmit} saving={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Campus">
            <select required className={selectCls} value={form.campus || ''} onChange={e => set('campus', e.target.value)}>
              <option value="">— Select Campus —</option>
              {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Department Name">
            <input required className={inputCls} value={form.name} onChange={handleNameChange} />
          </Field>
          <Field label="Short Code">
            <input required className={inputCls} value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="e.g. CSE" />
          </Field>
          <Field label="Head of Department (optional)">
            <ComboboxSearch
              value={form.head_of_department}
              onChange={(val) => set('head_of_department', val)}
              onSearch={academicsApi.searchHODs}
              placeholder="Search faculty..."
              initialName={editing?.hod_name || ""}
            />
          </Field>
          <Field label="Status">
            <select className={selectCls} value={form.is_active} onChange={e => set('is_active', e.target.value === 'true')}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </Field>
          <div className="col-span-2">
            <Field label="Description">
              <textarea className={inputCls} rows="2" value={form.description} onChange={e => set('description', e.target.value)} />
            </Field>
          </div>
        </div>
      </FormModal>
    </>
  );
}
