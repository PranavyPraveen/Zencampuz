import uuid
from django.db import models
from tenants.models import Tenant
from accounts.models import CustomUser


# ──────────────────────────────────────────────
# DEPARTMENT
# ──────────────────────────────────────────────

class Department(models.Model):
    """
    Academic department within a tenant (college).
    Supports both Indian UG/PG structures flexibly.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='departments')
    campus = models.ForeignKey('campus.Campus', on_delete=models.SET_NULL, null=True, blank=True, related_name='departments')
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=20)
    description = models.TextField(blank=True)
    head_of_department = models.ForeignKey(
        CustomUser, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='hod_departments'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('tenant', 'code')
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class SubjectDomain(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='subject_domains')
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='subject_domains')
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('tenant', 'department', 'name')
        ordering = ['name']

    def __str__(self):
        return f"{self.department.code} | {self.name}"


# ──────────────────────────────────────────────
# PROGRAM
# ──────────────────────────────────────────────

class Program(models.Model):
    SYLLABUS_PARSE_STATUS = [
        ('not_uploaded', 'Not Uploaded'),
        ('uploaded', 'Uploaded'),
        ('parsed', 'Parsed'),
        ('failed', 'Failed'),
    ]
    DEGREE_TYPES = [
        ('ug', 'Under Graduate (UG)'),
        ('pg', 'Post Graduate (PG)'),
        ('diploma', 'Diploma'),
        ('phd', 'Ph.D / Research'),
        ('integrated', 'Integrated (5-year)'),
        ('certificate', 'Certificate'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='programs')
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='programs')
    name = models.CharField(max_length=255, help_text="e.g. B.E. Computer Science, M.Sc. Physics")
    code = models.CharField(max_length=20)
    degree_type = models.CharField(max_length=20, choices=DEGREE_TYPES, default='ug')
    duration_years = models.PositiveSmallIntegerField(default=4)
    total_semesters = models.PositiveSmallIntegerField(default=8)
    syllabus_overview = models.TextField(blank=True)
    syllabus_document_url = models.URLField(blank=True)
    syllabus_file = models.FileField(upload_to='syllabus/programmes/', null=True, blank=True)
    syllabus_parse_status = models.CharField(max_length=20, choices=SYLLABUS_PARSE_STATUS, default='not_uploaded')
    syllabus_raw_text = models.TextField(blank=True)
    syllabus_extracted_subjects = models.JSONField(default=list, blank=True)
    syllabus_last_error = models.TextField(blank=True)
    syllabus_updated_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('tenant', 'code')
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"


# ──────────────────────────────────────────────
# SEMESTER
# ──────────────────────────────────────────────

class Semester(models.Model):
    TERM_CHOICES = [
        ('odd', 'Odd Semester'),
        ('even', 'Even Semester'),
        ('summer', 'Summer Term'),
        ('trimester_1', 'Trimester 1'),
        ('trimester_2', 'Trimester 2'),
        ('trimester_3', 'Trimester 3'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='semesters')
    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name='semesters')
    name = models.CharField(max_length=100, help_text="e.g. Semester 1, Sem-III")
    semester_number = models.PositiveSmallIntegerField(help_text="Numeric order within program")
    term = models.CharField(max_length=20, choices=TERM_CHOICES, default='odd')
    academic_year = models.CharField(max_length=20, help_text="e.g. 2024-25")
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    is_current = models.BooleanField(default=False)

    class Meta:
        unique_together = ('tenant', 'program', 'semester_number', 'academic_year')
        ordering = ['program', 'semester_number']

    def __str__(self):
        return f"{self.program.code} | {self.name} ({self.academic_year})"


# ──────────────────────────────────────────────
# COURSE
# ──────────────────────────────────────────────

class Course(models.Model):
    COURSE_TYPES = [
        ('theory', 'Theory'),
        ('practical', 'Practical / Lab'),
        ('tutorial', 'Tutorial'),
        ('project', 'Project'),
        ('elective', 'Elective'),
        ('audit', 'Audit / Non-Credit'),
        ('online', 'Online / MOOC'),
        ('seminar', 'Seminar'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='courses')
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='courses')
    semester = models.ForeignKey(Semester, on_delete=models.SET_NULL, null=True, blank=True, related_name='courses')
    primary_domain = models.ForeignKey(SubjectDomain, on_delete=models.SET_NULL, null=True, blank=True, related_name='primary_courses')
    secondary_domain = models.ForeignKey(SubjectDomain, on_delete=models.SET_NULL, null=True, blank=True, related_name='secondary_courses')
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=30)
    course_type = models.CharField(max_length=20, choices=COURSE_TYPES, default='theory')
    credits = models.DecimalField(max_digits=4, decimal_places=1, default=3.0)
    lecture_hours = models.PositiveSmallIntegerField(default=3)
    tutorial_hours = models.PositiveSmallIntegerField(default=1)
    practical_hours = models.PositiveSmallIntegerField(default=0)
    is_elective = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('tenant', 'code')
        ordering = ['code']

    def total_hours(self):
        return self.lecture_hours + self.tutorial_hours + self.practical_hours

    def __str__(self):
        return f"{self.code} — {self.name}"


# ──────────────────────────────────────────────
# BATCH & SECTION
# ──────────────────────────────────────────────

class Batch(models.Model):
    """
    e.g. 2022-2026 B.E. CSE batch. Groups students by year of admission.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='batches')
    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name='batches')
    name = models.CharField(max_length=100, help_text="e.g. 2022-2026")
    start_year = models.PositiveIntegerField()
    end_year = models.PositiveIntegerField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('tenant', 'program', 'start_year')
        ordering = ['-start_year']

    def __str__(self):
        return f"{self.program.code} | {self.name}"


