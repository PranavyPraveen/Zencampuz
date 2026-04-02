"""
Seed Management Command: seed_faculty_data
==========================================
Creates login-ready faculty accounts, links them to FacultyProfile, assigns
courses/availability/preferences, and generates a timetable-ready CSE department.

Usage:
    python manage.py seed_faculty_data
    python manage.py seed_faculty_data --tenant fefka
    python manage.py seed_faculty_data --export-csv faculty_creds.csv
"""

import csv
import io
import datetime
import random
from django.core.management.base import BaseCommand
from django.db import transaction


FACULTY_DATA = [
    # (full_name, email_prefix, designation, dept_code, employee_id, specialization)
    # --- Computer Science ---
    ('Dr. Arun Kumar',      'arun.kumar',     'professor',    'CSE',   'FAC-CS-001', 'Artificial Intelligence & ML'),
    ('Dr. Priya Nair',      'priya.nair',     'associate',    'CSE',   'FAC-CS-002', 'Database Systems'),
    ('Dr. Rajan Pillai',    'rajan.pillai',   'professor',    'CSE',   'FAC-CS-003', 'Computer Networks'),
    ('Mr. Vishnu Sasi',     'vishnu.sasi',    'assistant',    'CSE',   'FAC-CS-004', 'Web Technologies'),
    ('Ms. Deepa Menon',     'deepa.menon',    'assistant',    'CSE',   'FAC-CS-005', 'Operating Systems'),
    ('Dr. Anoop Sreekanth', 'anoop.sreekanth','associate',    'CSE',   'FAC-CS-006', 'Software Engineering'),
    ('Ms. Nisha Thomas',    'nisha.thomas',   'assistant',    'CSE',   'FAC-CS-007', 'Data Structures & Algorithms'),
    ('Dr. Jijo Mathew',     'jijo.mathew',    'professor',    'CSE',   'FAC-CS-008', 'Cryptography & Security'),
    # --- Electronics & Communication ---
    ('Dr. Sreeni Lakshmi',  'sreeni.lakshmi', 'professor',    'ECE',   'FAC-EC-001', 'VLSI Design'),
    ('Dr. Thomas George',   'thomas.george',  'associate',    'ECE',   'FAC-EC-002', 'Digital Signal Processing'),
    ('Ms. Ananya Pillai',   'ananya.pillai',  'assistant',    'ECE',   'FAC-EC-003', 'Embedded Systems'),
    ('Mr. Suresh Babu',     'suresh.babu',    'assistant',    'ECE',   'FAC-EC-004', 'Communication Systems'),
    # --- Mechanical Engineering ---
    ('Dr. Manoj Varma',     'manoj.varma',    'professor',    'MECH',  'FAC-ME-001', 'Fluid Mechanics'),
    ('Dr. Rekha Krishnan',  'rekha.krishnan', 'associate',    'MECH',  'FAC-ME-002', 'Heat Transfer'),
    ('Mr. Anil Das',        'anil.das',       'assistant',    'MECH',  'FAC-ME-003', 'Machine Design'),
    # --- Civil Engineering ---
    ('Dr. Seema Joseph',    'seema.joseph',   'professor',    'CIVIL', 'FAC-CV-001', 'Structural Engineering'),
    ('Mr. Biju Kuriakose',  'biju.kuriakose', 'assistant',    'CIVIL', 'FAC-CV-002', 'Geotechnical Engineering'),
    # --- Information Technology ---
    ('Dr. Litha Rajan',     'litha.rajan',    'professor',    'IT',    'FAC-IT-001', 'Cloud Computing'),
    ('Ms. Meera Sujith',    'meera.sujith',   'assistant',    'IT',    'FAC-IT-002', 'Data Analytics'),
    ('Mr. Binu Philip',     'binu.philip',    'assistant',    'IT',    'FAC-IT-003', 'Machine Learning'),
]


