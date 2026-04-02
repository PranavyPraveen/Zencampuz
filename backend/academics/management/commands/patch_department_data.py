"""
patch_department_data.py

Finds every Department in the database that has 0 users mapped to it.
For each empty department, seeds:
  - 3 Faculty profiles
  - 8 Student profiles
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import CustomUser, Role
from academics.models import (
    Department, Program, Semester, Batch, Section,
    Course, FacultyProfile, CourseSection
)

class Command(BaseCommand):
    help = "Patches empty departments: adds faculty and students to them."

    def handle(self, *args, **options):
        faculty_role, _ = Role.objects.get_or_create(name='faculty', defaults={'description': 'Faculty Member'})
        student_role, _ = Role.objects.get_or_create(name='student', defaults={'description': 'Student'})

        all_depts = list(Department.objects.all())
        patched = 0

        for dept in all_depts:
            if not dept.campus:
                continue # Needs a campus to map properly
                
            tenant = dept.tenant

            user_count = CustomUser.objects.filter(
                tenant=tenant, 
                campus=dept.campus.name,
                department=dept.name
            ).count()

            if user_count > 0:
                self.stdout.write(f"  {dept.name} ({dept.campus.name}): {user_count} users already — skipping.")
                continue

            self.stdout.write(f"  {dept.name} ({dept.campus.name}): no users — patching…")
            with transaction.atomic():
                self._patch_one_dept(tenant, dept.campus, dept, faculty_role, student_role)
            patched += 1

        self.stdout.write(self.style.SUCCESS(f"Done — patched {patched} department(s)."))

    FIRST_NAMES = ["Aarav", "Diya", "Rohan", "Priya", "Arjun", "Sneha", "Karthik", "Ananya", "Vikram", "Kavya", "Aditya"]
    LAST_NAMES  = ["Sharma", "Patel", "Reddy", "Kumar", "Singh", "Nair", "Gupta", "Iyer", "Rao", "Joshi", "Mehta"]

    def _patch_one_dept(self, tenant, campus, dept, faculty_role, student_role):
        # Ensure basic academic structure exists for this dept
        prog, _ = Program.objects.get_or_create(
            tenant=tenant, code=f"BTECH-{dept.code}",
            defaults={"name": f"B.Tech {dept.name.split('(')[0].strip()}", "department": dept, "degree_type": "ug", "duration_years": 4, "total_semesters": 8}
        )
        sem, _ = Semester.objects.get_or_create(
            tenant=tenant, program=prog, semester_number=1, academic_year="2024-25",
            defaults={"name": "Semester 1", "term": "odd", "is_current": True}
        )
        batch, _ = Batch.objects.get_or_create(
            tenant=tenant, program=prog, start_year=2024,
            defaults={"name": "2024-2028", "end_year": 2028}
        )
        section, _ = Section.objects.get_or_create(
            tenant=tenant, batch=batch, name="A",
            defaults={"strength": 60}
        )

        courses = []
        for i, (ccode, cname, ctype) in enumerate([
            (f"{dept.code}-101", "Engineering Mathematics I", "theory"),
            (f"{dept.code}-102", f"Intro to {dept.code.split('-')[0]}", "theory"),
            (f"{dept.code}-103L", "Lab I", "practical"),
        ]):
            c, _ = Course.objects.get_or_create(
                tenant=tenant, code=ccode,
                defaults={"name": cname, "department": dept, "semester": sem, "course_type": ctype, "credits": 3.0}
            )
            courses.append(c)

        import hashlib

        # 3 Faculty
        faculty_profiles = []
        for j in range(3):
            tag = hashlib.md5(f"{campus.name}-{dept.code}-{j}".encode()).hexdigest()[:6]
            email = f"fac.{tag}@{tenant.subdomain}.edu"
            fname = self.FIRST_NAMES[(j * 3) % len(self.FIRST_NAMES)]
            lname = self.LAST_NAMES[(j * 2 + 1) % len(self.LAST_NAMES)]

            user, created = CustomUser.objects.get_or_create(
                email=email,
                defaults={
                    "full_name":  f"Dr. {fname} {lname}",
                    "tenant":     tenant,
                    "role":       faculty_role,
                    "campus":     campus.name,
                    "department": dept.name,
                }
            )
            if created:
                user.set_password("password123")
                user.save()
            elif not user.campus or not user.department:
                user.campus = campus.name
                user.department = dept.name
                user.save(update_fields=['campus', 'department'])

            try:
                profile = FacultyProfile.objects.get(user=user)
            except FacultyProfile.DoesNotExist:
                emp_tag = hashlib.md5(f"EMP-{campus.name}-{dept.code}-{j}".encode()).hexdigest()[:6]
                profile = FacultyProfile.objects.create(
                    tenant=tenant, user=user, employee_id=f"EMP-{emp_tag}", department=dept,
                    designation=['assistant_professor', 'associate_professor', 'professor'][j],
                    max_weekly_hours=18, status="active",
                )
            faculty_profiles.append(profile)

            if j < len(courses):
                CourseSection.objects.get_or_create(
                    tenant=tenant, course=courses[j], section=section, semester=sem,
                    defaults={"faculty": profile}
                )

        # 8 Students
        for k in range(8):
            tag = hashlib.md5(f"STU-{campus.name}-{dept.code}-{k}".encode()).hexdigest()[:6]
            email = f"stu.{tag}@{tenant.subdomain}.edu"
            fname = self.FIRST_NAMES[(k + 2) % len(self.FIRST_NAMES)]
            lname = self.LAST_NAMES[(k + 3) % len(self.LAST_NAMES)]

            user, created = CustomUser.objects.get_or_create(
                email=email,
                defaults={
                    "full_name":  f"{fname} {lname}",
                    "tenant":     tenant,
                    "role":       student_role,
                    "campus":     campus.name,
                    "department": dept.name,
                }
            )
            if created:
                user.set_password("student@123")
                user.save()
            elif not user.campus or not user.department:
                user.campus = campus.name
                user.department = dept.name
                user.save(update_fields=['campus', 'department'])

        self.stdout.write(f"    ✓ {dept.name}: added 3 faculty, 8 students.")
