import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zencampuz.settings')
django.setup()
from academics.models import Department
from accounts.models import CustomUser

u = CustomUser.objects.filter(email='hod.cse.main@fefka.com').first()
if u:
    # Target Dept: Computer Science & Engineering (Main Campus)
    target_id = 'd113bde2-dd9a-41a6-af2c-05c838604786'
    dept = Department.objects.filter(id=target_id).first()
    if dept:
        dept.head_of_department = u
        dept.save()
        print(f"Fixed: {u.email} is now HOD of {dept.name}")
        
        # De-duplicate other CSE depts in Main Campus to avoid confusion
        others = Department.objects.filter(name__icontains='Computer Science', campus=dept.campus).exclude(id=target_id)
        for o in others:
            if o.name == "Computer Science and Engineering":
                o.name = "Computer Science and Engineering (Duplicate)"
                o.save()
                print(f"Renamed dupe: {o.id} -> {o.name}")
    else:
        print("Target department not found")
else:
    print("User not found")