class Command(BaseCommand):
    help = 'Seed faculty user accounts with login credentials and timetable-ready data.'

    def add_arguments(self, parser):
        parser.add_argument('--tenant', type=str, default=None, help='Tenant slug (optional)')
        parser.add_argument('--export-csv', type=str, default=None, help='CSV file to export credentials')

    def handle(self, *args, **options):
        from tenants.models import Tenant
        from accounts.models import CustomUser, Role
        from academics.models import (
            Department, Program, Semester, Batch, Section, Course,
            FacultyProfile, FacultyAvailability, FacultyPreference, CourseSection
        )
        from campus.models import Campus

        # Get tenant
        tenant_slug = options.get('tenant')
        if tenant_slug:
            tenant = Tenant.objects.filter(tenant_name__iexact=tenant_slug).first() or \
                     Tenant.objects.filter(subdomain__iexact=tenant_slug).first()
        else:
            tenant = Tenant.objects.first()

        if not tenant:
            self.stderr.write(self.style.ERROR('No tenant found. Create one first.'))
            return

        self.stdout.write(self.style.SUCCESS(f'Seeding faculty data for tenant: {tenant.tenant_name}'))

        # Get or create faculty role
        faculty_role, _ = Role.objects.get_or_create(name='faculty')

        credentials = []

        with transaction.atomic():
            created_users = 0
            created_profiles = 0

            for full_name, email_prefix, designation, dept_code, emp_id, specialization in FACULTY_DATA:
                email = f'{email_prefix}@{tenant.subdomain or "fefka"}.edu'
                password = 'Faculty@123'

                # Get department
                dept = Department.objects.filter(tenant=tenant, code=dept_code).first()
                if not dept:
                    self.stdout.write(f'  [SKIP] Department {dept_code} not found. Skipping {full_name}.')
                    continue

                # Create or get user
                user, u_created = CustomUser.objects.get_or_create(
                    email=email,
                    defaults={
                        'full_name': full_name,
                        'tenant': tenant,
                        'role': faculty_role,
                        'is_active': True,
                    }
                )
                if u_created:
                    user.set_password(password)
                    user.save()
                    created_users += 1
                else:
                    # Ensure role is set even for existing users
                    if user.role != faculty_role:
                        user.role = faculty_role
                        user.save(update_fields=['role'])

                # Create or get FacultyProfile
                fp, fp_created = FacultyProfile.objects.get_or_create(
                    tenant=tenant,
                    employee_id=emp_id,
                    defaults={
                        'user': user,
                        'department': dept,
                        'designation': designation,
                        'specialization': specialization,
                        'max_weekly_hours': 20,
                        'status': 'active',
                    }
                )
                if not fp_created:
                    # Repair missing links
                    changed = False
                    if fp.user != user:
                        fp.user = user
                        changed = True
                    if fp.department != dept:
                        fp.department = dept
                        changed = True
                    if changed:
                        fp.save()
                else:
                    created_profiles += 1

                # Seed availability: Mon-Fri, 08:00-17:00
                for day in ['mon', 'tue', 'wed', 'thu', 'fri']:
                    FacultyAvailability.objects.get_or_create(
                        tenant=tenant, faculty=fp, day=day,
                        defaults={
                            'start_time': datetime.time(8, 0),
                            'end_time': datetime.time(17, 0),
                            'is_available': True,
                        }
                    )

                # Seed preference if not exists
                FacultyPreference.objects.get_or_create(
                    tenant=tenant, faculty=fp,
                    defaults={
                        'preferred_days': ['mon', 'tue', 'wed', 'thu', 'fri'],
                        'preferred_time_start': datetime.time(9, 0),
                        'preferred_time_end': datetime.time(16, 0),
                        'avoid_early_morning': False,
                        'avoid_consecutive_hours': True,
                        'max_courses_per_semester': 4,
                        'notes': f'Auto-seeded preferences for {full_name}.',
                    }
                )

                credentials.append({
                    'name': full_name,
                    'email': email,
                    'password': password,
                    'department': dept_code,
                    'employee_id': emp_id,
                })

            self.stdout.write(f'  ✅ Created {created_users} new user(s), {created_profiles} new profile(s).')

            # ─── Seed timetable-ready CSE department ─────────────────────────
            cse_dept = Department.objects.filter(tenant=tenant, code='CSE').first()
            if cse_dept:
                self.stdout.write('  → Ensuring timetable-ready CSE data...')
                # Ensure CSE linked to a campus
                campus = Campus.objects.filter(tenant=tenant).first()
                if campus and not cse_dept.campus:
                    cse_dept.campus = campus
                    cse_dept.save()

                # Get BE-CSE program
                program = Program.objects.filter(tenant=tenant, code='BE-CSE').first()
                if not program:
                    program, _ = Program.objects.get_or_create(
                        tenant=tenant, code='BE-CSE',
                        defaults={
                            'name': 'B.E. Computer Science & Engineering',
                            'department': cse_dept,
                            'degree_type': 'ug',
                            'duration_years': 4,
                            'total_semesters': 8,
                        }
                    )

                # Get/create a current semester
                semester = Semester.objects.filter(
                    tenant=tenant, program=program, semester_number=5, academic_year='2024-25'
                ).first()
                if not semester:
                    semester, _ = Semester.objects.get_or_create(
                        tenant=tenant, program=program, semester_number=5, academic_year='2024-25',
                        defaults={
                            'name': 'Semester 5',
                            'term': 'odd',
                            'is_current': True,
                            'start_date': datetime.date(2024, 7, 1),
                            'end_date': datetime.date(2024, 11, 30),
                        }
                    )

                # Ensure batch and section
                batch, _ = Batch.objects.get_or_create(
                    tenant=tenant, program=program, start_year=2022,
                    defaults={'name': '2022-2026', 'end_year': 2026}
                )
                section, _ = Section.objects.get_or_create(
                    tenant=tenant, batch=batch, name='A',
                    defaults={'strength': 60, 'is_active': True}
                )

                # Ensure CSE courses
                cse_courses_data = [
                    ('Operating Systems', f'BE-CSE-OS',    'theory',    4.0, 3, 1, 0),
                    ('Database Management', f'BE-CSE-DBMS','theory',    4.0, 3, 1, 0),
                    ('Computer Networks',   f'BE-CSE-CN',  'theory',    4.0, 3, 1, 0),
                    ('Software Engineering',f'BE-CSE-SE',  'theory',    3.0, 3, 0, 0),
                    ('Artificial Intelligence', f'BE-CSE-AI', 'theory', 3.0, 3, 0, 0),
                    ('Web Technologies Lab',f'BE-CSE-WTL', 'practical', 2.0, 0, 0, 4),
                ]
                cse_courses = []
                for cname, ccode, ctype, credits, lh, th, ph in cse_courses_data:
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
                    cse_courses.append(course)

                # Assign CSE faculty to courses (CourseSection mappings)
                cse_faculty_profiles = list(
                    FacultyProfile.objects.filter(tenant=tenant, department=cse_dept)
                )
                for i, course in enumerate(cse_courses):
                    if cse_faculty_profiles:
                        fp = cse_faculty_profiles[i % len(cse_faculty_profiles)]
                        CourseSection.objects.get_or_create(
                            course=course, section=section, semester=semester,
                            defaults={'tenant': tenant, 'faculty': fp, 'is_active': True}
                        )

                self.stdout.write(self.style.SUCCESS(
                    f'  ✅ CSE timetable data ready. '
                    f'{len(cse_courses)} courses, {len(cse_faculty_profiles)} faculty, '
                    f'1 section ready.'
                ))
            else:
                self.stdout.write(self.style.WARNING('  [WARN] CSE department not found. Run seed_comprehensive first.'))

        # ─── Print Credentials Table ─────────────────────────────────────────
        self.stdout.write('\n' + '='*70)
        self.stdout.write(self.style.SUCCESS('FACULTY DEMO CREDENTIALS'))
        self.stdout.write('='*70)
        self.stdout.write(f"{'NAME':<30} {'EMAIL':<35} {'PASSWORD':<15} {'DEPT':<6}")
        self.stdout.write('-'*70)
        for c in credentials:
            self.stdout.write(f"{c['name']:<30} {c['email']:<35} {c['password']:<15} {c['department']:<6}")
        self.stdout.write('='*70)
        self.stdout.write(f'Total: {len(credentials)} faculty accounts.\n')

        # ─── Optional CSV export ─────────────────────────────────────────────
        export_path = options.get('export_csv')
        if export_path:
            with open(export_path, 'w', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=['name', 'email', 'password', 'department', 'employee_id'])
                writer.writeheader()
                writer.writerows(credentials)
            self.stdout.write(self.style.SUCCESS(f'Credentials exported to: {export_path}'))
