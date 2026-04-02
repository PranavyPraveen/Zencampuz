from rest_framework import viewsets, status, filters, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q

from .models import (
    BookingPolicyRule, BookingRequest, BookingApproval,
    BookingParticipantInfo, RecurringBooking, BookingAttachment, BookingConflictLog
)
from .serializers import (
    BookingPolicyRuleSerializer, BookingRequestSerializer, BookingApprovalSerializer,
    BookingParticipantInfoSerializer, RecurringBookingSerializer,
    BookingAttachmentSerializer, BookingConflictLogSerializer
)


# ============================================================
# POLICY ENGINE
# ============================================================

def evaluate_policy(booking: BookingRequest, tenant) -> tuple[str, BookingPolicyRule | None]:
    """
    Evaluates active policies (ordered by priority) against the booking.
    Returns: (action, policy_rule) where action = 'auto_approve' | 'require_approval' | 'block'
    """
    policies = BookingPolicyRule.objects.filter(tenant=tenant, is_active=True).order_by('priority')
    requester = booking.requested_by
    role_name = getattr(getattr(requester, 'role', None), 'name', '')

    # Time-based helpers
    hour = booking.start_time.hour
    weekday = booking.start_time.weekday()  # 0=Mon, 6=Sun
    is_weekend = weekday >= 5
    is_after_hours = hour >= 18 or hour < 8
    is_long = booking.duration_hours() > 4

    for policy in policies:
        triggered = False
        t = policy.trigger

        if t == 'all':
            triggered = True
        elif t == 'role_student' and role_name == 'student':
            triggered = True
        elif t == 'role_external' and role_name == 'external_user':
            triggered = True
        elif t == 'role_research' and role_name == 'research_scholar':
            triggered = True
        elif t == 'role_facility_manager' and role_name == 'facility_manager':
            triggered = True
        elif t == 'resource_auditorium' and booking.target_type == 'auditorium':
            triggered = True
        elif t == 'resource_seminar_hall' and booking.target_type == 'seminar_hall':
            triggered = True
        elif t == 'resource_lab' and booking.target_type == 'lab_instrument':
            triggered = True
        elif t == 'resource_restricted' and booking.resource and booking.resource.requires_approval:
            triggered = True
        elif t == 'time_weekend' and is_weekend:
            triggered = True
        elif t == 'time_after_hours' and is_after_hours:
            triggered = True
        elif t == 'duration_long' and is_long:
            triggered = True

        if triggered:
            return (policy.action, policy)

    # Default: require approval if no policy matched
    return ('require_approval', None)


def check_conflicts(booking: BookingRequest, tenant) -> list:
    """
    Returns a list of conflicting active BookingRequests or existing Classes/Exams.
    """
    conflicts = []

    # 1. Other bookings
    qs = BookingRequest.objects.filter(
        tenant=tenant,
        status__in=['approved', 'active', 'pending'],
        start_time__lt=booking.end_time,
        end_time__gt=booking.start_time,
    ).exclude(id=booking.id)

    if booking.room:
        qs = qs.filter(room=booking.room)
    elif booking.resource:
        qs = qs.filter(resource=booking.resource)
    elif booking.sub_unit:
        qs = qs.filter(sub_unit=booking.sub_unit)
    else:
        return []

    conflicts.extend(list(qs))

    # 2. If it's a room booking, check Classes and Exams
    if booking.room:
        from timetable.models import TimetablePlan, ClassSession
        from exams.models import ExamHallAllocation

        # Check Exams
        exam_conflicts = ExamHallAllocation.objects.filter(
            tenant=tenant,
            room=booking.room,
            session__date=booking.start_time.date(),
            session__start_time__lt=booking.end_time.time(),
            session__end_time__gt=booking.start_time.time()
        ).select_related('session')
        
        for e in exam_conflicts:
            # We construct a mock object that has a 'title' for the error message
            class MockConflict:
               title = f"Exam: {e.session.name}"
            conflicts.append(MockConflict())

        # Check Classes
        weekday_map = {0: 'monday', 1: 'tuesday', 2: 'wednesday', 3: 'thursday', 4: 'friday', 5: 'saturday', 6: 'sunday'}
        booking_day = weekday_map[booking.start_time.weekday()]
        
        # This checks published timetable boundaries
        class_conflicts = ClassSession.objects.filter(
            tenant=tenant,
            timetable_slot__plan__status='published',
            timetable_slot__day__day__iexact=booking_day,
            timetable_slot__time_slot__start_time__lt=booking.end_time.time(),
            timetable_slot__time_slot__end_time__gt=booking.start_time.time(),
            room_assignments__room=booking.room
        ).select_related('course_section__course')

        for c in class_conflicts:
            class MockConflict:
               title = f"Class: {c.course_section.course.code}"
            conflicts.append(MockConflict())

    return conflicts


# ============================================================
# VIEWSETS
# ============================================================

class TenantBookingViewSet(viewsets.ModelViewSet):
    """Base class for all tenant-scoped booking ViewSets."""
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    def get_tenant(self):
        return self.request.user.tenant  # type: ignore

    def _is_admin(self):
        role = getattr(getattr(self.request.user, 'role', None), 'name', '')
        return role in ['super_admin', 'tenant_admin', 'academic_admin', 'facility_manager']


class BookingPolicyRuleViewSet(TenantBookingViewSet):
    serializer_class = BookingPolicyRuleSerializer
    filterset_fields = ['trigger', 'action', 'is_active']
    search_fields = ['name', 'notes']
    ordering_fields = ['priority']

    def get_queryset(self):
        return BookingPolicyRule.objects.filter(tenant=self.get_tenant())

    def perform_create(self, serializer):
        serializer.save(tenant=self.get_tenant())


