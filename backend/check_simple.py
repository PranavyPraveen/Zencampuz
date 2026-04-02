import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zencampuz.settings')
django.setup()
from academics.models import Department
from campus.models import Campus
from accounts.models import CustomUser

print(f"Total Campuses: {Campus.objects.count()}")
for c in Campus.objects.all():
    print(f"Campus: '{c.name}'")

print(f"\nTotal Departments: {Department.objects.count()}")
for d in Department.objects.all():
    cname = d.campus.name if d.campus else "None"
    print(f"Dept: '{d.name}', Campus: '{cname}'")

print(f"\nTotal Users: {CustomUser.objects.count()}")
for u in CustomUser.objects.all():
    cname = u.campus.name if u.campus else "None"
    print(f"User: '{u.full_name}', Email: '{u.email}', Dept: '{u.department}', Campus: '{cname}'")
