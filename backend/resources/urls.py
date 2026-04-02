from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ResourceTagViewSet, ResourceCategoryViewSet, ResourceViewSet,
    SubResourceUnitViewSet, RoomResourceMappingViewSet,
    MaintenanceScheduleViewSet, UtilizationLogViewSet
)

router = DefaultRouter()
router.register(r'tags', ResourceTagViewSet)
router.register(r'categories', ResourceCategoryViewSet)
router.register(r'assets', ResourceViewSet)
router.register(r'sub-units', SubResourceUnitViewSet)
router.register(r'room-mappings', RoomResourceMappingViewSet)
router.register(r'maintenance', MaintenanceScheduleViewSet)
router.register(r'utilization', UtilizationLogViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
