import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zencampuz.settings')
import django
try:
    django.setup()
except Exception as e:
    import traceback
    traceback.print_exc()
