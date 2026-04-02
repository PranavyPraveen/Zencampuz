from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BookingPolicyRuleViewSet, BookingRequestViewSet,
    BookingApprovalViewSet, BookingConflictLogViewSet
)

router = DefaultRouter()
router.register(r'policies', BookingPolicyRuleViewSet, basename='booking-policies')
router.register(r'requests', BookingRequestViewSet, basename='booking-requests')
router.register(r'approvals', BookingApprovalViewSet, basename='booking-approvals')
router.register(r'conflicts', BookingConflictLogViewSet, basename='booking-conflicts')

urlpatterns = [
    path('', include(router.urls)),
]
