import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useBranding } from '../../utils/useBranding';
import { usePermissions } from '../../hooks/usePermissions';
import { Shield, Save, Loader2, Check, X, AlertCircle } from 'lucide-react';

export const RBACPanel = () => {
  const { isTenantAdmin, isSuperAdmin } = usePermissions();
  const theme = useBranding();
  
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editingRole, setEditingRole] = useState(null); // Which role is currently being edited

  // Store changes that haven't been saved to backend yet
  const [pendingChanges, setPendingChanges] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch the matrix data
      const [rolesRes, permsRes] = await Promise.all([
        api.get('/auth/rbac/'),
        api.get('/auth/permissions/')
      ]);
      setRoles(rolesRes.data);
      setPermissions(permsRes.data);
    } catch (err) {
      setError('Failed to load RBAC data. You may not have permission.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isTenantAdmin && !isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Shield className="w-16 h-16 text-foreground/10 mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
        <p className="text-foreground/50">Only Tenant Admins can manage role permissions.</p>
      </div>
    );
  }

  // Get unique modules and actions from the permissions list
  const modules = [...new Set(permissions.map(p => p.module_name))];
  const actionsList = ['view', 'create', 'update', 'delete'];

  // Check if a role has a permission, taking pending changes into account
  const hasPermission = (roleId, code) => {
    if (pendingChanges[roleId] && pendingChanges[roleId].grants?.includes(code)) return true;
    if (pendingChanges[roleId] && pendingChanges[roleId].revokes?.includes(code)) return false;
    
    const role = roles.find(r => r.id === roleId);
    return role?.permissions.includes(code) || false;
  };

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  const togglePermission = (roleId, code) => {
    setPendingChanges(prev => {
      const newState = { ...prev };
      
      // Deep clone the role's pending changes to preserve React immutability
      if (!newState[roleId]) {
        newState[roleId] = { grants: [], revokes: [] };
      } else {
        newState[roleId] = {
          grants: [...newState[roleId].grants],
          revokes: [...newState[roleId].revokes]
        };
      }

      const role = roles.find(r => r.id === roleId);
      const initiallyHad = role?.permissions.includes(code) || false;

      // Determine current state strictly from the prev state we just cloned
      const currentlyHas = newState[roleId].grants.includes(code) || 
                           (initiallyHad && !newState[roleId].revokes.includes(code));

      if (currentlyHas) {
        // We want to remove the permission
        if (initiallyHad) {
          if (!newState[roleId].revokes.includes(code)) {
             newState[roleId].revokes.push(code);
          }
        } else {
          newState[roleId].grants = newState[roleId].grants.filter(c => c !== code);
        }
      } else {
        // We want to add the permission
        if (initiallyHad) {
          newState[roleId].revokes = newState[roleId].revokes.filter(c => c !== code);
        } else {
          if (!newState[roleId].grants.includes(code)) {
            newState[roleId].grants.push(code);
          }
        }
      }

      // Cleanup empty states
      if (newState[roleId].grants.length === 0 && newState[roleId].revokes.length === 0) {
        delete newState[roleId];
      }

      return newState;
    });
  };

  // Toggle entirely a module's row for a role
  const toggleRow = (roleId, moduleName) => {
    const codes = permissions.filter(p => p.module_name === moduleName).map(p => p.code);
    const allEnabled = codes.every(c => hasPermission(roleId, c));
    
    codes.forEach(code => {
      if (allEnabled && hasPermission(roleId, code)) togglePermission(roleId, code);
      if (!allEnabled && !hasPermission(roleId, code)) togglePermission(roleId, code);
    });
  };

  const handleSave = async (roleIdToSave) => {
    if (!hasPendingChanges) return;

    try {
      setSaving(true);
      setError(null);
      
      const changes = pendingChanges[roleIdToSave];
      await api.put(`/auth/role-permissions/${roleIdToSave}/`, changes);

      setPendingChanges(prev => {
        const newPending = { ...prev };
        delete newPending[roleIdToSave];
        return newPending;
      });
      await fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleDoneRole = async (roleId) => {
    if (pendingChanges[roleId]) {
      await handleSave(roleId);
    }
    setEditingRole(null);
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      
      {/* ── Header ── */}
      <div className="flex flex-col justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <Shield className="w-8 h-8 opacity-80" style={{ color: theme.primary }} />
            App Permissions & RBAC
          </h1>
          <p className="text-foreground/50 mt-2 max-w-2xl text-sm leading-relaxed">
            Manage granular access control to modules and actions. 
            Select a role and toggle capabilities for 'view', 'create', 'update', or 'delete'.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-20">
          <Loader2 className="w-8 h-8 animate-spin text-foreground/20" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* We'll render one large matrix per Role to keep it clear, mapping over roles */}
          {roles.filter(r => {
            if (isSuperAdmin) return r.name === 'tenant_admin';
            return r.name !== 'super_admin'; // Tenant admin shouldn't see super admin either way
          }).map(role => {
            // Check if role has any pending changes to visually highlight the table
            const roleHasChanges = !!pendingChanges[role.id];

            return (
              <div 
                key={role.id} 
                className={`rounded-3xl border overflow-hidden transition-all duration-300 ${
                  roleHasChanges ? 'border-amber-500/50 shadow-lg shadow-amber-500/5' : 'border-border bg-foreground/5'
                }`}
                style={{ backgroundColor: 'var(--bg-surface)' }}
              >
                {/* Table Header / Role Title */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-border">
                  <div>
                    <h3 className="text-lg font-bold text-foreground capitalize flex items-center gap-2">
                      {role.name.replace(/_/g, ' ')}
                      {roleHasChanges && <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500">Unsaved Changes</span>}
                    </h3>
                    {role.name === 'tenant_admin' && !isSuperAdmin && (
                      <p className="text-xs text-amber-400/80 mt-1">
                        Locked: The Tenant Admin role has full system privileges and cannot be modified.
                      </p>
                    )}
                  </div>
                  {role.name === 'tenant_admin' && !isSuperAdmin ? (
                    <button disabled className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-foreground/5 text-foreground/30 cursor-not-allowed flex items-center gap-2">
                      <Shield className="w-4 h-4" /> Locked
                    </button>
                  ) : (
                    <button
                      onClick={() => editingRole === role.id ? handleDoneRole(role.id) : setEditingRole(role.id)}
                      disabled={saving && editingRole === role.id}
                      className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
                        editingRole === role.id 
                          ? 'bg-white/10 text-foreground hover:bg-white/20' 
                          : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                      }`}
                    >
                      {saving && editingRole === role.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {editingRole === role.id ? (saving ? 'Saving...' : 'Done') : 'Edit'}
                    </button>
                  )}
                </div>

                {/* Matrix Grid */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-[10px] font-bold text-foreground/40 uppercase tracking-widest border-b border-border w-48">Module</th>
                        {actionsList.map(action => (
                          <th key={action} className="px-4 py-3 text-[10px] font-bold text-foreground/40 uppercase tracking-widest text-center border-b border-border">
                            {action}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {modules.map(moduleName => {
                        // Find all possible permissions for this module 
                        // (some modules might not have 'update', etc., in the catalogue)
                        const modulePerms = permissions.filter(p => p.module_name === moduleName);
                        
                        return (
                          <tr key={moduleName} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-3">
                              <button
                                onClick={() => editingRole === role.id && toggleRow(role.id, moduleName)}
                                className={`text-sm font-semibold capitalize block text-left w-full transition-colors ${
                                  editingRole === role.id ? 'text-foreground/70 hover:text-foreground cursor-pointer' : 'text-foreground/50 cursor-default'
                                }`}
                              >
                                {moduleName.replace(/_/g, ' ')}
                              </button>
                            </td>
                            {actionsList.map(action => {
                              const perm = modulePerms.find(p => p.action === action);
                              if (!perm) return <td key={action} className="px-4 py-3 text-center text-foreground/10">-</td>; // Action not applicable to this module

                              const code = perm.code;
                              const isEnabled = hasPermission(role.id, code);
                              const isEditing = editingRole === role.id;
                              
                              return (
                                <td key={action} className="px-4 py-3 text-center align-middle">
                                  {isEditing ? (
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        togglePermission(role.id, code);
                                      }}
                                      className="flex items-center justify-center w-6 h-6 rounded border transition-colors outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-[#0B1026]"
                                      style={{
                                        backgroundColor: isEnabled ? theme.primary : 'transparent',
                                        borderColor: isEnabled ? theme.primary : 'rgba(255,255,255,0.2)',
                                        color: isEnabled ? 'var(--bg-main)' : 'transparent',
                                        '--tw-ring-color': theme.primary,
                                      }}
                                    >
                                      <Check className={`w-4 h-4 transition-opacity ${isEnabled ? 'opacity-100' : 'opacity-0'}`} />
                                    </button>
                                  ) : (
                                    <div className="flex justify-center items-center">
                                      {isEnabled ? <Check className="w-5 h-5 opacity-80" style={{ color: theme.primary }} /> : <X className="w-4 h-4 opacity-20 text-foreground" />}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RBACPanel;
