import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zencampuz.settings')
django.setup()

from tenants.models import Tenant
for t in Tenant.objects.all():
    print(f"Name: {t.tenant_name}, Subdomain: {t.subdomain}")
