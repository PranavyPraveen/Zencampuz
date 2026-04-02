from django.urls import path
from .checkout_views import (
    CheckSubdomainView,
    SendOTPView,
    VerifyOTPView,
    CreateOrderView,
    CompleteCheckoutView,
    PublicPricingView
)
from .views import TenantBrandingView

urlpatterns = [
    path('public/check-subdomain/', CheckSubdomainView.as_view(), name='check-subdomain'),
    path('public/send-otp/', SendOTPView.as_view(), name='send-otp'),
    path('public/verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('public/create-order/', CreateOrderView.as_view(), name='create-order'),
    path('public/complete-checkout/', CompleteCheckoutView.as_view(), name='complete-checkout'),
    path('public/pricing/', PublicPricingView.as_view(), name='public-pricing'),
    path('public/branding/<str:subdomain>/', TenantBrandingView.as_view(), name='tenant-branding'),
]
