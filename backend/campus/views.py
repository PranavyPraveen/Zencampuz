from rest_framework import viewsets, status, filters, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count
from accounts.permissions import IsTenantOrCampusAdmin
from accounts.utils import resolve_assigned_campus, apply_campus_scope

from .models import Campus, Building, Floor, Room, RoomType, FacilityTag
from .serializers import (
    CampusSerializer, BuildingSerializer, FloorSerializer, 
    RoomSerializer, RoomTypeSerializer, FacilityTagSerializer
)

import csv
from io import StringIO


class TenantFilteredViewSet(viewsets.ModelViewSet):
    """
    Base ViewSet that:
    - Filters by the user's tenant (all users)
    - Further scopes to campus for campus IT admins
    - Assigns tenant on creation
    """
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [IsTenantOrCampusAdmin()]

    def get_queryset(self):
        qs = self.queryset.filter(tenant=self.request.user.tenant)  # type: ignore
        # Apply campus scope if the user is a campus IT admin
        return apply_campus_scope(qs, self.request.user)

    def perform_create(self, serializer):
        campus = resolve_assigned_campus(self.request.user)
        if campus:
            # Campus IT admin: force campus to their assigned value
            serializer.save(tenant=self.request.user.tenant, campus=campus)  # type: ignore
        else:
            serializer.save(tenant=self.request.user.tenant)  # type: ignore


class FacilityTagViewSet(TenantFilteredViewSet):
    queryset = FacilityTag.objects.all()
    serializer_class = FacilityTagSerializer
    search_fields = ['name']

    def get_queryset(self):
        # FacilityTag has no campus field — just scope by tenant
        return FacilityTag.objects.filter(tenant=self.request.user.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)


class RoomTypeViewSet(TenantFilteredViewSet):
    queryset = RoomType.objects.all()
    serializer_class = RoomTypeSerializer
    search_fields = ['name', 'type_code']

    def get_queryset(self):
        # RoomType has no campus field — just scope by tenant
        return RoomType.objects.filter(tenant=self.request.user.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)

    # Auto-seed basic types if a tenant has none upon querying
    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        if not qs.exists():
            tenant = request.user.tenant  # type: ignore
            RoomType.objects.bulk_create([
                RoomType(tenant=tenant, type_code='classroom', name='Classroom'),
                RoomType(tenant=tenant, type_code='lab', name='Laboratory'),
                RoomType(tenant=tenant, type_code='meeting_room', name='Meeting Room'),
                RoomType(tenant=tenant, type_code='auditorium', name='Auditorium'),
            ])
            qs = self.get_queryset()
        
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


class CampusViewSet(TenantFilteredViewSet):
    queryset = Campus.objects.all()
    serializer_class = CampusSerializer
    search_fields = ['name', 'address']

    def get_queryset(self):
        qs = Campus.objects.filter(tenant=self.request.user.tenant).annotate(
            building_count=Count('buildings', distinct=True),
            room_count=Count('rooms', distinct=True)
        )
        # Campus IT admin: only their assigned campus
        campus = resolve_assigned_campus(self.request.user)
        if campus:
            qs = qs.filter(id=campus.id)
        return qs

    def create(self, request, *args, **kwargs):
        # Campus IT admins cannot create new campuses
        campus = resolve_assigned_campus(request.user)
        if campus is not None:
            return Response(
                {'error': 'Campus IT admins cannot create new campuses.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        campus = resolve_assigned_campus(request.user)
        if campus is not None:
            return Response(
                {'error': 'Campus IT admins cannot modify campus records.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        campus = resolve_assigned_campus(request.user)
        if campus is not None:
            return Response(
                {'error': 'Campus IT admins cannot delete campuses.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)


class BuildingViewSet(TenantFilteredViewSet):
    queryset = Building.objects.all()
    serializer_class = BuildingSerializer
    filterset_fields = ['campus', 'campus_id']
    search_fields = ['name', 'code']

    def get_queryset(self):
        qs = Building.objects.filter(tenant=self.request.user.tenant).annotate(
            floor_count=Count('floors', distinct=True),
            room_count=Count('rooms', distinct=True)
        )
        return apply_campus_scope(qs, self.request.user)


class FloorViewSet(TenantFilteredViewSet):
    queryset = Floor.objects.all()
    serializer_class = FloorSerializer
    filterset_fields = ['building', 'building_id', 'building__campus', 'building__campus_id']
    search_fields = ['name', 'floor_number']

    def get_queryset(self):
        qs = Floor.objects.filter(tenant=self.request.user.tenant).annotate(
            room_count=Count('rooms', distinct=True)
        )
        # Scope floors by campus via building__campus
        return apply_campus_scope(qs, self.request.user, campus_field='building__campus')


class RoomViewSet(TenantFilteredViewSet):
    queryset = Room.objects.select_related('campus', 'building', 'floor', 'room_type').prefetch_related('available_facilities')
    serializer_class = RoomSerializer
    filterset_fields = ['campus', 'campus_id', 'building', 'building_id', 'floor', 'floor_id', 'room_type', 'room_type__type_code', 'status', 'under_maintenance', 'is_wheelchair_accessible']
    search_fields = ['room_number', 'room_name', 'department']

    @action(detail=False, methods=['POST'], url_path='bulk-upload')
    def bulk_upload(self, request):
        """
        Accepts a CSV file of rooms.
        Expected headers: building_code, floor_number, room_number, room_type_code, capacity
        """
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No CSV file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            tenant = request.user.tenant  # type: ignore
            assigned_campus = resolve_assigned_campus(request.user)
            csv_file = StringIO(file_obj.read().decode('utf-8'))
            reader = csv.DictReader(csv_file)
            
            created_count = 0
            errors = []

            for row_num, row in enumerate(reader, start=2):
                b_code = row.get('building_code')
                f_num = row.get('floor_number')
                r_num = row.get('room_number')
                rt_code = row.get('room_type_code')
                cap = row.get('capacity', 0)

                if not all([b_code, f_num, r_num, rt_code]):
                    errors.append(f"Row {row_num}: Missing required fields.")
                    continue

                try:
                    bldg_qs = Building.objects.filter(tenant=tenant, code=b_code)
                    if assigned_campus:
                        bldg_qs = bldg_qs.filter(campus=assigned_campus)
                    building = bldg_qs.get()
                    floor = Floor.objects.get(tenant=tenant, building=building, floor_number=int(f_num))
                    room_type = RoomType.objects.get(tenant=tenant, type_code=rt_code)

                    Room.objects.update_or_create(
                        tenant=tenant,
                        building=building,
                        room_number=r_num,
                        defaults={
                            'campus': building.campus,
                            'floor': floor,
                            'room_type': room_type,
                            'capacity': int(cap) if str(cap).isdigit() else 0,
                        }
                    )
                    created_count += 1
                except Building.DoesNotExist:
                    errors.append(f"Row {row_num}: Building {b_code} not found.")
                except Floor.DoesNotExist:
                    errors.append(f"Row {row_num}: Floor {f_num} in {b_code} not found.")
                except RoomType.DoesNotExist:
                    errors.append(f"Row {row_num}: RoomType {rt_code} not found.")
                except Exception as e:
                    errors.append(f"Row {row_num}: {str(e)}")

            return Response({
                "message": f"Successfully processed {created_count} rooms.",
                "errors": errors
            })
            
        except Exception as e:
            return Response({"error": f"Failed to parse CSV: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
