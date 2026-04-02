import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute, RoleBasedRoute } from './routes/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import { Login } from './pages/Login';
import { Unauthorized } from './pages/Unauthorized';
import SuperAdminDashboard from './pages/superadmin/Dashboard';
import TenantsList from './pages/superadmin/Tenants';
import FeaturesPricing from './pages/superadmin/FeaturesPricing';
import RBACPanel from './pages/admin/RBACPanel';
import TenantReports from './pages/superadmin/TenantReports';
import Settings from './pages/settings/Settings';
import TenantDashboard from './pages/dashboard/TenantDashboard';
import CampusDashboard from './pages/dashboard/CampusDashboard';
import FacultyDashboard from './pages/dashboard/FacultyDashboard';
import HODDashboard from './pages/dashboard/HODDashboard';
import { useAuth } from './auth/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';

/** Renders the right dashboard based on role */
function SmartDashboard() {
  const { user } = useAuth();
  const roleName = user?.role?.name || user?.role;
  // HOD: either explicit hod role, OR a faculty member set as head_of_department
  const isHOD = Boolean(roleName === 'hod' || user?.is_hod);
  console.log('SmartDashboard resolving for user role:', roleName, 'isHOD:', isHOD, user);

  if (roleName === 'super_admin') return <SuperAdminDashboard />;
  if (roleName === 'tenant_admin') return <TenantDashboard />;
  if (roleName === 'it_admin' && user?.campus?.id) return <CampusDashboard />;
  if (isHOD) return <HODDashboard />;
  if (roleName === 'faculty') return <FacultyDashboard />;
  
  // Fallback: academic_admin, facility_manager, and other tenant users
  return <TenantDashboard />;
}

import PublicLayout from './layouts/PublicLayout';
import Landing from './pages/public/Landing';
import Features from './pages/public/Features';
import Pricing from './pages/public/Pricing';
import About from './pages/public/About';
import Contact from './pages/public/Contact';
import { isPublicHost } from './utils/tenantHelper';

// Campus Module
import CampusList from './pages/campus/CampusList';
import BuildingList from './pages/campus/BuildingList';
import FloorList from './pages/campus/FloorList';
import RoomList from './pages/campus/RoomList';
import RoomDetail from './pages/campus/RoomDetail';
import BulkUpload from './pages/campus/BulkUpload';

// Resources Module
import ResourceCategories from './pages/resources/ResourceCategories';
import AssetList from './pages/resources/AssetList';
import SubUnitList from './pages/resources/SubUnitList';
import RoomResourceMapping from './pages/resources/RoomResourceMapping';
import MaintenanceScheduler from './pages/resources/MaintenanceScheduler';
import ResourceBulkUpload from './pages/resources/ResourceBulkUpload';

// User Management Module
import UserList from './pages/users/UserList';
import UserBulkImport from './pages/users/UserBulkImport';

// Bookings Module
import BookingRequestForm from './pages/bookings/BookingRequestForm';
import MyBookings from './pages/bookings/MyBookings';
import ApprovalInbox from './pages/bookings/ApprovalInbox';
import BookingDetail from './pages/bookings/BookingDetail';
import PolicyAdmin from './pages/bookings/PolicyAdmin';

// Imports - Academics
import Departments from './pages/academics/Departments';
import Programs from './pages/academics/Programs';
import Semesters from './pages/academics/Semesters';
import Courses from './pages/academics/Courses';
import Batches from './pages/academics/Batches';
import FacultyList from './pages/academics/FacultyList';
import FacultyAvailability from './pages/academics/FacultyAvailability';
import FacultyProfilePage from './pages/academics/FacultyProfilePage';
import FacultyPreferencePage from './pages/academics/FacultyPreferencePage';
import CourseSections from './pages/academics/CourseSections';
import AcademicBulkUpload from './pages/academics/AcademicBulkUpload';
import ProgrammeSyllabus from './pages/academics/ProgrammeSyllabus';
import ProgrammeSubjects from './pages/academics/ProgrammeSubjects';
import SubjectDomains from './pages/academics/SubjectDomains';
import EligibleSubjectPool from './pages/academics/EligibleSubjectPool';
import FacultySubjectAssignments from './pages/academics/FacultySubjectAssignments';

// Imports - Timetable
import TimetablePlans from './pages/timetable/TimetablePlans';
import TimetableBuilder from './pages/timetable/TimetableBuilder';
import TimetablePublish from './pages/timetable/TimetablePublish';
import FacultyTimetableView from './pages/timetable/FacultyTimetableView';
import DepartmentTimetableView from './pages/timetable/DepartmentTimetableView';
import TimetableCalendarView from './pages/timetable/TimetableCalendarView';
import SubstituteRequestPage from './pages/timetable/SubstituteRequestPage';
import TimetableMonitor from './pages/timetable/TimetableMonitor';

// Imports - Exams
import ExamPlans from './pages/exams/ExamPlans';
import ExamSessionScheduler from './pages/exams/ExamSessionScheduler';
import ExamHallAllocation from './pages/exams/ExamHallAllocation';
import InvigilatorAssignment from './pages/exams/InvigilatorAssignment';
import SeatingPreview from './pages/exams/SeatingPreview';
import ExamPublish from './pages/exams/ExamPublish';

