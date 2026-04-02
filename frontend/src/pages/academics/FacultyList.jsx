import { useState, useEffect, useMemo } from 'react';
import { academicsApi } from '../../api/academics';
import { campusApi } from '../../api/campus';
import { FormModal, Field, inputCls, selectCls } from '../../components/academics/AcademicCrud';
import { useAuth } from '../../auth/AuthContext';
import { Search, Plus, Edit2, Trash2, Users, X, SlidersHorizontal, ChevronDown, Info, Loader2, BookOpen } from 'lucide-react';

const DESIGNATIONS = [
  'professor', 'associate_professor', 'assistant_professor', 'lecturer',
  'visiting', 'adjunct', 'hod', 'dean', 'other'
];

const blank = {
  user: '', campus: '', department: '', employee_id: '',
  designation: 'assistant_professor', specialization: '',
  max_weekly_hours: 18, status: 'active', qualifications: ''
};

const STATUS_STYLES = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  on_leave: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  retired: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
  resigned: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

function Avatar({ name }) {
  const initials = name
    ? name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('')
    : '?';
  const colors = ['#22D3EE', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#38BDF8'];
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length];
  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-[#0F172A]"
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}

function FilterSelect({ value, onChange, children, placeholder }) {
  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        onChange={onChange}
        className="appearance-none bg-surface border border-border text-sm text-foreground/80 rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]/60 cursor-pointer transition-colors hover:border-border/80 min-w-[140px]"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {children}
      </select>
      <ChevronDown className="absolute right-2 w-3.5 h-3.5 text-foreground/30 pointer-events-none" />
    </div>
  );
}

