from rest_framework import serializers
from .models import ResourceCategory, Resource, ResourceTag, SubResourceUnit, RoomResourceMapping, MaintenanceSchedule, UtilizationLog


class ResourceTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResourceTag
        fields = ['id', 'name']


class ResourceCategorySerializer(serializers.ModelSerializer):
    resource_count = serializers.SerializerMethodField()

    class Meta:
        model = ResourceCategory
        fields = ['id', 'name', 'category_type', 'description', 'icon', 'resource_count', 'created_at']

    def get_resource_count(self, obj):
        return getattr(obj, 'resource_count', 0)


class ResourceSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)
    category_type = serializers.CharField(source='category.category_type', read_only=True, default=None)
    room_name = serializers.CharField(source='room.room_number', read_only=True, default=None)
    campus_name = serializers.CharField(source='campus.name', read_only=True, default=None)
    campus_id = serializers.PrimaryKeyRelatedField(source='campus', read_only=True, default=None)
    building_name = serializers.CharField(source='building.name', read_only=True, default=None)
    building_id = serializers.PrimaryKeyRelatedField(source='building', read_only=True, default=None)
    tags = ResourceTagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=ResourceTag.objects.all(),
        source='tags',
        many=True,
        write_only=True,
        required=False
    )
    sub_unit_count = serializers.SerializerMethodField()
    utilization_rate = serializers.SerializerMethodField()

    class Meta:
        model = Resource
        fields = [
            'id', 'resource_code', 'name', 'category', 'category_name', 'category_type',
            'campus', 'campus_id', 'campus_name',
            'building', 'building_id', 'building_name',
            'room', 'room_name', 'department',
            'quantity_total', 'quantity_available', 'unit_type',
            'bookable_as_whole', 'bookable_per_unit',
            'status', 'tags', 'tag_ids',
            'requires_approval', 'restricted_roles',
            'under_maintenance', 'notes',
            'sub_unit_count', 'utilization_rate',
            'created_at', 'updated_at',
        ]

    def get_sub_unit_count(self, obj):
        return getattr(obj, 'sub_unit_count', 0)

    def get_utilization_rate(self, obj):
        if obj.quantity_total == 0:
            return 0
        used = obj.quantity_total - obj.quantity_available
        return round((used / obj.quantity_total) * 100, 1)


class SubResourceUnitSerializer(serializers.ModelSerializer):
    resource_name = serializers.CharField(source='resource.name', read_only=True)
    resource_code = serializers.CharField(source='resource.resource_code', read_only=True)

    class Meta:
        model = SubResourceUnit
        fields = ['id', 'resource', 'resource_name', 'resource_code', 'unit_label', 'status', 'notes', 'created_at']


class RoomResourceMappingSerializer(serializers.ModelSerializer):
    room_number = serializers.CharField(source='room.room_number', read_only=True)
    building_name = serializers.CharField(source='room.building.name', read_only=True)
    resource_name = serializers.CharField(source='resource.name', read_only=True)
    resource_code = serializers.CharField(source='resource.resource_code', read_only=True)

    class Meta:
        model = RoomResourceMapping
        fields = ['id', 'room', 'room_number', 'building_name', 'resource', 'resource_name', 'resource_code', 'notes', 'created_at']


class MaintenanceScheduleSerializer(serializers.ModelSerializer):
    resource_name = serializers.CharField(source='resource.name', read_only=True)
    resource_code = serializers.CharField(source='resource.resource_code', read_only=True)
    category_name = serializers.CharField(source='resource.category.name', read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(source='resource.category', read_only=True)
    campus_name = serializers.SerializerMethodField()
    campus_id = serializers.SerializerMethodField()

    class Meta:
        model = MaintenanceSchedule
        fields = [
            'id', 'resource', 'resource_name', 'resource_code',
            'category_name', 'category_id', 'campus_name', 'campus_id',
            'title', 'maintenance_type', 'priority', 'scheduled_date', 'estimated_hours',
            'assigned_to', 'status', 'notes', 'completed_at', 'created_at',
        ]

    def get_campus_name(self, obj):
        return obj.resource.campus.name if obj.resource.campus else None

    def get_campus_id(self, obj):
        return str(obj.resource.campus_id) if obj.resource.campus_id else None


class UtilizationLogSerializer(serializers.ModelSerializer):
    resource_name = serializers.CharField(source='resource.name', read_only=True)

    class Meta:
        model = UtilizationLog
        fields = ['id', 'resource', 'resource_name', 'sub_unit', 'booked_by', 'start_time', 'end_time', 'purpose', 'created_at']
