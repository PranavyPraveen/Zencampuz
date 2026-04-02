import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zencampuz.settings')
django.setup()

from rest_framework.test import APIClient
from accounts.models import CustomUser

c = APIClient()
user = CustomUser.objects.filter(role__name='tenant_admin').first()
if not user:
    user = CustomUser.objects.first()

c.force_authenticate(user=user)

endpoints = [
    '/api/exams/plans/',
    '/api/reports/metrics/system-summary/',
    '/api/reports/metrics/room-utilization/',
    '/api/reports/metrics/faculty-workload/',
    '/api/reports/calendar/?start_date=2024-03-01&end_date=2024-03-31'
]

with open('test_out_utf8.txt', 'w', encoding='utf-8') as f:
    for url in endpoints:
        f.write(f"Testing {url}\n")
        try:
            resp = c.get(url)
            f.write(f"Status: {resp.status_code}\n")
            if resp.status_code != 200:
                f.write(resp.content.decode('utf-8') + "\n")
        except Exception as e:
            import traceback
            f.write(traceback.format_exc() + "\n")

django.db.connection.close()
