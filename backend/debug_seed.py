import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zencampuz.settings')
django.setup()

from tenants.management.commands.seed_db import Command

def run():
    try:
        cmd = Command()
        cmd.handle()
    except Exception as e:
        with open('error_log.txt', 'w') as f:
            f.write(str(e))

if __name__ == '__main__':
    run()
