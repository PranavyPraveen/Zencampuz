"""
Seed Management Command: seed_fefka_faculty
============================================
Creates login-ready faculty accounts, links them to FacultyProfile, assigns
courses/availability/preferences, and generates a timetable-ready CSE department
specifically under the **Fefka** tenant.

Usage:
    python manage.py seed_fefka_faculty
    python manage.py seed_fefka_faculty --export-csv fefka_creds.csv
"""

import csv
import datetime
from django.core.management.base import BaseCommand
from django.db import transaction


FEFKA_FACULTY = [
    # (full_name, email_prefix, designation, dept_code, employee_id, specialization)
    # --- Computer Science (primary timetable test dept) ---
    ('Dr. Arun Kumar',       'arun.kumar',      'professor',             'CSE',   'FEFKA-CS-001', 'Artificial Intelligence & ML'),
    ('Dr. Priya Nair',       'priya.nair',      'associate_professor',   'CSE',   'FEFKA-CS-002', 'Database Systems'),
    ('Dr. Rajan Pillai',     'rajan.pillai',    'professor',             'CSE',   'FEFKA-CS-003', 'Computer Networks'),
    ('Mr. Vishnu Sasi',      'vishnu.sasi',     'assistant_professor',   'CSE',   'FEFKA-CS-004', 'Web Technologies'),
    ('Ms. Deepa Menon',      'deepa.menon',     'assistant_professor',   'CSE',   'FEFKA-CS-005', 'Operating Systems'),
    ('Dr. Anoop Sreekanth',  'anoop.sreekanth', 'associate_professor',   'CSE',   'FEFKA-CS-006', 'Software Engineering'),
    ('Ms. Nisha Thomas',     'nisha.thomas',    'assistant_professor',   'CSE',   'FEFKA-CS-007', 'Data Structures & Algorithms'),
    ('Dr. Jijo Mathew',      'jijo.mathew',     'professor',             'CSE',   'FEFKA-CS-008', 'Cryptography & Security'),
    # --- Electronics & Communication ---
    ('Dr. Sreeni Lakshmi',   'sreeni.lakshmi',  'professor',             'ECE',   'FEFKA-EC-001', 'VLSI Design'),
    ('Dr. Thomas George',    'thomas.george',   'associate_professor',   'ECE',   'FEFKA-EC-002', 'Digital Signal Processing'),
    # --- Mechanical Engineering ---
    ('Dr. Manoj Varma',      'manoj.varma',     'professor',             'MECH',  'FEFKA-ME-001', 'Fluid Mechanics'),
    ('Mr. Anil Das',         'anil.das',        'assistant_professor',   'MECH',  'FEFKA-ME-002', 'Machine Design'),
    # --- Tenant Admin ---
    ('Admin Fefka',          'admin',           'professor',             'CSE',   'FEFKA-ADMIN-001', 'Administration'),
]

CSE_COURSES = [
    # (name, code, course_type, credits, lecture_h, tutorial_h, practical_h)
    ('Operating Systems',           'FEFKA-CSE-OS',    'theory',    4.0, 3, 1, 0),
    ('Database Management',         'FEFKA-CSE-DBMS',  'theory',    4.0, 3, 1, 0),
    ('Computer Networks',           'FEFKA-CSE-CN',    'theory',    4.0, 3, 1, 0),
    ('Software Engineering',        'FEFKA-CSE-SE',    'theory',    3.0, 3, 0, 0),
    ('Artificial Intelligence',     'FEFKA-CSE-AI',    'theory',    3.0, 3, 0, 0),
    ('Data Structures & Algorithms','FEFKA-CSE-DSA',   'theory',    4.0, 3, 1, 0),
    ('Web Technologies Lab',        'FEFKA-CSE-WTL',   'practical', 2.0, 0, 0, 4),
    ('Networks Lab',                'FEFKA-CSE-NWL',   'practical', 2.0, 0, 0, 4),
]


