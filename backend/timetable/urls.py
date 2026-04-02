from rest_framework.routers import DefaultRouter
from .views import (
    WorkingDayViewSet, TimeSlotTemplateViewSet, TimetablePlanViewSet,
    TimetableSlotViewSet, ClassSessionViewSet, FacultyAssignmentViewSet,
    RoomAssignmentViewSet, TimetablePublishLogViewSet, TimetableChangeRequestViewSet,
    LeaveRequestViewSet, SubstitutionRequestViewSet
)

router = DefaultRouter()
router.register(r'working-days', WorkingDayViewSet, basename='workingday')
router.register(r'timeslot-templates', TimeSlotTemplateViewSet, basename='timeslottemplate')
router.register(r'plans', TimetablePlanViewSet, basename='timetableplan')
router.register(r'slots', TimetableSlotViewSet, basename='timetableslot')
router.register(r'class-sessions', ClassSessionViewSet, basename='classsession')
router.register(r'faculty-assignments', FacultyAssignmentViewSet, basename='facultyassignment')
router.register(r'room-assignments', RoomAssignmentViewSet, basename='roomassignment')
router.register(r'publish-logs', TimetablePublishLogViewSet, basename='publishlog')
router.register(r'change-requests', TimetableChangeRequestViewSet, basename='changerequest')
router.register(r'leave-requests', LeaveRequestViewSet, basename='leaverequest')
router.register(r'substitution-requests', SubstitutionRequestViewSet, basename='substitutionrequest')

urlpatterns = router.urls
