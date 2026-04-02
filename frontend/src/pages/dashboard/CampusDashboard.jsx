import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import {
  Users, GraduationCap, BookOpen, Building2, Layers, DoorOpen,
  MapPin, Wrench, CheckCircle2, Calendar, TrendingUp, Activity,
  ArrowRight, Loader2, LayoutDashboard
} from 'lucide-react';

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, to, sub }) {
  const content = (
    <div className="bg-background border border-border rounded-2xl p-5 flex flex-col gap-3 hover:border-border transition-all group relative overflow-hidden">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300" style={{ background: `radial-gradient(circle at top left, ${color}08, transparent 60%)` }} />
      <div className="flex items-start justify-between">
        <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {to && <ArrowRight className="w-4 h-4 text-foreground/20 group-hover:text-foreground/50 group-hover:translate-x-0.5 transition-all" />}
      </div>
      <div>
        <p className="text-2xl font-black text-foreground tracking-tight">{value ?? '—'}</p>
        <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-foreground/30 mt-1">{sub}</p>}
      </div>
    </div>
  );
  return to ? <Link to={to} className="block">{content}</Link> : <div>{content}</div>;
}

function UtilBar({ label, value = 0, total = 0, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-foreground/50">{label}</span>
        <span className="font-bold text-foreground/70">{value} <span className="text-foreground/30">/ {total}</span></span>
      </div>
      <div className="h-1.5 rounded-full bg-foreground/5">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}60` }} />
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, to, color }) {
  return (
    <Link to={to} className="group flex items-center gap-3 bg-background border border-border hover:border-border rounded-xl px-4 py-3 transition-all">
      <Icon className="w-4 h-4 transition-colors" style={{ color }} />
      <span className="text-sm font-medium text-foreground/60 group-hover:text-foreground/90 transition-colors">{label}</span>
      <ArrowRight className="w-3.5 h-3.5 text-foreground/20 group-hover:text-foreground/50 ml-auto transition-all group-hover:translate-x-0.5" />
    </Link>
  );
}

// ── Campus IT Admin Dashboard ──────────────────────────────────────────────────
export default function CampusDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const tenant = user?.tenant;
  const primaryColor = tenant?.primary_color || '#22D3EE';
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    api.get('/auth/dashboard-stats/')
      .then(r => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  const campus = stats?.campus || {};
  const campusName = stats?.campus_name || user?.campus?.name || 'Your Campus';

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-foreground/40 mb-1">{greeting}, {user?.full_name?.split(' ')[0]} 👋</p>
          <h1 className="text-3xl font-black text-foreground tracking-tight">{campusName}</h1>
          <p className="text-foreground/30 text-sm mt-1">Campus Command Center · {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"
            style={{ backgroundColor: `${primaryColor}20`, color: primaryColor, border: `1px solid ${primaryColor}30` }}
          >
            <MapPin className="w-3 h-3" />
            Campus IT Admin
          </span>
        </div>
      </div>

      {/* ── People Stats (campus-scoped) ── */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-foreground/30 mb-4">Campus People</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Users" value={stats?.total_users} color={primaryColor} to="/users" />
          <StatCard icon={GraduationCap} label="Students" value={stats?.students} color="#8B5CF6" to="/users?role=student" />
          <StatCard icon={BookOpen} label="Faculty" value={stats?.faculty} color="#10B981" to="/users?role=faculty" />
          <StatCard icon={Activity} label="Researchers" value={stats?.research_scholars} color="#EC4899" to="/users?role=research_scholar" />
        </div>
      </div>

      {/* ── Infrastructure Stats (campus-scoped) ── */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-foreground/30 mb-4">Campus Infrastructure</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard icon={Building2} label="Buildings" value={campus.buildings} color="#6366F1" to="/campus/buildings" />
          <StatCard icon={DoorOpen} label="Total Rooms" value={campus.rooms} color="#14B8A6" to="/campus/rooms" />
          <StatCard
            icon={CheckCircle2}
            label="Active Rooms"
            value={campus.active_rooms}
            color="#22D3EE"
            sub={`${campus.maintenance_rooms ?? 0} maintenance · ${campus.inactive_rooms ?? 0} inactive`}
          />
        </div>
      </div>

      {/* ── Room Utilization ── */}
      {campus.rooms > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-foreground/30 mb-4">Room Utilization</h2>
          <div className="bg-background border border-border rounded-2xl p-6 max-w-lg">
            <div className="space-y-3">
              <UtilBar label="Active" value={campus.active_rooms} total={campus.rooms} color={primaryColor} />
              <UtilBar label="Inactive" value={campus.inactive_rooms} total={campus.rooms} color="#64748B" />
              <UtilBar label="Maintenance" value={campus.maintenance_rooms} total={campus.rooms} color="#F59E0B" />
            </div>
            <p className="text-[10px] text-foreground/20 mt-4">
              Room utilization: <span className="text-foreground/50 font-bold">{campus.room_utilization ?? 0}%</span>
            </p>
          </div>
        </div>
      )}

      {/* ── Quick Actions ── */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-foreground/30 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction icon={Users} label="Manage Users" to="/users" color={primaryColor} />
          <QuickAction icon={Building2} label="Buildings" to="/campus/buildings" color="#6366F1" />
          <QuickAction icon={DoorOpen} label="Rooms" to="/campus/rooms" color="#14B8A6" />
          <QuickAction icon={Layers} label="Floors" to="/campus/floors" color="#8B5CF6" />
          {tenant?.has_timetable && <QuickAction icon={TrendingUp} label="Timetable" to="/timetable/plans" color="#F59E0B" />}
          {tenant?.has_bookings && <QuickAction icon={Calendar} label="New Booking" to="/bookings/new" color="#10B981" />}
          <QuickAction icon={Wrench} label="Settings" to="/settings" color="#64748B" />
        </div>
      </div>

      {/* ── Campus Banner ── */}
      <div
        className="rounded-2xl p-5 border flex items-center gap-4"
        style={{ backgroundColor: `${primaryColor}08`, borderColor: `${primaryColor}20` }}
      >
        <div className="p-3 rounded-xl" style={{ backgroundColor: `${primaryColor}15` }}>
          <LayoutDashboard className="w-6 h-6" style={{ color: primaryColor }} />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Campus-scoped access active</p>
          <p className="text-xs text-foreground/40 mt-0.5">
            You are managing <span className="text-foreground/70 font-semibold">{campusName}</span> within <span className="text-foreground/70">{tenant?.tenant_name}</span>. Data from other campuses is not visible to you.
          </p>
        </div>
      </div>
    </div>
  );
}
