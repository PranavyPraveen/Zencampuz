import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zencampuz.settings')
django.setup()

from accounts.models import CustomUser

# Reset Prany p's password
user = CustomUser.objects.filter(full_name__icontains='Prany').first()
if user:
    user.set_password('Test@1234')
    user.save()
    print(f"Reset password for: {user.full_name} ({user.email})")
else:
    print("User not found")
