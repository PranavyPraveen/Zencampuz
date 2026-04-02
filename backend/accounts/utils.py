def get_user_scope(user):
    """
    Returns a dict describing the scope of the user.
    {'type': 'super'} – super admin, unrestricted
    {'type': 'tenant'} – tenant-wide admin
    {'type': 'campus', 'campus': <Campus>} – campus-scoped IT admin
    """
    if not user or not user.is_authenticated:
        return {'type': 'none'}
    role_name = getattr(getattr(user, 'role', None), 'name', '')
    if role_name == 'super_admin':
        return {'type': 'super'}
    if role_name == 'it_admin' and user.campus_id:
        return {'type': 'campus', 'campus': user.campus}
    return {'type': 'tenant'}


def resolve_assigned_campus(user):
    """Returns the Campus object for a campus IT admin, or None for tenant-wide users."""
    scope = get_user_scope(user)
    return scope.get('campus') if scope['type'] == 'campus' else None


def apply_campus_scope(queryset, user, campus_field='campus'):
    """
    Filters queryset to campus if user is a campus-scoped IT admin.
    campus_field: the field name on the model that FK's to Campus (default: 'campus').
    """
    campus = resolve_assigned_campus(user)
    if campus is not None:
        return queryset.filter(**{campus_field: campus})
    return queryset


class TenantAwareHelper:
    @staticmethod
    def get_tenant_from_request(request):
        """
        Retrieves the tenant from the user object if authenticated.
        """
        if request.user and request.user.is_authenticated and request.user.tenant:
            return request.user.tenant
        return None

    @staticmethod
    def get_tenant_from_host(request):
        """
        Retrieves the tenant based on the request's subdomain.
        Returns None if it's the root domain or tenant is not found.
        """
        from tenants.models import Tenant
        
        host = request.get_host().split(':')[0].lower()
        
        root_domains = ['localhost', 'campuzcore.com', 'www.campuzcore.com', '127.0.0.1']
        if host in root_domains:
            return None
            
        parts = host.split('.')
        if len(parts) >= 2:
            subdomain = parts[0]
            try:
                return Tenant.objects.get(subdomain=subdomain, is_active=True)
            except Tenant.DoesNotExist:
                return None
        return None

    @staticmethod
    def filter_by_tenant(queryset, request):
        """
        Filters a queryset to only include items belonging to the user's tenant.
        Super admins bypass this filter.
        """
        if not request.user or not request.user.is_authenticated:
            return queryset.none()
            
        if request.user.role and request.user.role.name == 'super_admin':
            return queryset
            
        if not request.user.tenant:
            return queryset.none()
            
        return queryset.filter(tenant=request.user.tenant)
