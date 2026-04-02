import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zencampuz.settings')
django.setup()
from academics.models import Department
from accounts.models import CustomUser
u = CustomUser.objects.filter(email='hod.cse.main@fefka.com').first()
if u:
    d = Department.objects.filter(head_of_department=u).first()
    if d:
        print(f"User: {u.email}, CampusID: {u.campus_id}, Dept: {d.name}, DeptCampusID: {d.campus_id}")
    else:
        print(f"User: {u.email}, CampusID: {u.campus_id}, Dept: None")
else:
    print("User not found")
