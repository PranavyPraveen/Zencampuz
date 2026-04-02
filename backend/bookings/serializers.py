from rest_framework import serializers
from .models import (
    BookingPolicyRule, BookingRequest, BookingApproval,
    BookingParticipantInfo, RecurringBooking, BookingAttachment, BookingConflictLog
)


class BookingPolicyRuleSerializer(serializers.ModelSerializer):
    trigger_display = serializers.CharField(source='get_trigger_display', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = BookingPolicyRule
        fields = [
            'id', 'name', 'trigger', 'trigger_display', 'action', 'action_display',
            'priority', 'approver_roles', 'is_active', 'notes', 'created_at'
        ]


class BookingParticipantInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingParticipantInfo
        fields = ['id', 'name', 'email', 'role_label']


class BookingAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingAttachment
        fields = ['id', 'file_name', 'file_url', 'uploaded_at']


class RecurringBookingSerializer(serializers.ModelSerializer):
    frequency_display = serializers.CharField(source='get_frequency_display', read_only=True)

    class Meta:
        model = RecurringBooking
        fields = ['id', 'frequency', 'frequency_display', 'repeat_until', 'created_at']


class BookingApprovalSerializer(serializers.ModelSerializer):
    reviewed_by_name = serializers.CharField(source='reviewed_by.full_name', read_only=True)
    reviewed_by_email = serializers.CharField(source='reviewed_by.email', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = BookingApproval
        fields = ['id', 'booking', 'reviewed_by_name', 'reviewed_by_email', 'action', 'action_display', 'comment', 'reviewed_at']


class BookingRequestSerializer(serializers.ModelSerializer):
    requested_by_name = serializers.CharField(source='requested_by.full_name', read_only=True)
    requested_by_email = serializers.CharField(source='requested_by.email', read_only=True)
    requested_by_role = serializers.CharField(source='requested_by.role.name', read_only=True)
    room_name = serializers.CharField(source='room.room_number', read_only=True)
    resource_name = serializers.CharField(source='resource.name', read_only=True)
    sub_unit_label = serializers.CharField(source='sub_unit.unit_label', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    target_type_display = serializers.CharField(source='get_target_type_display', read_only=True)
    duration_hours = serializers.SerializerMethodField()
    participants = BookingParticipantInfoSerializer(many=True, read_only=True)
    attachments = BookingAttachmentSerializer(many=True, read_only=True)
    approvals = BookingApprovalSerializer(many=True, read_only=True)
    recurrences = RecurringBookingSerializer(many=True, read_only=True)

    class Meta:
        model = BookingRequest
        fields = [
            'id', 'title', 'purpose', 'target_type', 'target_type_display',
            'room', 'room_name', 'resource', 'resource_name', 'sub_unit', 'sub_unit_label',
            'start_time', 'end_time', 'duration_hours', 'expected_attendees',
            'status', 'status_display', 'requires_approval', 'admin_notes',
            'requested_by', 'requested_by_name', 'requested_by_email', 'requested_by_role',
            'applied_policy', 'participants', 'attachments', 'approvals', 'recurrences',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'status', 'requires_approval', 'applied_policy', 'requested_by', 'created_at', 'updated_at']

    def get_duration_hours(self, obj):
        return obj.duration_hours()


class BookingConflictLogSerializer(serializers.ModelSerializer):
    new_booking_title = serializers.CharField(source='new_booking.title', read_only=True)
    conflicting_booking_title = serializers.CharField(source='conflicting_booking.title', read_only=True)

    class Meta:
        model = BookingConflictLog
        fields = ['id', 'new_booking', 'new_booking_title', 'conflicting_booking', 'conflicting_booking_title', 'detected_at', 'resolved', 'resolution_note']
