from rest_framework import serializers
from .models import AuditLog, PricingModule

class PricingModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = PricingModule
        fields = '__all__'

class PerformedBySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField()
    full_name = serializers.CharField()


class AuditLogSerializer(serializers.ModelSerializer):
    performed_by = PerformedBySerializer(read_only=True)

    class Meta:  # type: ignore
        model = AuditLog
        fields = [
            'id',
            'action',
            'resource_type',
            'resource_id',
            'performed_by',
            'description',
            'timestamp',
            'ip_address',
        ]
