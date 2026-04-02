import { useState, useEffect } from 'react';
import { usersApi } from '../../api/users';
import api from '../../api/axios';
import { X, Save, AlertCircle, UserCheck, Check } from 'lucide-react';
import PhoneInput from '../common/PhoneInput';
import PasswordInput from '../common/PasswordInput';

const ALLOWED_ROLES = [
  { value: 'tenant_admin', label: 'Tenant Admin' },
  { value: 'academic_admin', label: 'Head of Dept' },
  { value: 'facility_manager', label: 'Facility Manager' },
  { value: 'it_admin', label: 'IT Admin' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'student', label: 'Student' },
  { value: 'research_scholar', label: 'Research Scholar' },
  { value: 'external_user', label: 'External User' },
];

const COUNTRY_CODES = [
  { code: '+1', country: 'USA/CAN' },
  { code: '+44', country: 'UK' },
  { code: '+91', country: 'India' },
  { code: '+61', country: 'Australia' },
  { code: '+971', country: 'UAE' },
];

export default function UserFormModal({ isOpen, onClose, onSuccess, initialData }) {
  const [form, setForm] = useState({
    full_name: '', email: '', country_code: '+91', phone: '', role_name: 'student',
    department: '', campus: '', password: '', is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [campuses, setCampuses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [userOverrides, setUserOverrides] = useState({ grants: [], revokes: [] });
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [pwdError, setPwdError] = useState('');
  
  const isEditing = !!initialData;

  useEffect(() => {
    // Fetch scope data for dropdowns
    api.get('/campus/campuses/').then(r => setCampuses(r.data.results || r.data)).catch(console.error);
    api.get('/academics/departments/').then(r => setDepartments(r.data.results || r.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (initialData) {
      setForm({
        full_name: initialData.full_name || '',
        email: initialData.email || '',
        country_code: initialData.country_code || '+1',
        phone: initialData.phone || '',
        role_name: initialData.role?.name || 'student',
        department: initialData.department || '',
        campus: initialData.campus || '',
        password: '',
        is_active: initialData.is_active ?? true,
      });
      // Optionally parse user_permissions_overrides if we were to load them. 
      // For simplicity here, we'll reset overrides when editing starts unless loaded from specific endpoint.
      setUserOverrides({ grants: [], revokes: [] });
    }
  }, [initialData]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validatePassword = (pwd) => {
    if (!pwd) return '';
    if (pwd.length < 8) return 'At least 8 characters required';
    if (!/[A-Z]/.test(pwd)) return 'At least 1 uppercase letter required';
    if (!/[a-z]/.test(pwd)) return 'At least 1 lowercase letter required';
    if (!/\d/.test(pwd)) return 'At least 1 number required';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) return 'At least 1 special character required';
    return '';
  };

  useEffect(() => {
    setPwdError(validatePassword(form.password));
  }, [form.password]);

  useEffect(() => {
    if (!form.role_name) return;
    setLoadingPerms(true);
    usersApi.getRoleDefaults(form.role_name)
      .then(res => setRolePermissions(res.permissions || []))
      .catch(console.error)
      .finally(() => setLoadingPerms(false));
  }, [form.role_name]);

  const handleToggleOverride = (code) => {
    const isGrantedByRole = rolePermissions.includes(code);
    setUserOverrides(prev => {
      let { grants, revokes } = prev;
      
      if (isGrantedByRole) {
        // Role grants it by default. If it's in revokes, clicking it means we un-revoke it (back to granted).
        // If it's not in revokes, clicking it means we revoke it.
        if (revokes.includes(code)) {
          revokes = revokes.filter(c => c !== code);
        } else {
          revokes = [...revokes, code];
        }
      } else {
        // Role doesn't grant it. If it's in grants, clicking it means we un-grant it.
        // If it's not in grants, clicking it means we grant it.
        if (grants.includes(code)) {
          grants = grants.filter(c => c !== code);
        } else {
          grants = [...grants, code];
        }
      }
      return { grants, revokes };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pwdError && form.password) {
      alert("Please fix password errors before saving.");
      return;
    }
    setSaving(true);
    const payload = { ...form, user_permissions_overrides: userOverrides };
    if (!payload.password) delete payload.password;
    try {
      if (isEditing) await usersApi.updateUser(initialData.id, payload);
      else await usersApi.createUser(payload);
      onSuccess(); onClose();
    } catch (err) {
      const msg = err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Save failed.';
      alert(msg);
    } finally { setSaving(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-border bg-surface flex justify-between items-center flex-shrink-0">
          <h3 className="text-xl font-bold text-foreground flex gap-2"><UserCheck className="text-[var(--primary)]" /> {isEditing ? 'Edit User' : 'Create User'}</h3>
          <button onClick={onClose} className="text-muted hover:text-foreground"><X className="w-6 h-6" /></button>
        </div>
        <form id="userForm" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">

          {/* Identity */}
          <div>
            <p className="text-xs font-bold text-[var(--primary)] uppercase tracking-widest mb-3">Identity</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-muted uppercase">Full Name</label>
                <input required value={form.full_name} onChange={e => set('full_name', e.target.value)} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted uppercase">Email Address</label>
                <input type="email" required value={form.email} onChange={e => set('email', e.target.value)} disabled={isEditing} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted">Phone</label>
                <PhoneInput 
                  value={form.phone} 
                  countryCode={form.country_code}
                  onChangePhone={(v) => set('phone', v)} 
                  onChangeCode={(v) => set('country_code', v)}
                  className="mt-1"
                />
              </div>

              {!initialData && (
                <div>
                  <label className="block text-sm font-medium text-muted">Password</label>
                  <PasswordInput 
                    value={form.password} 
                    onChange={(v) => set('password', v)} 
                    required 
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Role Assignment */}
          <div>
            <p className="text-xs font-bold text-[var(--primary)] uppercase tracking-widest mb-3">Role &amp; Access</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-muted uppercase">Assigned Role</label>
                <select value={form.role_name} onChange={e => set('role_name', e.target.value)} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]">
                  {ALLOWED_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <p className="text-muted text-xs mt-1">⚠ Only roles below Tenant Admin are shown</p>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="w-5 h-5 rounded" />
                  <div>
                    <p className="text-sm font-bold text-foreground">Account Active</p>
                    <p className="text-xs text-muted">Inactive users cannot log in</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Scope Restriction */}
          <div>
            <p className="text-xs font-bold text-[var(--primary)] uppercase tracking-widest mb-3">Scope Restriction (Optional)</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-muted uppercase">Department</label>
                <select value={form.department} onChange={e => set('department', e.target.value)} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]">
                  <option value="">-- All Departments --</option>
                  {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted uppercase">Campus</label>
                <select value={form.campus} onChange={e => set('campus', e.target.value)} className="w-full mt-1 bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]">
                  <option value="">-- All Campuses --</option>
                  {campuses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>
            
            {/* Custom Permissions Override Section */}
            <div className="mt-5 pt-5 border-t border-border">
              <div className="flex justify-between items-center mb-3">
                <p className="text-xs font-bold text-[var(--primary)] uppercase tracking-widest">Effective Permissions Preview</p>
                {loadingPerms && <span className="text-xs text-muted">Loading defaults...</span>}
              </div>
              
              <div className="bg-background border border-border rounded-xl p-4 max-h-48 overflow-y-auto">
                {form.role_name === 'tenant_admin' ? (
                  <p className="text-sm text-[#F59E0B]">Tenant Admins have full access to all modules. Overrides cannot be set.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {/* Render a mock list of all available permission structures.
                        For a truly dynamic solution we would fetch all system permissions 
                        and then compare user overrides vs role defaults. 
                        Here we're building a simpler generic layout for demonstration 
                    */}
                    {['users.view', 'users.create', 'users.update', 'users.delete', 
                      'campus.view', 'campus.edit', 'resources.view', 'resources.manage',
                      'timetable.view', 'timetable.manage'].map(code => {
                      
                      const isGrantedByDefault = rolePermissions.includes(code);
                      const isGrantedUserOverride = userOverrides.grants.includes(code);
                      const isRevokedUserOverride = userOverrides.revokes.includes(code);
                      
                      const isEffective = (isGrantedByDefault && !isRevokedUserOverride) || (!isGrantedByDefault && isGrantedUserOverride);
                      const hasOverride = isGrantedUserOverride || isRevokedUserOverride;
                      
                      return (
                        <div key={code} className="flex items-center justify-between text-sm">
                          <span className={`font-mono text-xs ${hasOverride ? 'text-[var(--primary)]' : 'text-muted'}`}>
                            {code}
                          </span>
                          <button 
                            type="button"
                            onClick={() => handleToggleOverride(code)}
                            className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                              isEffective 
                                ? 'bg-[var(--primary)]/20 border-[#22D3EE] text-[var(--primary)]' 
                                : 'bg-transparent border-border text-transparent hover:border-[#64748B]'
                            }`}
                            title={hasOverride ? "Custom Override Applied" : "Role Default"}
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-muted mt-2">Check to grant, uncheck to revoke. Cyan text indicates an override specific to this user.</p>
            </div>
            <div className="mt-3 p-3 bg-surface/30 rounded-xl border border-border">
              <p className="text-xs text-muted">Scope restrictions limit what data this user can see within the system. Leave blank for institution-wide access.</p>
            </div>
          </div>

        </form>
        <div className="p-4 border-t border-border bg-surface flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 text-muted hover:text-foreground">Cancel</button>
          <button type="submit" form="userForm" disabled={saving} className="bg-[var(--primary)] text-[#0F172A] px-6 py-2.5 rounded-xl font-bold">{saving ? 'Saving...' : isEditing ? 'Update User' : 'Create User'}</button>
        </div>
      </div>
    </div>
  );
}
