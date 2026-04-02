"""
Add more specialized faculty for Fefka tenant so each subject has
its own dedicated lecturer, eliminating consecutive-hour overloading.

Run: python manage.py seed_more_faculty --tenant fefka
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Add more faculty + assign each to specific courses for balanced timetable'

    def add_arguments(self, parser):
        parser.add_argument('--tenant', type=str, required=True)

    def handle(self, *args, **options):
        from tenants.models import Tenant
        from accounts.models import CustomUser, Role
        from academics.models import (
            Department, FacultyProfile, CourseSection, Course,
            Semester, Section, FacultyPreference, FacultyAvailability
        )

        slug = options['tenant']
        try:
            tenant = Tenant.objects.get(subdomain=slug)
        except Tenant.DoesNotExist:
            self.stderr.write(f'Tenant "{slug}" not found.')
            return

        self.stdout.write(f'Adding faculty for: {tenant.tenant_name}')

        cse_dept = Department.objects.filter(tenant=tenant, code='CSE').first()
        if not cse_dept:
            self.stderr.write('CSE dept not found. Run seed_timetable_data first.')
            return

        faculty_role, _ = Role.objects.get_or_create(name='faculty')
        DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']

        # Each entry: (full_name, email, designation, specialization)
        new_faculty = [
            ('Dr. Kavitha Anand',   'kavitha.anand',   'assistant_professor', 'Data Structures & Algorithms'),
            ('Dr. Suresh Babu',     'suresh.babu',     'associate_professor', 'Operating Systems, DBMS'),
            ('Dr. Meena Iyer',      'meena.iyer',      'assistant_professor', 'Computer Networks, Security'),
            ('Prof. Rajan Pillai',  'rajan.pillai',    'professor',           'Software Engineering, Design'),
            ('Dr. Anil Varma',      'anil.varma',      'assistant_professor', 'Mathematics, Statistics'),
            ('Dr. Smitha Roy',      'smitha.roy',      'assistant_professor', 'Physics, Lab courses'),
            ('Prof. Harish Nair',   'harish.nair',     'associate_professor', 'Machine Learning, AI'),
            ('Dr. Leena Krishnan',  'leena.krishnan',  'assistant_professor', 'Data Structures'),
            ('Dr. Madhu Pillai',    'madhu.pillai',    'assistant_professor', 'Database Systems, SQL'),
            ('Prof. Ganesh Kumar',  'ganesh.kumar',    'professor',           'Operating Systems, Linux'),
        ]

        created_fps = []
        idx = 1000
        for full_name, email_prefix, designation, spec in new_faculty:
            email = f'{email_prefix}@{tenant.subdomain}.edu'
            user, created = CustomUser.objects.get_or_create(
                email=email, tenant=tenant,
                defaults={
                    'full_name': full_name,
                    'role': faculty_role,
                    'is_active': True,
                }
            )
            if created:
                user.set_password('Faculty@123')
                user.save()

            emp_id = f'FAC{idx}'
            idx += 1
            fp, _ = FacultyProfile.objects.get_or_create(
                tenant=tenant, user=user,
                defaults={
                    'department': cse_dept,
                    'employee_id': emp_id,
                    'designation': designation,
                    'specialization': spec,
                    'max_weekly_hours': 16,
                }
            )
            created_fps.append(fp)

            # Availability Mon-Sat 9am-5pm
            for day in DAYS:
                FacultyAvailability.objects.get_or_create(
                    faculty=fp, day=day, start_time='09:00:00',
                    defaults={'tenant': tenant, 'end_time': '17:00:00', 'is_available': True}
                )
            # Preferences
            FacultyPreference.objects.get_or_create(
                tenant=tenant, faculty=fp,
                defaults={
                    'preferred_days': ['mon', 'tue', 'wed', 'thu', 'fri'],
                    'avoid_early_morning': False,
                    'max_courses_per_semester': 3,
                }
            )
            self.stdout.write(f'  [OK] {full_name} ({designation})')

        self.stdout.write(f'\nTotal new faculty added: {len(new_faculty)}')

        # Now reassign CourseSection records so each course has a DIFFERENT faculty
        sem = Semester.objects.filter(tenant=tenant, name='Semester 1').first()
        if not sem:
            self.stdout.write('[SKIP] Semester not found.')
            return

        # Build a course-to-faculty map based on subject clusters
        course_map = {
            'CS201': 'kavitha.anand',    # Data Structures
            'CS301': 'ganesh.kumar',     # Operating Systems
            'CS302': 'madhu.pillai',     # Database Management
            'CS401': 'meena.iyer',       # Computer Networks
            'CS402': 'rajan.pillai',     # Software Engineering
            'MA301': 'anil.varma',       # Mathematics
            'PH201L': 'smitha.roy',      # Physics Lab
        }
        # Suffix with domain
        course_map = {k: f'{v}@{tenant.subdomain}.edu' for k, v in course_map.items()}

        reassigned = 0
        for cs in CourseSection.objects.filter(tenant=tenant, semester=sem):
            course_code = cs.course.code
            email = course_map.get(course_code)
            if email:
                try:
                    user = CustomUser.objects.get(email=email, tenant=tenant)
                    fp = FacultyProfile.objects.get(tenant=tenant, user=user)
                    cs.faculty = fp
                    cs.save()
                    reassigned += 1
                except (CustomUser.DoesNotExist, FacultyProfile.DoesNotExist):
                    pass

        self.stdout.write(f'  [OK] Reassigned {reassigned} course sections to specific faculty')

        self.stdout.write(self.style.SUCCESS(
            '\n\nFaculty seed complete!\n'
            'Each course now has a DEDICATED faculty member.\n'
            'Please clear existing sessions and run Auto-Schedule again!'
        ))
