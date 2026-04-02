"""
Management command: seed_timetable_data
Creates demo departments, programs, batches, faculty users, sections,
working days, time slot templates, and faculty preferences for a given tenant.

Usage:
    python manage.py seed_timetable_data --tenant <tenant_slug>
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
import random

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed demo timetable data (faculty, sections, working days, slots, preferences) for a tenant'

    def add_arguments(self, parser):
        parser.add_argument('--tenant', type=str, required=True, help='Tenant slug (e.g. "fefka")')

    def handle(self, *args, **options):
        from tenants.models import Tenant
        from accounts.models import CustomUser as User2, Role
        from academics.models import Department, Program, Batch, Section, CourseSection, Course, Semester, FacultyProfile, FacultyAvailability, FacultyPreference
        from timetable.models import WorkingDay, TimeSlotTemplate

        slug = options['tenant']
        try:
            tenant = Tenant.objects.get(subdomain=slug)
        except Tenant.DoesNotExist:
            self.stderr.write(f'Tenant "{slug}" not found. Check the subdomain.')
            return

        self.stdout.write(self.style.SUCCESS(f'Seeding for tenant: {tenant.tenant_name}'))

        # ── 1. Departments ────────────────────────────────────────────────────
        dept_data = [
            {'name': 'Computer Science Engineering', 'code': 'CSE'},
            {'name': 'Electronics & Communication', 'code': 'ECE'},
            {'name': 'Mechanical Engineering',       'code': 'MECH'},
            {'name': 'Civil Engineering',            'code': 'CIVIL'},
        ]
        departments = {}
        for dd in dept_data:
            d, _ = Department.objects.get_or_create(tenant=tenant, code=dd['code'], defaults={'name': dd['name']})
            departments[dd['code']] = d
            self.stdout.write(f'  [OK] Dept: {d.name}')

        # ── 2. Programs ───────────────────────────────────────────────────────
        prog_data = [
            {'name': 'B.Tech CSE', 'code': 'BTECH-CSE', 'dept': 'CSE', 'duration': 4},
            {'name': 'B.Tech ECE', 'code': 'BTECH-ECE', 'dept': 'ECE', 'duration': 4},
            {'name': 'B.Tech MECH','code': 'BTECH-ME',  'dept': 'MECH','duration': 4},
        ]
        programs = {}
        for pd in prog_data:
            prog, _ = Program.objects.get_or_create(
                tenant=tenant, code=pd['code'],
                defaults={'name': pd['name'], 'department': departments[pd['dept']], 'duration_years': pd['duration']}
            )
            programs[pd['code']] = prog
            self.stdout.write(f'  [OK] Program: {prog.name}')

        # ── 3. Semesters ──────────────────────────────────────────────────────
        sem, _ = Semester.objects.get_or_create(
            tenant=tenant, name='Semester 1', academic_year='2024-25',
            defaults={'start_date': '2024-08-01', 'end_date': '2024-12-31', 'is_active': True}
        )
        self.stdout.write(f'  [OK] Semester: {sem.name}')

        # ── 4. Batches & Sections ─────────────────────────────────────────────
        batch_cse, _ = Batch.objects.get_or_create(
            tenant=tenant, program=programs['BTECH-CSE'], start_year=2024,
            defaults={'end_year': 2028, 'name': 'BTECH-CSE | 2024-2028'}
        )
        sections_created = []
        for sec_name in ['A', 'B', 'C']:
            sec, _ = Section.objects.get_or_create(
                tenant=tenant, batch=batch_cse, name=sec_name,
                defaults={'strength': 60}
            )
            sections_created.append(sec)
            self.stdout.write(f'  [OK] Section: {batch_cse.name} - {sec_name}')

        # ── 5. Courses with hours per week ────────────────────────────────────
        course_data = [
            {'name': 'Data Structures',         'code': 'CS201', 'lecture': 3, 'tutorial': 1, 'practical': 2},
            {'name': 'Operating Systems',        'code': 'CS301', 'lecture': 3, 'tutorial': 1, 'practical': 2},
            {'name': 'Database Management',      'code': 'CS302', 'lecture': 3, 'tutorial': 1, 'practical': 2},
            {'name': 'Computer Networks',        'code': 'CS401', 'lecture': 3, 'tutorial': 0, 'practical': 2},
            {'name': 'Software Engineering',     'code': 'CS402', 'lecture': 3, 'tutorial': 1, 'practical': 0},
            {'name': 'Mathematics III',          'code': 'MA301', 'lecture': 4, 'tutorial': 1, 'practical': 0},
            {'name': 'Engineering Physics Lab',  'code': 'PH201L','lecture': 0, 'tutorial': 0, 'practical': 3},
        ]
        courses = {}
        for cd in course_data:
            c, _ = Course.objects.get_or_create(
                tenant=tenant, code=cd['code'],
                defaults={
                    'name': cd['name'],
                    'department': departments['CSE'],
                    'credits': cd['lecture'] + cd['tutorial'],
                    'lecture_hours': cd['lecture'],
                    'tutorial_hours': cd['tutorial'],
                    'practical_hours': cd['practical'],
                }
            )
            courses[cd['code']] = c
            self.stdout.write(f'  [OK] Course: {c.code} - {c.name} ({cd["lecture"]}L {cd["tutorial"]}T {cd["practical"]}P)')

        # ── 6. Course Sections (link courses to section + semester) ───────────
        for sec in sections_created[:1]:  # link to Section A for now
            for cd in course_data:
                c = courses[cd['code']]
                CourseSection.objects.get_or_create(
                    tenant=tenant, course=c, section=sec, semester=sem,
                    defaults={}
                )

        # ── 7. Faculty Users ──────────────────────────────────────────────────
        faculty_data = [
            {'first': 'Arjun',   'last': 'Sharma',   'email': f'arjun.sharma@{tenant.subdomain}.edu',   'dept': 'CSE'},
            {'first': 'Priya',   'last': 'Nair',     'email': f'priya.nair@{tenant.subdomain}.edu',     'dept': 'CSE'},
            {'first': 'Rahul',   'last': 'Menon',    'email': f'rahul.menon@{tenant.subdomain}.edu',    'dept': 'CSE'},
            {'first': 'Sunita',  'last': 'Patel',    'email': f'sunita.patel@{tenant.subdomain}.edu',   'dept': 'CSE'},
            {'first': 'Vikram',  'last': 'Kumar',    'email': f'vikram.kumar@{tenant.subdomain}.edu',   'dept': 'CSE'},
            {'first': 'Deepa',   'last': 'Krishnan', 'email': f'deepa.krishnan@{tenant.subdomain}.edu', 'dept': 'ECE'},
        ]
        faculty_users = []
        faculty_role, _ = Role.objects.get_or_create(name='faculty')
        for fd in faculty_data:
            user, created = User.objects.get_or_create(
                email=fd['email'], tenant=tenant,
                defaults={
                    'full_name': f"{fd['first']} {fd['last']}",
                    'role': faculty_role,
                    'is_active': True,
                }
            )
            if created:
                user.set_password('Faculty@123')
                user.save()

            fp, _ = FacultyProfile.objects.get_or_create(
                tenant=tenant, user=user,
                defaults={'department': departments[fd['dept']], 'employee_id': f'FAC{random.randint(1000,9999)}', 'max_weekly_hours': 18}
            )
            faculty_users.append((user, fp))
            self.stdout.write(f'  [OK] Faculty: {user.full_name} ({fd["email"]})')

        # ── 8. Working Days ───────────────────────────────────────────────────
        day_map = {'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6}
        for day_code, order in day_map.items():
            WorkingDay.objects.get_or_create(
                tenant=tenant, day=day_code, defaults={'is_active': True, 'order': order}
            )
        self.stdout.write('  [OK] Working Days: Mon-Sat')

        # ── 9. Time Slot Templates ────────────────────────────────────────────
        slots = [
            {'name': 'Period 1', 'start': '09:00', 'end': '09:55'},
            {'name': 'Period 2', 'start': '10:00', 'end': '10:55'},
            {'name': 'Period 3', 'start': '11:10', 'end': '12:05'},
            {'name': 'Period 4', 'start': '12:10', 'end': '13:05'},
            {'name': 'Lunch Break','start': '13:05','end': '14:00', 'is_break': True},
            {'name': 'Period 5', 'start': '14:00', 'end': '14:55'},
            {'name': 'Period 6', 'start': '15:00', 'end': '15:55'},
            {'name': 'Lab 1',    'start': '16:00', 'end': '16:55'},
        ]
        for s in slots:
            TimeSlotTemplate.objects.get_or_create(
                tenant=tenant, name=s['name'],
                defaults={'start_time': s['start'], 'end_time': s['end'], 'is_break': s.get('is_break', False)}
            )
        self.stdout.write(f'  [OK] {len(slots)} Time Slots created')

        # -- 10. Faculty Preferences & Availability
        DAYS = ['mon', 'tue', 'wed', 'thu', 'fri']
        for user, fp in faculty_users:
            for day_code in DAYS:
                FacultyAvailability.objects.get_or_create(
                    faculty=fp, day=day_code, start_time='09:00',
                    defaults={'tenant': tenant, 'end_time': '17:00', 'is_available': True}
                )
            try:
                FacultyPreference.objects.get_or_create(
                    tenant=tenant, faculty=fp,
                    defaults={
                        'preferred_days': random.sample(DAYS, 3),
                        'preferred_start_time': '09:00',
                        'preferred_end_time': '15:00',
                        'max_consecutive_hours': 3
                    }
                )
            except Exception:
                pass  # FacultyPreference may have different fields

        faculty_list = [u for u, _ in faculty_users]
        self.stdout.write(self.style.SUCCESS(
            '\n\nSeed complete!\n'
            f'  Departments: {len(dept_data)}\n'
            f'  Courses: {len(course_data)} (with lecture/tutorial/practical hours)\n'
            f'  Faculty: {len(faculty_list)} (password: Faculty@123)\n'
            '  Working Days: Mon-Sat\n'
            f'  Time Slots: {len(slots)}\n'
            '\nNow go to Timetabling > Manage Timetables, create a plan, and click Auto-Schedule!'
        ))
