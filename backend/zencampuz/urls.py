from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/users/', include('accounts.urls')),   # alias: /api/users/ → same as /api/auth/
    path('api/superadmin/', include('superadmin.urls')),
    # Modules
    path('api/tenants/', include('tenants.urls')),
    path('api/campus/', include('campus.urls')),
    path('api/resources/', include('resources.urls')),
    path('api/bookings/', include('bookings.urls')),
    path('api/academics/', include('academics.urls')),
    path('api/timetable/', include('timetable.urls')),
    path('api/exams/', include('exams.urls')),
    path('api/reports/', include('campus_reports.urls')),
    path('api/notifications/', include('notifications.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
