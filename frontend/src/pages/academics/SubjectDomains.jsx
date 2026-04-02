import { useEffect, useState } from 'react';
import { academicsApi } from '../../api/academics';
import { CrudTable, FormModal, Field, inputCls, selectCls, StatusBadge } from '../../components/academics/AcademicCrud';
import { useAuth } from '../../auth/AuthContext';

const blank = { department: '', name: '', code: '', description: '', is_active: true };

export default function SubjectDomains() {
  const { user } = useAuth();
  const userRole = user?.role?.name || user?.role;
  const isHOD = Boolean(user?.is_hod || userRole === 'hod');
  const [rows, setRows] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [filterProgram, setFilterProgram] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...blank, department: user?.department_id || '' });

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterProgram) params.program_id = filterProgram;
      if (search) params.search = search;
      const [domainRows, deptRows, programRows] = await Promise.all([
        academicsApi.getSubjectDomains(params),
        academicsApi.getDepartments(),
        academicsApi.getPrograms(),
      ]);
      setRows(Array.isArray(domainRows) ? domainRows : []);
      setDepartments(Array.isArray(deptRows) ? deptRows : []);
      setPrograms(Array.isArray(programRows) ? programRows : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filterProgram, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...blank, department: user?.department_id || departments[0]?.id || '' });
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      department: row.department,
      name: row.name || '',
      code: row.code || '',
      description: row.description || '',
      is_active: row.is_active,
    });
    setOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await academicsApi.updateSubjectDomain(editing.id, form);
      } else {
        await academicsApi.createSubjectDomain(form);
      }
      setOpen(false);
      await load();
    } catch (err) {
      alert(JSON.stringify(err.response?.data) || 'Failed to save subject domain.');
    } finally {
      setSaving(false);
    }
  };

  const COLS = [
    { key: 'department_name', label: 'Department' },
    { key: 'name', label: 'Domain Name' },
    { key: 'code', label: 'Code' },
    { key: 'description', label: 'Description', render: (row) => row.description || '—' },
    { key: 'is_active', label: 'Status', render: (row) => <StatusBadge active={row.is_active} /> },
  ];

  const filters = (
    <div className="flex flex-wrap gap-2">
      <select value={filterProgram} onChange={(e) => setFilterProgram(e.target.value)} className={selectCls}>
        <option value="">All Programmes</option>
        {programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
      </select>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search domain name or code..."
        className={inputCls}
      />
    </div>
  );

  return (
    <>
      <CrudTable
        title="Subject Domains"
        subtitle="Manage structured subject domains for specialization-based faculty matching."
        columns={COLS}
        rows={rows}
        onCreate={openCreate}
        onEdit={openEdit}
        onDelete={async (id) => {
          if (window.confirm('Delete subject domain?')) {
            await academicsApi.deleteSubjectDomain(id);
            await load();
          }
        }}
        loading={loading}
        filters={filters}
        userRole={userRole}
        emptyMessage="No subject domains found."
      />

      <FormModal isOpen={open} onClose={() => setOpen(false)} title={editing ? 'Edit Subject Domain' : 'Add Subject Domain'} onSubmit={handleSubmit} saving={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Department">
            <select required className={selectCls} value={form.department} onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))} disabled={isHOD}>
              <option value="">Select...</option>
              {departments.map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
            </select>
          </Field>
          <Field label="Code">
            <input className={inputCls} value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))} />
          </Field>
          <div className="col-span-2">
            <Field label="Domain Name">
              <input required className={inputCls} value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Description">
              <textarea className={inputCls} rows="3" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Active">
              <label className="flex items-center gap-2 text-foreground">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))} />
                Domain is available for syllabus mapping and specialization
              </label>
            </Field>
          </div>
        </div>
      </FormModal>
    </>
  );
}
