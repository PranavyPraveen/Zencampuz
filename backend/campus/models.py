from django.db import models
from tenants.models import Tenant

class UUIDModel(models.Model):
    import uuid
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class FacilityTag(UUIDModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='facility_tags')
    name = models.CharField(max_length=100)

    class Meta:
        unique_together = ('tenant', 'name')
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.tenant.tenant_name})"


class RoomType(UUIDModel):
    TYPE_CHOICES = [
        ('classroom', 'Classroom'),
        ('lab', 'Laboratory'),
        ('seminar_hall', 'Seminar Hall'),
        ('auditorium', 'Auditorium'),
        ('meeting_room', 'Meeting Room'),
        ('conference_room', 'Conference Room'),
        ('library_space', 'Library Space'),
        ('sports_facility', 'Sports Facility'),
        ('research_lab', 'Research Lab'),
        ('other', 'Other'),
    ]

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='room_types')
    type_code = models.CharField(max_length=50, choices=TYPE_CHOICES)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ('tenant', 'type_code')
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.tenant.tenant_name})"


class Campus(UUIDModel):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('maintenance', 'Under Maintenance'),
    ]

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='campuses')
    name = models.CharField(max_length=255)
    address = models.TextField(blank=True, null=True)
    contact_email = models.EmailField(blank=True, null=True)
    contact_phone = models.CharField(max_length=50, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    class Meta:
        unique_together = ('tenant', 'name')
        ordering = ['name']
        verbose_name_plural = 'Campuses'

    def __str__(self):
        return f"{self.name} ({self.tenant.tenant_name})"


class Building(UUIDModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='buildings')
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name='buildings')
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, help_text="Short code (e.g., BLD-A)")
    total_floors = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ('tenant', 'campus', 'code')
        ordering = ['campus__name', 'name']

    def __str__(self):
        return f"{self.name} [{self.code}] ({self.campus.name})"


class Floor(UUIDModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='floors')
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='floors')
    floor_number = models.IntegerField(help_text="0 for Ground, negative for basements")
    name = models.CharField(max_length=100, blank=True, help_text="Optional human readable name, e.g. 'Mezzanine'")

    class Meta:
        unique_together = ('tenant', 'building', 'floor_number')
        ordering = ['building__name', 'floor_number']

    def __str__(self):
        display_name = self.name if self.name else f"Floor {self.floor_number}"
        return f"{display_name} - {self.building.name}"


class Room(UUIDModel):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('maintenance', 'Under Maintenance'),
    ]

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='rooms')
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name='rooms')
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='rooms')
    floor = models.ForeignKey(Floor, on_delete=models.CASCADE, related_name='rooms')
    
    room_type = models.ForeignKey(RoomType, on_delete=models.PROTECT, related_name='rooms')
    room_number = models.CharField(max_length=50)
    room_name = models.CharField(max_length=255, blank=True, help_text="Optional special name, e.g. 'Newton Lab'")
    
    capacity = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    # Accessibility & Infrastructure
    is_wheelchair_accessible = models.BooleanField(default=False)
    has_projector = models.BooleanField(default=False)
    has_video_conferencing = models.BooleanField(default=False)
    has_smart_board = models.BooleanField(default=False)
    
    description = models.TextField(blank=True, null=True)
    department = models.CharField(max_length=255, blank=True, null=True, help_text="Owning/Primary department")
    
    available_facilities = models.ManyToManyField(FacilityTag, blank=True, related_name='rooms')
    under_maintenance = models.BooleanField(default=False)

    class Meta:
        unique_together = ('tenant', 'building', 'room_number')
        ordering = ['building__name', 'floor__floor_number', 'room_number']

    def __str__(self):
        display_name = self.room_name if self.room_name else self.room_number
        return f"{display_name} ({self.room_type.name}) - {self.building.code}"

    def save(self, *args, **kwargs):
        # Auto-cascade the tenant context downward from the building to ensure data integrity
        if self.building:
            self.tenant = self.building.tenant
            self.campus = self.building.campus
        # If floor is set, make sure it matches the building
        if self.floor and self.floor.building != self.building:
            raise ValueError("The selected floor does not belong to the selected building.")
        super().save(*args, **kwargs)
