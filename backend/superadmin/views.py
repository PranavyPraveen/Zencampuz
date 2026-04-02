from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from django.db.models import Count
from django.utils import timezone
from tenants.models import Tenant
from tenants.serializers import SuperAdminTenantSerializer, SubscriptionUpdateSerializer
from accounts.services import provision_tenant_admin
from accounts.serializers import UserSerializer
from accounts.permissions import IsSuperAdmin
from .models import AuditLog, PricingModule
from .serializers import AuditLogSerializer, PricingModuleSerializer

# ─────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────

TENANT_MODULE_FIELDS = [
    'has_resources', 'has_bookings', 'has_timetable',
    'has_exams', 'has_reports', 'has_notifications', 'has_asset_tagging',
]


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


class AuditLogPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


# ─────────────────────────────────────────
# Platform-level stats
# ─────────────────────────────────────────

class SuperAdminViewSet(viewsets.ViewSet):
    permission_classes = [IsSuperAdmin]

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        now = timezone.now().date()
        stats = {
            'total_tenants': Tenant.objects.count(),
            'active_tenants': Tenant.objects.filter(status=Tenant.TenantStatus.ACTIVE).count(),
            'suspended_tenants': Tenant.objects.filter(status=Tenant.TenantStatus.SUSPENDED).count(),
            'archived_tenants': Tenant.objects.filter(status=Tenant.TenantStatus.ARCHIVED).count(),
            'expired_tenants': Tenant.objects.filter(contract_end_date__lt=now).count(),
            'monthly_subscriptions': Tenant.objects.filter(subscription_type=Tenant.SubscriptionType.MONTHLY).count(),
            'yearly_subscriptions': Tenant.objects.filter(subscription_type=Tenant.SubscriptionType.YEARLY).count(),
        }
        return Response(stats)

    @action(detail=False, methods=['get'], url_path='tenant-reports')
    def tenant_reports(self, request):
        now = timezone.now().date()
        thirty_days_from_now = now + timezone.timedelta(days=30)
        
        active_qs = Tenant.objects.filter(status=Tenant.TenantStatus.ACTIVE)
        active_data = SuperAdminTenantSerializer(active_qs, many=True).data

        expiring_qs = Tenant.objects.filter(
            status=Tenant.TenantStatus.ACTIVE,
            contract_end_date__lte=thirty_days_from_now,
            contract_end_date__gte=now
        )
        expiring_data = SuperAdminTenantSerializer(expiring_qs, many=True).data

        return Response({
            'active_tenants': active_data,
            'expiring_tenants': expiring_data
        })

# ─────────────────────────────────────────
# Pricing Management
# ─────────────────────────────────────────

class PricingModuleViewSet(viewsets.ModelViewSet):
    queryset = PricingModule.objects.all()
    serializer_class = PricingModuleSerializer
    permission_classes = [IsSuperAdmin]
    pagination_class = None

# ─────────────────────────────────────────
# Tenant management
# ─────────────────────────────────────────

