import urllib.request
import json

print('Starting tests...')

# 1. Login to get token
data = json.dumps({'email': 'admin2@zencampuz.com', 'password': 'adminpassword'}).encode('utf-8')
req = urllib.request.Request('http://localhost:8000/api/auth/login/', data=data, headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req) as response:
        res = json.loads(response.read().decode())
        token = res.get('access')
        print('Login OK')
except Exception as e:
    print('Login Failed:', e)
    token = None

if token:
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    # 2. Get Audit logs
    req = urllib.request.Request('http://localhost:8000/api/superadmin/audit-logs/', headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            print('Audit Logs OK, status:', response.status)
    except Exception as e:
        print('Audit Logs Failed:', e)

    # 3. Get Tenants to find an ID
    req = urllib.request.Request('http://localhost:8000/api/superadmin/tenants/', headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            tenants = json.loads(response.read().decode())
            print('Tenants List OK')
            if tenants and isinstance(tenants, list):
                t_id = tenants[0]['id']
                
                # 4. Toggle module
                mod_data = json.dumps({'has_resources': True}).encode('utf-8')
                req_mod = urllib.request.Request(f'http://localhost:8000/api/superadmin/tenants/{t_id}/toggle_modules/', data=mod_data, headers=headers)
                try:
                    with urllib.request.urlopen(req_mod) as mod_res:
                        print('Toggle Modules OK, status:', mod_res.status)
                except Exception as e:
                    print('Toggle Modules Failed:', e)

                # 5. Get Users
                req_users = urllib.request.Request(f'http://localhost:8000/api/superadmin/tenants/{t_id}/users/', headers=headers)
                try:
                    with urllib.request.urlopen(req_users) as users_res:
                        print('Tenant Users OK, status:', users_res.status)
                except Exception as e:
                    print('Tenant Users Failed:', e)
    except Exception as e:
        print('Tenants Failed:', e)
            
print('Done')
