from rest_framework import status, viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import authenticate, get_user_model
from django.db.models import Count
from .utils import TenantAwareHelper, get_user_scope, resolve_assigned_campus
import uuid
from django.core.cache import cache
from django.utils import timezone

from .serializers import (
    UserSerializer, TenantUserSerializer, RoleSerializer,
    PermissionSerializer, RolePermissionSerializer, RoleWithPermissionsSerializer,
)
from .models import Role, Permission, RolePermission
import csv
from io import StringIO

User = get_user_model()

# Roles that a campus IT admin is allowed to assign to users they create
CAMPUS_ADMIN_ALLOWED_ROLES = [
    'faculty', 'student', 'research_scholar', 'external_user',
    'academic_admin', 'facility_manager', 'hod',
]


class TenantDashboardStatsView(APIView):
    """
    Returns real-time stats for the dashboard.
    - tenant_admin / super_admin: tenant-wide stats
    - it_admin (campus-scoped): stats filtered to assigned campus only
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        tenant = user.tenant
        scope = get_user_scope(user)

        if not tenant and scope['type'] != 'super':
            return Response({'error': 'No tenant associated with this account.'}, status=status.HTTP_400_BAD_REQUEST)

        campus = resolve_assigned_campus(user)  # None for tenant-wide admins
        is_campus_scoped = campus is not None

        # ── User counts ─────────────────────────
        if is_campus_scoped:
            qs = User.objects.filter(tenant=tenant, campus=campus, is_active=True)
        else:
            qs = User.objects.filter(tenant=tenant, is_active=True)

        total_users = qs.count()
        role_counts = {}
        for row in qs.values('role__name').annotate(count=Count('id')):
            role_counts[row['role__name'] or 'unassigned'] = row['count']

        # ── Campus infrastructure counts ────────
        try:
            from campus.models import Campus as CampusModel, Building, Room
            if is_campus_scoped:
                campuses = 1  # they manage exactly one campus
                buildings = Building.objects.filter(tenant=tenant, campus=campus).count()
                rooms = Room.objects.filter(tenant=tenant, campus=campus).count()
                active_rooms = Room.objects.filter(tenant=tenant, campus=campus, status='active').count()
                inactive_rooms = Room.objects.filter(tenant=tenant, campus=campus, status='inactive').count()
                maintenance_rooms = Room.objects.filter(tenant=tenant, campus=campus, status='maintenance').count()
            else:
                campuses = CampusModel.objects.filter(tenant=tenant).count()
                buildings = Building.objects.filter(tenant=tenant).count()
                rooms = Room.objects.filter(tenant=tenant).count()
                active_rooms = Room.objects.filter(tenant=tenant, status='active').count()
                inactive_rooms = Room.objects.filter(tenant=tenant, status='inactive').count()
                maintenance_rooms = Room.objects.filter(tenant=tenant, status='maintenance').count()
            room_utilization = round((active_rooms / rooms * 100), 1) if rooms > 0 else 0
        except Exception:
            campuses = buildings = rooms = active_rooms = inactive_rooms = maintenance_rooms = room_utilization = 0

        # ── Asset counts ─────────────────────────
        try:
            from resources.models import Resource
            if is_campus_scoped:
                # Resources linked by room → campus; use building__campus or campus field
                try:
                    asset_qs = Resource.objects.filter(tenant=tenant, room__campus=campus)
                except Exception:
                    asset_qs = Resource.objects.filter(tenant=tenant)
            else:
                asset_qs = Resource.objects.filter(tenant=tenant)

            total_assets = asset_qs.count()
            available_assets = asset_qs.filter(status='available').count()
            in_use_assets = asset_qs.filter(status='in_use').count()
            maintenance_assets = asset_qs.filter(under_maintenance=True).count()
            inactive_assets = max(total_assets - (available_assets + in_use_assets + maintenance_assets), 0)
            asset_utilization = round((in_use_assets / total_assets * 100), 1) if total_assets > 0 else 0
        except Exception:
            total_assets = available_assets = in_use_assets = maintenance_assets = inactive_assets = asset_utilization = 0

        response_data = {
            'scope': 'campus' if is_campus_scoped else 'tenant',
            'campus_name': campus.name if is_campus_scoped else None,
            'total_users': total_users,
            'students': role_counts.get('student', 0),
            'faculty': role_counts.get('faculty', 0),
            'academic_admins': role_counts.get('academic_admin', 0),
            'hods': role_counts.get('hod', 0),
            'facility_managers': role_counts.get('facility_manager', 0),
            'research_scholars': role_counts.get('research_scholar', 0),
            'campus': {
                'campuses': campuses,
                'buildings': buildings,
                'rooms': rooms,
                'active_rooms': active_rooms,
                'inactive_rooms': inactive_rooms,
                'maintenance_rooms': maintenance_rooms,
                'room_utilization': room_utilization,
            },
            'assets': {
                'total': total_assets,
                'available': available_assets,
                'in_use': in_use_assets,
                'inactive': inactive_assets,
                'maintenance': maintenance_assets,
                'utilization': asset_utilization,
            },
        }

        # Tenant-wide admins also get module flags; campus admins don't need them
        if not is_campus_scoped and tenant:
            response_data['modules'] = {
                'has_resources': tenant.has_resources,
                'has_bookings': tenant.has_bookings,
                'has_timetable': tenant.has_timetable,
                'has_exams': tenant.has_exams,
                'has_reports': tenant.has_reports,
                'has_notifications': tenant.has_notifications,
            }

        return Response(response_data)


class FacultyDashboardStatsView(APIView):
    """
    Returns real-time stats tailored for the faculty dashboard.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        tenant = user.tenant

        if not tenant:
            return Response({'error': 'No tenant associated with this account.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            fp = user.faculty_profile
        except Exception:
            fp = None

        from academics.models import FacultyPreference
        from academics.matching import profile_completion_state
        from timetable.models import LeaveRequest, SubstitutionRequest, ClassSession

        # ── Timetable & Classes ─────────────────
        today = timezone.now().date()
        today_weekday_str = today.strftime('%a').lower()[:3] # 'mon', 'tue', etc.

        try:
            today_classes_count = ClassSession.objects.filter(
                tenant=tenant,
                is_active=True,
                faculty_assignments__faculty=user,
                timetable_slot__day__day=today_weekday_str,
                timetable_slot__plan__status='published'
            ).count()

            weekly_classes_count = ClassSession.objects.filter(
                tenant=tenant,
                is_active=True,
                faculty_assignments__faculty=user,
                timetable_slot__plan__status='published'
            ).count()
        except Exception:
            today_classes_count = 0
            weekly_classes_count = 0

        # ── Substitutions ────────────────────────
        try:
            pending_substitution_requests = SubstitutionRequest.objects.filter(
                tenant=tenant,
                original_faculty=user,
                status='pending'
            ).count()

            incoming_substitutions = SubstitutionRequest.objects.filter(
                tenant=tenant,
                substitute_faculty=user,
                status='pending'
            ).count()
        except Exception:
            pending_substitution_requests = 0
            incoming_substitutions = 0

        # ── Preferences ─────────────────────────
        try:
            if fp:
                completion = profile_completion_state(fp)
                if not completion['ready_for_preferences']:
                    preference_status = 'Profile Incomplete'
                else:
                    pref = FacultyPreference.objects.get(tenant=tenant, faculty=fp)
                    preference_status = 'Submitted' if pref.ranked_subjects.exists() else 'Not Submitted'
            else:
                preference_status = 'Not Submitted'
        except FacultyPreference.DoesNotExist:
            preference_status = 'Not Submitted'
        except Exception:
            preference_status = 'Unknown'

        # ── Notifications ───────────────────────
        unread_notifications_count = 0
        if getattr(tenant, 'has_notifications', False):
            try:
                from notifications.models import Notification
                unread_notifications_count = Notification.objects.filter(
                    tenant=tenant, recipient=user, is_read=False
                ).count()
            except Exception:
                pass
                
        # ── Bookings ────────────────────────────
        booking_summary = {}
        if getattr(tenant, 'has_bookings', False):
            try:
                from bookings.models import BookingRequest
                booking_summary['pending'] = BookingRequest.objects.filter(
                    tenant=tenant, requester=user, status='pending'
                ).count()
                booking_summary['approved'] = BookingRequest.objects.filter(
                    tenant=tenant, requester=user, status='approved'
                ).count()
            except Exception:
                pass

        leave_requests = LeaveRequest.objects.filter(
            tenant=tenant,
            faculty=user
        ).select_related('proposed_substitute', 'reviewed_by').order_by('-created_at')[:5]

        substitution_requests = SubstitutionRequest.objects.filter(
            tenant=tenant
        ).filter(
            requested_by=user
        ).select_related('substitute_faculty', 'class_session').order_by('-requested_at')[:5]

        received_substitutions_qs = SubstitutionRequest.objects.filter(
            tenant=tenant,
            substitute_faculty=user,
            status__in=['hod_approved', 'approved']
        ).select_related('original_faculty', 'class_session').order_by('-requested_at')
        received_substitutions = received_substitutions_qs[:5]

        notifications = []
        if getattr(tenant, 'has_notifications', False):
            try:
                from notifications.models import Notification
                notifications = list(
                    Notification.objects.filter(
                        tenant=tenant,
                        recipient=user
                    ).values(
                        'id', 'title', 'message', 'notification_type', 'is_read', 'created_at'
                    )[:5]
                )
            except Exception:
                notifications = []

        response_data = {
            'faculty_name': user.full_name,
            'department_name': fp.department.name if fp and fp.department else getattr(user, 'department', None),
            'campus_name': fp.department.campus.name if fp and fp.department and fp.department.campus else getattr(getattr(user, 'campus', None), 'name', None),
            'assigned_campus_name': fp.department.campus.name if fp and fp.department and fp.department.campus else getattr(getattr(user, 'campus', None), 'name', None),
            'stats': {
                'today_classes_count': today_classes_count,
                'weekly_classes_count': weekly_classes_count,
                'pending_substitution_requests': pending_substitution_requests,
                'incoming_substitutions': incoming_substitutions,
                'preference_status': preference_status,
                'unread_notifications_count': unread_notifications_count,
                'bookings': booking_summary,
                'leave_pending_count': sum(1 for item in leave_requests if item.status == 'pending'),
                'leave_approved_count': sum(1 for item in leave_requests if item.status == 'approved'),
                'received_substitution_count': received_substitutions_qs.count(),
            },
            'leave_requests': [
                {
                    'id': str(item.id),
                    'date': item.date,
                    'reason': item.reason,
                    'status': item.status,
                    'status_display': item.get_status_display(),
                    'proposed_substitute_name': item.proposed_substitute.full_name if item.proposed_substitute else None,
                    'admin_notes': item.admin_notes,
                    'created_at': item.created_at,
                }
                for item in leave_requests
            ],
            'substitution_requests': [
                {
                    'id': str(item.id),
                    'status': item.status,
                    'status_display': item.get_status_display(),
                    'substitute_faculty_name': item.substitute_faculty.full_name if item.substitute_faculty else None,
                    'class_session_display': str(item.class_session) if item.class_session else '',
                    'requested_at': item.requested_at,
                }
                for item in substitution_requests
            ],
            'received_substitutions': [
                {
                    'id': str(item.id),
                    'status': item.status,
                    'status_display': item.get_status_display(),
                    'original_faculty_name': item.original_faculty.full_name if item.original_faculty else None,
                    'class_session_display': str(item.class_session) if item.class_session else '',
                    'requested_at': item.requested_at,
                }
                for item in received_substitutions
            ],
            'notifications': notifications,
        }

        return Response(response_data)


class HODDashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def _normalize_department_name(self, value):
        if not value:
            return ''
        base = value.split('(')[0].strip().lower().replace('&', 'and')
        return ' '.join(base.split())

    def _get_hod_department(self, user):
        from academics.models import Department

        try:
            if user.faculty_profile.department_id:
                return user.faculty_profile.department
        except Exception:
            pass

        department = Department.objects.filter(
            tenant=user.tenant,
            head_of_department=user,
        ).select_related('campus').first()
        if department:
            return department

        role_name = getattr(getattr(user, 'role', None), 'name', '')
        if role_name != 'hod':
            return None

        normalized_user_department = self._normalize_department_name(getattr(user, 'department', ''))
        if not normalized_user_department:
            return None

        department_qs = Department.objects.filter(tenant=user.tenant).select_related('campus')
        if getattr(user, 'campus_id', None):
            campus_matches = department_qs.filter(campus_id=user.campus_id)
            for item in campus_matches:
                if self._normalize_department_name(item.name) == normalized_user_department:
                    return item

        for item in department_qs:
            if self._normalize_department_name(item.name) == normalized_user_department:
                return item

        return None

    def _get_department_faculty_users(self, tenant, department):
        faculty_users = User.objects.filter(
            tenant=tenant,
            role__name='faculty',
        ).select_related('campus', 'role').order_by('full_name')

        target_name = self._normalize_department_name(department.name)
        results = []
        for faculty in faculty_users:
            normalized = self._normalize_department_name(getattr(faculty, 'department', ''))
            same_campus = not department.campus_id or faculty.campus_id == department.campus_id
            if same_campus and normalized == target_name:
                results.append(faculty)
        return results

    def _get_department_scope_ids(self, tenant, department):
        from academics.models import Department

        normalized_name = self._normalize_department_name(department.name)
        department_qs = Department.objects.filter(tenant=tenant)
        if department.campus_id:
            department_qs = department_qs.filter(campus_id=department.campus_id)

        matches = []
        for item in department_qs:
            if self._normalize_department_name(item.name) == normalized_name:
                matches.append(item.id)
        return matches or [department.id]

    def get(self, request):
        user = request.user
        tenant = user.tenant

        if not tenant:
            return Response({'error': 'No tenant associated with this account.'}, status=status.HTTP_400_BAD_REQUEST)

        department = self._get_hod_department(user)
        if not department:
            return Response({'error': 'No HOD department assigned.'}, status=status.HTTP_403_FORBIDDEN)
        department_scope_ids = self._get_department_scope_ids(tenant, department)

        from academics.models import FacultyPreference, Course, Program, CourseSection, Section, Batch, FacultyProfile
        from timetable.models import TimetablePlan, LeaveRequest, SubstitutionRequest

        faculty_users = self._get_department_faculty_users(tenant, department)
        faculty_user_ids = [item.id for item in faculty_users]
        faculty_emails = [item.email for item in faculty_users if item.email]

        faculty_profiles = FacultyProfile.objects.filter(
            tenant=tenant,
            department_id__in=department_scope_ids,
        ).select_related('user')

        preferences = FacultyPreference.objects.filter(
            tenant=tenant,
            faculty__department_id__in=department_scope_ids,
        ).select_related('faculty__user', 'faculty__department').prefetch_related('preferred_courses')

        courses = Course.objects.filter(tenant=tenant, department_id__in=department_scope_ids).select_related('semester')
        programs = Program.objects.filter(tenant=tenant, department_id__in=department_scope_ids)
        course_sections = CourseSection.objects.filter(
            tenant=tenant,
            course__department_id__in=department_scope_ids,
        ).select_related(
            'course', 'section__batch', 'semester', 'faculty__user'
        )
        sections = Section.objects.filter(
            tenant=tenant,
            batch__program__department_id__in=department_scope_ids,
        ).select_related('batch__program')
        batches = Batch.objects.filter(
            tenant=tenant,
            program__department_id__in=department_scope_ids,
        )
        plans = TimetablePlan.objects.filter(
            tenant=tenant,
            section__batch__program__department_id__in=department_scope_ids,
        ).select_related('programme', 'section', 'semester')
        leave_requests = LeaveRequest.objects.filter(
            tenant=tenant,
            faculty_id__in=faculty_user_ids,
        ).select_related('faculty', 'proposed_substitute', 'reviewed_by')
        substitution_requests = SubstitutionRequest.objects.filter(
            tenant=tenant,
            class_session__course_section__course__department_id__in=department_scope_ids,
        ).select_related(
            'original_faculty', 'substitute_faculty', 'class_session__course_section__course'
        )

        preference_by_email = {}
        for pref in preferences:
            faculty_email = getattr(getattr(pref.faculty, 'user', None), 'email', None)
            if faculty_email:
                preference_by_email[faculty_email] = pref

        faculty_rows = []
        pending_preferences = 0
        for faculty in faculty_users:
            profile = next((item for item in faculty_profiles if item.user_id == faculty.id), None)
            preference = preference_by_email.get(faculty.email)
            submitted = bool(preference)
            if not submitted:
                pending_preferences += 1
            faculty_rows.append({
                'id': faculty.id,
                'profile_id': str(profile.id) if profile else None,
                'name': faculty.full_name,
                'email': faculty.email,
                'designation': profile.get_designation_display() if profile else 'Not Set',
                'designation_code': getattr(profile, 'designation', '') if profile else '',
                'qualification': getattr(profile, 'qualifications', '') if profile else '',
                'skills': getattr(profile, 'skills', '') if profile else '',
                'specialization': getattr(profile, 'specialization', '') if profile else '',
                'primary_specialization_domain': getattr(getattr(profile, 'primary_specialization_domain', None), 'name', '') if profile else '',
                'secondary_specialization_domains': [
                    item.name for item in profile.secondary_specialization_domains.all()
                ] if profile else [],
                'experience': getattr(profile, 'years_of_experience', None) if profile else None,
                'status': profile.get_status_display() if profile else ('Active' if faculty.is_active else 'Inactive'),
                'max_weekly_hours': getattr(profile, 'max_weekly_hours', None) if profile else None,
                'preference_submitted': submitted,
                'profile_complete': bool(
                    profile and getattr(profile, 'primary_specialization_domain_id', None) and getattr(profile, 'years_of_experience', None) is not None
                ),
            })

        assignment_rows = []
        faculty_assignment_counts = {}
        for row in course_sections:
            if row.faculty_id:
                faculty_assignment_counts[row.faculty_id] = faculty_assignment_counts.get(row.faculty_id, 0) + 1

        for row in course_sections:
            max_hours = getattr(getattr(row.faculty, 'faculty_profile', None), 'max_weekly_hours', None) if row.faculty_id else None
            assigned_count = faculty_assignment_counts.get(row.faculty_id, 0)
            overload_warning = bool(max_hours and assigned_count > max_hours)
            assignment_rows.append({
                'id': str(row.id),
                'course_code': row.course.code,
                'course_name': row.course.name,
                'section_name': row.section.name if row.section else '',
                'section_label': str(row.section) if row.section else '',
                'semester_name': row.semester.name if row.semester else '',
                'program_name': getattr(getattr(row.semester, 'program', None), 'name', ''),
                'faculty_name': row.faculty.user.full_name if row.faculty_id else None,
                'faculty_id': str(row.faculty_id) if row.faculty_id else None,
                'is_assigned': bool(row.faculty_id),
                'assigned_load': assigned_count if row.faculty_id else 0,
                'max_weekly_hours': max_hours,
                'overload_warning': overload_warning,
            })

        course_readiness = [
            {
                'id': str(course.id),
                'code': course.code,
                'name': course.name,
                'semester_name': course.semester.name if course.semester else '',
                'program_name': getattr(getattr(course.semester, 'program', None), 'name', ''),
                'course_type': course.get_course_type_display(),
                'lecture_hours': course.lecture_hours,
                'tutorial_hours': course.tutorial_hours,
                'practical_hours': course.practical_hours,
                'total_weekly_load': course.total_hours(),
            }
            for course in courses
        ]

        preference_rows = []
        for faculty in faculty_rows:
            pref = preference_by_email.get(faculty['email'])
            ranked_subjects = list(pref.ranked_subjects.select_related('course__semester__program') if pref else [])
            preference_rows.append({
                'id': str(pref.id) if pref else None,
                'faculty_id': faculty['id'],
                'faculty_profile_id': faculty['profile_id'],
                'faculty_name': faculty['name'],
                'faculty_email': faculty['email'],
                'qualification': faculty['qualification'],
                'skills': faculty['skills'],
                'specialization': faculty['specialization'],
                'primary_specialization_domain': faculty['primary_specialization_domain'],
                'secondary_specialization_domains': faculty['secondary_specialization_domains'],
                'designation': faculty['designation'],
                'submitted': bool(pref),
                'status': getattr(pref, 'status', 'draft') if pref else 'draft',
                'status_display': pref.get_status_display() if pref else 'Draft',
                'preferred_courses': [
                    {'id': str(course.id), 'code': course.code, 'name': course.name}
                    for course in pref.preferred_courses.all()
                ] if pref else [],
                'ranked_preferences': [
                    {
                        'id': str(item.id),
                        'rank': item.rank,
                        'course': str(item.course_id),
                        'course_code': item.course.code,
                        'course_name': item.course.name,
                        'program_name': getattr(getattr(item.course.semester, 'program', None), 'name', ''),
                        'semester_name': getattr(item.course.semester, 'name', ''),
                    }
                    for item in sorted(ranked_subjects, key=lambda item: item.rank)
                ],
                'preferred_days': pref.preferred_days if pref else [],
                'preferred_time_start': str(pref.preferred_time_start) if pref and pref.preferred_time_start else '',
                'preferred_time_end': str(pref.preferred_time_end) if pref and pref.preferred_time_end else '',
                'notes': pref.notes if pref else '',
                'hod_review_note': pref.hod_review_note if pref else '',
                'hod_reviewed_by_name': getattr(getattr(pref, 'hod_reviewed_by', None), 'full_name', None) if pref else None,
                'hod_reviewed_at': pref.hod_reviewed_at if pref else None,
                'profile_complete': faculty['profile_complete'],
            })

        report_summary = {
            'faculty_workload_summary': [
                {
                    'id': faculty['profile_id'] or faculty['id'],
                    'faculty_name': faculty['name'],
                    'email': faculty['email'],
                    'designation': faculty['designation'],
                    'assigned_courses': sum(1 for item in assignment_rows if item['faculty_name'] == faculty['name']),
                    'max_weekly_hours': faculty['max_weekly_hours'],
                    'status': faculty['status'],
                }
                for faculty in faculty_rows
            ],
            'preference_submission_status': {
                'submitted': len([item for item in preference_rows if item['submitted']]),
                'pending': len([item for item in preference_rows if not item['submitted']]),
            },
            'course_assignment_status': {
                'assigned': len([item for item in assignment_rows if item['is_assigned']]),
                'unassigned': len([item for item in assignment_rows if not item['is_assigned']]),
            },
            'timetable_readiness': {
                'draft_plans': plans.filter(status='draft').count(),
                'published_plans': plans.filter(status='published').count(),
                'unassigned_courses': len([item for item in assignment_rows if not item['is_assigned']]),
            },
        }

        response_data = {
            'department_id': str(department.id),
            'department_name': department.name,
            'campus_name': department.campus.name if department.campus else None,
            'summary': {
                'total_faculty': len(faculty_rows),
                'total_programs': programs.count(),
                'total_courses': courses.count(),
                'total_sections': sections.count(),
                'total_batches': batches.count(),
                'pending_preferences': pending_preferences,
                'unassigned_courses': len([item for item in assignment_rows if not item['is_assigned']]),
                'timetable_draft_count': plans.filter(status='draft').count(),
                'pending_leave_requests': leave_requests.filter(status='pending').count(),
                'pending_substitution_requests': substitution_requests.filter(status='pending').count(),
            },
            'faculty_directory': faculty_rows,
            'faculty_preferences': preference_rows,
            'course_assignments': assignment_rows,
            'course_readiness': course_readiness,
            'timetable_plans': [
                {
                    'id': str(plan.id),
                    'name': plan.name,
                    'status': plan.status,
                    'programme_name': getattr(plan.programme, 'name', ''),
                    'section_name': getattr(plan.section, 'name', ''),
                    'semester_name': getattr(plan.semester, 'name', ''),
                }
                for plan in plans
            ],
            'leave_requests': [
                {
                    'id': str(item.id),
                    'faculty_name': item.faculty.full_name,
                    'date': item.date,
                    'reason': item.reason,
                    'status': item.status,
                    'status_display': item.get_status_display(),
                    'proposed_substitute_name': item.proposed_substitute.full_name if item.proposed_substitute else None,
                }
                for item in leave_requests.order_by('-created_at')[:10]
            ],
            'substitution_requests': [
                {
                    'id': str(item.id),
                    'original_faculty_name': item.original_faculty.full_name,
                    'substitute_faculty_name': item.substitute_faculty.full_name,
                    'course_name': item.class_session.course_section.course.name if item.class_session and item.class_session.course_section else '',
                    'status': item.status,
                    'status_display': item.get_status_display(),
                }
                for item in substitution_requests.order_by('-requested_at')[:10]
            ],
            'reports': report_summary,
        }

        return Response(response_data)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        user = authenticate(email=email, password=password)

        if user:
            if not user.is_active:
                return Response({'error': 'Account is inactive'}, status=status.HTTP_403_FORBIDDEN)

            # Strict Tenant Isolation Check
            request_tenant = TenantAwareHelper.get_tenant_from_host(request)
            
            if request_tenant:
                # 1. Tenant-Specific Login (e.g., zenith.localhost, zenith.campuzcore.com)
                if user.tenant != request_tenant:
                    return Response({'error': 'You do not belong to this institution. Please check the URL.'}, status=status.HTTP_403_FORBIDDEN)
            else:
                # 2. Public Root Login (e.g., localhost, campuzcore.com)
                if user.tenant and user.tenant.subdomain:
                    # Issue a short-lived Single Sign-On ticket to transfer them to their subdomain
                    ticket = str(uuid.uuid4())
                    cache.set(f"auth_ticket_{ticket}", user.id, timeout=60)
                    
                    return Response({
                        'ticket': ticket,
                        'subdomain': user.tenant.subdomain,
                        'message': 'Login successful. Redirecting to your institution portal...'
                    }, status=status.HTTP_200_OK)
                elif user.role and user.role.name == 'super_admin':
                    # Super admins without a tenant can log in directly at the root
                    pass
                else:
                    return Response({'error': 'You are not assigned to any institution.'}, status=status.HTTP_403_FORBIDDEN)

            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': UserSerializer(user).data
            })
        return Response({'error': 'Invalid Credentials'}, status=status.HTTP_401_UNAUTHORIZED)

