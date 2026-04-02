import uuid
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from tenants.models import Tenant
from academics.models import Semester, Section, CourseSection
from campus.models import Room

class WorkingDay(models.Model):
    DAYS_OF_WEEK = [
        ('mon', 'Monday'),
        ('tue', 'Tuesday'),
        ('wed', 'Wednesday'),
        ('thu', 'Thursday'),
        ('fri', 'Friday'),
        ('sat', 'Saturday'),
        ('sun', 'Sunday'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='working_days')
    day = models.CharField(max_length=3, choices=DAYS_OF_WEEK)
    is_active = models.BooleanField(default=True)
    order = models.PositiveSmallIntegerField(default=1)

    class Meta:
        unique_together = ('tenant', 'day')
        ordering = ['order']

    def __str__(self):
        return f"{self.get_day_display()} ({self.tenant.tenant_name})"

class TimeSlotTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='timeslot_templates')
    name = models.CharField(max_length=50, help_text="e.g. Period 1, Afternoon Lab")
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_break = models.BooleanField(default=False)
    order = models.PositiveSmallIntegerField(default=1)

    class Meta:
        ordering = ['start_time']

    def __str__(self):
        return f"{self.name} [{self.start_time.strftime('%H:%M')}-{self.end_time.strftime('%H:%M')}]"

class TimetablePlan(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='timetable_plans')
    name = models.CharField(max_length=255, help_text="e.g. Fall 2024 CSE Section A")
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name='timetable_plans')
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='timetable_plans')
    # ── Extended fields for dependent dropdown context ──
    campus = models.ForeignKey('campus.Campus', on_delete=models.SET_NULL, null=True, blank=True, related_name='timetable_plans')
    programme = models.ForeignKey('academics.Program', on_delete=models.SET_NULL, null=True, blank=True, related_name='timetable_plans')
    batch = models.ForeignKey('academics.Batch', on_delete=models.SET_NULL, null=True, blank=True, related_name='timetable_plans')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    valid_from = models.DateField()
    valid_to = models.DateField()
    created_by = models.ForeignKey('accounts.CustomUser', on_delete=models.SET_NULL, null=True, related_name='created_timetables')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-valid_from']

    @staticmethod
    def generate_name(campus=None, department=None, programme=None, semester=None, batch=None, section=None):
        """Auto-generate a readable plan name from context objects."""
        parts = []
        if campus: parts.append(getattr(campus, 'name', str(campus)))
        if department: parts.append(getattr(department, 'code', str(department)))
        if programme: parts.append(getattr(programme, 'code', str(programme)))
        if semester: parts.append(getattr(semester, 'name', str(semester)))
        if batch: parts.append(getattr(batch, 'name', str(batch)))
        if section: parts.append(f"Sec-{getattr(section, 'name', str(section))}")
        return ' | '.join(parts) if parts else 'New Timetable Plan'

    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"


