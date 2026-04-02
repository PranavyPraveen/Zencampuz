import random
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed comprehensive timetable data for ALL departments to test cross-department conflicts.'

    def add_arguments(self, parser):
        parser.add_argument('--tenant', type=str, required=True, help='Tenant slug (e.g. "fefka")')

    def handle(self, *args, **options):
        from tenants.models import Tenant
        from accounts.models import Role
        from academics.models import Department, Program, Batch, Section, CourseSection, Course, Semester, FacultyProfile, FacultyAvailability, FacultyPreference
        from timetable.models import WorkingDay, TimeSlotTemplate, TimetablePlan

        slug = options['tenant']
        try:
            tenant = Tenant.objects.get(subdomain=slug)
        except Tenant.DoesNotExist:
            self.stderr.write(f'Tenant "{slug}" not found.')
            return

        self.stdout.write(self.style.SUCCESS(f'Seeding ALL DEPARTMENTS for tenant: {tenant.tenant_name}'))

        # ── 1. Departments & Programs
        dept_configs = {
            'CSE': {'name': 'Computer Science Engineering', 'prog': 'B.Tech CSE', 'code': 'BTECH-CSE'},
            'ECE': {'name': 'Electronics & Communication',  'prog': 'B.Tech ECE', 'code': 'BTECH-ECE'},
            'MECH':{'name': 'Mechanical Engineering',       'prog': 'B.Tech MECH','code': 'BTECH-MECH'},
            'CIVIL':{'name': 'Civil Engineering',           'prog': 'B.Tech CIVIL','code': 'BTECH-CIVIL'},
        }
        
        departments = {}
        programs = {}
        batches = {}
        sections = {}
        semesters = {}

        for dcode, ddata in dept_configs.items():
            dept, _ = Department.objects.get_or_create(tenant=tenant, code=dcode, defaults={'name': ddata['name']})
            departments[dcode] = dept
            
            prog, _ = Program.objects.get_or_create(
                tenant=tenant, code=ddata['code'],
                defaults={'name': ddata['prog'], 'department': dept, 'duration_years': 4}
            )
            programs[dcode] = prog
            
            sem, _ = Semester.objects.get_or_create(
                tenant=tenant, program=prog, semester_number=1, academic_year='2024-25',
                defaults={'name': 'Sem 1 (Fall 2024)', 'term': 'odd', 'start_date': '2024-08-01', 'end_date': '2024-12-31', 'is_current': True}
            )
            semesters[dcode] = sem
            
            batch, _ = Batch.objects.get_or_create(
                tenant=tenant, program=prog, start_year=2024,
                defaults={'end_year': 2028, 'name': f"{ddata['code']} | 2024-2028"}
            )
            batches[dcode] = batch
            
            # Create Section A for each
            sec, _ = Section.objects.get_or_create(
                tenant=tenant, batch=batch, name='A', defaults={'strength': 60}
            )
            sections[dcode] = sec

        # ── 2. Courses
        course_definitions = [
            ('CSE', 'Data Structures', 'CS201', 3, 1, 2),
            ('CSE', 'Operating Systems', 'CS301', 3, 1, 2),
            ('CSE', 'Database Management', 'CS302', 3, 1, 2),
            ('CSE', 'Computer Networks', 'CS401', 3, 0, 2),
            ('CSE', 'Software Engineering', 'CS402', 3, 1, 0),
            ('CSE', 'Programming Lab', 'CS103L', 0, 0, 3),

            ('ECE', 'Signals & Systems', 'EC201', 4, 1, 0),
            ('ECE', 'Analog Circuits', 'EC202', 3, 1, 2),
            ('ECE', 'Digital Electronics', 'EC203', 3, 0, 2),
            ('ECE', 'Communication Systems', 'EC301', 4, 0, 2),
            ('ECE', 'Microprocessors', 'EC302', 3, 1, 2),

            ('MECH', 'Thermodynamics', 'ME201', 4, 1, 0),
            ('MECH', 'Fluid Mechanics', 'ME202', 3, 1, 2),
            ('MECH', 'Solid Mechanics', 'ME203', 3, 1, 0),
            ('MECH', 'Manufacturing Tech', 'ME301', 3, 0, 2),
            ('MECH', 'Heat Transfer', 'ME302', 3, 1, 2),

            ('CIVIL', 'Structural Analysis', 'CE201', 4, 1, 0),
            ('CIVIL', 'Fluid Mechanics II', 'CE202', 3, 1, 2),
            ('CIVIL', 'Surveying', 'CE203', 3, 0, 2),
            ('CIVIL', 'Geotechnical Engineering', 'CE301', 4, 0, 2),
            ('CIVIL', 'Transportation Engg', 'CE302', 3, 1, 0),
        ]
        
        courses_db = []
        for dcode, cname, ccode, lec, tut, prac in course_definitions:
            c, _ = Course.objects.get_or_create(
                tenant=tenant, code=ccode,
                defaults={
                    'name': cname,
                    'department': departments[dcode],
                    'credits': lec + tut,
                    'lecture_hours': lec,
                    'tutorial_hours': tut,
                    'practical_hours': prac,
                }
            )
            courses_db.append((dcode, c))

        # ── 3. Faculty
        faculty_names = [
            ('CSE', 'Arjun', 'Sharma'), ('CSE', 'Priya', 'Nair'), ('CSE', 'Rahul', 'Menon'), ('CSE', 'Kavitha', 'Anand'),
            ('ECE', 'Deepa', 'Krishnan'), ('ECE', 'Sanjay', 'Verma'), ('ECE', 'Nitin', 'Rao'), ('ECE', 'Meera', 'Iyer'),
            ('MECH', 'Vikram', 'Kumar'), ('MECH', 'Suresh', 'Pillai'), ('MECH', 'Ramesh', 'Babu'), ('MECH', 'Anjali', 'Devi'),
            ('CIVIL', 'Sunita', 'Patel'), ('CIVIL', 'Ashok', 'Garg'), ('CIVIL', 'Prakash', 'Singh'), ('CIVIL', 'Neha', 'Gupta'),
        ]
        
        faculty_role, _ = Role.objects.get_or_create(name='faculty')
        dept_faculties = {'CSE': [], 'ECE': [], 'MECH': [], 'CIVIL': []}
        
        for dcode, first, last in faculty_names:
            email = f"{first.lower()}.{last.lower()}.{dcode.lower()}@{tenant.subdomain}.edu"
            user, created = User.objects.get_or_create(
                email=email, tenant=tenant,
                defaults={'full_name': f"{first} {last}", 'role': faculty_role, 'is_active': True}
            )
            if created:
                user.set_password('Faculty@123')
                user.save()
            
            fp, _ = FacultyProfile.objects.get_or_create(
                tenant=tenant, user=user,
                defaults={'department': departments[dcode], 'employee_id': f'FAC{random.randint(1000,9999)}', 'max_weekly_hours': 18}
            )
            dept_faculties[dcode].append(fp)

        # ── 4. Course Sections (Link Course + Faculty + Section)
        for dcode, c in courses_db:
            sec = sections[dcode]
            sem = semesters[dcode]
            facList = dept_faculties[dcode]
            assigned_fac = random.choice(facList)
            
            CourseSection.objects.get_or_create(
                tenant=tenant, course=c, section=sec, semester=sem,
                defaults={'faculty': assigned_fac}
            )

        # ── 5. Timetable Plans
        # Create a drafted Timetable Plan for each Department's Section A
        for dcode, sec in sections.items():
            sem = semesters[dcode]
            if not TimetablePlan.objects.filter(tenant=tenant, semester=sem, section=sec).exists():
                plan_name = f"{dcode} - Section {sec.name} ({sem.name})"
                TimetablePlan.objects.create(
                    tenant=tenant,
                    semester=sem,
                    section=sec,
                    name=plan_name,
                    status='draft',
                    valid_from='2024-08-01',
                    valid_to='2024-12-31'
                )

        # ── 6. Base slots and working days (ensure they exist)
        day_map = {'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6}
        for day_code, order in day_map.items():
            WorkingDay.objects.get_or_create(tenant=tenant, day=day_code, defaults={'is_active': True, 'order': order})

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

        self.stdout.write(self.style.SUCCESS('Successfully seeded programs, courses, faculty, course sections, and empty Timetable Plans for CSE, ECE, MECH, CIVIL!'))
