import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { MapPin } from 'lucide-react';

// ─── Navigation Items ──────────────────────────────────────────────────────────
const NAV_ITEMS = [
  // ── Core ──
  { path: '/dashboard',        label: 'Dashboard',           roles: ['tenant_admin','academic_admin','student','faculty','it_admin'], module: null, perm: 'auth.dashboard' },
  { path: '/users',            label: 'User Management',     roles: ['tenant_admin','it_admin'], module: null, perm: 'auth.manage_users' },
  { path: '/admin/rbac',       label: 'Role Permissions',    roles: ['super_admin','tenant_admin'], module: null, perm: 'auth.manage_rbac' },

  // ── Campus & Infrastructure ──
  { path: '/campus/campuses',  label: 'Campuses',            roles: ['tenant_admin'], module: 'campus', perm: 'campus.view' },
  { path: '/campus/buildings', label: 'Buildings',           roles: ['tenant_admin','it_admin'], module: 'campus', perm: 'campus.view' },
  { path: '/campus/floors',    label: 'Floors',              roles: ['tenant_admin','it_admin'], module: 'campus', perm: 'campus.view' },
  { path: '/campus/rooms',     label: 'Rooms',               roles: ['tenant_admin','it_admin'], module: 'campus', perm: 'campus.view' },

  // ── Academics ──
  { path: '/academics/departments',       label: 'Departments',            roles: ['tenant_admin','academic_admin','faculty','student'], module: 'academics', perm: 'academics.view' },
  { path: '/academics/batches',           label: 'Programs & Batch',       roles: ['tenant_admin','academic_admin','faculty','student'], module: 'academics', perm: 'academics.view' },
  { path: '/academics/semesters',         label: 'Semesters',              roles: ['tenant_admin','academic_admin','faculty','student'], module: 'academics', perm: 'academics.view' },
  { path: '/academics/courses',           label: 'Courses',                roles: ['tenant_admin','academic_admin','faculty','student'], module: 'academics', perm: 'academics.view' },
  { path: '/academics/my-courses',        label: 'My Assigned Courses',    roles: ['faculty'], module: 'academics', perm: 'academics.view' },
  { path: '/academics/faculty',           label: 'Faculty Profiles',       roles: ['tenant_admin','academic_admin','faculty'], module: 'academics', perm: 'academics.view' },
  { path: '/academics/course-sections',   label: 'Course Assignments',     roles: ['tenant_admin','academic_admin','faculty'], module: 'academics', perm: 'academics.view' },
  { path: '/academics/programme-subjects',label: 'Programme Subjects',     roles: [], module: 'academics', perm: 'academics.view' },
  { path: '/academics/subject-domains',   label: 'Subject Domains',        roles: [], module: 'academics', perm: 'academics.view' },
  { path: '/academics/eligible-subjects', label: 'Eligible Subjects',      roles: [], module: 'academics', perm: 'academics.view' },
  { path: '/academics/final-subject-assignments', label: 'Final Assignments', roles: [], module: 'academics', perm: 'academics.view' },
  { path: '/academics/bulk-upload',       label: 'Bulk Upload (Acad)',     roles: ['tenant_admin','academic_admin'], module: 'academics', perm: 'academics.create' },

  // ── Resource / Asset module ──
  { path: '/resources/categories',    label: 'Resource Categories',  roles: ['tenant_admin'], module: 'has_resources', perm: 'resources.view' },
  { path: '/resources/assets',        label: 'Assets & Equipment',   roles: ['tenant_admin'], module: 'has_resources', perm: 'resources.view' },
  { path: '/resources/sub-units',     label: 'Sub-Units',            roles: ['tenant_admin'], module: 'has_resources', perm: 'resources.view' },
  { path: '/resources/room-mappings', label: 'Room Mappings',        roles: ['tenant_admin'], module: 'has_resources', perm: 'resources.view' },
  { path: '/resources/maintenance',   label: 'Maintenance',          roles: ['tenant_admin'], module: 'has_resources', perm: 'resources.view' },

  // ── Timetable module ──
  { path: '/timetable/plans',          label: 'Manage Timetables',      roles: ['tenant_admin','academic_admin','it_admin'], module: 'has_timetable', perm: 'timetable.manage' },
  { path: '/timetable/monitor',        label: 'Timetable Monitor',       roles: ['tenant_admin','academic_admin','it_admin'], module: 'has_timetable', perm: 'timetable.view' },
  { path: '/timetable/calendar',       label: 'Calendar View',           roles: ['tenant_admin','academic_admin','it_admin','faculty','student'], module: 'has_timetable', perm: 'timetable.view' },
  { path: '/timetable/faculty-view',   label: 'My Timetable',            roles: ['faculty'], module: 'has_timetable', perm: 'timetable.view' },
  { path: '/timetable/department-view',label: 'Department Timetable',    roles: ['tenant_admin','academic_admin'], module: 'has_timetable', perm: 'timetable.view' },
  { path: '/timetable/substitutions',  label: 'Leave & Substitutions',   roles: ['tenant_admin','academic_admin','faculty'], module: 'has_timetable', perm: 'timetable.view' },
  { path: '/academics/faculty-availability', label: 'Faculty Availability', roles: ['tenant_admin','academic_admin'], module: 'has_timetable', perm: 'timetable.manage' },
  { path: '/academics/faculty-preference',   label: 'My Preferences',      roles: ['faculty'], module: 'has_timetable' },
  { path: '/academics/faculty-preferences',  label: 'Faculty Preferences', roles: ['tenant_admin','academic_admin'], module: 'has_timetable', perm: 'academics.manage_preference' },

  // ── Exams module ──
  { path: '/exams/plans',        label: 'Manage Exams',       roles: ['tenant_admin','academic_admin'], module: 'has_exams', perm: 'exams.view' },
  { path: '/exams/timetable',    label: 'Exam Timetable',     roles: ['faculty','student'], module: 'has_exams', perm: 'exams.view' },

  // ── Analytics / Reports module ──
  { path: '/reports/calendar',   label: 'Master Calendar',    roles: ['tenant_admin','academic_admin','it_admin','facility_manager'], module: 'has_reports', perm: 'reports.view' },
  { path: '/reports/dashboard',  label: 'Reports Dashboard',  roles: ['tenant_admin','academic_admin'], module: 'has_reports', perm: 'reports.view' },
  { path: '/reports/hod',        label: 'Reports',            roles: [], module: 'has_reports', perm: 'reports.view' },
  { path: '/reports/my-workload',label: 'My Reports',         roles: ['faculty'], module: 'has_reports', perm: 'reports.view' },

  // ── Bookings / Facility module ──
  { path: '/bookings/new',            label: 'New Booking',      roles: ['tenant_admin','academic_admin','facility_manager','it_admin','faculty','student','research_scholar','external_user'], module: 'has_bookings', perm: 'bookings.create' },
  { path: '/bookings/approval-inbox', label: 'Approval Inbox',   roles: ['tenant_admin','academic_admin','facility_manager'], module: 'has_bookings', perm: 'bookings.approve' },
  { path: '/bookings/policies',       label: 'Booking Policies', roles: ['tenant_admin'], module: 'has_bookings', perm: 'bookings.manage' },

  // ── Super Admin only ──
  { path: '/superadmin/dashboard', label: 'Platform Hub',       roles: ['super_admin'], module: null, perm: 'super.view' },
  { path: '/superadmin/tenants',   label: 'Tenants Directory',  roles: ['super_admin'], module: null, perm: 'super.view' },
  { path: '/superadmin/pricing',   label: 'Pricing & Modules',  roles: ['super_admin'], module: null, perm: 'super.view' },
  { path: '/superadmin/reports',   label: 'Tenant Analytics',   roles: ['super_admin'], module: null, perm: 'super.view' },
];

