from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from tenants.models import Tenant


# ─── Role Model ─────────────────────────────────────────────────────────────
class Role(models.Model):
    class RoleChoices(models.TextChoices):
        SUPER_ADMIN      = 'super_admin',      'Super Admin'
        TENANT_ADMIN     = 'tenant_admin',     'Tenant Admin'
        ACADEMIC_ADMIN   = 'academic_admin',   'Academic Admin'
        FACILITY_MANAGER = 'facility_manager', 'Facility Manager'
        IT_ADMIN         = 'it_admin',         'IT Admin'
        HOD              = 'hod',              'Head of Department'
        FACULTY          = 'faculty',          'Faculty'
        STUDENT          = 'student',          'Student'
        RESEARCH_SCHOLAR = 'research_scholar', 'Research Scholar'
        EXTERNAL_USER    = 'external_user',    'External User'

    name = models.CharField(max_length=50, choices=RoleChoices.choices, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.get_name_display()


# ─── Permission Catalogue ────────────────────────────────────────────────────
class Permission(models.Model):
    """Defines a specific action a role can perform on a module."""

    class ActionChoices(models.TextChoices):
        VIEW   = 'view',   'View'
        CREATE = 'create', 'Create'
        UPDATE = 'update', 'Update'
        DELETE = 'delete', 'Delete'

    # All modules that permissions can be defined for:
    MODULE_CHOICES = [
        ('dashboard',       'Dashboard'),
        ('users',           'User Management'),
        ('campus',          'Campus Management'),
        ('academics',       'Academics'),
        ('timetable',       'Timetabling'),
        ('exams',           'Exam Management'),
        ('resources',       'Asset & Resource Management'),
        ('bookings',        'Facility Bookings'),
        ('reports',         'Analytics & Reports'),
        ('notifications',   'Notifications'),
        ('settings',        'Settings'),
    ]

    module_name = models.CharField(max_length=100, choices=MODULE_CHOICES)
    action      = models.CharField(max_length=20, choices=ActionChoices.choices)
    description = models.TextField(blank=True)

    class Meta:
        unique_together = [('module_name', 'action')]
        ordering = ['module_name', 'action']

    def __str__(self):
        return f"{self.module_name}.{self.action}"

    @property
    def code(self):
        return f"{self.module_name}.{self.action}"


# ─── Role ↔ Permission assignment (tenant-scoped) ────────────────────────────
class RolePermission(models.Model):
    """
    Maps a role to a permission within a specific tenant.
    If tenant is NULL it acts as a platform-level default.
    """
    role       = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='role_permissions')
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE, related_name='role_permissions')
    tenant     = models.ForeignKey(Tenant, on_delete=models.CASCADE, null=True, blank=True,
                                   related_name='role_permissions')
    granted    = models.BooleanField(default=True)

    class Meta:
        unique_together = [('role', 'permission', 'tenant')]
        ordering = ['role', 'permission__module_name', 'permission__action']

    def __str__(self):
        scope = self.tenant.tenant_name if self.tenant else 'platform'
        return f"{self.role} → {self.permission} [{scope}] ({'✓' if self.granted else '✗'})"


# ─── User Manager ────────────────────────────────────────────────────────────
class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        if 'role' not in extra_fields:
            role, _ = Role.objects.get_or_create(name=Role.RoleChoices.SUPER_ADMIN)
            extra_fields['role'] = role
        return self.create_user(email, password, **extra_fields)


# ─── Custom User ─────────────────────────────────────────────────────────────
class CustomUser(AbstractBaseUser, PermissionsMixin):
    full_name    = models.CharField(max_length=255)
    email        = models.EmailField(unique=True)
    country_code = models.CharField(max_length=5, blank=True, null=True, help_text="e.g. +91, +1")
    phone        = models.CharField(max_length=20, blank=True, null=True)

    is_active  = models.BooleanField(default=True)
    is_staff   = models.BooleanField(default=False)

    role       = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True)
    tenant     = models.ForeignKey(Tenant, on_delete=models.CASCADE, null=True, blank=True, related_name='users')
    campus     = models.ForeignKey(
        'campus.Campus',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='users',
        help_text="Assigned campus — required for campus-scoped IT admins"
    )
    department = models.CharField(max_length=255, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CustomUserManager()

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['full_name']

    def __str__(self):
        return f"{self.full_name} ({self.email})"

    def get_permissions_for_tenant(self, tenant=None):
        """
        Returns a set of permission codes (e.g. 'timetable.view') for this user's role,
        resolving tenant-specific overrides over platform defaults.
        """
        if not self.role:
            return set()

        target_tenant = tenant or self.tenant

        # Platform-level defaults for this role
        platform_qs = RolePermission.objects.filter(
            role=self.role, tenant__isnull=True, granted=True
        ).values_list('permission__module_name', 'permission__action')

        platform = {f"{m}.{a}" for m, a in platform_qs}

        # Tenant-level overrides (if tenant is set)
        if target_tenant:
            tenant_granted = RolePermission.objects.filter(
                role=self.role, tenant=target_tenant, granted=True
            ).values_list('permission__module_name', 'permission__action')

            tenant_revoked = RolePermission.objects.filter(
                role=self.role, tenant=target_tenant, granted=False
            ).values_list('permission__module_name', 'permission__action')

        # Add tenant grants, remove tenant revocations
            platform |= {f"{m}.{a}" for m, a in tenant_granted}
            platform -= {f"{m}.{a}" for m, a in tenant_revoked}

        # User-specific overrides
        user_granted = UserPermission.objects.filter(
            user=self, tenant=target_tenant, granted=True
        ).values_list('permission__module_name', 'permission__action')

        user_revoked = UserPermission.objects.filter(
            user=self, tenant=target_tenant, granted=False
        ).values_list('permission__module_name', 'permission__action')

        platform |= {f"{m}.{a}" for m, a in user_granted}
        platform -= {f"{m}.{a}" for m, a in user_revoked}

        return platform

# ─── User Permission Override (Per-User) ─────────────────────────────────────
class UserPermission(models.Model):
    """
    Overrides role permissions for a specific user.
    """
    user       = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='user_permission_overrides')
    permission = models.ForeignKey('Permission', on_delete=models.CASCADE, related_name='user_permission_rules')
    tenant     = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='tenant_user_permissions')
    granted    = models.BooleanField(default=True)

    class Meta:
        unique_together = [('user', 'permission', 'tenant')]
        ordering = ['user', 'permission__module_name', 'permission__action']

    def __str__(self):
        return f"{self.user} → {self.permission} ({'✓' if self.granted else '✗'})"
