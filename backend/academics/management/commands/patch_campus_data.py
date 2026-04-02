"""
patch_campus_data — Idempotent.

Finds every campus for the tenant that has NO users mapped to it and:
  1. Creates departments for that campus (if missing).
  2. Creates faculty users + FacultyProfiles linked to those depts.
  3. Creates student users linked to those depts.

Safe to run multiple times — uses get_or_create throughout.
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from tenants.models import Tenant
from accounts.models import CustomUser, Role
from academics.models import (
    Department, Program, Semester, Batch, Section,
    Course, FacultyProfile, CourseSection
)


class Command(BaseCommand):
    help = "Patches campuses that have no users: adds departments, faculty and students to them."

    def add_arguments(self, parser):
        parser.add_argument('--tenant', default=None,
                            help="Subdomain of the tenant (default: fefka / first tenant).")

    def handle(self, *args, **options):
        tenant = self._get_tenant(options.get('tenant'))
        self.stdout.write(f"Tenant: {tenant.tenant_name}")

        faculty_role, _ = Role.objects.get_or_create(name='faculty',  defaults={'description': 'Faculty Member'})
        student_role, _ = Role.objects.get_or_create(name='student',  defaults={'description': 'Student'})

        from campus.models import Campus
        all_campuses = list(Campus.objects.filter(tenant=tenant))

        patched = 0
        for campus in all_campuses:
            # Count users whose campus text field matches this campus name
            user_count = CustomUser.objects.filter(
                tenant=tenant, campus=campus.name
            ).count()

            if user_count > 0:
                self.stdout.write(f"  {campus.name}: {user_count} users already — skipping.")
                continue

            self.stdout.write(f"  {campus.name}: no users — patching…")
            with transaction.atomic():
                self._patch_one_campus(tenant, campus, faculty_role, student_role)
            patched += 1

        self.stdout.write(self.style.SUCCESS(
            f"Done — patched {patched} campus(es)."
        ))

    # ─── Helpers ──────────────────────────────────────────────────────────────

    def _get_tenant(self, subdomain):
        if subdomain:
            t = Tenant.objects.filter(subdomain=subdomain).first()
        else:
            t = Tenant.objects.filter(subdomain='fefka').first() or Tenant.objects.first()
        if not t:
            self.stderr.write("No tenant found.")
            raise SystemExit(1)
        return t

    DEPT_TEMPLATES = [
        {"name": "Computer Science & Engineering", "code_prefix": "CSE"},
        {"name": "Electronics & Communication",    "code_prefix": "ECE"},
    ]

    FIRST_NAMES = ["Aarav", "Diya", "Rohan", "Priya", "Arjun", "Sneha",
                   "Karthik", "Ananya", "Vikram", "Kavya", "Aditya"]
    LAST_NAMES  = ["Sharma", "Patel", "Reddy", "Kumar", "Singh", "Nair",
                   "Gupta", "Iyer", "Rao", "Joshi", "Mehta"]

    def _slug(self, campus):
        """Short alphanumeric safe slug from campus name."""
        import re
        return re.sub(r'[^A-Z0-9]', '', campus.name.upper())[:6] or "CAM"

    def _patch_one_campus(self, tenant, campus, faculty_role, student_role):
        slug = self._slug(campus)

        depts = []
        for tmpl in self.DEPT_TEMPLATES:
            code = f"{tmpl['code_prefix']}-{slug}"
            dept, _ = Department.objects.get_or_create(
                tenant=tenant, code=code,
                defaults={
                    "name": f"{tmpl['name']} ({campus.name})",
                    "campus": campus,
                    "is_active": True,
                }
            )
            if not dept.campus:
                dept.campus = campus
                dept.save(update_fields=['campus'])
            depts.append(dept)

        for dept in depts:
            prog, _ = Program.objects.get_or_create(
                tenant=tenant, code=f"BTECH-{dept.code}",
                defaults={
                    "name": f"B.Tech {dept.name.split('(')[0].strip()}",
                    "department": dept, "degree_type": "ug",
                    "duration_years": 4, "total_semesters": 8,
                }
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

            # Courses
            courses = []
            for i, (ccode, cname, ctype) in enumerate([
                (f"{dept.code}-101", "Engineering Mathematics I", "theory"),
                (f"{dept.code}-102", f"Intro to {dept.code.split('-')[0]}", "theory"),
                (f"{dept.code}-103L", "Lab I", "practical"),
            ]):
                c, _ = Course.objects.get_or_create(
                    tenant=tenant, code=ccode,
                    defaults={"name": cname, "department": dept, "semester": sem,
                              "course_type": ctype, "credits": 3.0}
                )
                courses.append(c)

            # 3 Faculty
            faculty_profiles = []
            for j in range(3):
                # Use a deterministic but unique email
                import hashlib
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
                elif not user.campus:
                    user.campus = campus.name
                    user.department = dept.name
                    user.save(update_fields=['campus', 'department'])

                try:
                    profile = FacultyProfile.objects.get(user=user)
                except FacultyProfile.DoesNotExist:
                    emp_tag = hashlib.md5(f"EMP-{campus.name}-{dept.code}-{j}".encode()).hexdigest()[:6]
                    profile = FacultyProfile.objects.create(
                        tenant=tenant,
                        user=user,
                        employee_id=f"EMP-{emp_tag}",
                        department=dept,
                        designation=['assistant_professor', 'associate_professor', 'professor'][j],
                        max_weekly_hours=18,
                        status="active",
                    )

                faculty_profiles.append(profile)

                # Assign course
                if j < len(courses):
                    CourseSection.objects.get_or_create(
                        tenant=tenant, course=courses[j], section=section, semester=sem,
                        defaults={"faculty": profile}
                    )

            # 8 Students
            for k in range(8):
                import hashlib
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
                elif not user.campus:
                    user.campus = campus.name
                    user.department = dept.name
                    user.save(update_fields=['campus', 'department'])

        self.stdout.write(f"    ✓ {campus.name}: added depts, {3 * len(depts)} faculty, {8 * len(depts)} students.")
