import uuid
from django.db import models
from tenants.models import Tenant
from accounts.models import CustomUser
from campus.models import Room
from resources.models import Resource, SubResourceUnit


# ---------------------------------------------------------------------------
# Booking Policy
# ---------------------------------------------------------------------------

class BookingPolicyRule(models.Model):
    """
    Tenant-level policy rules that determine whether a booking
    needs approval, can be instantly confirmed, or is blocked.
    Rules are evaluated in priority order (lower number = higher priority).
    """
    TRIGGER_CHOICES = [
        ('role_student', 'User Role: Student'),
        ('role_external', 'User Role: External User'),
        ('role_research', 'User Role: Research Scholar'),
        ('resource_auditorium', 'Resource Type: Auditorium'),
        ('resource_seminar_hall', 'Resource Type: Seminar Hall'),
        ('resource_lab', 'Resource Type: Lab/Lab Instrument'),
        ('resource_restricted', 'Resource: Requires Approval'),
        ('time_weekend', 'Time: Weekend'),
        ('time_after_hours', 'Time: After Hours (after 6 PM or before 8 AM)'),
        ('duration_long', 'Duration: Over 4 Hours'),
        ('role_facility_manager', 'User Role: Facility Manager (Direct Book)'),
        ('all', 'All Bookings'),
    ]
    ACTION_CHOICES = [
        ('auto_approve', 'Auto Approve'),
        ('require_approval', 'Require Approval'),
        ('block', 'Block Completely'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='booking_policies')
    name = models.CharField(max_length=255)
    trigger = models.CharField(max_length=50, choices=TRIGGER_CHOICES)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES, default='require_approval')
    priority = models.PositiveIntegerField(default=10, help_text="Lower = evaluated first")
    approver_roles = models.JSONField(default=list, help_text="List of role names that can approve. Empty = any admin.")
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['priority', 'name']
        unique_together = ('tenant', 'name')

    def __str__(self):
        return f"[{self.get_trigger_display()}] → {self.get_action_display()} (Priority {self.priority})"


# ---------------------------------------------------------------------------
# Booking Request
# ---------------------------------------------------------------------------

class BookingRequest(models.Model):
    TARGET_TYPES = [
        ('room', 'Room / Facility'),
        ('sub_unit', 'Sub-Resource Unit (Seat/System)'),
        ('sports_turf', 'Sports Turf'),
        ('seminar_hall', 'Seminar Hall'),
        ('auditorium', 'Auditorium'),
        ('lab_instrument', 'Lab Instrument'),
        ('meeting_room', 'Meeting Room'),
    ]
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('conflict', 'Conflict'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='booking_requests')
    requested_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='bookings_requested')

    # What is being booked (polymorphic targets)
    target_type = models.CharField(max_length=30, choices=TARGET_TYPES)
    room = models.ForeignKey(Room, null=True, blank=True, on_delete=models.SET_NULL, related_name='booking_requests')
    resource = models.ForeignKey(Resource, null=True, blank=True, on_delete=models.SET_NULL, related_name='booking_requests')
    sub_unit = models.ForeignKey(SubResourceUnit, null=True, blank=True, on_delete=models.SET_NULL, related_name='booking_requests')

    # Time
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()

    # Purpose and metadata
    title = models.CharField(max_length=255)
    purpose = models.TextField()
    expected_attendees = models.PositiveIntegerField(default=1)

    # Workflow
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    applied_policy = models.ForeignKey(BookingPolicyRule, null=True, blank=True, on_delete=models.SET_NULL, related_name='bookings')
    requires_approval = models.BooleanField(default=False)

    # Internal notes
    admin_notes = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.status}] {self.title} by {self.requested_by.email}"

    def duration_hours(self):
        delta = self.end_time - self.start_time
        return round(delta.total_seconds() / 3600, 2)


# ---------------------------------------------------------------------------
# Approval
# ---------------------------------------------------------------------------

class BookingApproval(models.Model):
    ACTION_CHOICES = [
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('more_info', 'More Info Requested'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='booking_approvals')
    booking = models.ForeignKey(BookingRequest, on_delete=models.CASCADE, related_name='approvals')
    reviewed_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='booking_reviews')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    comment = models.TextField(blank=True)
    reviewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-reviewed_at']

    def __str__(self):
        return f"{self.action} by {self.reviewed_by.email} on {self.booking.title}"


# ---------------------------------------------------------------------------
# Participants
# ---------------------------------------------------------------------------

class BookingParticipantInfo(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='booking_participants')
    booking = models.ForeignKey(BookingRequest, on_delete=models.CASCADE, related_name='participants')
    name = models.CharField(max_length=255)
    email = models.EmailField()
    role_label = models.CharField(max_length=100, blank=True, help_text="e.g. 'Presenter', 'Guest', 'Student'")

    class Meta:
        unique_together = ('booking', 'email')

    def __str__(self):
        return f"{self.name} ({self.email}) @ {self.booking.title}"


# ---------------------------------------------------------------------------
# Recurring Booking
# ---------------------------------------------------------------------------

class RecurringBooking(models.Model):
    FREQUENCY_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('biweekly', 'Bi-Weekly'),
        ('monthly', 'Monthly'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='recurring_bookings')
    parent_booking = models.ForeignKey(BookingRequest, on_delete=models.CASCADE, related_name='recurrences')
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES)
    repeat_until = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.parent_booking.title} — {self.frequency} until {self.repeat_until}"


# ---------------------------------------------------------------------------
# Attachment
# ---------------------------------------------------------------------------

class BookingAttachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='booking_attachments')
    booking = models.ForeignKey(BookingRequest, on_delete=models.CASCADE, related_name='attachments')
    file_name = models.CharField(max_length=255)
    file_url = models.URLField(help_text="Stored file URL (S3, Cloudinary, etc.)")
    uploaded_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='uploaded_attachments')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.file_name} for {self.booking.title}"


# ---------------------------------------------------------------------------
# Conflict Log
# ---------------------------------------------------------------------------

class BookingConflictLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='booking_conflicts')
    new_booking = models.ForeignKey(BookingRequest, on_delete=models.CASCADE, related_name='conflicts_as_new')
    conflicting_booking = models.ForeignKey(BookingRequest, on_delete=models.CASCADE, related_name='conflicts_as_existing')
    detected_at = models.DateTimeField(auto_now_add=True)
    resolved = models.BooleanField(default=False)
    resolution_note = models.TextField(blank=True)

    class Meta:
        ordering = ['-detected_at']

    def __str__(self):
        return f"Conflict: {self.new_booking.title} ↔ {self.conflicting_booking.title}"
