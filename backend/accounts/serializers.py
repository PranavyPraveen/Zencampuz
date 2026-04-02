from rest_framework import serializers
from django.contrib.auth import get_user_model
from tenants.models import Tenant
from .models import Role, Permission, RolePermission

User = get_user_model()


# ─── Tenant ──────────────────────────────────────────────────────────────────
class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = [
            'id', 'tenant_name', 'tenant_code', 'slug', 'logo',
            'primary_color', 'secondary_color', 'domain', 'subdomain',
            'generated_portal_url',
            'has_resources', 'has_bookings', 'has_timetable',
            'has_exams', 'has_reports', 'has_notifications',
        ]


# ─── Campus (lightweight, for user profile) ───────────────────────────────────
class CampusMinimalSerializer(serializers.Serializer):
    """Read-only minimal campus representation for embedding in user objects."""
    id = serializers.UUIDField()
    name = serializers.CharField()


# ─── Permission ───────────────────────────────────────────────────────────────
class PermissionSerializer(serializers.ModelSerializer):
    code = serializers.SerializerMethodField()

    class Meta:
        model = Permission
        fields = ['id', 'module_name', 'action', 'description', 'code']

    def get_code(self, obj):
        return obj.code


# ─── Role ─────────────────────────────────────────────────────────────────────
class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'name', 'description']


# ─── RolePermission ───────────────────────────────────────────────────────────
class RolePermissionSerializer(serializers.ModelSerializer):
    permission = PermissionSerializer(read_only=True)
    permission_id = serializers.PrimaryKeyRelatedField(
        queryset=Permission.objects.all(), source='permission', write_only=True
    )

    class Meta:
        model = RolePermission
        fields = ['id', 'role', 'permission', 'permission_id', 'tenant', 'granted']
        read_only_fields = ['id', 'role', 'tenant']


# ─── Role with permissions (for RBAC panel) ───────────────────────────────────
class RoleWithPermissionsSerializer(serializers.ModelSerializer):
    """Serializes a role along with its granted permission codes for a given tenant."""
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'permissions']

    def get_permissions(self, obj):
        request = self.context.get('request')
        tenant = getattr(request.user, 'tenant', None) if request else None

        # Collect granted permissions: platform defaults overridden by tenant config
        granted = set()
        platform_qs = RolePermission.objects.filter(role=obj, tenant__isnull=True, granted=True)
        for rp in platform_qs:
            granted.add(rp.permission.code)

        if tenant:
            tenant_granted = RolePermission.objects.filter(role=obj, tenant=tenant, granted=True)
            tenant_revoked = RolePermission.objects.filter(role=obj, tenant=tenant, granted=False)
            for rp in tenant_granted:
                granted.add(rp.permission.code)
            for rp in tenant_revoked:
                granted.discard(rp.permission.code)

        return list(granted)


# ─── User serializers ─────────────────────────────────────────────────────────
class UserSerializer(serializers.ModelSerializer):
    tenant = TenantSerializer(read_only=True)
    role   = RoleSerializer(read_only=True)
    campus = CampusMinimalSerializer(read_only=True)
    profile_id = serializers.SerializerMethodField()
    department_id = serializers.SerializerMethodField()
    is_hod = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = ['id', 'full_name', 'email', 'phone', 'is_active', 'role', 'tenant', 'campus', 'department', 'department_id', 'profile_id', 'is_hod']
        read_only_fields = ['tenant', 'role']

    def get_profile_id(self, obj):
        try:
            if hasattr(obj, 'faculty_profile'):
                return str(obj.faculty_profile.id)
        except Exception:
            pass
        return None

    def get_department_id(self, obj):
        # 1. Faculty Profile check
        fp = getattr(obj, 'faculty_profile', None)
        if fp and fp.department_id:
            return str(fp.department_id)
        
        # 2. HOD fallback (matches ViewSets name normalization)
        from django.apps import apps
        Department = apps.get_model('academics', 'Department')
        tenant = getattr(obj, 'tenant', None)
        if not tenant: return None

        # Explicit HOD check
        dept = Department.objects.filter(tenant=tenant, head_of_department=obj).first()
        if dept: return str(dept.id)

        # Name normalization fallback
        role_name = getattr(obj.role, 'name', '') if obj.role else ''
        if role_name == 'hod':
            user_dept_name = getattr(obj, 'department', '')
            if not user_dept_name: return None
            
            def normalize(val):
                if not val: return ''
                return ' '.join(val.split('(')[0].strip().lower().replace('&', 'and').split())

            normalized_target = normalize(user_dept_name)
            dept_qs = Department.objects.filter(tenant=tenant)
            
            # Try campus match first
            campus_id = getattr(obj, 'campus_id', None)
            if campus_id:
                for d in dept_qs.filter(campus_id=campus_id):
                    if normalize(d.name) == normalized_target:
                        return str(d.id)
            for d in dept_qs:
                if normalize(d.name) == normalized_target:
                    return str(d.id)
        return None

    def get_is_hod(self, obj):
        role_name = getattr(obj.role, 'name', '') if obj.role else ''
        if role_name == 'hod':
            return True
        from django.apps import apps
        Department = apps.get_model('academics', 'Department')
        tenant = getattr(obj, 'tenant', None)
        if not tenant:
            return False
        return Department.objects.filter(tenant=tenant, head_of_department=obj).exists()


