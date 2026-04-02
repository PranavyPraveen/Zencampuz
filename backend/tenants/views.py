from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from .models import Tenant

class TenantBrandingView(APIView):
    """
    Public endpoint to fetch tenant branding (logo, colors, name) safely by subdomain.
    """
    permission_classes = [AllowAny]

    def get(self, request, subdomain):
        try:
            tenant = Tenant.objects.get(subdomain=subdomain, is_active=True)
            return Response({
                'name': tenant.tenant_name,
                'primary_color': tenant.primary_color,
                'secondary_color': tenant.secondary_color,
                'logo': request.build_absolute_uri(tenant.logo.url) if tenant.logo else None
            }, status=status.HTTP_200_OK)
        except Tenant.DoesNotExist:
            return Response({'error': 'Tenant not found or inactive'}, status=status.HTTP_404_NOT_FOUND)