class TenantManagementViewSet(viewsets.ModelViewSet):
    queryset = Tenant.objects.all()
    serializer_class = SuperAdminTenantSerializer
    permission_classes = [IsSuperAdmin]
    pagination_class = None

    # ── Create + optional first admin ────────────────────────────────────
    def perform_create(self, serializer):
        tenant = serializer.save()

        admin_data = self.request.data.get('admin_user')
        if admin_data:
            provision_tenant_admin(tenant, admin_data)

        AuditLog.objects.create(
            action='tenant_created',
            resource_type='Tenant',
            resource_id=str(tenant.tenant_code),
            performed_by=self.request.user,
            description=f"Created tenant {tenant.tenant_name}",
            ip_address=get_client_ip(self.request),
        )

    def perform_update(self, serializer):
        tenant = serializer.save()
        AuditLog.objects.create(
            action='tenant_updated',
            resource_type='Tenant',
            resource_id=str(tenant.tenant_code),
            performed_by=self.request.user,
            description=f"Updated tenant {tenant.tenant_name}",
            ip_address=get_client_ip(self.request),
        )

    def perform_destroy(self, instance):
        tenant_code = str(instance.tenant_code)
        tenant_name = instance.tenant_name
        instance.delete()
        AuditLog.objects.create(
            action='tenant_deleted',
            resource_type='Tenant',
            resource_id=tenant_code,
            performed_by=self.request.user,
            description=f"Deleted tenant {tenant_name}",
            ip_address=get_client_ip(self.request),
        )

    # ── Status actions ────────────────────────────────────────────────────
    @action(detail=True, methods=['post'])
    def suspend(self, request, pk=None):
        tenant = self.get_object()
        tenant.status = Tenant.TenantStatus.SUSPENDED
        tenant.is_active = False
        tenant.save()
        AuditLog.objects.create(
            action='tenant_suspended',
            resource_type='Tenant',
            resource_id=str(tenant.tenant_code),
            performed_by=request.user,
            description=f"Suspended tenant {tenant.tenant_name}",
            ip_address=get_client_ip(request),
        )
        return Response({'status': 'tenant suspended'})

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        tenant = self.get_object()
        tenant.status = Tenant.TenantStatus.ACTIVE
        tenant.is_active = True
        tenant.save()
        AuditLog.objects.create(
            action='tenant_activated',
            resource_type='Tenant',
            resource_id=str(tenant.tenant_code),
            performed_by=request.user,
            description=f"Activated tenant {tenant.tenant_name}",
            ip_address=get_client_ip(request),
        )
        return Response({'status': 'tenant activated'})

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        tenant = self.get_object()
        tenant.status = Tenant.TenantStatus.ARCHIVED
        tenant.is_active = False
        tenant.save()
        AuditLog.objects.create(
            action='tenant_archived',
            resource_type='Tenant',
            resource_id=str(tenant.tenant_code),
            performed_by=request.user,
            description=f"Archived tenant {tenant.tenant_name}",
            ip_address=get_client_ip(request),
        )
        return Response({'status': 'tenant archived'})

    # ── Module toggling ───────────────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='toggle_modules')
    def toggle_modules(self, request, pk=None):
        """
        Accepts a dict of module flags to update.
        Example body: {"has_resources": true, "has_exams": false}
        Only recognised module fields are accepted; unknown keys are ignored.
        """
        tenant = self.get_object()
        updated = {}

        for field, value in request.data.items():
            if field in TENANT_MODULE_FIELDS:
                setattr(tenant, field, bool(value))
                updated[field] = bool(value)

        if not updated:
            return Response(
                {'error': f'No valid module fields provided. Valid fields: {TENANT_MODULE_FIELDS}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tenant.save(update_fields=list(updated.keys()))

        AuditLog.objects.create(
            action='subscription_updated',
            resource_type='Tenant',
            resource_id=str(tenant.tenant_code),
            performed_by=request.user,
            description=f"Toggled modules {updated} for tenant {tenant.tenant_name}",
            ip_address=get_client_ip(request),
        )
        return Response({'updated_modules': updated, 'status': 'ok'})

    # ── Subscription update ───────────────────────────────────────────────
    @action(detail=True, methods=['put', 'patch'], url_path='update_subscription')
    def update_subscription(self, request, pk=None):
        tenant = self.get_object()
        serializer = SubscriptionUpdateSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        for field, value in serializer.validated_data.items():
            setattr(tenant, field, value)
        tenant.save()

        AuditLog.objects.create(
            action='subscription_updated',
            resource_type='Tenant',
            resource_id=str(tenant.tenant_code),
            performed_by=request.user,
            description=f"Updated subscription for tenant {tenant.tenant_name}: {serializer.validated_data}",
            ip_address=get_client_ip(request),
        )
        return Response(SuperAdminTenantSerializer(tenant).data)

    # ── Tenant users (read-only) ─────────────────────────────────────────
    @action(detail=True, methods=['get'], url_path='users')
    def users(self, request, pk=None):
        tenant = self.get_object()
        users = tenant.users.select_related('role').all()
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)


# ─────────────────────────────────────────
# Audit log (paginated, filterable)
# ─────────────────────────────────────────

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [IsSuperAdmin]
    pagination_class = AuditLogPagination

    def get_queryset(self):
        qs = AuditLog.objects.select_related('performed_by').order_by('-timestamp')

        action_filter = self.request.query_params.get('action')
        tenant_filter = self.request.query_params.get('tenant')

        if action_filter:
            qs = qs.filter(action=action_filter)
        if tenant_filter:
            qs = qs.filter(resource_id=tenant_filter)

        return qs
