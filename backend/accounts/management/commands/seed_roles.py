from django.core.management.base import BaseCommand
from accounts.models import Role

# Standard role seeding command for ZenCampuz

class Command(BaseCommand):
    help = 'Seeds the database with initial standard roles'

    def handle(self, *args, **kwargs):
        roles = [
            (Role.RoleChoices.SUPER_ADMIN, 'Super Admin', 'Platform Administrator'),
            (Role.RoleChoices.TENANT_ADMIN, 'Tenant Admin', 'Institution Administrator'),
            (Role.RoleChoices.ACADEMIC_ADMIN, 'Academic Admin', 'Academic Administrator'),
            (Role.RoleChoices.FACILITY_MANAGER, 'Facility Manager', 'Facility/Resource Manager'),
            (Role.RoleChoices.IT_ADMIN, 'IT Admin', 'IT Administrator'),
            (Role.RoleChoices.HOD, 'Head of Department', 'Head of Department'),
            (Role.RoleChoices.FACULTY, 'Faculty', 'Teaching Staff'),
            (Role.RoleChoices.STUDENT, 'Student', 'Enrolled Student'),
            (Role.RoleChoices.RESEARCH_SCHOLAR, 'Research Scholar', 'Research Scholar'),
            (Role.RoleChoices.EXTERNAL_USER, 'External User', 'Guest/External User'),
        ]

        count = 0
        for code, name, desc in roles:
            role, created = Role.objects.get_or_create(
                name=code,
                defaults={'description': desc}
            )
            if created:
                count += 1
                self.stdout.write(self.style.SUCCESS(f'Created role: {name}'))
            else:
                self.stdout.write(f'Role already exists: {name}')

        self.stdout.write(self.style.SUCCESS(f'Successfully seeded {count} new roles!'))
