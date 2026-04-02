import { useAuth } from '../auth/AuthContext';

/**
 * Custom hook to easily access RBAC permissions throughout the app.
 * Usage:
 *   const { can, permissions } = usePermissions();
 *   if (can('timetable', 'create')) { ... }
 */
export const usePermissions = () => {
  const { can, permissions, user } = useAuth();
  
  return {
    can,
    permissions,
    isSuperAdmin: user?.role?.name === 'super_admin',
    isTenantAdmin: user?.role?.name === 'tenant_admin',
    isCampusAdmin: user?.role?.name === 'it_admin',
    isHOD: Boolean(user?.role?.name === 'hod' || user?.role === 'hod' || (user?.is_hod && user?.role?.name !== 'faculty' && user?.role !== 'faculty')),
  };
};
