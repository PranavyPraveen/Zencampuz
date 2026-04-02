import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getSubdomain } from '../utils/tenantHelper';

export const ProtectedRoute = ({ children }) => {
  const { user, loading, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen bg-background text-[var(--primary)] flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Cross-tenant protection: only enforce after user object is fully loaded with tenant data
  const currentSubdomain = getSubdomain();
  const userTenantSubdomain = user.tenant?.subdomain;
  const isSuperAdmin = user.role?.name === 'super_admin';
  
  // Only fire mismatch if we have both sides of the comparison AND it's a real mismatch
  if (
    currentSubdomain &&
    userTenantSubdomain &&              // wait until tenant is in the profile object
    userTenantSubdomain !== currentSubdomain &&
    !isSuperAdmin
  ) {
    console.warn(`Tenant mismatch! User belongs to ${userTenantSubdomain}, but host is ${currentSubdomain}.`);
    logout();
    return <Navigate to="/login" replace />;
  }

  return children;
};

export const RoleBasedRoute = ({ children, allowedRoles = [], allowHod = false, requireHod = false }) => {
  const { user } = useAuth();
  const roleName = user?.role?.name || user?.role; // Handle both object and string formats
  const isHOD = Boolean(roleName === 'hod' || user?.is_hod);

  if (!user) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requireHod && !isHOD) {
    console.warn('Access Denied! HOD access required.');
    return <Navigate to="/unauthorized" replace />;
  }

  if (requireHod && isHOD) {
    return children;
  }

  if (allowHod && isHOD) {
    return children;
  }

  if (roleName && !allowedRoles.includes(roleName)) {
    console.warn(`Access Denied! Role "${roleName}" not in allowed list:`, allowedRoles);
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export const PermissionBasedRoute = ({ children, moduleName, action, fallbackRoles = [] }) => {
  const { user, can } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Super/Tenant admin or explicit permission match
  if (['super_admin', 'tenant_admin'].includes(user.role?.name) || can(moduleName, action)) {
    return children;
  }

  // Fallback for roles that might conceptually have access if permissions aren't seeded fully yet
  if (user.role && fallbackRoles.includes(user.role.name)) {
    return children;
  }

  return <Navigate to="/unauthorized" replace />;
};
