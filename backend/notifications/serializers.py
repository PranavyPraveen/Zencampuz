from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    recipient_name = serializers.CharField(source='recipient.full_name', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'recipient_name',
            'title', 'message', 'notification_type',
            'related_model', 'related_object_id',
            'is_read', 'created_at'
        ]
        read_only_fields = ['id', 'recipient', 'recipient_name', 'created_at']