class TenantUserSerializer(serializers.ModelSerializer):
    """Full CRUD serializer for tenant-admin managed users."""
    role_name  = serializers.CharField(write_only=True, required=True)
    role       = RoleSerializer(read_only=True)
    tenant     = TenantSerializer(read_only=True)
    password   = serializers.CharField(write_only=True, required=False, allow_blank=True)
    campus_id  = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    campus     = CampusMinimalSerializer(read_only=True)
    # Expose user permissions for the frontend
    user_permissions_overrides = serializers.JSONField(write_only=True, required=False)
    permissions = serializers.SerializerMethodField()
    department_id = serializers.SerializerMethodField()
    is_hod = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            'id', 'full_name', 'email', 'country_code', 'phone',
            'is_active', 'role', 'role_name',
            'tenant', 'campus', 'campus_id', 'department', 'department_id',
            'password', 'user_permissions_overrides', 'permissions', 'is_hod', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'tenant', 'role', 'campus', 'department_id', 'permissions', 'is_hod', 'created_at', 'updated_at']

    def get_permissions(self, obj):
        if not obj.role: return []
        return list(obj.get_permissions_for_tenant())

    def get_department_id(self, obj):
        # 1. Faculty Profile check
        fp = getattr(obj, 'faculty_profile', None)
        if fp and fp.department_id:
            return str(fp.department_id)
        
        # 2. HOD fallback (matches ViewSets name normalization)
        from django.apps import apps
        Department = apps.get_model('academics', 'Department')
        tenant = getattr(obj, 'tenant', None)
        if not tenant: return None

        # Explicit HOD check
        dept = Department.objects.filter(tenant=tenant, head_of_department=obj).first()
        if dept: return str(dept.id)

        # Name normalization fallback
        role_name = getattr(obj.role, 'name', '') if obj.role else ''
        if role_name == 'hod':
            user_dept_name = getattr(obj, 'department', '')
            if not user_dept_name: return None
            
            def normalize(val):
                if not val: return ''
                return ' '.join(val.split('(')[0].strip().lower().replace('&', 'and').split())

            normalized_target = normalize(user_dept_name)
            dept_qs = Department.objects.filter(tenant=tenant)
            
            # Try campus match first
            campus_id = getattr(obj, 'campus_id', None)
            if campus_id:
                for d in dept_qs.filter(campus_id=campus_id):
                    if normalize(d.name) == normalized_target:
                        return str(d.id)
            for d in dept_qs:
                if normalize(d.name) == normalized_target:
                    return str(d.id)
        return None

    def get_is_hod(self, obj):
        role_name = getattr(obj.role, 'name', '') if obj.role else ''
        if role_name == 'hod':
            return True
        from django.apps import apps
        Department = apps.get_model('academics', 'Department')
        tenant = getattr(obj, 'tenant', None)
        if not tenant:
            return False
        return Department.objects.filter(tenant=tenant, head_of_department=obj).exists()


    def validate_role_name(self, value):
        forbidden = ['super_admin']
        if value in forbidden:
            raise serializers.ValidationError("You cannot assign the 'super_admin' role.")
        allowed = [
            'tenant_admin', 'academic_admin', 'facility_manager',
            'it_admin', 'hod', 'faculty', 'student', 'research_scholar', 'external_user',
        ]
        if value not in allowed:
            raise serializers.ValidationError(f"Invalid role '{value}'.")
        return value
