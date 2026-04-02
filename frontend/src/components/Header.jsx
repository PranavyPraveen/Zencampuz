import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useBranding } from '../utils/useBranding';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ChevronDown, BookOpen, Clock, Calendar, BarChart3, Package, LogOut, Settings, User, GraduationCap } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

// ── Academics sub-module items gated by tenant module flags ──────────────────
const ACADEMICS_ITEMS = [
  // Core academics - always shows for tenant_admin
  { label: 'Departments',       path: '/academics/departments',   always: true,  icon: BookOpen },
  { label: 'Programs & Batch',  path: '/academics/batches',       always: true,  icon: BookOpen },
  { label: 'Semesters',         path: '/academics/semesters',     always: true,  icon: BookOpen },
  { label: 'Courses',           path: '/academics/courses',       always: true,  icon: BookOpen },
  { label: 'Faculty Profiles',  path: '/academics/faculty',       always: true,  icon: GraduationCap },
  { label: 'Course Assignments',path: '/academics/course-sections', always: true, icon: BookOpen },
  // Module-gated
  { label: 'Timetable Plans',          path: '/timetable/plans',           module: 'has_timetable', icon: Clock },
  { label: 'Faculty Timetable View',   path: '/timetable/faculty-view',    module: 'has_timetable', icon: Clock },
  { label: 'Department Timetable',     path: '/timetable/department-view', module: 'has_timetable', icon: Clock },
  { label: 'Exam Management',          path: '/exams/plans',               module: 'has_exams',     icon: Calendar },
  { label: 'Master Calendar',          path: '/reports/calendar',          module: 'has_reports',   icon: Calendar },
  { label: 'Reports Dashboard',        path: '/reports/dashboard',         module: 'has_reports',   icon: BarChart3 },
  { label: 'Asset Management',         path: '/resources/assets',          module: 'has_resources', icon: Package },
  { label: 'Facility Bookings',        path: '/bookings/new',              module: 'has_bookings',  icon: Package },
];

export const Header = () => {
  const { user, logout } = useAuth();
  const theme = useBranding();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAcademics, setShowAcademics] = useState(false);
  const academicsRef = useRef(null);
  const userMenuRef = useRef(null);
  const tenant = user?.tenant;
  const primaryColor = tenant?.primary_color || theme.primary;
  const isTenantUser = !!tenant && user?.role?.name !== 'super_admin';

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (academicsRef.current && !academicsRef.current.contains(e.target)) setShowAcademics(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Filter academics items based on purchased modules
  const visibleAcademicsItems = ACADEMICS_ITEMS.filter(item =>
    item.always || (item.module && tenant?.[item.module])
  );

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border bg-surface/60 backdrop-blur-xl"
    >
      <div className="flex h-full items-center justify-between px-6">
        {/* ── Left: Logo + Tenant Badge ── */}
        <div className="flex items-center gap-4">
          {/* Logo — links to dashboard (not landing page) when logged into tenant */}
          <Link to={user ? '/dashboard' : '/login'} className="flex items-center gap-2 group">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center font-black text-[#0F172A] transition-transform group-hover:rotate-6"
              style={{ backgroundColor: primaryColor }}
            >
              Z
            </div>
            <span className="text-xl font-bold text-foreground tracking-wider">CAMPUZCORE</span>
          </Link>

          {tenant && (
            <div className="ml-2 flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-foreground/5">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: primaryColor }} />
              <span className="text-[11px] text-foreground/50 uppercase tracking-widest font-semibold">
                {tenant.tenant_name}
              </span>
            </div>
          )}
        </div>

        {/* ── Centre: Academics dropdown (only for tenant users) ── */}
        {isTenantUser && visibleAcademicsItems.length > 0 && (
          <div className="relative" ref={academicsRef}>
            <button
              onClick={() => setShowAcademics(!showAcademics)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-all"
              style={showAcademics ? { color: primaryColor, backgroundColor: `${primaryColor}10` } : {}}
            >
              <BookOpen className="w-4 h-4" />
              Academics
              <ChevronDown
                className="w-3.5 h-3.5 transition-transform duration-200"
                style={{ transform: showAcademics ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>

            {showAcademics && (
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 rounded-2xl border border-border shadow-2xl overflow-hidden bg-surface/80 backdrop-blur-xl"
              >
                {/* Header */}
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">
                    Academic Modules
                  </p>
                </div>

                {/* Grouped items */}
                <div className="py-2 max-h-80 overflow-y-auto">
                  {/* Core academics */}
                  <p className="px-4 pt-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-foreground/20">Core</p>
                  {visibleAcademicsItems.filter(i => i.always).map(item => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setShowAcademics(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${
                          isActive ? 'text-foreground bg-foreground/5' : 'text-foreground/50 hover:text-foreground hover:bg-foreground/5'
                        }`
                      }
                      style={({ isActive }) => isActive ? { color: primaryColor } : {}}
                    >
                      <item.icon className="w-3.5 h-3.5 shrink-0" />
                      {item.label}
                    </NavLink>
                  ))}

                  {/* Module-gated items */}
                  {visibleAcademicsItems.filter(i => !i.always).length > 0 && (
                    <>
                      <p className="px-4 pt-3 pb-1 text-[9px] font-bold uppercase tracking-widest text-foreground/20">Purchased Modules</p>
                      {visibleAcademicsItems.filter(i => !i.always).map(item => (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => setShowAcademics(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${
                              isActive ? 'text-foreground bg-foreground/5' : 'text-foreground/50 hover:text-foreground hover:bg-foreground/5'
                            }`
                          }
                          style={({ isActive }) => isActive ? { color: primaryColor } : {}}
                        >
                          <item.icon className="w-3.5 h-3.5 shrink-0" />
                          {item.label}
                        </NavLink>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Right: User menu ── */}
        <div className="flex items-center gap-4 relative" ref={userMenuRef}>
          <ThemeToggle />
          
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 p-1.5 rounded-full hover:bg-foreground/5 transition-colors"
          >
            <div
              className="h-8 w-8 rounded-full border flex items-center justify-center font-semibold text-sm"
              style={{ borderColor: primaryColor, color: primaryColor, backgroundColor: `${primaryColor}15` }}
            >
              {user?.full_name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold text-foreground/90 leading-none">{user?.full_name}</p>
              <p className="text-[10px] text-foreground/40 mt-0.5 uppercase tracking-tighter">
                {user?.role?.name?.replace(/_/g, ' ')}
                {user?.campus?.name && ` • ${user.campus.name}`}
              </p>
            </div>
            <ChevronDown
              className="w-4 h-4 text-foreground/30 hidden md:block transition-transform duration-200"
              style={{ transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0)' }}
            />
          </button>

          {showUserMenu && (
            <div
              className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-border shadow-2xl overflow-hidden py-1.5 bg-surface/80 backdrop-blur-xl"
            >
              {/* User info */}
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-bold text-foreground">{user?.full_name}</p>
                <p className="text-xs text-foreground/40 truncate">{user?.email}</p>
              </div>

              {user?.role?.name === 'faculty' && (
                <Link
                  to="/academics/my-profile"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-all"
                >
                  <User className="w-4 h-4" />
                  My Profile
                </Link>
              )}

              <Link
                to="/settings"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-all"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-foreground/5 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
