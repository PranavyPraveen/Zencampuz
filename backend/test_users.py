import os, sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zencampuz.settings')
django.setup()

from accounts.models import CustomUser

users = CustomUser.objects.filter(role__name='faculty')[:10]
for u in users:
    print(f'{u.full_name} | Campus: {u.campus_id} | Dept: {u.department}')
