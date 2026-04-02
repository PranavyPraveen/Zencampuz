import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zencampuz.settings')
django.setup()
from academics.models import Department
from accounts.models import CustomUser

print("--- Departments ---")
for d in Department.objects.all():
    hod_email = d.head_of_department.email if d.head_of_department else "None"
    print(f"ID: {d.id}, Name: {d.name}, HOD: {hod_email}, Campus: {d.campus_id}")

print("\n--- Users (HODs) ---")
for u in CustomUser.objects.filter(email='hod.cse.main@fefka.com'):
    print(f"User: {u.email}, ID: {u.id}, DeptID on User: {getattr(u, 'department_id', 'N/A')}")
