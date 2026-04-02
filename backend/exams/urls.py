from rest_framework.routers import DefaultRouter
from .views import (
    ExamPlanViewSet, ExamSessionViewSet, ExamCourseAssignmentViewSet,
    ExamHallAllocationViewSet, SeatingPlanViewSet,
    InvigilatorAssignmentViewSet, ExamPublishLogViewSet
)

router = DefaultRouter()
router.register(r'plans', ExamPlanViewSet, basename='examplan')
router.register(r'sessions', ExamSessionViewSet, basename='examsession')
router.register(r'course-assignments', ExamCourseAssignmentViewSet, basename='examcourseassignment')
router.register(r'hall-allocations', ExamHallAllocationViewSet, basename='examhallallocation')
router.register(r'seating-plans', SeatingPlanViewSet, basename='seatingplan')
router.register(r'invigilators', InvigilatorAssignmentViewSet, basename='invigilatorassignment')
router.register(r'publish-logs', ExamPublishLogViewSet, basename='exampublishlog')

urlpatterns = router.urls
