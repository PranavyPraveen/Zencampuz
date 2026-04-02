import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zencampuz.settings')
django.setup()

import requests, json

email = 'delvin.t@mach10global.com'
password = 'Test@1234'

login_resp = requests.post('http://localhost:8000/api/auth/login/', json={
    'email': email,
    'password': password
})

if login_resp.status_code == 200:
    token = login_resp.json().get('access')
    
    profile_resp = requests.get('http://localhost:8000/api/auth/profile/', headers={
        'Authorization': f'Bearer {token}',
    })
    data = profile_resp.json()
    print(f"Profile status: {profile_resp.status_code}")
    print(json.dumps(data, indent=2, default=str))
