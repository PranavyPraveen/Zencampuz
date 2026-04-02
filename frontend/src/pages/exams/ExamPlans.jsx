import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { examsApi } from '../../api/exams';
import { academicsApi } from '../../api/academics';
import { CrudTable, FormModal, Field, inputCls, selectCls, StatusBadge } from '../../components/academics/AcademicCrud';
import { Settings, Calendar, Users, MapPin, Send } from 'lucide-react';

const blank = { name: '', semester: '', start_date: '', end_date: '', instructions: '' };

export default function ExamPlans() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setRows(await examsApi.getPlans());
    setLoading(false);
  };

  useEffect(() => {
    load();
    academicsApi.getSemesters().then(setSemesters);
    academicsApi.getDepartments().then(setDepartments);
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const openCreate = () => { setEditing(null); setForm(blank); setOpen(true); };
  
  const openEdit = (row) => { 
    setEditing(row); 
    setForm({ ...row, semester: row.semester, department: row.department }); 
    setOpen(true); 
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) await examsApi.updatePlan(editing.id, form);
      else await examsApi.createPlan(form);
      setOpen(false); load();
    } catch { alert('Save failed.'); }
    finally { setSaving(false); }
  };

  const COLS = [
    { key: 'name', label: 'Exam Cycle Name' },
    { key: 'department_name', label: 'Department' },
    { key: 'semester_name', label: 'Semester' },
    { key: 'start_date', label: 'Start Date', render: r => new Date(r.start_date).toLocaleDateString() },
    { key: 'end_date', label: 'End Date', render: r => new Date(r.end_date).toLocaleDateString() },
    { key: 'status_display', label: 'Status', render: r => <StatusBadge active={r.status === 'published'} /> },
  ];

  const customActions = (row) => (
    <div className="flex gap-1 bg-surface/30 p-1 rounded-xl border border-border relative shrink-0">
      <button onClick={() => navigate(`/exams/scheduler/${row.id}`)} className="text-[var(--primary)] p-2 hover:bg-[var(--primary)]/10 rounded-lg transition-all" title="1. Configure Sessions & Assign Courses">
        <Calendar className="w-4 h-4" />
      </button>
      <button onClick={() => navigate(`/exams/halls/${row.id}`)} className="text-[#F59E0B] p-2 hover:bg-[#F59E0B]/10 rounded-lg transition-all" title="2. Allocate Halls & Seating">
        <MapPin className="w-4 h-4" />
      </button>
      <button onClick={() => navigate(`/exams/invigilators/${row.id}`)} className="text-[#A855F7] p-2 hover:bg-[#A855F7]/10 rounded-lg transition-all" title="3. Assign Invigilators">
        <Users className="w-4 h-4" />
      </button>
      <div className="w-px bg-surface mx-1"></div>
      <button onClick={() => navigate(`/exams/publish/${row.id}`)} className="text-[#10B981] p-2 hover:bg-[#10B981]/10 rounded-lg transition-all" title="4. Review & Publish">
        <Send className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <>
      <CrudTable 
        title="Exam Plans" 
        subtitle="Manage end-to-end exam cycles. Follow the workflow buttons from left to right." 
        columns={COLS} 
        rows={rows} 
        onCreate={openCreate} 
        onEdit={openEdit} 
        onDelete={async id => { if (window.confirm('Delete exam plan entirely?')) { await examsApi.deletePlan(id); load(); } }} 
        loading={loading} 
        customActions={customActions} 
      />
      
      <FormModal isOpen={open} onClose={() => setOpen(false)} title={editing ? 'Edit Exam Plan' : 'New Exam Plan'} onSubmit={handleSave} saving={saving}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field label="Exam Cycle Name"><input required className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Fall 2024 Final Exams" /></Field>
          </div>
          <Field label="Semester">
            <select required className={selectCls} value={form.semester} onChange={e => set('semester', e.target.value)}>
               <option value="">Select...</option>
              {semesters.map(s => <option key={s.id} value={s.id}>{s.name} ({s.academic_year})</option>)}
            </select>
          </Field>
          <Field label="Department">
            <select required className={selectCls} value={form.department} onChange={e => set('department', e.target.value)}>
               <option value="">Select Department...</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Start Date"><input required type="date" className={inputCls} value={form.start_date} onChange={e => set('start_date', e.target.value)} /></Field>
          <Field label="End Date"><input required type="date" className={inputCls} value={form.end_date} onChange={e => set('end_date', e.target.value)} /></Field>
          <div className="col-span-2">
            <Field label="General Instructions (Optional)">
              <textarea rows="3" className={inputCls} value={form.instructions} onChange={e => set('instructions', e.target.value)} placeholder="e.g. Students must bring XYZ..."></textarea>
            </Field>
          </div>
        </div>
      </FormModal>
    </>
  );
}
