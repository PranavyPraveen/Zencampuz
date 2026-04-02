from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DepartmentViewSet, ProgramViewSet, SemesterViewSet, CourseViewSet,
    BatchViewSet, SectionViewSet, StudentGroupViewSet,
    SubjectDomainViewSet, FacultyProfileViewSet, FacultyAvailabilityViewSet, FacultyPreferenceViewSet,
    FacultyEligibleSubjectViewSet, FacultySubjectAssignmentViewSet,
    CourseSectionViewSet, DepartmentRoomPreferenceViewSet
)

router = DefaultRouter()
router.register(r'departments', DepartmentViewSet, basename='departments')
router.register(r'subject-domains', SubjectDomainViewSet, basename='subject-domains')
router.register(r'programs', ProgramViewSet, basename='programs')
router.register(r'semesters', SemesterViewSet, basename='semesters')
router.register(r'courses', CourseViewSet, basename='courses')
router.register(r'batches', BatchViewSet, basename='batches')
router.register(r'sections', SectionViewSet, basename='sections')
router.register(r'student-groups', StudentGroupViewSet, basename='student-groups')
router.register(r'faculty', FacultyProfileViewSet, basename='faculty')
router.register(r'faculty-availability', FacultyAvailabilityViewSet, basename='faculty-availability')
router.register(r'faculty-preferences', FacultyPreferenceViewSet, basename='faculty-preferences')
router.register(r'faculty-eligible-subjects', FacultyEligibleSubjectViewSet, basename='faculty-eligible-subjects')
router.register(r'faculty-subject-assignments', FacultySubjectAssignmentViewSet, basename='faculty-subject-assignments')
router.register(r'course-sections', CourseSectionViewSet, basename='course-sections')
router.register(r'room-preferences', DepartmentRoomPreferenceViewSet, basename='room-preferences')

urlpatterns = [
    path('', include(router.urls)),
]