class TimetableSlot(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    plan = models.ForeignKey(TimetablePlan, on_delete=models.CASCADE, related_name='slots')
    day = models.ForeignKey(WorkingDay, on_delete=models.CASCADE)
    time_slot = models.ForeignKey(TimeSlotTemplate, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('plan', 'day', 'time_slot')
        ordering = ['day__order', 'time_slot__start_time']

    def __str__(self):
        return f"{self.plan.name} | {self.day.get_day_display()} | {self.time_slot.name}"

class ClassSession(models.Model):
    SESSION_TYPES = [
        ('regular', 'Regular Class'),
        ('lab', 'Laboratory'),
        ('tutorial', 'Tutorial'),
        ('seminar', 'Seminar'),
        ('makeup', 'Make-up Class'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    timetable_slot = models.ForeignKey(TimetableSlot, on_delete=models.CASCADE, related_name='class_sessions')
    course_section = models.ForeignKey(CourseSection, on_delete=models.CASCADE, related_name='class_sessions')
    session_type = models.CharField(max_length=20, choices=SESSION_TYPES, default='regular')
    is_active = models.BooleanField(default=True)
    notes = models.CharField(max_length=255, blank=True)

    def clean(self):
        if self.course_section.section != self.timetable_slot.plan.section:
            raise ValidationError("Course section must belong to the plan's section.")
        if self.course_section.semester != self.timetable_slot.plan.semester:
            raise ValidationError("Course section must belong to the plan's semester.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.course_section.course.code} | {self.session_type}"

class FacultyAssignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    class_session = models.ForeignKey(ClassSession, on_delete=models.CASCADE, related_name='faculty_assignments')
    faculty = models.ForeignKey('accounts.CustomUser', on_delete=models.CASCADE, related_name='timetable_assignments') # Intentionally CustomUser to match existing app
    is_primary = models.BooleanField(default=True)

    class Meta:
        unique_together = ('class_session', 'faculty')

    def clean(self):
        # 1. Faculty Conflict Validation
        # Check if this faculty is already teaching at this day and time_slot in ANY active/published plan
        slot = self.class_session.timetable_slot
        conflicts = FacultyAssignment.objects.filter(
            tenant=self.tenant,
            faculty=self.faculty,
            class_session__timetable_slot__day=slot.day,
            class_session__timetable_slot__time_slot=slot.time_slot,
            class_session__is_active=True,
            class_session__timetable_slot__plan__status__in=['draft', 'published']
        ).exclude(id=self.id)
        
        if conflicts.exists():
            plan_name = conflicts.first().class_session.timetable_slot.plan.name
            raise ValidationError(f"Faculty conflict: {self.faculty.full_name} is already assigned a class at this time in '{plan_name}'.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.faculty.full_name} -> {self.class_session}"


class RoomAssignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    class_session = models.ForeignKey(ClassSession, on_delete=models.CASCADE, related_name='room_assignments')
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='timetable_assignments')

    class Meta:
        unique_together = ('class_session', 'room')

    def clean(self):
        slot = self.class_session.timetable_slot
        
        # 2. Room Conflict Validation
        conflicts = RoomAssignment.objects.filter(
            tenant=self.tenant,
            room=self.room,
            class_session__timetable_slot__day=slot.day,
            class_session__timetable_slot__time_slot=slot.time_slot,
            class_session__is_active=True,
            class_session__timetable_slot__plan__status__in=['draft', 'published']
        ).exclude(id=self.id)
        
        if conflicts.exists():
            plan_name = conflicts.first().class_session.timetable_slot.plan.name
            raise ValidationError(f"Room conflict: {self.room.room_number} is already booked at this time in '{plan_name}'.")

        # 3. Capacity Validation
        section_strength = slot.plan.section.strength
        if self.room.capacity < section_strength:
            raise ValidationError(f"Room capacity ({self.room.capacity}) is too small for section strength ({section_strength}).")
        
        # 4. Facility Match Validation
        course_type = self.class_session.course_section.course.course_type
        if course_type == 'practical' and self.room.room_type.type_code != 'lab':
             raise ValidationError(f"Facility mismatch: Practical courses require a Laboratory room type.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.room.room_number} -> {self.class_session}"


class TimetablePublishLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    plan = models.ForeignKey(TimetablePlan, on_delete=models.CASCADE, related_name='publish_logs')
    published_by = models.ForeignKey('accounts.CustomUser', on_delete=models.SET_NULL, null=True)
    published_at = models.DateTimeField(auto_now_add=True)
    version = models.PositiveIntegerField()
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-published_at']

    def __str__(self):
        return f"{self.plan.name} v{self.version} published at {self.published_at}"


class TimetableChangeRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    plan = models.ForeignKey(TimetablePlan, on_delete=models.CASCADE)
    requested_by = models.ForeignKey('accounts.CustomUser', on_delete=models.CASCADE, related_name='timetable_changes')
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_by = models.ForeignKey('accounts.CustomUser', on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_timetable_changes')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    admin_notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Change Request for {self.plan.name} - {self.status}"


class LeaveRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='leave_requests')
    faculty = models.ForeignKey(
        'accounts.CustomUser', on_delete=models.CASCADE, related_name='leave_requests'
    )
    proposed_substitute = models.ForeignKey(
        'accounts.CustomUser', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='proposed_leave_cover_requests'
    )
    date = models.DateField()
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reviewed_by = models.ForeignKey(
        'accounts.CustomUser', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='reviewed_leave_requests'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    admin_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.faculty.full_name} | Leave on {self.date} ({self.status})"


class SubstitutionRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending HOD Review'),
        ('hod_approved', 'HOD Approved'),
        ('hod_rejected', 'HOD Rejected'),
        ('approved', 'Fully Approved'),
        ('rejected', 'Rejected'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='substitution_requests')
    requested_by = models.ForeignKey(
        'accounts.CustomUser', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='substitution_requests_initiated'
    )
    original_faculty = models.ForeignKey(
        'accounts.CustomUser', on_delete=models.CASCADE, related_name='substitution_requests_made'
    )
    substitute_faculty = models.ForeignKey(
        'accounts.CustomUser', on_delete=models.CASCADE, related_name='substitution_requests_received'
    )
    class_session = models.ForeignKey(
        ClassSession, on_delete=models.CASCADE, related_name='substitution_requests'
    )
    leave_request = models.ForeignKey(
        LeaveRequest, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='substitution_requests'
    )
    # HOD Approval
    hod_reviewed_by = models.ForeignKey(
        'accounts.CustomUser', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='hod_reviewed_substitutions'
    )
    hod_reviewed_at = models.DateTimeField(null=True, blank=True)
    hod_notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True)
    requested_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-requested_at']

    def __str__(self):
        return (
            f"{self.original_faculty.full_name} → {self.substitute_faculty.full_name} "
            f"| {self.class_session} ({self.status})"
        )
