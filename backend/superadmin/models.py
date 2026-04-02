from django.db import models
from django.conf import settings

class PricingModule(models.Model):
    module_code = models.CharField(max_length=50, unique=True, help_text="Unique identifier like mod_core")
    title = models.CharField(max_length=100)
    price_annual = models.DecimalField(max_digits=10, decimal_places=2, help_text="Yearly price in INR")
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Monthly price in INR")
    is_annual_only = models.BooleanField(default=False)
    features = models.JSONField(default=list, help_text="List of feature strings")
    is_popular = models.BooleanField(default=False)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return self.title

class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('tenant_created', 'Tenant Created'),
        ('tenant_updated', 'Tenant Updated'),
        ('tenant_suspended', 'Tenant Suspended'),
        ('tenant_activated', 'Tenant Activated'),
        ('tenant_archived', 'Tenant Archived'),
        ('tenant_deleted', 'Tenant Deleted'),
        ('subscription_updated', 'Subscription Updated'),
    ]

    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    resource_type = models.CharField(max_length=50) # e.g., 'Tenant'
    resource_id = models.CharField(max_length=50)
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    description = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.action} on {self.resource_type}:{self.resource_id} at {self.timestamp}"