// ─── Module section dividers ─────────────────────────────────────────────────
const MODULE_SECTIONS = {
  null: 'Core',
  campus: 'Campus & Infrastructure',
  academics: 'Academics',
  has_resources: 'Asset Management',
  has_timetable: 'Timetabling',
  has_exams: 'Exam Management',
  has_reports: 'Analytics',
  has_bookings: 'Facility Bookings',
};

export const Sidebar = () => {
  const { user, can } = useAuth();
  const userRole = user?.role?.name || user?.role;
  const tenant = user?.tenant;
  const primaryColor = tenant?.primary_color || '#22D3EE';
  const isSuperAdmin = userRole === 'super_admin';
  const isCampusAdmin = userRole === 'it_admin' && user?.campus?.id;
  const isHOD = Boolean(userRole === 'hod' || user?.is_hod);

  const filteredNavItems = NAV_ITEMS.filter(item => {
    if (isHOD) {
      const hodAllowedPaths = [
        '/dashboard',
        '/academics/departments',
        '/academics/batches',
        '/academics/courses',
        '/academics/faculty-preferences',
        '/academics/faculty',
        '/academics/course-sections',
        '/academics/programme-subjects',
        '/academics/subject-domains',
        '/academics/eligible-subjects',
        '/timetable/department-view',
        '/timetable/substitutions',
        '/reports/hod',
      ];
      return hodAllowedPaths.includes(item.path);
    }

    // 1. Role based explicit hide for faculty
    if (userRole === 'faculty') {
      const forbiddenPaths = [
        '/campus/campuses',
        '/campus/buildings',
        '/campus/floors',
        '/campus/rooms',
        '/resources/categories',
        '/resources/assets',
        '/resources/sub-units',
        '/resources/room-mappings',
        '/resources/maintenance',
        '/exams/plans',
        '/reports/dashboard',
        '/reports/calendar',
        '/academics/course-sections',
        '/academics/programme-subjects',
        '/academics/subject-domains',
        '/academics/eligible-subjects',
        '/academics/final-subject-assignments',
        '/reports/hod',
        '/timetable/monitor'
      ];
      if (forbiddenPaths.includes(item.path)) return false;
    }

    // 2. Module active check (for modules flags like has_resources)
    if (item.module && item.module.startsWith('has_') && !tenant?.[item.module]) {
      return false;
    }

    // 3. Super/Tenant Admin see everything within their scope
    if (['super_admin', 'tenant_admin'].includes(userRole)) return true;

    // 4. Permission based check
    if (item.perm) {
      const [mod, act] = item.perm.split('.');
      if (can(mod, act)) return true;
    }

    // 5. Role based check (fallback/legacy)
    if (item.roles.includes(userRole)) return true;

    return false;
  });

  // Group into sections for visual separation
  const grouped = filteredNavItems.reduce((acc, item) => {
    const section = isSuperAdmin && item.module ? item.module : (item.module || null);
    const key = MODULE_SECTIONS[section] || 'Core';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  // Canonical order of sections
  const sectionOrder = ['Core', 'Campus & Infrastructure', 'Academics', 'Asset Management', 'Timetabling', 'Exam Management', 'Analytics', 'Facility Bookings'];

  return (
    <aside className="fixed top-16 left-0 bottom-0 w-64 border-r border-border bg-surface/60 backdrop-blur-xl hidden lg:flex flex-col">
      {/* Subtle top glow matching tenant theme */}
      <div
        className="h-px w-full shrink-0"
        style={{ background: `linear-gradient(90deg, transparent, ${primaryColor}40, transparent)` }}
      />

      {/* Campus Badge for IT Admins */}
      {isCampusAdmin && (
        <div
          className="mx-3 mt-3 px-3 py-2 rounded-xl flex items-center gap-2 text-xs font-semibold"
          style={{ backgroundColor: `${primaryColor}12`, border: `1px solid ${primaryColor}25`, color: primaryColor }}
        >
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{user?.campus?.name || 'My Campus'}</span>
        </div>
      )}

      {/* Scrollable nav */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1 pb-4">
        {sectionOrder.map(section => {
          const items = grouped[section];
          if (!items?.length) return null;
          return (
            <div key={section} className="mt-3">
              <p className="px-4 pt-2 pb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-foreground/20">
                {section}
              </p>
              {items.map(item => {
                return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'shadow-sm'
                        : 'text-muted hover:bg-foreground/5 hover:text-foreground'
                    }`
                  }
                  style={({ isActive }) => isActive ? {
                    backgroundColor: `${primaryColor}20`,
                    color: 'rgb(var(--text-main))',
                    borderLeft: `4px solid ${primaryColor}`,
                  } : {}}
                >
                  {item.label}
                </NavLink>
              )})}
            </div>
          );
        })}
      </nav>

      {/* Pinned bottom — Settings */}
      <div className="shrink-0 border-t border-border p-3">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              isActive ? 'shadow-sm' : 'text-muted hover:bg-foreground/5 hover:text-foreground'
            }`
          }
          style={({ isActive }) => isActive ? {
            backgroundColor: `${primaryColor}20`,
            color: 'rgb(var(--text-main))',
            borderLeft: `4px solid ${primaryColor}`,
          } : {}}
        >
          ⚙ Settings
        </NavLink>
      </div>
    </aside>
  );
};
