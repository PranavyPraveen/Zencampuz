"""
Comprehensive campus room seed: adds all rooms needed for auto-scheduling
including large labs (capacity 60) that can handle full practical batches.

Run: python manage.py seed_all_rooms --tenant fefka
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Seed ALL rooms (classrooms, large labs, seminar halls) needed for auto-schedule'

    def add_arguments(self, parser):
        parser.add_argument('--tenant', type=str, required=True)

    def handle(self, *args, **options):
        from tenants.models import Tenant
        from campus.models import Campus, Building, Floor, Room, RoomType

        slug = options['tenant']
        try:
            tenant = Tenant.objects.get(subdomain=slug)
        except Tenant.DoesNotExist:
            self.stderr.write(f'Tenant "{slug}" not found.')
            return

        self.stdout.write(f'Seeding all rooms for: {tenant.tenant_name}')

        # Get or create campus
        campus, _ = Campus.objects.get_or_create(
            tenant=tenant, name='Main Campus',
            defaults={'address': '1 College Road', 'status': 'active'}
        )

        # Get or create buildings
        bld_a, _ = Building.objects.get_or_create(
            tenant=tenant, campus=campus, code='ABA',
            defaults={'name': 'Academic Block A', 'total_floors': 4}
        )
        bld_b, _ = Building.objects.get_or_create(
            tenant=tenant, campus=campus, code='ABB',
            defaults={'name': 'Academic Block B', 'total_floors': 4}
        )
        lab_bld, _ = Building.objects.get_or_create(
            tenant=tenant, campus=campus, code='LB',
            defaults={'name': 'Lab Block', 'total_floors': 3}
        )

        # Get or create floors
        def get_floor(building, fn):
            fl, _ = Floor.objects.get_or_create(
                tenant=tenant, building=building, floor_number=fn,
                defaults={'name': f'Floor {fn}'}
            )
            return fl

        # Room types
        rt_cr, _ = RoomType.objects.get_or_create(
            tenant=tenant, type_code='classroom', defaults={'name': 'Classroom'}
        )
        rt_lab, _ = RoomType.objects.get_or_create(
            tenant=tenant, type_code='lab', defaults={'name': 'Laboratory'}
        )
        rt_sem, _ = RoomType.objects.get_or_create(
            tenant=tenant, type_code='seminar_hall', defaults={'name': 'Seminar Hall'}
        )

        # Master room definitions
        # Format: (room_number, room_name, capacity, room_type, building, floor_number)
        room_defs = [
            # ── Classrooms (Academic Block A) - can seat 60+ students ──────────
            ('LH-A101', 'Lecture Hall A-101', 120, rt_cr, bld_a, 1),
            ('LH-A102', 'Lecture Hall A-102', 120, rt_cr, bld_a, 1),
            ('CR-A201', 'Classroom A-201',     65, rt_cr, bld_a, 2),
            ('CR-A202', 'Classroom A-202',     65, rt_cr, bld_a, 2),
            ('CR-A203', 'Classroom A-203',     65, rt_cr, bld_a, 2),
            ('CR-A204', 'Classroom A-204',     65, rt_cr, bld_a, 2),
            ('CR-A301', 'Classroom A-301',     65, rt_cr, bld_a, 3),
            ('CR-A302', 'Classroom A-302',     65, rt_cr, bld_a, 3),
            ('CR-A303', 'Classroom A-303',     65, rt_cr, bld_a, 3),
            ('CR-A304', 'Classroom A-304',     65, rt_cr, bld_a, 3),

            # ── Classrooms (Academic Block B) ────────────────────────────────
            ('CR-B101', 'Classroom B-101',     65, rt_cr, bld_b, 1),
            ('CR-B102', 'Classroom B-102',     65, rt_cr, bld_b, 1),
            ('CR-B201', 'Classroom B-201',     65, rt_cr, bld_b, 2),
            ('CR-B202', 'Classroom B-202',     65, rt_cr, bld_b, 2),
            ('SH-B301', 'Seminar Hall B-301',  90, rt_sem, bld_b, 3),
            ('SH-B302', 'Seminar Hall B-302',  90, rt_sem, bld_b, 3),

            # ── Labs (Lab Block) - 60 capacity for full batch practicals ──────
            ('CL-L101', 'Computer Lab 1',      60, rt_lab, lab_bld, 1),
            ('CL-L102', 'Computer Lab 2',      60, rt_lab, lab_bld, 1),
            ('CL-L103', 'Computer Lab 3',      60, rt_lab, lab_bld, 1),
            ('EL-L201', 'Electronics Lab 1',   60, rt_lab, lab_bld, 2),
            ('EL-L202', 'Electronics Lab 2',   60, rt_lab, lab_bld, 2),
            ('PL-L203', 'Physics Lab',         60, rt_lab, lab_bld, 2),
            ('ML-L301', 'Mech Lab',            60, rt_lab, lab_bld, 3),
            ('NW-L302', 'Networking Lab',      60, rt_lab, lab_bld, 3),
        ]

        created = 0
        updated = 0
        for rn, rm_name, cap, rt, bld, fn in room_defs:
            fl = get_floor(bld, fn)
            r, new = Room.objects.get_or_create(
                tenant=tenant, building=bld, room_number=rn,
                defaults={
                    'room_name': rm_name,
                    'floor': fl,
                    'room_type': rt,
                    'capacity': cap,
                    'status': 'active',
                }
            )
            if new:
                created += 1
                self.stdout.write(f'  [NEW] {rn}: {rm_name} (cap={cap}, type={rt.type_code})')
            else:
                # Update capacity and status on existing rooms
                if r.capacity != cap or r.status != 'active':
                    r.capacity = cap
                    r.status = 'active'
                    r.room_type = rt
                    r.save()
                    updated += 1

        # Also update any old lab rooms to be active with capacity >= 60
        updated_old = Room.objects.filter(
            tenant=tenant,
            room_type__type_code='lab',
            capacity__lt=60,
            status='active'
        ).update(capacity=60)

        self.stdout.write(self.style.SUCCESS(
            f'\n\nRoom seeding complete!\n'
            f'  Created: {created} new rooms\n'
            f'  Updated: {updated} existing rooms\n'
            f'  Legacy lab capacity fix: {updated_old} rooms upgraded to cap=60\n\n'
            f'Room Summary:\n'
            f'  Lecture Halls (120 cap): 2\n'
            f'  Classrooms (65 cap): 12\n'
            f'  Seminar Halls (90 cap): 2\n'
            f'  Labs (60 cap): 8\n'
            f'\nTotal: 24 rooms ready for auto-scheduling!'
        ))
