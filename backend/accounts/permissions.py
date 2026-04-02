from rest_framework import permissions


class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        user_role = getattr(request.user, 'role', None)
        return bool(request.user and request.user.is_authenticated and user_role and getattr(user_role, 'name', '') == 'super_admin')

class IsTenantAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        user_role = getattr(request.user, 'role', None)
        return bool(request.user and request.user.is_authenticated and user_role and getattr(user_role, 'name', '') in ['super_admin', 'tenant_admin'])

class IsCampusAdmin(permissions.BasePermission):
    """
    Allows access only to campus-scoped IT admins
    (role = it_admin AND campus FK is set).
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        user_role = getattr(request.user, 'role', None)
        if not user_role:
            return False
        return user_role.name == 'it_admin' and bool(request.user.campus_id)

class IsTenantOrCampusAdmin(permissions.BasePermission):
    """
    Allows access to:
    - super_admin (platform-wide)
    - tenant_admin (tenant-wide)
    - it_admin with a campus FK assigned (campus-scoped)
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        user_role = getattr(request.user, 'role', None)
        if not user_role:
            return False
        name = user_role.name
        if name in ['super_admin', 'tenant_admin']:
            return True
        # Campus IT admin
        if name == 'it_admin' and request.user.campus_id:
            return True
        return False

class HasRole(permissions.BasePermission):
    def __init__(self, allowed_roles):
        self.allowed_roles = allowed_roles

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # Super admin can do everything
        user_role = getattr(request.user, 'role', None)
        if not user_role:
            return False
            
        if user_role.name == 'super_admin':
            return True
            
        return user_role.name in self.allowed_roles

    def __call__(self):
        return self

class TenantAwarePermission(permissions.BasePermission):
    """
    Ensures users can only access data belonging to their own tenant,
    unless they are a super_admin.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
            
        user_role = getattr(request.user, 'role', None)
        if user_role and user_role.name == 'super_admin':
            return True
            
        # Check if the object has a tenant_id or tenant attribute
        user_tenant_id = getattr(request.user, 'tenant_id', None)
        user_tenant = getattr(request.user, 'tenant', None)
        
        if hasattr(obj, 'tenant_id'):
            return obj.tenant_id == user_tenant_id
        elif hasattr(obj, 'tenant'):
            return obj.tenant == user_tenant
            
        return False
