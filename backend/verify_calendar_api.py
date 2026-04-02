import os
import django
import sys
import uuid

# Setup Django environment
sys.path.append(r'd:\ZenCampuz\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'campuzcore.settings')
django.setup()

from timetable.models import ClassSession
from django.test import RequestFactory
from timetable.views import TimetablePlanViewSet
from accounts.models import CustomUser

def test_calendar_sessions_robustness():
    view = TimetablePlanViewSet.as_view({'get': 'calendar_sessions'})
    factory = RequestFactory()
    
    # Simulate a user (needed for get_tenant)
    user = CustomUser.objects.filter(is_active=True).first()
    if not user:
        print("No user found to test.")
        return

    # Test Case 1: Empty parameters (should not crash)
    print("Testing with empty parameters...")
    request = factory.get('/timetable/plans/calendar-sessions/', {})
    request.user = user
    response = view(request)
    print(f"Status: {response.status_code}")
    assert response.status_code == 200

    # Test Case 2: Invalid UUIDs (should not crash)
    print("Testing with invalid UUIDs...")
    request = factory.get('/timetable/plans/calendar-sessions/', {
        'faculty_id': 'all',
        'campus_id': 'undefined',
        'department_id': '',
        'plan_id': 'null'
    })
    request.user = user
    response = view(request)
    print(f"Status: {response.status_code}")
    assert response.status_code == 200
    print("Verification Successful: API is robust against invalid parameters.")

if __name__ == "__main__":
    try:
        test_calendar_sessions_robustness()
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)
