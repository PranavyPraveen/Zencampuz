from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SuperAdminViewSet, TenantManagementViewSet, AuditLogViewSet, PricingModuleViewSet

router = DefaultRouter()
router.register(r'tenants', TenantManagementViewSet, basename='manage-tenants')
router.register(r'platform', SuperAdminViewSet, basename='platform-management')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-logs')
router.register(r'pricing', PricingModuleViewSet, basename='pricing-modules')

urlpatterns = [
    path('', include(router.urls)),
]
