from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import models
from datetime import timedelta, time, datetime
import random
from django.db import transaction

# Model imports
from tenants.models import Tenant
from accounts.models import CustomUser, Role
from academics.models import Department, Program, Semester, Course, CourseSection, Batch, Section, FacultyProfile
from campus.models import Room, RoomType, Campus, Building, Floor
from bookings.models import BookingRequest, BookingApproval
from timetable.models import WorkingDay, TimeSlotTemplate, TimetablePlan, TimetableSlot, ClassSession, FacultyAssignment as TTFacultyAssignment, RoomAssignment as TTRoomAssignment
from exams.models import ExamPlan, ExamSession, ExamCourseAssignment, ExamHallAllocation, SeatingPlan, InvigilatorAssignment
from campus_reports.views import UnifiedCalendarView # Not a model but verifying app exists

class Command(BaseCommand):
    help = 'Seeds the database with realistic Indian college demo data across all modules.'

    def handle(self, *args, **kwargs):
        self.stdout.write("Starting database seed...")
        
        with transaction.atomic():
            self.seed_superadmin()
            
            # Tenant 1 - Monthly
            t1 = self.seed_tenant('Zenith Institute of Technology', 'zenith', 'monthly')
            self.seed_tenant_data(t1)
            
            # Tenant 2 - Yearly
            t2 = self.seed_tenant('Apex College of Engineering', 'apex', 'yearly')
            self.seed_tenant_data(t2)
            
        self.stdout.write(self.style.SUCCESS("Database successfully seeded with realistic demo data!"))

    def seed_superadmin(self):
        if not CustomUser.objects.filter(email='superadmin@campuzcore.com').exists():
            u = CustomUser.objects.create_superuser(
                email='superadmin@campuzcore.com',
                password='adminpassword123',
                full_name='Platform Admin'
            )
            self.stdout.write(f"Created Super Admin: {u.email}")

    def seed_tenant(self, name, tenant_code, sub_plan):
        tenant, created = Tenant.objects.get_or_create(
            tenant_code=tenant_code,
            defaults={
                'tenant_name': name,
                'subscription_type': sub_plan,
                'status': 'active',
                'has_bookings': True,
                'has_timetable': True,
                'has_exams': True,
                'has_reports': True,
                'has_resources': True,
            }
        )
        if created:
            self.stdout.write(f"Created Tenant: {tenant.tenant_name}")
        return tenant

    def seed_tenant_data(self, tenant):
        self.stdout.write(f"Seeding data for {tenant.tenant_name}...")

        # 1. College Admin
        admin_email = f"principal@{tenant.tenant_code}.edu.in"
        admin_role, _ = Role.objects.get_or_create(name=Role.RoleChoices.TENANT_ADMIN)
        if not CustomUser.objects.filter(email=admin_email).exists():
            CustomUser.objects.create_user(
                email=admin_email,
                password='adminpassword123',
                full_name='Dr. A.K. Sharma',
                tenant=tenant,
                role=admin_role
            )

        # 2. Campus & Rooms
        type_class, _ = RoomType.objects.get_or_create(tenant=tenant, type_code='classroom', defaults={'name': 'Classroom'})
        type_lab, _ = RoomType.objects.get_or_create(tenant=tenant, type_code='lab', defaults={'name': 'Laboratory'})
        type_audi, _ = RoomType.objects.get_or_create(tenant=tenant, type_code='auditorium', defaults={'name': 'Auditorium'})

        main_campus, _ = Campus.objects.get_or_create(tenant=tenant, name='Main Campus', defaults={'address': '123 University Road'})
        block_a, _ = Building.objects.get_or_create(tenant=tenant, campus=main_campus, code='BLD-A', defaults={'name': 'Academic Block A'})
        floor_1, _ = Floor.objects.get_or_create(tenant=tenant, building=block_a, floor_number=1)

        r1, _ = Room.objects.get_or_create(tenant=tenant, room_number='A-101', defaults={'room_name': 'Block A Lecture Hall', 'capacity': 60, 'room_type': type_class, 'campus': main_campus, 'building': block_a, 'floor': floor_1})
        r2, _ = Room.objects.get_or_create(tenant=tenant, room_number='A-102', defaults={'room_name': 'Block A Lecture Hall', 'capacity': 60, 'room_type': type_class, 'campus': main_campus, 'building': block_a, 'floor': floor_1})
        lab1, _ = Room.objects.get_or_create(tenant=tenant, room_number='L-301', defaults={'room_name': 'Computer Science Lab', 'capacity': 60, 'room_type': type_lab, 'campus': main_campus, 'building': block_a, 'floor': floor_1})
        audit, _ = Room.objects.get_or_create(tenant=tenant, room_number='MAIN-AUDI', defaults={'room_name': 'Silver Jubilee Auditorium', 'capacity': 500, 'room_type': type_audi, 'campus': main_campus, 'building': block_a, 'floor': floor_1})
        
        # 3. Academics
        cs_dept, _ = Department.objects.get_or_create(tenant=tenant, code='CSE', defaults={'name': 'Computer Science and Engineering'})
        me_dept, _ = Department.objects.get_or_create(tenant=tenant, code='ME', defaults={'name': 'Mechanical Engineering'})

        btech_cs, _ = Program.objects.get_or_create(tenant=tenant, code='BTECH-CS', department=cs_dept, defaults={'name': 'B.Tech in Computer Science', 'duration_years': 4})
        
        sem_fall, _ = Semester.objects.get_or_create(tenant=tenant, program=btech_cs, term=1, academic_year='2024-2025', semester_number=1, defaults={'name': 'Fall 2024', 'start_date': timezone.now().date(), 'end_date': timezone.now().date() + timedelta(days=120)})

        c1, _ = Course.objects.get_or_create(tenant=tenant, code='CS101', department=cs_dept, defaults={'name': 'Introduction to Programming', 'credits': 4, 'course_type': 'core'})
        c2, _ = Course.objects.get_or_create(tenant=tenant, code='CS102', department=cs_dept, defaults={'name': 'Data Structures Lab', 'credits': 2, 'course_type': 'lab'})

        fac_role, _ = Role.objects.get_or_create(name=Role.RoleChoices.FACULTY)
        fac1, created = CustomUser.objects.get_or_create(email=f'arun.kumar@{tenant.tenant_code}.edu.in', defaults={'full_name': 'Arun Kumar', 'tenant': tenant, 'role': fac_role})
        if created: fac1.set_password('password123'); fac1.save()
        fp1, _ = FacultyProfile.objects.get_or_create(tenant=tenant, user=fac1, defaults={'department': cs_dept, 'designation': 'Assistant Professor', 'employee_id': 'EMP1001'})
        
        fac2, created = CustomUser.objects.get_or_create(email=f's.iyer@{tenant.tenant_code}.edu.in', defaults={'full_name': 'Sanjay Iyer', 'tenant': tenant, 'role': fac_role})
        if created: fac2.set_password('password123'); fac2.save()
        fp2, _ = FacultyProfile.objects.get_or_create(tenant=tenant, user=fac2, defaults={'department': cs_dept, 'designation': 'Associate Professor', 'employee_id': 'EMP1002'})

        batch1, _ = Batch.objects.get_or_create(tenant=tenant, program=btech_cs, name='2024-28', defaults={'start_year': 2024, 'end_year': 2028})
        sec_a, _ = Section.objects.get_or_create(tenant=tenant, batch=batch1, name='A', defaults={'strength': 55})
        
        cs1, _ = CourseSection.objects.get_or_create(tenant=tenant, course=c1, section=sec_a, semester=sem_fall, defaults={'faculty': fp1})
        cs2, _ = CourseSection.objects.get_or_create(tenant=tenant, course=c2, section=sec_a, semester=sem_fall, defaults={'faculty': fp2})

        # 4. Bookings
        stud_role, _ = Role.objects.get_or_create(name=Role.RoleChoices.STUDENT)
        stud1, created = CustomUser.objects.get_or_create(email=f'student.24@{tenant.tenant_code}.edu.in', defaults={'full_name': 'Rahul Verma', 'tenant': tenant, 'role': stud_role})
        if created: stud1.set_password('password123'); stud1.save()
        br1, _ = BookingRequest.objects.get_or_create(
            tenant=tenant,
            room=audit,
            requested_by=stud1,
            title='TechFest 2024 Orientation',
            start_time=timezone.now() + timedelta(days=2),
            end_time=timezone.now() + timedelta(days=2, hours=3),
            defaults={'status': 'approved', 'purpose': 'Orientation for new members'}
        )
        
        # 5. Timetable
        mon, _ = WorkingDay.objects.get_or_create(tenant=tenant, day='mon', defaults={'order': 1})
        tue, _ = WorkingDay.objects.get_or_create(tenant=tenant, day='tue', defaults={'order': 2})
        t_9am, _ = TimeSlotTemplate.objects.get_or_create(tenant=tenant, start_time=time(9,0), end_time=time(10,0), defaults={'name': 'Period 1'})
        t_10am, _ = TimeSlotTemplate.objects.get_or_create(tenant=tenant, start_time=time(10,0), end_time=time(12,0), defaults={'name': 'Period 2 (Lab)'})

        plan, _ = TimetablePlan.objects.get_or_create(tenant=tenant, name='Fall 2024 Master Schedule', semester=sem_fall, section=sec_a, valid_from=timezone.now().date(), valid_to=timezone.now().date() + timedelta(days=120), defaults={'status': 'published'})
        
        slot1, _ = TimetableSlot.objects.get_or_create(tenant=tenant, plan=plan, day=mon, time_slot=t_9am)
        slot2, _ = TimetableSlot.objects.get_or_create(tenant=tenant, plan=plan, day=mon, time_slot=t_10am)

        sess1, _ = ClassSession.objects.get_or_create(tenant=tenant, timetable_slot=slot1, course_section=cs1, defaults={'session_type': 'regular'})
        TTFacultyAssignment.objects.get_or_create(tenant=tenant, class_session=sess1, faculty=fac1)
        r_assign1, _ = TTRoomAssignment.objects.get_or_create(tenant=tenant, class_session=sess1, room=r1)
        r_assign1.save(update_fields=['class_session', 'room']) # Avoid clean()

        sess2, _ = ClassSession.objects.get_or_create(tenant=tenant, timetable_slot=slot2, course_section=cs2, defaults={'session_type': 'lab'})
        TTFacultyAssignment.objects.get_or_create(tenant=tenant, class_session=sess2, faculty=fac2)
        r_assign2, _ = TTRoomAssignment.objects.get_or_create(tenant=tenant, class_session=sess2, room=lab1)
        r_assign2.save(update_fields=['class_session', 'room'])

        # 6. Exams
        ep, _ = ExamPlan.objects.get_or_create(
            tenant=tenant, 
            name='Fall 2024 Mid-Terms', 
            semester=sem_fall, 
            defaults={
                'status': 'published',
                'start_date': timezone.now().date() + timedelta(days=15),
                'end_date': timezone.now().date() + timedelta(days=25)
            }
        )
        esess1, _ = ExamSession.objects.get_or_create(tenant=tenant, plan=ep, name='Morning Slot', date=ep.start_date, defaults={'start_time': time(9,30), 'end_time': time(12,30)})
        
        # Bypass clean triggers to easily inject dummy data
        eca1, _ = ExamCourseAssignment.objects.get_or_create(tenant=tenant, session=esess1, course_section=cs1)
        
        eha1, _ = ExamHallAllocation.objects.get_or_create(tenant=tenant, session=esess1, room=r1)
        
        sp, _ = SeatingPlan.objects.get_or_create(tenant=tenant, exam_assignment=eca1, hall_allocation=eha1, defaults={'allocated_count': 55})
        if sp.allocated_count != 55:
            sp.allocated_count = 55
            sp.save(update_fields=['allocated_count'])
        
        iv, _ = InvigilatorAssignment.objects.get_or_create(tenant=tenant, hall_allocation=eha1, faculty=fac1, defaults={'is_chief': True})

        self.stdout.write(f"  -> Finished {tenant.tenant_name}")
