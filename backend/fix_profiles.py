import os, django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zencampuz.settings')
django.setup()

from accounts.models import CustomUser
from academics.models import Department, FacultyProfile

def _normalize_department_name(value):
    if not value:
        return ''
    base = value.split('(')[0].strip().lower().replace('&', 'and')
    return ' '.join(base.split())

all_departments = list(Department.objects.all().select_related('campus'))
departments_by_campus = {}
for d in all_departments:
    key = str(d.campus_id) if d.campus_id else None
    departments_by_campus.setdefault(key, []).append(d)

fixed = 0
for profile in FacultyProfile.objects.select_related('user'):
    user = profile.user
    normalized_user_department = _normalize_department_name(user.department)
    if not normalized_user_department:
        continue
        
    correct_department = None
    if user.campus_id:
        campus_departments = departments_by_campus.get(str(user.campus_id), [])
        for d in campus_departments:
            if _normalize_department_name(d.name) == normalized_user_department:
                correct_department = d
                break
                
    if not correct_department:
        matches = []
        for d in all_departments:
            if _normalize_department_name(d.name) == normalized_user_department:
                matches.append(d)
        if matches:
            correct_department = matches[0]
            
    if correct_department and profile.department_id != correct_department.id:
        print(f"Fixing {user.full_name}: {profile.department.name} -> {correct_department.name}")
        profile.department = correct_department
        profile.save(update_fields=['department'])
        fixed += 1

print(f"Fixed {fixed} profiles.")