class Command(BaseCommand):
    help = 'Seed Fefka-specific faculty accounts with login credentials and timetable-ready CSE data.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--export-csv', type=str, default=None,
            help='Path to export credential CSV (e.g. fefka_creds.csv)'
        )

    def handle(self, *args, **options):
        from tenants.models import Tenant
        from accounts.models import CustomUser, Role
        from academics.models import (
            Department, Program, Semester, Batch, Section, Course,
            FacultyProfile, FacultyAvailability, FacultyPreference, CourseSection
        )
        from campus.models import Campus

        # ── Resolve Fefka tenant ─────────────────────────────────────────────
        tenant = (
            Tenant.objects.filter(subdomain__iexact='fefka').first()
            or Tenant.objects.filter(tenant_name__icontains='fefka').first()
        )
        if not tenant:
            self.stderr.write(self.style.ERROR(
                '[ABORT] No Fefka tenant found. Create the Fefka tenant first.'
            ))
            return

        self.stdout.write(self.style.SUCCESS(
            f'\n📦 Seeding Fefka faculty data for: {tenant.tenant_name} (subdomain={tenant.subdomain})'
        ))

        faculty_role, _ = Role.objects.get_or_create(name='faculty')
        tenant_admin_role, _ = Role.objects.get_or_create(name='tenant_admin')

        credentials = []
        PASSWORD = 'Faculty@123'
        ADMIN_PASSWORD = 'Admin@fefka123'

        with transaction.atomic():
            created_users, created_profiles = 0, 0

            for full_name, email_prefix, designation, dept_code, emp_id, specialization in FEFKA_FACULTY:
                is_admin = email_prefix == 'admin'
                email = f'{email_prefix}@fefka.edu'
                password = ADMIN_PASSWORD if is_admin else PASSWORD
                role = tenant_admin_role if is_admin else faculty_role

                # Resolve department
                dept = Department.objects.filter(tenant=tenant, code=dept_code).first()
                if not dept:
                    self.stdout.write(
                        f'  [SKIP] Dept {dept_code} not found for "{full_name}". '
                        f'Run seed_demo_data first.'
                    )
                    continue

                # Create / repair user
                user, u_created = CustomUser.objects.get_or_create(
                    email=email,
                    defaults={
                        'full_name': full_name,
                        'tenant': tenant,
                        'role': role,
                        'is_active': True,
                    }
                )
                if u_created:
                    user.set_password(password)
                    user.save()
                    created_users += 1
                else:
                    changed = False
                    if user.role != role:
                        user.role = role; changed = True
                    if user.tenant != tenant:
                        user.tenant = tenant; changed = True
                    if not user.is_active:
                        user.is_active = True; changed = True
                    if changed:
                        user.save()
                        # Re-set password to ensure it matches expected value
                        user.set_password(password)
                        user.save(update_fields=['password'])

                # Create / repair FacultyProfile
                # First check if this user already has ANY faculty profile (OneToOneField constraint)
                existing_by_user = FacultyProfile.objects.filter(user=user).first()
                existing_by_empid = FacultyProfile.objects.filter(tenant=tenant, employee_id=emp_id).first()

                if existing_by_user and existing_by_user != existing_by_empid:
                    # User already has a profile with a different employee_id — update it
                    fp = existing_by_user
                    fp.employee_id = emp_id
                    fp.department = dept
                    fp.designation = designation
                    fp.save()
                    fp_created = False
                elif existing_by_empid:
                    fp = existing_by_empid
                    if fp.user != user or fp.department != dept:
                        fp.user = user; fp.department = dept; fp.save()
                    fp_created = False
                else:
                    fp = FacultyProfile.objects.create(
                        tenant=tenant,
                        user=user,
                        department=dept,
                        employee_id=emp_id,
                        designation=designation,
                        specialization=specialization,
                        max_weekly_hours=20,
                        status='active',
                    )
                    fp_created = True
                    created_profiles += 1

                # Seed availability Mon–Fri
                for day in ['mon', 'tue', 'wed', 'thu', 'fri']:
                    FacultyAvailability.objects.get_or_create(
                        tenant=tenant, faculty=fp, day=day,
                        defaults={
                            'start_time': datetime.time(8, 0),
                            'end_time': datetime.time(17, 0),
                            'is_available': True,
                        }
                    )

                # Seed preference
                FacultyPreference.objects.get_or_create(
                    tenant=tenant, faculty=fp,
                    defaults={
                        'preferred_days': ['mon', 'tue', 'wed', 'thu', 'fri'],
                        'preferred_time_start': datetime.time(9, 0),
                        'preferred_time_end': datetime.time(16, 0),
                        'avoid_early_morning': False,
                        'avoid_consecutive_hours': True,
                        'max_courses_per_semester': 4,
                        'notes': f'Auto-seeded for {full_name}.',
                    }
                )

                if not is_admin:
                    credentials.append({
                        'name': full_name,
                        'email': email,
                        'password': PASSWORD,
                        'department': dept_code,
                        'employee_id': emp_id,
                        'campus': dept.campus.name if dept.campus else '—',
                    })

            self.stdout.write(self.style.SUCCESS(
                f'  ✅ Created {created_users} new user(s), {created_profiles} new FacultyProfile(s).'
            ))

            # ── Fefka CSE timetable-ready setup ─────────────────────────────
            self.stdout.write('\n  → Building Fefka CSE timetable data…')
            cse_dept = Department.objects.filter(tenant=tenant, code='CSE').first()
            if not cse_dept:
                self.stdout.write(self.style.WARNING(
                    '  [WARN] CSE dept not found under Fefka. '
                    'Run seed_demo_data --tenant fefka first.'
                ))
            else:
                # Link CSE dept to first Fefka campus if missing
                campus = Campus.objects.filter(tenant=tenant).first()
                if campus and not cse_dept.campus:
                    cse_dept.campus = campus
                    cse_dept.save()
                    self.stdout.write(f'  → Linked CSE to campus: {campus.name}')

                # Program
                program, _ = Program.objects.get_or_create(
                    tenant=tenant, code='FEFKA-BE-CSE',
                    defaults={
                        'name': 'B.E. Computer Science & Engineering',
                        'department': cse_dept,
                        'degree_type': 'ug',
                        'duration_years': 4,
                        'total_semesters': 8,
                    }
                )

                # Active semester
                semester, _ = Semester.objects.get_or_create(
                    tenant=tenant, program=program,
                    semester_number=5,
                    academic_year='2024-25',
                    defaults={
                        'name': 'Semester 5',
                        'term': 'odd',
                        'is_current': True,
                        'start_date': datetime.date(2024, 7, 1),
                        'end_date': datetime.date(2024, 11, 30),
                    }
                )
                # Ensure it is current
                if not semester.is_current:
                    semester.is_current = True
                    semester.save(update_fields=['is_current'])

                # Batch + Section
                batch, _ = Batch.objects.get_or_create(
                    tenant=tenant, program=program, start_year=2022,
                    defaults={'name': '2022-2026', 'end_year': 2026, 'is_active': True}
                )
                section, _ = Section.objects.get_or_create(
                    batch=batch, name='A',
                    defaults={'tenant': tenant, 'strength': 60, 'is_active': True}
                )

                # Courses
                created_courses = []
                for cname, ccode, ctype, credits, lh, th, ph in CSE_COURSES:
                    course, _ = Course.objects.get_or_create(
                        tenant=tenant, code=ccode,
                        defaults={
                            'name': cname,
                            'department': cse_dept,
                            'semester': semester,
                            'course_type': ctype,
                            'credits': credits,
                            'lecture_hours': lh,
                            'tutorial_hours': th,
                            'practical_hours': ph,
                            'is_active': True,
                        }
                    )
                    created_courses.append(course)

                # Seed preferred_courses for CSE faculty from these courses
                cse_fps = list(FacultyProfile.objects.filter(tenant=tenant, department=cse_dept))
                for fp in cse_fps:
                    pref = FacultyPreference.objects.filter(tenant=tenant, faculty=fp).first()
                    if pref:
                        # assign 2-3 courses as preferred
                        subset = created_courses[:3]
                        pref.preferred_courses.set(subset)

                # CourseSection mappings (faculty-course assignments)
                for i, course in enumerate(created_courses):
                    fp = cse_fps[i % len(cse_fps)] if cse_fps else None
                    CourseSection.objects.get_or_create(
                        course=course, section=section, semester=semester,
                        defaults={
                            'tenant': tenant,
                            'faculty': fp,
                            'is_active': True,
                        }
                    )

                self.stdout.write(self.style.SUCCESS(
                    f'  ✅ CSE timetable data: {len(created_courses)} courses, '
                    f'{len(cse_fps)} faculty, Batch {batch.name} / Section {section.name}.'
                ))

        # ── Print Credentials ────────────────────────────────────────────────
        self.stdout.write('\n' + '=' * 80)
        self.stdout.write(self.style.SUCCESS('  FEFKA FACULTY DEMO CREDENTIALS'))
        self.stdout.write('=' * 80)
        self.stdout.write(
            f"  {'NAME':<28} {'EMAIL':<32} {'PASSWORD':<16} {'DEPT':<6} {'CAMPUS'}"
        )
        self.stdout.write('-' * 80)
        for c in credentials:
            self.stdout.write(
                f"  {c['name']:<28} {c['email']:<32} {c['password']:<16} "
                f"{c['department']:<6} {c['campus']}"
            )
        self.stdout.write('=' * 80)
        self.stdout.write(
            f'\n  Tenant Admin — email: admin@fefka.edu  password: {ADMIN_PASSWORD}'
        )
        self.stdout.write(f'  Total faculty: {len(credentials)}\n')

        # ── Optional CSV export ──────────────────────────────────────────────
        export_path = options.get('export_csv')
        if export_path:
            with open(export_path, 'w', newline='') as f:
                writer = csv.DictWriter(
                    f,
                    fieldnames=['name', 'email', 'password', 'department', 'employee_id', 'campus']
                )
                writer.writeheader()
                writer.writerows(credentials)
            self.stdout.write(self.style.SUCCESS(f'  📄 Credentials exported → {export_path}'))
