from rest_framework import serializers
from .models import Campus, Building, Floor, Room, RoomType, FacilityTag

class FacilityTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = FacilityTag
        fields = ['id', 'name']


class RoomTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomType
        fields = ['id', 'type_code', 'name', 'description']


class CampusSerializer(serializers.ModelSerializer):
    building_count = serializers.SerializerMethodField()
    room_count = serializers.SerializerMethodField()

    class Meta:
        model = Campus
        fields = ['id', 'name', 'address', 'contact_email', 'contact_phone', 'status', 'building_count', 'room_count', 'created_at']

    def get_building_count(self, obj):
        return getattr(obj, 'building_count', 0)

    def get_room_count(self, obj):
        return getattr(obj, 'room_count', 0)


class BuildingSerializer(serializers.ModelSerializer):
    campus_name = serializers.CharField(source='campus.name', read_only=True)
    floor_count = serializers.SerializerMethodField()
    room_count = serializers.SerializerMethodField()

    class Meta:
        model = Building
        fields = ['id', 'campus', 'campus_name', 'name', 'code', 'total_floors', 'floor_count', 'room_count', 'created_at']

    def get_floor_count(self, obj):
        return getattr(obj, 'floor_count', 0)

    def get_room_count(self, obj):
        return getattr(obj, 'room_count', 0)


class FloorSerializer(serializers.ModelSerializer):
    building_name = serializers.CharField(source='building.name', read_only=True)
    campus_name = serializers.CharField(source='building.campus.name', read_only=True)
    room_count = serializers.SerializerMethodField()

    class Meta:
        model = Floor
        fields = ['id', 'building', 'building_name', 'campus_name', 'floor_number', 'name', 'room_count']
        
    def get_room_count(self, obj):
        return getattr(obj, 'room_count', 0)


class RoomSerializer(serializers.ModelSerializer):
    campus_name = serializers.CharField(source='campus.name', read_only=True)
    building_name = serializers.CharField(source='building.name', read_only=True)
    building_code = serializers.CharField(source='building.code', read_only=True)
    floor_name = serializers.CharField(source='floor.name', read_only=True)
    floor_number = serializers.IntegerField(source='floor.floor_number', read_only=True)
    room_type_name = serializers.CharField(source='room_type.name', read_only=True)
    
    available_facilities = FacilityTagSerializer(many=True, read_only=True)
    facility_ids = serializers.PrimaryKeyRelatedField(
        queryset=FacilityTag.objects.all(),
        source='available_facilities',
        many=True,
        write_only=True,
        required=False
    )

    class Meta:
        model = Room
        fields = [
            'id', 'campus', 'campus_name', 'building', 'building_name', 'building_code',
            'floor', 'floor_name', 'floor_number', 'room_type', 'room_type_name',
            'room_number', 'room_name', 'capacity', 'status', 'description', 'department',
            'is_wheelchair_accessible', 'has_projector', 'has_video_conferencing', 'has_smart_board',
            'under_maintenance', 'available_facilities', 'facility_ids', 'created_at'
        ]
        read_only_fields = ['campus', 'tenant'] # Auto-assigned in model.save() based on building

    def validate(self, data):
        # Additional validation passes
        if 'floor' in data and 'building' in data:
            if data['floor'].building != data['building']:
                raise serializers.ValidationError({"floor": "This floor does not belong to the selected building."})
        return data
