import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zencampuz.settings')
django.setup()

from accounts.models import CustomUser

for u in CustomUser.objects.all():
    t_name = u.tenant.tenant_name if u.tenant else "None"
    r_name = u.role.name if u.role else "None"
    print(f"User: {u.full_name}, Email: {u.email}, Tenant: {t_name}, Role: {r_name}")
