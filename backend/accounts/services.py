from django.contrib.auth import get_user_model
from tenants.models import Tenant
from accounts.models import Role

User = get_user_model()

def provision_tenant_admin(tenant, admin_data):
    """
    Creates the first admin user for a newly created tenant.
    admin_data: { 'full_name': '...', 'email': '...', 'phone': '...', 'password': '...' }
    """
    admin_role, _ = Role.objects.get_or_create(
        name=Role.RoleChoices.TENANT_ADMIN,
        defaults={'description': 'Administrator with full access to tenant data.'}
    )
    
    password = admin_data.pop('password')
    user = User.objects.create_user(
        tenant=tenant,
        role=admin_role,
        **admin_data
    )
    user.set_password(password)
    user.save()
    return user
