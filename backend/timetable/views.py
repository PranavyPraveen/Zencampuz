from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.db.models import Q

from .models import (
    WorkingDay, TimeSlotTemplate, TimetablePlan, TimetableSlot,
    ClassSession, FacultyAssignment, RoomAssignment,
    TimetablePublishLog, TimetableChangeRequest, LeaveRequest, SubstitutionRequest
)
from .serializers import (
    WorkingDaySerializer, TimeSlotTemplateSerializer, TimetablePlanSerializer,
    TimetableSlotSerializer, ClassSessionSerializer, FacultyAssignmentSerializer,
    RoomAssignmentSerializer, TimetablePublishLogSerializer, TimetableChangeRequestSerializer,
    LeaveRequestSerializer, SubstitutionRequestSerializer
)
from .services import TimetableScheduler
from campus.models import Room
from notifications.utils import create_notification
class TenantTimetableViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    def get_tenant(self):
        return self.request.user.tenant

    def perform_create(self, serializer):
        serializer.save(tenant=self.get_tenant())

    def _role_name(self):
        return getattr(getattr(self.request.user, 'role', None), 'name', '')

    def _is_tenant_manager(self):
        return self._role_name() in ['super_admin', 'tenant_admin', 'academic_admin', 'it_admin']

    def _is_hod_for_department(self, department):
        user = self.request.user
        return bool(department and getattr(department, 'head_of_department_id', None) == getattr(user, 'id', None))

    def _get_hod_department(self):
        from academics.models import Department

        try:
            if self.request.user.faculty_profile.department_id:
                return self.request.user.faculty_profile.department
        except Exception:
            pass

        department = Department.objects.filter(
            tenant=self.get_tenant(),
            head_of_department=self.request.user,
        ).select_related('campus').first()
        if department:
            return department

        role_name = getattr(getattr(self.request.user, 'role', None), 'name', '')
        if role_name != 'hod':
            return None

        department_label = (getattr(self.request.user, 'department', '') or '').split('(')[0].strip().lower().replace('&', 'and')
        if not department_label:
            return None

        department_qs = Department.objects.filter(tenant=self.get_tenant()).select_related('campus')
        if getattr(self.request.user, 'campus_id', None):
            campus_matches = department_qs.filter(campus_id=self.request.user.campus_id)
            for item in campus_matches:
                item_label = item.name.split('(')[0].strip().lower().replace('&', 'and')
                if ' '.join(item_label.split()) == ' '.join(department_label.split()):
                    return item

        for item in department_qs:
            item_label = item.name.split('(')[0].strip().lower().replace('&', 'and')
            if ' '.join(item_label.split()) == ' '.join(department_label.split()):
                return item

        return None


class WorkingDayViewSet(TenantTimetableViewSet):
    serializer_class = WorkingDaySerializer
    filterset_fields = ['is_active', 'day']

    def get_queryset(self):
        return WorkingDay.objects.filter(tenant=self.get_tenant())

    @action(detail=False, methods=['POST'], url_path='init-defaults')
    def init_defaults(self, request):
        """Helper to quickly seed Mon-Fri for a tenant."""
        tenant = self.get_tenant()
        if WorkingDay.objects.filter(tenant=tenant).exists():
            return Response({'status': 'Already initialized.'})
        
        days = ['mon', 'tue', 'wed', 'thu', 'fri']
        for i, d in enumerate(days, start=1):
            WorkingDay.objects.create(tenant=tenant, day=d, order=i)
        return Response({'status': 'Default Mon-Fri created.'})


class TimeSlotTemplateViewSet(TenantTimetableViewSet):
    serializer_class = TimeSlotTemplateSerializer
    filterset_fields = ['is_break']
    ordering_fields = ['start_time', 'order']

    def get_queryset(self):
        return TimeSlotTemplate.objects.filter(tenant=self.get_tenant())


