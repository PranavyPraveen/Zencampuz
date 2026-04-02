from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction

from .models import (
    ExamPlan, ExamSession, ExamCourseAssignment, 
    ExamHallAllocation, SeatingPlan, InvigilatorAssignment, ExamPublishLog
)
from .serializers import (
    ExamPlanSerializer, ExamSessionSerializer, ExamCourseAssignmentSerializer,
    ExamHallAllocationSerializer, SeatingPlanSerializer, 
    InvigilatorAssignmentSerializer, ExamPublishLogSerializer
)

class TenantExamViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    def get_tenant(self):
        return self.request.user.tenant

    def perform_create(self, serializer):
        serializer.save(tenant=self.get_tenant())

class ExamPlanViewSet(TenantExamViewSet):
    serializer_class = ExamPlanSerializer
    filterset_fields = ['status', 'semester']
    search_fields = ['name']

    def get_queryset(self):
        return ExamPlan.objects.filter(tenant=self.get_tenant()).select_related('semester')

    def perform_create(self, serializer):
        serializer.save(tenant=self.get_tenant(), created_by=self.request.user)

    @action(detail=True, methods=['POST'], url_path='publish')
    def publish(self, request, pk=None):
        plan = self.get_object()
        if plan.status == 'published':
            return Response({'error': 'Plan is already published.'}, status=status.HTTP_400_BAD_REQUEST)
        
        last_log = plan.publish_logs.order_by('-version').first()
        new_version = (last_log.version + 1) if last_log else 1

        with transaction.atomic():
            plan.status = 'published'
            plan.save()
            ExamPublishLog.objects.create(
                tenant=self.get_tenant(),
                plan=plan,
                published_by=request.user,
                version=new_version,
                notes=request.data.get('notes', '')
            )
        return Response({'status': f'Published version {new_version}.'})

class ExamSessionViewSet(TenantExamViewSet):
    serializer_class = ExamSessionSerializer
    filterset_fields = ['plan', 'date']

    def get_queryset(self):
        return ExamSession.objects.filter(tenant=self.get_tenant())

class ExamCourseAssignmentViewSet(TenantExamViewSet):
    serializer_class = ExamCourseAssignmentSerializer
    filterset_fields = ['session']

    def get_queryset(self):
        return ExamCourseAssignment.objects.filter(tenant=self.get_tenant())\
            .select_related('course_section__course', 'course_section__section')

class ExamHallAllocationViewSet(TenantExamViewSet):
    serializer_class = ExamHallAllocationSerializer
    filterset_fields = ['session']

    def get_queryset(self):
        return ExamHallAllocation.objects.filter(tenant=self.get_tenant()).select_related('room')

class SeatingPlanViewSet(TenantExamViewSet):
    serializer_class = SeatingPlanSerializer
    filterset_fields = ['exam_assignment', 'hall_allocation']

    def get_queryset(self):
        return SeatingPlan.objects.filter(tenant=self.get_tenant())\
            .select_related('exam_assignment__course_section__course', 'hall_allocation__room')

    @action(detail=False, methods=['GET'], url_path='by-session')
    def by_session(self, request):
        """Returns seating plans grouped cleanly for a whole session view"""
        session_id = request.query_params.get('session_id')
        qs = self.get_queryset().filter(hall_allocation__session_id=session_id)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

class InvigilatorAssignmentViewSet(TenantExamViewSet):
    serializer_class = InvigilatorAssignmentSerializer
    filterset_fields = ['hall_allocation', 'faculty']

    def get_queryset(self):
        return InvigilatorAssignment.objects.filter(tenant=self.get_tenant())\
            .select_related('hall_allocation__room', 'faculty')

class ExamPublishLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ExamPublishLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ExamPublishLog.objects.filter(tenant=self.request.user.tenant)\
            .select_related('published_by')
