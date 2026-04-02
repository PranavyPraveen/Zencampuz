import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import {
  Users, GraduationCap, BookOpen, Building2, Layers, DoorOpen,
  Cpu, Wrench, CheckCircle2, Package, Bell, Calendar, BarChart3,
  TrendingUp, Activity, ArrowRight, Loader2
} from 'lucide-react';

// ── Animated Circular Gauge ─────────────────────────────────────────────────
function GaugeChart({ value, color, label, size = 100 }) {
  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const stroke = (value / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
          <circle
            cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={`${stroke} ${circ}`}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color}80)`, transition: 'stroke-dasharray 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-black text-foreground">{value}<span className="text-xs font-normal text-foreground/50">%</span></span>
        </div>
      </div>
      <span className="text-[10px] text-foreground/50 font-semibold uppercase tracking-wider">{label}</span>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, to, sub }) {
  const content = (
    <div
      className="bg-background border border-border rounded-2xl p-5 flex flex-col gap-3 hover:border-border transition-all group relative overflow-hidden"
    >
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

// ── Module Badge ──────────────────────────────────────────────────────────────
function ModuleBadge({ label, active, color }) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${active ? 'opacity-100' : 'opacity-25 grayscale'}`}
      style={active ? { backgroundColor: `${color}12`, borderColor: `${color}30`, color } : { backgroundColor: '#1B2A4A20', borderColor: 'var(--bg-surface)', color: '#64748B' }}
    >
      <CheckCircle2 className={`w-3.5 h-3.5 ${active ? '' : 'opacity-50'}`} />
      {label}
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function TenantDashboard() {
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
  const assets = stats?.assets || {};
  const modules = stats?.modules || {};

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-foreground/40 mb-1">{greeting}, {user?.full_name?.split(' ')[0]} 👋</p>
          <h1 className="text-3xl font-black text-foreground tracking-tight">{tenant?.tenant_name || 'Campus OS'}</h1>
          <p className="text-foreground/30 text-sm mt-1">Institutional Command Center · {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor, border: `1px solid ${primaryColor}30` }}>
            {tenant?.subscription_type} Plan
          </span>
        </div>
      </div>

      {/* ── People Stats ── */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-foreground/30 mb-4">People</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard icon={Users} label="Total Users" value={stats?.total_users} color={primaryColor} to="/users" />
          <StatCard icon={GraduationCap} label="Students" value={stats?.students} color="#8B5CF6" to="/users?role=student" />
          <StatCard icon={BookOpen} label="Faculty" value={stats?.faculty} color="#10B981" to="/users?role=faculty" />
          <StatCard icon={Users} label="Head of Dept" value={stats?.hods} color="#F97316" to="/users?role=hod" />
          <StatCard icon={Activity} label="Researchers" value={stats?.research_scholars} color="#EC4899" to="/users?role=research_scholar" />
        </div>
      </div>

      {/* ── Infrastructure Stats ── */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-foreground/30 mb-4">Infrastructure</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={Building2} label="Campuses" value={campus.campuses} color="#22D3EE" to="/campus/campuses" />
          <StatCard icon={Layers} label="Buildings" value={campus.buildings} color="#6366F1" to="/campus/buildings" />
          <StatCard icon={DoorOpen} label="Rooms" value={campus.rooms} color="#14B8A6" to="/campus/rooms" />
          <StatCard icon={Package} label="Total Assets" value={assets.total} color="#F59E0B" to="/resources/assets" sub={`${assets.in_use ?? 0} in use · ${assets.maintenance ?? 0} maintenance`} />
        </div>
      </div>

      {/* ── Workload Utilization ── */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-foreground/30 mb-4">Workload Utilization</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Room Utilization Card */}
          <div className="bg-background border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-foreground">Room Utilization</h3>
                <p className="text-xs text-foreground/30 mt-0.5">Active vs. total rooms</p>
              </div>
              <DoorOpen className="w-5 h-5 text-foreground/20" />
            </div>
            <div className="flex items-center gap-8">
              <GaugeChart value={campus.room_utilization || 0} color={primaryColor} label="Room Util." />
              <div className="flex-1 space-y-3">
                <UtilBar label="Active" value={campus.active_rooms} total={campus.rooms} color={primaryColor} />
                <UtilBar label="Inactive" value={campus.inactive_rooms} total={campus.rooms} color="#64748B" />
                <UtilBar label="Maintenance" value={campus.maintenance_rooms} total={campus.rooms} color="#F59E0B" />
              </div>
            </div>
          </div>

          {/* Asset Utilization Card */}
          <div className="bg-background border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-foreground">Asset Utilization</h3>
                <p className="text-xs text-foreground/30 mt-0.5">Equipment & resource usage</p>
              </div>
              <Cpu className="w-5 h-5 text-foreground/20" />
            </div>
            <div className="flex items-center gap-8">
              <GaugeChart value={assets.utilization || 0} color="#10B981" label="Asset Util." />
              <div className="flex-1 space-y-3">
                <UtilBar label="In Use" value={assets.in_use} total={assets.total} color="#10B981" />
                <UtilBar label="Available" value={assets.available} total={assets.total} color="#22D3EE" />
                <UtilBar label="Inactive" value={assets.inactive} total={assets.total} color="#64748B" />
                <UtilBar label="Maintenance" value={assets.maintenance} total={assets.total} color="#EF4444" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Purchased Modules ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-foreground/30">Purchased Modules</h2>
          <Link to="/pricing" className="text-xs font-bold text-[#F59E0B] hover:text-[#fbbf24] bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
            Upgrade Plan <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          <ModuleBadge label="Asset Management" active={modules.has_resources} color="#8B5CF6" />
          <ModuleBadge label="Facility Bookings" active={modules.has_bookings} color="#10B981" />
          <ModuleBadge label="Timetabling" active={modules.has_timetable} color="#F59E0B" />
          <ModuleBadge label="Exam Management" active={modules.has_exams} color="#EC4899" />
          <ModuleBadge label="Analytics & Reports" active={modules.has_reports} color="#3B82F6" />
          <ModuleBadge label="Notifications" active={modules.has_notifications} color="#6366F1" />
        </div>
      </div>

      {/* ── Quick Links ── */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-foreground/30 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction icon={Users} label="Manage Users" to="/users" color={primaryColor} />
          {modules.has_resources && <QuickAction icon={Package} label="View Assets" to="/resources/assets" color="#8B5CF6" />}
          {modules.has_bookings && <QuickAction icon={Calendar} label="New Booking" to="/bookings/new" color="#10B981" />}
          {modules.has_reports && <QuickAction icon={BarChart3} label="Reports" to="/reports/dashboard" color="#3B82F6" />}
          {modules.has_timetable && <QuickAction icon={TrendingUp} label="Timetable" to="/timetable/plans" color="#F59E0B" />}
          <QuickAction icon={Wrench} label="Settings" to="/settings" color="#64748B" />
        </div>
      </div>
    </div>
  );
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
