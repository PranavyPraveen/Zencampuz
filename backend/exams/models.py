import uuid
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from tenants.models import Tenant
from academics.models import Semester, CourseSection, Section
from campus.models import Room
from accounts.models import CustomUser

class ExamPlan(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='exam_plans')
    name = models.CharField(max_length=255, help_text="e.g. Spring 2024 Final Exams")
    department = models.ForeignKey('academics.Department', on_delete=models.SET_NULL, null=True, related_name='exam_plans')
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name='exam_plans')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    start_date = models.DateField()
    end_date = models.DateField()
    instructions = models.TextField(blank=True, help_text="General instructions for students and faculty")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.name} ({self.semester})"

class ExamSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    plan = models.ForeignKey(ExamPlan, on_delete=models.CASCADE, related_name='sessions')
    name = models.CharField(max_length=100, help_text="e.g. Morning Session")
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    
    class Meta:
        ordering = ['date', 'start_time']

    def clean(self):
        if not (self.plan.start_date <= self.date <= self.plan.end_date):
            raise ValidationError("Session date must fall within the Exam Plan date range.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.date} | {self.name} [{self.start_time.strftime('%H:%M')}-{self.end_time.strftime('%H:%M')}]"

class ExamCourseAssignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    session = models.ForeignKey(ExamSession, on_delete=models.CASCADE, related_name='course_assignments')
    course_section = models.ForeignKey(CourseSection, on_delete=models.CASCADE, related_name='exam_assignments')

    class Meta:
        unique_together = ('session', 'course_section')

    def clean(self):
        # 1. Plan/Semester match
        if self.course_section.semester != self.session.plan.semester:
            raise ValidationError("Course semester must match exam plan semester.")
        
        # 2. Student overlap conflict
        # Does this specific section of students have another exam at the exact same Date and Time block?
        conflicts = ExamCourseAssignment.objects.filter(
            tenant=self.tenant,
            course_section__section=self.course_section.section,
            session__date=self.session.date,
            session__start_time__lt=self.session.end_time,
            session__end_time__gt=self.session.start_time
        ).exclude(id=self.id)
        if conflicts.exists():
            raise ValidationError(f"Student conflict: Section {self.course_section.section.name} already has an overlapping exam scheduled on {self.session.date}.")

        # 3. Same Day Buffer Rule (Business Logic Request)
        # Prevent section from having two exams on the exact same date regardless of time
        same_day_exams = ExamCourseAssignment.objects.filter(
            tenant=self.tenant,
            course_section__section=self.course_section.section,
            session__date=self.session.date
        ).exclude(id=self.id)
        if same_day_exams.exists():
            raise ValidationError(f"Buffer Rule Violation: Section {self.course_section.section.name} already has an exam scheduled on {self.session.date}. Maximum 1 exam per day allowed.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.course_section.course.code} -> {self.session}"

class ExamHallAllocation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    session = models.ForeignKey(ExamSession, on_delete=models.CASCADE, related_name='hall_allocations')
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='exam_allocations')

    class Meta:
        unique_together = ('session', 'room')

    def clean(self):
        # Prevent double booking a room for overlapping sessions
        conflicts = ExamHallAllocation.objects.filter(
            tenant=self.tenant,
            room=self.room,
            session__date=self.session.date,
            session__start_time__lt=self.session.end_time,
            session__end_time__gt=self.session.start_time
        ).exclude(id=self.id)
        if conflicts.exists():
            raise ValidationError(f"Room Conflict: {self.room.room_number} is already booked for an overlapping exam session.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.room.room_number} -> {self.session}"

class SeatingPlan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    exam_assignment = models.ForeignKey(ExamCourseAssignment, on_delete=models.CASCADE, related_name='seatings')
    hall_allocation = models.ForeignKey(ExamHallAllocation, on_delete=models.CASCADE, related_name='seatings')
    allocated_count = models.PositiveIntegerField(help_text="Number of students from this section taking the exam in this hall.")

    class Meta:
        unique_together = ('exam_assignment', 'hall_allocation')

    def clean(self):
        # 1. Match sessions
        if self.exam_assignment.session != self.hall_allocation.session:
            raise ValidationError("The exam course and hall allocation do not belong to the same session.")
        
        # 2. Hall Capacity Fit check
        other_seatings = SeatingPlan.objects.filter(
            hall_allocation=self.hall_allocation
        ).exclude(id=self.id).aggregate(total=models.Sum('allocated_count'))['total'] or 0
        
        new_total = other_seatings + self.allocated_count
        room_cap = self.hall_allocation.room.capacity
        if new_total > room_cap:
            raise ValidationError(f"Hall Capacity Overflow: Inserting {self.allocated_count} students yields {new_total}/{room_cap} max capacity.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.allocated_count} students from {self.exam_assignment.course_section.course.code} in {self.hall_allocation.room.room_number}"


class InvigilatorAssignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    hall_allocation = models.ForeignKey(ExamHallAllocation, on_delete=models.CASCADE, related_name='invigilators')
    faculty = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='exam_invigilations')
    is_chief = models.BooleanField(default=False)

    class Meta:
        unique_together = ('hall_allocation', 'faculty')

    def clean(self):
        # Prevent faculty from invigilating overlapping overlapping sessions
        session = self.hall_allocation.session
        conflicts = InvigilatorAssignment.objects.filter(
            faculty=self.faculty,
            hall_allocation__session__date=session.date,
            hall_allocation__session__start_time__lt=session.end_time,
            hall_allocation__session__end_time__gt=session.start_time
        ).exclude(id=self.id)
        if conflicts.exists():
            raise ValidationError(f"Invigilator Conflict: {self.faculty.full_name} is already assigned to another hall at this time.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.faculty.full_name} -> {self.hall_allocation}"

class ExamPublishLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    plan = models.ForeignKey(ExamPlan, on_delete=models.CASCADE, related_name='publish_logs')
    published_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)
    published_at = models.DateTimeField(auto_now_add=True)
    version = models.PositiveIntegerField()
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-published_at']

    def __str__(self):
        return f"{self.plan.name} v{self.version}"
