from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q
from accounts.permissions import IsTenantAdmin

from .models import ResourceCategory, Resource, ResourceTag, SubResourceUnit, RoomResourceMapping, MaintenanceSchedule, UtilizationLog
from .serializers import (
    ResourceCategorySerializer, ResourceSerializer, ResourceTagSerializer,
    SubResourceUnitSerializer, RoomResourceMappingSerializer,
    MaintenanceScheduleSerializer, UtilizationLogSerializer
)
from .utils import generate_resource_code

import csv
from io import StringIO


class TenantResourceViewSet(viewsets.ModelViewSet):
    """Base ViewSet for all resource endpoints - automatically scoped to tenant."""
    permission_classes = [IsTenantAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    def get_queryset(self):
        return self.queryset.filter(tenant=self.request.user.tenant)  # type: ignore

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)  # type: ignore


class ResourceTagViewSet(TenantResourceViewSet):
    queryset = ResourceTag.objects.all()
    serializer_class = ResourceTagSerializer
    search_fields = ['name']


class ResourceCategoryViewSet(TenantResourceViewSet):
    queryset = ResourceCategory.objects.all()
    serializer_class = ResourceCategorySerializer
    filterset_fields = ['category_type']
    search_fields = ['name', 'description']

    def get_queryset(self):
        return super().get_queryset().annotate(resource_count=Count('resources', distinct=True))


class ResourceViewSet(TenantResourceViewSet):
    queryset = Resource.objects.select_related('category', 'campus', 'building', 'room__building').prefetch_related('tags', 'sub_units')
    serializer_class = ResourceSerializer
    filterset_fields = [
        'category', 'category_id', 'status', 'room', 'department',
        'campus', 'campus_id', 'building', 'building_id',
        'bookable_per_unit', 'requires_approval', 'under_maintenance'
    ]
    search_fields = ['name', 'resource_code', 'department', 'notes']

    def get_queryset(self):
        return super().get_queryset().annotate(sub_unit_count=Count('sub_units', distinct=True))

    @action(detail=False, methods=['GET'], url_path='generate-code')
    def generate_code(self, request):
        """Returns an auto-generated unique resource code from a name."""
        name = request.query_params.get('name', '').strip()
        if not name:
            return Response({'error': 'name is required'}, status=400)
        code = generate_resource_code(name, request.user.tenant)  # type: ignore
        return Response({'code': code})

    @action(detail=False, methods=['POST'], url_path='bulk-upload')
    def bulk_upload(self, request):
        """
        CSV bulk upload for resources.
        Required headers: resource_code, name, category_name, quantity_total, unit_type
        """
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No CSV file provided."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            tenant = request.user.tenant  # type: ignore
            csv_file = StringIO(file_obj.read().decode('utf-8'))
            reader = csv.DictReader(csv_file)

            created, errors = 0, []

            for row_num, row in enumerate(reader, start=2):
                code = row.get('resource_code', '').strip()
                name = row.get('name', '').strip()
                cat_name = row.get('category_name', '').strip()
                qty = row.get('quantity_total', '1').strip()
                unit = row.get('unit_type', 'unit').strip()

                if not all([code, name, cat_name]):
                    errors.append(f"Row {row_num}: Missing required fields (resource_code, name, category_name).")
                    continue

                try:
                    category = ResourceCategory.objects.get(tenant=tenant, name__iexact=cat_name)
                    Resource.objects.update_or_create(
                        tenant=tenant, resource_code=code,
                        defaults={
                            'name': name,
                            'category': category,
                            'quantity_total': int(qty) if qty.isdigit() else 1,
                            'quantity_available': int(qty) if qty.isdigit() else 1,
                            'unit_type': unit,
                        }
                    )
                    created += 1
                except ResourceCategory.DoesNotExist:
                    errors.append(f"Row {row_num}: Category '{cat_name}' not found.")
                except Exception as e:
                    errors.append(f"Row {row_num}: {str(e)}")

            return Response({"message": f"Processed {created} resources.", "errors": errors})

        except Exception as e:
            return Response({"error": f"Parse failed: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


class SubResourceUnitViewSet(TenantResourceViewSet):
    queryset = SubResourceUnit.objects.select_related('resource')
    serializer_class = SubResourceUnitSerializer
    filterset_fields = ['resource', 'status']
    search_fields = ['unit_label', 'resource__name']


class RoomResourceMappingViewSet(TenantResourceViewSet):
    queryset = RoomResourceMapping.objects.select_related('room__building', 'resource')
    serializer_class = RoomResourceMappingSerializer
    filterset_fields = ['room', 'resource']
    search_fields = ['resource__name', 'room__room_number']


class MaintenanceScheduleViewSet(TenantResourceViewSet):
    queryset = MaintenanceSchedule.objects.select_related('resource__category', 'resource__campus')
    serializer_class = MaintenanceScheduleSerializer
    filterset_fields = [
        'resource', 'resource_id', 'status', 'priority', 'maintenance_type',
        'resource__category', 'resource__category_id',
        'resource__campus', 'resource__campus_id',
    ]
    search_fields = ['title', 'resource__name', 'assigned_to']
    ordering_fields = ['scheduled_date', 'priority']


class UtilizationLogViewSet(TenantResourceViewSet):
    queryset = UtilizationLog.objects.select_related('resource')
    serializer_class = UtilizationLogSerializer
    filterset_fields = ['resource']
    search_fields = ['booked_by', 'purpose']
    ordering_fields = ['start_time']
