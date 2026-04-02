import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zencampuz.settings')
django.setup()

from academics.models import Department
from campus.models import Campus
from accounts.models import CustomUser

print("--- Campuses ---")
for c in Campus.objects.all():
    print(f"ID: {c.id}, Name: {c.name}, Status: {c.status}")

print("\n--- Departments ---")
for d in Department.objects.all():
    campus_name = d.campus.name if d.campus else "None"
    print(f"Name: {d.name}, Campus: {campus_name}")

print("\n--- Users (first 10) ---")
for u in CustomUser.objects.all()[:10]:
    campus_name = u.campus.name if u.campus else "None"
    print(f"Name: {u.full_name}, Email: {u.email}, Dept: {u.department}, Campus: {campus_name}")

print("\n--- Users with .north in email ---")
for u in CustomUser.objects.filter(email__icontains='.north'):
    campus_name = u.campus.name if u.campus else "None"
    print(f"Name: {u.full_name}, Email: {u.email}, Dept: {u.department}, Campus: {campus_name}")