class Section(models.Model):
    """
    A section within a batch/program (e.g. Section A, Section B).
    Indian colleges commonly have multiple parallel sections.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='sections')
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name='sections')
    name = models.CharField(max_length=50, help_text="e.g. A, B, C")
    strength = models.PositiveSmallIntegerField(default=60)
    class_advisor = models.ForeignKey(
        CustomUser, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='advised_sections'
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('batch', 'name')
        ordering = ['batch', 'name']

    def __str__(self):
        return f"{self.batch} | Section {self.name}"


class StudentGroup(models.Model):
    """
    Optional: sub-grouping within a section for labs, projects, etc.
    e.g. Lab Group 1, Lab Group 2 (each 30 students)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='student_groups')
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='groups')
    name = models.CharField(max_length=100, help_text="e.g. Lab Group 1")
    strength = models.PositiveSmallIntegerField(default=30)

    def __str__(self):
        return f"{self.section} | {self.name}"


# ──────────────────────────────────────────────
# FACULTY PROFILE
# ──────────────────────────────────────────────

class FacultyProfile(models.Model):
    DESIGNATION_CHOICES = [
        ('professor', 'Professor'),
        ('associate_professor', 'Associate Professor'),
        ('assistant_professor', 'Assistant Professor'),
        ('lecturer', 'Lecturer'),
        ('visiting', 'Visiting Faculty'),
        ('adjunct', 'Adjunct Faculty'),
        ('hod', 'Head of Department'),
        ('dean', 'Dean'),
        ('other', 'Other'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('on_leave', 'On Leave'),
        ('retired', 'Retired'),
        ('resigned', 'Resigned'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='faculty_profiles')
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='faculty_profile')
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='faculty')
    employee_id = models.CharField(max_length=50)
    designation = models.CharField(max_length=30, choices=DESIGNATION_CHOICES, default='assistant_professor')
    specialization = models.CharField(max_length=255, blank=True)
    primary_specialization_domain = models.ForeignKey(SubjectDomain, on_delete=models.SET_NULL, null=True, blank=True, related_name='primary_specialization_faculty')
    secondary_specialization_domains = models.ManyToManyField(SubjectDomain, blank=True, related_name='secondary_specialization_faculty')
    max_weekly_hours = models.PositiveSmallIntegerField(default=18, help_text="Max teaching hours per week")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    joined_date = models.DateField(null=True, blank=True)
    qualifications = models.TextField(blank=True)
    # ── Professional Profile Fields ────────────────────────────────────────────
    skills = models.TextField(blank=True, help_text="Comma-separated or freeform list of skills")
    years_of_experience = models.PositiveSmallIntegerField(null=True, blank=True)
    certifications = models.TextField(blank=True)
    research_interests = models.TextField(blank=True)
    industry_experience = models.TextField(blank=True)
    bio = models.TextField(blank=True, help_text="Short professional biography / profile summary")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('tenant', 'employee_id')
        ordering = ['user__full_name']

    def __str__(self):
        return f"{self.user.full_name} | {self.get_designation_display()} | {self.department.code}"


# ──────────────────────────────────────────────
# FACULTY AVAILABILITY
# ──────────────────────────────────────────────

