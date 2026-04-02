"""
Comprehensive seed command for ZenCampuz.
Seeds: Users (students, HOD, researchers), Departments, Programs, Semesters,
Batches, Courses, Campuses, Buildings, Floors, Rooms, Resource Categories, Assets.

Usage:
    python manage.py seed_comprehensive --tenant fefka
"""

from django.core.management.base import BaseCommand
from django.db import transaction
import datetime


class Command(BaseCommand):
    help = 'Seed comprehensive demo data for a tenant'

    def add_arguments(self, parser):
        parser.add_argument('--tenant', type=str, default='fefka', help='Tenant slug/name to seed data for')

    def handle(self, *args, **options):
        from tenants.models import Tenant
        from accounts.models import CustomUser, Role
        from academics.models import Department, Program, Semester, Batch, Course, Section
        from campus.models import Campus, Building, Floor, Room, RoomType
        from resources.models import ResourceCategory, Resource

        tenant_slug = options['tenant']

        # ── Get Tenant ──────────────────────────────────────────────────────────
        try:
            tenant = Tenant.objects.filter(tenant_name__iexact=tenant_slug).first() or \
                     Tenant.objects.filter(subdomain__iexact=tenant_slug).first()
            if not tenant:
                tenant = Tenant.objects.first()
            if not tenant:
                self.stderr.write(self.style.ERROR('No tenant found. Create a tenant first.'))
                return
        except Exception as e:
            self.stderr.write(self.style.ERROR(f'Tenant lookup failed: {e}'))
            return

        self.stdout.write(self.style.SUCCESS(f'Seeding data for tenant: {tenant.tenant_name}'))

        with transaction.atomic():
            self._seed_users(tenant)
            depts = self._seed_departments(tenant)
            programs = self._seed_programs(tenant, depts)
            self._seed_batches_semesters_courses(tenant, programs)
            campuses = self._seed_campuses(tenant)
            self._seed_buildings_floors_rooms(tenant, campuses)
            self._seed_resources(tenant)

        self.stdout.write(self.style.SUCCESS('✅ Comprehensive seeding complete!'))

    # ── Users ────────────────────────────────────────────────────────────────────
    def _seed_users(self, tenant):
        from accounts.models import CustomUser, Role

        self.stdout.write('  → Seeding users...')

        def get_or_create_role(name):
            role, _ = Role.objects.get_or_create(name=name)
            return role

        student_role = get_or_create_role('student')
        acad_admin_role = get_or_create_role('academic_admin')
        researcher_role = get_or_create_role('research_scholar')
        faculty_role = get_or_create_role('faculty')

        students = [
            ('Arjun Sharma',     'arjun.sharma@fefka.edu',     'CSE'),
            ('Priya Nair',       'priya.nair@fefka.edu',       'ECE'),
            ('Mohammed Irfan',   'irfan.mohammed@fefka.edu',   'MECH'),
            ('Sneha Pillai',     'sneha.pillai@fefka.edu',     'CIVIL'),
            ('Rahul Krishnan',   'rahul.krishnan@fefka.edu',   'CSE'),
            ('Ananya Rajan',     'ananya.rajan@fefka.edu',     'IT'),
            ('Karthik Menon',    'karthik.menon@fefka.edu',    'ECE'),
            ('Divya Suresh',     'divya.suresh@fefka.edu',     'MECH'),
        ]

        hods = [
            ('Dr. Vijay Kumar',    'vijay.kumar@fefka.edu',    'CSE'),
            ('Dr. Lakshmi Devi',   'lakshmi.devi@fefka.edu',   'ECE'),
            ('Dr. Rajan Thomas',   'rajan.thomas@fefka.edu',   'MECH'),
            ('Dr. Sunita Pillai',  'sunita.pillai@fefka.edu',  'CIVIL'),
            ('Dr. Arun Nair',      'arun.nair@fefka.edu',      'IT'),
        ]

        researchers = [
            ('Meera Krishnan',   'meera.krishnan@fefka.edu',  'CSE'),
            ('Suresh Babu',      'suresh.babu@fefka.edu',     'ECE'),
            ('Anjali Varma',     'anjali.varma@fefka.edu',    'MECH'),
            ('Rajeev Menon',     'rajeev.menon@fefka.edu',    'CSE'),
            ('Pooja Nambiar',    'pooja.nambiar@fefka.edu',   'ECE'),
        ]

        created = 0
        for full_name, email, dept in students:
            if not CustomUser.objects.filter(email=email).exists():
                u = CustomUser.objects.create(
                    full_name=full_name, email=email, tenant=tenant,
                    role=student_role, department=dept, is_active=True
                )
                u.set_password('Test@1234')
                u.save()
                created += 1

        for full_name, email, dept in hods:
            if not CustomUser.objects.filter(email=email).exists():
                u = CustomUser.objects.create(
                    full_name=full_name, email=email, tenant=tenant,
                    role=acad_admin_role, department=dept, is_active=True
                )
                u.set_password('Test@1234')
                u.save()
                created += 1

        for full_name, email, dept in researchers:
            if not CustomUser.objects.filter(email=email).exists():
                u = CustomUser.objects.create(
                    full_name=full_name, email=email, tenant=tenant,
                    role=researcher_role, department=dept, is_active=True
                )
                u.set_password('Test@1234')
                u.save()
                created += 1

        self.stdout.write(f'     Created {created} users')

    # ── Departments ───────────────────────────────────────────────────────────────
    def _seed_departments(self, tenant):
        from academics.models import Department

        self.stdout.write('  → Seeding departments...')

        dept_data = [
            ('Computer Science & Engineering', 'CSE', 'Engineering department focused on computing and software'),
            ('Electronics & Communication Engineering', 'ECE', 'Engineering department for electronics and communication'),
            ('Mechanical Engineering', 'MECH', 'Engineering department for mechanical systems'),
            ('Civil Engineering', 'CIVIL', 'Engineering department for infrastructure and construction'),
            ('Information Technology', 'IT', 'Technology department for information systems'),
            ('Mathematics & Sciences', 'MATHS', 'Department of pure and applied sciences'),
        ]

        depts = []
        for name, code, desc in dept_data:
            dept, created = Department.objects.get_or_create(
                tenant=tenant, code=code,
                defaults={'name': name, 'description': desc}
            )
            depts.append(dept)

        self.stdout.write(f'     {len(depts)} departments ready')
        return depts

    # ── Programs ──────────────────────────────────────────────────────────────────
    def _seed_programs(self, tenant, depts):
        from academics.models import Program

        self.stdout.write('  → Seeding programs...')

        # dept_code -> list of (name, code, degree_type, duration, semesters)
        program_data = {
            'CSE': [
                ('B.E. Computer Science & Engineering', 'BE-CSE', 'ug', 4, 8),
                ('M.E. Computer Science & Engineering', 'ME-CSE', 'pg', 2, 4),
                ('M.Sc. Data Science', 'MSC-DS', 'pg', 2, 4),
                ('Ph.D. Computer Science', 'PHD-CS', 'phd', 3, 6),
            ],
            'ECE': [
                ('B.E. Electronics & Communication', 'BE-ECE', 'ug', 4, 8),
                ('M.E. Communication Systems', 'ME-CS', 'pg', 2, 4),
                ('M.Sc. VLSI Design', 'MSC-VLSI', 'pg', 2, 4),
            ],
            'MECH': [
                ('B.E. Mechanical Engineering', 'BE-MECH', 'ug', 4, 8),
                ('M.E. Manufacturing Engineering', 'ME-MFG', 'pg', 2, 4),
                ('Diploma in Mechanical Engineering', 'DIP-MECH', 'diploma', 3, 6),
            ],
            'CIVIL': [
                ('B.E. Civil Engineering', 'BE-CIVIL', 'ug', 4, 8),
                ('M.E. Structural Engineering', 'ME-STRUCT', 'pg', 2, 4),
                ('M.E. Environmental Engineering', 'ME-ENV', 'pg', 2, 4),
            ],
            'IT': [
                ('B.Tech Information Technology', 'BTECH-IT', 'ug', 4, 8),
                ('M.Sc. Information Technology', 'MSC-IT', 'pg', 2, 4),
                ('M.Sc. Cybersecurity', 'MSC-CYB', 'pg', 2, 4),
            ],
        }

        programs = []
        for dept in depts:
            pdata = program_data.get(dept.code, [])
            for name, code, deg_type, dur, sems in pdata:
                prog, _ = Program.objects.get_or_create(
                    tenant=tenant, code=code,
                    defaults={
                        'name': name, 'department': dept,
                        'degree_type': deg_type, 'duration_years': dur,
                        'total_semesters': sems
                    }
                )
                programs.append(prog)

        self.stdout.write(f'     {len(programs)} programs ready')
        return programs

    # ── Batches, Semesters, Courses ───────────────────────────────────────────────
    def _seed_batches_semesters_courses(self, tenant, programs):
        from academics.models import Batch, Semester, Course
        import datetime

        self.stdout.write('  → Seeding batches, semesters, courses...')

        batches_created = 0
        semesters_created = 0
        courses_created = 0

        # Only seed for UG programs to keep it manageable
        ug_programs = [p for p in programs if p.degree_type == 'ug']

        for prog in ug_programs[:4]:  # limit to 4 programs
            # Batches: 2022-2026, 2023-2027, 2024-2028, 2025-2029
            for start_year in [2022, 2023, 2024, 2025]:
                end_year = start_year + prog.duration_years
                batch, created = Batch.objects.get_or_create(
                    tenant=tenant, program=prog, start_year=start_year,
                    defaults={'name': f'{start_year}-{end_year}', 'end_year': end_year}
                )
                if created:
                    batches_created += 1

            # Semesters: 1-8 for UG
            sem_terms = ['odd', 'even', 'odd', 'even', 'odd', 'even', 'odd', 'even']
            sem_names = ['Semester 1','Semester 2','Semester 3','Semester 4',
                         'Semester 5','Semester 6','Semester 7','Semester 8']

            for i in range(1, prog.total_semesters + 1):
                sem, created = Semester.objects.get_or_create(
                    tenant=tenant, program=prog, semester_number=i, academic_year='2024-25',
                    defaults={
                        'name': sem_names[i-1],
                        'term': sem_terms[i-1],
                        'is_current': (i == 5),  # Sem 5 is current
                        'start_date': datetime.date(2024, 7, 1) if i % 2 == 1 else datetime.date(2025, 1, 1),
                        'end_date': datetime.date(2024, 11, 30) if i % 2 == 1 else datetime.date(2025, 5, 31),
                    }
                )
                if created:
                    semesters_created += 1

            # Courses for semester 5 (current) only
            dept_code = prog.department.code
            sem5 = Semester.objects.filter(tenant=tenant, program=prog, semester_number=5).first()
            if sem5:
                course_templates = self._get_courses_for_dept(dept_code, prog.code)
                for name, code, ctype, credits, lh, th, ph in course_templates:
                    course, created = Course.objects.get_or_create(
                        tenant=tenant, code=f'{prog.code}-{code}',
                        defaults={
                            'department': prog.department,
                            'semester': sem5,
                            'name': name,
                            'course_type': ctype,
                            'credits': credits,
                            'lecture_hours': lh,
                            'tutorial_hours': th,
                            'practical_hours': ph,
                        }
                    )
                    if created:
                        courses_created += 1

        self.stdout.write(f'     {batches_created} batches, {semesters_created} semesters, {courses_created} courses created')

    def _get_courses_for_dept(self, dept_code, prog_code):
        """Returns (name, short_code, type, credits, lecture_h, tutorial_h, practical_h)"""
        templates = {
            'CSE': [
                ('Operating Systems', 'OS', 'theory', 4.0, 3, 1, 0),
                ('Database Management Systems', 'DBMS', 'theory', 4.0, 3, 1, 0),
                ('Computer Networks', 'CN', 'theory', 4.0, 3, 1, 0),
                ('Web Technologies Lab', 'WTL', 'practical', 2.0, 0, 0, 4),
                ('Artificial Intelligence', 'AI', 'theory', 3.0, 3, 0, 0),
                ('Software Engineering', 'SE', 'theory', 3.0, 3, 0, 0),
            ],
            'ECE': [
                ('Digital Signal Processing', 'DSP', 'theory', 4.0, 3, 1, 0),
                ('VLSI Design', 'VLSI', 'theory', 4.0, 3, 1, 0),
                ('Communication Systems', 'COMM', 'theory', 4.0, 3, 1, 0),
                ('Embedded Systems Lab', 'ESL', 'practical', 2.0, 0, 0, 4),
                ('Microprocessors', 'MP', 'theory', 3.0, 3, 0, 0),
            ],
            'MECH': [
                ('Heat Transfer', 'HT', 'theory', 4.0, 3, 1, 0),
                ('Machine Design', 'MD', 'theory', 4.0, 3, 1, 0),
                ('Manufacturing Processes', 'MFG', 'theory', 3.0, 3, 0, 0),
                ('Workshop Practice', 'WP', 'practical', 2.0, 0, 0, 4),
                ('Thermodynamics', 'THERMO', 'theory', 4.0, 3, 1, 0),
            ],
            'CIVIL': [
                ('Structural Analysis', 'SA', 'theory', 4.0, 3, 1, 0),
                ('Fluid Mechanics', 'FM', 'theory', 4.0, 3, 1, 0),
                ('Geotechnical Engineering', 'GEO', 'theory', 3.0, 3, 0, 0),
                ('Survey Lab', 'SL', 'practical', 2.0, 0, 0, 4),
                ('Concrete Technology', 'CT', 'theory', 3.0, 3, 0, 0),
            ],
            'IT': [
                ('Cloud Computing', 'CC', 'theory', 4.0, 3, 1, 0),
                ('Data Analytics', 'DA', 'theory', 4.0, 3, 1, 0),
                ('Information Security', 'IS', 'theory', 3.0, 3, 0, 0),
                ('Full Stack Development Lab', 'FSD', 'practical', 2.0, 0, 0, 4),
                ('Machine Learning', 'ML', 'theory', 4.0, 3, 1, 0),
            ],
        }
        return templates.get(dept_code, [
            ('Mathematics I', 'M1', 'theory', 4.0, 3, 1, 0),
            ('Physics', 'PHY', 'theory', 4.0, 3, 1, 0),
            ('Engineering Chemistry', 'CHEM', 'theory', 4.0, 3, 1, 0),
        ])

    # ── Campuses ──────────────────────────────────────────────────────────────────
    def _seed_campuses(self, tenant):
        from campus.models import Campus

        self.stdout.write('  → Seeding campuses...')

        campus_data = [
            ('Main Campus', 'NH 544, Ernakulam, Kerala 682021', 'main@fefka.edu', '+91-484-2345678'),
            ('North Campus', 'Aluva Road, Ernakulam, Kerala 683101', 'north@fefka.edu', '+91-484-2345679'),
            ('Engineering Block Campus', 'Kakkanad, Ernakulam, Kerala 682030', 'eng@fefka.edu', '+91-484-2345680'),
            ('Satellite Campus', 'Perumbavoor, Ernakulam, Kerala 683547', 'satellite@fefka.edu', '+91-484-2345681'),
        ]

        campuses = []
        for name, addr, email, phone in campus_data:
            c, created = Campus.objects.get_or_create(
                tenant=tenant, name=name,
                defaults={'address': addr, 'contact_email': email, 'contact_phone': phone, 'status': 'active'}
            )
            campuses.append(c)

        self.stdout.write(f'     {len(campuses)} campuses ready')
        return campuses

    # ── Buildings, Floors, Rooms ──────────────────────────────────────────────────
    def _seed_buildings_floors_rooms(self, tenant, campuses):
        from campus.models import Building, Floor, Room, RoomType

        self.stdout.write('  → Seeding buildings, floors, rooms...')

        # Ensure room types
        rt_classroom, _ = RoomType.objects.get_or_create(
            tenant=tenant, type_code='classroom',
            defaults={'name': 'Classroom'}
        )
        rt_lab, _ = RoomType.objects.get_or_create(
            tenant=tenant, type_code='lab',
            defaults={'name': 'Laboratory'}
        )
        rt_seminar, _ = RoomType.objects.get_or_create(
            tenant=tenant, type_code='seminar_hall',
            defaults={'name': 'Seminar Hall'}
        )

        buildings_created = floors_created = rooms_created = 0

        # Building data per campus: list of (name, code, total_floors)
        campus_buildings = {
            0: [  # Main Campus
                ('Administrative Block', 'ADMIN', 4),
                ('CSE & IT Block', 'CSE-IT', 5),
                ('ECE Block', 'ECE-BLK', 4),
                ('Library Block', 'LIB', 3),
            ],
            1: [  # North Campus
                ('Science Block', 'SCI-N', 4),
                ('Mechanical Block', 'MECH-N', 4),
                ('Hostel Block A', 'HOST-A', 5),
            ],
            2: [  # Engineering Block Campus
                ('A Block - Engineering', 'ENG-A', 5),
                ('B Block - Labs', 'ENG-B', 4),
                ('Workshop Block', 'WSHOP', 3),
            ],
            3: [  # Satellite Campus
                ('Main Block', 'SAT-MAIN', 4),
                ('Lab Block', 'SAT-LAB', 3),
            ],
        }

        # Room definitions per floor type (room_number, room_name, room_type, capacity)
        standard_rooms = [
            ('101', 'Classroom 101', rt_classroom, 60),
            ('102', 'Classroom 102', rt_classroom, 60),
            ('103', 'Seminar Hall', rt_seminar, 120),
        ]
        lab_rooms = [
            ('L01', 'Computer Lab A', rt_lab, 30),
            ('L02', 'Computer Lab B', rt_lab, 30),
            ('L03', 'Research Lab', rt_lab, 20),
        ]

        for ci, campus in enumerate(campuses):
            buildings_list = campus_buildings.get(ci, [('Block A', f'BLK-{ci}A', 4)])

            for bname, bcode, total_floors in buildings_list:
                # Check uniqueness per campus+code
                bld, b_created = Building.objects.get_or_create(
                    tenant=tenant, campus=campus, code=bcode,
                    defaults={'name': bname, 'total_floors': total_floors}
                )
                if b_created:
                    buildings_created += 1

                # Floors: Ground floor (0) + (total_floors - 1) upper floors
                for floor_num in range(0, min(total_floors, 5)):
                    floor_name = 'Ground Floor' if floor_num == 0 else f'Floor {floor_num}'
                    flr, f_created = Floor.objects.get_or_create(
                        tenant=tenant, building=bld, floor_number=floor_num,
                        defaults={'name': floor_name}
                    )
                    if f_created:
                        floors_created += 1

                    # Rooms per floor
                    room_template = lab_rooms if 'LAB' in bcode or 'ENG-B' in bcode else standard_rooms
                    for rnum, rname, rtype, cap in room_template:
                        # Make unique room number per building=floor
                        unique_rnum = f'{floor_num}{rnum}'
                        room, r_created = Room.objects.get_or_create(
                            tenant=tenant, building=bld, room_number=unique_rnum,
                            defaults={
                                'campus': campus,
                                'floor': flr,
                                'room_type': rtype,
                                'room_name': rname if floor_num == 0 else f'{rname} - F{floor_num}',
                                'capacity': cap,
                                'status': 'active',
                                'has_projector': True,
                                'under_maintenance': False,
                            }
                        )
                        if r_created:
                            rooms_created += 1

        self.stdout.write(f'     {buildings_created} buildings, {floors_created} floors, {rooms_created} rooms created')

    # ── Resources ─────────────────────────────────────────────────────────────────
    def _seed_resources(self, tenant):
        from resources.models import ResourceCategory, Resource

        self.stdout.write('  → Seeding resource categories and assets...')

        categories = [
            ('Sports Equipment', 'sports', 'Cricket, Football, Basketball equipment', 'Trophy'),
            ('Computer Lab Assets', 'it_asset', 'Desktops, Laptops, Peripherals', 'Monitor'),
            ('Lab Instruments & Equipment', 'lab_instrument', 'Oscilloscopes, Multimeters, Soldering Kits', 'FlaskConical'),
            ('AV Equipment', 'av_equipment', 'Projectors, Speakers, PA Systems', 'Projector'),
            ('Classroom Furniture', 'furniture', 'Desks, Chairs, Whiteboards', 'LayoutDashboard'),
        ]

        cats = {}
        for name, cat_type, desc, icon in categories:
            cat, _ = ResourceCategory.objects.get_or_create(
                tenant=tenant, name=name,
                defaults={'category_type': cat_type, 'description': desc, 'icon': icon}
            )
            cats[cat_type] = cat

        # Resources
        resources_data = [
            # (name, code, category_type, qty_total, qty_avail, status)
            ('Cricket Kit (Full Set)', 'SPORT-CK-001', 'sports', 5, 5, 'available'),
            ('Football Set', 'SPORT-FB-001', 'sports', 4, 3, 'available'),
            ('Basketball Set', 'SPORT-BB-001', 'sports', 3, 3, 'available'),
            ('Table Tennis Table', 'SPORT-TT-001', 'sports', 2, 2, 'available'),
            ('Dell Optiplex Desktop', 'LAB-PC-001', 'it_asset', 30, 28, 'available'),
            ('HP Laptop', 'LAB-LP-001', 'it_asset', 15, 15, 'available'),
            ('Raspberry Pi Kit', 'LAB-RPI-001', 'it_asset', 20, 18, 'available'),
            ('Oscilloscope (Rigol)', 'LAB-OSC-001', 'lab_instrument', 10, 8, 'available'),
            ('Digital Multimeter', 'LAB-DMM-001', 'lab_instrument', 20, 20, 'available'),
            ('Soldering Station', 'LAB-SOL-001', 'lab_instrument', 15, 13, 'available'),
            ('Electronic Components Kit', 'LAB-EKIT-001', 'lab_instrument', 25, 25, 'available'),
            ('Epson Projector', 'AV-PROJ-001', 'av_equipment', 8, 7, 'available'),
            ('PA Sound System', 'AV-PA-001', 'av_equipment', 3, 2, 'available'),
            ('Wireless Microphone Set', 'AV-MIC-001', 'av_equipment', 6, 6, 'available'),
            ('Smart Board (75")', 'AV-SB-001', 'av_equipment', 4, 4, 'available'),
        ]

        created = 0
        for name, code, cat_type, qty_total, qty_avail, status in resources_data:
            cat = cats.get(cat_type)
            if cat:
                res, r_created = Resource.objects.get_or_create(
                    tenant=tenant, resource_code=code,
                    defaults={
                        'name': name,
                        'category': cat,
                        'quantity_total': qty_total,
                        'quantity_available': qty_avail,
                        'status': status,
                    }
                )
                if r_created:
                    created += 1

        self.stdout.write(f'     {len(categories)} categories, {created} resources created')