class BookingRequestViewSet(TenantBookingViewSet):
    serializer_class = BookingRequestSerializer
    filterset_fields = ['status', 'target_type', 'requires_approval']
    search_fields = ['title', 'purpose', 'requested_by__full_name']
    ordering_fields = ['created_at', 'start_time']

    def get_queryset(self):
        tenant = self.get_tenant()
        user = self.request.user
        role = getattr(getattr(user, 'role', None), 'name', '')
        qs = BookingRequest.objects.filter(tenant=tenant).select_related(
            'requested_by', 'room', 'resource', 'sub_unit', 'applied_policy'
        ).prefetch_related('approvals', 'participants', 'attachments', 'recurrences')

        # Non-admins only see their own bookings (unless approval inbox role)
        if role not in ['super_admin', 'tenant_admin', 'academic_admin', 'facility_manager', 'it_admin']:
            qs = qs.filter(requested_by=user)
        return qs

    def perform_create(self, serializer):
        """
        Full booking workflow:
        1. Save draft
        2. Check conflicts
        3. Run policy engine
        4. Update status accordingly
        """
        tenant = self.get_tenant()
        booking = serializer.save(tenant=tenant, requested_by=self.request.user, status='draft')  # type: ignore

        # Step 2: Conflict check
        conflicts = check_conflicts(booking, tenant)
        if conflicts:
            for c in conflicts:
                BookingConflictLog.objects.create(
                    tenant=tenant,
                    new_booking=booking,
                    conflicting_booking=c,
                )
            booking.status = 'conflict'
            booking.admin_notes = f"Conflict with: {', '.join([c.title for c in conflicts])}"
            booking.save()
            return

        # Step 3: Policy Engine
        action, policy = evaluate_policy(booking, tenant)
        booking.applied_policy = policy

        # Step 4-6: Act on policy
        if action == 'auto_approve':
            booking.status = 'approved'
            booking.requires_approval = False
        elif action == 'block':
            booking.status = 'cancelled'
            booking.admin_notes = "Blocked by policy rule."
            booking.requires_approval = False
        else:
            booking.status = 'pending'
            booking.requires_approval = True

        booking.save()

    @action(detail=False, methods=['GET'], url_path='my-bookings')
    def my_bookings(self, request):
        """Returns only the requesting user's bookings."""
        qs = BookingRequest.objects.filter(tenant=self.get_tenant(), requested_by=request.user).order_by('-created_at')
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(BookingRequestSerializer(page, many=True).data)
        return Response(BookingRequestSerializer(qs, many=True).data)

    @action(detail=False, methods=['GET'], url_path='approval-inbox')
    def approval_inbox(self, request):
        """Admin: returns all pending bookings awaiting approval."""
        if not self._is_admin():
            return Response({'error': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
        qs = BookingRequest.objects.filter(
            tenant=self.get_tenant(), status='pending'
        ).select_related('requested_by', 'room', 'resource').order_by('start_time')
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(BookingRequestSerializer(page, many=True).data)
        return Response(BookingRequestSerializer(qs, many=True).data)

    @action(detail=True, methods=['POST'], url_path='cancel')
    def cancel(self, request, pk=None):
        booking = self.get_object()
        if booking.requested_by != request.user and not self._is_admin():
            return Response({'error': 'You can only cancel your own bookings.'}, status=status.HTTP_403_FORBIDDEN)
        if booking.status in ['completed', 'cancelled']:
            return Response({'error': f'Cannot cancel a {booking.status} booking.'}, status=status.HTTP_400_BAD_REQUEST)
        booking.status = 'cancelled'
        booking.save()
        return Response({'status': 'Booking cancelled.'})

    @action(detail=True, methods=['POST'], url_path='activate')
    def activate_booking(self, request, pk=None):
        if not self._is_admin():
            return Response({'error': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
        booking = self.get_object()
        if booking.status != 'approved':
            return Response({'error': 'Only approved bookings can be activated.'}, status=status.HTTP_400_BAD_REQUEST)
        booking.status = 'active'
        booking.save()
        return Response({'status': 'Booking activated.'})


class BookingApprovalViewSet(TenantBookingViewSet):
    serializer_class = BookingApprovalSerializer
    filterset_fields = ['booking', 'action']

    def get_queryset(self):
        return BookingApproval.objects.filter(tenant=self.get_tenant()).select_related('reviewed_by', 'booking')

    def perform_create(self, serializer):
        """Approve or reject a booking and update the booking status."""
        if not self._is_admin():
            raise PermissionError("Only admins can approve/reject bookings.")

        booking_id = self.request.data.get('booking')
        action_taken = self.request.data.get('action')
        tenant = self.get_tenant()

        try:
            booking = BookingRequest.objects.get(id=booking_id, tenant=tenant)
        except BookingRequest.DoesNotExist:
            raise serializers.ValidationError("Booking not found.")  # type: ignore

        approval = serializer.save(tenant=tenant, reviewed_by=self.request.user, booking=booking)  # type: ignore

        # Update booking status
        if action_taken == 'approved':
            booking.status = 'approved'
        elif action_taken == 'rejected':
            booking.status = 'rejected'
        booking.save()


class BookingConflictLogViewSet(TenantBookingViewSet):
    serializer_class = BookingConflictLogSerializer
    filterset_fields = ['resolved']
    ordering_fields = ['detected_at']

    def get_queryset(self):
        return BookingConflictLog.objects.filter(tenant=self.get_tenant()).select_related('new_booking', 'conflicting_booking')