class TicketExchangeView(APIView):
    """Exchanges a one-time auth ticket for JWT tokens on a specific tenant subdomain."""
    permission_classes = [AllowAny]

    def post(self, request):
        ticket = request.data.get('ticket')
        if not ticket:
            return Response({'error': 'Ticket is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        user_id = cache.get(f"auth_ticket_{ticket}")
        if not user_id:
            return Response({'error': 'Invalid or expired auth ticket'}, status=status.HTTP_400_BAD_REQUEST)
            
        cache.delete(f"auth_ticket_{ticket}")
        
        try:
            user = User.objects.get(id=user_id, is_active=True)
            
            # Verify the tenant they are landing on matches their official tenant
            request_tenant = TenantAwareHelper.get_tenant_from_host(request)
            if request_tenant and user.tenant != request_tenant:
                return Response({'error': 'Ticket invalid for this tenant domain'}, status=status.HTTP_403_FORBIDDEN)
                
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': UserSerializer(user).data
            })
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

class OTPLoginView(APIView):
    """Authenticates a user using a fast cached OTP code instead of a password."""
    permission_classes = [AllowAny]

    def post(self, request):
        from django.core.cache import cache
        email = request.data.get('email')
        otp = request.data.get('otp')

        if not email or not otp:
            return Response({'error': 'Email and OTP are required'}, status=status.HTTP_400_BAD_REQUEST)

        cached_otp = cache.get(f'otp_{email}')
        if not cached_otp:
            return Response({'error': 'OTP has expired or was not requested'}, status=status.HTTP_400_BAD_REQUEST)

        if str(cached_otp) != str(otp):
            return Response({'error': 'Invalid OTP'}, status=status.HTTP_400_BAD_REQUEST)

        # Retrieve user ignoring password checks
        try:
            user = User.objects.get(email=email)
            if not user.is_active:
               return Response({'error': 'Account is inactive'}, status=status.HTTP_403_FORBIDDEN)
               
            # Generate Token
            refresh = RefreshToken.for_user(user)
            
            # Clear cache to prevent re-use
            cache.delete(f'otp_{email}')

            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': UserSerializer(user).data
            })
        except User.DoesNotExist:
            return Response({'error': 'No user exists with this email'}, status=status.HTTP_404_NOT_FOUND)

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()

            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response(status=status.HTTP_400_BAD_REQUEST)