class FacultyAvailability(models.Model):
    DAYS = [
        ('mon', 'Monday'), ('tue', 'Tuesday'), ('wed', 'Wednesday'),
        ('thu', 'Thursday'), ('fri', 'Friday'), ('sat', 'Saturday'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='faculty_availabilities')
    faculty = models.ForeignKey(FacultyProfile, on_delete=models.CASCADE, related_name='availability')
    day = models.CharField(max_length=5, choices=DAYS)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_available = models.BooleanField(default=True)
    note = models.CharField(max_length=200, blank=True)

    class Meta:
        unique_together = ('faculty', 'day', 'start_time')
        ordering = ['faculty', 'day', 'start_time']

    def __str__(self):
        return f"{self.faculty.user.full_name} | {self.get_day_display()} {self.start_time}–{self.end_time}"


# ──────────────────────────────────────────────
# FACULTY PREFERENCE
# ──────────────────────────────────────────────

class FacultyPreference(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted to HOD'),
        ('hod_approved', 'Approved by HOD'),
        ('hod_rejected', 'Rejected by HOD'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='faculty_preferences')
    faculty = models.ForeignKey(FacultyProfile, on_delete=models.CASCADE, related_name='preferences')
    preferred_courses = models.ManyToManyField(Course, blank=True, related_name='preferred_by')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    hod_review_note = models.TextField(blank=True)
    hod_reviewed_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_faculty_preferences')
    hod_reviewed_at = models.DateTimeField(null=True, blank=True)
    preferred_days = models.JSONField(default=list, help_text="e.g. ['mon', 'wed', 'fri']")
    preferred_time_start = models.TimeField(null=True, blank=True)
    preferred_time_end = models.TimeField(null=True, blank=True)
    avoid_early_morning = models.BooleanField(default=False)
    avoid_consecutive_hours = models.BooleanField(default=False)
    max_courses_per_semester = models.PositiveSmallIntegerField(default=4)
    notes = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('tenant', 'faculty')

    def __str__(self):
        return f"Preferences: {self.faculty.user.full_name}"


class FacultyPreferredSubject(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='faculty_preferred_subjects')
    faculty_preference = models.ForeignKey(FacultyPreference, on_delete=models.CASCADE, related_name='ranked_subjects')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='faculty_rankings')
    rank = models.PositiveSmallIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = (
            ('faculty_preference', 'rank'),
            ('faculty_preference', 'course'),
        )
        ordering = ['faculty_preference', 'rank']

    def __str__(self):
        return f"{self.faculty_preference.faculty.user.full_name} | P{self.rank} | {self.course.code}"


class FacultyEligibleSubject(models.Model):
    STATUS_CHOICES = [
        ('auto_suggested', 'Auto Suggested'),
        ('hod_approved', 'HOD Approved'),
        ('hod_rejected', 'HOD Rejected'),
        ('hod_added', 'HOD Added'),
    ]
    SOURCE_CHOICES = [
        ('auto_suggested', 'Auto Suggested'),
        ('hod_added', 'HOD Added'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='faculty_eligible_subjects')
    faculty = models.ForeignKey(FacultyProfile, on_delete=models.CASCADE, related_name='eligible_subjects')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='eligible_faculty')
    source_type = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='auto_suggested')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='auto_suggested')
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('tenant', 'faculty', 'course')
        ordering = ['faculty__user__full_name', 'course__code']

    def __str__(self):
        return f"{self.faculty.user.full_name} | {self.course.code} | {self.status}"


class FacultySubjectAssignment(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('finalized', 'Finalized'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='faculty_subject_assignments')
    faculty = models.ForeignKey(FacultyProfile, on_delete=models.CASCADE, related_name='final_subject_assignments')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='final_faculty_assignments')
    assigned_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_subject_assignments')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('tenant', 'faculty', 'course')
        ordering = ['faculty__user__full_name', 'course__code']

    def __str__(self):
        return f"{self.faculty.user.full_name} -> {self.course.code}"


# ──────────────────────────────────────────────
# COURSE SECTION (Faculty-Course Assignment)
# ──────────────────────────────────────────────

class CourseSection(models.Model):
    """
    Maps a course to a section + faculty for a given semester.
    This is the central assignment record used for timetabling.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='course_sections')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='sections')
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='course_sections')
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name='course_sections')
    faculty = models.ForeignKey(
        FacultyProfile, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='assigned_course_sections'
    )
    # Optional lab group override
    student_group = models.ForeignKey(
        StudentGroup, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='course_sections'
    )
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('course', 'section', 'semester')
        ordering = ['course__code']

    def __str__(self):
        faculty_name = self.faculty.user.full_name if self.faculty else "Unassigned"
        return f"{self.course.code} | {self.section} | {faculty_name}"


# ──────────────────────────────────────────────
# DEPARTMENT ROOM PREFERENCE (Optional)
# ──────────────────────────────────────────────

class DepartmentRoomPreference(models.Model):
    """
    Optional: lets departments specify preferred rooms for course types.
    Used as hints during timetable generation.
    """
    from campus.models import Room
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='dept_room_preferences')
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='room_preferences')
    room = models.ForeignKey('campus.Room', on_delete=models.CASCADE, related_name='dept_preferences')
    course_type = models.CharField(max_length=20, blank=True, help_text="Leave blank = applies to all")
    priority = models.PositiveSmallIntegerField(default=1)
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ('department', 'room', 'course_type')

    def __str__(self):
        return f"{self.department.code} prefers {self.room}"
