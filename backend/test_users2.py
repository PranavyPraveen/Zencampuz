import os, django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zencampuz.settings')
django.setup()

from accounts.models import CustomUser
from academics.models import Department

def _normalize_department_name(value):
    if not value:
        return ''
    base = value.split('(')[0].strip().lower().replace('&', 'and')
    return ' '.join(base.split())

def _resolve_department_for_user(user, departments_by_campus, all_departments):
    try:
        profile = getattr(user, 'faculty_profile', None)
        if profile and profile.department_id:
            return profile.department
    except Exception:
        pass

    normalized_user_department = _normalize_department_name(user.department)
    if not normalized_user_department:
        return None

    if user.campus_id:
        campus_departments = departments_by_campus.get(str(user.campus_id), [])
        for department in campus_departments:
            if _normalize_department_name(department.name) == normalized_user_department:
                return department

    matches = []
    for department in all_departments:
        if _normalize_department_name(department.name) == normalized_user_department:
            matches.append(department)

    if matches:
        return matches[0]

    return None

all_departments = list(Department.objects.all().select_related('campus'))
departments_by_campus = {}
for d in all_departments:
    key = str(d.campus_id) if d.campus_id else None
    departments_by_campus.setdefault(key, []).append(d)

users = CustomUser.objects.filter(role__name='faculty', campus__name__icontains='Main')[:10]
with open('out6.txt', 'w', encoding='utf-8') as f:
    for u in users:
        d = _resolve_department_for_user(u, departments_by_campus, all_departments)
        f.write(f'{u.full_name} | {u.campus.name if u.campus else None} | user.dept={u.department} | resolved={d.name if d else None}\n')
