from rest_framework import serializers
from .models import Tenant

class SuperAdminTenantSerializer(serializers.ModelSerializer):
    user_count = serializers.SerializerMethodField()

    class Meta: # type: ignore
        model = Tenant
        fields = '__all__'
        read_only_fields = ['slug', 'generated_portal_url', 'created_at', 'updated_at']

    def get_user_count(self, obj):
        return obj.users.count()


class TenantModuleActionSerializer(serializers.Serializer):
    modules = serializers.ListField(child=serializers.CharField())
    status = serializers.BooleanField()


class SubscriptionUpdateSerializer(serializers.Serializer):
    subscription_type = serializers.ChoiceField(
        choices=Tenant.SubscriptionType.choices, required=False
    )
    contract_start_date = serializers.DateField(required=False, allow_null=True)
    contract_end_date = serializers.DateField(required=False, allow_null=True)
    renewal_status = serializers.BooleanField(required=False)
