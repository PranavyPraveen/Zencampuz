import requests
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zencampuz.settings')
django.setup()

from accounts.models import CustomUser
from rest_framework_simplejwt.tokens import RefreshToken

# Get tenant admin user
u = CustomUser.objects.filter(role__name='tenant_admin').first()
if not u:
    print("NO TENANT ADMIN")
    exit(1)

# Generate token directly
refresh = RefreshToken.for_user(u)
t = str(refresh.access_token)

print(f"USING USER: {u.email} on tenant {u.tenant.subdomain}")

# Get Campuses
c_res = requests.get(
    'http://127.0.0.1:8000/api/campus/campuses/', 
    headers={'Authorization': 'Bearer '+str(t), 'Host': f'{u.tenant.subdomain}.localhost:8000'}
)
print("CAMPUSES:", c_res.status_code, c_res.text)
c = c_res.json()

camp = c['results'][0] if 'results' in c and c['results'] else (c[0] if len(c) > 0 else None)

if not camp:
    print("NO CAMPUS FOUND")
    exit(1)

print("UPDATING CAMPUS:", camp['name'])

res = requests.put(
    'http://127.0.0.1:8000/api/campus/campuses/'+str(camp['id'])+'/', 
    headers={'Authorization': 'Bearer '+str(t), 'Host': f'{u.tenant.subdomain}.localhost:8000'}, 
    json={
        'name': camp['name'], 
        'status': 'active', 
        'address': camp.get('address', ''), 
        'contact_email': camp.get('contact_email', ''), 
        'contact_phone': camp.get('contact_phone', '')
    }
)

print("UPDATE:", res.status_code)
print(res.text)
