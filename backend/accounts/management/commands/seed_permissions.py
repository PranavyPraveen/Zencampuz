from django.core.management.base import BaseCommand
from accounts.models import Permission, Role, RolePermission


# ── Default permissions per role (platform level) ────────────────────────────
# Format: { role_name: { module: [actions] } }
DEFAULT_ROLE_PERMISSIONS = {
    'tenant_admin': {
        'dashboard':    ['view'],
        'users':        ['view', 'create', 'update', 'delete'],
        'campus':       ['view', 'create', 'update', 'delete'],
        'academics':    ['view', 'create', 'update', 'delete'],
        'timetable':    ['view', 'create', 'update', 'delete'],
        'exams':        ['view', 'create', 'update', 'delete'],
        'resources':    ['view', 'create', 'update', 'delete'],
        'bookings':     ['view', 'create', 'update', 'delete'],
        'reports':      ['view', 'create', 'update', 'delete'],
        'notifications':['view', 'create', 'update', 'delete'],
        'settings':     ['view', 'update'],
    },
    'academic_admin': {
        'dashboard':  ['view'],
        'academics':  ['view', 'create', 'update'],
        'timetable':  ['view', 'create', 'update'],
        'exams':      ['view', 'create', 'update'],
        'reports':    ['view'],
        'campus':     ['view'],
        'bookings':   ['view', 'create'],
        'notifications': ['view'],
    },
    'facility_manager': {
        'dashboard':  ['view'],
        'campus':     ['view', 'create', 'update'],
        'resources':  ['view', 'create', 'update'],
        'bookings':   ['view', 'create', 'update', 'delete'],
        'reports':    ['view'],
        'notifications': ['view'],
    },
    'it_admin': {
        'dashboard':  ['view'],
        'users':      ['view', 'update'],
        'campus':     ['view'],
        'resources':  ['view', 'create', 'update', 'delete'],
        'notifications': ['view'],
        'settings':   ['view', 'update'],
    },
    'faculty': {
        'dashboard':  ['view'],
        'academics':  ['view'],
        'timetable':  ['view'],
        'exams':      ['view'],
        'bookings':   ['view', 'create'],
        'reports':    ['view'],
        'notifications': ['view'],
    },
    'student': {
        'dashboard':  ['view'],
        'academics':  ['view'],
        'timetable':  ['view'],
        'exams':      ['view'],
        'bookings':   ['view', 'create'],
        'notifications': ['view'],
    },
    'research_scholar': {
        'dashboard':  ['view'],
        'academics':  ['view'],
        'timetable':  ['view'],
        'bookings':   ['view', 'create'],
        'resources':  ['view'],
        'reports':    ['view'],
        'notifications': ['view'],
    },
    'external_user': {
        'dashboard':  ['view'],
        'bookings':   ['view', 'create'],
        'notifications': ['view'],
    },
}

ALL_MODULES = [
    ('dashboard',     'Dashboard'),
    ('users',         'User Management'),
    ('campus',        'Campus Management'),
    ('academics',     'Academics'),
    ('timetable',     'Timetabling'),
    ('exams',         'Exam Management'),
    ('resources',     'Asset & Resource Management'),
    ('bookings',      'Facility Bookings'),
    ('reports',       'Analytics & Reports'),
    ('notifications', 'Notifications'),
    ('settings',      'Settings'),
]

ALL_ACTIONS = ['view', 'create', 'update', 'delete']


class Command(BaseCommand):
    help = 'Seed all module×action permissions and set platform-level defaults per role.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING('🔐 Seeding permissions catalogue...'))

        # 1. Create all permission combinations
        created_perm = 0
        for module_name, module_label in ALL_MODULES:
            for action in ALL_ACTIONS:
                _, created = Permission.objects.get_or_create(
                    module_name=module_name,
                    action=action,
                    defaults={'description': f'Can {action} {module_label}'}
                )
                if created:
                    created_perm += 1

        total_permissions = Permission.objects.count()
        self.stdout.write(self.style.SUCCESS(
            f'  ✓ {created_perm} new permissions created ({total_permissions} total)'
        ))

        # 2. Seed platform-level role permissions (tenant=None)
        created_rp = 0
        for role_name, module_actions in DEFAULT_ROLE_PERMISSIONS.items():
            role, _ = Role.objects.get_or_create(name=role_name)

            for module, actions in module_actions.items():
                for action in actions:
                    try:
                        perm = Permission.objects.get(module_name=module, action=action)
                        _, created = RolePermission.objects.get_or_create(
                            role=role,
                            permission=perm,
                            tenant=None,
                            defaults={'granted': True}
                        )
                        if created:
                            created_rp += 1
                    except Permission.DoesNotExist:
                        self.stdout.write(self.style.WARNING(
                            f'  ⚠ Permission not found: {module}.{action}'
                        ))

        self.stdout.write(self.style.SUCCESS(
            f'  ✓ {created_rp} new role-permissions seeded'
        ))
        self.stdout.write(self.style.SUCCESS(
            '  🎉 RBAC seeding complete! Run "python manage.py seed_permissions" anytime to top-up.'
        ))
