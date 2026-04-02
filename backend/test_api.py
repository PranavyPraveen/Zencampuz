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
    
    rooms_resp = requests.get('http://localhost:8000/api/campus/rooms/', headers={
        'Authorization': f'Bearer {token}',
    })
    data = rooms_resp.json()
    # Print full structure 
    print(json.dumps(data, indent=2, default=str))
