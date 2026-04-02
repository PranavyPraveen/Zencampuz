import { useState, useEffect } from 'react';
import { academicsApi } from '../../api/academics';
import { campusApi } from '../../api/campus';
import { CrudTable, FormModal, Field, inputCls, selectCls, StatusBadge } from '../../components/academics/AcademicCrud';
import { generateUniqueCode } from '../../utils/codeGenerator';

import { useAuth } from '../../auth/AuthContext';

const DEGREE_TYPES = [
  { value: 'ug', label: 'Under Graduate (UG)' },
  { value: 'pg', label: 'Post Graduate (PG)' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'phd', label: 'Ph.D / Research' },
  { value: 'integrated', label: 'Integrated (5-year)' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'other', label: 'Other' },
];

const blank = { name: '', code: '', campus: '', department: '', degree_type: 'ug', duration_years: 4, total_semesters: 8, is_active: true };

export default function Programs({ filterCampus = '', filterDept = '', search = '', disableAddReason = null }) {
  const { user } = useAuth();
  const userRole = user?.role?.name || user?.role;
  const isFaculty = userRole === 'faculty';
  const isHOD = Boolean(user?.is_hod || userRole === 'hod');
  const canBulkDelete = ['tenant_admin', 'academic_admin'].includes(userRole);

  const [isViewAll, setIsViewAll] = useState(false);

  const [rows, setRows] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [allDepts, setAllDepts] = useState([]);
  const [filteredDepts, setFilteredDepts] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [syllabusOpen, setSyllabusOpen] = useState(false);
  const [syllabusSaving, setSyllabusSaving] = useState(false);
  const [syllabusProgram, setSyllabusProgram] = useState(null);
  const [syllabusForm, setSyllabusForm] = useState({ syllabus_overview: '', syllabus_document_url: '' });

  const load = async () => { 
    setLoading(true); 
    const params = {};
    if (filterCampus) params.department__campus_id = filterCampus;
    if (filterDept) params.department_id = filterDept;
    
    // If faculty or HOD, use their department as fallback if no filter is selected
    if ((isFaculty || isHOD) && !params.department_id && user?.department_id) {
      params.department_id = user.department_id;
    }

    if (search) params.search = search;
    try {
      setRows(await academicsApi.getPrograms(params));
      setSelectedIds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    campusApi.getCampuses().then(setCampuses);
    academicsApi.getDepartments().then(d => { setAllDepts(d); setFilteredDepts(d); });
  }, []);

  useEffect(() => { load(); }, [filterCampus, filterDept, search]);

  useEffect(() => {
    if (form.campus) {
      setFilteredDepts(allDepts.filter(d => String(d.campus) === String(form.campus)));
    } else {
      setFilteredDepts(allDepts);
    }
  }, [form.campus, allDepts]);

  const set = (k, v) => setForm(f => {
    const updated = { ...f, [k]: v };
    if (k === 'campus') updated.department = ''; // reset department if campus changes
    return updated;
  });
  
  const handleNameChange = (e) => {
    const newName = e.target.value;
    setForm(prev => {
      // Only auto-generate the code if we are creating a *new* program, so we don't overwrite manuals on edit
      if (!editing) {
        const existingCodes = rows.map(r => r.code);
        return { ...prev, name: newName, code: generateUniqueCode(newName, existingCodes) };
      }
      return { ...prev, name: newName };
    });
  };

  const openCreate = () => { setEditing(null); setForm(blank); setOpen(true); };
  const openEdit = (row) => {
    if (isHOD) {
      setSyllabusProgram(row);
      setSyllabusForm({
        syllabus_overview: row.syllabus_overview || '',
        syllabus_document_url: row.syllabus_document_url || '',
      });
      setSyllabusOpen(true);
      return;
    }
    setEditing(row);
    setForm({ ...row, department: row.department });
    setOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) await academicsApi.updateProgram(editing.id, form);
      else await academicsApi.createProgram(form);
      setOpen(false); load();
    } catch (err) { alert(JSON.stringify(err.response?.data) || 'Save failed.'); }
    finally { setSaving(false); }
  };

  const handleSyllabusSubmit = async (e) => {
    e.preventDefault();
    setSyllabusSaving(true);
    try {
      await academicsApi.updateProgram(syllabusProgram.id, syllabusForm);
      setSyllabusOpen(false);
      setSyllabusProgram(null);
      await load();
    } catch (err) {
      alert(JSON.stringify(err.response?.data) || 'Syllabus update failed.');
    } finally {
      setSyllabusSaving(false);
    }
  };

  const toggleRow = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const toggleAll = (visibleRows) => {
    const visibleIds = visibleRows.map((row) => row.id);
    const allSelected = visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) => {
      if (allSelected) {
        return prev.filter((id) => !visibleIds.includes(id));
      }
      return [...new Set([...prev, ...visibleIds])];
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected program(s)?`)) return;
    try {
      await academicsApi.bulkDeletePrograms(selectedIds);
      await load();
    } catch (err) {
      alert(JSON.stringify(err.response?.data) || 'Bulk delete failed.');
    }
  };

  const COLS = [
    { key: 'campus_name', label: 'Campus' },
    { key: 'department_name', label: 'Department' },
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Program Name' },
    { key: 'degree_type_display', label: 'Degree' },
    { key: 'total_semesters', label: 'Semesters' },
    {
      key: 'has_syllabus',
      label: 'Syllabus',
      render: (r) => (
        <div className="space-y-1">
          <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-bold ${r.has_syllabus ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-foreground/5 text-muted'}`}>
            {r.has_syllabus ? 'Added' : 'Pending'}
          </span>
          {r.syllabus_document_url ? (
            <a href={r.syllabus_document_url} target="_blank" rel="noreferrer" className="block text-xs text-[var(--primary)] hover:underline">
              Open link
            </a>
          ) : null}
        </div>
      ),
    },
    { key: 'is_active', label: 'Status', render: r => <StatusBadge active={r.is_active} /> },
  ];

  const displayedRows = isViewAll ? rows : rows.slice(0, 10);

  const tableFilters = isViewAll ? (
    <div className="flex flex-wrap gap-2">
      {/* 
        The global filters are now managed in the parent Batches component 
        and passed down to Programs, Batches, and Sections.
      */}
    </div>
  ) : null;

  return (
    <>
      <CrudTable title="Programs" subtitle={isHOD ? "Department programs already added for your campus and department. Add or update the syllabus for each program here." : "Academic programs (B.E., M.Sc., Diploma etc.)"} columns={COLS} rows={displayedRows} onCreate={isHOD ? null : openCreate} onEdit={openEdit} onDelete={isHOD ? null : async id => { if (window.confirm('Delete?')) { await academicsApi.deleteProgram(id); load(); } }} loading={loading} filters={tableFilters} disableAddReason={disableAddReason} userRole={userRole} bulkSelection={canBulkDelete ? { selectedIds, onToggleRow: toggleRow, onToggleAll: toggleAll, onBulkDelete: handleBulkDelete } : null} />
      
      {!isViewAll && rows.length > 10 && (
        <div className="flex justify-center mt-4">
          <button onClick={() => setIsViewAll(true)} className="bg-surface hover:bg-surface/80 border border-border text-[var(--primary)] px-6 py-2 rounded-xl text-sm font-semibold">
            View All Programs
          </button>
        </div>
      )}

      <FormModal isOpen={open} onClose={() => setOpen(false)} title={editing ? 'Edit Program' : 'New Program'} onSubmit={handleSubmit} saving={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Campus">
            <select required className={selectCls} value={form.campus} onChange={e => set('campus', e.target.value)}>
              <option value="">Select Campus...</option>
              {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Department">
            <select required className={selectCls} value={form.department} onChange={e => set('department', e.target.value)}>
              <option value="">Select Department...</option>
              {filteredDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Program Name">
            <input required className={inputCls} value={form.name} onChange={handleNameChange} placeholder="e.g. B.E. Computer Science" />
          </Field>
          <Field label="Code">
            <input required className={inputCls} value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="e.g. BECS" />
          </Field>
          <Field label="Degree Type">
            <select className={selectCls} value={form.degree_type} onChange={e => set('degree_type', e.target.value)}>
              {DEGREE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Duration (Years)">
            <input type="number" min="1" max="10" className={inputCls} value={form.duration_years} onChange={e => set('duration_years', parseInt(e.target.value))} />
          </Field>
          <Field label="Total Semesters">
            <input type="number" min="1" max="20" className={inputCls} value={form.total_semesters} onChange={e => set('total_semesters', parseInt(e.target.value))} />
          </Field>
        </div>
      </FormModal>

      <FormModal isOpen={syllabusOpen} onClose={() => setSyllabusOpen(false)} title={`Syllabus - ${syllabusProgram?.name || 'Program'}`} onSubmit={handleSyllabusSubmit} saving={syllabusSaving}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Campus">
              <input className={inputCls} value={syllabusProgram?.campus_name || ''} readOnly />
            </Field>
            <Field label="Department">
              <input className={inputCls} value={syllabusProgram?.department_name || ''} readOnly />
            </Field>
          </div>
          <Field label="Program">
            <input className={inputCls} value={syllabusProgram?.name || ''} readOnly />
          </Field>
          <Field label="Syllabus Overview">
            <textarea
              className={inputCls}
              rows="8"
              value={syllabusForm.syllabus_overview}
              onChange={(e) => setSyllabusForm((prev) => ({ ...prev, syllabus_overview: e.target.value }))}
              placeholder="Add the syllabus outline, learning objectives, modules, or semester coverage for this program."
            />
          </Field>
          <Field label="Syllabus Document Link">
            <input
              type="url"
              className={inputCls}
              value={syllabusForm.syllabus_document_url}
              onChange={(e) => setSyllabusForm((prev) => ({ ...prev, syllabus_document_url: e.target.value }))}
              placeholder="https://..."
            />
          </Field>
        </div>
      </FormModal>
    </>
  );
}
