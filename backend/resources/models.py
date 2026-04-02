import uuid
from django.db import models
from tenants.models import Tenant
from campus.models import Room, Building, Campus


class ResourceTag(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='resource_tags')
    name = models.CharField(max_length=100)

    class Meta:
        unique_together = ('tenant', 'name')
        ordering = ['name']

    def __str__(self):
        return self.name


class ResourceCategory(models.Model):
    CATEGORY_TYPES = [
        ('equipment', 'Equipment'),
        ('lab_instrument', 'Lab Instrument'),
        ('sports', 'Sports Equipment'),
        ('research', 'Research Tool'),
        ('it_asset', 'IT Asset'),
        ('furniture', 'Furniture'),
        ('av_equipment', 'AV Equipment'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='resource_categories')
    name = models.CharField(max_length=200)
    category_type = models.CharField(max_length=50, choices=CATEGORY_TYPES, default='equipment')
    description = models.TextField(blank=True, null=True)
    icon = models.CharField(max_length=50, blank=True, help_text="Lucide icon name e.g. 'Monitor'")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('tenant', 'name')
        ordering = ['name']
        verbose_name_plural = 'Resource Categories'

    def __str__(self):
        return self.name


class Resource(models.Model):
    """
    Single unified model for all bookable resources (Equipment, Lab Instruments, Sports, etc).
    Use `category` to distinguish the type.
    """
    UNIT_TYPES = [
        ('unit', 'Unit'),
        ('set', 'Set'),
        ('seat', 'Seat'),
        ('system', 'Computer System'),
        ('instrument', 'Instrument'),
        ('kit', 'Kit'),
        ('pair', 'Pair'),
    ]
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('in_use', 'In Use'),
        ('maintenance', 'Under Maintenance'),
        ('retired', 'Retired'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='resources')
    resource_code = models.CharField(max_length=100, help_text="Unique code e.g. LAB-01-SYS-001")
    name = models.CharField(max_length=255)
    category = models.ForeignKey(ResourceCategory, on_delete=models.PROTECT, related_name='resources')

    # Location & Ownership (both optional)
    campus = models.ForeignKey('campus.Campus', on_delete=models.SET_NULL, null=True, blank=True, related_name='resources')
    building = models.ForeignKey('campus.Building', on_delete=models.SET_NULL, null=True, blank=True, related_name='resources')
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True, related_name='resources')
    department = models.CharField(max_length=255, blank=True, null=True)

    # Quantity handling
    quantity_total = models.PositiveIntegerField(default=1)
    quantity_available = models.PositiveIntegerField(default=1)
    unit_type = models.CharField(max_length=20, choices=UNIT_TYPES, default='unit')

    # Booking modes
    bookable_as_whole = models.BooleanField(default=True, help_text="Can the entire resource be booked at once?")
    bookable_per_unit = models.BooleanField(default=False, help_text="Can individual units/seats/systems be booked?")

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    tags = models.ManyToManyField(ResourceTag, blank=True, related_name='resources')

    # Access Control
    requires_approval = models.BooleanField(default=False, help_text="Bookings require admin approval?")
    restricted_roles = models.JSONField(default=list, blank=True, help_text="List of role names that can book this resource")

    # Maintenance & Info
    under_maintenance = models.BooleanField(default=False)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('tenant', 'resource_code')
        ordering = ['name']

    def __str__(self):
        return f"[{self.resource_code}] {self.name}"

    def save(self, *args, **kwargs):
        # Clamp available qty to total qty
        if self.quantity_available > self.quantity_total:
            self.quantity_available = self.quantity_total
        super().save(*args, **kwargs)


class SubResourceUnit(models.Model):
    """
    Represents an individual bookable unit within a resource.
    Example: A lab with 10 computers → 10 SubResourceUnits. 
    Individual users can book specific system #3 or seat #7.
    """
    UNIT_STATUS = [
        ('available', 'Available'),
        ('in_use', 'In Use'),
        ('reserved', 'Reserved'),
        ('maintenance', 'Maintenance'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='sub_resource_units')
    resource = models.ForeignKey(Resource, on_delete=models.CASCADE, related_name='sub_units')
    unit_label = models.CharField(max_length=50, help_text="e.g. 'System-01', 'Seat 3A', 'Microscope-2'")
    status = models.CharField(max_length=20, choices=UNIT_STATUS, default='available')
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('resource', 'unit_label')
        ordering = ['resource__name', 'unit_label']

    def __str__(self):
        return f"{self.resource.name} → {self.unit_label}"


class RoomResourceMapping(models.Model):
    """
    Explicitly records which resources are available in which rooms.
    One resource can be mapped to multiple rooms (e.g. a portable projector kit).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='room_resource_mappings')
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='room_resource_mappings')
    resource = models.ForeignKey(Resource, on_delete=models.CASCADE, related_name='room_mappings')
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('tenant', 'room', 'resource')
        ordering = ['room__room_number', 'resource__name']

    def __str__(self):
        return f"{self.room} ↔ {self.resource.name}"


class MaintenanceSchedule(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    MAINTENANCE_TYPES = [
        ('preventive', 'Preventive'),
        ('corrective', 'Corrective'),
        ('calibration', 'Calibration'),
        ('inspection', 'Inspection'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='maintenance_schedules')
    resource = models.ForeignKey(Resource, on_delete=models.CASCADE, related_name='maintenance_schedules')
    title = models.CharField(max_length=255)
    maintenance_type = models.CharField(max_length=30, choices=MAINTENANCE_TYPES, default='preventive')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    scheduled_date = models.DateField()
    estimated_hours = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    assigned_to = models.CharField(max_length=255, blank=True, null=True, help_text="Name or role responsible")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    notes = models.TextField(blank=True, null=True)
    completed_at = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['scheduled_date', 'priority']

    def __str__(self):
        return f"{self.resource.name} - {self.title} ({self.scheduled_date})"


class UtilizationLog(models.Model):
    """Basic log of resource usage events for analytics."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='utilization_logs')
    resource = models.ForeignKey(Resource, on_delete=models.CASCADE, related_name='utilization_logs')
    sub_unit = models.ForeignKey(SubResourceUnit, null=True, blank=True, on_delete=models.SET_NULL, related_name='utilization_logs')
    booked_by = models.CharField(max_length=255, help_text="User email or ID")
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    purpose = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-start_time']

    def __str__(self):
        return f"{self.resource.name} used by {self.booked_by} @ {self.start_time}"
