import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zencampuz.settings')
django.setup()
from academics.models import Department
from accounts.models import CustomUser

with open('list_depts_utf8.txt', 'w', encoding='utf-8') as f:
    f.write("--- Departments ---\n")
    for d in Department.objects.all():
        hod_email = d.head_of_department.email if d.head_of_department else "None"
        f.write(f"ID: {d.id}, Name: {d.name}, HOD: {hod_email}, Campus: {d.campus_id}\n")

    f.write("\n--- Users (HODs) ---\n")
    for u in CustomUser.objects.filter(email='hod.cse.main@fefka.com'):
        f.write(f"User: {u.email}, ID: {u.id}, DeptID on User: {getattr(u, 'department_id', 'N/A')}\n")
