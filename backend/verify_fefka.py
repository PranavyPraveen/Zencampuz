import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zencampuz.settings')
django.setup()

from tenants.models import Tenant
from campus.models import Room
from accounts.models import CustomUser

tenant = Tenant.objects.filter(subdomain='fefka').first()
if tenant:
    print(f"Tenant: {tenant.tenant_name}")
    print(f"Rooms count: {Room.objects.filter(tenant=tenant).count()}")
    print(f"Users count: {CustomUser.objects.filter(tenant=tenant).count()}")
    for r in Room.objects.filter(tenant=tenant):
        print(f" - Room: {r.room_number}, Building: {r.building.code}")
else:
    print("Tenant fefka not found")
