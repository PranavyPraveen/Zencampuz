from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    LoginView, LogoutView, UserProfileView, TenantUserViewSet,
    RoleListView, OTPLoginView, ChangePasswordView,
    TenantDashboardStatsView, FacultyDashboardStatsView, TicketExchangeView,
    # RBAC
    PermissionListView, MyPermissionsView, RolePermissionsView, AllRolesWithPermissionsView,
    RoleDefaultPermissionsView,
    HODDashboardStatsView,
)

router = DefaultRouter()
router.register(r'users', TenantUserViewSet, basename='tenant-users')

urlpatterns = [
    # ── Auth ──────────────────────────────────────────────────
    path('login/',            LoginView.as_view(),           name='login'),
    path('otp-login/',        OTPLoginView.as_view(),        name='otp_login'),
    path('ticket-exchange/',  TicketExchangeView.as_view(),  name='ticket_exchange'),
    path('logout/',           LogoutView.as_view(),          name='logout'),
    path('refresh/',          TokenRefreshView.as_view(),    name='token_refresh'),
    path('profile/',          UserProfileView.as_view(),     name='user_profile'),
    path('change-password/',  ChangePasswordView.as_view(),  name='change_password'),
    path('dashboard-stats/',  TenantDashboardStatsView.as_view(), name='dashboard_stats'),
    path('faculty-dashboard-stats/',  FacultyDashboardStatsView.as_view(), name='faculty_dashboard_stats'),
    path('hod-dashboard-stats/',  HODDashboardStatsView.as_view(), name='hod_dashboard_stats'),

    # ── Roles & Users ──────────────────────────────────────────
    path('roles/',            RoleListView.as_view(),        name='roles-list'),

    # ── RBAC ──────────────────────────────────────────────────
    path('permissions/',                PermissionListView.as_view(),           name='permissions-list'),
    path('my-permissions/',             MyPermissionsView.as_view(),            name='my-permissions'),
    path('role-defaults/',              RoleDefaultPermissionsView.as_view(),   name='role-defaults'),
    path('rbac/',                       AllRolesWithPermissionsView.as_view(),  name='rbac-all'),
    path('role-permissions/<int:role_id>/', RolePermissionsView.as_view(),      name='role-permissions'),

    # ── DRF Router (User CRUD) ─────────────────────────────────
    path('', include(router.urls)),
]
