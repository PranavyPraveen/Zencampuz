import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zencampuz.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

email = 'delvin.t@gksinfotech.com'
password = 'Delvin@005'

print(f"--- Checking for user {email} ---")
u = User.objects.filter(email=email).first()

if not u:
    print("User not found!")
else:
    print(f"User ID: {u.id}")
    print(f"Email: {u.email}")
    print(f"Is Active: {u.is_active}")
    print(f"Role: {u.role}")
    if hasattr(u, "tenant") and u.tenant:
        print(f"Tenant: {getattr(u.tenant, 'tenant_name', str(u.tenant))} ({getattr(u.tenant, 'subdomain', 'N/A')})")
    
    password_match = u.check_password(password)
    print(f"Password Check ({password}): {password_match}")
    
print("--- Done ---")
