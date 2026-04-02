import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zencampuz.settings')
django.setup()

from tenants.models import Tenant
from accounts.models import CustomUser, Role
from academics.models import Department, Program, Semester, Batch, Course
from campus.models import Campus, Building, Floor, Room
from resources.models import ResourceCategory, Resource
from django.db.models import Count

tenant = Tenant.objects.filter(tenant_name__icontains='fefka').first()
print(f'Tenant: {tenant.tenant_name if tenant else "NOT FOUND"}')
if not tenant:
    exit(1)

qs = CustomUser.objects.filter(tenant=tenant, is_active=True)
print(f'Total Users: {qs.count()}')
for row in qs.values('role__name').annotate(c=Count('id')):
    print(f'  {row["role__name"]}: {row["c"]}')

print(f'Departments: {Department.objects.filter(tenant=tenant).count()}')
print(f'Programs: {Program.objects.filter(tenant=tenant).count()}')
print(f'Semesters: {Semester.objects.filter(tenant=tenant).count()}')
print(f'Batches: {Batch.objects.filter(tenant=tenant).count()}')
print(f'Courses: {Course.objects.filter(tenant=tenant).count()}')
print(f'Campuses: {Campus.objects.filter(tenant=tenant).count()}')
print(f'Buildings: {Building.objects.filter(tenant=tenant).count()}')
print(f'Floors: {Floor.objects.filter(tenant=tenant).count()}')
print(f'Rooms: {Room.objects.filter(tenant=tenant).count()}')
print(f'Resource Categories: {ResourceCategory.objects.filter(tenant=tenant).count()}')
print(f'Resources: {Resource.objects.filter(tenant=tenant).count()}')
print('\nVerification complete!')
