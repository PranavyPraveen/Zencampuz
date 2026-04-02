"""
Comprehensive demo data seed for ZencampuZ.

Idempotent: safe to run multiple times (uses get_or_create throughout).
Creates:
  - 3 campuses (Main, North, South)
  - Departments linked to campuses
  - Programs, Semesters, Batches, Sections
  - Faculty (CustomUser + FacultyProfile) mapped to departments
  - Students (CustomUser with student role) mapped to campus/dept via user.campus/department text fields
  - Courses mapped to departments + semesters
  - CourseSections (faculty–course assignments)
  - Rooms, Buildings, Floors per campus
  - Timetable working-days and time-slots
"""

import random
from datetime import date, time, timedelta, datetime
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from tenants.models import Tenant
from accounts.models import CustomUser, Role
from campus.models import FacilityTag, RoomType, Campus, Building, Floor, Room
from academics.models import (
    Department, Program, Semester, Batch, Section,
    Course, FacultyProfile, CourseSection, FacultyAvailability
)
from timetable.models import (
    WorkingDay, TimeSlotTemplate, TimetablePlan, TimetableSlot,
    ClassSession, RoomAssignment, FacultyAssignment
)


# ─── Helper ──────────────────────────────────────────────────────────────────

class Command(BaseCommand):
    help = "Seeds comprehensive demo data across multiple campuses for all modules."

    def add_arguments(self, parser):
        parser.add_argument('--tenant', default=None,
                            help="Subdomain of the tenant to seed (default: first / fefka).")

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("🌱 Starting comprehensive seed…"))

        with transaction.atomic():
            tenant = self._get_tenant(options.get('tenant'))
            self._ensure_modules_enabled(tenant)

            roles   = self._ensure_roles()
            campus_data = self._seed_campuses(tenant)
            self._seed_rooms_per_campus(tenant, campus_data)
            academics = self._seed_academics(tenant, campus_data)
            self._seed_faculty(tenant, roles['faculty'], campus_data, academics)
            self._seed_students(tenant, roles['student'], campus_data, academics)
            self._seed_timetable_base(tenant)

        self.stdout.write(self.style.SUCCESS("✅  Seed complete!"))

    # ─── Tenant ──────────────────────────────────────────────────────────────

    def _get_tenant(self, subdomain):
        if subdomain:
            tenant = Tenant.objects.filter(subdomain=subdomain).first()
        else:
            tenant = Tenant.objects.filter(subdomain='fefka').first() or Tenant.objects.first()

        if not tenant:
            tenant = Tenant.objects.create(
                tenant_name="Fefka Institute of Technology",
                subdomain="fefka",
                is_active=True,
            )
            self.stdout.write(f"  Created tenant: {tenant.tenant_name}")
        else:
            self.stdout.write(f"  Using tenant: {tenant.tenant_name} ({tenant.subdomain})")
        return tenant

    def _ensure_modules_enabled(self, tenant):
        changed = False
        for field in ['has_timetable', 'has_exams', 'has_bookings', 'has_resources', 'has_reports']:
            if not getattr(tenant, field, False):
                setattr(tenant, field, True)
                changed = True
        if changed:
            tenant.save()

    # ─── Roles ───────────────────────────────────────────────────────────────

    def _ensure_roles(self):
        faculty_role, _ = Role.objects.get_or_create(name='faculty',  defaults={'description': 'Faculty Member'})
        student_role, _ = Role.objects.get_or_create(name='student',  defaults={'description': 'Student'})
        admin_role, _   = Role.objects.get_or_create(name='tenant_admin', defaults={'description': 'Tenant Admin'})
        return {'faculty': faculty_role, 'student': student_role, 'admin': admin_role}

    # ─── Campuses ────────────────────────────────────────────────────────────

    CAMPUS_DEFS = [
        {"name": "Main Campus",  "suffix": "main",  "address": "1, University Road, City"},
        {"name": "North Campus", "suffix": "north", "address": "20, North Avenue, City"},
        {"name": "South Campus", "suffix": "south", "address": "45, South Ring Road, City"},
    ]

    DEPT_DEFS = [
        {"name": "Computer Science & Engineering", "code": "CSE"},
        {"name": "Electronics & Communication",    "code": "ECE"},
        {"name": "Mechanical Engineering",          "code": "MECH"},
        {"name": "Civil Engineering",               "code": "CIVIL"},
    ]

    def _seed_campuses(self, tenant):
        """Create campuses, and 2 departments per campus."""
        ft_proj, _ = FacilityTag.objects.get_or_create(tenant=tenant, name="Projector")
        ft_ac,   _ = FacilityTag.objects.get_or_create(tenant=tenant, name="Air Conditioning")
        rt_class, _ = RoomType.objects.get_or_create(tenant=tenant, type_code="classroom",   defaults={"name": "Classroom"})
        rt_lab,   _ = RoomType.objects.get_or_create(tenant=tenant, type_code="lab",         defaults={"name": "Laboratory"})
        rt_semi,  _ = RoomType.objects.get_or_create(tenant=tenant, type_code="seminar_hall",defaults={"name": "Seminar Hall"})
        rt_meet,  _ = RoomType.objects.get_or_create(tenant=tenant, type_code="meeting_room",defaults={"name": "Meeting Room"})

        campus_data = []
        for i, cd in enumerate(self.CAMPUS_DEFS):
            campus, _ = Campus.objects.get_or_create(
                tenant=tenant, name=cd["name"],
                defaults={"address": cd["address"], "status": "active"}
            )

            # Two departments per campus (staggered from the 4 dept defs)
            d0 = self.DEPT_DEFS[i % len(self.DEPT_DEFS)]
            d1 = self.DEPT_DEFS[(i + 1) % len(self.DEPT_DEFS)]

            dept_a, _ = Department.objects.get_or_create(
                tenant=tenant, code=f"{d0['code']}-{cd['suffix'].upper()}",
                defaults={"name": f"{d0['name']} ({cd['name']})", "campus": campus, "is_active": True}
            )
            # Patch campus if missing (for re-runs on old data)
            if not dept_a.campus:
                dept_a.campus = campus
                dept_a.save(update_fields=['campus'])

            dept_b, _ = Department.objects.get_or_create(
                tenant=tenant, code=f"{d1['code']}-{cd['suffix'].upper()}",
                defaults={"name": f"{d1['name']} ({cd['name']})", "campus": campus, "is_active": True}
            )
            if not dept_b.campus:
                dept_b.campus = campus
                dept_b.save(update_fields=['campus'])

            campus_data.append({
                "campus":  campus,
                "depts":   [dept_a, dept_b],
                "suffix":  cd["suffix"],
                "rt_class": rt_class,
                "rt_lab":   rt_lab,
                "rt_semi":  rt_semi,
                "ft_proj":  ft_proj,
                "ft_ac":    ft_ac,
            })

        # Also patch any old departments that have no campus (legacy data fix)
        # Map by code prefix if possible:
        for old_dept in Department.objects.filter(tenant=tenant, campus__isnull=True):
            main_campus = campus_data[0]["campus"]
            old_dept.campus = main_campus
            old_dept.save(update_fields=['campus'])
            self.stdout.write(f"  Patched campus for dept: {old_dept.code}")

        self.stdout.write(f"  Seeded {len(campus_data)} campuses with departments.")
        return campus_data

    # ─── Rooms ───────────────────────────────────────────────────────────────

    def _seed_rooms_per_campus(self, tenant, campus_data):
        for cd in campus_data:
            campus = cd["campus"]
            suffix = cd["suffix"].upper()
            rt_class = cd["rt_class"]
            rt_lab   = cd["rt_lab"]
            ft_proj  = cd["ft_proj"]
            ft_ac    = cd["ft_ac"]

            bldg_main, _ = Building.objects.get_or_create(
                tenant=tenant, campus=campus, code=f"BLD-{suffix}-A",
                defaults={"name": f"{campus.name} Block A", "total_floors": 3}
            )
            bldg_lab, _ = Building.objects.get_or_create(
                tenant=tenant, campus=campus, code=f"BLD-{suffix}-B",
                defaults={"name": f"{campus.name} Lab Block", "total_floors": 2}
            )

            floors = {}
            for bldg in [bldg_main, bldg_lab]:
                for fn in [0, 1, 2]:
                    fl, _ = Floor.objects.get_or_create(
                        tenant=tenant, building=bldg, floor_number=fn,
                        defaults={"name": f"Floor {fn}" if fn else "Ground Floor"}
                    )
                    floors[(bldg.code, fn)] = fl

            # Create 3 classrooms + 2 labs per campus
            spec_rooms = [
                (rt_class, bldg_main, 0, f"{suffix}-101", 60),
                (rt_class, bldg_main, 1, f"{suffix}-201", 60),
                (rt_class, bldg_main, 2, f"{suffix}-301", 60),
                (rt_lab,   bldg_lab,  0, f"{suffix}-LAB1", 30),
                (rt_lab,   bldg_lab,  1, f"{suffix}-LAB2", 30),
            ]
            for rt, bldg, fn, rnum, cap in spec_rooms:
                fl = floors[(bldg.code, fn)]
                room, created = Room.objects.get_or_create(
                    tenant=tenant, building=bldg, room_number=rnum,
                    defaults={"campus": campus, "floor": fl, "room_type": rt, "capacity": cap, "has_projector": True}
                )
                if created:
                    room.available_facilities.add(ft_proj, ft_ac)

        self.stdout.write("  Seeded rooms for all campuses.")

    # ─── Academics ───────────────────────────────────────────────────────────

    def _seed_academics(self, tenant, campus_data):
        """Create programs, semesters, batches, sections, courses per campus/dept."""
        result = {}
        for cd in campus_data:
            campus = cd["campus"]
            campus_key = cd["suffix"]
            result[campus_key] = {"campus": campus, "depts": {}}

            for dept in cd["depts"]:
                dept_key = dept.code

                # Programs per dept
                prog_ug, _ = Program.objects.get_or_create(
                    tenant=tenant, code=f"B.TECH-{dept_key}",
                    defaults={"name": f"B.Tech {dept.name.split('(')[0].strip()}", "department": dept, "degree_type": "ug", "duration_years": 4, "total_semesters": 8}
                )
                prog_pg, _ = Program.objects.get_or_create(
                    tenant=tenant, code=f"M.TECH-{dept_key}",
                    defaults={"name": f"M.Tech {dept.name.split('(')[0].strip()}", "department": dept, "degree_type": "pg", "duration_years": 2, "total_semesters": 4}
                )

                # Semesters (sem 1 and 2 for B.Tech)
                sem_1, _ = Semester.objects.get_or_create(
                    tenant=tenant, program=prog_ug, semester_number=1, academic_year="2024-25",
                    defaults={"name": "Semester 1", "term": "odd", "is_current": True}
                )
                sem_2, _ = Semester.objects.get_or_create(
                    tenant=tenant, program=prog_ug, semester_number=2, academic_year="2024-25",
                    defaults={"name": "Semester 2", "term": "even"}
                )
                sem_3, _ = Semester.objects.get_or_create(
                    tenant=tenant, program=prog_ug, semester_number=3, academic_year="2024-25",
                    defaults={"name": "Semester 3", "term": "odd"}
                )

                # Batches
                batch_22, _ = Batch.objects.get_or_create(
                    tenant=tenant, program=prog_ug, start_year=2022,
                    defaults={"name": "2022-2026", "end_year": 2026}
                )
                batch_23, _ = Batch.objects.get_or_create(
                    tenant=tenant, program=prog_ug, start_year=2023,
                    defaults={"name": "2023-2027", "end_year": 2027}
                )
                batch_24, _ = Batch.objects.get_or_create(
                    tenant=tenant, program=prog_ug, start_year=2024,
                    defaults={"name": "2024-2028", "end_year": 2028}
                )

                # Sections
                sections = {}
                for batch, sec_names in [(batch_22, ['A', 'B']), (batch_23, ['A', 'B']), (batch_24, ['A'])]:
                    for sname in sec_names:
                        sec, _ = Section.objects.get_or_create(
                            tenant=tenant, batch=batch, name=sname,
                            defaults={"strength": 60}
                        )
                        sections[f"{batch.start_year}-{sname}"] = sec

                # Dept short code (first 2-3 chars of original code)
                dcode = dept.code.split('-')[0]  # e.g. CSE, ECE

                # Courses per dept
                courses = {}
                course_defs = [
                    (f"{dcode}101", f"Engineering Mathematics I", "theory", 4.0),
                    (f"{dcode}102", f"Introduction to {dcode}", "theory", 3.0),
                    (f"{dcode}103L", f"{dcode} Lab I", "practical", 2.0),
                    (f"{dcode}201", f"Data Structures & Algorithms", "theory", 4.0),
                    (f"{dcode}202", f"Object Oriented Programming", "theory", 3.0),
                    (f"{dcode}203L", f"Programming Lab", "practical", 2.0),
                ]
                for code, name, ctype, creds in course_defs:
                    # Make code unique per campus by prefixing with campus suffix
                    unique_code = f"{campus_key.upper()}-{code}"
                    c, _ = Course.objects.get_or_create(
                        tenant=tenant, code=unique_code,
                        defaults={"name": name, "department": dept, "semester": sem_1, "course_type": ctype, "credits": creds}
                    )
                    courses[code] = c

                result[campus_key]["depts"][dept_key] = {
                    "dept": dept,
                    "programs": {"ug": prog_ug, "pg": prog_pg},
                    "semesters": {"1": sem_1, "2": sem_2, "3": sem_3},
                    "batches": {"2022": batch_22, "2023": batch_23, "2024": batch_24},
                    "sections": sections,
                    "courses": courses
                }

        self.stdout.write("  Seeded academics (programs, semesters, batches, sections, courses).")
        return result

    # ─── Faculty ─────────────────────────────────────────────────────────────

    DESIGNATIONS = ['assistant_professor', 'associate_professor', 'professor', 'lecturer', 'hod']

    def _seed_faculty(self, tenant, faculty_role, campus_data, academics):
        """Create 3 faculty per dept-campus combo with profiles."""
        counter = 1
        for campus_key, camp_info in academics.items():
            for dept_key, dept_info in camp_info["depts"].items():
                dept    = dept_info["dept"]
                courses = list(dept_info["courses"].values())
                sem_1   = dept_info["semesters"]["1"]
                sections = dept_info["sections"]

                faculty_profiles = []
                for j in range(3):
                    email = f"faculty{counter}@{tenant.subdomain}.edu"
                    user, created = CustomUser.objects.get_or_create(
                        email=email,
                        defaults={
                            "full_name":   f"Dr. Faculty {counter}",
                            "tenant":      tenant,
                            "role":        faculty_role,
                            "phone":       f"9900{counter:05d}",
                            "campus":      dept.campus.name if dept.campus else "",
                            "department":  dept.name,
                        }
                    )
                    if created:
                        user.set_password("password123")
                        user.save()
                    # Always update campus/department text so filtering works
                    if not created and (not user.campus or not user.department):
                        user.campus     = dept.campus.name if dept.campus else user.campus or ""
                        user.department = dept.name or user.department or ""
                        user.save(update_fields=['campus', 'department'])

                    # Get or create via user (OneToOneField) — avoids duplicate key error
                    try:
                        profile = FacultyProfile.objects.get(user=user)
                        # Patch dept/tenant if missing
                        changed = False
                        if profile.tenant_id != tenant.pk:
                            profile.tenant = tenant; changed = True
                        if profile.department_id != dept.pk:
                            profile.department = dept; changed = True
                        if changed:
                            profile.save(update_fields=['tenant', 'department'])
                    except FacultyProfile.DoesNotExist:
                        designation = self.DESIGNATIONS[j % len(self.DESIGNATIONS)]
                        profile = FacultyProfile.objects.create(
                            tenant=tenant,
                            user=user,
                            employee_id=f"EMP{2000 + counter}",
                            department=dept,
                            designation=designation,
                            max_weekly_hours=18,
                            status="active",
                        )

                    faculty_profiles.append(profile)
                    counter += 1

                # Assign courses to sections via CourseSections
                for si, (sec_key, sec) in enumerate(sections.items()):
                    for ci, course in enumerate(courses[:3]):  # first 3 courses
                        fp = faculty_profiles[ci % len(faculty_profiles)]
                        CourseSection.objects.get_or_create(
                            tenant=tenant, course=course, section=sec, semester=sem_1,
                            defaults={"faculty": fp}
                        )

        self.stdout.write("  Seeded faculty users and profiles with course assignments.")


    # ─── Students ────────────────────────────────────────────────────────────

    STUDENT_FIRST = ["Aarav", "Diya", "Rohan", "Priya", "Arjun", "Sneha", "Karthik", "Ananya",
                     "Vikram", "Kavya", "Aditya", "Pooja", "Rahul", "Meera", "Siddharth"]
    STUDENT_LAST  = ["Sharma", "Patel", "Reddy", "Kumar", "Singh", "Nair", "Gupta", "Iyer",
                     "Rao", "Joshi", "Mehta", "Das", "Mishra", "Shah", "Verma"]

    def _seed_students(self, tenant, student_role, campus_data, academics):
        """Create 5-8 students per section, mapped to campus and department."""
        counter = 1
        total   = 0
        for campus_key, camp_info in academics.items():
            for dept_key, dept_info in camp_info["depts"].items():
                dept     = dept_info["dept"]
                sections = dept_info["sections"]

                for sec_key, section in sections.items():
                    for k in range(6):  # 6 students per section
                        fname = self.STUDENT_FIRST[counter % len(self.STUDENT_FIRST)]
                        lname = self.STUDENT_LAST[(counter + k) % len(self.STUDENT_LAST)]
                        email = f"student{counter}@{tenant.subdomain}.edu"

                        user, created = CustomUser.objects.get_or_create(
                            email=email,
                            defaults={
                                "full_name":   f"{fname} {lname}",
                                "tenant":      tenant,
                                "role":        student_role,
                                "phone":       f"8800{counter:05d}",
                                "campus":      dept.campus.name if dept.campus else "",
                                "department":  dept.name,
                            }
                        )
                        if created:
                            user.set_password("student@123")
                            user.save()
                            total += 1
                        counter += 1

        self.stdout.write(f"  Seeded {total} new student users across all campuses and departments.")

    # ─── Timetable base ──────────────────────────────────────────────────────

    def _seed_timetable_base(self, tenant):
        """Ensure working days and time slots exist."""
        days = ['mon', 'tue', 'wed', 'thu', 'fri']
        for i, d in enumerate(days):
            WorkingDay.objects.get_or_create(
                tenant=tenant, day=d,
                defaults={"order": i + 1, "is_active": True}
            )

        base = time(9, 0)
        for i in range(1, 7):
            start_t = (datetime.combine(date.today(), base) + timedelta(hours=i - 1)).time()
            end_t   = (datetime.combine(date.today(), base) + timedelta(hours=i)).time()
            TimeSlotTemplate.objects.get_or_create(
                tenant=tenant, name=f"Period {i}",
                defaults={"start_time": start_t, "end_time": end_t, "order": i, "is_break": False}
            )

        # Break slots
        TimeSlotTemplate.objects.get_or_create(
            tenant=tenant, name="Lunch Break",
            defaults={"start_time": time(13, 0), "end_time": time(14, 0), "order": 10, "is_break": True}
        )

        self.stdout.write("  Seeded timetable working days and time slots.")
