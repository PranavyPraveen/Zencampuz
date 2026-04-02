from django.db import models
from django.utils.text import slugify
import uuid


class Tenant(models.Model):
    class TenantStatus(models.TextChoices):
        ACTIVE = 'active', 'Active'
        SUSPENDED = 'suspended', 'Suspended'
        ARCHIVED = 'archived', 'Archived'

    class SubscriptionType(models.TextChoices):
        MONTHLY = 'monthly', 'Monthly'
        YEARLY = 'yearly', 'Yearly'

    tenant_name = models.CharField(max_length=255)
    tenant_code = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    logo = models.ImageField(upload_to='tenant_logos/', null=True, blank=True)
    primary_color = models.CharField(max_length=20, default='#0B1026')
    secondary_color = models.CharField(max_length=20, default='#1B2A4A')
    
    # Subdomain/Portal fields
    domain = models.CharField(max_length=255, null=True, blank=True, unique=True)
    subdomain = models.CharField(max_length=255, null=True, blank=True, unique=True)
    generated_portal_url = models.URLField(max_length=255, null=True, blank=True)
    
    # Management & Subscription
    status = models.CharField(max_length=20, choices=TenantStatus.choices, default=TenantStatus.ACTIVE)
    subscription_type = models.CharField(max_length=20, choices=SubscriptionType.choices, default=SubscriptionType.MONTHLY)
    contract_start_date = models.DateField(null=True, blank=True)
    contract_end_date = models.DateField(null=True, blank=True)
    renewal_status = models.BooleanField(default=True)

    # Modules Purchased
    has_resources = models.BooleanField(default=False)
    has_bookings = models.BooleanField(default=False)
    has_timetable = models.BooleanField(default=False)
    has_exams = models.BooleanField(default=False)
    has_reports = models.BooleanField(default=False)
    has_notifications = models.BooleanField(default=False)
    has_asset_tagging = models.BooleanField(default=False)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @staticmethod
    def _generate_code(name):
        """Create a compact, URL-safe code from the institution name + 4 random hex chars."""
        prefix = ''.join(c.upper() for c in name if c.isalpha())[:6] or 'INST'
        suffix = uuid.uuid4().hex[:4].upper()
        return f"{prefix}-{suffix}"

    def save(self, *args, **kwargs):
        # Auto-generate slug
        if not self.slug:
            self.slug = slugify(self.tenant_name)
        
        # Auto-generate subdomain from slug if not provided
        if not self.subdomain and self.tenant_name:
            self.subdomain = self.slug

        # Auto-generate a unique tenant_code — keep retrying if the uuid suffix collides
        if not self.tenant_code:
            candidate = self._generate_code(self.tenant_name or 'INST')
            while Tenant.objects.filter(tenant_code=candidate).exists():
                candidate = self._generate_code(self.tenant_name or 'INST')
            self.tenant_code = candidate

        # Update portal URL based on subdomain
        if self.subdomain:
            self.generated_portal_url = f"http://{self.subdomain}.campuzcore.com"
            
        super().save(*args, **kwargs)

    def __str__(self):
        return str(self.tenant_name)