class TimetablePlanViewSet(TenantTimetableViewSet):
    serializer_class = TimetablePlanSerializer
    filterset_fields = ['status', 'semester', 'section', 'campus', 'programme', 'batch']
    search_fields = ['name']

    def get_queryset(self):
        qs = TimetablePlan.objects.filter(tenant=self.get_tenant()).select_related(
            'semester', 'section', 'campus', 'programme', 'batch',
            'section__batch__program__department'
        )
        hod_department = self._get_hod_department()
        if hod_department and not self._is_tenant_manager():
            qs = qs.filter(section__batch__program__department=hod_department)
        # Extra non-FK filters via query_params
        dept_id = self.request.query_params.get('department_id')
        if dept_id:
            qs = qs.filter(section__batch__program__department_id=dept_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(tenant=self.get_tenant(), created_by=self.request.user)

    @action(detail=False, methods=['GET'], url_path='generate-name')
    def generate_name(self, request):
        """Returns an auto-generated plan name from dropdown selections."""
        from campus.models import Campus
        from academics.models import Department, Program, Semester, Batch, Section
        def get_obj(model, pk):
            try:
                return model.objects.get(pk=pk)
            except Exception:
                return None

        campus     = get_obj(Campus,     request.query_params.get('campus_id'))
        department = get_obj(Department, request.query_params.get('department_id'))
        programme  = get_obj(Program,    request.query_params.get('programme_id'))
        semester   = get_obj(Semester,   request.query_params.get('semester_id'))
        batch      = get_obj(Batch,      request.query_params.get('batch_id'))
        section    = get_obj(Section,    request.query_params.get('section_id'))

        name = TimetablePlan.generate_name(
            campus=campus, department=department, programme=programme,
            semester=semester, batch=batch, section=section
        )
        return Response({'name': name})

    @action(detail=True, methods=['POST'], url_path='publish')
    def publish(self, request, pk=None):
        plan = self.get_object()
        if plan.status == 'published':
            return Response({'error': 'Plan is already published.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Calculate new version
        last_log = plan.publish_logs.order_by('-version').first()
        new_version = (last_log.version + 1) if last_log else 1

        with transaction.atomic():
            plan.status = 'published'
            plan.save()
            TimetablePublishLog.objects.create(
                tenant=self.get_tenant(),
                plan=plan,
                published_by=request.user,
                version=new_version,
                notes=request.data.get('notes', '')
            )
        return Response({'status': f'Published version {new_version}.'})

    @action(detail=True, methods=['GET'], url_path='grid')
    def get_grid(self, request, pk=None):
        """Returns the full parsed timetable grid. Supports optional ?faculty_id filter."""
        plan = self.get_object()
        faculty_id = request.query_params.get('faculty_id')

        # Faculty can only access their own timetable grid, not the admin monitor view.
        if self._role_name() == 'faculty' and str(faculty_id or '') != str(request.user.id):
            return Response({'detail': 'Not allowed'}, status=status.HTTP_403_FORBIDDEN)

        slots = TimetableSlot.objects.filter(plan=plan)\
            .select_related('day', 'time_slot')\
            .prefetch_related(
                'class_sessions__course_section__course',
                'class_sessions__faculty_assignments__faculty',
                'class_sessions__room_assignments__room__room_type'
            )
        serializer = TimetableSlotSerializer(slots, many=True)
        data = serializer.data

        # Optional faculty filter: strip slots that don't contain that faculty's sessions
        if faculty_id:
            filtered = []
            for slot in data:
                sessions = [
                    s for s in slot.get('class_sessions', [])
                    if any(fa['faculty'] == faculty_id for fa in s.get('faculty_assignments', []))
                ]
                if sessions:
                    filtered.append({**slot, 'class_sessions': sessions})
            return Response(filtered)

        return Response(data)

    @action(detail=False, methods=['GET'], url_path='calendar-sessions')
    def calendar_sessions(self, request):
        """
        Returns a flat list of ClassSessions for calendar display.
        Filters: date, campus_id, department_id, faculty_id, semester_id, plan_id
        """
        import uuid
        def to_uuid(val):
            if not val or val == 'undefined' or val == 'null': return None
            try:
                return uuid.UUID(str(val))
            except (ValueError, TypeError):
                return None

        # Base queryset with essential selects and prefetches for performance
        qs = ClassSession.objects.filter(
            tenant=self.get_tenant(), is_active=True
        ).select_related(
            'timetable_slot__plan', 
            'timetable_slot__day', 
            'timetable_slot__time_slot',
            'course_section__course', 
            'course_section__section'
        ).prefetch_related(
            'faculty_assignments__faculty', 
            'room_assignments__room'
        )

        # Robust parameter extraction and validation
        params = {
            'plan_id': to_uuid(request.query_params.get('plan_id')),
            'semester_id': to_uuid(request.query_params.get('semester_id')),
            'department_id': to_uuid(request.query_params.get('department_id')),
            'campus_id': to_uuid(request.query_params.get('campus_id')),
            'faculty_id': to_uuid(request.query_params.get('faculty_id')),
        }
        hod_department = self._get_hod_department()
        if hod_department and not self._is_tenant_manager():
            qs = qs.filter(course_section__course__department=hod_department)

        if params['plan_id']:
            qs = qs.filter(timetable_slot__plan_id=params['plan_id'])
        if params['semester_id']:
            qs = qs.filter(timetable_slot__plan__semester_id=params['semester_id'])
        if params['department_id']:
            qs = qs.filter(course_section__course__department_id=params['department_id'])
        if params['campus_id']:
            qs = qs.filter(timetable_slot__plan__campus_id=params['campus_id'])
        if params['faculty_id']:
            qs = qs.filter(faculty_assignments__faculty_id=params['faculty_id'])

        results = []
        # Limit results for calendar to avoid massive payloads
        for sess in qs.distinct()[:1000]:
            try:
                slot = sess.timetable_slot
                if not slot or not slot.day or not slot.time_slot:
                    continue
                
                # Safely collect faculty and room lists
                faculty_list = []
                for fa in sess.faculty_assignments.all():
                    if fa.faculty:
                        faculty_list.append({
                            'id': str(fa.faculty.id), 
                            'name': getattr(fa.faculty, 'full_name', str(fa.faculty))
                        })
                
                room_list = [ra.room.room_number for ra in sess.room_assignments.all() if ra.room]
                
                results.append({
                    'id': str(sess.id),
                    'course_name': sess.course_section.course.name if sess.course_section and sess.course_section.course else 'N/A',
                    'course_code': sess.course_section.course.code if sess.course_section and sess.course_section.course else 'N/A',
                    'session_type': sess.session_type,
                    'day': slot.day.day,
                    'day_display': slot.day.get_day_display(),
                    'start_time': str(slot.time_slot.start_time),
                    'end_time': str(slot.time_slot.end_time),
                    'time_slot_name': slot.time_slot.name,
                    'plan_id': str(slot.plan_id),
                    'plan_name': slot.plan.name if slot.plan else '',
                    'faculty': faculty_list,
                    'rooms': room_list,
                })
            except Exception:
                # Catch-all for any weird per-record serialization errors to keep the whole request from failing
                continue

        return Response(results)

    @action(detail=True, methods=['POST'], url_path='generate-slots')
    def generate_slots(self, request, pk=None):
        """Cross-joins all active WorkingDays and TimeSlotTemplates to scaffold TimetableSlots."""
        plan = self.get_object()
        tenant = self.get_tenant()
        days = WorkingDay.objects.filter(tenant=tenant, is_active=True)
        times = TimeSlotTemplate.objects.filter(tenant=tenant)
        
        created = 0
        for d in days:
            for t in times:
                obj, is_new = TimetableSlot.objects.get_or_create(
                    tenant=tenant, plan=plan, day=d, time_slot=t
                )
                if is_new:
                    created += 1
        
        return Response({'status': f'Created {created} new slots.'})

    @action(detail=True, methods=['POST'], url_path='clear-sessions')
    def clear_sessions(self, request, pk=None):
        """Delete all auto-generated class sessions for this plan so it can be re-scheduled cleanly."""
        plan = self.get_object()
        slots = TimetableSlot.objects.filter(plan=plan)
        deleted_count = ClassSession.objects.filter(
            timetable_slot__in=slots, is_active=True
        ).delete()[0]
        return Response({'status': f'Cleared {deleted_count} session(s). Plan is ready for a fresh auto-schedule.'})

    @action(detail=True, methods=['POST'], url_path='auto-schedule')
    def auto_schedule(self, request, pk=None):
        """Triggers the heuristic auto-scheduler for this plan."""
        import traceback
        plan = self.get_object()
        tenant = self.get_tenant()

        # Pre-flight checks
        from academics.models import CourseSection
        from campus.models import Room
        from timetable.models import TimetableSlot

        cs_count = CourseSection.objects.filter(semester=plan.semester, section=plan.section).count()
        room_count = Room.objects.filter(tenant=tenant, status='active').count()
        slot_count = TimetableSlot.objects.filter(plan=plan).count()

        if cs_count == 0:
            return Response({'error': f'No courses assigned to this section/semester. Please add course sections first.'}, status=status.HTTP_400_BAD_REQUEST)
        if room_count == 0:
            return Response({'error': 'No active rooms found. Please add rooms to the campus first.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Generate slots if empty
            if slot_count == 0:
                from timetable.models import WorkingDay, TimeSlotTemplate
                days = WorkingDay.objects.filter(tenant=tenant, is_active=True)
                times = TimeSlotTemplate.objects.filter(tenant=tenant)
                if not days.exists() or not times.exists():
                    return Response({'error': 'No working days or time slots configured.'}, status=status.HTTP_400_BAD_REQUEST)
                for d in days:
                    for t in times:
                        TimetableSlot.objects.get_or_create(tenant=tenant, plan=plan, day=d, time_slot=t)

            scheduler = TimetableScheduler(plan)
            results = scheduler.run_auto_schedule()
            results['rooms_available'] = room_count
            results['course_sections'] = cs_count
            results['assigned'] = results.get('success_count', 0)
            results['skipped'] = results.get('total_requested', 0) - results.get('success_count', 0)
            return Response(results)
        except Exception as e:
            tb = traceback.format_exc()
            return Response({'error': str(e), 'traceback': tb}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




class TimetableSlotViewSet(TenantTimetableViewSet):
    serializer_class = TimetableSlotSerializer
    filterset_fields = ['plan', 'day', 'time_slot']

    def get_queryset(self):
        return TimetableSlot.objects.filter(tenant=self.get_tenant()).select_related('plan', 'day', 'time_slot')

    @action(detail=True, methods=['GET'], url_path='suggest-rooms')
    def suggest_rooms(self, request, pk=None):
        """Returns best fit rooms for this slot given course type and capacity."""
        slot = self.get_object()
        course_type = request.query_params.get('course_type', 'theory')
        faculty_id = request.query_params.get('faculty_id')
        
        # Build a temporary scheduler context just for discovery
        scheduler = TimetableScheduler(slot.plan)
        
        candidate_rooms = scheduler.get_candidate_rooms(
            course_type=course_type,
            required_capacity=slot.plan.section.strength
        )
        
        # Filter down only to rooms free precisely at this slot
        available = [r for r in candidate_rooms if scheduler.is_room_free(r.id, slot)]
        
        # Return top 10 recommendations
        data = [{'id': r.id, 'room_number': r.room_number, 'name': r.room_name, 'capacity': r.capacity, 'type': r.room_type.name} for r in available[:10]]
        return Response(data)


class ClassSessionViewSet(TenantTimetableViewSet):
    serializer_class = ClassSessionSerializer
    filterset_fields = ['timetable_slot', 'course_section', 'session_type', 'is_active']

    def get_queryset(self):
        return ClassSession.objects.filter(tenant=self.get_tenant()).select_related('timetable_slot', 'course_section')


class FacultyAssignmentViewSet(TenantTimetableViewSet):
    serializer_class = FacultyAssignmentSerializer
    filterset_fields = ['class_session', 'faculty']

    def get_queryset(self):
        return FacultyAssignment.objects.filter(tenant=self.get_tenant()).select_related('class_session', 'faculty')


class RoomAssignmentViewSet(TenantTimetableViewSet):
    serializer_class = RoomAssignmentSerializer
    filterset_fields = ['class_session', 'room']

    def get_queryset(self):
        return RoomAssignment.objects.filter(tenant=self.get_tenant()).select_related('class_session', 'room')


class TimetablePublishLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TimetablePublishLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return TimetablePublishLog.objects.filter(tenant=self.request.user.tenant)


class TimetableChangeRequestViewSet(TenantTimetableViewSet):
    serializer_class = TimetableChangeRequestSerializer
    filterset_fields = ['plan', 'status']

    def get_queryset(self):
        return TimetableChangeRequest.objects.filter(tenant=self.get_tenant()).select_related('plan', 'requested_by')


class LeaveRequestViewSet(TenantTimetableViewSet):
    serializer_class = LeaveRequestSerializer
    filterset_fields = ['status', 'faculty', 'date']
    ordering_fields = ['date', 'created_at']

    def get_queryset(self):
        qs = LeaveRequest.objects.filter(tenant=self.get_tenant()).select_related('faculty', 'proposed_substitute', 'reviewed_by')
        # Faculty can only see their own; admins see all
        user = self.request.user
        hod_department = self._get_hod_department()
        if hod_department and not self._is_tenant_manager():
            normalized_name = hod_department.name.split('(')[0].replace('&', 'and').strip()
            qs = qs.filter(
                Q(faculty__faculty_profile__department=hod_department) |
                Q(
                    faculty__campus=hod_department.campus,
                    faculty__department__icontains=normalized_name,
                )
            )
        elif not self._is_tenant_manager():
            qs = qs.filter(faculty=user)
        return qs

    def perform_create(self, serializer):
        leave = serializer.save(tenant=self.get_tenant(), faculty=self.request.user)
        faculty_profile = getattr(self.request.user, 'faculty_profile', None)
        department = getattr(faculty_profile, 'department', None)
        approver = getattr(department, 'head_of_department', None)
        if approver and approver != self.request.user:
            create_notification(
                tenant=leave.tenant,
                recipient=approver,
                title='Leave request submitted',
                message=f'{self.request.user.full_name} submitted a leave request for {leave.date}.',
                notification_type='leave_submitted',
                related_model='LeaveRequest',
                related_object_id=leave.id,
            )

    @action(detail=True, methods=['POST'], url_path='approve')
    def approve(self, request, pk=None):
        leave = self.get_object()
        department = getattr(getattr(leave.faculty, 'faculty_profile', None), 'department', None)
        if not (self._is_tenant_manager() or self._is_hod_for_department(department)):
            return Response({'error': 'Only HOD, campus admin, or tenant admins can approve leave.'}, status=status.HTTP_403_FORBIDDEN)
        from django.utils import timezone
        leave.status = 'approved'
        leave.reviewed_by = request.user
        leave.reviewed_at = timezone.now()
        leave.admin_notes = request.data.get('notes', '')
        leave.save()
        create_notification(
            tenant=leave.tenant,
            recipient=leave.faculty,
            title='Leave request approved',
            message=f'Your leave request for {leave.date} was approved.',
            notification_type='leave_approved',
            related_model='LeaveRequest',
            related_object_id=leave.id,
        )
        if leave.proposed_substitute:
            create_notification(
                tenant=leave.tenant,
                recipient=leave.proposed_substitute,
                title='You were proposed as a substitute',
                message=f'{leave.faculty.full_name} proposed you as a substitute for leave on {leave.date}.',
                notification_type='substitution_requested',
                related_model='LeaveRequest',
                related_object_id=leave.id,
            )
        return Response({'status': 'Leave approved.'})

    @action(detail=True, methods=['POST'], url_path='reject')
    def reject(self, request, pk=None):
        leave = self.get_object()
        department = getattr(getattr(leave.faculty, 'faculty_profile', None), 'department', None)
        if not (self._is_tenant_manager() or self._is_hod_for_department(department)):
            return Response({'error': 'Only HOD, campus admin, or tenant admins can reject leave.'}, status=status.HTTP_403_FORBIDDEN)
        from django.utils import timezone
        leave.status = 'rejected'
        leave.reviewed_by = request.user
        leave.reviewed_at = timezone.now()
        leave.admin_notes = request.data.get('notes', '')
        leave.save()
        create_notification(
            tenant=leave.tenant,
            recipient=leave.faculty,
            title='Leave request rejected',
            message=f'Your leave request for {leave.date} was rejected.',
            notification_type='leave_rejected',
            related_model='LeaveRequest',
            related_object_id=leave.id,
        )
        return Response({'status': 'Leave rejected.'})


class SubstitutionRequestViewSet(TenantTimetableViewSet):
    serializer_class = SubstitutionRequestSerializer
    filterset_fields = ['status', 'original_faculty', 'substitute_faculty', 'class_session']

    def get_queryset(self):
        qs = SubstitutionRequest.objects.filter(tenant=self.get_tenant()).select_related(
            'original_faculty', 'substitute_faculty', 'class_session'
        )
        user = self.request.user
        hod_department = self._get_hod_department()
        if hod_department and not self._is_tenant_manager():
            qs = qs.filter(class_session__course_section__course__department=hod_department)
        elif not self._is_tenant_manager():
            qs = qs.filter(
                Q(original_faculty=user) | Q(substitute_faculty=user)
            )
        return qs

    def perform_create(self, serializer):
        """Creates substitution request with status=pending, awaiting HOD."""
        substitution = serializer.save(tenant=self.get_tenant(), requested_by=self.request.user)
        department = getattr(substitution.class_session.course_section.course, 'department', None)
        approver = getattr(department, 'head_of_department', None)
        if approver and approver != self.request.user:
            create_notification(
                tenant=substitution.tenant,
                recipient=approver,
                title='Substitution request awaiting approval',
                message=f'{substitution.original_faculty.full_name} requested a substitute for {substitution.class_session}.',
                notification_type='substitution_requested',
                related_model='SubstitutionRequest',
                related_object_id=substitution.id,
            )

    @action(detail=True, methods=['POST'], url_path='hod-approve')
    def hod_approve(self, request, pk=None):
        """HOD approves the substitution — forwards to admin for final action."""
        sub = self.get_object()
        from django.utils import timezone
        department = getattr(sub.class_session.course_section.course, 'department', None)
        if not (self._is_tenant_manager() or self._is_hod_for_department(department)):
            return Response({'error': 'Only HOD, campus admin, or tenant admins can approve substitution.'}, status=status.HTTP_403_FORBIDDEN)
        if sub.status != 'pending':
            return Response({'error': f'Cannot HOD-approve from status: {sub.status}'}, status=status.HTTP_400_BAD_REQUEST)
        sub.status = 'hod_approved'
        sub.hod_reviewed_by = request.user
        sub.hod_reviewed_at = timezone.now()
        sub.hod_notes = request.data.get('notes', '')
        sub.save()
        create_notification(
            tenant=sub.tenant,
            recipient=sub.substitute_faculty,
            title='Substitution request approved',
            message=f'You have been approved as substitute for {sub.class_session}.',
            notification_type='substitution_approved',
            related_model='SubstitutionRequest',
            related_object_id=sub.id,
        )
        create_notification(
            tenant=sub.tenant,
            recipient=sub.original_faculty,
            title='Substitution request approved',
            message=f'Your substitution request for {sub.class_session} has been approved.',
            notification_type='substitution_approved',
            related_model='SubstitutionRequest',
            related_object_id=sub.id,
        )
        return Response({'status': 'HOD approved. Awaiting final admin confirmation.'})

    @action(detail=True, methods=['POST'], url_path='hod-reject')
    def hod_reject(self, request, pk=None):
        """HOD rejects the substitution request."""
        sub = self.get_object()
        from django.utils import timezone
        department = getattr(sub.class_session.course_section.course, 'department', None)
        if not (self._is_tenant_manager() or self._is_hod_for_department(department)):
            return Response({'error': 'Only HOD, campus admin, or tenant admins can reject substitution.'}, status=status.HTTP_403_FORBIDDEN)
        sub.status = 'hod_rejected'
        sub.hod_reviewed_by = request.user
        sub.hod_reviewed_at = timezone.now()
        sub.hod_notes = request.data.get('notes', '')
        sub.save()
        create_notification(
            tenant=sub.tenant,
            recipient=sub.original_faculty,
            title='Substitution request rejected',
            message=f'Your substitution request for {sub.class_session} was rejected.',
            notification_type='substitution_rejected',
            related_model='SubstitutionRequest',
            related_object_id=sub.id,
        )
        return Response({'status': 'Substitution request rejected by HOD.'})

    @action(detail=True, methods=['POST'], url_path='approve')
    def approve(self, request, pk=None):
        """Admin final-approve: swap FacultyAssignment in the timetable."""
        sub = self.get_object()
        from django.utils import timezone
        department = getattr(sub.class_session.course_section.course, 'department', None)
        if not (self._is_tenant_manager() or self._is_hod_for_department(department)):
            return Response({'error': 'Only HOD, campus admin, or tenant admins can approve substitution.'}, status=status.HTTP_403_FORBIDDEN)

        if sub.status not in ['pending', 'hod_approved']:
            return Response(
                {'error': f'Cannot approve: status is "{sub.get_status_display()}".'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            FacultyAssignment.objects.filter(
                class_session=sub.class_session,
                faculty=sub.original_faculty
            ).update(is_primary=False)

            FacultyAssignment.objects.get_or_create(
                class_session=sub.class_session,
                faculty=sub.substitute_faculty,
                defaults={'tenant': sub.tenant, 'is_primary': True}
            )

            sub.status = 'approved'
            sub.responded_at = timezone.now()
            sub.save()

        create_notification(
            tenant=sub.tenant,
            recipient=sub.substitute_faculty,
            title='Substitution assignment confirmed',
            message=f'You are assigned to cover {sub.class_session}.',
            notification_type='substitution_approved',
            related_model='SubstitutionRequest',
            related_object_id=sub.id,
        )
        create_notification(
            tenant=sub.tenant,
            recipient=sub.original_faculty,
            title='Substitution assignment confirmed',
            message=f'Your class {sub.class_session} has a confirmed substitute.',
            notification_type='substitution_approved',
            related_model='SubstitutionRequest',
            related_object_id=sub.id,
        )

        return Response({'status': 'Substitution fully approved. Timetable updated.'})

    @action(detail=True, methods=['POST'], url_path='reject')
    def reject(self, request, pk=None):
        sub = self.get_object()
        from django.utils import timezone
        department = getattr(sub.class_session.course_section.course, 'department', None)
        if not (self._is_tenant_manager() or self._is_hod_for_department(department)):
            return Response({'error': 'Only HOD, campus admin, or tenant admins can reject substitution.'}, status=status.HTTP_403_FORBIDDEN)
        sub.status = 'rejected'
        sub.responded_at = timezone.now()
        sub.save()
        create_notification(
            tenant=sub.tenant,
            recipient=sub.original_faculty,
            title='Substitution request rejected',
            message=f'Your substitution request for {sub.class_session} was rejected.',
            notification_type='substitution_rejected',
            related_model='SubstitutionRequest',
            related_object_id=sub.id,
        )
        return Response({'status': 'Substitution rejected.'})
