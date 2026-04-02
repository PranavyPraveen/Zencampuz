from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import UnifiedCalendarView, ReportingViewSet

router = DefaultRouter()
router.register(r'metrics', ReportingViewSet, basename='reports-metrics')

urlpatterns = [
    path('calendar/', UnifiedCalendarView.as_view(), name='unified-calendar'),
] + router.urls
