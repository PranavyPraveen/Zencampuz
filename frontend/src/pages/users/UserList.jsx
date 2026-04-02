import { useState, useEffect } from 'react';
import { usersApi } from '../../api/users';
import api from '../../api/axios';
import { Plus, Edit2, Trash2, Upload, CheckCircle, XCircle, AlertTriangle, MapPin } from 'lucide-react';
import UserFormModal from '../../components/users/UserFormModal';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

const ROLE_COLORS = {
  tenant_admin: '#22D3EE', academic_admin: '#F59E0B', facility_manager: '#10B981',
  it_admin: '#F59E0B', hod: '#F97316', faculty: '#2563EB', student: '#8B5CF6',
  research_scholar: '#EC4899', external_user: '#475569',
};

const CAMPUS_ADMIN_ALLOWED_ROLES = [
  'faculty', 'student', 'research_scholar', 'external_user',
  'academic_admin', 'facility_manager', 'hod',
];


const ROLE_DISPLAY = {
  tenant_admin: 'Tenant Admin',
  academic_admin: 'Academic Admin',
  facility_manager: 'Facility Manager',
  it_admin: 'IT Admin',
  hod: 'HOD',
  faculty: 'Faculty',
  student: 'Student',
  research_scholar: 'Research Scholar',
  external_user: 'External User',
};

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const { user: authUser } = useAuth();
  const isCampusAdmin = authUser?.role?.name === 'it_admin' && authUser?.campus?.id;
  const navigate = useNavigate();
  const location = useLocation();
  const queryRole = new URLSearchParams(location.search).get('role') || '';
  const [filterRole, setFilterRole] = useState(queryRole);
  const [filterCampus, setFilterCampus] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');

  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);

  const [campuses, setCampuses] = useState([]);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    api.get('/campus/campuses/').then(r => setCampuses(r.data.results || r.data)).catch(console.error);
    
    // Only fetch departments for the given campus if it_admin
    const deptParams = isCampusAdmin ? { params: { campus_id: authUser.campus.id } } : {};
    api.get('/academics/departments/', deptParams).then(r => setDepartments(r.data.results || r.data)).catch(console.error);
  }, [isCampusAdmin, authUser]);

  // Sync filterRole if URL param changes (e.g. navigating from dashboard tiles)
  useEffect(() => { setFilterRole(queryRole); }, [queryRole]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterActive !== '') params.is_active = filterActive;
      if (filterCampus) params.campus_id = filterCampus;
      const data = await usersApi.getUsers(params);
      setUsers(data.results || data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [filterActive, filterCampus]);

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this user from the system?')) return;
    try { await usersApi.deleteUser(id); fetchUsers(); }
    catch { alert('Delete failed.'); }
  };

  const toggleActive = async (user) => {
    try {
      if (user.is_active) await usersApi.deactivateUser(user.id);
      else await usersApi.activateUser(user.id);
      fetchUsers();
    } catch { alert('Status change failed.'); }
  };

  const isProtected = (u) => ['super_admin', 'tenant_admin', 'it_admin'].includes(u.role?.name);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const selectable = filtered.filter(u => !isProtected(u));
      setSelectedIds(selectable.map(u => u.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    setDeletingBulk(true);
    try {
      const res = await usersApi.bulkDelete(selectedIds);
      alert(res.message);
      setSelectedIds([]);
      setConfirmBulkDelete(false);
      fetchUsers();
    } catch (e) {
      alert(e.response?.data?.error || 'Bulk delete failed.');
    } finally {
      setDeletingBulk(false);
    }
  };

  useEffect(() => {
    setSelectedIds([]);
  }, [filterActive, filterRole, filterCampus, filterDepartment, search]);

  // Derive the selected campus object so we can read its status
  const selectedCampusObj = filterCampus
    ? campuses.find(c => c.id === filterCampus)
    : null;
  const selectedCampusIsInactive =
    selectedCampusObj && selectedCampusObj.status !== 'active';
  const campusStatusLabel = selectedCampusObj
    ? { active: 'Active', inactive: 'Inactive', maintenance: 'Under Maintenance' }[selectedCampusObj.status] || selectedCampusObj.status
    : '';

  const normalizeStr = (s) => 
    (s || '').toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/&/g, 'and')
      .trim();

  const getUserCampusName = (u) => {
    // 1. Explicitly mapped campus
    if (u.campus?.name) return u.campus.name;
    
    // 2. Fallback to Department mapping
    if (u.department && departments.length > 0) {
      const userDeptNorm = normalizeStr(u.department);
      
      // Attempt exact match first
      let matchingDepts = departments.filter(dept => normalizeStr(dept.name) === userDeptNorm);
      
      // If no exact match, try broad matching (ignoring campus suffixes in parentheses)
      if (matchingDepts.length === 0) {
        matchingDepts = departments.filter(dept => {
          const canonDeptNorm = normalizeStr(dept.name);
          const baseCanonDept = normalizeStr(dept.name.split('(')[0]);
          return canonDeptNorm.includes(userDeptNorm) || baseCanonDept === userDeptNorm || userDeptNorm.includes(baseCanonDept);
        });
      }
      
      // Return if unambiguous across all campuses
      if (matchingDepts.length === 1) {
        const d = matchingDepts[0];
        return d.campus_name || campuses.find(c => c.id === d.campus)?.name;
      }
      
      // If ambiguous but they ALL belong to the same campus name
      const uniqueCampusNames = [...new Set(matchingDepts.map(d => d.campus_name || campuses.find(c => c.id === d.campus)?.name).filter(Boolean))];
      if (uniqueCampusNames.length === 1) return uniqueCampusNames[0];
    }
    return null;
  };

  const filtered = users.filter(u => {
    const matchSearch = !search || u.full_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = !filterRole || u.role?.name === filterRole;
    const matchDept = !filterDepartment || u.department === filterDepartment;
    return matchSearch && matchRole && matchDept;
  });

  // Label helpers for the campus dropdown
  const campusOptionLabel = (c) => {
    if (c.status === 'inactive') return `${c.name} — Inactive`;
    if (c.status === 'maintenance') return `${c.name} — Maintenance`;
    return c.name;
  };

  const inputCls = 'bg-background border border-border px-4 py-2.5 rounded-xl text-foreground text-sm focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">User Management</h2>
          <p className="text-muted mt-1">Manage all users, roles, and access within your institution</p>
        </div>
        <div className="flex gap-3">
          {/* Bulk Import — disabled when inactive campus is selected */}
          <button
            onClick={() => navigate('/users/bulk-import')}
            disabled={selectedCampusIsInactive}
            title={selectedCampusIsInactive ? `Cannot import to an ${campusStatusLabel} campus` : 'Bulk import users'}
            className={`border px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all
              ${selectedCampusIsInactive
                ? 'bg-surface/10 border-border/30 text-muted cursor-not-allowed opacity-50'
                : 'bg-surface border-[#2563EB]/30 text-[var(--primary)] hover:bg-[#243558]'}`}
          >
            <Upload className="w-5 h-5" /> Bulk Import
          </button>

          {/* Add User — disabled when inactive campus is selected */}
          <button
            onClick={() => { if (!selectedCampusIsInactive) { setEditing(null); setIsModalOpen(true); } }}
            disabled={selectedCampusIsInactive}
            title={selectedCampusIsInactive ? `Cannot add users to an ${campusStatusLabel} campus` : 'Add new user'}
            className={`px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all
              ${selectedCampusIsInactive
                ? 'bg-[var(--primary)]/30 text-[#0F172A]/50 cursor-not-allowed opacity-50'
                : 'bg-[var(--primary)] hover:brightness-90 text-[#0F172A]'}`}
          >
            <Plus className="w-5 h-5" /> Add User
          </button>
        </div>
      </div>

      {/* ── Inactive campus warning banner ─────────────────────────────────── */}
      {selectedCampusIsInactive && (
        <div className="flex items-start gap-3 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-xl px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
          <div>
            <p className="text-[#F59E0B] font-semibold text-sm">
              {selectedCampusObj.name} is currently <span className="uppercase">{campusStatusLabel}</span>
            </p>
            <p className="text-muted text-xs mt-0.5">
              This campus is not operational. No users can be added or imported here. Existing users are shown for reference only.
            </p>
          </div>
        </div>
      )}

      {/* ── Campus IT Admin scope banner ─────────────────────────────────── */}
      {isCampusAdmin && (
        <div className="flex items-center gap-3 bg-[var(--primary)]/08 border border-[#22D3EE]/20 rounded-xl px-5 py-3">
          <MapPin className="w-4 h-4 text-[var(--primary)] shrink-0" />
          <p className="text-[var(--primary)] text-sm">
            Showing users in <span className="font-bold">{authUser?.campus?.name}</span> only. You can only create and manage users within your assigned campus.
          </p>
        </div>
      )}

      {/* Filters & Bulk Toolbar */}
      <div className="flex flex-col gap-3">
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] px-4 py-2 rounded-xl text-sm font-semibold animate-in fade-in zoom-in duration-200 w-fit">
            <span>{selectedIds.length} users selected</span>
            <button onClick={() => setConfirmBulkDelete(true)} className="flex items-center gap-1.5 bg-[#EF4444] hover:bg-red-600 text-foreground px-3 py-1.5 rounded-lg ml-2 transition-colors">
              <Trash2 className="w-4 h-4" /> Delete Selected
            </button>
            <button onClick={() => setSelectedIds([])} className="text-[#EF4444]/80 hover:text-[#EF4444] px-2 py-1">Cancel</button>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or email..."
          className={`${inputCls} w-72`}
        />
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className={inputCls}>
          <option value="">All Roles</option>
          {Object.entries(ROLE_DISPLAY)
            .filter(([key]) => !isCampusAdmin || CAMPUS_ADMIN_ALLOWED_ROLES.includes(key))
            .map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        {/* Campus filter — hidden for campus IT admins (auto-scoped on server) */}
        {!isCampusAdmin && (
          <select
            value={filterCampus}
            onChange={e => setFilterCampus(e.target.value)}
            className={`${inputCls} ${selectedCampusIsInactive ? 'border-[#F59E0B]/50 text-[#F59E0B]' : ''}`}
          >
            <option value="">All Campuses</option>
            {campuses.filter(c => c.status === 'active').map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
            {campuses.filter(c => c.status !== 'active').length > 0 && (
              <option disabled>── Inactive / Maintenance ──</option>
            )}
            {campuses.filter(c => c.status !== 'active').map(c => (
              <option key={c.id} value={c.id}>{campusOptionLabel(c)}</option>
            ))}
          </select>
        )}

        <select value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)} className={inputCls}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
        <select value={filterActive} onChange={e => setFilterActive(e.target.value)} className={inputCls}>
          <option value="">All Status</option>
          <option value="true">Active Only</option>
          <option value="false">Inactive Only</option>
        </select>
      </div>
      </div>

      <div className="bg-background border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface/50 text-muted text-xs uppercase tracking-wider">
              <th className="px-6 py-4 w-12">
                <input 
                  type="checkbox" 
                  checked={filtered.length > 0 && selectedIds.length === filtered.filter(u => !isProtected(u)).length}
                  onChange={handleSelectAll}
                  disabled={filtered.filter(u => !isProtected(u)).length === 0}
                  className="rounded border-border bg-background text-[var(--primary)] focus:ring-[#22D3EE] w-4 h-4 cursor-pointer"
                />
              </th>
              <th className="px-6 py-4 w-16">Sl. No.</th>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Department / Campus</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1B2A4A]">
            {loading
              ? <tr><td colSpan="7" className="text-center py-8 text-muted">Loading...</td></tr>
              : filtered.length === 0
                ? (
                  <tr>
                    <td colSpan="7" className="text-center py-10">
                      <div className="flex flex-col items-center gap-2 text-muted">
                        <span className="text-2xl">👤</span>
                        <span className="text-sm">No users found{selectedCampusObj ? ` for "${selectedCampusObj.name}"` : ''}.</span>
                        {selectedCampusIsInactive && (
                          <span className="text-xs text-[#F59E0B] mt-1">
                            This campus is {campusStatusLabel.toLowerCase()} — it has no assigned users.
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
                : filtered.map((u, idx) => (
                  <tr key={u.id} className={`hover:bg-surface/30 ${selectedIds.includes(u.id) ? 'bg-[var(--primary)]/5' : ''}`}>
                    <td className="px-6 py-4">
                      {isProtected(u) ? (
                        <div title="Protected admin account" className="w-4 h-4 rounded border border-[#64748B]/30 bg-background flex items-center justify-center cursor-not-allowed">
                          <span className="text-[10px] text-muted">✦</span>
                        </div>
                      ) : (
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(u.id)}
                          onChange={() => handleSelectOne(u.id)}
                          className="w-4 h-4 rounded border-border bg-background text-[var(--primary)] focus:ring-[#22D3EE] cursor-pointer"
                        />
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted text-sm font-semibold">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm" style={{ backgroundColor: `${ROLE_COLORS[u.role?.name] || '#64748B'}22`, color: ROLE_COLORS[u.role?.name] || '#64748B' }}>
                          {u.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-foreground font-semibold">{u.full_name}</div>
                          <div className="text-xs text-muted">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border" style={{ color: ROLE_COLORS[u.role?.name] || '#64748B', borderColor: `${ROLE_COLORS[u.role?.name] || '#64748B'}40`, backgroundColor: `${ROLE_COLORS[u.role?.name] || '#64748B'}10` }}>
                         {ROLE_DISPLAY[u.role?.name] || u.role?.name?.replace(/_/g, ' ') || 'No Role'}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted">
                       {u.department && <div>{u.department}</div>}
                       {getUserCampusName(u) && <div className="text-muted text-xs">{getUserCampusName(u)}</div>}
                       {!u.department && !getUserCampusName(u) && <span className="text-muted">—</span>}
                     </td>
                    <td className="px-6 py-4">
                      <button onClick={() => toggleActive(u)} className={`flex items-center gap-1.5 text-xs font-bold uppercase px-2.5 py-1 rounded-full transition-all ${u.is_active ? 'text-[#10B981] bg-[#10B981]/10 hover:bg-[#10B981]/20' : 'text-[#EF4444] bg-[#EF4444]/10 hover:bg-[#EF4444]/20'}`}>
                        {u.is_active ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {u.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => { setEditing(u); setIsModalOpen(true); }} className="text-muted hover:text-[var(--primary)] mx-2"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(u.id)} className="text-muted hover:text-[#EF4444]"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>

      {isModalOpen && <UserFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchUsers} initialData={editing} />}
      
      {confirmBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background border border-[#EF4444]/30 rounded-3xl w-full max-w-md shadow-2xl p-6">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2 mb-2">
              <AlertTriangle className="w-6 h-6 text-[#EF4444]" /> Confirm Bulk Deletion
            </h3>
            <p className="text-muted mb-6">
              You are about to permanently delete <strong>{selectedIds.length}</strong> users. 
              {selectedCampusObj && <span> This action is currently scoped to <strong>{selectedCampusObj.name}</strong>.</span>}
              <br/><br/>
              Protected roles (Tenant Admins, IT Admins, Super Admins) are automatically excluded and cannot be deleted here.
              This action cannot be undone. Are you sure?
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmBulkDelete(false)} 
                disabled={deletingBulk}
                className="px-5 py-2.5 text-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkDelete} 
                disabled={deletingBulk}
                className="bg-[#EF4444] text-foreground px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingBulk ? 'Deleting...' : 'Delete Users'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
