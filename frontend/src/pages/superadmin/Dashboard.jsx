import { useState, useEffect } from 'react';
import { superAdminApi } from '../../api/superadmin';
import { 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  Ban, 
  CalendarDays,
  CalendarCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState({
    total_tenants: 0,
    active_tenants: 0,
    suspended_tenants: 0,
    archived_tenants: 0,
    expired_tenants: 0,
    monthly_subscriptions: 0,
    yearly_subscriptions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await superAdminApi.getPlatformStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch platform statistics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex space-x-2">
            <div className="w-3 h-3 bg-[var(--primary)] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-3 h-3 bg-[var(--primary)] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-3 h-3 bg-[var(--primary)] rounded-full animate-bounce"></div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Tenants',
      value: stats.total_tenants,
      icon: Building2,
      color: 'text-[var(--primary)]',
      bg: 'bg-[var(--primary)]/10',
      border: 'border-[#22D3EE]/20',
      link: '/superadmin/tenants'
    },
    {
      title: 'Active Tenants',
      value: stats.active_tenants,
      icon: CheckCircle2,
      color: 'text-[#10B981]',
      bg: 'bg-[#10B981]/10',
      border: 'border-[#10B981]/20',
      link: '/superadmin/tenants'
    },
    {
      title: 'Expiring Tenants',
      value: stats.expired_tenants,
      icon: AlertTriangle,
      color: 'text-[#F59E0B]',
      bg: 'bg-[#F59E0B]/10',
      border: 'border-[#F59E0B]/20',
      link: '/superadmin/reports'
    },
    {
      title: 'Suspended Tenants',
      value: stats.suspended_tenants,
      icon: Ban,
      color: 'text-[#EF4444]',
      bg: 'bg-[#EF4444]/10',
      border: 'border-[#EF4444]/20',
      link: '/superadmin/tenants'
    },
    {
      title: 'Monthly Subs',
      value: stats.monthly_subscriptions,
      icon: CalendarDays,
      color: 'text-[#8B5CF6]',
      bg: 'bg-[#8B5CF6]/10',
      border: 'border-[#8B5CF6]/20',
      link: '/superadmin/reports'
    },
    {
      title: 'Yearly Subs',
      value: stats.yearly_subscriptions,
      icon: CalendarCheck,
      color: 'text-[#EC4899]',
      bg: 'bg-[#EC4899]/10',
      border: 'border-[#EC4899]/20',
      link: '/superadmin/reports'
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Platform Hub</h2>
          <p className="text-muted mt-1">Super Admin Dashboard & Analytics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => (
          <Link 
            to={card.link}
            key={index}
            className={`h-36 ${card.bg} border ${card.border} rounded-[2rem] p-6 flex items-center justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer`}
          >
            <div>
              <p className="text-muted text-xs font-bold uppercase tracking-widest">{card.title}</p>
              <p className={`text-4xl font-black ${card.color} mt-2 tracking-tighter`}>{card.value}</p>
            </div>
            <div className={`p-4 rounded-2xl ${card.bg}`}>
              <card.icon className={`w-8 h-8 ${card.color}`} strokeWidth={2} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
