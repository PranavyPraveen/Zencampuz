from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.db.models import Sum, Count, Q
from django.utils.dateparse import parse_date

from bookings.models import BookingRequest
from timetable.models import TimetablePlan, TimetableSlot, ClassSession
from exams.models import ExamPlan, ExamSession, ExamCourseAssignment, ExamHallAllocation, SeatingPlan
from academics.models import FacultyProfile, CourseSection
from campus.models import Room

class UnifiedCalendarView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = request.user.tenant
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        if not start_date_str or not end_date_str:
            return Response({'error': 'start_date and end_date are required'}, status=400)

        start_date = parse_date(start_date_str)
        end_date = parse_date(end_date_str)
        
        events = []

        # 1. Fetch Bookings (Approved only)
        bookings = BookingRequest.objects.filter(
            tenant=tenant,
            status='approved',
            start_time__date__gte=start_date,
            end_time__date__lte=end_date
        ).select_related('room', 'requested_by')

        for b in bookings:
            events.append({
                'id': f'booking-{b.id}',
                'title': b.title,
                'start': b.start_time.isoformat(),
                'end': b.end_time.isoformat(),
                'type': 'booking',
                'location': b.room.room_number if b.room else 'Unknown',
                'attendees': f"Requested by {b.requested_by.full_name}",
                'status': 'confirmed',
                'description': b.purpose
            })

        # 2. Fetch Timetable Sessions (mapped to dates)
        # In a real heavy system we'd expand the recurring weekly grid into actual date instances here
        # For phase 1, we will just grab active published plans and inject them on their recurring days within the window
        active_plans = TimetablePlan.objects.filter(tenant=tenant, status='published')
        for plan in active_plans:
            sessions = ClassSession.objects.filter(
                tenant=tenant, 
                timetable_slot__plan=plan
            ).select_related('timetable_slot', 'timetable_slot__day', 'timetable_slot__time_slot', 'course_section__course', 'course_section__section')
            
            # Map day of week (e.g., 'Monday') to actual dates in range
            day_map = {'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3, 'friday': 4, 'saturday': 5, 'sunday': 6}
            
            # We iterate through the requested date range day by day
            current_date = start_date
            from datetime import timedelta
            while current_date <= end_date:
                weekday_num = current_date.weekday()
                
                # Find sessions that match this weekday (day_map uses 0=Mon)
                daily_sessions = [s for s in sessions if day_map.get(s.timetable_slot.day.day.lower(), -1) == weekday_num]
                
                for s in daily_sessions:
                    # Look up room
                    room_assign = s.room_assignments.first()
                    fac_assign = s.faculty_assignments.first()
                    
                    # Construct ISO datetime
                    import datetime
                    st = datetime.datetime.combine(current_date, s.timetable_slot.time_slot.start_time)
                    en = datetime.datetime.combine(current_date, s.timetable_slot.time_slot.end_time)
                    
                    events.append({
                        'id': f'class-{s.id}-{current_date.isoformat()}',
                        'title': f"{s.course_section.course.code} (Sec {s.course_section.section.name})",
                        'start': st.isoformat(),
                        'end': en.isoformat(),
                        'type': 'class',
                        'location': room_assign.room.room_number if room_assign else 'TBA',
                        'attendees': fac_assign.faculty.full_name if fac_assign else 'TBA',
                        'status': 'confirmed'
                    })
                
                current_date += timedelta(days=1)


        # 3. Fetch Exams
        exam_allocs = ExamHallAllocation.objects.filter(
            tenant=tenant,
            session__date__gte=start_date,
            session__date__lte=end_date
        ).select_related('session', 'session__plan', 'room')

        for ea in exam_allocs:
            import datetime
            st = datetime.datetime.combine(ea.session.date, ea.session.start_time)
            en = datetime.datetime.combine(ea.session.date, ea.session.end_time)
            events.append({
                'id': f'exam-{ea.id}',
                'title': f"Exam: {ea.session.name}",
                'start': st.isoformat(),
                'end': en.isoformat(),
                'type': 'exam',
                'location': ea.room.room_number,
                'attendees': 'Multiple Sections',
                'status': 'confirmed'
            })

        return Response(events)


class ReportingViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['GET'], url_path='room-utilization')
    def room_utilization(self, request):
        tenant = request.user.tenant
        rooms = Room.objects.filter(tenant=tenant).select_related('building', 'room_type')
        
        data = []
        for r in rooms:
           # Very basic aggregation for Phase 1 dashboards
           # Number of exam bookings:
           exams = ExamHallAllocation.objects.filter(tenant=tenant, room=r).count()
           # Number of facility bookings:
           bookings = BookingRequest.objects.filter(tenant=tenant, room=r, status='approved').count()
           # Number of timetable slots (in week)
           classes = r.timetable_assignments.count()
           
           data.append({
               'room_id': r.id,
               'room_number': r.room_number,
               'building': r.building.name if r.building else 'Unassigned',
               'capacity': r.capacity,
               'type': r.room_type.name,
               'weekly_classes': classes,
               'one_off_bookings': bookings,
               'exam_sessions': exams,
               'utilization_score': min(100, (classes * 2) + (bookings * 5) + (exams * 10)) # Arbitrary heuristic for visualization
           })
        return Response(data)

    @action(detail=False, methods=['GET'], url_path='faculty-workload')
    def faculty_workload(self, request):
        tenant = request.user.tenant
        faculty = FacultyProfile.objects.filter(tenant=tenant).select_related('user', 'department')
        
        data = []
        for f in faculty:
            from exams.models import InvigilatorAssignment
            invig_count = InvigilatorAssignment.objects.filter(tenant=tenant, faculty=f.user).count()
            classes_count = f.user.timetable_assignments.count()
            
            data.append({
                'faculty_name': f.user.full_name,
                'department': f.department.name if f.department else 'N/A',
                'weekly_teaching_units': classes_count,
                'exam_invigilations': invig_count,
                'total_load_score': classes_count + (invig_count * 2)
            })
            
        return Response(data)

    @action(detail=False, methods=['GET'], url_path='system-summary')
    def system_summary(self, request):
        tenant = request.user.tenant
        return Response({
            'active_students': 1200, # Static for now
            'active_faculty': FacultyProfile.objects.filter(tenant=tenant).count(),
            'total_rooms': Room.objects.filter(tenant=tenant).count(),
            'pending_bookings': BookingRequest.objects.filter(tenant=tenant, status='pending').count()
        })