// Imports - Reports
import MasterCalendar from './pages/reports/MasterCalendar';
import ReportsDashboard from './pages/reports/ReportsDashboard';
import MyWorkloadReport from './pages/reports/MyWorkloadReport';
import HODReports from './pages/reports/HODReports';

// Imports - Faculty Dashboard Extra
import MyAssignedCourses from './pages/academics/MyAssignedCourses';
import FacultyExamView from './pages/exams/FacultyExamView';
import NotificationsPage from './pages/dashboard/NotificationsPage';

function App() {
  const isPublic = isPublicHost();

  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Marketing Routes (Only on public domain) */}
            {isPublic && (
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Landing />} />
                <Route path="/features" element={<Features />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
              </Route>
            )}

            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Protected Dashboard Routes */}
            <Route 
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<SmartDashboard />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings" element={<Settings />} />
              
              {/* Campus Structure Module */}
              <Route 
                 path="/campus" 
                 element={
                   <RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin', 'it_admin']}>
                     <Outlet />
                   </RoleBasedRoute>
                 }
              >
                  <Route index element={<Navigate to="campuses" replace />} />
                  <Route path="campuses" element={<CampusList />} />
                  <Route path="buildings" element={<BuildingList />} />
                  <Route path="floors" element={<FloorList />} />
                  <Route path="rooms" element={<RoomList />} />
                  <Route path="rooms/:id" element={<RoomDetail />} />
                  <Route path="rooms/bulk-upload" element={<BulkUpload />} />
              </Route>
              
              {/* Academics Master Data Module */}
              <Route path="/academics/departments" element={<RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin', 'academic_admin', 'faculty', 'student']} allowHod><Departments /></RoleBasedRoute>} />
              <Route path="/academics/programs" element={<RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin', 'academic_admin', 'faculty', 'student']} allowHod><Programs /></RoleBasedRoute>} />
              <Route path="/academics/semesters" element={<RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin', 'academic_admin', 'faculty', 'student']}><Semesters /></RoleBasedRoute>} />
              <Route path="/academics/courses" element={<RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin', 'academic_admin', 'faculty', 'student']} allowHod><Courses /></RoleBasedRoute>} />
              <Route path="/academics/batches" element={<RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin', 'academic_admin', 'faculty', 'student']} allowHod><Batches /></RoleBasedRoute>} />
              <Route path="/academics/faculty" element={<RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin', 'academic_admin', 'faculty']} allowHod><FacultyList /></RoleBasedRoute>} />
              <Route path="/academics/faculty-availability" element={<RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin', 'academic_admin', 'faculty']}><FacultyAvailability /></RoleBasedRoute>} />
              <Route path="/academics/faculty-preference" element={<RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin', 'academic_admin', 'faculty']}><FacultyPreferencePage /></RoleBasedRoute>} />
              <Route path="/academics/faculty-preferences" element={<RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin', 'academic_admin']} allowHod><FacultyPreferencePage /></RoleBasedRoute>} />
              <Route path="/academics/subject-domains" element={<RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin', 'academic_admin']} allowHod><SubjectDomains /></RoleBasedRoute>} />
              <Route path="/academics/eligible-subjects" element={<RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin', 'academic_admin']} allowHod><EligibleSubjectPool /></RoleBasedRoute>} />
              <Route path="/academics/final-subject-assignments" element={<RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin', 'academic_admin']} allowHod><EligibleSubjectPool /></RoleBasedRoute>} />

              <Route path="/academics/course-sections" element={<RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin', 'academic_admin', 'faculty']} allowHod><CourseSections /></RoleBasedRoute>} />
              <Route path="/academics/programme-syllabus" element={<RoleBasedRoute requireHod><ProgrammeSyllabus /></RoleBasedRoute>} />
              <Route path="/academics/programme-subjects" element={<RoleBasedRoute requireHod><ProgrammeSubjects /></RoleBasedRoute>} />
              <Route path="/academics/my-courses" element={<RoleBasedRoute allowedRoles={['faculty']}><MyAssignedCourses /></RoleBasedRoute>} />
              <Route path="/academics/my-profile" element={<RoleBasedRoute allowedRoles={['faculty']}><FacultyProfilePage /></RoleBasedRoute>} />
              <Route path="/academics/bulk-upload" element={<RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin', 'academic_admin']}><AcademicBulkUpload /></RoleBasedRoute>} />
              
              {/* Timetable Module */}
              <Route path="/timetable/plans" element={<RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin', 'academic_admin', 'it_admin']}><TimetablePlans /></RoleBasedRoute>} />
              <Route path="/timetable/builder/:id" element={<RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin', 'academic_admin', 'it_admin']}><TimetableBuilder /></RoleBasedRoute>} />
              <Route path="/timetable/publish/:id" element={<RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin', 'academic_admin', 'it_admin']}><TimetablePublish /></RoleBasedRoute>} />
              <Route path="/timetable/faculty-view" element={<RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin', 'academic_admin', 'faculty', 'student']}><FacultyTimetableView /></RoleBasedRoute>} />
              <Route path="/timetable/department-view" element={<RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin', 'academic_admin', 'faculty']} allowHod><DepartmentTimetableView /></RoleBasedRoute>} />
              <Route path="/timetable/calendar" element={<RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin', 'academic_admin', 'faculty', 'student', 'it_admin']}><TimetableCalendarView /></RoleBasedRoute>} />
              <Route path="/timetable/substitutions" element={<RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin', 'academic_admin', 'faculty']} allowHod><SubstituteRequestPage /></RoleBasedRoute>} />
              <Route path="/timetable/monitor" element={<RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin', 'academic_admin', 'it_admin']}><TimetableMonitor /></RoleBasedRoute>} />
              
              {/* Exams Module */}
              <Route path="/exams/plans" element={<RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin', 'academic_admin']}><ExamPlans /></RoleBasedRoute>} />
              <Route path="/exams/scheduler/:id" element={<RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin', 'academic_admin']}><ExamSessionScheduler /></RoleBasedRoute>} />
              <Route path="/exams/halls/:id" element={<RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin', 'academic_admin']}><ExamHallAllocation /></RoleBasedRoute>} />
              <Route path="/exams/invigilators/:id" element={<RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin', 'academic_admin']}><InvigilatorAssignment /></RoleBasedRoute>} />
              <Route path="/exams/seating/:id" element={<RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin', 'academic_admin', 'faculty']}><SeatingPreview /></RoleBasedRoute>} />
              <Route path="/exams/publish/:id" element={<RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin', 'academic_admin']}><ExamPublish /></RoleBasedRoute>} />
              <Route path="/exams/timetable" element={<RoleBasedRoute allowedRoles={['faculty', 'student']}><FacultyExamView /></RoleBasedRoute>} />

              {/* Reports & Calendar Module */}
              {/* Analytics / Reports */}
              <Route path="/reports/calendar" element={<RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin', 'academic_admin', 'facility_manager']}><MasterCalendar /></RoleBasedRoute>} />
              <Route path="/reports/dashboard" element={<RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin', 'academic_admin']}><ReportsDashboard /></RoleBasedRoute>} />
              <Route path="/reports/my-workload" element={<RoleBasedRoute allowedRoles={['faculty']}><MyWorkloadReport /></RoleBasedRoute>} />
              <Route path="/reports/hod" element={<RoleBasedRoute requireHod><HODReports /></RoleBasedRoute>} />
              
              {/* Resources Module */}
              <Route
                path="/resources"
                element={
                  <RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin']}>
                    <Outlet />
                  </RoleBasedRoute>
                }
              >
                <Route index element={<Navigate to="categories" replace />} />
                <Route path="categories" element={<ResourceCategories />} />
                <Route path="assets" element={<AssetList />} />
                <Route path="sub-units" element={<SubUnitList />} />
                <Route path="room-mappings" element={<RoomResourceMapping />} />
                <Route path="maintenance" element={<MaintenanceScheduler />} />
                <Route path="bulk-upload" element={<ResourceBulkUpload />} />
              </Route>

              {/* User Management Module */}
              <Route
                path="/users"
                element={
                  <RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin', 'it_admin']}>
                    <Outlet />
                  </RoleBasedRoute>
                }
              >
                <Route index element={<UserList />} />
                <Route path="bulk-import" element={<UserBulkImport />} />
              </Route>


              {/* Bookings Module */}
              <Route
                path="/bookings"
                element={<ProtectedRoute><Outlet /></ProtectedRoute>}
              >
                <Route index element={<MyBookings />} />
                <Route path="my" element={<MyBookings />} />
                <Route path="new" element={<BookingRequestForm />} />
                <Route path=":id" element={<BookingDetail />} />
                <Route path="approval-inbox" element={
                  <RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin', 'academic_admin', 'facility_manager']}>
                    <ApprovalInbox />
                  </RoleBasedRoute>
                } />
                <Route path="policies" element={
                  <RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin']}>
                    <PolicyAdmin />
                  </RoleBasedRoute>
                } />
              </Route>

              <Route path="admin/rbac" element={
                <RoleBasedRoute allowedRoles={['super_admin', 'tenant_admin']}>
                  <RBACPanel />
                </RoleBasedRoute>
              } />

              {/* Platform Hub - Super Admin Only */}
              <Route 
                path="/superadmin" 
                element={
                  <RoleBasedRoute allowedRoles={['super_admin']}>
                    <div className="p-8"><Outlet /></div>
                  </RoleBasedRoute>
                } 
              >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<SuperAdminDashboard />} />
                <Route path="tenants" element={<TenantsList />} />
                <Route path="pricing" element={<FeaturesPricing />} />
                <Route path="reports" element={<TenantReports />} />
              </Route>
            </Route>

            {/* Catch-all routing based on domain */}
            <Route path="*" element={<Navigate to={isPublic ? "/" : "/login"} replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