class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Strict Token Validation against Domain Tenant
        request_tenant = TenantAwareHelper.get_tenant_from_host(request)
        user = request.user
        
        # If user is on a tenant subdomain but they don't belong to it
        if request_tenant and user.tenant != request_tenant:
            return Response({'error': 'Mismatched tenant context. Please log in again.'}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = UserSerializer(user)
        return Response(serializer.data)

    def patch(self, request):
        """Allows users to update their own profile (name, phone)."""
        allowed_fields = {'full_name', 'phone'}
        data = {k: v for k, v in request.data.items() if k in allowed_fields}
        for field, value in data.items():
            setattr(request.user, field, value)
        request.user.save()
        return Response(UserSerializer(request.user).data)


class ChangePasswordView(APIView):
    """Allows authenticated users to securely change their own password."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')

        if not current_password or not new_password:
            return Response({'error': 'Both current_password and new_password are required.'},
                            status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        if not user.check_password(current_password):
            return Response({'error': 'Current password is incorrect.'},
                            status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 8:
            return Response({'error': 'New password must be at least 8 characters.'},
                            status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({'message': 'Password updated successfully.'})

class RoleListView(APIView):
    """Returns the list of all assignable roles (excludes super_admin for non-superadmins)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        roles = Role.objects.all()
        user_role = getattr(request.user, 'role', None)
        role_name = getattr(user_role, 'name', '')

        if role_name == 'super_admin':
            return Response(RoleSerializer(roles, many=True).data)

        # Campus IT admins can only assign a limited subset of roles
        if role_name == 'it_admin' and request.user.campus_id:
            roles = roles.filter(name__in=CAMPUS_ADMIN_ALLOWED_ROLES)
        else:
            roles = roles.exclude(name='super_admin')

        return Response(RoleSerializer(roles, many=True).data)


class TenantUserViewSet(viewsets.ModelViewSet):
    """
    Full tenant-scoped user management.
    - tenant_admin: can manage all users in the tenant
    - campus it_admin: can manage users in their assigned campus only
    """
    serializer_class = TenantUserSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'department', 'role__name']
    search_fields = ['full_name', 'email', 'department']
    ordering_fields = ['full_name', 'created_at']

    def _get_campus_department_names(self, campus, tenant):
        from academics.models import Department
        return Department.objects.filter(
            campus=campus,
            tenant=tenant
        ).values_list('name', flat=True)

    def _resolve_csv_campus(self, row, tenant, is_campus_admin=False, request_user=None):
        """
        Resolve a campus from CSV data.
        Supports:
        - campus_id
        - campus
        - campus_name
        - department-driven inference when a department maps uniquely to one campus
        """
        from campus.models import Campus
        from academics.models import Department

        if is_campus_admin and request_user and request_user.campus_id:
            return request_user.campus, None

        campus_id_str = (row.get('campus_id') or '').strip()
        campus_name = (row.get('campus') or row.get('campus_name') or '').strip()
        department_name = (row.get('department') or '').strip()

        if campus_id_str:
            try:
                return Campus.objects.get(id=campus_id_str, tenant=tenant), None
            except Campus.DoesNotExist:
                return None, f'Campus {campus_id_str} not found.'

        if campus_name:
            matches = Campus.objects.filter(tenant=tenant, name__iexact=campus_name)
            if matches.count() == 1:
                return matches.first(), None
            if matches.count() > 1:
                return None, f'Campus name "{campus_name}" is ambiguous.'
            return None, f'Campus "{campus_name}" not found.'

        if department_name:
            dept_matches = Department.objects.filter(
                tenant=tenant,
                name__iexact=department_name,
                campus__isnull=False,
            ).select_related('campus')
            campus_ids = list({str(dept.campus_id): dept.campus for dept in dept_matches}.values())
            if len(campus_ids) == 1:
                return campus_ids[0], None
            if len(campus_ids) > 1:
                return None, f'Department "{department_name}" exists in multiple campuses. Provide campus or campus_id.'

        return None, None

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated or not user.tenant:
            return User.objects.none()

        scope = get_user_scope(user)
        base_qs = User.objects.filter(tenant=user.tenant).exclude(role__name='super_admin').order_by('full_name')
        from django.db.models import Q

        if scope['type'] == 'campus':
            campus_dept_names = self._get_campus_department_names(scope['campus'], user.tenant)
            base_qs = base_qs.filter(Q(campus=scope['campus']) | Q(department__in=campus_dept_names))

        requested_campus_id = self.request.query_params.get('campus_id')
        if requested_campus_id:
            campus_dept_names = self._get_campus_department_names(requested_campus_id, user.tenant)
            base_qs = base_qs.filter(Q(campus_id=requested_campus_id) | Q(department__in=campus_dept_names))

        return base_qs

    def _check_is_manager(self, request):
        """
        Returns True if the requester can manage users.
        Tenant admins and campus IT admins (with campus set) both qualify.
        """
        role_name = getattr(getattr(request.user, 'role', None), 'name', '')
        if role_name in ['super_admin', 'tenant_admin']:
            return True
        if role_name == 'it_admin' and request.user.campus_id:
            return True
        return False

    def _is_campus_admin(self, request):
        role_name = getattr(getattr(request.user, 'role', None), 'name', '')
        return role_name == 'it_admin' and bool(request.user.campus_id)

    def create(self, request, *args, **kwargs):
        if not self._check_is_manager(request):
            return Response({'error': 'Permission denied: insufficient role to create users.'}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if not self._check_is_manager(request):
            return Response({'error': 'Permission denied: insufficient role to update users.'}, status=status.HTTP_403_FORBIDDEN)
        role_name = request.data.get('role_name', '')
        if role_name == 'super_admin':
            return Response({'error': 'Cannot assign super_admin role.'}, status=status.HTTP_403_FORBIDDEN)
        # Campus admins cannot assign elevated roles
        if self._is_campus_admin(request) and role_name and role_name not in CAMPUS_ADMIN_ALLOWED_ROLES:
            return Response({'error': f'Campus admin cannot assign role "{role_name}".'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def _validate_password(self, password):
        import re
        if len(password) < 8:
            return False, "Password must be at least 8 characters long."
        if not re.search(r"[A-Z]", password):
            return False, "Password must contain at least one uppercase letter."
        if not re.search(r"[a-z]", password):
            return False, "Password must contain at least one lowercase letter."
        if not re.search(r"\d", password):
            return False, "Password must contain at least one digit."
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
            return False, "Password must contain at least one special character."
        return True, ""

    def _save_user_permissions(self, user, overrides):
        if not overrides:
            return
        tenant = user.tenant
        if not tenant:
            return
            
        from .models import Permission, UserPermission
        grants = overrides.get('grants', [])
        revokes = overrides.get('revokes', [])
        
        # Clear existing overrides for this user
        UserPermission.objects.filter(user=user, tenant=tenant).delete()
        
        def _apply_override(code_list, granted_value):
            for code in code_list:
                parts = code.split('.', 1)
                if len(parts) != 2: continue
                module_name, action = parts
                try:
                    perm = Permission.objects.get(module_name=module_name, action=action)
                    UserPermission.objects.create(
                        user=user, permission=perm, tenant=tenant, granted=granted_value
                    )
                except Permission.DoesNotExist:
                    pass

        _apply_override(grants, True)
        _apply_override(revokes, False)

    def perform_create(self, serializer):
        from rest_framework import serializers as drf_serializers
        from campus.models import Campus

        tenant = self.request.user.tenant
        role_name = serializer.validated_data.pop('role_name')
        password = serializer.validated_data.pop('password', None)
        overrides = serializer.validated_data.pop('user_permissions_overrides', None)
        campus_id = serializer.validated_data.pop('campus_id', None)

        # Campus IT admin restrictions
        if self._is_campus_admin(self.request):
            if role_name not in CAMPUS_ADMIN_ALLOWED_ROLES:
                raise drf_serializers.ValidationError(
                    {'role_name': f'Campus admin cannot assign role "{role_name}".'}
                )
            # Force the campus to the admin's campus — cannot create users in other campuses
            assigned_campus = self.request.user.campus
        else:
            # Tenant admin: allow any campus if provided
            assigned_campus = None
            if campus_id:
                try:
                    assigned_campus = Campus.objects.get(id=campus_id, tenant=tenant)
                except Campus.DoesNotExist:
                    raise drf_serializers.ValidationError({'campus_id': 'Campus not found or not in your tenant.'})

        if password:
            is_valid, msg = self._validate_password(password)
            if not is_valid:
                raise drf_serializers.ValidationError({"password": msg})
                
        role, _ = Role.objects.get_or_create(name=role_name)
        user = serializer.save(tenant=tenant, role=role, campus=assigned_campus)
        if password:
            user.set_password(password)
            user.save()
        else:
            user.set_unusable_password()
            user.save()
            
        if overrides:
            self._save_user_permissions(user, overrides)

    def perform_update(self, serializer):
        from rest_framework import serializers as drf_serializers
        from campus.models import Campus

        role_name = serializer.validated_data.pop('role_name', None)
        password = serializer.validated_data.pop('password', None)
        overrides = serializer.validated_data.pop('user_permissions_overrides', None)
        campus_id = serializer.validated_data.pop('campus_id', None)

        if password:
            is_valid, msg = self._validate_password(password)
            if not is_valid:
                raise drf_serializers.ValidationError({"password": msg})
        
        # Resolve campus if provided (tenant admin only; campus admins can't change campus)
        if campus_id and not self._is_campus_admin(self.request):
            try:
                campus = Campus.objects.get(id=campus_id, tenant=self.request.user.tenant)
                serializer.validated_data['campus'] = campus
            except Campus.DoesNotExist:
                raise drf_serializers.ValidationError({'campus_id': 'Campus not found.'})

        user = serializer.save()
        
        if role_name:
            if self._is_campus_admin(self.request) and role_name not in CAMPUS_ADMIN_ALLOWED_ROLES:
                raise drf_serializers.ValidationError(
                    {'role_name': f'Campus admin cannot assign role "{role_name}".'}
                )
            role, _ = Role.objects.get_or_create(name=role_name)
            user.role = role
            user.save()
            
        if password:
            user.set_password(password)
            user.save()
            
        if overrides is not None:
            self._save_user_permissions(user, overrides)

    @action(detail=True, methods=['PATCH'], url_path='activate')
    def activate(self, request, pk=None):
        if not self._check_is_manager(request):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_object()
        user.is_active = True
        user.save()
        return Response({'status': 'User activated.', 'email': user.email})

    @action(detail=True, methods=['PATCH'], url_path='deactivate')
    def deactivate(self, request, pk=None):
        if not self._check_is_manager(request):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        if user := self.get_object():
            if user == request.user:
                return Response({'error': 'You cannot deactivate your own account.'}, status=status.HTTP_400_BAD_REQUEST)
            user.is_active = False
            user.save()
            return Response({'status': 'User deactivated.', 'email': user.email})

    @action(detail=False, methods=['POST'], url_path='bulk-import')
    def bulk_import(self, request):
        """
        CSV bulk import for faculty and students.
        Required columns: full_name, email, role_name
        Optional columns: phone, department, campus_id/campus/campus_name, password
        """
        if not self._check_is_manager(request):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No CSV file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        FORBIDDEN_ROLES = ['super_admin']
        is_campus_adm = self._is_campus_admin(request)
        ALLOWED_ROLES = CAMPUS_ADMIN_ALLOWED_ROLES if is_campus_adm else [
            'tenant_admin', 'academic_admin', 'facility_manager',
            'it_admin', 'faculty', 'student', 'research_scholar', 'external_user', 'hod'
        ]

        try:
            from campus.models import Campus
            tenant = request.user.tenant
            csv_data = StringIO(file_obj.read().decode('utf-8'))
            reader = csv.DictReader(csv_data)
            created, skipped, errors = 0, 0, []

            for row_num, row in enumerate(reader, start=2):
                full_name = row.get('full_name', '').strip()
                email = row.get('email', '').strip().lower()
                role_name = row.get('role_name', '').strip().lower()
                phone = row.get('phone', '').strip()
                department = row.get('department', '').strip()
                password = row.get('password', '').strip()

                if not all([full_name, email, role_name]):
                    errors.append(f'Row {row_num}: Missing full_name, email, or role_name.')
                    continue

                if role_name in FORBIDDEN_ROLES:
                    errors.append(f'Row {row_num}: Cannot assign role "{role_name}".')
                    continue

                if role_name not in ALLOWED_ROLES:
                    errors.append(f'Row {row_num}: Unknown or disallowed role "{role_name}".')
                    continue

                if User.objects.filter(email=email).exists():
                    skipped += 1
                    errors.append(f'Row {row_num}: User {email} already exists (skipped).')
                    continue

                campus_obj, campus_error = self._resolve_csv_campus(
                    row=row,
                    tenant=tenant,
                    is_campus_admin=is_campus_adm,
                    request_user=request.user,
                )
                if campus_error:
                    errors.append(f'Row {row_num}: {campus_error}')
                    continue

                try:
                    role, _ = Role.objects.get_or_create(name=role_name)
                    user = User(
                        full_name=full_name, email=email,
                        phone=phone, department=department, campus=campus_obj,
                        tenant=tenant, role=role, is_active=True
                    )
                    if password:
                        user.set_password(password)
                    else:
                        user.set_unusable_password()
                    user.save()
                    created += 1
                except Exception as e:
                    errors.append(f'Row {row_num}: {str(e)}')

            return Response({
                'message': f'Import complete: {created} created, {skipped} skipped.',
                'errors': errors
            })
        except Exception as e:
            return Response({'error': f'Parse failed: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['POST'], url_path='bulk-delete')
    def bulk_delete(self, request):
        """
        Bulk deletes users by their IDs. 
        Only allowed for Tenant Admins. Automatically protects critical admins.
        """
        if not self._check_is_manager(request) or self._is_campus_admin(request):
            return Response({'error': 'Permission denied: Only Tenant/Super Admins can bulk delete.'}, status=status.HTTP_403_FORBIDDEN)

        user_ids = request.data.get('user_ids', [])
        if not isinstance(user_ids, list):
            return Response({'error': 'Expected user_ids as a list of IDs.'}, status=status.HTTP_400_BAD_REQUEST)

        tenant = request.user.tenant
        
        # Protected roles that cannot be bulk deleted
        PROTECTED_ROLES = ['super_admin', 'tenant_admin', 'it_admin']
        
        deleted_count = 0
        skipped_count = 0
        
        # Use existing QuerySet to ensure tenant isolation guarantees are met
        qs = self.get_queryset()
        
        # Convert user_ids to string safely
        user_ids = [str(uid) for uid in user_ids]
        
        for uid in user_ids:
            # Do not delete self
            if str(uid) == str(request.user.id):
                skipped_count += 1
                continue
                
            try:
                target_user = qs.get(id=uid)
                role_name = getattr(target_user.role, 'name', '')
                
                # Protect important roles
                if role_name in PROTECTED_ROLES:
                    skipped_count += 1
                    continue
                    
                target_user.delete()
                deleted_count += 1
            except User.DoesNotExist:
                # Invalid ID or user not active/in tenant
                skipped_count += 1

        return Response({
            'deleted_count': deleted_count,
            'skipped_count': skipped_count,
            'message': f'Successfully deleted {deleted_count} users. Skipped {skipped_count} users.'
        })


# ═══════════════════════════════════════════════════════════════════════════
# RBAC VIEWS
# ═══════════════════════════════════════════════════════════════════════════

class PermissionListView(APIView):
    """
    GET /api/auth/permissions/
    Returns the full permissions catalogue (all module x action combinations).
    Used by the RBAC Panel to build the permission matrix grid.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        permissions = Permission.objects.all().order_by('module_name', 'action')
        return Response(PermissionSerializer(permissions, many=True).data)


class MyPermissionsView(APIView):
    """
    GET /api/auth/my-permissions/
    Returns the effective list of permission codes for the current user.
    Frontend uses this to gate UI elements dynamically.
    Response: { "permissions": ["timetable.view", "academics.create", ...] }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        permissions = list(request.user.get_permissions_for_tenant())
        return Response({'permissions': permissions})


class RolePermissionsView(APIView):
    """
    GET  /api/auth/role-permissions/<role_id>/
    PUT  /api/auth/role-permissions/<role_id>/

    Tenant admins view and update permissions for a role within their tenant.
    PUT body: { "grants": ["timetable.view"], "revokes": ["reports.delete"] }
    """
    permission_classes = [IsAuthenticated]

    def _is_admin(self, user):
        return getattr(getattr(user, 'role', None), 'name', '') in ['super_admin', 'tenant_admin']

    def get(self, request, role_id):
        try:
            role = Role.objects.get(pk=role_id)
        except Role.DoesNotExist:
            return Response({'error': 'Role not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = RoleWithPermissionsSerializer(role, context={'request': request})
        return Response(serializer.data)

    def put(self, request, role_id):
        if not self._is_admin(request.user):
            return Response({'error': 'Only tenant admins can modify role permissions.'},
                            status=status.HTTP_403_FORBIDDEN)
        try:
            role = Role.objects.get(pk=role_id)
        except Role.DoesNotExist:
            return Response({'error': 'Role not found.'}, status=status.HTTP_404_NOT_FOUND)

        caller_role = getattr(getattr(request.user, 'role', None), 'name', '')
        if role.name in ['super_admin', 'tenant_admin'] and caller_role != 'super_admin':
            return Response({'error': 'Cannot modify permissions for admin roles.'},
                            status=status.HTTP_403_FORBIDDEN)

        tenant = request.user.tenant
        grants  = request.data.get('grants',  [])
        revokes = request.data.get('revokes', [])

        def _apply(code_list, granted_value):
            for code in code_list:
                parts = code.split('.', 1)
                if len(parts) != 2:
                    continue
                module_name, action = parts
                try:
                    perm = Permission.objects.get(module_name=module_name, action=action)
                    obj, _ = RolePermission.objects.get_or_create(
                        role=role, permission=perm, tenant=tenant
                    )
                    obj.granted = granted_value
                    obj.save()
                except Permission.DoesNotExist:
                    pass

        _apply(grants,  True)
        _apply(revokes, False)

        serializer = RoleWithPermissionsSerializer(role, context={'request': request})
        return Response(serializer.data)


class AllRolesWithPermissionsView(APIView):
    """
    GET /api/auth/rbac/
    Returns all roles with their effective permission codes for the requesting tenant.
    Used by the RBAC Panel to render the full matrix.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not getattr(getattr(request.user, 'role', None), 'name', '') in ['super_admin', 'tenant_admin']:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        roles = Role.objects.exclude(name='super_admin')
        serializer = RoleWithPermissionsSerializer(roles, many=True, context={'request': request})
        return Response(serializer.data)


class RoleDefaultPermissionsView(APIView):
    """
    GET /api/auth/role-defaults/?role_name=student
    Returns the default permission codes for a role, factoring in tenant overrides.
    Used by the UI when creating/editing a user to preview the role's base permissions.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        role_name = request.query_params.get('role_name')
        if not role_name:
            return Response({'error': 'role_name is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            role = Role.objects.get(name=role_name)
            serializer = RoleWithPermissionsSerializer(role, context={'request': request})
            return Response({'permissions': serializer.data.get('permissions', [])})
        except Role.DoesNotExist:
            return Response({'error': 'Role not found'}, status=status.HTTP_404_NOT_FOUND)
