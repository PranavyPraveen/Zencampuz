from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import (
    WorkingDay, TimeSlotTemplate, TimetablePlan, TimetableSlot,
    ClassSession, FacultyAssignment, RoomAssignment,
    TimetablePublishLog, TimetableChangeRequest, LeaveRequest, SubstitutionRequest
)

class WorkingDaySerializer(serializers.ModelSerializer):
    day_display = serializers.CharField(source='get_day_display', read_only=True)

    class Meta:
        model = WorkingDay
        fields = ['id', 'day', 'day_display', 'is_active', 'order']
        read_only_fields = ['id']


class TimeSlotTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeSlotTemplate
        fields = ['id', 'name', 'start_time', 'end_time', 'is_break', 'order']
        read_only_fields = ['id']


class TimetablePlanSerializer(serializers.ModelSerializer):
    semester_name = serializers.CharField(source='semester.__str__', read_only=True)
    section_name = serializers.CharField(source='section.__str__', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    # Enriched display context for dependent dropdowns
    campus_name = serializers.CharField(source='campus.name', read_only=True, default=None)
    programme_name = serializers.CharField(source='programme.name', read_only=True, default=None)
    batch_name = serializers.CharField(source='batch.name', read_only=True, default=None)
    department_id = serializers.SerializerMethodField(read_only=True)
    department_name = serializers.SerializerMethodField(read_only=True)

    def get_department_id(self, obj):
        try:
            return str(obj.section.batch.program.department_id)
        except Exception:
            return None

    def get_department_name(self, obj):
        try:
            return obj.section.batch.program.department.name
        except Exception:
            return None

    class Meta:
        model = TimetablePlan
        fields = [
            'id', 'name',
            'semester', 'semester_name',
            'section', 'section_name',
            'campus', 'campus_name',
            'programme', 'programme_name',
            'batch', 'batch_name',
            'department_id', 'department_name',
            'status', 'status_display',
            'valid_from', 'valid_to', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'status']



class FacultyAssignmentSerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source='faculty.full_name', read_only=True)
    faculty_email = serializers.CharField(source='faculty.email', read_only=True)

    class Meta:
        model = FacultyAssignment
        fields = ['id', 'class_session', 'faculty', 'faculty_name', 'faculty_email', 'is_primary']
        read_only_fields = ['id']

    def validate(self, data):
        # We manually run model validation to catch Faculty conflicts
        instance = FacultyAssignment(**data)
        instance.tenant = self.context['request'].user.tenant
        try:
            instance.clean()
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return data


class RoomAssignmentSerializer(serializers.ModelSerializer):
    room_number = serializers.CharField(source='room.room_number', read_only=True)
    room_type_name = serializers.CharField(source='room.room_type.name', read_only=True)
    capacity = serializers.IntegerField(source='room.capacity', read_only=True)

    class Meta:
        model = RoomAssignment
        fields = ['id', 'class_session', 'room', 'room_number', 'room_type_name', 'capacity']
        read_only_fields = ['id']

    def validate(self, data):
        # Catch Room/Capacity/Facility conflicts
        instance = RoomAssignment(**data)
        instance.tenant = self.context['request'].user.tenant
        try:
            instance.clean()
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return data


class ClassSessionSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source='course_section.course.name', read_only=True)
    course_code = serializers.CharField(source='course_section.course.code', read_only=True)
    faculty_assignments = FacultyAssignmentSerializer(many=True, read_only=True)
    room_assignments = RoomAssignmentSerializer(many=True, read_only=True)

    class Meta:
        model = ClassSession
        fields = ['id', 'timetable_slot', 'course_section', 'course_name', 'course_code',
                  'session_type', 'is_active', 'notes', 'faculty_assignments', 'room_assignments']
        read_only_fields = ['id']

    def validate(self, data):
        instance = ClassSession(**data)
        instance.tenant = self.context['request'].user.tenant
        try:
            instance.clean()
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return data


class TimetableSlotSerializer(serializers.ModelSerializer):
    day_display = serializers.CharField(source='day.get_day_display', read_only=True)
    time_slot_name = serializers.CharField(source='time_slot.name', read_only=True)
    time_slot_start = serializers.TimeField(source='time_slot.start_time', read_only=True)
    time_slot_end = serializers.TimeField(source='time_slot.end_time', read_only=True)
    # Nested ClassSessions for the grid building
    class_sessions = ClassSessionSerializer(many=True, read_only=True)

    class Meta:
        model = TimetableSlot
        fields = ['id', 'plan', 'day', 'day_display', 'time_slot', 'time_slot_name',
                  'time_slot_start', 'time_slot_end', 'class_sessions']
        read_only_fields = ['id']


class TimetablePublishLogSerializer(serializers.ModelSerializer):
    published_by_name = serializers.CharField(source='published_by.full_name', read_only=True)

    class Meta:
        model = TimetablePublishLog
        fields = ['id', 'plan', 'published_by', 'published_by_name', 'published_at', 'version', 'notes']
        read_only_fields = ['id', 'published_at', 'version']


class TimetableChangeRequestSerializer(serializers.ModelSerializer):
    requested_by_name = serializers.CharField(source='requested_by.full_name', read_only=True)
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = TimetableChangeRequest
        fields = ['id', 'plan', 'plan_name', 'requested_by', 'requested_by_name',
                  'description', 'status', 'status_display', 'created_at', 'reviewed_by', 'reviewed_at', 'admin_notes']
        read_only_fields = ['id', 'created_at', 'reviewed_at', 'status', 'reviewed_by']


class LeaveRequestSerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source='faculty.full_name', read_only=True)
    proposed_substitute_name = serializers.CharField(source='proposed_substitute.full_name', read_only=True, allow_null=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.full_name', read_only=True, allow_null=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = LeaveRequest
        fields = [
            'id', 'faculty', 'faculty_name', 'proposed_substitute', 'proposed_substitute_name', 'date', 'reason',
            'status', 'status_display', 'admin_notes',
            'reviewed_by', 'reviewed_by_name', 'reviewed_at', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'reviewed_at', 'status', 'reviewed_by']


class SubstitutionRequestSerializer(serializers.ModelSerializer):
    requested_by_name = serializers.CharField(source='requested_by.full_name', read_only=True, allow_null=True)
    original_faculty_name = serializers.CharField(source='original_faculty.full_name', read_only=True)
    substitute_faculty_name = serializers.CharField(source='substitute_faculty.full_name', read_only=True)
    class_session_display = serializers.CharField(source='class_session.__str__', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    hod_reviewed_by_name = serializers.CharField(source='hod_reviewed_by.full_name', read_only=True, allow_null=True)

    class Meta:
        model = SubstitutionRequest
        fields = [
            'id', 'requested_by', 'requested_by_name',
            'original_faculty', 'original_faculty_name',
            'substitute_faculty', 'substitute_faculty_name',
            'class_session', 'class_session_display',
            'leave_request', 'status', 'status_display', 'notes',
            'hod_reviewed_by', 'hod_reviewed_by_name', 'hod_reviewed_at', 'hod_notes',
            'requested_at', 'responded_at'
        ]
        read_only_fields = ['id', 'requested_by', 'requested_at', 'responded_at', 'status', 'hod_reviewed_by', 'hod_reviewed_at']
