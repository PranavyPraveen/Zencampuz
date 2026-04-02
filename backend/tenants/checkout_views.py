from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.generics import ListAPIView
from django.core.cache import cache
from django.core.mail import send_mail
from django.conf import settings
from superadmin.models import PricingModule
from superadmin.serializers import PricingModuleSerializer
from .models import Tenant
from accounts.models import CustomUser, Role
import razorpay
import random
import json

class PublicPricingView(ListAPIView):
    permission_classes = [AllowAny]
    queryset = PricingModule.objects.all()
    serializer_class = PricingModuleSerializer
    pagination_class = None

class CheckSubdomainView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        subdomain = request.query_params.get('subdomain')
        if not subdomain:
            return Response({'error': 'Subdomain parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if subdomain exists
        exists = Tenant.objects.filter(subdomain=subdomain).exists()
        if exists:
            return Response({'error': 'Subdomain is already taken'}, status=status.HTTP_409_CONFLICT)
        
        return Response({'message': 'Subdomain is available'})

class SendOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Generate 6-digit OTP
        otp = str(random.randint(100000, 999999))
        
        # Store OTP in cache for 10 minutes
        cache.set(f'otp_{email}', otp, timeout=600)
        
        try:
            send_mail(
                'CampuZcore Verification Code',
                f'Your verification code for CampuZcore is: {otp}. This code will expire in 10 minutes.',
                settings.EMAIL_HOST_USER,
                [email],
                fail_silently=False,
            )
        except Exception as e:
            return Response({'error': f'Failed to send email: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'message': 'OTP sent successfully'})

class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        otp = request.data.get('otp')

        if not email or not otp:
            return Response({'error': 'Email and OTP are required'}, status=status.HTTP_400_BAD_REQUEST)

        cached_otp = cache.get(f'otp_{email}')
        if not cached_otp:
            return Response({'error': 'OTP expired or not requested'}, status=status.HTTP_400_BAD_REQUEST)

        if str(cached_otp) != str(otp):
            return Response({'error': 'Invalid OTP'}, status=status.HTTP_400_BAD_REQUEST)

        # Clear OTP after successful verification
        cache.delete(f'otp_{email}')
        
        # We can set another cache flag to mark email as verified if needed, 
        # but for this flow the frontend holding the state is sufficient.
        return Response({'message': 'OTP verified successfully'})

class CreateOrderView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            total_amount = float(request.data.get('total', 0))
            if total_amount <= 0:
                return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)

            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            
            # Razorpay expects amount in paise (multiply by 100)
            amount_in_paise = int(total_amount * 100)
            
            order_data = {
                'amount': amount_in_paise,
                'currency': 'INR',
                'payment_capture': '1'
            }
            
            order = client.order.create(data=order_data)
            return Response({
                'order_id': order['id'],
                'amount': order['amount'],
                'currency': order['currency']
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CompleteCheckoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        
        # 1. Verify Razorpay Signature
        try:
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            
            # This verifies the signature natively
            client.utility.verify_payment_signature({
                'razorpay_order_id': data.get('order_id'),
                'razorpay_payment_id': data.get('payment_id'),
                'razorpay_signature': data.get('signature')
            })
        except razorpay.errors.SignatureVerificationError:
            return Response({'error': 'Invalid payment signature'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 2. Extract Data
        tenant_details = data.get('tenant_details', {})
        admin_details = data.get('admin_details', {})
        cart_items = data.get('cart_items', [])

        try:
            # 3. Create Tenant
            tenant = Tenant.objects.create(
                tenant_name=tenant_details.get('name'),
                subdomain=tenant_details.get('subdomain'),
                primary_color=tenant_details.get('theme_color', '#0B1026'),
                status=Tenant.TenantStatus.ACTIVE,
                # Assign modules based on cart_items
                has_resources=any('resource' in i.get('id', '') for i in cart_items),
                has_bookings=any('facility' in i.get('id', '') for i in cart_items),
                has_timetable=any('timetable' in i.get('id', '') for i in cart_items),
                has_exams=any('exam' in i.get('id', '') for i in cart_items),
                has_reports=any('analytics' in i.get('id', '') for i in cart_items),
                has_notifications=True # Default true for premium
            )
            
            # If Bundle is in cart, activate all
            if any('bundle' in i.get('id', '') for i in cart_items):
                tenant.has_resources = True
                tenant.has_bookings = True
                tenant.has_timetable = True
                tenant.has_exams = True
                tenant.has_reports = True
                tenant.save()

            # 4. Create Admin User
            role, _ = Role.objects.get_or_create(name=Role.RoleChoices.TENANT_ADMIN)
            
            # Safely get or create user to prevent crashes if email exists
            user, created = CustomUser.objects.get_or_create(
                email=admin_details.get('email'),
                defaults={
                    'full_name': admin_details.get('name'),
                    'role': role,
                    'tenant': tenant,
                    'is_staff': True
                }
            )
            
            if created:
                user.set_password(admin_details.get('password'))
                user.save()
            else:
                # If user already exists, update their tenant admin status
                user.role = role
                user.tenant = tenant
                user.set_password(admin_details.get('password'))
                user.save()
            
            # 5. Send Welcome Email
            try:
                # Use configurable frontend URL (localhost:3000 for dev, real domain in prod)
                frontend_base = getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:3000')
                login_url = f"{frontend_base}/login"
                portal_url_display = tenant.generated_portal_url or login_url

                mail_body = f"""Hello {admin_details.get('name')},

Welcome to CampuZcore! Your institution '{tenant_details.get('name')}' has been officially provisioned on our Intelligent Campus OS.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏫  Institution:  {tenant_details.get('name')}
🔑  Portal Code:  {tenant.tenant_code}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

➤  Login URL (click or paste into browser):
   {login_url}

➤  Your Login Credentials:
   Email:     {admin_details.get('email')}
   Password:  {admin_details.get('password')}

⚠️  For security, please change your password immediately after your first login.
    You can also sign in securely using OTP sent to this email.

Need help? Reply to this email or contact support@campuzcore.com

Best regards,
The CampuZcore Team
"""
                send_mail(
                    subject='🎓 Welcome to CampuZcore – Your Campus Portal is Ready!',
                    message=mail_body,
                    from_email=settings.EMAIL_HOST_USER,
                    recipient_list=[admin_details.get('email')],
                    fail_silently=True,
                )
            except Exception as e:
                print(f"Failed sending welcome email to {admin_details.get('email')}: {e}")

            return Response({
                'message': 'Checkout complete, tenant provisioned successfully',
                'portal_url': tenant.generated_portal_url
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({'error': f'Failed provisioning tenant: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