export default function FacultyList() {
  const { user } = useAuth();
  const userRole = user?.role?.name || user?.role;
  const isFaculty = userRole === 'faculty';
  const isHOD = Boolean(userRole === 'hod' || (user?.is_hod && userRole !== 'faculty'));

  const [filterCampus, setFilterCampus] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterDesig, setFilterDesig] = useState('');
  const [search, setSearch] = useState('');

  const [rows, setRows] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [depts, setDepts] = useState([]);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [courseLoading, setCourseLoading] = useState(false);
  const [facultyCourses, setFacultyCourses] = useState([]);
  const [selectedFacultyName, setSelectedFacultyName] = useState('');

  const openDetail = async (row) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const data = await academicsApi.getFacultyProfessionalDetail(row.id);
      setDetailData(data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to load details.');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const openCourseModal = async (row) => {
    setCourseModalOpen(true);
    setCourseLoading(true);
    setFacultyCourses([]);
    setSelectedFacultyName(row.user_name);
    try {
      const data = await academicsApi.getCourseSections({ faculty_id: row.id });
      setFacultyCourses(data);
    } catch (err) {
      console.error("Failed to load course sections:", err);
      // Don't show technical traceback anymore, just a user-friendly message
      alert('Failed to load assigned courses. Please try again later.');
      setCourseModalOpen(false);
    } finally {
      setCourseLoading(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      setRows(await academicsApi.getFacultyDirectory());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isFaculty) {
      campusApi.getCampuses().then(setCampuses);
      academicsApi.getDepartments().then(setDepts);
      import('../../api/users').then(m => m.usersApi.getUsers().then(setUsers));
    }
  }, [isFaculty]);

  useEffect(() => { load(); }, []);

  const visibleCampuses = useMemo(() =>
    Array.from(
      rows.reduce((map, row) => {
        if (row.campus_id) map.set(String(row.campus_id), { id: row.campus_id, name: row.campus_name || 'Unknown' });
        return map;
      }, new Map()).values()
    ).sort((a, b) => a.name.localeCompare(b.name)),
    [rows]
  );

  const visibleDepartments = useMemo(() =>
    Array.from(
      rows.reduce((map, row) => {
        if (row.department) {
          const matchesCampus = !filterCampus || String(row.campus_id) === String(filterCampus);
          if (matchesCampus) map.set(String(row.department), { id: row.department, name: row.department_name || 'Unknown' });
        }
        return map;
      }, new Map()).values()
    ).sort((a, b) => a.name.localeCompare(b.name)),
    [rows, filterCampus]
  );

  const designationOptions = useMemo(() =>
    Array.from(
      rows.reduce((map, row) => {
        const key = row.designation || '__none__';
        map.set(key, { value: key, label: row.designation_display || 'Not Set' });
        return map;
      }, new Map()).values()
    ).sort((a, b) => a.label.localeCompare(b.label)),
    [rows]
  );

  const facultyUsers = useMemo(() =>
    users.filter(item => {
      const roleName = item?.role?.name || item?.role_name || item?.role;
      return roleName === 'faculty';
    }),
    [users]
  );

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter(row => {
      // Faculty view only shows active faculty
      if (isFaculty && row.status !== 'active') return false;

      const matchesCampus = !filterCampus || String(row.campus_id) === String(filterCampus);
      const matchesDept = !filterDept || String(row.department) === String(filterDept);
      
      const rowDesig = row.designation || '__none__';
      const matchesDesig = !filterDesig || rowDesig === filterDesig;

      const matchesSearch = !query || [row.user_name, row.user_email, row.employee_id]
        .some(v => v?.toLowerCase().includes(query));
      return matchesCampus && matchesDept && matchesDesig && matchesSearch;
    });
  }, [rows, filterCampus, filterDept, filterDesig, search]);

  const set = (k, v) => setForm(f => {
    const updated = { ...f, [k]: v };
    if (k === 'campus') updated.department = '';
    return updated;
  });

  const openCreate = () => { setEditing(null); setForm(blank); setOpen(true); };
  const openEdit = (row) => {
    setEditing(row);
    setForm({ ...row, user: row.user, department: row.department, campus: row.campus_id });
    setOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await academicsApi.updateFaculty(editing.id, form);
      else await academicsApi.createFaculty(form);
      setOpen(false);
      load();
    } catch (err) {
      alert(JSON.stringify(err.response?.data) || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const hasFilters = filterCampus || filterDept || filterDesig || search;

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Faculty Profiles</h1>
          <p className="text-foreground/40 text-sm mt-1">
            {isFaculty
              ? 'Browse faculty across campuses and departments'
              : isHOD
                ? 'Department faculty directory with profile, workload, and professional details'
                : 'Tenant-wide faculty directory'}
          </p>
        </div>
        {!isFaculty && userRole !== 'hod' && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-[var(--primary)] hover:brightness-90 text-[#0F172A] font-bold px-5 py-2.5 rounded-xl transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Faculty
          </button>
        )}
      </div>

      {/* ── Filters Bar ── */}
      <div className="bg-surface/60 border border-border rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
            <input
              type="text"
              placeholder="Search name, email, or employee ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-surface/30 border border-border rounded-xl pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]/60 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <SlidersHorizontal className="w-4 h-4 text-foreground/30 flex-shrink-0" />
            {!isHOD && (
              <FilterSelect value={filterCampus} onChange={e => { setFilterCampus(e.target.value); setFilterDept(''); }} placeholder="All Campuses">
                {visibleCampuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </FilterSelect>
            )}
            <FilterSelect value={filterDept} onChange={e => setFilterDept(e.target.value)} placeholder="All Departments">
              {visibleDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </FilterSelect>
            <FilterSelect value={filterDesig} onChange={e => setFilterDesig(e.target.value)} placeholder="All Designations">
              {designationOptions.map(o => <option key={o.value || '__not_set__'} value={o.value}>{o.label}</option>)}
            </FilterSelect>
            {hasFilters && (
              <button
                onClick={() => { setFilterCampus(''); setFilterDept(''); setFilterDesig(''); setSearch(''); }}
                className="flex items-center gap-1.5 text-xs text-foreground/40 hover:text-foreground/80 transition-colors px-2 py-1.5 rounded-lg hover:bg-foreground/5"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats Summary ── */}
      <div className="flex items-center gap-3 text-sm text-foreground/40">
        <Users className="w-4 h-4" />
        <span>
          Showing <span className="text-foreground/80 font-semibold">{filteredRows.length}</span> of{' '}
          <span className="text-foreground/80 font-semibold">{rows.length}</span> {isHOD ? 'department faculty members' : 'faculty members'}
        </span>
      </div>

      {/* ── Table ── */}
      <div className="bg-surface/60 border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-border/80 bg-background/60">
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/30 w-12">#</th>
                {!isFaculty && <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/30 w-24">Emp ID</th>}
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/30">Faculty</th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/30">Campus</th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/30">Department</th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/30">Designation</th>
                {!isFaculty && <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/30 text-center">Max Hrs</th>}
                {!isFaculty && <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/30">Status</th>}
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/30 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1B2A4A]/40">
              {loading ? (
                <tr>
                  <td colSpan={isFaculty ? 8 : 9} className="text-center py-16 text-foreground/30">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-2 border-[#22D3EE]/30 border-t-[#22D3EE] rounded-full animate-spin" />
                      <span className="text-sm">Loading faculty...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={isFaculty ? 8 : 9} className="text-center py-16 text-foreground/30">
                    <div className="flex flex-col items-center gap-3">
                      <Users className="w-10 h-10 text-foreground/10" />
                      <span className="text-sm">{hasFilters ? 'No faculty match your filters.' : 'No faculty found.'}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className="hover:bg-background transition-colors group"
                  >
                    <td className="px-5 py-4 text-sm text-foreground/25 font-medium">{idx + 1}</td>
                    {!isFaculty && (
                      <td className="px-5 py-4">
                        <span className="text-xs font-mono text-foreground/50 bg-foreground/5 px-2 py-1 rounded-lg">
                          {row.employee_id || '—'}
                        </span>
                      </td>
                    )}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={row.user_name} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{row.user_name || '—'}</p>
                          <p className="text-xs text-foreground/40 truncate">{row.user_email || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-foreground/60 whitespace-nowrap">{row.campus_name || '—'}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-foreground/60 leading-snug">{row.department_name || '—'}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-foreground/60">{row.designation_display || 'Not Set'}</span>
                    </td>
                    {!isFaculty && (
                      <td className="px-5 py-4 text-center">
                        {Number.isFinite(row.max_weekly_hours) ? (
                          <span className="text-sm font-semibold text-foreground/70">{row.max_weekly_hours}<span className="text-xs text-foreground/30">h</span></span>
                        ) : (
                          <span className="text-foreground/25">—</span>
                        )}
                      </td>
                    )}
                    {!isFaculty && (
                      <td className="px-5 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${STATUS_STYLES[row.status] || 'bg-white/10 text-foreground/50'}`}>
                          {row.status_display || row.status || '—'}
                        </span>
                      </td>
                    )}
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isFaculty ? (
                          <button
                            onClick={() => openCourseModal(row)}
                            className="p-1.5 rounded-lg text-foreground/40 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors flex items-center gap-1.5 text-xs px-2"
                            title="View Assigned Courses"
                          >
                            <BookOpen className="w-3.5 h-3.5" /> View
                          </button>
                        ) : (
                          <>
                            {(userRole === 'admin' || userRole === 'tenant_admin' || userRole === 'hod') && (
                              <button
                                onClick={() => openDetail(row)}
                                className="p-1.5 rounded-lg text-foreground/40 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                                title="View Professional Details"
                              >
                                <Info className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {(userRole === 'admin' || userRole === 'tenant_admin') && (
                              <>
                                <button
                                  onClick={() => openEdit(row)}
                                  className="p-1.5 rounded-lg text-foreground/40 hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => { if (window.confirm('Delete this faculty profile?')) { academicsApi.deleteFaculty(row.id).then(load); } }}
                                  className="p-1.5 rounded-lg text-foreground/40 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add/Edit Modal ── */}
      <FormModal isOpen={open} onClose={() => setOpen(false)} title={editing ? 'Edit Faculty Profile' : 'Add Faculty Profile'} onSubmit={handleSubmit} saving={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="User Account">
            <select required className={selectCls} value={form.user} onChange={e => set('user', e.target.value)} disabled={!!editing}>
              <option value="">Select User...</option>
              {Array.isArray(facultyUsers) ? facultyUsers.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>) : null}
            </select>
          </Field>
          <Field label="Employee ID">
            <input required className={inputCls} value={form.employee_id} onChange={e => set('employee_id', e.target.value)} />
          </Field>
          <Field label="Campus">
            <select required className={selectCls} value={form.campus} onChange={e => set('campus', e.target.value)}>
              <option value="">Select...</option>
              {Array.isArray(campuses) ? campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>) : null}
            </select>
          </Field>
          <Field label="Department">
            <select required className={selectCls} value={form.department} onChange={e => set('department', e.target.value)}>
              <option value="">Select...</option>
              {Array.isArray(depts) ? depts.filter(d => !form.campus || String(d.campus) === String(form.campus)).map(d => <option key={d.id} value={d.id}>{d.name}</option>) : null}
            </select>
          </Field>
          <Field label="Designation">
            <select className={selectCls} value={form.designation} onChange={e => set('designation', e.target.value)}>
              {DESIGNATIONS.map(d => <option key={d} value={d}>{d.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
            </select>
          </Field>
          <Field label="Specialization">
            <input className={inputCls} value={form.specialization} onChange={e => set('specialization', e.target.value)} />
          </Field>
          <Field label="Max Weekly Hours">
            <input type="number" min="1" max="40" className={inputCls} value={form.max_weekly_hours} onChange={e => set('max_weekly_hours', parseInt(e.target.value))} />
          </Field>
          <Field label="Status">
            <select className={selectCls} value={form.status} onChange={e => set('status', e.target.value)}>
              {['active', 'on_leave', 'retired', 'resigned'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
            </select>
          </Field>
          <div className="col-span-2">
            <Field label="Qualifications">
              <textarea className={inputCls} rows="2" value={form.qualifications} onChange={e => set('qualifications', e.target.value)} />
            </Field>
          </div>
        </div>
      </FormModal>

      {/* ── Professional Detail Drawer ── */}
      {detailOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDetailOpen(false)} />
          <div className="relative w-full max-w-md bg-surface border-l border-border h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-6 border-b border-border bg-background">
              <h2 className="text-lg font-bold text-foreground">Professional Profile</h2>
              <button onClick={() => setDetailOpen(false)} className="text-foreground/40 hover:text-foreground p-2 text-xl rounded-lg hover:bg-foreground/5 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {detailLoading ? (
                <div className="flex items-center justify-center py-10 flex-col gap-3">
                  <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
                  <span className="text-foreground/50 text-sm">Loading details...</span>
                </div>
              ) : detailData ? (
                (() => {
                  const noData = !detailData.skills && !detailData.years_of_experience && !detailData.certifications && !detailData.research_interests && !detailData.industry_experience && !detailData.bio;
                  return (
                  <div className="space-y-6 pb-12">
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-1">{detailData.user_name}</h3>
                      <p className="text-sm text-[var(--primary)] font-medium">{detailData.designation_display}</p>
                      <p className="text-sm text-foreground/50 mt-0.5">{detailData.department_name} • {detailData.campus_name}</p>
                    </div>

                    {detailData.qualifications && (
                      <div className="bg-white/[0.02] border border-border rounded-xl p-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/30 mb-2 flex items-center gap-2"><Info className="w-3.5 h-3.5"/> Qualifications</h4>
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap">{detailData.qualifications}</p>
                      </div>
                    )}
                    
                    {detailData.specialization && (
                      <div className="bg-white/[0.02] border border-border rounded-xl p-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/30 mb-2 flex items-center gap-2"><Info className="w-3.5 h-3.5"/> Specialization</h4>
                        <p className="text-sm text-foreground/80">{detailData.specialization}</p>
                      </div>
                    )}

                    {noData && (
                      <div className="bg-foreground/5 border border-border rounded-xl p-6 text-center text-sm text-foreground/50 flex flex-col items-center gap-3">
                        <Info className="w-8 h-8 text-foreground/20" />
                        No additional professional details have been added by this faculty member yet.
                      </div>
                    )}

                    {(detailData.years_of_experience || detailData.skills) && (
                      <div className="grid grid-cols-2 gap-4">
                        {detailData.years_of_experience && (
                          <div className={`bg-white/[0.02] border border-border rounded-xl p-4 ${detailData.skills ? 'col-span-1' : 'col-span-2'}`}>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/30 mb-1">Experience</h4>
                            <p className="text-sm text-foreground/80">{detailData.years_of_experience} years</p>
                          </div>
                        )}
                        {detailData.skills && (
                          <div className={`bg-white/[0.02] border border-border rounded-xl p-4 ${detailData.years_of_experience ? 'col-span-1' : 'col-span-2'}`}>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/30 mb-1">Skills</h4>
                            <p className="text-sm text-foreground/80">{detailData.skills}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {detailData.certifications && (
                      <div className="bg-white/[0.02] border border-border rounded-xl p-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/30 mb-2">Certifications</h4>
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap">{detailData.certifications}</p>
                      </div>
                    )}
                    
                    {detailData.research_interests && (
                      <div className="bg-white/[0.02] border border-border rounded-xl p-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/30 mb-2">Research Interests</h4>
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap">{detailData.research_interests}</p>
                      </div>
                    )}

                    {detailData.industry_experience && (
                      <div className="bg-white/[0.02] border border-border rounded-xl p-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/30 mb-2">Industry Experience</h4>
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap">{detailData.industry_experience}</p>
                      </div>
                    )}

                    {detailData.bio && (
                      <div className="bg-white/[0.02] border border-border rounded-xl p-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/30 mb-2">Bio / Summary</h4>
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap italic opacity-90 leading-relaxed">"{detailData.bio}"</p>
                      </div>
                    )}
                  </div>
                )})()
              ) : null}
            </div>
          </div>
        </div>
      )}
      {/* ── Assigned Courses Drawer ── */}
      {courseModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCourseModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-surface border-l border-border h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-6 border-b border-border bg-background">
              <h2 className="text-lg font-bold text-foreground">Assigned Courses</h2>
              <button onClick={() => setCourseModalOpen(false)} className="text-foreground/40 hover:text-foreground p-2 text-xl rounded-lg hover:bg-foreground/5 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="mb-4">
                <p className="text-xs text-foreground/40 uppercase tracking-widest font-bold">Faculty Member</p>
                <p className="text-lg font-bold text-foreground mt-1">{selectedFacultyName}</p>
              </div>

              {courseLoading ? (
                <div className="flex items-center justify-center py-10 flex-col gap-3">
                  <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
                  <span className="text-foreground/50 text-sm">Loading courses...</span>
                </div>
              ) : facultyCourses.length > 0 ? (
                facultyCourses.map((assignment) => (
                  <div key={assignment.id} className="bg-foreground/5 border border-border rounded-xl p-4 hover:bg-white/[0.07] transition-colors">
                    <p className="text-sm font-bold text-foreground mb-0.5">{assignment.course_name}</p>
                    <p className="text-xs text-[var(--primary)]">{assignment.course_code}</p>
                    <div className="mt-3 text-[11px] text-foreground/50 flex flex-wrap gap-4">
                       <div className="flex flex-col gap-1">
                         <span className="text-foreground/30 uppercase tracking-widest text-[9px]">Section</span>
                         <span className="text-foreground/70">{assignment.section_label}</span>
                       </div>
                       <div className="flex flex-col gap-1">
                         <span className="text-foreground/30 uppercase tracking-widest text-[9px]">Semester</span>
                         <span className="text-foreground/70">{assignment.semester_name}</span>
                       </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-foreground/5 border border-border rounded-xl p-10 text-center text-sm text-foreground/40 flex flex-col items-center gap-3 mt-4 border-dashed">
                  <BookOpen className="w-8 h-8 text-foreground/10" />
                  No courses are currently assigned.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
