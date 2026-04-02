"""
Seed campus, buildings, floors, rooms, and faculty-course assignments.
Run: python manage.py seed_campus_and_courses --tenant fefka
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Seed rooms and faculty-course assignments for auto-schedule'

    def add_arguments(self, parser):
        parser.add_argument('--tenant', type=str, required=True)

    def handle(self, *args, **options):
        from tenants.models import Tenant
        from campus.models import Campus, Building, Floor, Room, RoomType
        from academics.models import (
            Department, FacultyProfile, CourseSection, Semester,
            Section, FacultyPreference, FacultyAvailability
        )

        slug = options['tenant']
        try:
            tenant = Tenant.objects.get(subdomain=slug)
        except Tenant.DoesNotExist:
            self.stderr.write(f'Tenant "{slug}" not found.')
            return

        self.stdout.write(f'Seeding campus data for: {tenant.tenant_name}')

        # 1. Campus
        campus, _ = Campus.objects.get_or_create(
            tenant=tenant, name='Main Campus',
            defaults={'address': '1 College Road, Chennai', 'status': 'active'}
        )
        self.stdout.write(f'  [OK] Campus: {campus.name}')

        # 2. Buildings
        building_a, _ = Building.objects.get_or_create(
            tenant=tenant, campus=campus, code='ABA',
            defaults={'name': 'Academic Block A', 'total_floors': 4}
        )
        building_b, _ = Building.objects.get_or_create(
            tenant=tenant, campus=campus, code='ABB',
            defaults={'name': 'Academic Block B', 'total_floors': 4}
        )
        lab_block, _ = Building.objects.get_or_create(
            tenant=tenant, campus=campus, code='LB',
            defaults={'name': 'Lab Block', 'total_floors': 3}
        )
        self.stdout.write('  [OK] 3 Buildings')

        # 3. Floors (using floor_number field)
        floors = {}
        for building, b_key in [(building_a, 'ABA'), (building_b, 'ABB'), (lab_block, 'LB')]:
            for fn in [1, 2, 3]:
                fl, _ = Floor.objects.get_or_create(
                    tenant=tenant, building=building, floor_number=fn,
                    defaults={'name': f'Floor {fn}'}
                )
                floors[f'{b_key}_F{fn}'] = fl
        self.stdout.write('  [OK] Floors created')

        # 4. Room Types (must use choices: classroom, lab, seminar_hall, etc.)
        rt_classroom, _ = RoomType.objects.get_or_create(
            tenant=tenant, type_code='classroom', defaults={'name': 'Classroom'}
        )
        rt_lab, _ = RoomType.objects.get_or_create(
            tenant=tenant, type_code='lab', defaults={'name': 'Laboratory'}
        )
        rt_sem, _ = RoomType.objects.get_or_create(
            tenant=tenant, type_code='seminar_hall', defaults={'name': 'Seminar Hall'}
        )
        self.stdout.write('  [OK] 3 Room types (classroom, lab, seminar_hall)')

        # 5. Rooms - Room requires: tenant, campus, building, floor, room_type, room_number
        room_defs = [
            # (room_number, room_name, capacity, room_type, building, floor_key)
            ('LH101', 'Lecture Hall 1',   120, rt_classroom, building_a, 'ABA_F1'),
            ('LH102', 'Lecture Hall 2',   120, rt_classroom, building_a, 'ABA_F1'),
            ('CR201', 'Classroom 201',     60, rt_classroom, building_a, 'ABA_F2'),
            ('CR202', 'Classroom 202',     60, rt_classroom, building_a, 'ABA_F2'),
            ('CR203', 'Classroom 203',     60, rt_classroom, building_a, 'ABA_F2'),
            ('CR301', 'Classroom 301',     60, rt_classroom, building_a, 'ABA_F3'),
            ('CR302', 'Classroom 302',     60, rt_classroom, building_b, 'ABB_F1'),
            ('CR303', 'Classroom 303',     60, rt_classroom, building_b, 'ABB_F1'),
            ('SH101', 'Seminar Hall',      80, rt_sem,       building_b, 'ABB_F2'),
            ('CL101', 'Computer Lab 1',    40, rt_lab,       lab_block,  'LB_F1'),
            ('CL102', 'Computer Lab 2',    40, rt_lab,       lab_block,  'LB_F1'),
            ('EL101', 'Electronics Lab',   36, rt_lab,       lab_block,  'LB_F2'),
        ]

        rooms_created = 0
        for rn, rm_name, cap, rt, bld, fl_key in room_defs:
            fl = floors.get(fl_key)
            if not fl:
                continue
            r, created = Room.objects.get_or_create(
                tenant=tenant, building=bld, room_number=rn,
                defaults={
                    'room_name': rm_name,
                    'floor': fl,
                    'room_type': rt,
                    'capacity': cap,
                    'status': 'active',
                }
            )
            if created:
                rooms_created += 1

        self.stdout.write(f'  [OK] {rooms_created} new Rooms created')

        # 6. Assign faculty to CourseSection (round-robin)
        sem = Semester.objects.filter(tenant=tenant, name='Semester 1').first()
        if not sem:
            self.stdout.write('  [SKIP] Semester 1 not found - skipping course-faculty assignment')
        else:
            fac_profiles = list(FacultyProfile.objects.filter(tenant=tenant, status='active'))
            if not fac_profiles:
                self.stdout.write('  [SKIP] No faculty profiles found')
            else:
                assigned = 0
                for i, cs in enumerate(CourseSection.objects.filter(
                    tenant=tenant, semester=sem, faculty__isnull=True
                )):
                    cs.faculty = fac_profiles[i % len(fac_profiles)]
                    cs.save()
                    assigned += 1
                self.stdout.write(f'  [OK] Assigned faculty to {assigned} CourseSection records')

        # 7. Faculty Preferences and Availability
        fac_profiles = list(FacultyProfile.objects.filter(tenant=tenant, status='active'))
        pref_added = 0
        avail_added = 0
        DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']
        for fp in fac_profiles:
            p, created = FacultyPreference.objects.get_or_create(
                tenant=tenant, faculty=fp,
                defaults={
                    'preferred_days': ['mon', 'tue', 'wed', 'thu', 'fri'],
                    'avoid_early_morning': False,
                    'max_courses_per_semester': 4,
                }
            )
            if created:
                pref_added += 1
            for day in DAYS:
                av, created = FacultyAvailability.objects.get_or_create(
                    faculty=fp, day=day, start_time='09:00:00',
                    defaults={'tenant': tenant, 'end_time': '17:00:00', 'is_available': True}
                )
                if created:
                    avail_added += 1

        self.stdout.write(f'  [OK] {pref_added} FacultyPreference, {avail_added} FacultyAvailability records')

        self.stdout.write(self.style.SUCCESS(
            '\n\nAll campus seed data ready!\n'
            'Now go to Timetabling > Manage Timetables, create/use a plan, and click Auto-Schedule!'
        ))
